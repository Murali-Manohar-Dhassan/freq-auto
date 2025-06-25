// map_logic.js
// This file handles all Leaflet map initialization, rendering, and interaction logic.

// Import currentPlanningStations from ui_logic.js (needs to be exported there)
import { currentPlanningStations, validateAllStationCards } from './ui_logic.js';

// --- Global State for Map ---
let mymap; // Will hold the Leaflet map instance
let coverageCircles = {}; // Stores references to Leaflet circle objects for highlight/unhighlight
let activeCoverageCircle = null; // To track the currently highlighted circle
let coverageGroupLayer; // A Leaflet FeatureGroup for all coverage circles (managed by JS)
let overlapHighlightGroupLayer; // A Leaflet FeatureGroup for explicit overlap highlights (managed by JS)

// Define Leaflet highlight style
const HIGHLIGHT_STYLE = { color: 'black', fillColor: 'yellow', fillOpacity: 0.5, weight: 4 };

// Define frequency colors (should be consistent with backend and UI legend)
const FREQ_COLORS = {
    1: { outline: '#00FF00', fill: '#90EE90' },  // Green, LightGreen
    2: { outline: '#0000FF', fill: '#ADD8E6' },  // Blue, LightBlue
    3: { outline: '#FFFF00', fill: '#FFFACD' },  // Yellow, LemonChiffon
    4: { outline: '#FFA500', fill: '#FFDAB9' },  // Orange, PeachPuff
    5: { outline: '#800080', fill: '#DDA0DD' },  // Purple, Plum
    6: { outline: '#FFC0CB', 'fill': '#FFB6C1' },  // Pink, LightPink
    7: { outline: '#A52A2A', 'fill': '#F5DEB3' }   // Brown, Wheat
};
const DEFAULT_MAP_COLOR = { outline: 'grey', fill: 'lightgrey' };


// --- Utility Functions for Loading Spinner (moved here as they are map/allocation related) ---
export function showLoadingSpinner(message = "Processing... Please wait.") {
    const spinner = document.getElementById('loadingSpinnerOverlay');
    const msgElement = document.getElementById('loadingMessage');
    if (msgElement) msgElement.textContent = message;
    if (spinner) spinner.style.display = 'flex';
}

export function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinnerOverlay');
    if (spinner) spinner.style.display = 'none';
}


