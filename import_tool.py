import sqlite3
import json
import os

# --- Configuration ---
# The name of your JSON file containing the station data.
# Place this file inside the 'app/static/' directory.
JSON_FILE_NAME = 'skavidLookup.json'

# The path to the database file.
DATABASE_FILE = os.path.join('app', 'approved_stations.db')
# The path to the JSON file.
JSON_FILE_PATH = os.path.join('app', 'static', JSON_FILE_NAME)


def import_stations_from_json():
    """
    Reads station data from a JSON file and inserts it into the SQLite database.
    It will ignore stations that already exist based on the 'name' field.
    """
    print("Starting station import process...")

    # Check if the database file exists
    if not os.path.exists(DATABASE_FILE):
        print(f"❌ Error: Database file not found at '{DATABASE_FILE}'.")
        print("Please run your main Flask app first to initialize the database.")
        return

    # Check if the JSON file exists
    if not os.path.exists(JSON_FILE_PATH):
        print(f"❌ Error: JSON file not found at '{JSON_FILE_PATH}'.")
        print(f"Please make sure your JSON file is named '{JSON_FILE_NAME}' and is in the 'app/static/' folder.")
        return

    # Connect to the database
    conn = sqlite3.connect(DATABASE_FILE)
    c = conn.cursor()

    # Load the JSON data from the file
    with open(JSON_FILE_PATH, 'r') as f:
        stations_data = json.load(f)

    stations_to_insert = []
    for skac_id, details in stations_data.items():
        # Prepare a tuple with the data for insertion.
        # Provide default values for columns not present in the JSON file.
        station_tuple = (
            details.get('name'),
            float(details.get('latitude', 0.0)),
            float(details.get('longitude', 0.0)),
            25.0,  # default safe_radius_km
            'approved',  # default status
            None,  # default allocated_frequency
            '2-45',  # default timeslot
            details.get('zone', 'Unknown'), # Use 'zone' for Area_type, or default
            skac_id,
            details.get('code')
        )
        stations_to_insert.append(station_tuple)

    if not stations_to_insert:
        print("No stations found in the JSON file to import.")
        return

    print(f"Found {len(stations_to_insert)} stations in the JSON file. Attempting to import...")
    
    # Use 'INSERT OR IGNORE' to prevent errors if a station with a unique name already exists.
    # This makes the script safe to run multiple times.
    c.executemany("""
        INSERT OR IGNORE INTO stations 
        (name, latitude, longitude, safe_radius_km, status, allocated_frequency, timeslot, Area_type, SKac_ID, Station_Code) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, stations_to_insert)

    # Report how many rows were actually changed
    changes = conn.total_changes
    print(f"✅ Import complete. {c.rowcount} new station(s) were added to the database.")
    
    if len(stations_to_insert) - c.rowcount > 0:
        print(f"   {len(stations_to_insert) - c.rowcount} station(s) were skipped (likely already existed).")

    # Commit the changes and close the connection
    conn.commit()
    conn.close()


# Run the import function when the script is executed directly
if __name__ == '__main__':
    import_stations_from_json()
