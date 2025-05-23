import os
import math
import pandas as pd
import openpyxl
from openpyxl.styles import PatternFill, Border, Side, Alignment, Font # Added Font

# Define file paths
BASE_DIR = os.getcwd()
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
OUTPUT_FILE = os.path.join(UPLOAD_FOLDER, "output_kavach_slots_styled.xlsx") # Updated output file name

def allocate_slots(
    stations: list[dict],
    max_slots: int = 44,
    max_frequencies: int = 7
) -> list[dict]:
    allocations: list[dict] = []
    current_frequency: int = 1
    station_alloc: list[str | int] = [0] * max_slots
    onboard_alloc: list[str | int] = [0] * max_slots

    ONBOARD_CONGESTION_THRESHOLD_RATIO = 0.80
    MAX_P3_SLOTS_RATIO_OF_REQUESTED = 0.5

    def _reset_frequency_allocations():
        nonlocal station_alloc, onboard_alloc
        station_alloc[:] = [0] * max_slots
        onboard_alloc[:] = [0] * max_slots

    def _advance_frequency():
        nonlocal current_frequency
        current_frequency += 1
        if current_frequency > max_frequencies:
            current_frequency = 1
        _reset_frequency_allocations()

    _reset_frequency_allocations()

    for station_data in stations:
        station_name = station_data["name"]
        optimum_static_param = station_data["Static"]
        requested_onboard_slots = station_data["onboardSlots"]
        
        val_for_roundup = ((optimum_static_param * 120) + (requested_onboard_slots - optimum_static_param) * 40 + 100) / 66
        calculated_station_slots = math.ceil(val_for_roundup)

        initial_frequency_for_this_station = current_frequency
        best_suboptimal_plan_details = None
        ideal_plan_details = None

        for attempt_num in range(max_frequencies):
            current_freq_stat_available = station_alloc.count(0)
            if calculated_station_slots > current_freq_stat_available:
                if attempt_num < max_frequencies - 1:
                    _advance_frequency()
                    if current_frequency == initial_frequency_for_this_station and attempt_num > 0: break
                continue

            prospective_station_slots_indices: list[int] = []
            temp_s_placed_count = 0
            for i in range(max_slots):
                if temp_s_placed_count < calculated_station_slots:
                    if station_alloc[i] == 0:
                        prospective_station_slots_indices.append(i)
                        temp_s_placed_count += 1
                else: break
            
            if temp_s_placed_count < calculated_station_slots:
                if attempt_num < max_frequencies - 1:
                    _advance_frequency()
                    if current_frequency == initial_frequency_for_this_station and attempt_num > 0: break
                continue

            planned_onboard_indices_p1: list[int] = []
            planned_onboard_indices_p2: list[int] = []
            planned_onboard_indices_p3: list[int] = []
            
            onboard_to_place_p1 = requested_onboard_slots
            if onboard_to_place_p1 > 0:
                idx = 0
                while len(planned_onboard_indices_p1) < onboard_to_place_p1 and idx < max_slots:
                    if onboard_alloc[idx] == 0 and idx not in prospective_station_slots_indices:
                        planned_onboard_indices_p1.append(idx)
                        idx += 2
                    else: idx += 1
            
            onboard_to_place_p2 = requested_onboard_slots - len(planned_onboard_indices_p1)
            if onboard_to_place_p2 > 0:
                for i in range(max_slots):
                    if len(planned_onboard_indices_p2) < onboard_to_place_p2:
                        if onboard_alloc[i] == 0 and \
                           i not in prospective_station_slots_indices and \
                           i not in planned_onboard_indices_p1:
                            planned_onboard_indices_p2.append(i)
                    else: break
            
            onboard_to_place_p3 = requested_onboard_slots - len(planned_onboard_indices_p1) - len(planned_onboard_indices_p2)
            if onboard_to_place_p3 > 0:
                for i in range(max_slots - 1, -1, -1):
                    if len(planned_onboard_indices_p3) < onboard_to_place_p3:
                        if onboard_alloc[i] == 0 and \
                           i in prospective_station_slots_indices and \
                           i not in planned_onboard_indices_p1 and \
                           i not in planned_onboard_indices_p2:
                            planned_onboard_indices_p3.append(i)
                    else: break
            
            num_p1 = len(planned_onboard_indices_p1)
            num_p2 = len(planned_onboard_indices_p2)
            num_p3 = len(planned_onboard_indices_p3)
            total_onboard_planned = num_p1 + num_p2 + num_p3
            
            all_onboard_met = (total_onboard_planned >= requested_onboard_slots)
            onboard_already_used = sum(1 for owner in onboard_alloc if owner != 0)
            prospective_total_freq_onboard_usage = onboard_already_used + total_onboard_planned
            is_congested = (prospective_total_freq_onboard_usage > (ONBOARD_CONGESTION_THRESHOLD_RATIO * max_slots))
            
            uses_excessive_p3 = False
            if requested_onboard_slots > 0 and num_p3 > 0:
                if total_onboard_planned > 0:
                   if (num_p3 / total_onboard_planned) > MAX_P3_SLOTS_RATIO_OF_REQUESTED:
                        uses_excessive_p3 = True
                elif num_p3 > 0 :
                    uses_excessive_p3 = True

            current_plan_is_ideal = all_onboard_met and not is_congested and \
                                    (not uses_excessive_p3 if requested_onboard_slots > 0 else True)

            temp_plan = {
                "station_name": station_name, "frequency": current_frequency,
                "calculated_station_slots": calculated_station_slots,
                "prospective_station_slots_indices": list(prospective_station_slots_indices),
                "requested_onboard_slots": requested_onboard_slots,
                "onboard_indices_p1": list(planned_onboard_indices_p1),
                "onboard_indices_p2": list(planned_onboard_indices_p2),
                "onboard_indices_p3": list(planned_onboard_indices_p3),
                "all_onboard_met": all_onboard_met,
                "is_congested": is_congested, "uses_excessive_p3": uses_excessive_p3,
                "is_ideal": current_plan_is_ideal,
            }

            if current_plan_is_ideal:
                ideal_plan_details = temp_plan
                break 

            if all_onboard_met:
                if best_suboptimal_plan_details is None:
                    best_suboptimal_plan_details = temp_plan
                else:
                    if not temp_plan["is_congested"] and best_suboptimal_plan_details["is_congested"]:
                        best_suboptimal_plan_details = temp_plan
                    elif not temp_plan["is_congested"] and not best_suboptimal_plan_details["is_congested"]:
                        if not temp_plan["uses_excessive_p3"] and best_suboptimal_plan_details["uses_excessive_p3"]:
                             best_suboptimal_plan_details = temp_plan
            if attempt_num < max_frequencies - 1:
                _advance_frequency()
                if current_frequency == initial_frequency_for_this_station and attempt_num > 0 :
                    break
            else: 
                break
        
        final_plan_to_commit = None
        if ideal_plan_details:
            final_plan_to_commit = ideal_plan_details
        elif best_suboptimal_plan_details:
            final_plan_to_commit = best_suboptimal_plan_details
        
        if final_plan_to_commit:
            if current_frequency != final_plan_to_commit["frequency"]:
                target_freq = final_plan_to_commit["frequency"]
                while current_frequency != target_freq:
                    _advance_frequency()

            s_name = final_plan_to_commit["station_name"]
            s_freq = final_plan_to_commit["frequency"]
            
            stat_p_nums_allocated: list[str] = []
            for slot_idx in final_plan_to_commit["prospective_station_slots_indices"]:
                if station_alloc[slot_idx] == 0: 
                    station_alloc[slot_idx] = s_name
                    stat_p_nums_allocated.append(f"P{slot_idx+2}")

            onboard_p_nums_overall: list[str] = []
            onboard_p1_allocated_p_nums: list[str] = []
            onboard_p2_allocated_p_nums: list[str] = []
            onboard_p3_allocated_p_nums: list[str] = []
            
            current_onboard_placed_count = 0
            
            # Commit P1 slots
            for slot_idx in sorted(list(set(final_plan_to_commit["onboard_indices_p1"]))):
                if current_onboard_placed_count < final_plan_to_commit["requested_onboard_slots"]:
                    if onboard_alloc[slot_idx] == 0:
                        onboard_alloc[slot_idx] = s_name
                        p_num = f"P{slot_idx+2}"
                        onboard_p1_allocated_p_nums.append(p_num)
                        onboard_p_nums_overall.append(p_num)
                        current_onboard_placed_count += 1
                else: break
            
            # Commit P2 slots
            for slot_idx in sorted(list(set(final_plan_to_commit["onboard_indices_p2"]))):
                if current_onboard_placed_count < final_plan_to_commit["requested_onboard_slots"]:
                    if onboard_alloc[slot_idx] == 0:
                        onboard_alloc[slot_idx] = s_name
                        p_num = f"P{slot_idx+2}"
                        onboard_p2_allocated_p_nums.append(p_num)
                        onboard_p_nums_overall.append(p_num)
                        current_onboard_placed_count += 1
                else: break

            # Commit P3 slots
            for slot_idx in sorted(list(set(final_plan_to_commit["onboard_indices_p3"]))):
                if current_onboard_placed_count < final_plan_to_commit["requested_onboard_slots"]:
                    if onboard_alloc[slot_idx] == 0:
                        onboard_alloc[slot_idx] = s_name
                        p_num = f"P{slot_idx+2}"
                        onboard_p3_allocated_p_nums.append(p_num)
                        onboard_p_nums_overall.append(p_num)
                        current_onboard_placed_count += 1
                else: break

            allocations.append({
                "Station": s_name, "Frequency": s_freq,
                "Stationary Kavach Slots Requested": final_plan_to_commit["calculated_station_slots"],
                "Stationary Kavach Slots Allocated": ", ".join(sorted(stat_p_nums_allocated, key=lambda x: int(x[1:]))),
                "Num Stationary Allocated": len(stat_p_nums_allocated),
                "Onboard Kavach Slots Requested": final_plan_to_commit["requested_onboard_slots"],
                "Onboard Kavach Slots Allocated": ", ".join(sorted(onboard_p_nums_overall, key=lambda x: int(x[1:]))),
                "Num Onboard Allocated": len(onboard_p_nums_overall),
                "Onboard Slots P1 Allocated": ", ".join(sorted(onboard_p1_allocated_p_nums, key=lambda x: int(x[1:]))),
                "Onboard Slots P2 Allocated": ", ".join(sorted(onboard_p2_allocated_p_nums, key=lambda x: int(x[1:]))),
                "Onboard Slots P3 Allocated": ", ".join(sorted(onboard_p3_allocated_p_nums, key=lambda x: int(x[1:]))),
                "Debug_IsIdeal": final_plan_to_commit["is_ideal"],
                "Debug_Congested": final_plan_to_commit["is_congested"],
                "Debug_ExcessiveP3": final_plan_to_commit["uses_excessive_p3"]
            })
        else: 
            allocations.append({
                "Station": station_name, "Frequency": "N/A",
                "Stationary Kavach Slots Requested": calculated_station_slots,
                "Stationary Kavach Slots Allocated": "", "Num Stationary Allocated": 0,
                "Onboard Kavach Slots Requested": requested_onboard_slots,
                "Onboard Kavach Slots Allocated": "", "Num Onboard Allocated": 0,
                "Onboard Slots P1 Allocated": "", "Onboard Slots P2 Allocated": "", "Onboard Slots P3 Allocated": "",
                "Error": "No suitable slot configuration found on any frequency."
            })
    return allocations

