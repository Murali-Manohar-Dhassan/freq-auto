import sqlite3
import os

# Make the path relative to the script's location
DATABASE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'approved_stations.db')

def db_init():
    """Initializes the database and creates/updates the table schema."""
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    c = conn.cursor()

    # --- Schema Migration ---
    # Use PRAGMA to get table info, which is a robust way to check for columns
    c.execute("PRAGMA table_info(stations)")
    existing_columns = [row[1] for row in c.fetchall()]

    # Add columns if they don't exist
    if 'timeslot' not in existing_columns:
        print("Adding 'timeslot' column...")
        c.execute("ALTER TABLE stations ADD COLUMN timeslot TEXT")
    if 'Area_type' not in existing_columns:
        print("Adding 'Area_type' column...")
        c.execute("ALTER TABLE stations ADD COLUMN Area_type TEXT")
    if 'SKac_ID' not in existing_columns:
        print("Adding 'SKac_ID' column...")
        c.execute("ALTER TABLE stations ADD COLUMN SKac_ID TEXT")
    if 'Station_Code' not in existing_columns:
        print("Adding 'Station_Code' column...")
        c.execute("ALTER TABLE stations ADD COLUMN Station_Code TEXT")


    # Expanded schema to hold all necessary data
    c.execute('''
        CREATE TABLE IF NOT EXISTS stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            safe_radius_km REAL NOT NULL,
            status TEXT NOT NULL,
            allocated_frequency INTEGER,
            static_slots_req INTEGER,
            onboard_slots_req INTEGER,
            allocated_p1 TEXT, allocated_p2 TEXT, allocated_p3 TEXT,
            allocated_p4 TEXT, allocated_p5 TEXT, allocated_p6 TEXT,
            timeslot TEXT,
            Area_type TEXT,
            SKac_ID TEXT,
            Station_Code TEXT
        )
    ''')
    
    # Add a few dummy approved stations for testing, if the table is empty
    c.execute("SELECT count(*) FROM stations")
    if c.fetchone()[0] == 0:
        print("Database is empty. Populating with initial test data...")
        try:
            stations_to_add = [
                ('SECUNDERABAD_TWR', 17.44, 78.50, 50.0, 'approved', 1, 'Day', 'Urban', 'SK001', 'SC-TWR'),
                ('HYDERABAD_TWR', 17.23, 78.43, 60.0, 'approved', 2, 'Night', 'Suburban', 'SK002', 'HYD-TWR')
            ]
            c.executemany("""
                INSERT INTO stations 
                (name, latitude, longitude, safe_radius_km, status, allocated_frequency, timeslot, Area_type, SKac_ID, Station_Code) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, stations_to_add)
            
            print(f"✅ Successfully added {len(stations_to_add)} initial stations.")
        except sqlite3.IntegrityError:
            print("Could not add initial stations, they might already exist.")
            pass # Ignore if they somehow get created in a race condition
            
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")

def get_db_connection():
    """Helper to get a database connection that returns dict-like rows."""
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# You can run this file directly to initialize/update the database
if __name__ == '__main__':
    db_init()