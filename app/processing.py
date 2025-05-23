import os
import math
import pandas as pd
import xlsxwriter # Not directly used in fixed function but kept for context
import openpyxl
from openpyxl.styles import PatternFill
from openpyxl.styles import Border, Side, Alignment

# Define file paths (assuming these are correctly defined elsewhere as per original)
BASE_DIR = os.getcwd()
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
INPUT_FILE = os.path.join(UPLOAD_FOLDER, "slot_allocation.xlsx")
OUTPUT_FILE = os.path.join(UPLOAD_FOLDER, "output_kavach_slots_colored.xlsx")

def allocate_slots(
    stations: list[dict],  # Each dict has 'name', 'stationSlots', 'onboardSlots'
    max_slots: int = 44,
    max_frequencies: int = 4
) -> list[dict]:
    allocations: list[dict] = []
    current_frequency: int = 1

    # These track allocations on the *current* frequency for ALL stations on this frequency
    station_alloc: list[str | int] = [0] * max_slots  # Stores station_name if slot is stationary
    onboard_alloc: list[str | int] = [0] * max_slots  # Stores station_name if slot is used by an onboard device

    def _next_frequency_action() -> None:
        nonlocal current_frequency
        current_frequency += 1
        if current_frequency > max_frequencies:
            print(f"Warning: Exceeded max_frequencies ({max_frequencies}). Looping back to frequency 1.")
            current_frequency = 1
        
        station_alloc[:] = [0] * max_slots
        onboard_alloc[:] = [0] * max_slots
        # print(f"--- Moved to Frequency {current_frequency} ---") # Optional debug print

    for station_data in stations:
        station_name = station_data["name"]
        optimum_static = station_data["OptimumStatic"]
        requested_onboard_slots = station_data["onboardSlots"]
        
        # Calculate the number of stationary slots needed for this station
        val_for_roundup = ((optimum_static * 120) + (requested_onboard_slots - optimum_static) * 40 + 100) / 66
        calculated_station_slots = math.ceil(val_for_roundup)


        current_station_allocated_stationary_slots_list: list[str] = []
        current_station_allocated_onboard_slots_list: list[str] = []

        # print(f"\nProcessing Station: {station_name} (Req Stat: {calculated_station_slots}, Req Onb: {requested_onboard_slots}) on Freq: {current_frequency}")

        # --- Revised Frequency Switching Logic ---
        # Check current availability on the frequency BEFORE attempting allocation for this station
        current_freq_stat_available = station_alloc.count(0)
        # onboard_alloc.count(0) gives P-slots not taken by ANY station's onboard devices on this frequency
        current_freq_onboard_globally_free = onboard_alloc.count(0)

        needs_to_switch_frequency = False
        if calculated_station_slots > current_freq_stat_available:
            # print(f"  Switching for {station_name}: Stationary demand ({calculated_station_slots}) > available ({current_freq_stat_available})")
            needs_to_switch_frequency = True
        elif requested_onboard_slots > current_freq_onboard_globally_free:
            # Also switch if the raw number of P-slots free from *any* onboard device is less than requested.
            # This prevents trying to fit into a frequency that's already too saturated with other onboards.
            # print(f"  Switching for {station_name}: Onboard demand ({requested_onboard_slots}) > globally free for onboard ({current_freq_onboard_globally_free})")
            needs_to_switch_frequency = True

        if needs_to_switch_frequency:
            _next_frequency_action()
        # --- End of Revised Frequency Switching Logic ---
        
        # 2. Allocate Stationary Slots for the current station
        num_stat_slots_placed_for_current_station = 0
        for i in range(max_slots):
            if num_stat_slots_placed_for_current_station < calculated_station_slots:
                if station_alloc[i] == 0: 
                    station_alloc[i] = station_name 
                    current_station_allocated_stationary_slots_list.append(f"P{i+2}")
                    num_stat_slots_placed_for_current_station += 1
            else:
                break 
        
        # 3. Allocate Onboard Slots for the current station
        N_avail_alt_for_onboard_pattern = 0
        for j in range(max_slots):
            if onboard_alloc[j] == 0 and station_alloc[j] != station_name:
                N_avail_alt_for_onboard_pattern += 2
        
        max_slots_for_alternating_phase = max(0, (N_avail_alt_for_onboard_pattern // 2) - 1)
        num_onboard_to_place_alternatingly = min(requested_onboard_slots, max_slots_for_alternating_phase)
            
        onboard_placed_in_phase1 = 0
        current_physical_slot_idx = 0 
        while onboard_placed_in_phase1 < num_onboard_to_place_alternatingly and current_physical_slot_idx < max_slots:
            if onboard_alloc[current_physical_slot_idx] == 0 and \
               station_alloc[current_physical_slot_idx] != station_name: 
                onboard_alloc[current_physical_slot_idx] = station_name 
                current_station_allocated_onboard_slots_list.append(f"P{current_physical_slot_idx+2}")
                onboard_placed_in_phase1 += 1
                current_physical_slot_idx += 2
            else:
                current_physical_slot_idx += 1
        
        onboard_slots_still_needed_for_fill = requested_onboard_slots - onboard_placed_in_phase1
        current_physical_slot_idx = 0 
        onboard_placed_in_phase2 = 0
        while onboard_slots_still_needed_for_fill > 0 and current_physical_slot_idx < max_slots:
            if onboard_alloc[current_physical_slot_idx] == 0 and \
               station_alloc[current_physical_slot_idx] != station_name:
                onboard_alloc[current_physical_slot_idx] = station_name
                current_station_allocated_onboard_slots_list.append(f"P{current_physical_slot_idx+2}")
                onboard_slots_still_needed_for_fill -= 1
                onboard_placed_in_phase2 += 1
            current_physical_slot_idx += 1
        
        allocations.append({
            "Station": station_name,
            "Frequency": current_frequency,
            "Stationary Kavach Slots Requested": calculated_station_slots,
            "Stationary Kavach Slots Allocated": ", ".join(sorted(current_station_allocated_stationary_slots_list, key=lambda x: int(x[1:]))),
            "Num Stationary Allocated": len(current_station_allocated_stationary_slots_list),
            "Onboard Kavach Slots Requested": requested_onboard_slots,
            "Onboard Kavach Slots Allocated": ", ".join(sorted(current_station_allocated_onboard_slots_list, key=lambda x: int(x[1:]))),
            "Num Onboard Allocated": len(current_station_allocated_onboard_slots_list)
        })
        # print(f"  Station {station_name} done. Allocated Stat: {len(current_station_allocated_stationary_slots_list)}, Onboard: {len(current_station_allocated_onboard_slots_list)}")

    return allocations

# Step 2: Generate Excel File (Modified to use new output columns)
def generate_excel(stations_data): # Renamed input parameter
    alloc_results = allocate_slots(stations_data) 
    print("Generating Excel file...")

    try:
        df = pd.DataFrame(alloc_results)

        # Select columns for the report (adjust as needed)
        # Keeping original output columns plus new ones for clarity
        df_to_save = df[[
            "Station", "Frequency",
            "Stationary Kavach Slots Requested", "Stationary Kavach Slots Allocated", "Num Stationary Allocated",
            "Onboard Kavach Slots Requested", "Onboard Kavach Slots Allocated", "Num Onboard Allocated"
        ]]
        # Rename columns to match the original excel generation part if necessary
        # For the purpose of apply_color_scheme, it expects "Stationary Kavach Slots" and "Onboard Kavach Slots"
        # to contain the allocated slot strings.
        df_for_coloring = df.rename(columns={
            "Stationary Kavach Slots Allocated": "Stationary Kavach Slots",
            "Onboard Kavach Slots Allocated": "Onboard Kavach Slots"
        })

        print(f"Saving unformatted slot allocation data to: {INPUT_FILE}")
        df_for_coloring.to_excel(INPUT_FILE, index=False) # Save data that apply_color_scheme expects

        if os.path.exists(INPUT_FILE):
            print("Applying color scheme and formatting...")
            apply_color_scheme() 
        else:
            print("Error: INPUT_FILE not found before applying color scheme.")

        if os.path.exists(OUTPUT_FILE):
            print(f"Excel file saved successfully: {OUTPUT_FILE}")
            return OUTPUT_FILE
        else:
            print(f"Warning: OUTPUT_FILE not found. The unformatted data is in: {INPUT_FILE}")
            return INPUT_FILE

    except Exception as e:
        print(f"Error generating Excel file: {e}")
        return None


# Step 3: Apply Color Coding (largely unchanged, but relies on correct columns from INPUT_FILE)
def apply_color_scheme():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found for applying color scheme.")
        return 

    color_map = {
        1: "FFFF00",  # Yellow
        2: "8FCA1D",  # Green
        3: "F39D1B",  # Orange
        4: "3197EA",  # Blue
        5: "90918F",  # Cement Grey
        6: "DC3B3D",  # Red
        7: "CC6CE7"   # Purple
    }

    df = pd.read_excel(INPUT_FILE) # Reads the file saved by generate_excel
    
    all_slots = [f"P{i}" for i in range(2, 46)] 
    all_stations = df["Station"].unique()

    output_df = pd.DataFrame(index=all_slots)
    output_df["Slot"] = all_slots 

    for station_name in all_stations:
        output_df[station_name] = "" 

    for _, row in df.iterrows(): 
        station = row["Station"]
        
        stationary_slots_str = str(row.get("Stationary Kavach Slots", "")) # Use .get for safety
        onboard_slots_str = str(row.get("Onboard Kavach Slots", ""))     # Use .get for safety

        stationary_slots = [s.strip() for s in stationary_slots_str.split(",") if s.strip() and s.strip().lower() != 'nan']
        onboard_slots = [s.strip() for s in onboard_slots_str.split(",") if s.strip() and s.strip().lower() != 'nan']
        
        for slot_val in stationary_slots:
            if slot_val in output_df.index:
                output_df.loc[slot_val, station] = slot_val 
        
        for slot_val in onboard_slots:
            if slot_val in output_df.index:
                if output_df.loc[slot_val, station] == "": 
                    output_df.loc[slot_val, station] = slot_val # Mark with Px for coloring

    output_df.to_excel(OUTPUT_FILE, index=False)  
    
    wb = openpyxl.load_workbook(OUTPUT_FILE)
    ws = wb.active

    ws.insert_rows(2) 
    ws.insert_rows(3) 

    ws.cell(row=2, column=1).value = "Stationary Slots Count"
    ws.cell(row=3, column=1).value = "Onboard Slots Count"

    for col_idx_df, station_name_from_all_stations in enumerate(all_stations):
        excel_col = col_idx_df + 2 

        station_data_rows = df[df["Station"] == station_name_from_all_stations]
        if station_data_rows.empty:
            ws.cell(row=2, column=excel_col).value = 0
            ws.cell(row=3, column=excel_col).value = 0
            continue
        
        station_data = station_data_rows.iloc[0]
        
        # Fetch counts from the new columns if they exist, otherwise parse strings
        # The generate_excel now saves a file that apply_color_scheme reads.
        # That file should have "Stationary Kavach Slots" and "Onboard Kavach Slots" (allocated strings)
        
        s_slots_str = str(station_data.get("Stationary Kavach Slots", ""))
        o_slots_str = str(station_data.get("Onboard Kavach Slots", ""))

        stationary_count = len([s for s in s_slots_str.split(",") if s.strip() and s.strip().lower() != 'nan']) if s_slots_str and s_slots_str.lower() != 'nan' else 0
        onboard_count = len([s for s in o_slots_str.split(",") if s.strip() and s.strip().lower() != 'nan']) if o_slots_str and o_slots_str.lower() != 'nan' else 0
            
        ws.cell(row=2, column=excel_col).value = stationary_count
        ws.cell(row=3, column=excel_col).value = onboard_count

    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    max_excel_col = len(all_stations) + 1
    max_excel_row = len(all_slots) + 3 

    for r_idx in range(1, max_excel_row + 1):
        for c_idx in range(1, max_excel_col + 1):
            cell = ws.cell(row=r_idx, column=c_idx)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

    for c_idx_df, station_name_header in enumerate(all_stations):
        header_cell = ws.cell(row=1, column=c_idx_df + 2)
        header_cell.alignment = Alignment(text_rotation=90, vertical='center', horizontal='center')
        
    for data_row_excel in range(4, max_excel_row + 1):
        slot_in_current_row = ws.cell(row=data_row_excel, column=1).value 
        if not slot_in_current_row: continue

        for col_idx_df, station_name_for_coloring in enumerate(all_stations):
            excel_col_for_station = col_idx_df + 2
            
            cell_value_in_output_df = output_df.loc[slot_in_current_row, station_name_for_coloring]
            
            # We need to determine if this slot was stationary or onboard for coloring
            # The output_df just has 'Px' if allocated. Color based on stationary.
            
            station_specific_data_rows = df[df["Station"] == station_name_for_coloring]
            if station_specific_data_rows.empty: continue
            station_specific_data = station_specific_data_rows.iloc[0]

            s_slots_str_for_color = str(station_specific_data.get("Stationary Kavach Slots", ""))
            current_station_stationary_slots = [s.strip() for s in s_slots_str_for_color.split(',') if s.strip() and s.strip().lower() != 'nan']

            # Only color if the slot is marked in output_df AND it's a stationary slot for this station
            if cell_value_in_output_df == slot_in_current_row and slot_in_current_row in current_station_stationary_slots:
                frequency = station_specific_data["Frequency"]
                color_code = color_map.get(frequency, "FFFFFF") 
                
                cell_to_color = ws.cell(row=data_row_excel, column=excel_col_for_station)
                cell_to_color.fill = PatternFill(start_color=color_code, end_color=color_code, fill_type="solid")
                cell_to_color.value = ""  # Clear the text in the colored cell


    wb.save(OUTPUT_FILE)
    print(f"Formatted and colored Excel file saved to: {OUTPUT_FILE}")


if __name__ == '__main__':
    sample_stations_data = [
        {'name': 'LC.563', 'OptimumStatic': 4, 'onboardSlots': 10},
        {'name': 'Rundhi', 'OptimumStatic': 4, 'onboardSlots': 14},
        {'name': 'LC.560', 'OptimumStatic': 4, 'onboardSlots': 9},
        {'name': 'Sholanka', 'OptimumStatic': 4, 'onboardSlots': 16},
        {'name': 'LC.555', 'OptimumStatic': 4, 'onboardSlots': 9},
        {'name': 'Hodal', 'OptimumStatic': 4, 'onboardSlots': 14},
        {'name': 'LC.551', 'OptimumStatic': 4, 'onboardSlots': 9},
        {'name': 'Kosikalan', 'OptimumStatic': 4, 'onboardSlots': 14},
        {'name': 'LC.545', 'OptimumStatic': 4, 'onboardSlots': 9},
        {'name': 'Chhata', 'OptimumStatic': 4, 'onboardSlots': 14},
        {'name': 'LC.539', 'OptimumStatic': 4, 'onboardSlots': 9},
        {'name': 'Ajhai', 'OptimumStatic': 4, 'onboardSlots': 14},
        {'name': 'LC.535', 'OptimumStatic': 4, 'onboardSlots': 9},
        {'name': 'vrindavan', 'OptimumStatic': 4, 'onboardSlots': 14},
        {'name': 'Mathura Jn', 'OptimumStatic': 6, 'onboardSlots': 21},
    ]
    

    result_path = generate_excel(sample_stations_data)

    if result_path:
        print(f"Process completed. Output file: {result_path}")
    else:
        print("Process failed.")