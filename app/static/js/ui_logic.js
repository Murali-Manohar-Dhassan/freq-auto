// ui_logic.js
// This file handles user interface interactions, station data management,
// validation, and local storage.

// Import necessary functions from map_logic.js.
import { refreshMap, submitData as submitDataMapLogic, showLoadingSpinner, hideLoadingSpinner } from './map_logic.js';

// --- Global State for UI and Planning Stations ---
let stationCounter = 0; // Tracks the number of planning stations (for numbering)
let skavIdLookup = {}; // Stores the S-Kavach ID lookup data
export let currentPlanningStations = []; // Global array to hold all planning station data. EXPORTED for other modules.

// --- Assign global window functions for HTML onclick ---
// These functions need to be accessible globally by the HTML 'onclick' attributes.
window.addNewStation = addNewStation;
window.removeStation = removeStation;
window.updateStationData = updateStationData;
window.validateInput = validateInput;
window.clearPlanningStations = clearPlanningStations;
window.submitData = submitDataWrapper;
window.toggleCardCollapse = toggleCardCollapse;


// Function to load S-Kavach ID lookup data
export function loadSkavIdLookup(callback) {
    fetch('/static/skavidLookup.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for skavIdLookup.json`);
            }
            return response.json();
        })
        .then(data => {
            skavIdLookup = data;
            console.log("S-Kavach ID lookup data loaded successfully.");
            if (callback) callback();
        })
        .catch(err => {
            console.error("Failed to load S-Kavach ID lookup data:", err);
            alert("CRITICAL ERROR: Failed to load 'skavIdLookup.json'. Please ensure the file exists in the 'static' folder and is valid JSON. The application cannot proceed without it. Details: " + err.message);
        });
}

// Utility to generate unique IDs for stations
function generateUniqueStationId() {
    return `station_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// Function to add a new station card to the UI and update global state
export function addNewStation() {
    if (currentPlanningStations.length > 0) {
        const lastStationIndex = currentPlanningStations.length - 1;
        const prevStationId = currentPlanningStations[lastStationIndex]?.id;

        if (prevStationId) {
            const prevStationCard = $(`#card_${prevStationId}`);
            if (prevStationCard.length) {
                let cardIsValid = true;
                let firstInvalidElementInCard = null;

                prevStationCard.find('input[required]').each(function() {
                    const input = $(this);
                    input.removeClass('is-invalid');
                    if (!input.val().trim()) {
                        cardIsValid = false;
                        input.addClass('is-invalid');
                        if (!firstInvalidElementInCard) {
                            firstInvalidElementInCard = input;
                        }
                    }
                });

                prevStationCard.find('input[type="number"][required]').each(function() {
                    const input = $(this);
                    const value = parseFloat(input.val());
                    const min = parseFloat(input.attr('min'));
                    const max = parseFloat(input.attr('max'));

                    if (isNaN(value)) {
                        cardIsValid = false;
                        input.addClass('is-invalid');
                        if (!firstInvalidElementInCard) firstInvalidElementInCard = input;
                    } else {
                        if (min !== undefined && !isNaN(min) && value < min) {
                            cardIsValid = false;
                            input.addClass('is-invalid');
                            if (!firstInvalidElementInCard) firstInvalidElementInCard = input;
                        }
                        if (max !== undefined && !isNaN(max) && value > max) {
                            cardIsValid = false;
                            input.addClass('is-invalid');
                            if (!firstInvalidElementInCard) firstInvalidElementInCard = input;
                        }
                    }
                });

                if (!cardIsValid) {
                    alert(`Please fill in all required fields for ${prevStationCard.find('.station-title-text').text()} before adding a new station. The first empty required field has been focused.`);
                    const collapseElement = prevStationCard.find('.collapse');
                    if (collapseElement.length && !collapseElement.hasClass('show')) {
                        bootstrap.Collapse.getOrCreateInstance(collapseElement[0]).show();
                        const headerId = collapseElement.attr('aria-labelledby');
                        if (headerId) $(`#${headerId}`).attr('aria-expanded', 'true');
                    }
                    if (firstInvalidElementInCard) {
                        firstInvalidElementInCard.focus();
                    }
                    return;
                }
            }
        }

        const prevStationIdToCollapse = currentPlanningStations[currentPlanningStations.length - 1]?.id;
        if (prevStationIdToCollapse) {
            const prevCollapseElement = document.getElementById(`collapse_${prevStationIdToCollapse}`);
            const prevHeaderElement = $(`#headerFor_${prevStationIdToCollapse}`);
            if (prevCollapseElement && prevCollapseElement.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(prevCollapseElement).hide();
            }
            if (prevHeaderElement.length) { // Check if jQuery object exists
                prevHeaderElement.attr('aria-expanded', 'false');
            }
        }
    }
    _createStationCard();
}