// The new and improved function to update the map with ALL planning stations
export async function refreshMap() { // Exported for use by ui_logic.js functions
    showLoadingSpinner("Updating map visualization...");

    const mapidDiv = document.getElementById('mapid');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    const conflictWarning = document.getElementById('conflictWarning');

    // Filter out stations that don't have valid coordinates
    const planningStationsPayload = currentPlanningStations
        .map(s => ({
            id: s.id,
            lat: parseFloat(s.latitude),
            lon: parseFloat(s.longitude),
            rad: parseFloat(s.safe_radius_km) || 12.0,
            name: s.stationName || `Station ${s.station_number}`,
            frequency: parseInt(s.allocated_frequency) || 1,
            onboardSlots: parseInt(s.onboard_slots) || 0,
            type: s.type
        }))
        .filter(s => !isNaN(s.lat) && !isNaN(s.lon));

    if (planningStationsPayload.length === 0) {
        // Destroy existing map instance if it exists before showing placeholder
        if (mymap) {
            mymap.remove();
            mymap = null;
        }
        mapidDiv.innerHTML = '';
        mapidDiv.style.display = 'none';
        mapPlaceholder.style.display = 'flex';
        conflictWarning.style.display = 'none';
        hideLoadingSpinner();
        console.log("No valid planning stations to display on the map.");
        return;
    }

    try {
        const response = await fetch('/api/update_map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planning_stations: planningStationsPayload })
        });

        if (!response.ok) {
            const errorData = await response.json(); // Assuming error response is JSON
            throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const mapData = await response.json(); // Expecting JSON response now

        // Check if map already exists. If so, destroy it to prevent Leaflet errors on re-init.
        if (mymap) {
            mymap.remove();
            mymap = null;
        }

        // Initialize the Leaflet map directly in JS, instead of relying on Folium's JS.
        // This gives us more control and avoids script execution issues from innerHTML.
        mapidDiv.innerHTML = ''; // Clear map container first
        mapidDiv.style.display = 'block'; // Ensure map container is visible
        mapPlaceholder.style.display = 'none'; // Hide placeholder

        // Set up the map with a base layer
        mymap = L.map('mapid').setView(mapData.center_location, mapData.zoom_level);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mymap);

        // Initialize FeatureGroups directly in JS
        const approvedGroup = L.featureGroup().addTo(mymap);
        const planningGroup = L.featureGroup().addTo(mymap);
        const conflictGroup = L.featureGroup().addTo(mymap);
        const overlapHighlightGroup = L.featureGroup().addTo(mymap);
        coverageGroupLayer = L.featureGroup().addTo(mymap); // Already global
        overlapHighlightGroupLayer = L.featureGroup().addTo(mymap); // Already global


        // Draw all markers, circles, and polylines using the data from Flask
        drawAllMapElements(mapData.allStationData, approvedGroup, planningGroup);
        drawInterTypeConflicts(mapData.interTypeConflicts, conflictGroup); // Add specific inter-type conflicts
        drawOverlapHighlights(mapData.overlappingPairData, overlapHighlightGroup); // Add intra-frequency overlaps
        drawCircles(mapData.allStationData); // Draws all coverage circles into coverageGroupLayer


        // Add Layer Control
        L.control.layers({
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        }, {
            'Approved Stations': approvedGroup,
            'Planning Stations': planningGroup,
            'Inter-Type Conflicts': conflictGroup,
            'Intra-Frequency Overlaps': overlapHighlightGroup,
            'Coverage Areas': coverageGroupLayer
        }, { collapsed: true }).addTo(mymap);

        // Conflict warning (based on the hasConflict flag from backend)
        if (mapData.hasConflict) {
            conflictWarning.style.display = 'block';
            // You might want to update the text of the warning too
        } else {
            conflictWarning.style.display = 'none';
        }

    } catch (error) {
        console.error('Error refreshing map:', error);
        alert('An error occurred while updating the map. Check console for details: ' + error.message);
        // Ensure map is cleared and placeholder shown on error
        if (mymap) {
            mymap.remove();
            mymap = null;
        }
        mapidDiv.innerHTML = '';
        mapidDiv.style.display = 'none';
        mapPlaceholder.style.display = 'flex';
        conflictWarning.style.display = 'none';
    } finally {
        hideLoadingSpinner();
    }
}

// Function to draw all map elements (markers, circles) based on data from Flask
function drawAllMapElements(stationDataArray, approvedGroup, planningGroup) {
    stationDataArray.forEach(s => {
        const latlng = [s.lat, s.lon];
        let iconHtml;
        let group;

        if (s.type === 'approved') {
            iconHtml = '<i class="fa fa-tower" style="color: forestgreen; font-size: 24px;"></i>';
            group = approvedGroup;
        } else { // type === 'planning'
            iconHtml = '<i class="fa fa-satellite-dish" style="color: red; font-size: 24px;"></i>';
            group = planningGroup;
        }

        const customIcon = L.divIcon({
            html: iconHtml,
            className: '', // No default Leaflet class
            iconSize: [24, 24],
            iconAnchor: [12, 24], // Center bottom
            popupAnchor: [0, -20]
        });

        const marker = L.marker(latlng, { icon: customIcon }).addTo(group);
        marker.bindPopup(s.popup_content);

        // Attach click listener for highlighting coverage circles
        marker.on('click', function() {
            highlightCircle(s.id);
        });
    });
}

// Function to draw specific inter-type conflict lines (e.g., planning vs approved)
function drawInterTypeConflicts(conflictDataArray, conflictGroup) {
    conflictDataArray.forEach(c => {
        const lineCoords = [
            [c.planning_lat, c.planning_lon],
            [c.approved_lat, c.approved_lon]
        ];
        L.polyline(lineCoords, {
            color: 'red',
            weight: 3,
            opacity: 0.8,
            dashArray: '10,5',
            popup: c.popup_content || `CONFLICT (Freq ${c.planning_freq}): ${c.distance.toFixed(2)}km < ${c.min_distance.toFixed(2)}km required`
        }).addTo(conflictGroup);
    });
}


