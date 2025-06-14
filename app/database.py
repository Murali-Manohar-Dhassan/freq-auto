import sqlite3
import os

DATABASE_FILE = os.path.join(os.path.dirname(__file__), 'approved_stations.db')


def db_init():
    """Initializes the database and creates the table if it doesn't exist."""
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    c = conn.cursor()
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
            allocated_p4 TEXT, allocated_p5 TEXT, allocated_p6 TEXT
        )
    ''')
    # Add a few dummy approved stations for testing, if the table is empty
    c.execute("SELECT count(*) FROM stations")
    if c.fetchone()[0] == 0:
        try:
            c.execute("INSERT INTO stations (name, latitude, longitude, safe_radius_km, status, allocated_frequency) VALUES (?, ?, ?, ?, ?, ?)",
                      ('SECUNDERABAD_TWR', 17.44, 78.50, 50.0, 'approved', 1))
            c.execute("INSERT INTO stations (name, latitude, longitude, safe_radius_km, status, allocated_frequency) VALUES (?, ?, ?, ?, ?, ?)",
                      ('HYDERABAD_TWR', 17.23, 78.43, 60.0, 'approved', 2))
        except sqlite3.IntegrityError:
            pass # Ignore if they somehow get created in a race condition
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")

def get_db_connection():
    """Helper to get a database connection that returns dict-like rows."""
    conn = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn