// main.js
// This is the entry point for your frontend JavaScript.
// It orchestrates the loading and initialization of other modules.

import { 
    loadSkavIdLookup, 
    loadPlanningStationsFromLocalStorage, 
    showManual,
    addNewStation,
    removeStation, // Import removeStation
    updateStationData, // Import updateStationData
    clearPlanningStations, // Import clearPlanningStations
    toggleCardCollapse // Import new toggle function
} from './ui_logic.js';

import { 
    refreshMap, 
    runAllocation, // Import runAllocation
    submitData // Import submitData
} from './map_logic.js';

// Expose functions globally for HTML onclick attributes.
// This is necessary because onclick in HTML is a global scope, not a module scope.
window.addNewStation = addNewStation;
window.removeStation = removeStation;
window.updateStationData = updateStationData;
window.runAllocation = runAllocation;
window.submitData = submitData;
window.clearPlanningStations = clearPlanningStations;
window.toggleCardCollapse = toggleCardCollapse; // Expose the new function


// --- DOM Ready / Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('floatingBrand').classList.add('show');
    loadSkavIdLookup(() => {
        console.log("S-Kavach ID lookup loaded. Initializing UI.");
        loadPlanningStationsFromLocalStorage(); // Load any saved stations first
        showManual(); // Set initial view and prepare UI
        refreshMap(); // Initial map refresh. This will now display loaded stations or an empty map.
    });

    // Attach toggle event to the finishManualInputBtn
    const finishBtn = document.getElementById('finishManualInputBtn');
    if (finishBtn) {
        finishBtn.addEventListener('click', window.toggleCardCollapse);
    }
});
