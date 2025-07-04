from flask import Flask, render_template, request, jsonify, send_file, session, url_for, send_from_directory
import os
import io
import re
import threading
import pandas as pd
from datetime import datetime
import json
# Import only necessary functions. allocate_slots will be used in submit_data_for_excel_generation
from app.processing import calculate_distance, calculate_all_overlaps, generate_excel, allocate_slots
import sqlite3
# Import db_init from app.database, and also get_db_connection, get_approved_stations_from_db, get_planning_stations_from_db
from app.database import get_db_connection, get_approved_stations_from_db, db_init, get_planning_stations_from_db
import traceback

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = 'a_very_secret_and_random_key_here'

# Ensure output directory exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# --- FIX: Call db_init() within the application context here ---
with app.app_context():
    db_init()
# --- END FIX ---

# --- UPDATED: Color palette now matches your new HTML legend ---
FREQ_COLORS = {
    1: {'outline': "#F3EF18E2", 'fill': '#FFFACD'},
    2: {'outline': "#10E610B2", 'fill': '#90EE90'},
    3: {'outline': "#C5691E", 'fill': "#C28947"},
    4: {'outline': "#207BF3", 'fill': '#ADD8E6'},
    5: {'outline': "#A8A8A8", 'fill': '#FFDAB9'},
    6: {'outline': "#E92243", 'fill': "#B14354"},
    7: {'outline': "#A026C5", 'fill': "#F5B3F5"}
}

DEFAULT_COLOR = {'outline': 'grey', 'fill': 'lightgrey'}

@app.route("/")
def home():
    return render_template("index.html")

