from flask import Flask, render_template, request, jsonify, send_file, session
import os
import io
import threading
import pandas as pd
import folium
from folium.plugins import HeatMap, PolyLineTextPath
from datetime import datetime
import json
from app.processing import generate_excel
import sqlite3
from app.database import get_db_connection
import traceback

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = 'a_very_secret_and_random_key_here'

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

@app.route('/api/update_map', methods=['POST'])
def update_map():
    data = request.json
    
    new_lat = float(data.get('lat', 17.44))
    new_lon = float(data.get('lon', 78.50))
    new_rad = float(data.get('rad', 25.0))
    new_name = data.get('name', 'New Station')
    new_freq = data.get('frequency', 'TBD')
    
    if 'planning_stations' not in session:
        session['planning_stations'] = []
    
    planning_station = {
        'lat': new_lat,
        'lon': new_lon,
        'radius': new_rad,
        'name': new_name,
        'frequency': new_freq,
        'timestamp': datetime.now().isoformat()
    }
    session['planning_stations'].append(planning_station)
    
    if len(session['planning_stations']) > 1:
        avg_lat = sum(s['lat'] for s in session['planning_stations']) / len(session['planning_stations'])
        avg_lon = sum(s['lon'] for s in session['planning_stations']) / len(session['planning_stations'])
        center_location = [avg_lat, avg_lon]
        zoom_level = 7
    else:
        center_location = [new_lat, new_lon]
        zoom_level = 8
    
    m = folium.Map(location=center_location, zoom_start=zoom_level)
    
    conn = get_db_connection()
    approved_stations = conn.execute("SELECT * FROM stations WHERE status = 'approved'").fetchall()
    conn.close()
    
    approved_group = folium.FeatureGroup(name='Approved Stations')
    planning_group = folium.FeatureGroup(name='Planning Stations')
    coverage_group = folium.FeatureGroup(name='Coverage Areas')
    conflict_group = folium.FeatureGroup(name='Potential Conflicts')
    
    approved_coords = []
    for station in approved_stations:
        folium.Marker(
            location=[station['latitude'], station['longitude']], 
            popup=f"""
            <div style='width:200px'>
                <b>{station['name']}</b><br>
                <b>Status:</b> Approved<br>
                <b>Frequency:</b> {station['allocated_frequency']}<br>
                <b>Safe Radius:</b> {station['safe_radius_km']} km
            </div>
            """,
            icon=folium.Icon(color='green', icon='tower', prefix='fa')
        ).add_to(approved_group)
        
        folium.Circle(
            location=[station['latitude'], station['longitude']], 
            radius=station['safe_radius_km'] * 1000,
            color='green',
            fill=True,
            fill_color='lightgreen',
            fill_opacity=0.15,
            weight=2,
            popup=f"Coverage: {station['name']}"
        ).add_to(coverage_group)
        
        approved_coords.append([station['latitude'], station['longitude']])
    
    if len(approved_coords) > 1:
        # --- CHANGE START for Approved Railway Line ---
        rail_line_approved = folium.PolyLine(
            locations=approved_coords,
            color='darkgreen',
            weight=4,
            opacity=0.8,
            popup='Existing Railway Network'
        ).add_to(approved_group)
        # Add directional arrows
        PolyLineTextPath(
            rail_line_approved, 
            text='  ▶  ', 
            repeat=True, 
            offset=7, 
            attributes={'fill': 'darkgreen', 'font-weight': 'bold', 'font-size': '16'}
        ).add_to(approved_group)
        # --- CHANGE END ---
    
    planning_coords = []
    conflicts = []
    
    for i, station in enumerate(session['planning_stations']):
        folium.Marker(
            location=[station['lat'], station['lon']],
            popup=f"""
            <div style='width:200px'>
                <b>{station['name']} (#{i+1})</b><br>
                <b>Status:</b> Planning<br>
                <b>Frequency:</b> {station['frequency']}<br>
                <b>Proposed Radius:</b> {station['radius']} km<br>
                <b>Added:</b> {station['timestamp'][:16]}
                <br><br>
                <button onclick="removeStation({i})" style='background:red;color:white;border:none;padding:5px;'>
                    Remove
                </button>
            </div>
            """,
            icon=folium.Icon(color='red', icon='satellite-dish', prefix='fa')
        ).add_to(planning_group)
        
        folium.Circle(
            location=[station['lat'], station['lon']],
            radius=station['radius'] * 1000,
            color='red',
            fill=True,
            fill_color='pink',
            fill_opacity=0.2,
            weight=2,
            popup=f"Proposed Coverage: {station['name']}"
        ).add_to(coverage_group)
        
        planning_coords.append([station['lat'], station['lon']])
        
        for approved in approved_stations:
            distance = calculate_distance(
                station['lat'], station['lon'],
                approved['latitude'], approved['longitude']
            )
            min_distance = (station['radius'] + approved['safe_radius_km'])
            
            if distance < min_distance:
                conflicts.append({
                    'planning': station,
                    'approved': approved,
                    'distance': distance,
                    'min_distance': min_distance
                })
                
                folium.PolyLine(
                    locations=[
                        [station['lat'], station['lon']],
                        [approved['latitude'], approved['longitude']]
                    ],
                    color='red',
                    weight=3,
                    opacity=0.8,
                    dash_array='10,5',
                    popup=f"CONFLICT: {distance:.2f}km < {min_distance:.2f}km required"
                ).add_to(conflict_group)
    
    if len(planning_coords) > 1:
        # --- CHANGE START for Proposed Railway Line ---
        proposed_rail_line = folium.PolyLine(
            locations=planning_coords,
            color='red',
            weight=4,
            opacity=0.7,
            dash_array='15,10',
            popup='Proposed Railway Extension'
        ).add_to(planning_group)
        # Add directional arrows
        PolyLineTextPath(
            proposed_rail_line, 
            text='  ►  ', 
            repeat=True, 
            offset=7, 
            attributes={'fill': 'red', 'font-weight': 'bold', 'font-size': '16'}
        ).add_to(planning_group)
        # --- CHANGE END ---
    
    if approved_coords and planning_coords:
        min_distance = float('inf')
        closest_approved = None
        closest_planning = None
        
        for approved_coord in approved_coords:
            for planning_coord in planning_coords:
                dist = calculate_distance(
                    approved_coord[0], approved_coord[1],
                    planning_coord[0], planning_coord[1]
                )
                if dist < min_distance:
                    min_distance = dist
                    closest_approved = approved_coord
                    closest_planning = planning_coord
        
        # --- CHANGE START for Connection Line ---
        connection_line = folium.PolyLine(
            locations=[closest_approved, closest_planning],
            color='orange',
            weight=3,
            opacity=0.6,
            dash_array='5,5',
            popup=f'Proposed Connection: {min_distance:.2f}km'
        ).add_to(planning_group)
        # Add directional arrows
        PolyLineTextPath(
            connection_line, 
            text='  ›  ', 
            repeat=True, 
            offset=7, 
            attributes={'fill': 'orange', 'font-weight': 'bold', 'font-size': '14'}
        ).add_to(planning_group)
        # --- CHANGE END ---
        
    approved_group.add_to(m)
    planning_group.add_to(m)
    coverage_group.add_to(m)
    conflict_group.add_to(m)
    
    folium.LayerControl().add_to(m)
    
    if conflicts:
        conflict_html = "<h4>Potential Conflicts:</h4><ul>"
        for conflict in conflicts:
            conflict_html += f"""
            <li>{conflict['planning']['name']} vs {conflict['approved']['name']}: 
            {conflict['distance']:.2f}km (min: {conflict['min_distance']:.2f}km)</li>
            """
        conflict_html += "</ul>"
        
        folium.Marker(
            location=[center_location[0] + 0.1, center_location[1] + 0.1],
            popup=conflict_html,
            icon=folium.Icon(color='orange', icon='warning', prefix='fa')
        ).add_to(m)
    
    m.get_root().html.add_child(folium.Element("""
    <script>
    function removeStation(index) {
        fetch('/remove_planning_station', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({index: index})
        }).then(() => location.reload());
    }
    </script>
    """))
    
    data_io = io.BytesIO() # Renamed 'data' to 'data_io' to avoid conflict with request.json 'data'
    m.save(data_io, close_file=False)
    data_io.seek(0)
    map_html = data_io.read().decode('utf-8')
    
    return map_html
