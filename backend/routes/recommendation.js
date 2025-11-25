import express from "express";
import { recommendDoctors } from "../controllers/doctorController.js"; // Import the controller function

const router = express.Router();

// Route for recommending doctors
router.get("/recommend", recommendDoctors);

export default router;