def generate_excel(input_stations_data):
    alloc_results = allocate_slots(input_stations_data)
    print("Generating Excel file with new styling logic...")

    try:
        df = pd.DataFrame(alloc_results)
        expected_cols = [
            "Station", "Frequency",
            "Stationary Kavach Slots Requested", "Stationary Kavach Slots Allocated", "Num Stationary Allocated",
            "Onboard Kavach Slots Requested", "Onboard Kavach Slots Allocated", "Num Onboard Allocated",
            "Onboard Slots P1 Allocated", "Onboard Slots P2 Allocated", "Onboard Slots P3 Allocated",
            "Debug_IsIdeal", "Debug_Congested", "Debug_ExcessiveP3", "Error"
        ]
        for col in expected_cols:
            if col not in df.columns:
                df[col] = ""
        
        apply_color_scheme(df) # Pass the full DataFrame

        if os.path.exists(OUTPUT_FILE):
            print(f"Excel file saved successfully: {OUTPUT_FILE}")
            return OUTPUT_FILE
        else:
            print(f"Warning: {OUTPUT_FILE} was not created.")
            # Fallback to save uncolored if coloring somehow fails to save
            df.to_excel(os.path.join(UPLOAD_FOLDER,"fallback_uncolored_results.xlsx"), index=False)
            return None

    except Exception as e:
        print(f"Error generating Excel file: {e}")
        import traceback
        traceback.print_exc()
        return None

