import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import recommendationRoutes from "./routes/recommendation.js"; // Import the recommendation route
// import diseaseModel from "./models/diseaseModel.js"; // Import the disease model

// app config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// const seedDiseases = async () => {
//   const diseases = [
//     { name: "Diabetes", speciality: "Endocrinologist" },
//     { name: "Cholestrol", speciality: "Cardiologist" },
//     { name: "Asthma", speciality: "Pulmonologist" },
//     { name: "Cancer", speciality: "Oncologist" },
//     { name: "Skin", speciality: "Dermatologist" },
//     { name: "Neurons", speciality: "Neurologist" },
//     { name: "Vision", speciality: "Ophthalmologist" },
//     { name: "Depression", speciality: "Psychiatrist " },
//     { name: "Pregnancy", speciality: "Gynecologist " },
//     { name: "Thyroid", speciality: "Endocrinologist" },
//     { name: "Stomach", speciality: "Gastroenterologists" },
//     { name: "Brain", speciality: "Neurologist" },
//     { name: "Migraine", speciality: "Neurologist" },
//     { name: "Parkinson", speciality: "Neurologist" },
//     { name: "Alzheimer", speciality: "Neurologist" },
//     { name: "Kidney", speciality: "Nephrologists" },
//     { name: "Bone", speciality: "Orthopedics" },
//     { name: "Children", speciality: "Pediatricians" },
//     { name: "Arthritis", speciality: "Rheumatologists" },
//     { name: "Blood Pressure", speciality: "Hematologists " },
//     { name: "Flu", speciality: "General Physician" },
//     { name: "Dental", speciality: "Dentist" },
//   ];

//   try {
//     // Loop through each disease in the array
//     for (const disease of diseases) {
//       const existingDisease = await diseaseModel.findOne({
//         name: disease.name,
//       });

//       if (!existingDisease) {
//         // If disease does not exist, insert it
//         await diseaseModel.create(disease);
//         // console.log(`Disease '${disease.name}' added successfully.`);
//       } else {
//         // console.log(`Disease '${disease.name}' already exists. Skipping.`);
//       }
//     }

//     // console.log("Seeding completed successfully.");
//   } catch (error) {
//     // console.error("Error seeding diseases:", error.message);
//   }
// };

// Call the seeding function after connecting to the database
// connectDB()
//   .then(() => seedDiseases())
//   .catch((error) =>
//     console.error("Error connecting to MongoDB:", error.message)
//   );

// middlewares
app.use(express.json());
app.use(cors());

// api endpoints
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api", recommendationRoutes);

app.get("/", (req, res) => {
  res.send("API Working");
});

app.listen(port, () => console.log(`Server started on PORT:${port}`));
