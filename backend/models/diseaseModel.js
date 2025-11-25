import mongoose from "mongoose";

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Disease name
  speciality: { type: String, required: true }, // Use 'specialization' instead of 'speciality'
});

export default mongoose.model("Disease", diseaseSchema, "diseases");
