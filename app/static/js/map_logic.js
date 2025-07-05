// map_logic.js
// This file handles all Leaflet map initialization, rendering, and interaction logic.

// Import currentPlanningStations from ui_logic.js
import { currentPlanningStations, validateAllStationCards  } from './ui_logic.js';
// Import India boundary GeoJSON data
import { indiaBoundayLines } from './india_boundaries.js';


// --- Global State for Map ---
let mymap;
let coverageCircles = {};
let activeCoverageCircle = null;
let coverageGroupLayer;
let overlapHighlightGroupLayer;
let indiaBoundariesLayer;

const HIGHLIGHT_STYLE = {
    color: 'white',
    dashArray: '10, 10',
    fillColor: 'transparent',
    fillOpacity: 0.0,
    weight: 4
};

const FREQ_COLORS = {
    1: { outline: '#ecec0e', fill: '#FFFACD' },  // Yellow, LemonChiffon
    2: { outline: '#12ab12', fill: '#90EE90' },  // Green, LightGreen
    3: { outline: '#ff9900', fill: '#FFDAB9' },  // Orange, PeachPuff
    4: { outline: '#0066ff', fill: '#ADD8E6' },  // Blue, LightBlue
    5: { outline: '#868688', fill: '#bdbdc1' }, // Cement, Plum
    6: { outline: '#cc0000', fill: '#ff5050' }, // Red, LightCoral
    7: { outline: '#cc0099', fill: '#FFB6C1' }  // Pink, LightPink
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

    // This payload contains ONLY the current planning stations being managed by the UI
    const planningStationsPayload = currentPlanningStations
        .map(s => {
            const lat = parseFloat(s.latitude);
            const lon = parseFloat(s.longitude);
            const rad = parseFloat(s.safe_radius_km) || 12.0;
            const freq = parseInt(s.allocated_frequency) || 1;
            const onboardSlots = parseInt(s.onboard_slots) || 0;

            if (isNaN(lat) || isNaN(lon)) {
                // Keep this warning, it's useful for debugging invalid inputs
                console.warn(`[refreshMap] Skipping station ${s.stationName || s.id} due to invalid coordinates in currentPlanningStations: Lat='${s.latitude}', Lon='${s.longitude}'`);
                return null;
            }

            return {
                id: s.id,
                lat: lat,
                lon: lon,
                rad: rad,
                name: s.stationName || `Station ${s.station_number || s.id}`,
                frequency: freq,
                onboardSlots: onboardSlots,
                type: 'planning'
            };
        })
        .filter(s => s !== null);

    console.log("[refreshMap] Sending payload to /api/update_map:", planningStationsPayload);

    // Removed the early exit condition. The map should always try to display.
    // The fallback logic for fitBounds will handle empty/invalid planningStationsPayload.

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
        console.log("[refreshMap] Received map data from backend:", mapData);
        // --- DEBUG POINT 1: Check allStationData from backend ---
        console.log("[DEBUG 1] mapData.allStationData received from backend:", mapData.allStationData);


        if (mymap) {
            mymap.remove();
            mymap = null;
            console.log("[refreshMap] Existing map removed.");
        }

        mapidDiv.innerHTML = '';
        mapidDiv.style.display = 'block';
        mapPlaceholder.style.display = 'none';

        mymap = L.map('mapid');
        console.log("[refreshMap] New map instance created.");
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mymap);

        _addIndiaBoundaries();
        mymap.on("zoomend", _handleZoomEnd);

        const approvedGroup = L.featureGroup().addTo(mymap);
        const planningGroup = L.featureGroup().addTo(mymap);
        const dbPlanningGroup = L.featureGroup().addTo(mymap);
        const conflictGroup = L.featureGroup().addTo(mymap);
        const overlapHighlightGroup = L.featureGroup().addTo(mymap);
        coverageGroupLayer = L.featureGroup().addTo(mymap);
        overlapHighlightGroupLayer = L.featureGroup().addTo(mymap);


        // Draw ALL stations (including approved/persisted ones from mapData.allStationData)
        drawAllMapElements(mapData.allStationData, approvedGroup, planningGroup, dbPlanningGroup);
        drawInterTypeConflicts(mapData.interTypeConflicts, conflictGroup);
        drawOverlapHighlights(mapData.overlappingPairData, overlapHighlightGroup);
        drawCircles(mapData.allStationData);
        console.log("[refreshMap] All map elements drawn.");

        // Calculate bounds ONLY from the current planning stations payload for zooming
        if (planningStationsPayload.length > 0) { // Use planningStationsPayload directly
            const latLngsForZoom = planningStationsPayload.map(s => [parseFloat(s.lat), parseFloat(s.lon)]);
            // Filter out invalid coordinates before creating bounds
            const validLatLngsForZoom = latLngsForZoom.filter(ll => !isNaN(ll[0]) && !isNaN(ll[1]));

            // --- DEBUG POINT 2: Check validLatLngs for fitBounds (now based on planningStationsPayload) ---
            console.log("[DEBUG 2] validLatLngs for fitBounds (Planning Stations only):", validLatLngsForZoom);

            if (validLatLngsForZoom.length > 0) {
                const bounds = L.latLngBounds(validLatLngsForZoom);
                // --- DEBUG POINT 3: Check calculated bounds (Planning Stations only) ---
                console.log("[DEBUG 3] Calculated bounds (Planning Stations only):", bounds.isValid() ? bounds.toBBoxString() : 'Invalid Bounds');
                
                mymap.fitBounds(bounds.pad(0.2)); // Add 20% padding
                console.log("[refreshMap] Map fitted to planning stations bounds.");
            } else {
                mymap.setView([20.5937, 78.9629], 6); // Fallback if planning stations have no valid coords
                console.log("[refreshMap] No valid planning station coordinates, set to default India view.");
            }
        } else {
            mymap.setView([20.5937, 78.9629], 6); // Fallback if planningStationsPayload is empty
            console.log("[refreshMap] No planning stations, set to default India view.");
        }

        L.control.layers({
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        }, {
            'India Boundaries': indiaBoundariesLayer,
            'Approved Stations': approvedGroup,
            'Planning Stations (Current)': planningGroup,
            'Planning Stations (Persisted)': dbPlanningGroup,
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
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: white; border: 2px solid red; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
        `;
        messageBox.innerHTML = `
            <p style="color: red; font-weight: bold;">An error occurred while updating the map.</p>
            <p>${error.message}</p>
            <button onclick="this.parentNode.remove()" style="background-color: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        document.body.appendChild(messageBox);

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
        console.log("[refreshMap] Function finished.");
    }
}

