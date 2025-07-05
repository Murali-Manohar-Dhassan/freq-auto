// main.js
// This file is the entry point for the frontend application.
// It handles initial setup, loading data, and orchestrating other modules.

// Import functions from ui_logic.js
import { loadSkavIdLookup, loadPlanningStationsFromLocalStorage, showManual } from './ui_logic.js';
// Import refreshMap from map_logic.js
import { refreshMap } from './map_logic.js';

window.refreshMap = refreshMap;

window.updateStationData = updateStationData; 

// --- DOM Ready / Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    // Show the floating brand after DOM is loaded
    document.getElementById('floatingBrand').classList.add('show');

    // Attach event listener for the map refresh button
    // This ensures the button element exists when we try to attach the listener
    const mapRefreshButton = document.getElementById('mapRefreshButton');
    if (mapRefreshButton) {
        mapRefreshButton.addEventListener('click', refreshMap);
        console.log("[main.js] Map refresh button event listener attached.");
    } else {
        console.warn("[main.js] Map refresh button element not found. Check its ID.");
    }

    // Load S-Kavach ID lookup data first, then proceed with UI initialization
    loadSkavIdLookup(() => {
        console.log("S-Kavach ID lookup loaded. Initializing UI.");
        loadPlanningStationsFromLocalStorage(); // Load any saved planning stations
        showManual(); // Set initial view and prepare UI (e.g., show add station button)
        refreshMap(); // Initial map refresh to display loaded stations or placeholder
    });
});