// Function to draw all coverage circles
export function drawCircles(stationDataArray) {
    if (!coverageGroupLayer) {
        console.error("coverageGroupLayer not initialized. Cannot draw circles.");
        return;
    }
    coverageGroupLayer.clearLayers();
    coverageCircles = {};

    for (const s of stationDataArray) {
        const radiusInMeters = parseFloat(s.radius) * 1000;
        const freqColors = FREQ_COLORS[s.frequency] || DEFAULT_MAP_COLOR;

        const circle = L.circle([s.lat, s.lon], {
            color: freqColors.outline,
            fillColor: freqColors.fill,
            fillOpacity: s.fillOpacity,
            weight: s.weight,
            radius: radiusInMeters,
            id: s.id // Custom property to link to data
        });

        circle.bindPopup(s.popup_content);
        circle.defaultStyle = {
            color: freqColors.outline,
            fillColor: freqColors.fill,
            fillOpacity: s.fillOpacity,
            weight: s.weight
        };

        circle.addTo(coverageGroupLayer);
        coverageCircles[s.id] = circle;
    }
}

// Function to highlight a specific circle by ID
export function highlightCircle(stationId) {
    if (activeCoverageCircle && activeCoverageCircle.defaultStyle) {
        activeCoverageCircle.setStyle(activeCoverageCircle.defaultStyle);
    }

    const circleToHighlight = coverageCircles[stationId];
    if (circleToHighlight) {
        circleToHighlight.setStyle(HIGHLIGHT_STYLE);
        activeCoverageCircle = circleToHighlight;
        mymap.panTo(circleToHighlight.getLatLng());
    }
}

// Function to draw overlap highlights (PolyLines)
export function drawOverlapHighlights(overlapDataArray, overlapHighlightGroup) { // Pass group as argument
    if (!overlapHighlightGroup) {
        console.error("overlapHighlightGroup not initialized. Cannot draw overlap highlights.");
        return;
    }
    overlapHighlightGroup.clearLayers();

    for (const overlap of overlapDataArray) {
        L.polyline(overlap.line_coords, {
            color: 'darkred',
            weight: 5,
            opacity: 0.9,
            dashArray: '5, 10'
        })
        .bindPopup(overlap.popup_content || `FREQ ${overlap.frequency} OVERLAP: ${overlap.s1_name} & ${overlap.s2_name} - Dist: ${overlap.distance.toFixed(2)}km (Req: ${overlap.min_required.toFixed(2)}km)`)
        .addTo(overlapHighlightGroup);
    }
}

// Function to run the allocation process
export async function runAllocation() { // Exported for HTML button click
    showLoadingSpinner("Running allocation and conflict resolution...");
    try {
        if (currentPlanningStations.length === 0) {
            alert("Please add at least one planning station before running allocation.");
            hideLoadingSpinner();
            return;
        }

        // Validate all planning stations before sending to backend
        // (Assuming validateAllStationCards is accessible, imported from ui_logic)
        if (!validateAllStationCards()) {
            alert("Please correct errors in station data before running allocation.");
            hideLoadingSpinner();
            return;
        }


        const response = await fetch('/api/run_allocation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planning_stations: currentPlanningStations })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const allocationResults = await response.json();

        const resultsList = document.getElementById('results-list');
        const allocationResultsContainer = document.getElementById('allocationResults');
        resultsList.innerHTML = '';

        if (allocationResults && allocationResults.length > 0) {
            allocationResultsContainer.style.display = 'block';
            allocationResults.forEach(result => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                let statusClass = '';
                let icon = '';

                if (result.Status === 'Allocated') {
                    statusClass = 'list-group-item-success';
                    icon = '<i class="fas fa-check-circle me-2"></i>';
                } else if (result.Status === 'Conflict' || result.Status === 'Not Allocated') {
                    statusClass = 'list-group-item-danger';
                    icon = '<i class="fas fa-times-circle me-2"></i>';
                } else if (result.Status === 'Warning') {
                    statusClass = 'list-group-item-warning';
                    icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
                } else {
                    statusClass = 'list-group-item-info';
                    icon = '<i class="fas fa-info-circle me-2"></i>';
                }

                li.classList.add(statusClass);
                li.innerHTML = `
                    ${icon}<strong>Station:</strong> ${result.Station}<br>
                    <strong>Status:</strong> ${result.Status}<br>
                    ${result.Frequency !== 'N/A' && result.Frequency !== null ? `<strong>Frequency:</strong> ${result.Frequency}<br>` : ''}
                    ${result.StationarySlots !== undefined && result.StationarySlots !== null ? `<strong>Stationary Slots:</strong> ${result.StationarySlots}<br>` : ''}
                    ${result.OnboardSlotsOverall !== undefined && result.OnboardSlotsOverall !== null ? `<strong>Onboard Slots:</strong> ${result.OnboardSlotsOverall}<br>` : ''}
                    ${result.Error ? `<span class="text-danger"><strong>Error:</strong> ${result.Error}</span>` : ''}
                `;
                resultsList.appendChild(li);
            });
        } else {
            allocationResultsContainer.style.display = 'block';
            resultsList.innerHTML = '<li class="list-group-item text-muted">No allocation results available.</li>';
        }

        refreshMap(); // Re-render map after allocation attempt

    } catch (error) {
        console.error('Error running allocation:', error);
        alert('An error occurred during allocation. Check console for details: ' + error.message);
        document.getElementById('allocationResults').style.display = 'block';
        document.getElementById('results-list').innerHTML = `<li class="list-group-item list-group-item-danger">Error: Failed to get allocation results. ${error.message}</li>`;
    } finally {
        hideLoadingSpinner();
    }
}