function drawAllMapElements(stationDataArray, approvedGroup, planningGroup, dbPlanningGroup) {
    stationDataArray.forEach(s => {
        const lat = !isNaN(parseFloat(s.lat)) ? parseFloat(s.lat) : 0;
        const lon = !isNaN(parseFloat(s.lon)) ? parseFloat(s.lon) : 0;
        const latlng = [lat, lon];

        let iconHtml;
        let group;
        let stationName = s.name || '';

        if (s.type === 'approved') {
            iconHtml = `
                <div style="text-align: center; white-space: nowrap; font-weight: bold; color: forestgreen; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    <i class="fa fa-tower-cell" style="font-size: 28px; line-height: 1;"></i>
                    <div style="font-size: 10px; margin-top: 2px;">${stationName}</div>
                </div>
            `;
            group = approvedGroup;
        } else if (s.type === 'db_planning') {
            iconHtml = `
                <div style="text-align: center; white-space: nowrap; font-weight: bold; color: orange; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    <i class="fa fa-map-pin" style="font-size: 28px; line-height: 1;"></i>
                    <div style="font-size: 10px; margin-top: 2px;">${stationName}</div>
                </div>
            `;
            group = dbPlanningGroup;
        }
        else { // type === 'planning' (temporary UI stations)
            iconHtml = `
                <div style="text-align: center; white-space: nowrap; font-weight: bold; color: red; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    <i class="fa fa-satellite-dish" style="font-size: 28px; line-height: 1;"></i>
                    <div style="font-size: 10px; margin-top: 2px;">${stationName}</div>
                </div>
            `;
            group = planningGroup;
        }

        const customIcon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [80, 50],
            iconAnchor: [40, 50],
            popupAnchor: [0, -45]
        });

        const marker = L.marker(latlng, { icon: customIcon }).addTo(group);
        marker.bindPopup(s.popup_content);

        marker.on('click', function() {
            highlightCircle(s.id);
        });
    });
}

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

function _boundaryStyle(feature) {
    let wt = mymap.getZoom() / 4;
    return {
        color: "#3A3535",   // A blue color for highlighting (you can change this)
        weight: wt,         // Use the calculated weight
        opacity: 0.9,        // Adjust opacity (0.0 to 1.0)
        fill: false,            // Set to false to disable filling the polygon
        fillColor: null,        // Explicitly set to null (or any color, but 'fill: false' takes precedence)
        fillOpacity: 0.0    
    };
}

function _addIndiaBoundaries() {
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
        if (indiaBoundariesLayer.getLayers().length === 0 && filteredFeatures.length > 0) {
            console.warn("India boundaries layer added but contains no features. Check filtered GeoJSON data for completeness/errors.");
        }
    } catch (e) {
        console.error("Error adding India boundaries layer:", e);
    }
}