// Internal function to create the HTML for a new station card and append it
function _createStationCard() {
    stationCounter++;
    const stationId = generateUniqueStationId();

    const newStation = {
        id: stationId,
        station_number: stationCounter,
        KavachID: '',
        StationCode: '',
        stationName: '',
        latitude: '',
        longitude: '',
        optimum_static_profile_transfer: 0,
        onboard_slots: 0,
        safe_radius_km: 12.0,
        allocated_frequency: 4,
        type: 'planning'
    };
    currentPlanningStations.push(newStation);

    const container = document.getElementById("stationContainer");
    if (!container) {
        console.error("Station container not found. Cannot create new station card.");
        return;
    }

    const cardWrapperHtml = `
        <div class="col-12 col-sm-6 col-md-4 mb-3 station-card" id="card_${stationId}">
            <div class="card shadow p-0 h-100">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                    id="headerFor_${stationId}"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapse_${stationId}"
                    aria-expanded="true"
                    aria-controls="collapse_${stationId}"
                    style="cursor: pointer;">
                    <span class="station-title-text">Station ${stationCounter}</span>
                    <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); window.removeStation('${stationId}')"></button>
                </div>
                <div class="collapse show" id="collapse_${stationId}" aria-labelledby="headerFor_${stationId}">
                    <div class="card-body">
                        <label class="form-label">Stationary Kavach ID:</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID_${stationId}" placeholder="Enter Kavach ID" oninput="this.value = this.value.replace(/[^0-9]/g, ''); window.updateStationData('${stationId}', 'KavachID', this.value)" maxlength="10" autocomplete="off" required>
                            <div class="suggestions-box list-group" id="suggestions_kavach_${stationId}"></div>
                        </div>
                        <div class="form-text kavach-id-feedback mb-2"></div>

                        <label class="form-label">Station Code:</label>
                        <input type="text" class="form-control mb-2 station-code-input" id="StationCode_${stationId}" placeholder="Enter Station Code" required oninput="window.updateStationData('${stationId}', 'StationCode', this.value)">

                        <label class="form-label">Station Name:</label>
                        <input type="text" class="form-control mb-2 station-name-input" id="stationName_${stationId}" placeholder="Auto-filled or manual entry" required oninput="window.updateStationData('${stationId}', 'stationName', this.value)">

                        <label class="form-label">Stationary Unit Tower Latitude:</label>
                        <input type="number" step="any" class="form-control mb-2 latitude-input" id="Latitude_${stationId}" placeholder="Auto-filled or manual entry" required max="37.100" min="8.06666667" oninput="window.updateStationData('${stationId}', 'latitude', this.value)">

                        <label class="form-label">Stationary Unit Tower Longitude:</label>
                        <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude_${stationId}" placeholder="Auto-filled or manual entry" required max="92.100" min="68.06666667" oninput="window.updateStationData('${stationId}', 'longitude', this.value)">

                        <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                        <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic_${stationId}" min="0" required oninput="window.updateStationData('${stationId}', 'optimum_static_profile_transfer', this.value)">

                        <label class="form-label">Onboard Slots:</label>
                        <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots_${stationId}" min="0" required oninput="window.updateStationData('${stationId}', 'onboard_slots', this.value)">
                        
                        <div class="mb-2">
                            <label class="form-label">Radius (km): <span id="radius-value-${stationId}">${newStation.safe_radius_km}</span></label>
                            <input type="range"
                                class="form-range"
                                id="radiusSlider_${stationId}"
                                min="7"
                                max="25"
                                step="1"
                                value="${newStation.safe_radius_km}"
                                oninput="document.getElementById('radius-value-${stationId}').textContent = this.value; window.updateStationData('${stationId}', 'safe_radius_km', parseFloat(this.value))">
                        </div>

                        <div class="mb-2">
                            <label class="form-label">Frequency: <span id="frequency-value-${stationId}">${newStation.allocated_frequency}</span></label>
                            <input type="range"
                                class="form-range"
                                id="frequencySlider_${stationId}"
                                min="1"
                                max="7"
                                step="1"
                                value="${newStation.allocated_frequency}"
                                oninput="document.getElementById('frequency-value-${stationId}').textContent = this.value; window.updateStationData('${stationId}', 'allocated_frequency', parseInt(this.value))">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Append the HTML string and then get the newly added element as a jQuery object
    $(container).append(cardWrapperHtml);
    const $newCardWrapper = $(`#card_${stationId}`); // Get the newly added card as a jQuery object

    _setupKavachIdListener($newCardWrapper, stationId); // Pass the jQuery object

    updateStationNumbers();
    $newCardWrapper[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); // Use native DOM element for scrollIntoView
    $(`#KavachID_${stationId}`).focus();

    if (currentPlanningStations.length > 0) {
        $('#manualInputActions').show();
        $('#addStationBtn').show();
    }
}

