import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from "cloudinary";
import stripe from "stripe";
import razorpay from "razorpay";
import axios from "axios";

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
const razorpayInstance = new razorpay({
    key_id: process.env.KHALTI_KEY_ID,
    key_secret: process.env.KHALTI_SECRET_KEY,
});

// API to register user
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: "Missing Details" });
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({
                success: false,
                message: "Please enter a valid email",
            });
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({
                success: false,
                message: "Please enter a strong password",
            });
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            name,
            email,
            password: hashedPassword,
        };

        const newUser = new userModel(userData);
        const user = await newUser.save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get user profile data
const getProfile = async (req, res) => {
    try {
        const { userId } = req.body;
        const userData = await userModel.findById(userId).select("-password");

        res.json({ success: true, userData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to update user profile
const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" });
        }

        await userModel.findByIdAndUpdate(userId, {
            name,
            phone,
            address: JSON.parse(address),
            dob,
            gender,
        });

        if (imageFile) {
            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(
                imageFile.path,
                { resource_type: "image" }
            );
            const imageURL = imageUpload.secure_url;

            await userModel.findByIdAndUpdate(userId, { image: imageURL });
        }

        res.json({ success: true, message: "Profile Updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to book appointment
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body;
        const docData = await doctorModel.findById(docId).select("-password");

        if (!docData.available) {
            return res.json({
                success: false,
                message: "Doctor Not Available",
            });
        }

        let slots_booked = docData.slots_booked;

        // checking for slot availablity
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({
                    success: false,
                    message: "Slot Not Available",
                });
            } else {
                slots_booked[slotDate].push(slotTime);
            }
        } else {
            slots_booked[slotDate] = [];
            slots_booked[slotDate].push(slotTime);
        }

        const userData = await userModel.findById(userId).select("-password");

        delete docData.slots_booked;

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now(),
        };

        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        res.json({ success: true, message: "Appointment Booked" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);

        // verify appointment user
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: "Unauthorized action" });
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, {
            cancelled: true,
        });

        // releasing doctor slot
        const { docId, slotDate, slotTime } = appointmentData;

        const doctorData = await doctorModel.findById(docId);

        let slots_booked = doctorData.slots_booked;

        slots_booked[slotDate] = slots_booked[slotDate].filter(
            (e) => e !== slotTime
        );

        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        res.json({ success: true, message: "Appointment Cancelled" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body;
        const appointments = await appointmentModel.find({ userId });

        res.json({ success: true, appointments });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to make payment of appointment using razorpay

const paymentKhalti = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({
                success: false,
                message: "Appointment Cancelled or Not Found",
            });
        }

        // Payload for Khalti API
        const payload = {
            return_url: "http://localhost:5173/my-appointments", // Update to your frontend URL
            website_url: "https://your-website.com",
            amount: appointmentData.amount * 10, // Khalti requires amount in paisa
            purchase_order_id: appointmentId,
            purchase_order_name: "Appointment Payment",
            customer_info: {
                name: appointmentData.userData.name,
                //email: appointmentData.userData.email,
                email: "test@khalti.com",
                phone: 9800000001,
            },
            amount_breakdown: [
                {
                    label: "Appointment Fees",
                    amount: appointmentData.amount * 10,
                },
            ],
            product_details: [
                {
                    identity: "appointment_" + appointmentId,
                    name: "Doctor Appointment",
                    total_price: appointmentData.amount * 10,
                    quantity: 1,
                    unit_price: appointmentData.amount * 10,
                },
            ],
            merchant_username: "merchant_name",
            merchant_extra: "merchant_extra",
        };

        const headers = {
            Authorization: `key 05bf95cc57244045b8df5fad06748dab`,
            "Content-Type": "application/json",
        };

        // Make request to Khalti payment initiation API
        const khaltiResponse = await axios.post(
            "https://dev.khalti.com/api/v2/epayment/initiate/",
            payload,
            { headers }
        );

        // Return Khalti response to frontend
        res.json({
            success: true,
            paymentDetails: khaltiResponse.data,
        });
    } catch (error) {
        console.error("Error initiating Khalti payment:", error.message);
        res.status(500).json({
            success: false,
            message: "Khalti Payment Initialization Failed",
        });
    }
};

// API to verify payment of razorpay

// const verifyKhalti = async (req, res) => {
//     try {
//         const { pidx } = req.body;

//         if (!pidx) {
//             return res.json({
//                 success: false,
//                 message: "Missing Transaction ID (pidx)",
//             });
//         }

//         const headers = {
//             Authorization: `key 05bf95cc57244045b8df5fad06748dab`, // Replace with your actual Khalti secret key
//             "Content-Type": "application/json",
//         };

//         // Make a request to Khalti lookup API
//         const response = await axios.post(
//             "https://dev.khalti.com/api/v2/epayment/lookup",
//             { pidx },
//             { headers }
//         );

//         const paymentData = response.data;
//         console.log("grr", paymentData);

//         // Check if payment status is "Completed"
//         if (paymentData.state.name === "Completed") {
//             // Update the appointment payment status
//             await appointmentModel.findByIdAndUpdate(
//                 paymentData.purchase_order_id,
//                 { payment: true }
//             );

//             return res.json({
//                 success: true,
//                 message: "Payment Verified Successfully",
//                 transaction: {
//                     pidx: paymentData.idx,
//                     amount: paymentData.amount / 100, // Convert from paisa to currency
//                 },
//             });
//         } else {
//             return res.json({
//                 success: false,
//                 message: "Payment Not Completed",
//             });
//         }
//     } catch (error) {
//         console.error("Error verifying Khalti payment:", error.message);

//         res.status(500).json({
//             success: false,
//             message: "Khalti Payment Verification Failed",
//         });
//     }
// };
const verifyKhalti = async (req, res) => {
    try {
        const { pidx, status, purchase_order_id } = req.body;
        console.log("grr", pidx, status, purchase_order_id);
        if (status === "Completed") {
            await appointmentModel.findByIdAndUpdate(purchase_order_id, {
                payment: true,
            });
            return res.json({
                success: true,
                message: "Khalti Payment Successful",
            });
        }

        res.json({ success: false, message: "Khalti Payment Failed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const { origin } = req.headers;

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({
                success: false,
                message: "Appointment Cancelled or not found",
            });
        }

        const currency = process.env.CURRENCY.toLocaleLowerCase();

        const line_items = [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: "Appointment Fees",
                    },
                    unit_amount: appointmentData.amount * 100,
                },
                quantity: 1,
            },
        ];

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items: line_items,
            mode: "payment",
        });

        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const verifyStripe = async (req, res) => {
    try {
        const { appointmentId, success } = req.body;

        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                payment: true,
            });
            return res.json({ success: true, message: "Payment Successful" });
        }

        res.json({ success: false, message: "Payment Failed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentKhalti,
    verifyKhalti,
    paymentStripe,
    verifyStripe,
};