# Helper function to calculate distance
def calculate_distance(lat1, lon1, lat2, lon2):
    from math import radians, cos, sin, asin, sqrt
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c  # Earth's radius in kilometers
    
    return km

# Route to remove planning station
@app.route('/remove_planning_station', methods=['POST'])
def remove_planning_station():
    data = request.json
    index = data.get('index')
    
    if 'planning_stations' in session and 0 <= index < len(session['planning_stations']):
        session['planning_stations'].pop(index)
        session.modified = True
    
    return {'status': 'success'}

# Route to clear all planning stations
@app.route('/clear_planning', methods=['POST'])
def clear_planning():
    session['planning_stations'] = []
    session.modified = True
    return {'status': 'success'}

# Route to get planning summary
@app.route('/planning_summary', methods=['GET'])
def planning_summary():
    if 'planning_stations' not in session:
        return {'stations': [], 'count': 0}
    
    return {
        'stations': session['planning_stations'],
        'count': len(session['planning_stations'])
    }

@app.route('/api/check_conflicts', methods=['POST'])
def check_conflicts():
    data = request.json
    new_lat = float(data.get('lat'))
    new_lon = float(data.get('lon'))
    new_rad = float(data.get('rad', 25.0))
    
    conn = get_db_connection()
    approved_stations = conn.execute("SELECT * FROM stations WHERE status = 'approved'").fetchall()
    conn.close()
    
    conflicts = []
    for station in approved_stations:
        # Calculate distance between stations
        distance = calculate_distance(new_lat, new_lon, station['latitude'], station['longitude'])
        min_separation = (new_rad + station['safe_radius_km'])
        
        if distance < min_separation:
            conflicts.append(station['name'])
    
    return {
        'hasConflict': len(conflicts) > 0,
        'conflictingStations': conflicts
    }

