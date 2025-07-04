import sqlite3
import json
import os
import sys

# --- Configuration for THIS TEMPORARY EXPORT SCRIPT ---
# This script is specifically designed to export data from your OLD database
# which you've indicated is located at 'app/approved_stations.db'
# and contains a single table named 'stations'.

# Define the exact path to your old database file
# Assuming your project structure is:
# project_root/
# ├── app/
# │   └── approved_stations.db  <-- THIS IS THE DB WE ARE TARGETING
# └── export_data_to_json.py
DATABASE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'approved_stations.db')

# Define the output JSON file name
OUTPUT_JSON_FILE = 'old_stations_data_export.json'


def export_single_table_to_json(table_name, output_json_file):
    """
    Exports data from a specified table in the SQLite database to a JSON file.
    This version is for the old DB which likely has a single 'stations' table.
    """
    print(f"Starting export of '{table_name}' table from '{DATABASE_FILE}' to '{output_json_file}'...")

    conn = None
    try:
        # Check if the database file exists at the specified path
        if not os.path.exists(DATABASE_FILE):
            print(f"❌ Error: Database file not found at '{DATABASE_FILE}'.")
            print("Please ensure the 'approved_stations.db' file you want to export is in the 'app/' directory.")
            return

        conn = sqlite3.connect(DATABASE_FILE)
        conn.row_factory = sqlite3.Row # This allows accessing columns by name
        cursor = conn.cursor()

        # Check if the table exists in the target database
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        if not cursor.fetchone():
            print(f"⚠️ Warning: Table '{table_name}' does not exist in the database at '{DATABASE_FILE}'. Skipping export.")
            print("Please ensure the table name is correct (e.g., 'stations').")
            return

        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if not rows:
            print(f"No data found in '{table_name}' table. An empty JSON file will be created.")

        # Convert rows to a list of dictionaries
        data_to_export = [dict(row) for row in rows]

        # Write data to JSON file
        with open(output_json_file, 'w', encoding='utf-8') as f:
            json.dump(data_to_export, f, indent=4, ensure_ascii=False)

        print(f"✅ Successfully exported {len(data_to_export)} records from '{table_name}' to '{output_json_file}'.")

    except sqlite3.Error as e:
        print(f"❌ Database error during export of '{table_name}': {e}")
    except Exception as e:
        print(f"❌ An unexpected error occurred during export of '{table_name}': {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

# Run the export function when the script is executed directly
if __name__ == '__main__':
    # Call the export function for your single 'stations' table
    export_single_table_to_json('stations', OUTPUT_JSON_FILE)
    print("\nTemporary data export process finished.")
    print("Remember to use this exported JSON for re-importing into the new two-table structure.")
    print("This script is temporary and can be removed or reverted after successful export.")