@app.route('/api/update_map', methods=['POST'])
def update_map():
    data = request.json
    frontend_planning_stations = data.get('planning_stations', [])
    print(f"Received planning stations from frontend for map update: {frontend_planning_stations}")

    approved_stations_raw = get_approved_stations_from_db()
    planning_stations_from_db_raw = get_planning_stations_from_db() # Fetch planning stations from DB

    all_stations_for_map_drawing = []

    # Add APPROVED stations to the map data
    for station in approved_stations_raw:
        allocated_freq = station['allocated_frequency']
        if allocated_freq is None:
            allocated_freq = 0 # Default if None in DB

        freq_info = FREQ_COLORS.get(int(allocated_freq), DEFAULT_COLOR) # Ensure freq is int for lookup
        all_stations_for_map_drawing.append({
            'id': f"approved_{station['id']}",
            'type': 'approved',
            'name': station['name'],
            'lat': float(station['latitude']),
            'lon': float(station['longitude']),
            'radius': float(station['safe_radius_km']),
            'frequency': int(allocated_freq),
            'color': freq_info['outline'],
            'fillColor': freq_info['fill'],
            'fillOpacity': 0.15,
            'weight': 2,
            'popup_content': f"""
                <div style='width:200px'>
                    <b>{station['name']}</b><br>
                    <b>Status:</b> Approved<br>
                    <b>ID:</b> {station['id']}<br>
                    <b>Frequency:</b> {allocated_freq}<br>
                    <b>Radius:</b> {station['safe_radius_km']} km
                </div>
            """
        })

    # Add PERSISTED PLANNING stations from DB to the map data
    for station in planning_stations_from_db_raw:
        allocated_freq = station['allocated_frequency']
        if allocated_freq is None:
            allocated_freq = 0

        freq_info = FREQ_COLORS.get(int(allocated_freq), DEFAULT_COLOR)
        all_stations_for_map_drawing.append({
            'id': f"db_planning_{station['id']}", # Unique ID for DB planning stations
            'type': 'db_planning', # New type to differentiate
            'name': station['name'],
            'lat': float(station['latitude']),
            'lon': float(station['longitude']),
            'radius': float(station['safe_radius_km']),
            'frequency': int(allocated_freq),
            'color': 'orange', # A different color for persisted planning stations
            'fillColor': freq_info['fill'],
            'fillOpacity': 0.2,
            'weight': 2,
            'popup_content': f"""
                <div style='width:200px'>
                    <b>{station['name']}</b><br>
                    <b>Status:</b> Persisted Planning<br>
                    <b>ID:</b> {station['id']}<br>
                    <b>Frequency:</b> {allocated_freq}<br>
                    <b>Radius:</b> {station['safe_radius_km']} km
                    <b>Timeslot:</b> {station['timeslot']}<br>
                </div>
            """
        })


    # Add CURRENT PLANNING stations from frontend (temporary, user input) to the map data
    # These are the ones the user is currently manipulating in the UI.
    for p_station in frontend_planning_stations:
        p_id = p_station.get('id')
        p_name = p_station.get('name') or f"Planning Station {p_station.get('id', 'N/A')}"
        p_lat = float(p_station.get('lat') or 0.0)
        p_lon = float(p_station.get('lon') or 0.0)
        p_rad = float(p_station.get('rad') or 12.0)
        p_freq = int(p_station.get('frequency') or 1)
        p_onboard_slots = int(p_station.get('onboard_slots') or 0)

        freq_info = FREQ_COLORS.get(p_freq, DEFAULT_COLOR)

        all_stations_for_map_drawing.append({
            'id': p_id,
            'type': 'planning', # This remains 'planning' for temporary UI stations
            'name': p_name,
            'lat': p_lat,
            'lon': p_lon,
            'radius': p_rad,
            'frequency': p_freq,
            'color': 'red', # Red for active planning stations
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
    print(f"All stations for map drawing (after processing): {all_stations_for_map_drawing}")

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
    # Check conflicts between frontend planning stations and approved stations
    # We need to explicitly convert approved['latitude'] and approved['longitude'] to float
    # for calculate_distance if they are coming directly from sqlite3.Row without prior conversion.
    for p_station in frontend_planning_stations:
        p_lat = float(p_station.get('lat') or 0.0)
        p_lon = float(p_station.get('lon') or 0.0)
        p_rad = float(p_station.get('rad') or 12.0)
        p_freq = int(p_station.get('frequency') or 1)

        for approved in approved_stations_raw: # Use raw approved stations for conflict check
            approved_freq = approved['allocated_frequency']
            if approved_freq is None:
                continue

            if p_freq == approved_freq:
                distance = calculate_distance(
                    p_lat, p_lon,
                    float(approved['latitude']), float(approved['longitude'])
                )
                min_distance = (p_rad + float(approved['safe_radius_km']))

                if distance < min_distance:
                    inter_type_conflicts.append({
                        'planning_name': p_station.get('name'),
                        'planning_freq': p_freq,
                        'approved_name': approved['name'],
                        'approved_freq': approved_freq,
                        'distance': distance,
                        'min_distance': min_distance,
                        'planning_lat': p_lat,
                        'planning_lon': p_lon,
                        'approved_lat': float(approved['latitude']),
                        'approved_lon': float(approved['longitude']),
                        'popup_content': f"CONFLICT (Freq {p_freq}): {p_station.get('name')} & {approved['name']} - Dist: {distance:.2f}km < {min_distance:.2f}km required"
                    })
    # Also check conflicts between frontend planning stations and *persisted* planning stations
    for p_station_frontend in frontend_planning_stations:
        p_lat_fe = float(p_station_frontend.get('lat') or 0.0)
        p_lon_fe = float(p_station_frontend.get('lon') or 0.0)
        p_rad_fe = float(p_station_frontend.get('rad') or 12.0)
        p_freq_fe = int(p_station_frontend.get('frequency') or 1)

        for p_station_db in planning_stations_from_db_raw: # Use raw planning stations from DB
            p_db_freq = p_station_db['allocated_frequency']
            if p_db_freq is None:
                continue

            if p_freq_fe == p_db_freq and p_station_frontend.get('id') != f"db_planning_{p_station_db['id']}": # Avoid self-conflict if ID matches
                distance = calculate_distance(
                    p_lat_fe, p_lon_fe,
                    float(p_station_db['latitude']), float(p_station_db['longitude'])
                )
                min_distance = (p_rad_fe + float(p_station_db['safe_radius_km']))

                if distance < min_distance:
                    inter_type_conflicts.append({
                        'planning_name': p_station_frontend.get('name'),
                        'planning_freq': p_freq_fe,
                        'approved_name': p_station_db['name'], # Treat persisted planning as "approved" for conflict message
                        'approved_freq': p_db_freq,
                        'distance': distance,
                        'min_distance': min_distance,
                        'planning_lat': p_lat_fe,
                        'planning_lon': p_lon_fe,
                        'approved_lat': float(p_station_db['latitude']),
                        'approved_lon': float(p_station_db['longitude']),
                        'popup_content': f"CONFLICT (Freq {p_freq_fe}): {p_station_frontend.get('name')} (Planning) & {p_station_db['name']} (Persisted Planning) - Dist: {distance:.2f}km < {min_distance:.2f}km required"
                    })

    print(f"Inter-type conflicts: {inter_type_conflicts}")

    # calculate_all_overlaps should consider all stations on the map, including DB planning stations
    # For this, we need to pass a combined list of all stations that have lat/lon and radius for overlap calculation
    all_map_stations_for_overlap_check = []
    # Add approved stations
    for s in approved_stations_raw:
        all_map_stations_for_overlap_check.append({
            'id': f"approved_{s['id']}",
            'name': s['name'],
            'lat': float(s['latitude']),
            'lon': float(s['longitude']),
            'rad': float(s['safe_radius_km']),
            'frequency': int(s['allocated_frequency']) if s['allocated_frequency'] is not None else 0,
            'type': 'approved'
        })
    # Add persisted planning stations
    for s in planning_stations_from_db_raw:
        all_map_stations_for_overlap_check.append({
            'id': f"db_planning_{s['id']}",
            'name': s['name'],
            'lat': float(s['latitude']),
            'lon': float(s['longitude']),
            'rad': float(s['safe_radius_km']),
            'frequency': int(s['allocated_frequency']) if s['allocated_frequency'] is not None else 0,
            'type': 'db_planning'
        })
    # Add frontend planning stations
    for s in frontend_planning_stations:
        all_map_stations_for_overlap_check.append({
            'id': s.get('id'),
            'name': s.get('name'),
            'lat': float(s.get('lat') or 0.0),
            'lon': float(s.get('lon') or 0.0),
            'rad': float(s.get('rad') or 12.0),
            'frequency': int(s.get('frequency') or 1),
            'type': 'planning'
        })


    overlapping_pair_data, has_major_conflict = calculate_all_overlaps(all_map_stations_for_overlap_check)
    print(f"Overlapping pair data: {overlapping_pair_data}")

    overall_has_conflict = has_major_conflict or bool(inter_type_conflicts)

    return jsonify({
        'allStationData': all_stations_for_map_drawing,
        'overlappingPairData': overlapping_pair_data,
        'interTypeConflicts': inter_type_conflicts,
        'hasConflict': overall_has_conflict,
        'center_location': center_location,
        'zoom_level': zoom_level
    })

@app.route('/allocate_slots_endpoint', methods=['POST'])
def submit_data_for_excel_generation():
    """
    Handles the request to run the allocation logic, persist results to the 'planning_stations' DB table,
    and then generate the Excel file for download.
    """
    try:
        planning_stations_data_from_frontend = request.json
        print(f"DEBUG routes.py: Received planning station data for allocation and Excel generation: {planning_stations_data_from_frontend}")

        if not planning_stations_data_from_frontend or not isinstance(planning_stations_data_from_frontend, list):
            return jsonify({"error": "Invalid station data received for allocation"}), 400

        # --- STEP 1: Run Allocation Logic ---
        # The allocate_slots function now returns the allocated planning stations with their final details
        # This list will contain the *results* of the allocation for the *current batch* of planning stations.
        allocated_planning_results = allocate_slots(planning_stations_data_from_frontend)
        print(f"DEBUG routes.py: Allocation results from processing.py: {allocated_planning_results}")

        # --- STEP 2: Persist Allocated Planning Stations to 'planning_stations' Database Table ---
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for station_result in allocated_planning_results:
            if station_result.get('Status') == 'Allocated':
                try:
                    # Use SKac_ID (Kavach ID) as the unique identifier for update/insert
                    skac_id = station_result.get("Stationary Kavach ID")
                    
                    # Check if a station with this SKac_ID already exists in planning_stations
                    existing_station_query = cursor.execute("SELECT id FROM planning_stations WHERE SKac_ID = ?", (skac_id,)).fetchone()
                    
                    if existing_station_query:
                        # Update existing planning station
                        station_id_to_update = existing_station_query[0]
                        cursor.execute(
                            """UPDATE planning_stations SET
                                name=?, Station_Code=?, SKac_ID=?, latitude=?, longitude=?, safe_radius_km=?, status=?, allocated_frequency=?, timeslot=?, Area_type=?
                                WHERE id = ?""",
                            (
                                station_result.get("Station"), # 'Station' is the name from allocation output
                                station_result.get("Station Code"),
                                skac_id,
                                station_result.get("Latitude"),
                                station_result.get("Longitude"),
                                station_result.get("SafeRadius"),
                                station_result.get("Status"), # Should be 'Allocated'
                                station_result.get("Frequency"),
                                station_result.get("Allocated Timeslot Range"), # Persist the allocated timeslot
                                "Allocated Planning" # Area_type for successfully allocated planning stations
                            )
                        )
                        print(f"DEBUG routes.py: Updated existing planning station {station_result.get('Station')} (ID: {station_id_to_update}) in 'planning_stations' DB.")
                    else:
                        # Insert new planning station
                        cursor.execute(
                            """INSERT INTO planning_stations (name, Station_Code, SKac_ID, latitude, longitude, safe_radius_km, status, allocated_frequency, timeslot, Area_type)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                            (
                                station_result.get("Station"),
                                station_result.get("Station Code"),
                                skac_id,
                                station_result.get("Latitude"),
                                station_result.get("Longitude"),
                                station_result.get("SafeRadius"),
                                station_result.get("Status"),
                                station_result.get("Frequency"),
                                station_result.get("Allocated Timeslot Range"),
                                "Allocated Planning" # Area_type for new allocated planning stations
                            )
                        )
                        print(f"DEBUG routes.py: Inserted new planning station {station_result.get('Station')} into 'planning_stations' DB.")
                except sqlite3.IntegrityError as e:
                    print(f"WARNING routes.py: Could not save/update station {station_result.get('Station')} to 'planning_stations' due to integrity error (e.g., duplicate SKac_ID): {e}")
                except Exception as e:
                    print(f"ERROR routes.py: Failed to save allocated station {station_result.get('Station')} to 'planning_stations' DB: {e}")
                    traceback.print_exc()

        conn.commit()
        conn.close()
        print("DEBUG routes.py: All allocated planning stations processed for DB persistence in 'planning_stations'.")

        # --- STEP 3: Generate the Excel file using the allocated data ---
        # Pass the `allocated_planning_results` to generate_excel
        output_filepath = generate_excel(allocated_planning_results)
        
        if output_filepath:
            filename = os.path.basename(output_filepath)
            return jsonify({
                "message": "Excel file generated successfully and stations persisted to DB.",
                "fileUrl": url_for('download_generated_file', filename=filename, _external=True)
            })
        else:
            return jsonify({"error": "Failed to generate Excel file after allocation."}, 500)

    except Exception as e:
        print(f"Error in submit_data_for_excel_generation: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/static/downloads/<filename>')
def download_generated_file(filename):
    full_path_to_downloads = os.path.join(app.root_path, app.config["UPLOAD_FOLDER"])
    print(f"DEBUG routes.py: Attempting to serve file: {filename} from {full_path_to_downloads}")
    try:
        return send_from_directory(full_path_to_downloads, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"message": "File not found or not yet available."}), 404
    except Exception as e:
        print(f"Error serving file {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin")
def admin_page():
    return render_template("admin.html")

def validate_timeslot(timeslot_str):
    if not isinstance(timeslot_str, str):
        return False, "Timeslot must be a string."
    
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
        
        timeslot = data.get('timeslot')
        is_valid, message = validate_timeslot(timeslot)
        if not is_valid:
            return jsonify(success=False, message=f"Timeslot Error: {message}"), 400

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
            """INSERT INTO approved_stations (name, Station_Code, SKac_ID, latitude, longitude, safe_radius_km, status, allocated_frequency, timeslot, Area_type)
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
    """
    Fetches stations from either 'approved_stations' or 'planning_stations' table
    based on the 'table' query parameter. Defaults to 'approved_stations'.
    """
    table_name = request.args.get('table', 'approved_stations')
    
    if table_name not in ['approved_stations', 'planning_stations']:
        return jsonify(stations=[], error="Invalid table name provided."), 400

    conn = get_db_connection()
    try:
        stations_cursor = conn.execute(f"SELECT * FROM {table_name} ORDER BY id").fetchall()
        stations = [dict(row) for row in stations_cursor]
        return jsonify(stations=stations)
    except sqlite3.OperationalError as e:
        print(f"Error fetching from table {table_name}: {e}")
        return jsonify(stations=[], error=f"Error fetching data: {e}"), 500
    finally:
        # Connection is managed by g and will be closed by app.teardown_appcontext
        pass


@app.route('/api/update_station', methods=['POST'])
def update_station():
    """
    Updates a station in either 'approved_stations' or 'planning_stations' table
    based on the 'target_table' field in the request data. Defaults to 'approved_stations'.
    """
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            return jsonify(success=False, message="Invalid request data, missing 'id'."), 400
        
        target_table = data.get('target_table', 'approved_stations')
        if target_table not in ['approved_stations', 'planning_stations']:
            return jsonify(success=False, message="Invalid target table for update."), 400

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
        
        query = f"UPDATE {target_table} SET {', '.join(update_fields)} WHERE id = ?"

        conn.execute(query, tuple(update_values))
        conn.commit()
        # conn.close() # Connection managed by g
        
        return jsonify(success=True, message="Station updated successfully!")
    
    except sqlite3.Error as db_error:
        traceback.print_exc()
        return jsonify(success=False, message=f"Database error: {db_error}"), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify(success=False, message=f"An internal server error occurred: {e}"), 500

@app.route('/api/delete_station', methods=['POST'])
def delete_station():
    """
    Deletes a station from either 'approved_stations' or 'planning_stations' table
    based on the 'target_table' field in the request data. Defaults to 'approved_stations'.
    """
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            return jsonify(success=False, message="Invalid request data, missing 'id'."), 400

        target_table = data.get('target_table', 'approved_stations')
        if target_table not in ['approved_stations', 'planning_stations']:
            return jsonify(success=False, message="Invalid target table for delete."), 400

        station_id = int(data['id'])

        conn = get_db_connection()
        conn.execute(f"DELETE FROM {target_table} WHERE id = ?", (station_id,))
        conn.commit()
        # conn.close() # Connection managed by g
        
        return jsonify(success=True, message="Station deleted successfully!")
    
    except Exception as e:
        traceback.print_exc()
        return jsonify(success=False, message=f"An internal server error: {e}"), 500
     
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

        df = pd.read_excel(file_path, header=None)

        print("🔍 First few rows of Excel file:")
        print(df.head())

        first_row_value = str(df.iloc[0, 0]).strip()
        try:
            station_count = int(first_row_value.split()[-1]) 
        except ValueError:
            print(f"⚠️ Couldn't extract number from '{first_row_value}', falling back on column count.")
            station_count = df.shape[1] - 1  # fallback: all columns except column 0

        print(f"🔢 Extracted Station Count: {station_count}")

        df = df.iloc[2:].T
        df.columns = df.iloc[0]  
        df = df[1:]

        df.rename(columns={df.columns[0]: "Station Name", 
                           df.columns[1]: "Static", 
                           df.columns[2]: "Onboard Slots"}, inplace=True)

        df.reset_index(drop=True, inplace=True)

        station_data = df.to_dict(orient="records")

        station_count = len(station_data)

        print(f"📊 Parsed Data: {station_data} \n {35*'---'}")

        return jsonify({"station_count": station_count, "data": station_data})

    except Exception as e:
        print(f"❌ Error processing file: {str(e)}")
        return jsonify({"error": f"File processing error: {str(e)}"}), 500