// Function to remove a station card and update the global state
export function removeStation(stationIdToRemove) {
    const cardElement = $(`#card_${stationIdToRemove}`); // Get as jQuery object
    if (cardElement.length) {
        cardElement.remove();
    }

    const initialLength = currentPlanningStations.length;
    currentPlanningStations = currentPlanningStations.filter(station => station.id !== stationIdToRemove);

    if (currentPlanningStations.length < initialLength) {
        stationCounter = currentPlanningStations.length;
        updateStationNumbers();
        savePlanningStationsToLocalStorage();
        refreshMap();

        if (currentPlanningStations.length === 0) {
            $('#submitContainer').hide();
            $('#allocationResults').hide();
            $('#mapid').hide();
            $('#mapPlaceholder').show();
        }
    }
}

// Function to update data for a specific station in the global array
export function updateStationData(stationId, field, value) {
    console.log(`[updateStationData] Called for ID: ${stationId}, Field: ${field}, Value: ${value}`);
    const stationIndex = currentPlanningStations.findIndex(s => s.id === stationId);
    if (stationIndex !== -1) {
        if (['KavachID', 'StationCode', 'stationName'].includes(field)) {
            currentPlanningStations[stationIndex][field] = value;
        }
        else if (['latitude', 'longitude', 'safe_radius_km', 'optimum_static_profile_transfer', 'onboard_slots', 'allocated_frequency'].includes(field)) {
            if (field === 'allocated_frequency' || field === 'optimum_static_profile_transfer' || field === 'onboard_slots') {
                currentPlanningStations[stationIndex][field] = parseInt(value) || 0;
            } else {
                currentPlanningStations[stationIndex][field] = parseFloat(value) || 0;
            }
        }
        else {
            currentPlanningStations[stationIndex][field] = value;
        }

        console.log(`[updateStationData] Updated station data for ${stationId}:`, currentPlanningStations[stationIndex]);
        savePlanningStationsToLocalStorage();
        refreshMap();
    } else {
        console.warn(`[updateStationData] Station with ID ${stationId} not found in currentPlanningStations array.`);
    }
}

// Function to update the displayed station numbers on the cards
export function updateStationNumbers() {
    $('#stationContainer .station-card').each(function(index) {
        const cardId = $(this).attr('id');
        const stationId = cardId.replace('card_', '');
        const station = currentPlanningStations.find(s => s.id === stationId);

        if (station) {
            station.station_number = index + 1;
            $(this).find('.station-title-text').text(`Station ${index + 1}`);
            $(this).find('.btn-close').attr('onclick', `event.stopPropagation(); window.removeStation('${stationId}')`);
        }
    });
    stationCounter = currentPlanningStations.length;
}

