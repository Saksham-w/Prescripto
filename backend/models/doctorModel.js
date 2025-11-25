import mongoose from "mongoose";

// Define the schema for the address field to capture location details like city, state, and country
const addressSchema = new mongoose.Schema({
  city: { type: String, required: true }, // City
  country: { type: String, required: true }, // Country
}, { _id: false }); // _id: false prevents MongoDB from creating an ID for the embedded object

// Define the doctor schema
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Doctor's name
  email: { type: String, required: true, unique: true }, // Doctor's email
  password: { type: String, required: true }, // Doctor's password
  image: { type: String, required: true }, // Image URL for the doctor
  speciality: { type: String, required: true }, // Doctor's specialization (e.g., Endocrinologist)
  degree: { type: String, required: true }, // Doctor's degree
  experience: { type: String, required: true }, // Doctor's experience
  about: { type: String, required: true }, // Short bio or about the doctor
  available: { type: Boolean, default: true }, // Availability status
  fees: { type: Number, required: true }, // Doctor's consultation fees
  slots_booked: { type: Object, default: {} }, // Booked slots (if applicable)
  address: { type: addressSchema, required: true }, // Doctor's address (city, state, country)
  date: { type: Number, required: true }, // Date when the doctor joined (timestamp)
}, { minimize: false }); // minimize: false ensures that empty objects are not removed

// Create and export the doctor model
const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);
export default doctorModel;