def apply_color_scheme(results_df: pd.DataFrame):
    if results_df.empty:
        print("Error: Input DataFrame for coloring is empty.")
        return

    color_map = {
        1: "FFFF00", 2: "8FCA1D", 3: "F39D1B", 4: "3197EA",
        5: "90918F", 6: "DC3B3D", 7: "CC6CE7"
    }
    font_color_p1 = "007220"  # Teal (ARGB for Openpyxl)
    font_color_p2 = "E4080A"  # Dark Red
    font_style_p3 = Font(bold=True, color="FF000000") # Bold Black
    
    all_slots = [f"P{i}" for i in range(2, 46)] 
    all_stations = results_df["Station"].unique()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Slot Allocation Matrix"

    ws.append(["Slot"] + list(all_stations)) # Header row
    ws.insert_rows(2) 
    ws.insert_rows(3) 
    ws.cell(row=2, column=1).value = "Stationary Slots Count"
    ws.cell(row=3, column=1).value = "Onboard Slots Count"

    for col_idx_df, station_name in enumerate(all_stations):
        excel_col = col_idx_df + 2
        station_data_rows = results_df[results_df["Station"] == station_name]
        if not station_data_rows.empty:
            station_data = station_data_rows.iloc[0]
            ws.cell(row=2, column=excel_col).value = station_data.get("Num Stationary Allocated", 0)
            ws.cell(row=3, column=excel_col).value = station_data.get("Num Onboard Allocated", 0)
        else:
            ws.cell(row=2, column=excel_col).value = 0
            ws.cell(row=3, column=excel_col).value = 0

    for r_idx, slot_name in enumerate(all_slots, start=4):
        ws.cell(row=r_idx, column=1).value = slot_name

    # Apply Styles, Colors, and Text
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    max_excel_col = len(all_stations) + 1
    max_excel_row = len(all_slots) + 3 

    for r in range(1, max_excel_row + 1):
        for c in range(1, max_excel_col + 1):
            cell = ws.cell(row=r, column=c)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

    for c_idx_df, station_name_header in enumerate(all_stations):
        ws.cell(row=1, column=c_idx_df + 2).alignment = Alignment(text_rotation=90, vertical='center', horizontal='center')
    
    for r_excel, slot_in_current_row in enumerate(all_slots, start=4): # Px data starts at Excel row 4
        for c_idx_df, station_name_for_coloring in enumerate(all_stations):
            excel_col_for_station = c_idx_df + 2
            cell_to_format = ws.cell(row=r_excel, column=excel_col_for_station)
            cell_to_format.value = "" # Default to blank

            station_data_rows = results_df[results_df["Station"] == station_name_for_coloring]
            if station_data_rows.empty: continue
            station_data = station_data_rows.iloc[0]

            s_slots_str = str(station_data.get("Stationary Kavach Slots Allocated", ""))
            o_p1_slots_str = str(station_data.get("Onboard Slots P1 Allocated", ""))
            o_p2_slots_str = str(station_data.get("Onboard Slots P2 Allocated", ""))
            o_p3_slots_str = str(station_data.get("Onboard Slots P3 Allocated", ""))

            current_station_stationary_slots = {s.strip() for s in s_slots_str.split(',') if s.strip() and s.strip().lower() != 'nan'}
            current_station_onboard_p1_slots = {s.strip() for s in o_p1_slots_str.split(',') if s.strip() and s.strip().lower() != 'nan'}
            current_station_onboard_p2_slots = {s.strip() for s in o_p2_slots_str.split(',') if s.strip() and s.strip().lower() != 'nan'}
            current_station_onboard_p3_slots = {s.strip() for s in o_p3_slots_str.split(',') if s.strip() and s.strip().lower() != 'nan'}

            is_stationary = slot_in_current_row in current_station_stationary_slots
            is_onboard_p1 = slot_in_current_row in current_station_onboard_p1_slots
            is_onboard_p2 = slot_in_current_row in current_station_onboard_p2_slots
            is_onboard_p3 = slot_in_current_row in current_station_onboard_p3_slots
            
            # Apply stationary background color first
            if is_stationary:
                frequency_val = station_data.get("Frequency")
                if pd.notna(frequency_val) and frequency_val != "N/A":
                    try:
                        frequency = int(frequency_val)
                        color_code = color_map.get(frequency, "FFFFFF")
                        cell_to_format.fill = PatternFill(start_color=color_code, end_color=color_code, fill_type="solid")
                    except ValueError: pass 
            
            # Apply text and font styles based on onboard allocation type
            if is_onboard_p3: # Priority 3 takes precedence for text if also stationary
                cell_to_format.value = slot_in_current_row
                cell_to_format.font = font_style_p3
            elif is_onboard_p1:
                cell_to_format.value = slot_in_current_row
                cell_to_format.font = Font(color=font_color_p1)
            elif is_onboard_p2:
                cell_to_format.value = slot_in_current_row
                cell_to_format.font = Font(color=font_color_p2)
            elif is_stationary: # Purely stationary, no P3 onboard text, keep value blank
                pass # cell_to_format.value remains "" as set by default or previous logic
            # If none of the above, cell remains blank with default formatting

    ws_details = wb.create_sheet(title="Allocation Details")
    detail_headers = list(results_df.columns)
    ws_details.append(detail_headers)
    for _, row in results_df.iterrows():
        ws_details.append(list(row.astype(str))) # Convert all to str for appending
    
    for column_cells in ws_details.columns:
        length = max(len(str(cell.value) if cell.value is not None else "") for cell in column_cells)
        ws_details.column_dimensions[openpyxl.utils.get_column_letter(column_cells[0].column)].width = length + 2

    wb.save(OUTPUT_FILE)
    print(f"Formatted and styled Excel file saved to: {OUTPUT_FILE}")