// Function to validate all station cards
export function validateAllStationCards() {
    let allValid = true;
    let firstInvalidElement = null;
    const cardsWithErrors = new Set();
    const seenKavachIds = new Map();

    $('#stationContainer .station-card').each(function(index) {
        const card = $(this);
        const cardId = card.attr('id');
        const stationNumberText = card.find('.station-title-text').text();
        let cardHasErrorForThisIteration = false;

        card.find('input').removeClass('is-invalid is-valid');
        card.find('.form-text').text('').hide().removeClass('text-success text-warning text-danger');

        const kavachIdInput = card.find('.kavach-id-input');
        const kavachIdValue = kavachIdInput.val().trim();
        const kavachFeedbackEl = card.find('.kavach-id-feedback');

        if (!kavachIdValue && kavachIdInput.prop('required')) {
            allValid = false;
            cardHasErrorForThisIteration = true;
            kavachIdInput.addClass('is-invalid');
            kavachFeedbackEl.text('Kavach ID is required.').addClass('text-danger').show();
            if (!firstInvalidElement) firstInvalidElement = kavachIdInput;
        } else if (kavachIdValue) {
            if (seenKavachIds.has(kavachIdValue)) {
                allValid = false;
                cardHasErrorForThisIteration = true;
                kavachIdInput.addClass('is-invalid');
                kavachFeedbackEl.text(`Duplicate ID. Used in ${seenKavachIds.get(kavachIdValue)}.`).addClass('text-danger').show();
                if (!firstInvalidElement) firstInvalidElement = kavachIdInput;

                const firstInstanceInput = $(`#stationContainer .station-card .kavach-id-input`).filter(function() { return $(this).val().trim() === kavachIdValue; }).first();
                if (firstInstanceInput.length && firstInstanceInput[0] !== kavachIdInput[0]) {
                    firstInstanceInput.addClass('is-invalid');
                    firstInstanceInput.closest('.card-body').find('.kavach-id-feedback').text('Duplicate ID. This ID is used again.').addClass('text-danger').show();
                    cardsWithErrors.add(firstInstanceInput.closest('.station-card').attr('id'));
                }
            } else {
                seenKavachIds.set(kavachIdValue, stationNumberText);
                if (!skavIdLookup[kavachIdValue]) {
                    allValid = false;
                    cardHasErrorForThisIteration = true;
                    kavachIdInput.addClass('is-invalid');
                    kavachFeedbackEl.text('Kavach ID not found in master list.').addClass('text-danger').show();
                    if (!firstInvalidElement) firstInvalidElement = kavachIdInput;
                } else {
                    kavachIdInput.addClass('is-valid');
                }
            }
        }

        card.find('input[required]').not('.kavach-id-input').each(function() {
            const input = $(this);
            input.removeClass('is-invalid');

            if (!input.val().trim()) {
                allValid = false;
                cardHasErrorForThisIteration = true;
                input.addClass('is-invalid');
                if (!firstInvalidElement) {
                    firstInvalidElement = input;
                }
                console.warn(`Validation Error: "${input.prev('label').text() || input.attr('placeholder') || 'Field'}" in ${stationNumberText} is empty.`);
            } else if (input.attr('type') === 'number') {
                const value = parseFloat(input.val());
                const min = parseFloat(input.attr('min'));
                const max = parseFloat(input.attr('max'));

                if (isNaN(value)) {
                    allValid = false;
                    cardHasErrorForThisIteration = true;
                    input.addClass('is-invalid');
                    if (!firstInvalidElement) firstInvalidElement = input;
                    console.warn(`Validation Error: "${input.prev('label').text()}" in ${stationNumberText} is not a valid number.`);
                } else {
                    if (min !== undefined && !isNaN(min) && value < min) {
                        allValid = false;
                        cardHasErrorForThisIteration = true;
                        input.addClass('is-invalid');
                        if (!firstInvalidElement) firstInvalidElement = input;
                        console.warn(`Validation Error: "${input.prev('label').text()}" in ${stationNumberText} is below minimum (${min}).`);
                    }
                    if (max !== undefined && !isNaN(max) && value > max) {
                        allValid = false;
                        cardHasErrorForThisIteration = true;
                        input.addClass('is-invalid');
                        if (!firstInvalidElement) firstInvalidElement = input;
                        console.warn(`Validation Error: "${input.prev('label').text()}" in ${stationNumberText} is above maximum (${max}).`);
                    }
                }
            }
        });

        if (cardHasErrorForThisIteration) {
            cardsWithErrors.add(cardId);
        }
    });

    if (!allValid) {
        let alertMessage = "Please correct all errors. ";
        if (cardsWithErrors.size > 0) {
            alertMessage += "Cards with errors have been expanded.";
        }
        if (firstInvalidElement) {
            alertMessage += " The first problematic field has been focused.";
        }
        alert(alertMessage);

        cardsWithErrors.forEach(cardIdWithError => {
            const errorCard = $(`#${cardIdWithError}`);
            if (errorCard.length) {
                const collapseElement = errorCard.find('.collapse');
                if (collapseElement.length && !collapseElement.hasClass('show')) {
                    bootstrap.Collapse.getOrCreateInstance(collapseElement[0]).show();
                }
                const headerId = collapseElement.attr('aria-labelledby');
                if(headerId) {
                    $(`#${headerId}`).attr('aria-expanded', 'true');
                }
            }
        });
        
        if (firstInvalidElement) {
            firstInvalidElement.focus();
        }
    }
    return allValid;
}