function _handleZoomEnd() {
    if (mymap && indiaBoundariesLayer) {
        indiaBoundariesLayer.removeFrom(mymap);
        _addIndiaBoundaries();
    }
}

export async function submitData() {
    console.log("[submitData] Starting submission process.");
    if (!validateAllStationCards()) {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: white; border: 2px solid orange; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
        `;
        messageBox.innerHTML = `
            <p style="color: orange; font-weight: bold;">Warning</p>
            <p>Please correct errors in station data before submitting.</p>
            <button onclick="this.parentNode.remove()" style="background-color: #ffc107; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        document.body.appendChild(messageBox);
        console.log("[submitData] Validation failed. Aborting submission.");
        return;
    }

    const payloadStations = currentPlanningStations.map(s => ({
        // Match keys to allocate_slots's expected input
        KavachID: s.KavachID,
        StationCode: s.StationCode,
        name: s.stationName, // Changed from stationName to name
        Latitude: parseFloat(s.latitude) || 0.0, // Changed from latitude to Latitude
        Longitude: parseFloat(s.longitude) || 0.0, // Changed from longitude to Longitude
        onboardSlots: parseInt(s.onboard_slots, 10) || 0, // Changed from onboard_slots to onboardSlots
        Static: parseInt(s.optimum_static_profile_transfer, 10) || 0, // Changed from optimum_static_profile_transfer to Static
        SafeRadius: parseFloat(s.safe_radius_km) || 12.0, // Changed from safe_radius_km to SafeRadius
        // If 'allocated_frequency' is not used by allocate_slots for its core logic,
        // you might consider removing it from the payload if not strictly necessary.
        // If it is needed later, keep it as is.
        allocated_frequency: parseInt(s.allocated_frequency, 10) || 1 
    }));

    if (payloadStations.length === 0) {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: white; border: 2px solid orange; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
        `;
        messageBox.innerHTML = `
            <p style="color: orange; font-weight: bold;">Warning</p>
            <p>No stations to submit.</p>
            <button onclick="this.parentNode.remove()" style="background-color: #ffc107; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        document.body.appendChild(messageBox);
        console.warn("[submitData] No stations in payload. Aborting.");
        return;
    }

    console.log("[submitData] Submitting Data (payloadStations):", payloadStations);
    showLoadingSpinner('Running allocation, persisting to database, and generating file...');

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
            showLoadingSpinner('File ready! Starting download...');
            checkFileReady(data.fileUrl);
        } else {
            const messageBox = document.createElement('div');
            messageBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background-color: white; border: 2px solid orange; padding: 20px; border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
            `;
            messageBox.innerHTML = `
                <p style="color: orange; font-weight: bold;">Info</p>
                <p>${data.message || data.error || "Unknown response from server after submission."}</p>
                <button onclick="this.parentNode.remove()" style="background-color: #ffc107; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
            `;
            document.body.appendChild(messageBox);
            hideLoadingSpinner();
        }
    } catch (err) {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: white; border: 2px solid red; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
        `;
        messageBox.innerHTML = `
            <p style="color: red; font-weight: bold;">Submission Error</p>
            <p>${err.message}</p>
            <button onclick="this.parentNode.remove()" style="background-color: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        document.body.appendChild(messageBox);
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
                            uiLogic.clearPlanningStations(); // Clear stations after successful download
                            uiLogic.showManual(); // Show manual input section
                        });
                    }, 1000);
                } else if (response.status === 404 || attempts >= maxAttempts) {
                    let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                    const messageBox = document.createElement('div');
                    messageBox.style.cssText = `
                        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background-color: white; border: 2px solid orange; padding: 20px; border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
                    `;
                    messageBox.innerHTML = `
                        <p style="color: orange; font-weight: bold;">Download Error</p>
                        <p>${message} Please check the server or try again later.</p>
                        <button onclick="this.parentNode.remove()" style="background-color: #ffc107; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
                    `;
                    document.body.appendChild(messageBox);
                    hideLoadingSpinner();
                } else {
                    attempts++;
                    showLoadingSpinner(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`);
                    setTimeout(poll, checkInterval);
                }
            })
            .catch(err => {
                const messageBox = document.createElement('div');
                messageBox.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background-color: white; border: 2px solid red; padding: 20px; border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center;
                `;
                messageBox.innerHTML = `
                    <p style="color: red; font-weight: bold;">Network Error</p>
                    <p>Error checking file readiness: ${err.message}</p>
                    <button onclick="this.parentNode.remove()" style="background-color: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Close</button>
                `;
                document.body.appendChild(messageBox);
                hideLoadingSpinner();
            });
    }
    poll();
}