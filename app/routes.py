from flask import Flask, render_template, request, jsonify, send_file
import os
import threading
import pandas as pd
from app.processing import generate_excel

app = Flask(__name__)

# Ensure output directory exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Background processing function
def process_data_in_background(stations):
    generate_excel(stations)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/allocate_slots_endpoint", methods=["POST"])
def allocate_slots_endpoint():
    try:
        stations = request.json
        print(f"🔄 Received station data for processing: {stations}")  
        

        # Ensure stations data is correctly formatted
        if not stations or not isinstance(stations, list):
            return jsonify({"error": "Invalid station data received"}), 400
        
        # Start processing without threading for now
        generate_excel(stations)  # Call directly in /allocate_slots_endpoint

        return jsonify({"message": "Processing started, check back in a few seconds", "fileUrl": "/download"})
    except Exception as e:
        print(f"Error in allocation: {e}")  # Debug log
        return jsonify({"error": str(e)}), 500

@app.route("/download")
def download_file():
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], "output_kavach_slots_colored.xlsx")
    print(f"Checking if file exists: {file_path} -> {os.path.exists(file_path)}")

    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({"message": "Final output file not yet available. Try again later."}), 202


@app.route("/upload_excel", methods=["POST"])
def upload_excel():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith((".xls", ".xlsx")):
        return jsonify({"error": "Invalid file format"}), 400

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)

    try:
        file.save(file_path)  
        print(f"✅ File saved at: {file_path}")

        # Read the entire file without skipping rows
        df = pd.read_excel(file_path, header=None)  

        # Extract station count from the first row
        station_count = int(df.iloc[0, 1])  

        # Extract station names dynamically from the second row
        station_names = df.iloc[1, 1:].dropna().tolist()

        # Extract slot values
        stationary_slots = df.iloc[2, 1:].dropna().astype(int).tolist()
        onboard_slots = df.iloc[3, 1:].dropna().astype(int).tolist()

        # Combine extracted data
        station_data = []
        for i in range(len(station_names)):
            station_data.append({
                "Station": station_names[i],
                "Stationary Slots": stationary_slots[i] if i < len(stationary_slots) else 0,
                "Onboard Slots": onboard_slots[i] if i < len(onboard_slots) else 0
            })

        print(f"📊 Parsed Data: {station_data}")

        return jsonify({"station_count": station_count, "data": station_data})
    
    except Exception as e:
        print(f"❌ Error processing file: {str(e)}")
        return jsonify({"error": f"File processing error: {str(e)}"}), 500





if __name__ == "__main__":
    app.run(debug=True)