function validateStationCard(station) {
    const cardElement = $(`#card_${station.id}`); // Get as jQuery object
    const formInputs = cardElement.length ? cardElement.find('.form-control') : [];
    let cardIsValid = true;
    formInputs.each(function() { // Use .each for jQuery collection
        if (!validateInput(this, false)) { // Pass native DOM element
            cardIsValid = false;
        }
    });
    station.isValid = cardIsValid;

    const cardHeader = $(`#headerFor_${station.id}`); // Get as jQuery object
    if (cardHeader.length) {
        if (cardIsValid) {
            cardHeader.removeClass('bg-danger').addClass('bg-primary');
            cardHeader.find('.badge').removeClass('bg-warning text-dark').addClass('bg-success').text('Valid');
        } else {
            cardHeader.removeClass('bg-primary').addClass('bg-danger');
            cardHeader.find('.badge').removeClass('bg-success').addClass('bg-warning text-dark').text('Invalid');
        }
    }
}

export function clearPlanningStations() {
    if (confirm("Are you sure you want to clear all planning stations? This action cannot be undone.")) {
        currentPlanningStations = [];
        stationCounter = 0;
        localStorage.removeItem('planningStations');
        renderStationCards();
        refreshMap();
        
        const allocationResults = document.getElementById('allocationResults');
        const resultsList = document.getElementById('results-list');
        const submitContainer = document.getElementById('submitContainer');

        if (allocationResults) allocationResults.style.display = 'none';
        if (resultsList) resultsList.innerHTML = '';
        if (submitContainer) submitContainer.style.display = 'none';
        
        showManual();
        console.log("All planning stations cleared.");
    }
}

async function submitDataWrapper() {
    if (!validateAllStationCards()) {
        alert("Please correct errors in station data before submitting.");
        return;
    }
    await submitDataMapLogic();
}

export function toggleCardCollapse() {
    const stationContainer = document.getElementById('stationContainer');
    const manualInputActions = document.getElementById('manualInputActions');
    const submitContainer = document.getElementById('submitContainer');
    const finishButton = document.getElementById('finishManualInputBtn');

    if (!stationContainer || !manualInputActions || !submitContainer || !finishButton) {
        console.error("toggleCardCollapse: One or more critical elements not found.");
        return;
    }

    const isCollapsed = stationContainer.classList.contains('collapsed-view');

    if (!isCollapsed) {
        if (currentPlanningStations.length === 0) {
            alert("Please add at least one station before finishing input.");
            return;
        }

        if (!validateAllStationCards()) {
            alert("Please correct errors in station data before finishing input.");
            return;
        }

        stationContainer.style.display = 'none';
        manualInputActions.style.display = 'none';
        submitContainer.style.display = 'flex';
        const mapid = document.getElementById('mapid');
        const mapPlaceholder = document.getElementById('mapPlaceholder');
        if (mapid) mapid.style.display = 'block';
        if (mapPlaceholder) mapPlaceholder.style.display = 'none';


        finishButton.textContent = 'Edit Stations & Inputs';
        stationContainer.classList.add('collapsed-view');

        currentPlanningStations.forEach(station => {
            station.isCollapsed = true;
            const collapseElement = document.getElementById(`collapse_${station.id}`);
            if (collapseElement) {
                const bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
                bsCollapse.hide();
            }
            const headerElement = document.getElementById(`headerFor_${station.id}`);
            if (headerElement) {
                const icon = headerElement.querySelector('.fas'); // Find any FontAwesome icon
                if (icon) {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            }
        });
        savePlanningStationsToLocalStorage();
        refreshMap();
        console.log("Input cards collapsed, submit section shown.");

    } else {
        stationContainer.style.display = 'flex';
        manualInputActions.style.display = 'flex';
        submitContainer.style.display = 'none';
        const mapid = document.getElementById('mapid');
        const mapPlaceholder = document.getElementById('mapPlaceholder');
        if (mapid) mapid.style.display = 'block';
        if (mapPlaceholder) mapPlaceholder.style.display = 'none';

        finishButton.textContent = 'Finish & Preview Stations';
        stationContainer.classList.remove('collapsed-view');

        currentPlanningStations.forEach(station => {
            station.isCollapsed = false;
            const collapseElement = document.getElementById(`collapse_${station.id}`);
            if (collapseElement) {
                const bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
                bsCollapse.show();
            }
            const headerElement = document.getElementById(`headerFor_${station.id}`);
            if (headerElement) {
                const icon = headerElement.querySelector('.fas'); // Find any FontAwesome icon
                if (icon) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                }
            }
        });
        savePlanningStationsToLocalStorage();
        refreshMap();
        console.log("Input cards expanded, submit section hidden.");
    }
}