if __name__ == '__main__':
    sample_stations_data = [
        {'name': 'LC.563', 'Static': 4, 'onboardSlots': 10}, 
        {'name': 'Rundhi', 'Static': 4, 'onboardSlots': 14}, 
        {'name': 'LC.560', 'Static': 4, 'onboardSlots': 9},  
        {'name': 'Sholanka', 'Static': 4, 'onboardSlots': 16},
        {'name': 'LC.555', 'Static': 4, 'onboardSlots': 9},  
        {'name': 'Hodal', 'Static': 4, 'onboardSlots': 14}, 
        {'name': 'Station G', 'Static': 6, 'onboardSlots': 20}, 
        {'name': 'Station H', 'Static': 7, 'onboardSlots': 22}, 
        {'name': 'Station I', 'Static': 5, 'onboardSlots': 18}, 
        {'name': 'Station J', 'Static': 8, 'onboardSlots': 5}, 
        {'name': 'Station K', 'Static': 2, 'onboardSlots': 25}, 
        {'name': 'Station L', 'Static': 10, 'onboardSlots': 10},
        {'name': 'Mathura Jn', 'Static': 6, 'onboardSlots': 21},
    ]
    
    result_path = generate_excel(sample_stations_data)

    if result_path:
        print(f"Process completed. Output file: {result_path}")
    else:
        print("Process failed.")