// Function to submit all valid planning station data for configuration generation
export async function submitData() { // Exported for HTML button click
    console.log("[submitData] Starting submission process.");
    if (!validateAllStationCards()) {
        console.log("[submitData] Validation failed. Aborting submission.");
        return;
    }

    const payloadStations = currentPlanningStations.map(s => ({
        KavachID: s.KavachID,
        StationCode: s.StationCode,
        name: s.stationName,
        Latitude: parseFloat(s.latitude) || 0.0,
        Longitude: parseFloat(s.longitude) || 0.0,
        onboardSlots: parseInt(s.onboard_slots, 10) || 0,
        Static: parseInt(s.optimum_static_profile_transfer, 10) || 0,
        safe_radius_km: parseFloat(s.safe_radius_km) || 12.0,
        allocated_frequency: parseInt(s.allocated_frequency, 10) || 4
    }));

    if (payloadStations.length === 0) {
        alert("No stations to submit.");
        console.warn("[submitData] No stations in payload. Aborting.");
        return;
    }

    console.log("[submitData] Submitting Data (payloadStations):", payloadStations);
    showLoadingSpinner('Submitting data to server...');

    try {
        const response = await fetch("/allocate_slots_endpoint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadStations)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        if (data.fileUrl) {
            showLoadingSpinner('Preparing your download...');
            checkFileReady(data.fileUrl);
        } else {
            alert(data.message || data.error || "Unknown response from server after submission.");
            hideLoadingSpinner();
        }
    } catch (err) {
        alert("Submission Error: " + err.message);
        hideLoadingSpinner();
    }
}

// Helper to check file readiness for download
async function checkFileReady(fileUrl) {
    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = 3000;

    showLoadingSpinner(`Preparing file for download. Please wait...`);

    function poll() {
        fetch(fileUrl, { method: "HEAD" })
            .then(response => {
                if (response.ok && response.status === 200) {
                    showLoadingSpinner('File ready! Starting download...');
                    setTimeout(() => {
                        window.location.href = fileUrl;
                        hideLoadingSpinner();
                        // Call clearPlanningStations and showManual from ui_logic
                        // As they are exported, we can import and call them here.
                        import('./ui_logic.js').then(uiLogic => {
                            uiLogic.clearPlanningStations();
                            uiLogic.showManual();
                        });
                    }, 1000);
                } else if (response.status === 404 || attempts >= maxAttempts) {
                    let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                    alert(message + " Please check the server or try again later.");
                    hideLoadingSpinner();
                } else {
                    attempts++;
                    showLoadingSpinner(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`);
                    setTimeout(poll, checkInterval);
                }
            })
            .catch(err => {
                alert("Error checking file readiness: " + err.message);
                hideLoadingSpinner();
            });
    }
    poll();
}

