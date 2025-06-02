import os
import math
from datetime import datetime
now = datetime.now()
import pandas as pd
import openpyxl
from openpyxl.styles import PatternFill, Border, Side, Alignment, Font
from openpyxl.utils import get_column_letter

# Define file paths
BASE_DIR = os.getcwd()
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
OUTPUT_FILE = os.path.join(UPLOAD_FOLDER, "output_kavach_slots_final_layout_v2.xlsx") # Updated output file name

def allocate_slots(
    stations: list[dict],
    max_slots: int = 44,
    max_frequencies: int = 7
) -> list[dict]:
    allocations_output: list[dict] = []
    
    # Store allocation state (station names or 0) for each slot on each frequency
    frequency_slot_maps = {
        f_id: {
            'station_alloc': [0] * max_slots, 
            'onboard_alloc': [0] * max_slots  
        }
        for f_id in range(1, max_frequencies + 1)
    }

    for station_data in stations:
        station_name = station_data["name"]
        optimum_static_param = station_data["Static"]
        requested_onboard_slots = station_data["onboardSlots"]
        station_code = station_data["StationCode"]
        skavach_id = station_data["KavachID"]
        latitude = station_data["Lattitude"]
        longitude = station_data["Longitude"]
        
        val_for_roundup = ((optimum_static_param * 120) + (requested_onboard_slots - optimum_static_param) * 40 + 100) / 66
        calculated_station_slots_needed = math.ceil(val_for_roundup)

        committed_plan_details_for_station = None

        # Try to place the current station on frequencies 1 through max_frequencies
        for current_freq_id_attempt in range(1, max_frequencies + 1):
            # Get the current allocation maps for the frequency being attempted
            station_alloc_map = frequency_slot_maps[current_freq_id_attempt]['station_alloc']
            onboard_alloc_map = frequency_slot_maps[current_freq_id_attempt]['onboard_alloc']

            # 1. Find prospective station slots on this frequency
            prospective_station_slots_indices: list[int] = []
            temp_s_placed_count = 0
            for i in range(max_slots):
                if temp_s_placed_count < calculated_station_slots_needed:
                    if station_alloc_map[i] == 0: # Check if slot is free on this frequency
                        prospective_station_slots_indices.append(i)
                        temp_s_placed_count += 1
                else:
                    break
            
            # If not enough station slots are available on this frequency, try the next frequency
            if len(prospective_station_slots_indices) < calculated_station_slots_needed:
                continue 

            # 2. Plan onboard slots (P1, P2, P3) on this frequency
            # (This detailed logic is adapted from your original P1, P2, P3 planning)
            planned_onboard_indices_p1: list[int] = []
            planned_onboard_indices_p2: list[int] = []
            planned_onboard_indices_p3: list[int] = []
            
            # P1 Planning
            onboard_to_place_p1 = requested_onboard_slots
            if onboard_to_place_p1 > 0:
                idx = 0
                while len(planned_onboard_indices_p1) < onboard_to_place_p1 and idx < max_slots:
                    is_slot_free = (onboard_alloc_map[idx] == 0)
                    is_not_prospective_station_slot = (idx not in prospective_station_slots_indices)
                    is_touching_station_slot = False
                    if is_not_prospective_station_slot:
                        if idx > 0 and (idx - 1) in prospective_station_slots_indices:
                            is_touching_station_slot = True
                        if not is_touching_station_slot and idx < max_slots - 1 and (idx + 1) in prospective_station_slots_indices:
                            is_touching_station_slot = True
                    
                    if is_slot_free and is_not_prospective_station_slot and not is_touching_station_slot:
                        planned_onboard_indices_p1.append(idx)
                        idx += 2
                    else:
                        idx += 1
            
            # P2 Planning
            onboard_to_place_p2 = requested_onboard_slots - len(planned_onboard_indices_p1)
            if onboard_to_place_p2 > 0:
                for i in range(max_slots):
                    if len(planned_onboard_indices_p2) < onboard_to_place_p2:
                        if onboard_alloc_map[i] == 0 and \
                           i not in prospective_station_slots_indices and \
                           i not in planned_onboard_indices_p1:
                            planned_onboard_indices_p2.append(i)
                    else:
                        break
            
            # P3 Planning
            onboard_to_place_p3 = requested_onboard_slots - len(planned_onboard_indices_p1) - len(planned_onboard_indices_p2)
            if onboard_to_place_p3 > 0:
                for i in range(max_slots - 1, -1, -1):
                    if len(planned_onboard_indices_p3) < onboard_to_place_p3:
                        if onboard_alloc_map[i] == 0 and \
                           i in prospective_station_slots_indices and \
                           i not in planned_onboard_indices_p1 and \
                           i not in planned_onboard_indices_p2:
                            planned_onboard_indices_p3.append(i)
                    else:
                        break

            num_p1 = len(planned_onboard_indices_p1)
            num_p2 = len(planned_onboard_indices_p2)
            num_p3 = len(planned_onboard_indices_p3)
            total_onboard_planned = num_p1 + num_p2 + num_p3
            
            all_onboard_met = (total_onboard_planned >= requested_onboard_slots)
            # Station slots are met (checked by the 'continue' above for prospective_station_slots_indices)

            # If both station and onboard slots are met, this is a successful plan for this frequency
            if all_onboard_met: # (and station slots were already confirmed to be met)
                committed_plan_details_for_station = {
                    "station_name": station_name, "frequency": current_freq_id_attempt,
                    "calculated_station_slots": calculated_station_slots_needed,
                    "prospective_station_slots_indices": list(prospective_station_slots_indices),
                    "requested_onboard_slots": requested_onboard_slots,
                    "onboard_indices_p1": list(planned_onboard_indices_p1),
                    "onboard_indices_p2": list(planned_onboard_indices_p2),
                    "onboard_indices_p3": list(planned_onboard_indices_p3),
                    "Static": optimum_static_param,
                    "StationCode": station_code, "KavachID": skavach_id,
                    "Lattitude": latitude, "Longitude": longitude
                }
                # Found a suitable frequency for this station, break from iterating frequencies
                break 
        
        # After trying all frequencies for the current station:
        if committed_plan_details_for_station:
            chosen_freq = committed_plan_details_for_station["frequency"]
            s_name_commit = committed_plan_details_for_station["station_name"]

            # Commit stationary slots to the chosen frequency's map
            stat_p_nums_allocated: list[str] = []
            for slot_idx in committed_plan_details_for_station["prospective_station_slots_indices"]:
                if frequency_slot_maps[chosen_freq]['station_alloc'][slot_idx] == 0: # Should be free
                    frequency_slot_maps[chosen_freq]['station_alloc'][slot_idx] = s_name_commit
                    stat_p_nums_allocated.append(f"P{slot_idx+2}")
                # else: Error, slot conflict during commit - should not happen if logic is correct

            # Commit onboard slots (P1, P2, P3) to the chosen frequency's map
            onboard_p_nums_overall: list[str] = []
            onboard_p1_allocated_p_nums: list[str] = []
            onboard_p2_allocated_p_nums: list[str] = []
            onboard_p3_allocated_p_nums: list[str] = []
            current_onboard_placed_count = 0

            # Commit P1
            for slot_idx in sorted(list(set(committed_plan_details_for_station["onboard_indices_p1"]))):
                if current_onboard_placed_count < committed_plan_details_for_station["requested_onboard_slots"]:
                    if frequency_slot_maps[chosen_freq]['onboard_alloc'][slot_idx] == 0:
                        frequency_slot_maps[chosen_freq]['onboard_alloc'][slot_idx] = s_name_commit
                        p_num = f"P{slot_idx+2}"
                        onboard_p1_allocated_p_nums.append(p_num)
                        onboard_p_nums_overall.append(p_num)
                        current_onboard_placed_count += 1
                else: break
            # Commit P2
            for slot_idx in sorted(list(set(committed_plan_details_for_station["onboard_indices_p2"]))):
                if current_onboard_placed_count < committed_plan_details_for_station["requested_onboard_slots"]:
                    if frequency_slot_maps[chosen_freq]['onboard_alloc'][slot_idx] == 0:
                        frequency_slot_maps[chosen_freq]['onboard_alloc'][slot_idx] = s_name_commit
                        p_num = f"P{slot_idx+2}"
                        onboard_p2_allocated_p_nums.append(p_num)
                        onboard_p_nums_overall.append(p_num)
                        current_onboard_placed_count += 1
                else: break
            # Commit P3
            for slot_idx in sorted(list(set(committed_plan_details_for_station["onboard_indices_p3"]))):
                if current_onboard_placed_count < committed_plan_details_for_station["requested_onboard_slots"]:
                    if frequency_slot_maps[chosen_freq]['onboard_alloc'][slot_idx] == 0:
                        frequency_slot_maps[chosen_freq]['onboard_alloc'][slot_idx] = s_name_commit
                        p_num = f"P{slot_idx+2}"
                        onboard_p3_allocated_p_nums.append(p_num)
                        onboard_p_nums_overall.append(p_num)
                        current_onboard_placed_count += 1
                else: break
            
            allocations_output.append({
                "Station": s_name_commit, 
                "Frequency": chosen_freq,
                "Stationary Kavach ID": committed_plan_details_for_station["KavachID"],
                "Station Code": committed_plan_details_for_station["StationCode"],
                "Latitude": committed_plan_details_for_station["Lattitude"],
                "Longitude": committed_plan_details_for_station["Longitude"],
                "Static": committed_plan_details_for_station["Static"],
                "Stationary Kavach Slots Requested": committed_plan_details_for_station["calculated_station_slots"],
                "Stationary Kavach Slots Allocated": ", ".join(sorted(stat_p_nums_allocated, key=lambda x: int(x[1:]))),
                "Num Stationary Allocated": len(stat_p_nums_allocated),
                "Onboard Kavach Slots Requested": committed_plan_details_for_station["requested_onboard_slots"],
                "Onboard Kavach Slots Allocated": ", ".join(sorted(onboard_p_nums_overall, key=lambda x: int(x[1:]))),
                "Num Onboard Allocated": len(onboard_p_nums_overall),
                "Onboard Slots P1 Allocated": ", ".join(sorted(onboard_p1_allocated_p_nums, key=lambda x: int(x[1:]))),
                "Onboard Slots P2 Allocated": ", ".join(sorted(onboard_p2_allocated_p_nums, key=lambda x: int(x[1:]))),
                "Onboard Slots P3 Allocated": ", ".join(sorted(onboard_p3_allocated_p_nums, key=lambda x: int(x[1:])))
                # Removed Debug fields related to congestion/P3 ratio
            })
        else:
            # Station could not be placed on any frequency
            allocations_output.append({
                "Station": station_name, "Frequency": "N/A",
                "Stationary Kavach ID": skavach_id,
                "Station Code": station_code,
                "Latitude": latitude,
                "Longitude": longitude,
                "Static": optimum_static_param,
                "Stationary Kavach Slots Requested": calculated_station_slots_needed,
                "Stationary Kavach Slots Allocated": "", "Num Stationary Allocated": 0,
                "Onboard Kavach Slots Requested": requested_onboard_slots,
                "Onboard Kavach Slots Allocated": "", "Num Onboard Allocated": 0,
                "Onboard Slots P1 Allocated": "", "Onboard Slots P2 Allocated": "", "Onboard Slots P3 Allocated": "",
                "Error": "No suitable slot configuration found on any frequency."
            })
            
    return allocations_output
