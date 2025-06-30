// map_logic.js
// This file handles all Leaflet map initialization, rendering, and interaction logic.

// Import currentPlanningStations and validateAllStationCards from ui_logic.js
import { currentPlanningStations, validateAllStationCards } from './ui_logic.js';
// Import India boundary GeoJSON data
import { indiaBoundayLines } from './india_boundaries.js';

// --- Global State for Map ---
let mymap; // Will hold the Leaflet map instance
let coverageCircles = {}; // Stores references to Leaflet circle objects for highlight/unhighlight
let activeCoverageCircle = null; // To track the currently highlighted circle
let coverageGroupLayer; // A Leaflet FeatureGroup for all coverage circles
let overlapHighlightGroupLayer; // A Leaflet FeatureGroup for explicit overlap highlights
let indiaBoundariesLayer; // New: To hold the Leaflet GeoJSON layer for India boundaries


// Define Leaflet highlight style for circles (now dotted white)
const HIGHLIGHT_STYLE = { 
    color: 'white',        // White outline
    dashArray: '10, 10',   // Dotted effect: 10px dash, 10px gap
    fillColor: 'transparent', // Transparent fill
    fillOpacity: 0.0,      // Fully transparent fill
    weight: 4              // Line thickness
};

// Define frequency colors (should be consistent with backend and UI legend)
const FREQ_COLORS = {
    1: { outline: '#12ab12', fill: '#90EE90' },  // Green, LightGreen
    2: { outline: '#0066ff', fill: '#ADD8E6' },  // Blue, LightBlue
    3: { outline: '#ecec0e', fill: '#FFFACD' },  // Yellow, LemonChiffon
    4: { outline: '#ff9900', fill: '#FFDAB9' },  // Orange, PeachPuff
    5: { outline: '#868688', fill: '#bdbdc1' }, // Cement, Plum
    6: { outline: '#cc0000', 'fill': '#ff5050' }, // Red, LightCoral
    7: { outline: '#cc0099', 'fill': '#FFB6C1' }  // Pink, LightPink
};
const DEFAULT_MAP_COLOR = { outline: 'grey', fill: 'lightgrey' };


// --- Utility Functions for Loading Spinner ---
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
export async function refreshMap() {
    showLoadingSpinner("Updating map visualization...");

    const mapidDiv = document.getElementById('mapid');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    const conflictWarning = document.getElementById('conflictWarning');

    // Robustly map and filter planning stations for map update
    const planningStationsPayload = currentPlanningStations
        .map(s => {
            const lat = parseFloat(s.latitude);
            const lon = parseFloat(s.longitude);
            const rad = parseFloat(s.safe_radius_km) || 12.0;
            const freq = parseInt(s.allocated_frequency) || 1;
            const onboardSlots = parseInt(s.onboard_slots) || 0;

            // Only return the object if lat and lon are valid numbers
            if (isNaN(lat) || isNaN(lon)) {
                console.warn(`Skipping station ${s.stationName || s.id} due to invalid coordinates: Lat=${s.latitude}, Lon=${s.longitude}`);
                return null; // Return null for invalid stations
            }

            return {
                id: s.id,
                lat: lat,
                lon: lon,
                rad: rad,
                name: s.stationName || `Station ${s.station_number || s.id}`, // Use stationName or a fallback
                frequency: freq,
                onboardSlots: onboardSlots,
                type: s.type
            };
        })
        .filter(s => s !== null); // Filter out any null entries (invalid stations)

    // Log the payload being sent to the backend for debugging
    console.log("[refreshMap] Sending payload to /api/update_map:", planningStationsPayload);


    if (planningStationsPayload.length === 0 && (!mymap || mymap.getBounds().isValid() === false)) {
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
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const mapData = await response.json();
        // Log the data received from the backend for debugging
        console.log("[refreshMap] Received map data from backend:", mapData);


        if (mymap) {
            mymap.remove();
            mymap = null;
        }

        mapidDiv.innerHTML = '';
        mapidDiv.style.display = 'block';
        mapPlaceholder.style.display = 'none';

        const initialCenter = Array.isArray(mapData.center_location) && mapData.center_location.length === 2 && 
                              !isNaN(mapData.center_location[0]) && !isNaN(mapData.center_location[1])
                              ? mapData.center_location : [20.5937, 78.9629]; // Default to central India
        const initialZoom = !isNaN(mapData.zoom_level) ? mapData.zoom_level : 6;

        mymap = L.map('mapid').setView(initialCenter, initialZoom);
        
        // Note on base map labels:
        // OpenStreetMap tiles often include local language labels.
        // If you need to remove Chinese/Urdu names from the *base map*,
        // you might need to use a different tile provider like CartoDB Positron
        // (L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '...' }))
        // or CartoDB DarkMatter, or a custom tile server that provides English-only labels.
        /*
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">CartoDB</a> contributors'
        }).addTo(mymap);
        */
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mymap);

        // Add India Boundaries (now filtered to exclude 'disputed')
        _addIndiaBoundaries();
        mymap.on("zoomend", _handleZoomEnd);

        // Initialize FeatureGroups directly in JS
        const approvedGroup = L.featureGroup().addTo(mymap);
        const planningGroup = L.featureGroup().addTo(mymap);
        const conflictGroup = L.featureGroup().addTo(mymap);
        const overlapHighlightGroup = L.featureGroup().addTo(mymap);
        coverageGroupLayer = L.featureGroup().addTo(mymap);
        overlapHighlightGroupLayer = L.featureGroup().addTo(mymap);


        // Draw all markers, circles, and polylines using the data from Flask
        drawAllMapElements(mapData.allStationData, approvedGroup, planningGroup);
        drawInterTypeConflicts(mapData.interTypeConflicts, conflictGroup);
        drawOverlapHighlights(mapData.overlappingPairData, overlapHighlightGroup);
        drawCircles(mapData.allStationData);


        // Add Layer Control
        /*L.control.layers({
            'CartoDB Positron': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png')
        }, */
        L.control.layers({
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        }, {
            'India Boundaries': indiaBoundariesLayer,
            'Approved Stations': approvedGroup,
            'Planning Stations': planningGroup,
            'Inter-Type Conflicts': conflictGroup,
            'Intra-Frequency Overlaps': overlapHighlightGroup,
            'Coverage Areas': coverageGroupLayer
        }, { collapsed: true }).addTo(mymap);

        if (mapData.hasConflict) {
            conflictWarning.style.display = 'block';
        } else {
            conflictWarning.style.display = 'none';
        }

    } catch (error) {
        console.error('Error refreshing map:', error);
        alert('An error occurred while updating the map. Check console for details: ' + error.message);
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
        // Ensure lat/lon are valid numbers before using them (already filtered above, but good for local checks)
        const lat = !isNaN(parseFloat(s.lat)) ? parseFloat(s.lat) : 0;
        const lon = !isNaN(parseFloat(s.lon)) ? parseFloat(s.lon) : 0;
        const latlng = [lat, lon];

        let iconHtml;
        let group;
        let stationName = s.name || ''; // Ensure stationName is available for the label

        // Determine icon based on station type and include the label
        if (s.type === 'approved') {
            // Font Awesome tower icon for approved stations with name label below
            iconHtml = `
                <div style="text-align: center; white-space: nowrap; font-weight: bold; color: forestgreen; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    <i class="fa fa-tower" style="font-size: 28px; line-height: 1;"></i>
                    <div style="font-size: 10px; margin-top: 2px;">${stationName}</div>
                </div>
            `;
            group = approvedGroup;
        } else { // type === 'planning'
            // Font Awesome satellite-dish icon for planning stations with name label below
            iconHtml = `
                <div style="text-align: center; white-space: nowrap; font-weight: bold; color: red; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    <i class="fa fa-satellite-dish" style="font-size: 28px; line-height: 1;"></i>
                    <div style="font-size: 10px; margin-top: 2px;">${stationName}</div>
                </div>
            `;
            group = planningGroup;
        }

        // Create a custom DivIcon using the Font Awesome HTML and the label
        const customIcon = L.divIcon({
            html: iconHtml,
            className: '', // Important: set to empty string to avoid default Leaflet icon styling
            iconSize: [80, 50], // Increased size to accommodate icon and text label
            iconAnchor: [40, 50], // Adjust anchor to center the icon+label (half of width, full height for bottom-center)
            popupAnchor: [0, -45] // Adjust popup anchor to appear above the entire icon/label combo
        });

        const marker = L.marker(latlng, { icon: customIcon }).addTo(group);
        marker.bindPopup(s.popup_content);

        // Add click listener to highlight circle
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
            popup: c.popup_content
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
            id: s.id
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
        // Apply the new HIGHLIGHT_STYLE for the dotted white circle
        circleToHighlight.setStyle(HIGHLIGHT_STYLE);
        activeCoverageCircle = circleToHighlight;
        mymap.panTo(circleToHighlight.getLatLng());
    }
}

