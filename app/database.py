import sqlite3
import os
import sys
import shutil
from flask import g # Import g for application context, useful for managing connections

# Define the database file name
DATABASE_FILE_NAME = "approved_stations.db"

def get_db_path():
    """
    Determines the path for the SQLite database file.
    It places the DB in the current working directory for regular runs.
    For PyInstaller bundles, it copies a bundled DB if it doesn't exist in user data.
    """
    # Path in the current working directory (where main.py is run)
    user_data_path = os.path.join(os.getcwd(), DATABASE_FILE_NAME)

    # Check if running in a PyInstaller bundle
    if getattr(sys, 'frozen', False):
        # Path to the bundled DB inside the PyInstaller executable
        bundle_db_path = os.path.join(sys._MEIPASS, "app", DATABASE_FILE_NAME)

        # Copy the bundled DB to the user data path ONLY if it doesn't exist
        if not os.path.exists(user_data_path):
            print(f"Copying bundled DB from {bundle_db_path} to {user_data_path}")
            shutil.copyfile(bundle_db_path, user_data_path)
        else:
            print(f"Using existing DB at {user_data_path}")
    else:
        print(f"Using DB at: {user_data_path}")

    return user_data_path

# Global variable for the database file path
DATABASE_FILE = get_db_path()

def get_db_connection():
    """
    Helper to get a database connection that returns dict-like rows.
    Uses Flask's 'g' object to store and reuse the connection within a request context.
    """
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE_FILE)
        g.db.row_factory = sqlite3.Row # This allows accessing columns by name (e.g., row['name'])
        print("DEBUG: New DB connection opened.") # Debug print
    return g.db

def close_db(e=None):
    """
    Closes the database connection at the end of the request.
    Registered with app.teardown_appcontext in routes.py or main.py.
    """
    db = g.pop('db', None) # Get the db connection from g, remove it
    if db is not None:
        db.close()
        print("DEBUG: DB connection closed.") # Debug print

def db_init():
    """
    Initializes the database and creates both 'approved_stations' and 'planning_stations' tables
    if they don't already exist.
    """
    conn = get_db_connection() # Get connection from g, ensures it's within app context
    cursor = conn.cursor()

    # Create approved_stations table
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
    print("DEBUG: 'approved_stations' table checked/created.")

    # Create planning_stations table (same structure as approved_stations)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS planning_stations (
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
    print("DEBUG: 'planning_stations' table checked/created.")

    conn.commit()
    print("DEBUG: Database schema initialization complete.")

def get_approved_stations_from_db():
    """Fetches all stations from the 'approved_stations' table."""
    conn = get_db_connection()
    # No need to filter by status='approved' here, as the table itself implies approved.
    # If 'status' column is used for other states within this table, filter as needed.
    stations = conn.execute("SELECT * FROM approved_stations").fetchall()
    # The connection is managed by g and will be closed by close_db at end of request
    return stations

def get_planning_stations_from_db():
    """Fetches all stations from the 'planning_stations' table."""
    conn = get_db_connection()
    stations = conn.execute("SELECT * FROM planning_stations").fetchall()
    # The connection is managed by g and will be closed by close_db at end of request
    return stations

# This block is for direct execution of the script for initial DB setup
if __name__ == '__main__':
    # When running directly, Flask's app context isn't available,
    # so we create a temporary one to allow db_init to use get_db_connection.
    # This is for standalone database setup, not for when Flask app is running.
    # In main.py, db_init is called within app.app_context().
    print("Running db_init directly...")
    # Simulate app context for direct run
    try:
        # Create a dummy Flask app to get an app context
        temp_app = Flask(__name__)
        temp_app.config['TESTING'] = True # Mark as testing to avoid some overhead
        with temp_app.app_context():
            db_init()
            # If you want to add dummy data when running directly:
            # conn = get_db_connection()
            # cursor = conn.cursor()
            # cursor.execute(...) # Add dummy data here if needed for direct run
            # conn.commit()
        print("Direct db_init run complete.")
    except Exception as e:
        print(f"Error during direct db_init run: {e}")
        import traceback
        traceback.print_exc()