def generate_excel(input_stations_data):
    alloc_results = allocate_slots(input_stations_data)
    print("Generating Excel file with new styling logic...")

    try:
        df = pd.DataFrame(alloc_results)
        expected_cols = [
            "Station", "Static", "Frequency",
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

def  apply_color_scheme(results_df: pd.DataFrame): # Using user's function name
    if results_df.empty:
        print("Error: Input DataFrame for coloring is empty.")
        return

    now = datetime.now() # For use in titles

    color_map = {
        1: "F0F005", 2: "8FCA1D", 3: "F39D1B", 4: "3197EA",
        5: "90918F", 6: "F53B3D", 7: "CC6CE7"
    }
    # Corrected font colors to ARGB format
    font_color_p1_default = "007220"  # ARGB for "007220"
    font_color_p2 = "E4080A"  # ARGB for "E4080A"
    font_style_p3 = Font(bold=True, color="000000") # Bold Black
    font_color_p1_conditional = "0000FF" # Blue for P1 when adjacent to P2

    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), 
                         top=Side(style='thin'), bottom=Side(style='thin'))
    
    left_align_v_center_wrap = Alignment(horizontal='left', vertical='center', wrap_text=True)
    center_align_v_center_wrap = Alignment(horizontal='center', vertical='center', wrap_text=True)
    center_align_v_center = Alignment(horizontal='center', vertical='center')
    center_align_v_center_no_wrap = Alignment(text_rotation=90,horizontal='center', vertical='center', wrap_text=False)
    left_align_v_center = Alignment(horizontal='left', vertical='center') # For blank data cells

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Slot Allocation Matrix"

    # --- Define Row Numbers for Content (from user's code) ---
    title_row1 = 2
    title_row2 = 3
    title_row3 = 4
    title_row4 = 5
    # Row 6 is blank
    label_stationary_kavach_id_row = 7
    header_excel_row = 8  # "Station Name" label in Col A, Rotated station names in Col B+
    label_station_code_row = 9
    label_lat_row = 10
    label_long_row = 11
    data_optimum_static_row = 12
    label_freq_pair_row = 13    # Row 13 for Frequency
    stationary_count_row = 14 
    label_tx_window_row = 15    # Row 15 for Tx Window (P{min}-P{max})
    onboard_count_row = 16    
    data_start_row = 17       # Px data (P2, P3...) starts in Col A

    all_slots = [f"P{i}" for i in range(2, 46)] 
    all_stations = results_df["Station"].unique()
    max_excel_col = len(all_stations) + 1 
    max_slot_idx_for_adj_check = len(all_slots) - 1 # Renamed from max_slot_index for clarity

    # --- Write Titles (Rows 2-5) ---
    titles_config = [
        (title_row1, "Kavach (TCAS) : Application-cum-Approval: mComm Frequency Channels & Timeslots"),
        (title_row2, "Stationary Kavach Unit-wise Frequency Channels - Timeslot Details"),
        (title_row3, f"Application Number: Kavach/mComm/Appl/NCR-to-CoE/003/{now.hour:02d}"),
        (title_row4, f"Station - Station (Excl): When in Category-C (Radio Packet Structure as well as Tag Data Foramt as per V4.0 with SRS 4.0d3 Annex-C Amdt-7 wef {now.strftime('%d-%m-%Y')})")
    ]
    for r_num, text in titles_config:
        cell = ws.cell(row=r_num, column=1)
        cell.value = text
        ws.merge_cells(start_row=r_num, start_column=1, end_row=r_num, end_column=max_excel_col)
        cell.alignment = center_align_v_center_wrap

     
    legend_col = 1
    legend_start_row = 61

    headers = ["Legend: Onboard Tx Slot Priorities", "Example"]
    legend_data = [
        ["Priority 1 Green", "007220"],
        ["Priority 2 Blue Bold", "0000FF"],
        ["Priority 3 Red", "E4080A"],
        ["Prority 4 Black Bold", "000000"]
    ]
    # Define border style
    border_style = Border(left=Side(style="thin"), right=Side(style="thin"), top=Side(style="thin"), bottom=Side(style="thin"))
    # Apply headers with border
    for i, header in enumerate(headers):
        cell = ws.cell(row=legend_start_row, column=legend_col + i, value=header)
        cell.font = Font(bold=True)
        cell.border = border_style
    for row_offset, (label, hex_color) in enumerate(legend_data, start=1):
        bold = label.endswith("Bold")  # Check if the label should be bold
        
        label_cell = ws.cell(row=legend_start_row + row_offset, column=legend_col, value=label)
        label_cell.font = Font(bold=bold, color=f"FF{hex_color}")  # Apply bold formatting conditionally
        label_cell.border = border_style
        
        example_cell = ws.cell(row=legend_start_row + row_offset, column=legend_col + 1, value="P2, P3, P4")
        example_cell.font = Font(bold=bold, color=f"FF{hex_color}") 
        example_cell.border = border_style


    # Adjust column width for better visibility
    ws.column_dimensions[ws.cell(row=legend_start_row, column=legend_col).column_letter].width = 36
    ws.column_dimensions[ws.cell(row=legend_start_row, column=legend_col + 1).column_letter].width = 10



    # --- Write Static Labels in Column A ---
    static_labels_col1 = {
        label_stationary_kavach_id_row: "Stationary Kavach ID",
        header_excel_row: "Station Name", 
        label_station_code_row: "Station code",
        label_lat_row: "Stationary Unit Tower Lattitude",
        label_long_row: "Stationary Unit Tower Longitude",
        data_optimum_static_row: "Optimum no. of Simultaneous Exclusive Static Profile Transfer",
        label_freq_pair_row: "Proposed Frequency Pair",
        stationary_count_row: "Number of Stationary Kavach Tx slots",
        label_tx_window_row: "Stationary Kavach (TCAS) Tx Window Commence - End",
        onboard_count_row: "Peak nos. of Onboard Kavach Units in Stn Unit Jurisdiction"
    }
    for r_num, text in static_labels_col1.items():
        cell = ws.cell(row=r_num, column=1)
        cell.value = text
        # Apply specific alignment for col A labels
        if r_num == header_excel_row: # "Station Name" label
            cell.alignment = center_align_v_center
        else:
            cell.alignment = center_align_v_center


    # --- Populate Data for Specific Rows (Columns B onwards) ---
    for c_idx_df, station_name in enumerate(all_stations):
        excel_data_col = c_idx_df + 2 
        station_specific_data_rows = results_df[results_df["Station"] == station_name]
        if station_specific_data_rows.empty: continue
        station_data_row = station_specific_data_rows.iloc[0]

        # Row 7: Stationary Kavach ID
        cell_id_r7 = ws.cell(row=label_stationary_kavach_id_row, column=excel_data_col)
        cell_id_r7.value = station_data_row.get("Stationary Kavach ID", "")
        cell_id_r7.alignment = center_align_v_center_no_wrap


        # Row 8 (Rotated Station Names)
        header_cell_rotated = ws.cell(row=header_excel_row, column=excel_data_col)
        header_cell_rotated.value = station_name
        header_cell_rotated.alignment = center_align_v_center_no_wrap
        
        # Row 9: Station Code
        cell_code_r9 = ws.cell(row=label_station_code_row, column=excel_data_col)
        cell_code_r9.value = station_data_row.get("Station Code", "")
        cell_code_r9.alignment = center_align_v_center_no_wrap

        # Row 10: Latitude
        cell_lat_r10 = ws.cell(row=label_lat_row, column=excel_data_col)
        cell_lat_r10.value = station_data_row.get("Latitude", "")
        cell_lat_r10.alignment = center_align_v_center_no_wrap

        # Row 11: Longitude
        cell_long_r11 = ws.cell(row=label_long_row, column=excel_data_col)
        cell_long_r11.value = station_data_row.get("Longitude", "")
        cell_long_r11.alignment = center_align_v_center_no_wrap
        # Row 12 (Optimum Static Values)
        # User's code uses "Static". Ensure this column exists in results_df.
        # If your allocate_slots provides "Optimum Static Param", change "Static" to that.
        opt_static_val = station_data_row.get("Static") # From user's code
        if opt_static_val is None: # Fallback if "Static" is not present
            opt_static_val = station_data_row.get("Optimum Static Param", "") # Check for my suggested name

        cell_opt_static = ws.cell(row=data_optimum_static_row, column=excel_data_col)
        cell_opt_static.value = opt_static_val
        cell_opt_static.alignment = center_align_v_center
        
        # Row 13 (Proposed Frequency Pair - Number and Color)
        frequency_val_r13 = station_data_row.get("Frequency")
        cell_freq_r13 = ws.cell(row=label_freq_pair_row, column=excel_data_col)
        if pd.notna(frequency_val_r13) and frequency_val_r13 != "N/A":
            try:
                frequency_r13 = int(frequency_val_r13)
                cell_freq_r13.value = frequency_r13
                bg_color_code_r13 = color_map.get(frequency_r13, "FFFFFF") # Default white
                cell_freq_r13.fill = PatternFill(start_color=bg_color_code_r13, end_color=bg_color_code_r13, fill_type="solid")
            except ValueError: 
                cell_freq_r13.value = str(frequency_val_r13) 
        else:
            cell_freq_r13.value = "N/A"
        cell_freq_r13.alignment = center_align_v_center

        # Row 14 (Stationary Count Data)
        cell_stat_count_r14 = ws.cell(row=stationary_count_row, column=excel_data_col)
        cell_stat_count_r14.value = station_data_row.get("Num Stationary Allocated", 0)
        cell_stat_count_r14.alignment = center_align_v_center
        
        # Row 15 (Stationary Kavach Tx Window - Slot Range)
        s_slots_str_r15 = str(station_data_row.get("Stationary Kavach Slots Allocated", ""))
        stat_slots_p_nums_r15 = [s.strip() for s in s_slots_str_r15.split(',') if s.strip() and s.strip().lower() != 'nan' and s.startswith('P')]
        tx_window_text_r15 = ""
        if stat_slots_p_nums_r15:
            slot_numbers_r15 = sorted([int(p[1:]) for p in stat_slots_p_nums_r15])
            if slot_numbers_r15: # Ensure list is not empty after parsing
                if len(slot_numbers_r15) == 1:
                    tx_window_text_r15 = f"P{slot_numbers_r15[0]}-P{slot_numbers_r15[0]+cell_stat_count_r14.value - 1}"
                else:
                    tx_window_text_r15 = f"P{slot_numbers_r15[0]}-P{slot_numbers_r15[-1]+cell_stat_count_r14.value - 1}"
        cell_tx_window_r15 = ws.cell(row=label_tx_window_row, column=excel_data_col)
        cell_tx_window_r15.value = tx_window_text_r15
        cell_tx_window_r15.alignment = center_align_v_center_no_wrap 

        # Row 16 (Onboard Count Data)
        cell_onboard_count_r16 = ws.cell(row=onboard_count_row, column=excel_data_col)
        cell_onboard_count_r16.value = station_data_row.get("Num Onboard Allocated", 0)
        cell_onboard_count_r16.alignment = center_align_v_center

    # --- Write Slot Names (P2, P3, ...) in Column 1 for the Matrix Data Area ---
    for r_idx_slot_name, slot_name in enumerate(all_slots):
        cell_slot_label = ws.cell(row=data_start_row + r_idx_slot_name, column=1)
        cell_slot_label.value = slot_name
        cell_slot_label.alignment = center_align_v_center

    # This is crucial for the adjacency check for the next slot
    # It should be the maximum 0-based index of your slots.
    # If all_slots = ["P2", "P3", ..., "P45"], len(all_slots) is 44. Max index is 43.
    if not all_slots: # Handle empty all_slots if it can occur
        # Depending on requirements, either return or raise error, or ensure all_slots is never empty
        print("Warning: all_slots is empty.")
        max_slot_idx_for_adj_check = -1 # Or handle appropriately
    else:
        max_slot_idx_for_adj_check = len(all_slots) - 1


    # --- Apply Styles, Colors, and Text to Matrix Data Cells (P-slot area) ---
    for r_idx_data_matrix, slot_in_current_row in enumerate(all_slots):
        current_excel_data_row = data_start_row + r_idx_data_matrix
        current_slot_0index = int(slot_in_current_row[1:]) - 2 # User's variable name

        for c_idx_df, station_name_for_coloring in enumerate(all_stations):
            excel_col_for_station = c_idx_df + 2
            cell_to_format = ws.cell(row=current_excel_data_row, column=excel_col_for_station)
            cell_to_format.value = "" 
            cell_to_format.font = Font() 
            cell_to_format.alignment = center_align_v_center

            station_data_rows_matrix = results_df[results_df["Station"] == station_name_for_coloring]
            if station_data_rows_matrix.empty: continue
            station_data_matrix_row = station_data_rows_matrix.iloc[0]

            s_slots_str_m = str(station_data_matrix_row.get("Stationary Kavach Slots Allocated", ""))
            o_p1_slots_str_m = str(station_data_matrix_row.get("Onboard Slots P1 Allocated", ""))
            o_p2_slots_str_m = str(station_data_matrix_row.get("Onboard Slots P2 Allocated", ""))
            o_p3_slots_str_m = str(station_data_matrix_row.get("Onboard Slots P3 Allocated", ""))

            set_stationary = {s.strip() for s in s_slots_str_m.split(',') if s.strip() and s.strip().lower() != 'nan'}
            set_onboard_p1 = {s.strip() for s in o_p1_slots_str_m.split(',') if s.strip() and s.strip().lower() != 'nan'}
            set_onboard_p2 = {s.strip() for s in o_p2_slots_str_m.split(',') if s.strip() and s.strip().lower() != 'nan'}
            set_onboard_p3 = {s.strip() for s in o_p3_slots_str_m.split(',') if s.strip() and s.strip().lower() != 'nan'}

            is_stationary = slot_in_current_row in set_stationary
            is_onboard_p1 = slot_in_current_row in set_onboard_p1
            is_onboard_p2 = slot_in_current_row in set_onboard_p2
            is_onboard_p3 = slot_in_current_row in set_onboard_p3
            
            if is_stationary:
                frequency_val_m = station_data_matrix_row.get("Frequency")
                if pd.notna(frequency_val_m) and frequency_val_m != "N/A":
                    try:
                        frequency_m = int(frequency_val_m)
                        bg_color_code_m = color_map.get(frequency_m, "FFFFFF")
                        cell_to_format.fill = PatternFill(start_color=bg_color_code_m, end_color=bg_color_code_m, fill_type="solid")
                    except ValueError: pass 
            
            if is_onboard_p3:
                cell_to_format.value = slot_in_current_row
                cell_to_format.font = font_style_p3 
            elif slot_in_current_row == "P45" and (is_onboard_p1 or is_onboard_p2):
                cell_to_format.value = slot_in_current_row
                cell_to_format.font = Font(color=font_color_p2)
            elif is_onboard_p1:
                cell_to_format.value = slot_in_current_row
                actual_p1_font_color = font_color_p1_default
                
                prev_slot_p_num = f"P{current_slot_0index + 1}" if current_slot_0index > 0 else None
                next_slot_p_num = f"P{current_slot_0index + 3}" if current_slot_0index < max_slot_idx_for_adj_check else None
                
                if (prev_slot_p_num and prev_slot_p_num in set_onboard_p2) or \
                   (next_slot_p_num and next_slot_p_num in set_onboard_p2):
                    actual_p1_font_color = font_color_p1_conditional 
                    cell_to_format.font = Font(bold=True, color=actual_p1_font_color) # Bold if adjacent to P2
                else:
                    cell_to_format.font = Font(color=actual_p1_font_color)
            elif is_onboard_p2:
                cell_to_format.value = slot_in_current_row
                cell_to_format.font = Font(color=font_color_p2) 
            elif is_stationary: 
                cell_to_format.value = "" 

    # --- Apply Borders to the Main Content Block ---
    # User's code: for r in range(7, max_excel_row):
    # max_excel_row in user's code was len(all_slots) + data_start_row -> 44 + 17 = 61
    # So loop is for r in range(7, 61) which means rows 7 to 60.
    # Row 60 is the last row of P-slot data.
    for r in range(label_stationary_kavach_id_row, (data_start_row + len(all_slots) -1) + 1):
        for c in range(1, max_excel_col + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = thin_border
            # Specific alignments have been set during content population.
            # No general alignment override here.

    # --- Add Allocation Details Sheet ---
    ws_details = wb.create_sheet(title="Allocation Details")
    if not results_df.empty:
        detail_headers = list(results_df.columns)
        ws_details.append(detail_headers)
        for _, row_data_obj_detail in results_df.iterrows():
            try:
                ws_details.append(list(row_data_obj_detail.astype(str))) 
            except Exception as e_row_detail:
                print(f"Warning: Could not append row to details sheet: {row_data_obj_detail.get('Station', 'Unknown_Station')}, Error: {e_row_detail}")
        
        for column_cells_detail in ws_details.columns:
            try:
                length = max(len(str(cell.value) if cell.value is not None else "") for cell in column_cells_detail)
                ws_details.column_dimensions[get_column_letter(column_cells_detail[0].column)].width = length + 2
            except Exception as e_col_size_detail:
                print(f"Warning: Could not resize column {get_column_letter(column_cells_detail[0].column)}, Error: {e_col_size_detail}")
    else:
        ws_details.append(["No allocation details to display."])

    try:
        wb.save(OUTPUT_FILE)
        print(f"Formatted and styled Excel file saved to: {OUTPUT_FILE}")
    except PermissionError:
        print(f"Critical Error: Permission denied. Failed to save Excel to {OUTPUT_FILE}.")
        print("Ensure the file is not open and you have write permissions.")
    except Exception as e_save:
        print(f"Critical Error: Failed to save Excel to {OUTPUT_FILE}. Error: {e_save}")

if __name__ == '__main__':
    stations = [
        {'name': 'LC.563', 'Static': 4, 'onboardSlots': 10, "StationCode": "LC563", "KavachID": "SK563", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Rundhi', 'Static': 4, 'onboardSlots': 14, "StationCode": "RUND", "KavachID": "SKRUND", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'LC.560', 'Static': 4, 'onboardSlots': 9, "StationCode": "LC560", "KavachID": "SK560", "Lattitude": 28.7041, "Longitude": 77.1025},  
        {'name': 'Sholanka', 'Static': 4, 'onboardSlots': 16, "StationCode": "SHOL", "KavachID": "SKSHOL", "Lattitude": 28.7041, "Longitude": 77.1025},
        {'name': 'LC.555', 'Static': 4, 'onboardSlots': 9, "StationCode": "LC555", "KavachID": "SK555", "Lattitude": 28.7041, "Longitude": 77.1025},  
        {'name': 'Hodal', 'Static': 4, 'onboardSlots': 14, "StationCode": "HODAL", "KavachID": "SKHODAL", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Station G', 'Static': 6, 'onboardSlots': 20, "StationCode": "STG", "KavachID": "SKSTG", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Station H', 'Static': 7, 'onboardSlots': 22, "StationCode": "STH", "KavachID": "SKSTH", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Station I', 'Static': 5, 'onboardSlots': 18, "StationCode": "STI", "KavachID": "SKSTI", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Station J', 'Static': 8, 'onboardSlots': 5, "StationCode": "STJ", "KavachID": "SKSTJ", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Station K', 'Static': 2, 'onboardSlots': 25, "StationCode": "STK", "KavachID": "SKSTK", "Lattitude": 28.7041, "Longitude": 77.1025}, 
        {'name': 'Station L', 'Static': 10, 'onboardSlots': 10, "StationCode": "STL", "KavachID": "SKSTL", "Lattitude": 28.7041, "Longitude": 77.1025},
        {'name': 'Mathura Jn', 'Static': 6, 'onboardSlots': 21, "StationCode": "MTHRJ", "KavachID": "SKMTHRJ", "Lattitude": 27.5025, "Longitude": 77.6737},
    ]
    
    result_path = generate_excel(stations)

    if result_path:
        print(f"Process completed. Output file: {result_path}")
    else:
        print("Process failed.")