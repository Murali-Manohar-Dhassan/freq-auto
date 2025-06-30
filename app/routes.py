from flask import Flask, render_template, request, jsonify, send_file, session
import os
import io
import re
import threading
import pandas as pd
from datetime import datetime
import json
from app.processing import generate_excel
from app.processing import calculate_distance, calculate_all_overlaps
import sqlite3
from app.database import get_db_connection, get_approved_stations_from_db, db_init
import traceback

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = 'a_very_secret_and_random_key_here'

# Ensure output directory exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

with app.app_context():
    db_init()

# Background processing function
def process_data_in_background(stations):
    generate_excel(stations)


@app.route("/")
def home():
    return render_template("index.html")

# --- UPDATED: Color palette now matches your new HTML legend ---
# NOTE: Folium uses color names. I've matched them to your RGB values.
# The tuple is (Circle Color, Lighter Fill for Planning Circle)
FREQ_COLORS = {
    1: {'outline': "#F3EF18E2", 'fill': '#FFFACD'},  # Green, LightGreen
    2: {'outline': "#10E610B2", 'fill': '#90EE90'},  # Blue, LightBlue
    3: {'outline': "#C5691E", 'fill': "#C28947"},  # Yellow, LemonChiffon
    4: {'outline': "#207BF3", 'fill': '#ADD8E6'},  # Orange, PeachPuff
    5: {'outline': "#A8A8A8", 'fill': '#FFDAB9'},  # Purple, Plum
    6: {'outline': "#E92243", 'fill': "#B14354"},  # Pink, LightPink
    7: {'outline': "#A026C5", 'fill': "#F5B3F5"}   # Brown, Wheat
}

# Default color is also a DICTIONARY to maintain consistency if key not found in FREQ_COLORS
DEFAULT_COLOR = {'outline': 'grey', 'fill': 'lightgrey'}

@app.route('/api/update_map', methods=['POST'])
def update_map():
    data = request.json
    frontend_planning_stations = data.get('planning_stations', [])

    approved_stations_raw = get_approved_stations_from_db()

    approved_stations = []
    for station in approved_stations_raw:
        # Access sqlite3.Row directly (dict-like) and handle None for allocated_frequency
        allocated_freq = station['allocated_frequency'] 
        if allocated_freq is None:
            allocated_freq = 0 # Default value if it's None in DB

        approved_stations.append({
            'id': f"approved_{station['id']}",
            'name': station['name'],
            'latitude': float(station['latitude']),
            'longitude': float(station['longitude']),
            'safe_radius_km': float(station['safe_radius_km']),
            'allocated_frequency': int(allocated_freq), # Now safe to convert to int
            'type': 'approved'
        })

    all_stations_for_map_drawing = []

    for station in approved_stations:
        # freq_info will be a dictionary {'outline': '...', 'fill': '...'}
        # because FREQ_COLORS and DEFAULT_COLOR are consistently dictionaries.
        freq_info = FREQ_COLORS.get(station['allocated_frequency'], DEFAULT_COLOR)
        all_stations_for_map_drawing.append({
            'id': station['id'],
            'type': 'approved',
            'name': station['name'],
            'lat': station['latitude'],
            'lon': station['longitude'],
            'radius': station['safe_radius_km'],
            'frequency': station['allocated_frequency'],
            'color': freq_info['outline'], # This line will now work correctly
            'fillColor': freq_info['fill'],
            'fillOpacity': 0.15,
            'weight': 2,
            'popup_content': f"""
                <div style='width:200px'>
                    <b>{station['name']}</b><br>
                    <b>Status:</b> Approved<br>
                    <b>ID:</b> {station['id']}<br>
                    <b>Frequency:</b> {station['allocated_frequency']}<br>
                    <b>Radius:</b> {station['safe_radius_km']} km
                </div>
            """
        })

    for p_station in frontend_planning_stations:
        p_id = p_station.get('id')
        p_name = p_station.get('stationName') or f"Planning Station {p_station.get('station_number', 'N/A')}"
        p_lat = float(p_station.get('latitude') or 0.0)
        p_lon = float(p_station.get('longitude') or 0.0)
        p_rad = float(p_station.get('safe_radius_km') or 12.0)
        p_freq = int(p_station.get('allocated_frequency') or 1)
        p_onboard_slots = int(p_station.get('onboard_slots') or 0)
        
        freq_info = FREQ_COLORS.get(p_freq, DEFAULT_COLOR)

        all_stations_for_map_drawing.append({
            'id': p_id,
            'type': 'planning',
            'name': p_name,
            'lat': p_lat,
            'lon': p_lon,
            'radius': p_rad,
            'frequency': p_freq,
            'color': 'red', 
            'fillColor': freq_info['fill'], 
            'fillOpacity': 0.25,
            'weight': 3,
            'popup_content': f"""
                <div style='width:200px'>
                    <b>{p_name}</b><br>
                    <b>Status:</b> Planning<br>
                    <b>ID:</b> {p_id}<br>
                    <b>Frequency:</b> {p_freq}<br>
                    <b>Proposed Radius:</b> {p_rad} km<br>
                    <b>Onboard Slots:</b> {p_onboard_slots}<br>
                    <br>
                    <button onclick="window.removeStation('{p_id}')" style='background:red;color:white;border:none;padding:5px;border-radius:4px;cursor:pointer;'>
                        Remove
                    </button>
                </div>
            """
        })

    all_coords = [(s['lat'], s['lon']) for s in all_stations_for_map_drawing if s['lat'] is not None and s['lon'] is not None]
    if all_coords:
        avg_lat = sum(c[0] for c in all_coords) / len(all_coords)
        avg_lon = sum(c[1] for c in all_coords) / len(all_coords)
        center_location = [avg_lat, avg_lon]
        zoom_level = 7
    else:
        center_location = [20.5937, 78.9629]
        zoom_level = 6
    
    inter_type_conflicts = []
    for p_station in frontend_planning_stations:
        p_lat = float(p_station.get('latitude') or 0.0)
        p_lon = float(p_station.get('longitude') or 0.0)
        p_rad = float(p_station.get('safe_radius_km') or 12.0)
        p_freq = int(p_station.get('allocated_frequency') or 1)

        for approved in approved_stations:
            approved_freq = approved['allocated_frequency'] 
            if approved_freq is None: 
                continue 

            if p_freq == approved_freq: 
                distance = calculate_distance(
                    p_lat, p_lon,
                    approved['latitude'], approved['longitude']
                )
                min_distance = (p_rad + approved['safe_radius_km'])
                
                if distance < min_distance:
                    inter_type_conflicts.append({
                        'planning_name': p_station.get('stationName'),
                        'planning_freq': p_freq,
                        'approved_name': approved['name'],
                        'approved_freq': approved_freq,
                        'distance': distance,
                        'min_distance': min_distance,
                        'planning_lat': p_lat, 
                        'planning_lon': p_lon, 
                        'approved_lat': approved['latitude'], 
                        'approved_lon': approved['longitude'], 
                        'popup_content': f"CONFLICT (Freq {p_freq}): {p_station.get('stationName')} & {approved['name']} - Dist: {distance:.2f}km < {min_distance:.2f}km required"
                    })

    overlapping_pair_data, has_major_conflict = calculate_all_overlaps(all_stations_for_map_drawing)
    
    overall_has_conflict = has_major_conflict or bool(inter_type_conflicts)
    
    return jsonify({
        'allStationData': all_stations_for_map_drawing, 
        'overlappingPairData': overlapping_pair_data,    
        'interTypeConflicts': inter_type_conflicts,     
        'hasConflict': overall_has_conflict,             
        'center_location': center_location,              
        'zoom_level': zoom_level                         
    })


