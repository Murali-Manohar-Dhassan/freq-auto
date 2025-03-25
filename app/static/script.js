
console.log("script.js loaded");

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
        card.className = "col-md-4 mb-3";
        card.innerHTML = `
            <div class="card shadow p-3">
                <h5 class="text-center text-secondary">Station ${i}</h5>
                <label class="form-label">Station Name:</label>
                <input type="text" class="form-control mb-2" id="stationName${i}" required>
                <label class="form-label">Stationary Slots:</label>
                <input type="number" class="form-control mb-2" id="stationarySlots${i}" min="0" required>
                <label class="form-label">Onboard Slots:</label>
                <input type="number" class="form-control" id="onboardSlots${i}" min="0" required>
            </div>
        `;
        container.appendChild(card);
    }
}

// Function to collect user input and submit data to the server
function submitData() {
    const numStations = document.getElementById("numStations").value;
    const stationData = [];
    
    document.getElementById("loadingSpinner").style.display = "block"; // Show loading animation

    console.log("📊 Collecting station data...");
    // Collect station data from user input
    for (let i = 1; i <= numStations; i++) {
        const name = document.getElementById(`stationName${i}`).value.trim();
        const stationSlots = parseInt(document.getElementById(`stationarySlots${i}`).value) || 0;
        const onboardSlots = parseInt(document.getElementById(`onboardSlots${i}`).value) || 0;

        if (!name) {
            alert(`Station ${i} name cannot be empty.`);
            document.getElementById("loadingSpinner").style.display = "none";
            return;
        }

        stationData.push({ name, stationSlots, onboardSlots });
    }

    // Send collected data to the server
    fetch("/allocate_slots_endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stationData)
    })
    .then(response => response.json())
    .then(data => {
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
    const fileInput = document.getElementById("excelFile");
    if (!fileInput.files.length) {
        alert("Please select an Excel file.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

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

        console.log("✅ Data successfully received:", result.data);
        populateFieldsFromExcel(result.data);
    })
    .catch(err => {
        console.error("❌ Upload Error:", err); // Log error details
        alert("Failed to upload file. Check console for details.");
    });
}


function populateFieldsFromExcel(stationData) {
    const container = document.getElementById("stationContainer");
    container.innerHTML = ""; // Clear previous entries

    stationData.forEach((station, index) => {
        const card = document.createElement("div");
        card.className = "col-md-4 mb-3";
        card.innerHTML = `
            <div class="card shadow p-3">
                <h5 class="text-center text-secondary">Station ${index + 1}</h5>
                <label class="form-label">Station Name:</label>
                <input type="text" class="form-control mb-2" value="${station.Station}" id="stationName${index + 1}" required>
                <label class="form-label">Stationary Slots:</label>
                <input type="number" class="form-control mb-2" value="${station['Stationary Slots']}" id="stationarySlots${index + 1}" required>
                <label class="form-label">Onboard Slots:</label>
                <input type="number" class="form-control" value="${station['Onboard Slots']}" id="onboardSlots${index + 1}" required>
            </div>
        `;
        container.appendChild(card);
    });

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