// Function to draw overlap highlights (PolyLines)
export function drawOverlapHighlights(overlapDataArray, overlapHighlightGroup) {
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
        .bindPopup(overlap.popup_content)
        .addTo(overlapHighlightGroup);
    }
}

// Internal function to define boundary style
function _boundaryStyle(feature) {
    let wt = mymap.getZoom() / 4; // Adjusted divisor back to 4 for thicker lines
    // Set claimed border color to a subtle grey, typical for map borders
    switch (feature.properties.boundary) {
        case 'claimed':
            return { color: "#666666", weight: wt, opacity: 0.8 }; // Dark grey, slightly transparent
        default:
            return { color: "lightgray", weight: wt / 2, opacity: 0.8 };
    }
}

// Internal function to add India boundaries layer
function _addIndiaBoundaries() {
    console.log("Attempting to add India boundaries...");

    if (indiaBoundariesLayer && mymap.hasLayer(indiaBoundariesLayer)) {
        mymap.removeLayer(indiaBoundariesLayer);
    }
    try {
        const filteredFeatures = indiaBoundayLines.features.filter(feature => 
            feature.properties && feature.properties.boundary !== 'disputed'
        );
        const filteredGeoJSON = {
            ...indiaBoundayLines,
            features: filteredFeatures
        };

        indiaBoundariesLayer = L.geoJSON(filteredGeoJSON, { style: _boundaryStyle }).addTo(mymap);
        console.log("India boundaries layer added to map (disputed filtered).");
        if (indiaBoundariesLayer.getLayers().length === 0 && filteredFeatures.length > 0) {
            console.warn("India boundaries layer added but contains no features. Check filtered GeoJSON data for completeness/errors.");
        }
    } catch (e) {
        console.error("Error adding India boundaries layer:", e);
    }
}

// Internal function to handle zoom end event
function _handleZoomEnd() {
    if (mymap && indiaBoundariesLayer) {
        indiaBoundariesLayer.removeFrom(mymap);
        _addIndiaBoundaries();
    }
}

export async function runAllocation() {
    showLoadingSpinner("Running allocation and conflict resolution...");
    try {
        if (currentPlanningStations.length === 0) {
            alert("Please add at least one planning station before running allocation.");
            hideLoadingSpinner();
            return;
        }

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

export async function submitData() {
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
            headers: { 'Content-Type': 'application/json' },
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