@app.route("/admin")
def admin_page():
    """Renders the admin panel page."""
    return render_template("admin.html")

@app.route('/api/add_station', methods=['POST'])
def add_station():
    """API endpoint to add a new station to the database."""
    print("\n--- Received request to /api/add_station ---") # DEBUG
    try:
        data = request.get_json()
        if not data:
            print("[ERROR] Request body is not JSON or is empty.")
            return jsonify(success=False, message="Request body must be JSON."), 400
        
        print(f"[INFO] Received data: {data}") # DEBUG

        # --- Validate required fields ---
        required_fields = ['name', 'latitude', 'longitude', 'safe_radius_km', 'status']
        if not all(k in data and data[k] not in [None, ''] for k in required_fields):
            print(f"[ERROR] Missing or empty required fields. Received: {data}")
            return jsonify(success=False, message="All fields are required and cannot be empty."), 400
        
        # --- Type conversion and validation ---
        try:
            name = data['name']
            lat = float(data['latitude'])
            lon = float(data['longitude'])
            radius = float(data['safe_radius_km'])
            status = data['status']
            # .get() is safer for optional fields. Provide a default of None.
            freq = data.get('allocated_frequency') 
            if freq is not None and freq != '':
                freq = int(freq)
            else:
                freq = None # Ensure it's None if empty
        except (ValueError, TypeError) as e:
            print(f"[ERROR] Invalid data type for one of the fields: {e}")
            return jsonify(success=False, message=f"Invalid data format. Check that coordinates and radius are numbers. Error: {e}"), 400

        # --- Database insertion ---
        print("[INFO] Data validated. Connecting to database...")
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO stations (name, latitude, longitude, safe_radius_km, status, allocated_frequency) VALUES (?, ?, ?, ?, ?, ?)",
            (name, lat, lon, radius, status, freq)
        )
        conn.commit()
        conn.close()
        print(f"[SUCCESS] Station '{name}' added to the database.")
        return jsonify(success=True, message="Station added successfully!")

    except sqlite3.IntegrityError:
        print(f"[ERROR] IntegrityError: Station with name '{data.get('name')}' likely already exists.")
        return jsonify(success=False, message="A station with this name already exists."), 409
    except Exception as e:
        # This will catch any other unexpected errors
        print(f"[CRITICAL] An unexpected error occurred in /api/add_station:")
        traceback.print_exc() # This prints the full error stack to the console
        return jsonify(success=False, message=f"An internal server error occurred: {e}"), 500