export function showManual() {
    const stationContainer = document.getElementById('stationContainer');
    const manualInputActions = document.getElementById('manualInputActions');
    const submitContainer = document.getElementById('submitContainer');
    const allocationResults = document.getElementById('allocationResults');
    const resultsList = document.getElementById('results-list');
    const finishManualInputBtn = document.getElementById('finishManualInputBtn');

    if (stationContainer) stationContainer.style.display = 'flex';
    if (manualInputActions) manualInputActions.style.display = 'flex';
    if (submitContainer) submitContainer.style.display = 'none';
    
    if (allocationResults) allocationResults.style.display = 'none';
    if (resultsList) resultsList.innerHTML = '';
    
    if (finishManualInputBtn) finishManualInputBtn.textContent = 'Finish & Preview Stations';
    if (stationContainer) stationContainer.classList.remove('collapsed-view');

    currentPlanningStations.forEach(station => {
        station.isCollapsed = false;
        const collapseElement = document.getElementById(`collapse_${station.id}`);
        if (collapseElement) {
            const bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
            bsCollapse.show();
        }
        const headerElement = document.getElementById(`headerFor_${station.id}`);
        if (headerElement) {
            const icon = headerElement.querySelector('.fas'); // Find any FontAwesome icon
            if (icon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        }
    });
    refreshMap();
}

// --- Local Storage Management ---
export function savePlanningStationsToLocalStorage() {
    localStorage.setItem('planningStations', JSON.stringify(currentPlanningStations));
    console.log("Planning stations saved to localStorage.");
}

export function loadPlanningStationsFromLocalStorage() {
    const storedStations = localStorage.getItem('planningStations');
    if (storedStations) {
        const loaded = JSON.parse(storedStations);
        currentPlanningStations = [];
        if (loaded.length > 0) {
            stationCounter = Math.max(...loaded.map(s => s.station_number || 0)) + 1;
        } else {
            stationCounter = 0;
        }

        loaded.forEach(stationData => {
            _createStationCardFromLoadedData(stationData);
        });
        updateStationNumbers();
        console.log("Planning stations loaded from localStorage.");
    } else {
        currentPlanningStations = [];
        stationCounter = 0;
        console.log("No planning stations found in localStorage.");
    }
}

// Internal helper function to create a station card when loading from stored data
function _createStationCardFromLoadedData(stationData) {
    const stationId = stationData.id || generateUniqueStationId();

    if (!currentPlanningStations.some(s => s.id === stationId)) {
        currentPlanningStations.push({ ...stationData, id: stationId });
    } else {
        const existingIndex = currentPlanningStations.findIndex(s => s.id === stationId);
        if (existingIndex !== -1) {
            currentPlanningStations[existingIndex] = { ...stationData, id: stationId };
        }
    }

    const container = document.getElementById("stationContainer");
    if (!container) {
        console.error("Station container not found. Cannot create card for loaded data.");
        return;
    }

    const cardWrapperHtml = `
        <div class="col-12 col-sm-6 col-md-4 mb-3 station-card" id="card_${stationId}">
            <div class="card shadow p-0 h-100">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                    id="headerFor_${stationId}"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapse_${stationId}"
                    aria-expanded="${stationData.isCollapsed ? 'false' : 'true'}"
                    aria-controls="collapse_${stationId}"
                    style="cursor: pointer;">
                    <span class="station-title-text">Station ${stationData.station_number || currentPlanningStations.length}</span>
                    <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); window.removeStation('${stationId}')"></button>
                </div>
                <div class="collapse ${stationData.isCollapsed ? '' : 'show'}" id="collapse_${stationId}" aria-labelledby="headerFor_${stationId}">
                    <div class="card-body">
                        <label class="form-label">Stationary Kavach ID:</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID_${stationId}" placeholder="Enter Kavach ID" oninput="this.value = this.value.replace(/[^0-9]/g, ''); window.updateStationData('${stationId}', 'KavachID', this.value)" maxlength="10" autocomplete="off" required value="${stationData.KavachID || ''}">
                            <div class="suggestions-box list-group" id="suggestions_kavach_${stationId}"></div>
                        </div>
                        <div class="form-text kavach-id-feedback mb-2"></div>

                        <label class="form-label">Station Code:</label>
                        <input type="text" class="form-control mb-2 station-code-input" id="StationCode_${stationId}" placeholder="Enter Station Code" required oninput="window.updateStationData('${stationId}', 'StationCode', this.value)" value="${stationData.StationCode || ''}">

                        <label class="form-label">Station Name:</label>
                        <input type="text" class="form-control mb-2 station-name-input" id="stationName_${stationId}" placeholder="Auto-filled or manual entry" required oninput="window.updateStationData('${stationId}', 'stationName', this.value)" value="${stationData.stationName || ''}">

                        <label class="form-label">Stationary Unit Tower Latitude:</label>
                        <input type="number" step="any" class="form-control mb-2 latitude-input" id="Latitude_${stationId}" placeholder="Auto-filled or manual entry" required max="37.100" min="8.06666667" oninput="window.updateStationData('${stationId}', 'latitude', this.value)" value="${stationData.latitude || ''}">

                        <label class="form-label">Stationary Unit Tower Longitude:</label>
                        <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude_${stationId}" placeholder="Auto-filled or manual entry" required max="92.100" min="68.06666667" oninput="window.updateStationData('${stationId}', 'longitude', this.value)" value="${stationData.longitude || ''}">

                        <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                        <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic_${stationId}" min="0" required oninput="window.updateStationData('${stationId}', 'optimum_static_profile_transfer', this.value)" value="${stationData.optimum_static_profile_transfer || 0}">

                        <label class="form-label">Onboard Slots:</label>
                        <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots_${stationId}" min="0" required oninput="window.updateStationData('${stationId}', 'onboard_slots', this.value)" value="${stationData.onboard_slots || 0}">
                        
                        <div class="mb-2">
                            <label class="form-label">Radius (km): <span id="radius-value-${stationId}">${stationData.safe_radius_km}</span></label>
                            <input type="range"
                                class="form-range"
                                id="radiusSlider_${stationId}"
                                min="7"
                                max="25"
                                step="1"
                                value="${stationData.safe_radius_km}"
                                oninput="document.getElementById('radius-value-${stationId}').textContent = this.value; window.updateStationData('${stationId}', 'safe_radius_km', parseFloat(this.value))">
                        </div>

                        <div class="mb-2">
                            <label class="form-label">Frequency: <span id="frequency-value-${stationId}">${stationData.allocated_frequency}</span></label>
                            <input type="range"
                                class="form-range"
                                id="frequencySlider_${stationId}"
                                min="1"
                                max="7"
                                step="1"
                                value="${stationData.allocated_frequency}"
                                oninput="document.getElementById('frequency-value-${stationId}').textContent = this.value; window.updateStationData('${stationId}', 'allocated_frequency', parseInt(this.value))">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $(container).append(cardWrapperHtml);
    const $newCardWrapper = $(`#card_${stationId}`); // Get the newly added card as a jQuery object

    _setupKavachIdListener($newCardWrapper, stationId);
}

// New function to render all station cards based on currentPlanningStations array
function renderStationCards() {
    const container = document.getElementById("stationContainer");
    if (container) {
        $(container).empty(); // Clear existing cards using jQuery
    }
    currentPlanningStations.forEach(stationData => {
        _createStationCardFromLoadedData(stationData);
    });
    updateStationNumbers();
}


function _setupKavachIdListener(cardWrapper, stationId) {
    // cardWrapper is now expected to be a jQuery object
    const kavachIdInput = cardWrapper.find(`#KavachID_${stationId}`);
    const suggestionsBox = cardWrapper.find(`#suggestions_kavach_${stationId}`);
    const kavachIdFeedback = cardWrapper.find('.kavach-id-feedback');

    if (kavachIdInput.length === 0 || suggestionsBox.length === 0 || kavachIdFeedback.length === 0) {
        console.warn(`Missing elements for Kavach ID listener setup for station ${stationId}.`);
        return;
    }

    kavachIdInput.on('input', function() {
        const query = this.value;
        suggestionsBox.empty();
        kavachIdInput.removeClass('is-invalid is-valid');
        kavachIdFeedback.hide().removeClass('text-success text-warning text-danger').text('');

        if (query.length === 0) {
            kavachIdInput.val('');
            updateStationData(stationId, 'KavachID', '');
            updateStationData(stationId, 'stationName', '');
            updateStationData(stationId, 'StationCode', '');
            updateStationData(stationId, 'latitude', '');
            updateStationData(stationId, 'longitude', '');
            return;
        }

        const filtered = Object.keys(skavIdLookup).filter(id => id.startsWith(query));

        if (filtered.length > 0) {
            suggestionsBox.show();
            filtered.forEach(id => {
                const item = $(`<button type="button" class="list-group-item list-group-item-action">${id} - ${skavIdLookup[id].name}</button>`);
                item.on('click', () => {
                    kavachIdInput.val(id);
                    suggestionsBox.hide();
                    _fillStationDetails(stationId, id);
                });
                suggestionsBox.append(item);
            });
        } else {
            suggestionsBox.hide();
            _clearStationDetails(stationId);
            if (query.length > 0) {
                kavachIdInput.addClass('is-invalid');
                kavachIdFeedback.text('Kavach ID not found in master list.').addClass('text-danger').show();
            }
        }
        window.updateStationData(stationId, 'KavachID', query);
    });

    kavachIdInput.on('blur', function() {
        setTimeout(() => suggestionsBox.hide(), 100);
        
        const finalKavachId = this.value;
        if (finalKavachId && skavIdLookup[finalKavachId]) {
            _fillStationDetails(stationId, finalKavachId);
            kavachIdInput.addClass('is-valid');
        } else if (finalKavachId) {
            _clearStationDetails(stationId);
            kavachIdInput.addClass('is-invalid');
            kavachIdFeedback.text('Kavach ID not found in master list.').addClass('text-danger').show();
        } else {
            _clearStationDetails(stationId);
            kavachIdInput.removeClass('is-invalid is-valid');
            kavachIdFeedback.hide();
        }
    });
}

function _fillStationDetails(stationId, kavachId) {
    const details = skavIdLookup[kavachId];
    if (details) {
        $(`#stationName_${stationId}`).val(details.name);
        $(`#StationCode_${stationId}`).val(details.code);
        $(`#Latitude_${stationId}`).val(details.latitude);
        $(`#Longtitude_${stationId}`).val(details.longitude);

        const station = currentPlanningStations.find(s => s.id === stationId);
        if (station) {
            station.KavachID = kavachId;
            station.stationName = details.name;
            station.StationCode = details.code;
            station.latitude = details.latitude;
            station.longitude = details.longitude;
        }
    }
}

function _clearStationDetails(stationId) {
    const station = currentPlanningStations.find(s => s.id === stationId);
    if (station) {
        station.stationName = '';
        station.StationCode = '';
        station.latitude = '';
        station.longitude = '';
    }
    $(`#stationName_${stationId}`).val('');
    $(`#StationCode_${stationId}`).val('');
    $(`#Latitude_${stationId}`).val('');
    $(`#Longtitude_${stationId}`).val('');
}

// Internal function to validate a single input field
function validateInput(inputElement, showAlert = true) {
    const input = $(inputElement);
    const value = input.val().trim();
    const type = input.attr('type');
    const required = input.prop('required');
    const min = parseFloat(input.attr('min'));
    const max = parseFloat(input.attr('max'));
    const fieldName = input.prev('label').text() || input.attr('placeholder') || 'Field';

    input.removeClass('is-invalid is-valid');

    if (required && !value) {
        input.addClass('is-invalid');
        if (showAlert) alert(`${fieldName} is required.`);
        return false;
    }

    if (type === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            if (required || value) {
                input.addClass('is-invalid');
                if (showAlert) alert(`${fieldName} must be a valid number.`);
                return false;
            }
        } else {
            if (min !== undefined && !isNaN(min) && numValue < min) {
                input.addClass('is-invalid');
                if (showAlert) alert(`${fieldName} must be at least ${min}.`);
                return false;
            }
            if (max !== undefined && !isNaN(max) && numValue > max) {
                input.addClass('is-invalid');
                if (showAlert) alert(`${fieldName} must be at most ${max}.`);
                return false;
            }
        }
    }

    if (value) {
        input.addClass('is-valid');
    }
    return true;
}

