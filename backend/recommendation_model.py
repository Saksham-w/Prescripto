# recommendation_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
import pickle

# Load dataset
data = pd.read_csv('disease_specialty_dataset.csv')  # Ensure this dataset exists
X = data['disease']
y = data['specialty']

# Convert textual data to numerical using one-hot encoding
X_encoded = pd.get_dummies(X)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X_encoded, y, test_size=0.2, random_state=42)

# Train model
model = DecisionTreeClassifier()
model.fit(X_train, y_train)

# Save the model
with open('recommendation_model.pkl', 'wb') as file:
    pickle.dump(model, file)

print("Model trained and saved successfully.")