@app.route('/api/get_stations', methods=['GET'])
def get_stations():
    """API endpoint to get all stations from the database."""
    print("\n[INFO] Request received to fetch all stations from /api/get_stations")
    conn = get_db_connection()
    stations_cursor = conn.execute("SELECT * FROM stations ORDER BY id").fetchall()
    conn.close()
    
    # Convert sqlite3.Row objects to a list of dictionaries so they can be sent as JSON
    stations = [dict(row) for row in stations_cursor]
    
    print(f"[INFO] Found {len(stations)} stations. Sending them to the frontend.")
    return jsonify(stations=stations)

@app.route('/api/update_station', methods=['POST'])
def update_station():
    """API endpoint to update an existing station."""
    print("\n[INFO] Received request to update a station.")
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            print("[ERROR] Invalid request data or missing 'id'.")
            return jsonify(success=False, message="Invalid request data."), 400
        
        station_id = int(data['id'])
        print(f"[INFO] Updating station with ID: {station_id}")

        # Connect to the database
        conn = get_db_connection()
        
        # Check if the station exists
        existing_station = conn.execute("SELECT * FROM stations WHERE id = ?", (station_id,)).fetchone()
        if not existing_station:
            print(f"[ERROR] No station found with ID: {station_id}")
            return jsonify(success=False, message="Station not found."), 404
        
        # Prepare the update query
        update_fields = []
        update_values = []
        
        for key, value in data.items():
            if key != 'id' and value is not None:  # Skip 'id' and None values
                update_fields.append(f"{key} = ?")
                update_values.append(value)
        
        if not update_fields:
            print("[ERROR] No valid fields provided for update.")
            return jsonify(success=False, message="No valid fields to update."), 400
        
        # Add the station ID to the end of the values list
        update_values.append(station_id)
        
        # Execute the update query
        query = f"UPDATE stations SET {', '.join(update_fields)} WHERE id = ?"
        conn.execute(query, tuple(update_values))
        conn.commit()
        conn.close()
        
        print(f"[SUCCESS] Station with ID {station_id} updated successfully.")
        return jsonify(success=True, message="Station updated successfully!")
    
    except sqlite3.Error as e:
        print(f"[ERROR] Database error during station update: {e}")
        return jsonify(success=False, message=f"Database error: {e}"), 500
    except Exception as e:
        print(f"[CRITICAL] An unexpected error occurred in /api/update_station:")
        traceback.print_exc()

@app.route('/api/delete_station', methods=['POST'])
def delete_station():
    """API endpoint to delete a station."""
    print("\n[INFO] Received request to delete a station.")
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            print("[ERROR] Invalid request data or missing 'id'.")
            return jsonify(success=False, message="Invalid request data."), 400
        
        station_id = int(data['id'])
        print(f"[INFO] Deleting station with ID: {station_id}")

        # Connect to the database
        conn = get_db_connection()
        
        # Check if the station exists
        existing_station = conn.execute("SELECT * FROM stations WHERE id = ?", (station_id,)).fetchone()
        if not existing_station:
            print(f"[ERROR] No station found with ID: {station_id}")
            return jsonify(success=False, message="Station not found."), 404
        
        # Execute the delete query
        conn.execute("DELETE FROM stations WHERE id = ?", (station_id,))
        conn.commit()
        conn.close()
        
        print(f"[SUCCESS] Station with ID {station_id} deleted successfully.")
        return jsonify(success=True, message="Station deleted successfully!")
    
    except sqlite3.Error as e:
        print(f"[ERROR] Database error during station deletion: {e}")
        return jsonify(success=False, message=f"Database error: {e}"), 500
    except Exception as e:
        print(f"[CRITICAL] An unexpected error occurred in /api/delete_station:")
        traceback.print_exc()

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
