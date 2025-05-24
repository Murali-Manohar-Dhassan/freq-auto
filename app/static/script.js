
console.log("script.js loaded");


function showManual() {
    $('#manualSection').show();
    $('#uploadSection').hide();
    $('#submitContainer').hide();
    $('#stationContainer').empty();
    $('#generateBtn').show();
}

function showUpload() {
    $('#uploadSection').show();
    $('#manualSection').hide();
    $('#submitContainer').hide();
    $('#uploadBtn').show();
}

// Function to dynamically generate station input fields
function generateStationFields() {
    const numStations = document.getElementById("numStations").value;
    const container = document.getElementById("stationContainer");
    container.innerHTML = ""; // Clear previous entries

    if (!numStations || numStations < 1) {
        alert("Please enter a valid number of stations.");
        return;
    }

    for (let i = 1; i <= numStations; i++) {
        const card = document.createElement("div");
        card.className = "col-12 col-sm-6 col-md-4 mb-3";
        card.innerHTML = `
            <div class="card shadow p-3">
                <h5 class="text-center text-secondary">Station ${i}</h5>
                <label class="form-label">Station Name:</label>
                <input type="text" class="form-control mb-2" id="stationName${i}" required>
                <label class="form-label">Optimum no. of Static Profile:</label>
                <input type="number" class="form-control mb-2" id="OptimumStatic${i}" min="0" required>
                <label class="form-label">Onboard Slots:</label>
                <input type="number" class="form-control" id="onboardSlots${i}" min="0" required>
                
                <label class="form-label">Stationary Kavach ID (Optional):</label>
                <input type="number" class="form-control mb-2" id="KavachID${i}" min="0">

                <label class="form-label">Station Code (Optional):</label>
                <input type="number" class="form-control mb-2" id="StationCode${i}" min="0">

                <label class="form-label">Stationary Unit Tower Lattitude (Optional):</label>
                <input type="number" class="form-control mb-2" id="Lattitude${i}" min="0">

                <label class="form-label">Stationary Unit Tower Longitude (Optional):</label>
                <input type="number" class="form-control mb-2" id="Longtitude${i}" min="0">
            </div>
        `;
        container.appendChild(card);
    }

    // Hide generate & upload buttons
    $('#generateBtn').hide();
    // Show submit button
    $('#submitContainer').show();
}

// Function to collect user input and submit data to the server
function submitData() {
    const numStations = document.getElementById("numStations").value;
    const stationData = [];
    
    document.getElementById("loadingSpinner").style.display = "block"; // Show loading animation

    console.log("📊 Collecting station data...");
    console.log("📌 Number of Stations:", numStations);

    // Collect station data from user input
    for (let i = 1; i <= numStations; i++) {
        const name = document.getElementById(`stationName${i}`).value.trim();
        const Static = parseInt(document.getElementById(`OptimumStatic${i}`).value) || 0;
        const onboardSlots = parseInt(document.getElementById(`onboardSlots${i}`).value) || 0;

        // Collect new fields
        const KavachID = parseInt(document.getElementById(`KavachID${i}`).value) || 0; 
        const StationCode = parseInt(document.getElementById(`StationCode${i}`).value) || 0; 
        const Lattitude = parseInt(document.getElementById(`Lattitude${i}`).value) || 0; 
        const Longitude = parseInt(document.getElementById(`Longtitude${i}`).value) || 0; 

        if (!name) {
            alert(`Station ${i} name cannot be empty.`);
            document.getElementById("loadingSpinner").style.display = "none";
            return;
        }

        stationData.push({
            name,
            Static,
            onboardSlots,
            KavachID, 
            StationCode, 
            Lattitude, 
            Longitude  
         });
    }

    console.log("🚀 Sending station data to server:", stationData);

    // Send collected data to the server
    fetch("/allocate_slots_endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stationData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("📩 Server Response:", data);

        if (data.fileUrl) {
            console.log("✅ Processing complete. Checking for file...");
            checkFileReady(data.fileUrl); // Start polling to check if file is ready
        } else {
            alert("Error generating file.");
            document.getElementById("loadingSpinner").style.display = "none";
        }
    })
    .catch(err => {
        console.error("❌ Submission Error:", err);
        alert("Error: " + err);
        document.getElementById("loadingSpinner").style.display = "none";
    });
}