# DB Ui Admin Page
@app.route("/admin")
def admin_page():
    return render_template("admin.html")

def validate_timeslot(timeslot_str):
    """Validates the timeslot format (e.g., '2-14') and range (2-45)."""
    if not isinstance(timeslot_str, str):
        return False, "Timeslot must be a string."
    
    # Regex to ensure format is number-number
    if not re.match(r'^\d+-\d+$', timeslot_str):
        return False, "Invalid format. Use 'start-end', e.g., '2-14'."
        
    start, end = map(int, timeslot_str.split('-'))
    
    if not (2 <= start <= 45 and 2 <= end <= 45):
        return False, "Timeslot values must be between 2 and 45."
        
    if start >= end:
        return False, "Start of timeslot must be less than the end."
        
    return True, "Valid"

@app.route('/api/add_station', methods=['POST'])
def add_station():
    try:
        data = request.get_json()
        if not data:
            return jsonify(success=False, message="Request body must be JSON."), 400

        required_fields = ['name', 'Station_Code', 'SKac_ID', 'latitude', 'longitude', 'safe_radius_km', 'status', 'timeslot', 'Area_type']
        if not all(k in data and data[k] not in [None, ''] for k in required_fields):
            return jsonify(success=False, message="All fields are required and cannot be empty."), 400
        
        # --- (FIX) ADDED TIMESLOT VALIDATION FOR ADDING STATIONS ---
        timeslot = data.get('timeslot')
        is_valid, message = validate_timeslot(timeslot)
        if not is_valid:
            return jsonify(success=False, message=f"Timeslot Error: {message}"), 400

        # --- Type conversion ---
        try:
            name = data['name']
            station_code = data['Station_Code']
            skac_id = data['SKac_ID']
            lat = float(data['latitude'])
            lon = float(data['longitude'])
            radius = float(data['safe_radius_km'])
            status = data['status']
            area_type = data['Area_type']
            freq = data.get('allocated_frequency')
            freq = int(freq) if freq else None

        except (ValueError, TypeError) as e:
            return jsonify(success=False, message=f"Invalid data format. Error: {e}"), 400

        conn = get_db_connection()
        conn.execute(
            """INSERT INTO stations (name, Station_Code, SKac_ID, latitude, longitude, safe_radius_km, status, allocated_frequency, timeslot, Area_type) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, station_code, skac_id, lat, lon, radius, status, freq, timeslot, area_type)
        )
        conn.commit()
        conn.close()
        return jsonify(success=True, message="Station added successfully!")

    except sqlite3.IntegrityError:
        return jsonify(success=False, message="A station with this name already exists."), 409
    except Exception as e:
        traceback.print_exc()
        return jsonify(success=False, message=f"An internal server error occurred: {e}"), 500

@app.route('/api/get_stations', methods=['GET'])
def get_stations():
    conn = get_db_connection()
    stations_cursor = conn.execute("SELECT * FROM stations ORDER BY id").fetchall()
    conn.close()
    stations = [dict(row) for row in stations_cursor]
    return jsonify(stations=stations)

@app.route('/api/update_station', methods=['POST'])
def update_station():
    """
    API endpoint to update an existing station. Includes validation for the timeslot field.
    """
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            return jsonify(success=False, message="Invalid request data, missing 'id'."), 400
        
        # --- Timeslot validation for updates ---
        if 'timeslot' in data and data['timeslot']:
            is_valid, message = validate_timeslot(data['timeslot'])
            if not is_valid:
                return jsonify(success=False, message=f"Timeslot Error: {message}"), 400

        station_id = int(data['id'])
        
        conn = get_db_connection()
        
        allowed_columns = [
            'name', 'latitude', 'longitude', 'safe_radius_km', 'status', 
            'allocated_frequency', 'timeslot', 'Area_type', 'SKac_ID', 'Station_Code'
        ]

        update_fields = []
        update_values = []
        
        for key, value in data.items():
            if key in allowed_columns and value not in [None, '']:
                    update_fields.append(f"{key} = ?")
                    update_values.append(value)
        
        if not update_fields:
            return jsonify(success=False, message="No valid fields provided for update."), 400
        
        update_values.append(station_id)
        
        query = f"UPDATE stations SET {', '.join(update_fields)} WHERE id = ?"

        conn.execute(query, tuple(update_values))
        conn.commit()
        conn.close()
        
        return jsonify(success=True, message="Station updated successfully!")
    
    except sqlite3.Error as db_error:
        traceback.print_exc()
        return jsonify(success=False, message=f"Database error: {db_error}"), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify(success=False, message=f"An internal server error occurred: {e}"), 500

@app.route('/api/delete_station', methods=['POST'])
def delete_station():
    try:
        data = request.get_json()
        station_id = int(data['id'])

        conn = get_db_connection()
        conn.execute("DELETE FROM stations WHERE id = ?", (station_id,))
        conn.commit()
        conn.close()
        
        return jsonify(success=True, message="Station deleted successfully!")
    
    except Exception as e:
        traceback.print_exc()
        return jsonify(success=False, message=f"An internal server error: {e}"), 500
    
@app.route("/allocate_slots_endpoint", methods=["POST"])
def allocate_slots_endpoint():
    try:
        stations = request.json
        print(f"DEBUG routes.py :\n 🔄 Received station data for processing: {stations}")  
        

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
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], "output_kavach_slots_final_layout_v2.xlsx")
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

        # Read Excel without headers
        df = pd.read_excel(file_path, header=None)

        # Debug: Print first few rows
        print("🔍 First few rows of Excel file:")
        print(df.head())

        # Extract number of stations from the first row (e.g., "No of Station {number}")
        first_row_value = str(df.iloc[0, 0]).strip()
        try:
            station_count = int(first_row_value.split()[-1]) 
        except ValueError:
            print(f"⚠️ Couldn't extract number from '{first_row_value}', falling back on column count.")
            station_count = df.shape[1] - 1  # fallback: all columns except column 0

        print(f"🔢 Extracted Station Count: {station_count}")

        # Skip the first two rows and extract data from columns
        df = df.iloc[2:].T  # Transpose the DataFrame and remove first two rows

        # Set new headers using the first row of transposed data
        df.columns = df.iloc[0]  
        df = df[1:]  # Remove old headers row

        # Rename columns to match expected format
        df.rename(columns={df.columns[0]: "Station Name", 
                           df.columns[1]: "Static", 
                           df.columns[2]: "Onboard Slots"}, inplace=True)


        # ❗ Remove the first row that still contains the headers as data
        df.reset_index(drop=True, inplace=True)

        # Convert to dictionary
        station_data = df.to_dict(orient="records")

        # Dynamically count stations
        station_count = len(station_data)

        print(f"📊 Parsed Data: {station_data} \n {35*'---'}")

        return jsonify({"station_count": station_count, "data": station_data})

    except Exception as e:
        print(f"❌ Error processing file: {str(e)}")
        return jsonify({"error": f"File processing error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
