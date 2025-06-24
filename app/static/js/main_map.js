// static/js/main_map.js

// Global variables to manage map layers and highlighting
let mymap;
let coverageCircles = {}; // Stores references to Leaflet circle objects
let activeCoverageCircle = null; // Tracks the currently highlighted circle
const defaultCircleStyle = { fillOpacity: 0.15, weight: 2 }; // Base style for circles
const highlightCircleStyle = { color: 'black', fillColor: 'yellow', fillOpacity: 0.5, weight: 4 };

let coverageGroupLayer; // A Leaflet FeatureGroup for all coverage circles
let overlapHighlightGroupLayer; // A Leaflet FeatureGroup for explicit overlap highlights

// Folium-generated feature groups (assumed global from app.py injection)
// These should be accessible if Folium puts them in global scope.
// If not, you might need to find them or recreate some elements in JS.
// For now, assuming they are accessible globally or via mymap.eachLayer
let approved_group; // Placeholder, assuming Folium makes this global
let planning_group; // Placeholder, assuming Folium makes this global
let conflict_group; // Placeholder, assuming Folium makes this global


// This function is now the primary entry point for setting up map interactions
// after the map HTML has been injected into the DOM.
function setupMapInteractions(mapInstance) {
    mymap = mapInstance; // Ensure we are using the correct map instance

    // Check if FeatureGroups already exist and clear/remove them to prevent duplicates
    if (coverageGroupLayer && mymap.hasLayer(coverageGroupLayer)) {
        mymap.removeLayer(coverageGroupLayer);
    }
    if (overlapHighlightGroupLayer && mymap.hasLayer(overlapHighlightGroupLayer)) {
        mymap.removeLayer(overlapHighlightGroupLayer);
    }

    // Initialize Leaflet FeatureGroups for better layer management
    coverageGroupLayer = L.featureGroup().addTo(mymap);
    overlapHighlightGroupLayer = L.featureGroup().addTo(mymap);

    // Re-add LayerControl to ensure it picks up dynamically added JS layers
    // Remove existing control if it exists to avoid duplicates when map is refreshed
    if (mymap.layersControl) {
        mymap.removeControl(mymap.layersControl);
    }

    // Attempt to find Folium's generated feature groups.
    // This is a bit tricky with dynamic HTML injection.
    // A more robust way might be for Flask to return a JSON object
    // with layer names and their IDs, or for all layers to be created in JS.
    // For now, let's assume Folium's groups are globally available or can be found.
    // If you encounter 'undefined' errors, you might need to adjust your Folium output
    // to either not create these layers (and create them all in JS) or make them more easily accessible.

    // A common Folium practice is to name layers. You can iterate `mymap._layers` or similar.
    // Let's assume the FeatureGroup variables (approved_group, planning_group, conflict_group)
    // are global variables set by Folium's generated JS.
    // If not, you might need to adjust how your Flask app injects them or creates them.

    // For robustness, let's try to find Folium's groups from `mymap.options.layers` or similar.
    // Folium's L.Control.Layers automatically detects FeatureGroups added to the map.
    // So simply re-adding LayerControl might be enough if the groups are attached to the map.

    L.control.layers(null, {
        'Approved Stations': approved_group, // Assuming these are globally available from Folium's output
        'Planning Stations': planning_group,
        'Potential Conflicts': conflict_group,
        'Overlap Highlights (Freq Conflict)': overlapHighlightGroupLayer, // Our JS group
        'Coverage Areas': coverageGroupLayer // Our JS group
    }).addTo(mymap);


    // Draw all coverage circles using the data injected from Python
    // 'allStationData' and 'overlappingPairData' are assumed to be global variables
    // injected by Flask in the map HTML.
    if (typeof allStationData !== 'undefined') {
        drawCircles(allStationData);
    } else {
        console.warn("allStationData not found. Coverage circles will not be drawn.");
    }
    
    if (typeof overlappingPairData !== 'undefined') {
        drawOverlapHighlights(overlappingPairData);
    } else {
        console.warn("overlappingPairData not found. Overlap highlights will not be drawn.");
    }


    // Attach click listeners to markers created by Folium
    // Iterate over all layers on the map to find markers
    mymap.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            // Find the station ID for this marker
            let stationId = null;
            const popupContent = layer.getPopup() ? layer.getPopup().getContent() : '';

            // This parsing is still somewhat fragile, relies on specific popup content.
            // A better way would be to have Flask embed a data attribute on the marker's icon element.
            let matchApproved = popupContent.match(/<b>(.*?)<\/b><br>\s*<b>Status:<\/b> Approved/);
            if (matchApproved) {
                const stationName = matchApproved[1];
                // Try to find the corresponding station data by name (assuming unique names)
                const stationData = allStationData ? allStationData.find(s => s.type === 'approved' && s.popup_content.includes(stationName)) : null;
                if (stationData) stationId = stationData.id;
            } else {
                let matchPlanning = popupContent.match(/<b>(.*?) \(#\d+\)<\/b><br>\s*<b>Status:<\/b> Planning/);
                if (matchPlanning) {
                    const stationName = matchPlanning[1];
                    const stationData = allStationData ? allStationData.find(s => s.type === 'planning' && s.popup_content.includes(stationName)) : null;
                    if (stationData) stationId = stationData.id;
                }
            }

            if (stationId) {
                layer.on('click', function() {
                    // Only highlight if the 'Coverage Areas' layer is currently active/visible
                    if (mymap.hasLayer(coverageGroupLayer)) {
                        highlightCircle(stationId);
                    } else {
                        console.log("Coverage Areas layer is not visible.");
                    }
                });
            }
        }
    });
}


// Function to draw all circles
function drawCircles(stationDataArray) {
    coverageGroupLayer.clearLayers();
    coverageCircles = {};

    for (const s of stationDataArray) {
        const circle = L.circle([s.lat, s.lon], {
            color: s.color,
            fillColor: s.fillColor,
            fillOpacity: s.fillOpacity,
            weight: s.weight,
            radius: s.radius,
            id: s.id
        });

        circle.bindPopup(s.popup_content);
        circle.defaultStyle = {
            color: s.color,
            fillColor: s.fillColor,
            fillOpacity: s.fillOpacity,
            weight: s.weight
        };

        circle.addTo(coverageGroupLayer);
        coverageCircles[s.id] = circle;
    }
}

// Function to highlight a specific circle by ID
function highlightCircle(stationId) {
    if (activeCoverageCircle && activeCoverageCircle.defaultStyle) {
        activeCoverageCircle.setStyle(activeCoverageCircle.defaultStyle);
    }

    const circleToHighlight = coverageCircles[stationId];
    if (circleToHighlight) {
        circleToHighlight.setStyle(highlightCircleStyle);
        activeCoverageCircle = circleToHighlight;
    }
}

// Function to draw overlap highlights (PolyLines for now)
function drawOverlapHighlights(overlapDataArray) {
    overlapHighlightGroupLayer.clearLayers();
    for (const overlap of overlapDataArray) {
        L.polyline(overlap.line_coords, {
            color: 'darkred',
            weight: 5,
            opacity: 0.9,
            dashArray: '5, 10'
        }).bindPopup(`FREQ ${overlap.frequency} OVERLAP: ${overlap.s1_name} & ${overlap.s2_name} - Dist: ${overlap.distance.toFixed(2)}km (Req: ${overlap.min_required.toFixed(2)}km)`)
        .addTo(overlapHighlightGroupLayer);
    }
}