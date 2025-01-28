import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import diseaseModel from "../models/diseaseModel.js";
import { PythonShell } from "python-shell";

// // Other existing controllers...

/**
 * Controller: Recommend Doctors
 * @route POST /api/doctors/recommend
 * @desc Recommends doctors based on the disease input
 */
export const reccommendDoctors = async (req, res) => {
  const { disease } = req.body;

  if (!disease) {
    return res.status(400).json({ message: "Disease input is required." });
  }

  try {
    // Run Python script to get the recommended specialty
    const options = {
      mode: 'text',
      pythonOptions: ['-u'], // Unbuffered output
      scriptPath: './', // Ensure your Python script is in the project root
      args: [disease]
    };

    PythonShell.run('recommend.py', options, async (err, results) => {
      if (err) {
        console.error("Error running Python script:", err);
        return res.status(500).json({ message: "Error processing recommendation." });
      }

      // Get the recommended specialty from the Python script
      const recommendedSpecialty = results[0];
      console.log("Recommended Specialty:", recommendedSpecialty);

      // Query the database for doctors with the recommended specialty
      const doctors = await Doctor.find({ specialty: recommendedSpecialty });

      if (doctors.length === 0) {
        return res.status(404).json({ message: "No doctors found for the recommended specialty." });
      }

      res.status(200).json({ recommendedSpecialty, doctors });
    });
  } catch (err) {
    console.error("Error in recommendation process:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// API for doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await doctorModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
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

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        cancelled: true,
      });
      return res.json({ success: true, message: "Appointment Cancelled" });
    }

    res.json({ success: false, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      return res.json({ success: true, message: "Appointment Completed" });
    }

    res.json({ success: false, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const recommendDoctors = async (req, res) => {
  const { diseaseName, location } = req.query;

  console.log("Received query params:", { diseaseName, location });

  if (!diseaseName || !diseaseName.trim()) {
    return res.status(400).json({ message: "Disease name is required" });
  }

  try {
    // Find the disease in the database
    const disease = await diseaseModel.findOne({
      name: new RegExp(`^${diseaseName}$`, "i"),
    });

    if (!disease || !disease.speciality) {
      console.log("Disease not found or missing specialization:", diseaseName);
      return res
        .status(404)
        .json({ message: "Disease or specialization not found" });
    }

    console.log("Found specialization:", disease.speciality);

    // Step 2: Build doctor query using 'specialization'
    const query = { speciality: disease.speciality }; // Map 'specialization' to 'speciality' for doctorModel

    if (location) {
      query["address.city"] = new RegExp(`^${location}$`, "i");
    }

    console.log("Doctor search query:", query);

    // Step 3: Fetch doctors
    const doctors = await doctorModel
      .find(query)
      .select("name email speciality fees address");

    if (doctors.length === 0) {
      console.log("No doctors found for the criteria:", query);
      return res
        .status(404)
        .json({ message: "No doctors found for the given criteria" });
    }

    console.log("Doctors found:", doctors);
    res.json(doctors);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to change doctor availablity for Admin and Doctor Panel
const changeAvailablity = async (req, res) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availablity Changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor profile for  Doctor Panel
const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");

    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update doctor profile data from  Doctor Panel
const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available } = req.body;

    await doctorModel.findByIdAndUpdate(docId, { fees, address, available });

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;

    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;

    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];

    appointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse(),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  doctorList,
  changeAvailablity,
  appointmentComplete,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  recommendDoctors,
};
