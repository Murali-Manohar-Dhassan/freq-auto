import sqlite3
import os
import sys
import shutil

def get_db_path():
    # Destination path to store/write DB during runtime
    user_data_path = os.path.join(os.getcwd(), "approved_stations.db")

    if getattr(sys, 'frozen', False):
        # Running in PyInstaller
        bundle_db_path = os.path.join(sys._MEIPASS, "app", "approved_stations.db")

        # Copy DB only if it doesn't exist already
        if not os.path.exists(user_data_path):
            shutil.copyfile(bundle_db_path, user_data_path)

    return user_data_path

DATABASE_FILE = get_db_path()

def db_init():
    """Initializes the database and creates/updates the table schema."""
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    c = conn.cursor()

    # --- Schema Migration Logic ---
    c.execute("PRAGMA table_info(stations)")
    existing_columns = {row[1]: row[2] for row in c.fetchall()} # Store as name:type dict

    # Define the target schema
    target_schema = {
        'id': 'INTEGER', 'name': 'TEXT', 'latitude': 'REAL', 'longitude': 'REAL',
        'safe_radius_km': 'REAL', 'status': 'TEXT', 'allocated_frequency': 'INTEGER',
        'static_slots_req': 'INTEGER', 'onboard_slots_req': 'INTEGER',
        'allocated_p1': 'TEXT', 'allocated_p2': 'TEXT', 'allocated_p3': 'TEXT',
        'allocated_p4': 'TEXT', 'allocated_p5': 'TEXT', 'allocated_p6': 'TEXT',
        'timeslot': 'TEXT', # << CHANGED to TEXT
        'Area_type': 'TEXT', 'SKac_ID': 'TEXT', 'Station_Code': 'TEXT'
    }

    # Check if migration is needed (table exists but schema is outdated)
    if 'stations' in [row[0] for row in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
        if existing_columns.get('timeslot') != 'TEXT':
            print("Timeslot column type is not TEXT. Rebuilding table...")
            # 1. Rename old table
            c.execute("ALTER TABLE stations RENAME TO stations_old")

            # 2. Create the new table with the correct schema
            create_new_table(c)

            # 3. Copy data from old to new. We only copy columns that exist in both tables.
            c.execute("PRAGMA table_info(stations_old)")
            old_cols = [row[1] for row in c.fetchall()]
            
            common_cols = [col for col in target_schema if col in old_cols]

            # Special handling for timeslot: convert integer to a default string range
            select_cols_str = ', '.join([f"CAST({col} AS TEXT) || '-45'" if col == 'timeslot' else col for col in common_cols])

            try:
                c.execute(f"""
                    INSERT INTO stations ({', '.join(common_cols)}) 
                    SELECT {select_cols_str}
                    FROM stations_old
                """)
                print("Data migrated to new schema. Old integer timeslots converted to a default range.")
            except sqlite3.Error as e:
                 print(f"Could not migrate all data: {e}")

            # 4. Drop the old table
            c.execute("DROP TABLE stations_old")
    else:
        # Table doesn't exist, create it fresh
        create_new_table(c)


    # Add dummy data if the table is empty
    c.execute("SELECT count(*) FROM stations")
    if c.fetchone()[0] == 0:
        print("Database is empty. Populating with initial test data...")
        try:
            # Note: timeslot is now a TEXT field representing a range
            stations_to_add = [
                ('SECUNDERABAD_TWR', 17.44, 78.50, 50.0, 'approved', 1, '2-14', 'Urban', 'SK001', 'SC-TWR'),
                ('HYDERABAD_TWR', 17.23, 78.43, 60.0, 'approved', 2, '15-28', 'Suburban', 'SK002', 'HYD-TWR')
            ]
            c.executemany("""
                INSERT INTO stations 
                (name, latitude, longitude, safe_radius_km, status, allocated_frequency, timeslot, Area_type, SKac_ID, Station_Code) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, stations_to_add)
            
            print(f"✅ Successfully added {len(stations_to_add)} initial stations.")
        except sqlite3.IntegrityError:
            print("Could not add initial stations, they might already exist.")
            pass
            
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")
    print("Using database at:", DATABASE_FILE)


def create_new_table(cursor):
    """Creates the stations table with the latest schema."""
    cursor.execute('''
        CREATE TABLE stations (
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
    print("Table 'stations' created with the new TEXT timeslot schema.")


def get_db_connection():
    """Helper to get a database connection that returns dict-like rows."""
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def get_approved_stations_from_db():
    conn = get_db_connection()
    approved_stations = conn.execute("SELECT id, name, latitude, longitude, safe_radius_km, allocated_frequency FROM stations WHERE status = 'approved'").fetchall()
    conn.close()
    return approved_stations

# You can run this file directly to initialize/update the database
if __name__ == '__main__':
    db_init()
