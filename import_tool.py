import sqlite3
import json
import os
import sys

# Attempt to import get_db_path from your app.database module.
# This ensures consistency with how your main Flask app locates the database.
try:
    # Adjust sys.path to ensure 'app' package is discoverable if this script is run standalone
    script_dir = os.path.dirname(__file__)
    # Add current directory to path if it's the root (where main.py is)
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    # Add parent directory to path if this script were in 'app/'
    app_parent_dir = os.path.abspath(os.path.join(script_dir, '..'))
    if os.path.exists(os.path.join(script_dir, 'app')) and app_parent_dir not in sys.path:
        sys.path.insert(0, app_parent_dir)

    from app.database import get_db_path
except ImportError as e:
    print(f"Error: Could not import 'get_db_path' from 'app.database'.")
    print("Please ensure 'app/database.py' exists and is correctly structured.")
    print("You might need to run this script from the project's root directory.")
    sys.exit(1)


# --- Configuration ---
# The name of your JSON file containing the station data.
# This file should be placed in your project's root directory after export.
# If you are importing your 'old_stations_data_export.json', change this name.
JSON_FILE_NAME = 'old_stations_data_export.json' # <--- CHANGE THIS to your exported JSON file name
JSON_FILE_PATH = os.path.join(os.getcwd(), JSON_FILE_NAME) # <--- Assumes JSON is in project root


# Use the same logic as the main app to determine the database file path
DATABASE_FILE = get_db_path()


def import_stations_from_json():
    """
    Reads station data from a JSON file (expected to be a list of station objects)
    and inserts it into the SQLite database's 'approved_stations' table.
    It uses 'INSERT OR IGNORE' to prevent inserting duplicate stations based on
    unique constraints (SKac_ID and name).
    """
    print("Starting station import process...")
    print(f"Attempting to connect to database at: {DATABASE_FILE}")

    conn = None
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        conn.row_factory = sqlite3.Row  # Allows accessing columns by name
        cursor = conn.cursor()

        # Ensure the 'approved_stations' table exists before inserting data.
        # This mirrors the table creation from app/database.py.
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS approved_stations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                Station_Code TEXT,
                SKac_ID TEXT UNIQUE,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                safe_radius_km REAL,
                status TEXT,
                allocated_frequency INTEGER,
                static_slots_req INTEGER,
                onboard_slots_req INTEGER,
                allocated_p1 TEXT, allocated_p2 TEXT, allocated_p3 TEXT,
                allocated_p4 TEXT, allocated_p5 TEXT, allocated_p6 TEXT,
                timeslot TEXT,
                Area_type TEXT
            )
        ''')
        print("Ensured 'approved_stations' table exists.")

        # Check if the JSON file exists
        if not os.path.exists(JSON_FILE_PATH):
            print(f"❌ Error: JSON file not found at '{JSON_FILE_PATH}'.")
            print(f"Please make sure your JSON file is named '{JSON_FILE_NAME}' and is in the project root folder.")
            return

        # Load the JSON data from the file
        try:
            with open(JSON_FILE_PATH, 'r') as f:
                stations_data = json.load(f)
        except json.JSONDecodeError:
            print(f"❌ Error: Could not decode JSON from '{JSON_FILE_PATH}'. Check file format.")
            return
        except Exception as e:
            print(f"❌ Error reading JSON file: {e}")
            return

        if not isinstance(stations_data, list):
            print(f"❌ Error: Expected JSON data to be a list of objects, but got {type(stations_data)}. Please check your JSON file format.")
            return

        stations_to_insert = []
        # --- FIX: Iterate directly over the list of dictionaries ---
        for details in stations_data:
            # Extract skac_id from the 'details' dictionary
            skac_id = details.get('SKac_ID')

            # Validate essential fields before adding to insert list
            name = details.get('name')
            latitude = details.get('latitude')
            longitude = details.get('longitude')

            if not name or latitude is None or longitude is None:
                print(f"Skipping station (SKac_ID: {skac_id}, Name: {name}) due to missing essential data (name, latitude, or longitude).")
                continue
            if not skac_id:
                 print(f"Skipping station (Name: {name}) due to missing 'SKac_ID'.")
                 continue

            station_tuple = (
                name,
                details.get('Station_Code'),  # Station_Code
                skac_id,                      # SKac_ID
                float(latitude),
                float(longitude),
                float(details.get('safe_radius_km', 25.0)),  # Default radius_km
                details.get('status', 'approved'),           # Default status
                int(details.get('allocated_frequency')) if details.get('allocated_frequency') is not None else None,
                int(details.get('static_slots_req', 0)) if details.get('static_slots_req') is not None else None,
                int(details.get('onboard_slots_req', 0)) if details.get('onboard_slots_req') is not None else None,
                details.get('allocated_p1'),
                details.get('allocated_p2'),
                details.get('allocated_p3'),
                details.get('allocated_p4'),
                details.get('allocated_p5'),
                details.get('allocated_p6'),
                details.get('timeslot', '2-45'),             # Default timeslot if not in JSON
                details.get('Area_type', 'Unknown')               # Use 'Area_type' or default
            )
            stations_to_insert.append(station_tuple)

        if not stations_to_insert:
            print("No valid stations found in the JSON file to import.")
            return

        print(f"Found {len(stations_to_insert)} valid stations in the JSON file. Attempting to import into 'approved_stations'...")

        # Use 'INSERT OR IGNORE' to prevent errors if a station with a unique SKac_ID or name already exists.
        cursor.executemany("""
            INSERT OR IGNORE INTO approved_stations
            (name, Station_Code, SKac_ID, latitude, longitude, safe_radius_km, status, allocated_frequency,
             static_slots_req, onboard_slots_req, allocated_p1, allocated_p2, allocated_p3, allocated_p4,
             allocated_p5, allocated_p6, timeslot, Area_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, stations_to_insert)

        changes = cursor.rowcount  # Number of rows actually inserted
        print(f"✅ Import complete. {changes} new station(s) were added to the 'approved_stations' database.")

        if len(stations_to_insert) - changes > 0:
            print(f"    {len(stations_to_insert) - changes} station(s) were skipped (likely already existed or due to unique constraint violation).")

        conn.commit()

    except sqlite3.Error as e:
        print(f"❌ Database error during import: {e}")
    except Exception as e:
        print(f"❌ An unexpected error occurred during import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()


# Run the import function when the script is executed directly
if __name__ == '__main__':
    # This ensures that when you run this script directly, it attempts to
    # create the tables if they don't exist before importing.
    import_stations_from_json()

