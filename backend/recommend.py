import sys
import json

# Function to handle the recommendation logic (from your previous code)
def recommend_doctors(disease_name, location=None):
    # For testing purposes, hardcode doctor and disease data
    doctors_data = [
        {"id": 1, "name": "Dr. A", "specialty": "Cardiology", "location": "City1", "ratings": 4.5},
        {"id": 2, "name": "Dr. B", "specialty": "Dermatology", "location": "City2", "ratings": 4.7},
        {"id": 3, "name": "Dr. C", "specialty": "Orthopedics", "location": "City1", "ratings": 4.2},
    ]

    diseases_data = [
        {"id": 1, "name": "Heart Disease", "related_specialty": "Cardiology"},
        {"id": 2, "name": "Skin Rash", "related_specialty": "Dermatology"},
        {"id": 3, "name": "Bone Fracture", "related_specialty": "Orthopedics"},
    ]

    # Find the disease specialty
    disease = next((d for d in diseases_data if d["name"].lower() == disease_name.lower()), None)
    if not disease:
        return []

    related_specialty = disease['related_specialty']

    # Filter doctors by specialty
    filtered_doctors = [doctor for doctor in doctors_data if doctor['specialty'] == related_specialty]

    # Optionally filter by location
    if location:
        filtered_doctors = [doctor for doctor in filtered_doctors if doctor['location'].lower() == location.lower()]

    # Sort by ratings
    recommended = sorted(filtered_doctors, key=lambda x: x['ratings'], reverse=True)
    return recommended

# Main handler that processes input
if __name__ == "__main__":
    try:
        # Read the input JSON string passed as argument
        input_data = sys.argv[1]

        # Parse the JSON string safely
        input_json = json.loads(input_data)

        # Extract disease name and location from input
        disease_name = input_json.get("diseaseName")
        location = input_json.get("location")

        # Get recommendations
        recommendations = recommend_doctors(disease_name, location)

        # Output the result as JSON
        print(json.dumps(recommendations))
    
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Error processing input: {str(e)}"}))
