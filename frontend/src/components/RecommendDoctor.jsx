import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";

const RecommendDoctor = () => {
  const [diseaseName, setDiseaseName] = useState("");
  const [location, setLocation] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  // Log the updated `doctors` state whenever it changes
  useEffect(() => {
    if (Array.isArray(doctors) && doctors.length > 0) {
      console.log("Updated doctors state:", doctors);
    }
  }, [doctors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDoctors([]);

    try {
      const response = await axios.get(
        backendUrl + `/api/recommend?diseaseName=${diseaseName}&location=${location}`
      );

      console.log("API Response:", response.data); // Log API response
      // Ensure `response.data` is an array
      if (Array.isArray(response.data)) {
        setDoctors(response.data);
      } else {
        console.error("API did not return an array:", response.data);
        setError("Unexpected API response. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-[#262626]">
      <h1 className="text-3xl font-medium">Find Doctors by Disease</h1>
      <p className="sm:w-1/3 text-center text-sm">
        Enter the disease name and your location to find the best doctors for your needs.
      </p>
      <form
        className="flex flex-col gap-4 sm:w-1/3 w-full"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          placeholder="Enter Disease Name"
          value={diseaseName}
          onChange={(e) => setDiseaseName(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg"
          required
        />
        <input
          type="text"
          placeholder="Enter Location (Optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg"
        />
        <button
          type="submit"
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Search
        </button>
      </form>

      {loading && <p className="text-blue-500">Loading...</p>}

      {error && <p className="text-red-500">{error}</p>}

      {Array.isArray(doctors) && doctors.length > 0 && (
       <div className="flex felx-col sm:flex-row p-2">
       {doctors.map((doctor) => (
         <div
           key={doctor._id}
           className=" mr-2 border rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-1 p-6 bg-white"
         >
           <h2 className="text-xl font-semibold text-[#262626] capitalize">
             {doctor.name}
           </h2>
           <p className="text-sm text-gray-500 mt-2 capitalize">
             {doctor.speciality}
           </p>
           <p className="text-sm mt-1 capitalize text-gray-600">
             {doctor.address.city}, {doctor.address.country}
           </p>
           <p className="text-sm text-green-600 mt-2 font-medium">
             Fees: ${doctor.fees}
           </p>
           <button
             onClick={() => {
               navigate(`/appointment/${doctor._id}`);
               window.scrollTo(0, 0);
             }}
             className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
           >
             Add Appointment
           </button>
         </div>
       ))}
     </div>
     
      )}
    </div>
  );
};

export default RecommendDoctor;