// Function to handle Excel file upload and preview the data in the UI
function uploadExcel() {
    // Show spinner
    $('#loadingSpinner').show();

    const fileInput = document.getElementById("excelFile");
    const file = fileInput.files[0]; 
    if (!file) {
        alert("Please select an Excel file.");
        $('#loadingSpinner').hide();
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload_excel", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        console.log("📩 Server Response:", result); // Log full response in console

        if (result.error) {
            alert("Error: " + result.error);
            return;
        }

        if (!result.data || !Array.isArray(result.data)) {
            alert("Invalid data format received.");
            console.error("❌ Unexpected response format:", result);
            return;
        }

        // ✅ Update station count
        document.getElementById("numStations").value = result.station_count;
        
        console.log("✅ Data successfully received:", result.data);
        populateFieldsFromExcel(result.data);
        document.getElementById("manualSection").style.display = "block";
        $('#uploadBtn').hide();
        document.getElementById("stationContainer").style.display = "";
        $('#submitContainer').show();
        $('#loadingSpinner').hide();
    })
    .catch(err => {
        console.error("❌ Upload Error:", err); // Log error details
        alert("Failed to upload file. Check console for details.");
        $('#loadingSpinner').hide();
    });
}



function populateFieldsFromExcel(stationData) {
    const container = document.getElementById("stationContainer");
    container.className = "row mt-4";
    container.innerHTML = ""; // Clear previous entries
    
    stationData.forEach((station, index) => {
        const card = document.createElement("div");
        card.className = "col-12 col-sm-6 col-md-4 mb-3";
        card.innerHTML = `
            <div class="card shadow p-3">
                <h5 class="text-center text-secondary">Station ${index + 1}</h5>
                <label class="form-label">Station Name:</label>
                <input type="text" class="form-control mb-2" 
                       value="${station["Station Name"]}" 
                       id="stationName${index + 1}" required>

                <label class="form-label">Optimum no. of Static Profile:</label>
                <input type="number" class="form-control mb-2" 
                       value="${station["Static"]}" 
                       id="OptimumStatic${index + 1}" required>

                <label class="form-label">Onboard Slots:</label>
                <input type="number" class="form-control" 
                       value="${station["Onboard Slots"]}" 
                       id="onboardSlots${index + 1}" required>

                <label class="form-label">Stactionary Kavach ID (Optional):</label>
                <input type="number" class="form-control mb-2" 
                       value="${station["Stationary Kavach ID"] || 0}" 
                       id="KavachID${index + 1}">

                <label class="form-label">Station Code (Optional):</label>
                <input type="number" class="form-control mb-2" 
                       value="${station["Station Code"] || 0}" 
                       id="StationCode${index + 1}" min="0">

                <label class="form-label">Stationary Unit Tower Lattitude (Optional):</label>
                <input type="number" class="form-control mb-2" 
                       value="${station["Lattitude"] || 0}" 
                       id="Lattitude${index + 1}">

                <label class="form-label">Stationary Unit Tower Longtitude (Optional):</label>
                <input type="number" class="form-control mb-2" 
                       value="${station["Longtitude"] || 0}" 
                       id="Longtitude${index + 1}" min="0">
            </div>
        `;
        container.appendChild(card);
        
    });
    
    // Show the container and submit section
    document.getElementById("submitContainer").style.display = "block";
    alert("Excel data loaded successfully!");
}

// Function to check if the file is ready before downloading
function checkFileReady(fileUrl) {
    let attempts = 0;
    let maxAttempts = 10; // Maximum number of checks before timing out
    let checkInterval = 3000; // Check every 3 seconds

    function poll() {
        fetch(fileUrl, { method: "HEAD" })
        .then(response => {
            if (response.status === 200) {
                window.location.href = fileUrl;
                document.getElementById("loadingSpinner").style.display = "none"; 
            } else if (response.status === 202) {
                document.getElementById("loadingMessage").innerText = `Processing... Attempt ${attempts + 1} of ${maxAttempts}`;
                
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, checkInterval);
                } else {
                    alert("File processing took too long. Try again later.");
                    document.getElementById("loadingSpinner").style.display = "none"; 
                }
            } else {
                alert("Error fetching file.");
                document.getElementById("loadingSpinner").style.display = "none"; 
            }
        })
        .catch(err => {
            alert("Error: " + err);
            document.getElementById("loadingSpinner").style.display = "none"; 
        });
    }

    poll();
}


document.addEventListener('DOMContentLoaded', function () {
    const excelFileInput = document.getElementById("excelFile");
    const generateBtn = document.getElementById("generateBtn");

    excelFileInput.addEventListener("change", function () {
        if (excelFileInput.files.length > 0) {
            generateBtn.style.display = "none"; // Hide if file selected
        } else {
            generateBtn.style.display = "inline-block"; // Show if file cleared
        }
    });
});
