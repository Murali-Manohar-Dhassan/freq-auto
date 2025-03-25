from flask import Flask, render_template, request, jsonify, send_file
import xlsxwriter
import os

app = Flask(__name__)

# Slot allocation logic
def allocate_slots(stations, max_slots=45, max_frequencies=7):
    allocations = []
    current_frequency = 1
    station_alloc = [0] * max_slots
    onboard_alloc = [0] * max_slots

    def next_frequency():
        nonlocal current_frequency
        current_frequency += 1 
        if current_frequency > max_frequencies:
            current_frequency = 1
        station_alloc[:] = [0] * max_slots
        onboard_alloc[:] = [0] * max_slots

    for station in stations:
        station_name = station["name"]
        station_slots = station["stationSlots"]
        onboard_slots = station["onboardSlots"]
        station_slot_range = []
        onboard_slot_allocations = []

        available_station_slots = station_alloc.count(0)
        available_onboard_slots = onboard_alloc.count(0)

        if station_slots > available_station_slots or onboard_slots > available_onboard_slots:
            next_frequency()

        allocated_station_slots = 0
        for i in range(max_slots):
            if station_alloc[i] == 0 and allocated_station_slots < station_slots:
                station_alloc[i] = station_name
                station_slot_range.append(f"P{i+1}")
                allocated_station_slots += 1

        allocated_onboard_slots = 0
        i = 0
        while allocated_onboard_slots < onboard_slots and i < max_slots:
            if station_alloc[i] == station_name:
                i += 1
                continue
            if onboard_alloc[i] == 0:
                onboard_alloc[i] = station_name
                onboard_slot_allocations.append(f"P{i+1}")
                allocated_onboard_slots += 1
            i += 1

        allocations.append({
            "Station": station_name,
            "Frequency": current_frequency,
            "Stationary Kavach Slots": ", ".join(station_slot_range),
            "Onboard Kavach Slots": ", ".join(onboard_slot_allocations)
        })

    return allocations

@app.route("/allocate_slots_endpoint", methods=["POST"])
def allocate_slots_endpoint():
    try:
        stations = request.json
        allocations = allocate_slots(stations)

        file_path = "slot_allocation.xlsx"
        workbook = xlsxwriter.Workbook(file_path)
        worksheet = workbook.add_worksheet()

        headers = ["Station", "Frequency", "Stationary Kavach Slots", "Onboard Kavach Slots"]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)

        for row, alloc in enumerate(allocations, start=1):
            worksheet.write(row, 0, alloc["Station"])
            worksheet.write(row, 1, alloc["Frequency"])
            worksheet.write(row, 2, alloc["Stationary Kavach Slots"])
            worksheet.write(row, 3, alloc["Onboard Kavach Slots"])

        workbook.close()

        # ✅ Log that the file was created
        print(f"✅ Successfully created slot allocation file: {file_path}")
        print(f"📂 File exists? {os.path.exists(file_path)}")
        
        return jsonify({"fileUrl": f"/download/{file_path}"})
    except Exception as e:
        print(f"❌ Error creating slot allocation file: {str(e)}")
        return jsonify({"error": str(e)}), 500
