from flask import Flask, render_template, request, jsonify, send_file, session
import os
import io
import re
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

@app.route("/")
def home():
    return render_template("index.html")

# --- UPDATED: Color palette now matches your new HTML legend ---
# NOTE: Folium uses color names. I've matched them to your RGB values.
# The tuple is (Circle Color, Lighter Fill for Planning Circle)
FREQ_COLORS = {
    1: ('#D6D629', '#FafaD2'),  # Yellow
    2: ('#009218', '#C8E6C9'),  # Green
    3: ('#F8AC1E', '#FFECB3'),  # Orange
    4: ('#3076D1', '#D1E7FF'),  # Blue
    5: ('gray', '#E0E0E0'),     # Gray
    6: ('#D41F1F', '#FFCDD2'),  # Dark Red
    7: ('#E03EE6', '#E1BEE7'),  # Purple
}
DEFAULT_COLOR = ('lightgray', '#F5F5F5')


@app.route('/api/update_map', methods=['POST'])
def update_map():
    data = request.json

    new_planning_stations = []
    if 'planning_stations' in data:
        for station_data in data['planning_stations']:
            try:
                planning_station = {
                    'lat': float(station_data.get('lat')),
                    'lon': float(station_data.get('lon')),
                    'radius': float(station_data.get('rad', 15.0)),
                    'name': station_data.get('name', 'New Station'),
                    'frequency': int(station_data.get('frequency', 1)), # Frontend now sends 'frequency'
                    'timestamp': station_data.get('timestamp', datetime.now().isoformat())
                }
                new_planning_stations.append(planning_station)
            except (ValueError, TypeError) as e:
                print(f"Error processing planning station data: {station_data}. Error: {e}")
                continue

    session['planning_stations'] = new_planning_stations
    session.modified = True

    if session.get('planning_stations'):
        avg_lat = sum(s['lat'] for s in session['planning_stations']) / len(session['planning_stations'])
        avg_lon = sum(s['lon'] for s in session['planning_stations']) / len(session['planning_stations'])
        center_location = [avg_lat, avg_lon]
        zoom_level = 7
    else:
        center_location = [17.44, 78.50]
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
        freq = station['allocated_frequency'] # Access directly, not .get()
        circle_color, _ = FREQ_COLORS.get(freq, DEFAULT_COLOR) 
        
        folium.Marker(
            location=[float(station['latitude']), float(station['longitude'])],
            popup=folium.Popup(f"""
            <div style='width:200px'>
                <b>{station['name']}</b><br>
                <b>Status:</b> Approved<br>
                <b>Frequency:</b> {freq}<br>
                <b>Safe Radius:</b> {station['safe_radius_km']} km
            </div>
            """, max_width=300),
            icon=folium.Icon(color='green', icon='tower', prefix='fa')
        ).add_to(approved_group)
        
        folium.Circle(
            location=[float(station['latitude']), float(station['longitude'])],
            radius=float(station['safe_radius_km']) * 1000,
            color=circle_color,
            fill=True,
            fill_color=circle_color,
            fill_opacity=0.15,
            weight=2,
            popup=f"Coverage: {station['name']}"
        ).add_to(coverage_group)
        
        approved_coords.append([float(station['latitude']), float(station['longitude'])])
    
    if len(approved_coords) > 1:
        rail_line_approved = folium.PolyLine(
            locations=approved_coords,
            color='darkgreen',
            weight=4,
            opacity=0.8,
            popup='Existing Railway Network'
        ).add_to(approved_group)
        PolyLineTextPath(
            rail_line_approved, 
            text='  ▶  ', 
            repeat=True, 
            offset=7, 
            attributes={'fill': 'darkgreen', 'font-weight': 'bold', 'font-size': '16'}
        ).add_to(approved_group)
    
    planning_coords = []
    conflicts = []

    for i, p_station in enumerate(session['planning_stations']):
        # p_freq is already set from p_station.get('frequency', 1) and converted to int
        p_freq = p_station.get('frequency', 1)
        try:
            p_freq = int(p_freq)
        except (ValueError, TypeError):
            p_freq = 1

        circle_color, planning_fill_color = FREQ_COLORS.get(p_freq, DEFAULT_COLOR)
        
        folium.Marker(
            location=[p_station['lat'], p_station['lon']],
            popup=folium.Popup(f"""
            <div style='width:200px'>
                <b>{p_station['name']} (#{i+1})</b><br>
                <b>Status:</b> Planning<br>
                <b>Frequency:</b> {p_station['frequency']}<br>
                <b>Proposed Radius:</b> {p_station['radius']} km<br>
                <b>Added:</b> {p_station['timestamp'][:16]}
                <br><br>
                <button onclick="removeStation({i})" style='background:red;color:white;border:none;padding:5px;'>
                    Remove
                </button>
            </div>
            """, max_width=300),
            icon=folium.Icon(color='red', icon='satellite-dish', prefix='fa')
        ).add_to(planning_group)
        
        folium.Circle(
            location=[p_station['lat'], p_station['lon']],
            radius=p_station['radius'] * 1000,
            color=circle_color,
            fill=True,
            fill_color=planning_fill_color,
            fill_opacity=0.2,
            weight=2,
            popup=f"Proposed Coverage: {p_station['name']}"
        ).add_to(coverage_group)
        
        planning_coords.append([p_station['lat'], p_station['lon']])
        
        for approved in approved_stations:
            approved_freq = approved['allocated_frequency'] 
            if approved_freq is None: 
                continue 

            if p_freq == approved_freq: 
                distance = calculate_distance(
                    p_station['lat'], p_station['lon'],
                    approved['latitude'], approved['longitude']
                )
                min_distance = (p_station['radius'] + approved['safe_radius_km'])
                
                if distance < min_distance:
                    conflicts.append({
                        'planning': p_station,
                        'approved': approved,
                        'distance': distance,
                        'min_distance': min_distance
                    })
                    
                    folium.PolyLine(
                        locations=[
                            [p_station['lat'], p_station['lon']],
                            [approved['latitude'], approved['longitude']]
                        ],
                        color='red', # Conflict line color
                        weight=3,
                        opacity=0.8,
                        dash_array='10,5',
                        popup=f"CONFLICT (Freq {p_freq}): {distance:.2f}km < {min_distance:.2f}km required"
                    ).add_to(conflict_group)
    
    if len(planning_coords) > 1:
        proposed_rail_line = folium.PolyLine(
            locations=planning_coords,
            color='red',
            weight=4,
            opacity=0.7,
            dash_array='15,10',
            popup='Proposed Railway Extension'
        ).add_to(planning_group)
        PolyLineTextPath(
            proposed_rail_line, 
            text='  ►  ', 
            repeat=True, 
            offset=7, 
            attributes={'fill': 'red', 'font-weight': 'bold', 'font-size': '16'}
        ).add_to(planning_group)
    
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
        
        connection_line = folium.PolyLine(
            locations=[closest_approved, closest_planning],
            color='orange',
            weight=3,
            opacity=0.6,
            dash_array='5,5',
            popup=f'Proposed Connection: {min_distance:.2f}km'
        ).add_to(planning_group)
        PolyLineTextPath(
            connection_line, 
            text='  ›  ', 
            repeat=True, 
            offset=7, 
            attributes={'fill': 'orange', 'font-weight': 'bold', 'font-size': '14'}
        ).add_to(planning_group)
            
    approved_group.add_to(m)
    planning_group.add_to(m)
    coverage_group.add_to(m)
    conflict_group.add_to(m)
    
    folium.LayerControl().add_to(m)
    
    if conflicts:
        conflict_html = "<h4>Potential Conflicts:</h4><ul>"
        for conflict in conflicts:
            # FIX: Access sqlite3.Row elements directly using []
            approved_name = conflict['approved']['name']
            approved_freq = conflict['approved']['allocated_frequency'] # Direct access
            
            conflict_html += f"""
            <li><b>Planning:</b> {conflict['planning']['name']} (Freq: {conflict['planning'].get('frequency', 'N/A')})<br>
                <b>Approved:</b> {approved_name} (Freq: {approved_freq})<br>
            Distance: {conflict['distance']:.2f}km (Min Required: {conflict['min_distance']:.2f}km)</li>
            """
        conflict_html += "</ul>"
        
        folium.Marker(
            location=[center_location[0] + 0.1, center_location[1] + 0.1],
            popup=folium.Popup(conflict_html, max_width=400),
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
    
    data_io = io.BytesIO()
    m.save(data_io, close_file=False)
    data_io.seek(0)
    map_html = data_io.read().decode('utf-8')
    
    return map_html

# Route to remove planning station
@app.route('/remove_planning_station', methods=['POST'])
def remove_planning_station():
    data = request.json
    index = data.get('index')
    
    if 'planning_stations' in session and 0 <= index < len(session['planning_stations']):
        session['planning_stations'].pop(index)
        session.modified = True
    
    return jsonify({'status': 'success'})

# Route to clear all planning stations
@app.route('/clear_planning', methods=['POST'])
def clear_planning():
    session['planning_stations'] = []
    session.modified = True
    return jsonify({'status': 'success'})

# Route to get planning summary
@app.route('/planning_summary', methods=['GET'])
def planning_summary():
    if 'planning_stations' not in session:
        return jsonify({'stations': [], 'count': 0})

    return jsonify({
        'stations': session['planning_stations'],
        'count': len(session['planning_stations'])
    })

@app.route('/api/check_conflicts', methods=['POST'])
def check_conflicts():
    data = request.json
    
    if not all(k in data for k in ['lat', 'lon', 'frequency']):
        return jsonify({'hasConflict': False, 'conflictingStations': [], 'error': 'Missing lat, lon, or frequency in payload'}), 400

    try:
        new_lat = float(data.get('lat'))
        new_lon = float(data.get('lon'))
        new_rad = float(data.get('rad', 15.0))
        new_freq = int(data.get('frequency'))
    except (ValueError, TypeError) as e:
        return jsonify({'hasConflict': False, 'conflictingStations': [], 'error': f'Invalid data type for coordinates, radius, or frequency: {e}'}), 400
    
    conn = get_db_connection()
    approved_stations = conn.execute("SELECT * FROM stations WHERE status = 'approved'").fetchall()
    conn.close()
    
    conflicting_stations = []
    for station in approved_stations:
        approved_freq = station['allocated_frequency']
        if approved_freq is None:
            continue
        
        if new_freq == approved_freq:
            distance = calculate_distance(new_lat, new_lon, station['latitude'], station['longitude'])
            min_separation = (new_rad + station['safe_radius_km'])
            
            if distance < min_separation:
                conflicting_stations.append(station['name'])
    
    return jsonify({
        'hasConflict': len(conflicting_stations) > 0,
        'conflictingStations': conflicting_stations
    })

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
