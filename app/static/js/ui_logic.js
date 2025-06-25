// ui_logic.js
// This file handles user interface interactions, station data management,
// validation, and local storage.

// Import necessary functions from map_logic.js.
// We only need refreshMap here, and runAllocation for the button click.
import { refreshMap, showLoadingSpinner, hideLoadingSpinner } from './map_logic.js';

// --- Global State for UI and Planning Stations ---
let stationCounter = 0; // Tracks the number of planning stations (for numbering)
let skavIdLookup = {}; // Stores the S-Kavach ID lookup data
export let currentPlanningStations = []; // Global array to hold all planning station data. EXPORTED for other modules.

// Function to load S-Kavach ID lookup data (remains in UI logic as it supports KavachID input)
export function loadSkavIdLookup(callback) {
    fetch('/static/skavidLookup.json') // Verify this filename
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
export function addNewStation() { // Exported for HTML button click
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
            if (prevHeaderElement) {
                prevHeaderElement.attr('aria-expanded', 'false');
            }
        }
    }
    // Call the internal function to create and append the new card
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
    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = `card_${stationId}`;

    cardWrapper.innerHTML = `
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
    `;
    container.appendChild(cardWrapper);
    _setupKavachIdListener(cardWrapper, stationId); // Use internal function for listener setup

    updateStationNumbers(); // Re-index displayed station numbers
    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $(`#KavachID_${stationId}`).focus();

    if (currentPlanningStations.length > 0) {
        $('#manualInputActions').show();
        $('#addStationBtn').show();
    }
}

// Function to remove a station card and update the global state
export function removeStation(stationIdToRemove) { // Exported and made globally accessible
    // Remove the station from the DOM
    const cardElement = document.getElementById(`card_${stationIdToRemove}`);
    if (cardElement) {
        cardElement.remove();
    }

    // Remove the station from the global currentPlanningStations array
    const initialLength = currentPlanningStations.length;
    currentPlanningStations = currentPlanningStations.filter(station => station.id !== stationIdToRemove);

    if (currentPlanningStations.length < initialLength) {
        stationCounter = currentPlanningStations.length;
        updateStationNumbers(); // Re-index displayed station numbers
        savePlanningStationsToLocalStorage(); // Save to local storage after modification
        refreshMap(); // Update map after station removal

        if (currentPlanningStations.length === 0) {
            $('#submitContainer').hide();
            $('#allocationResults').hide();
            $('#mapid').hide();
            $('#mapPlaceholder').show();
        }
    }
}

// Function to update data for a specific station in the global array
export function updateStationData(stationId, field, value) { // Exported and made globally accessible
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
        refreshMap(); // Trigger map refresh
    } else {
        console.warn(`[updateStationData] Station with ID ${stationId} not found in currentPlanningStations array.`);
    }
    savePlanningStationsToLocalStorage();
}

// Function to update the displayed station numbers on the cards
export function updateStationNumbers() { // Exported if needed by other modules
    $('#stationContainer .station-card').each(function(index) {
        const cardId = $(this).attr('id');
        const stationId = cardId.replace('card_', '');
        const station = currentPlanningStations.find(s => s.id === stationId);

        if (station) {
            station.station_number = index + 1;
            $(this).find('.station-title-text').text(`Station ${index + 1}`);
            // Note: The onclick for remove button now references `window.removeStation`
            $(this).find('.btn-close').attr('onclick', `event.stopPropagation(); window.removeStation('${stationId}')`);
        }
    });
    stationCounter = currentPlanningStations.length;
}

// Function to validate all station cards
export function validateAllStationCards() { // Exported for use by runAllocation or submitData
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

// Function to handle "Finish Manual Input" (now renamed to be clear for the toggle behavior)
export function toggleCardCollapse() { // Renamed from finishManualInput
    if (!validateAllStationCards()) {
        return;
    }

    const cards = $('#stationContainer .station-card');
    if (cards.length === 0) {
        alert("Please add at least one station.");
        return;
    }

    const firstCardCollapse = cards.first().find('.collapse');
    if (firstCardCollapse.length && firstCardCollapse.hasClass('show')) {
        // If first card is open, collapse all
        cards.find('.collapse').each(function() {
            bootstrap.Collapse.getOrCreateInstance(this).hide();
            $(`#${$(this).attr('aria-labelledby')}`).attr('aria-expanded', 'false');
        });
        $('#finishManualInputBtn').text('Expand All Cards');
    } else {
        // If first card is closed, expand all
        cards.find('.collapse').each(function() {
            bootstrap.Collapse.getOrCreateInstance(this).show();
            $(`#${$(this).attr('aria-labelledby')}`).attr('aria-expanded', 'true');
        });
        $('#finishManualInputBtn').text('Collapse All Cards');
    }
    $('#submitContainer').show(); // Show submit button after this action
}


// Internal function to set up listeners for Kavach ID input and autofill logic
function _setupKavachIdListener(cardElement, stationId) {
    const kavachIdInput = cardElement.querySelector(`#KavachID_${stationId}`);
    const stationCodeEl = cardElement.querySelector(`#StationCode_${stationId}`);
    const nameEl = cardElement.querySelector(`#stationName_${stationId}`);
    const latEl = cardElement.querySelector(`#Latitude_${stationId}`);
    const lonEl = cardElement.querySelector(`#Longtitude_${stationId}`);
    const optimumStaticEl = cardElement.querySelector(`#OptimumStatic_${stationId}`);
    const onboardSlotsEl = cardElement.querySelector(`#onboardSlots_${stationId}`);

    const feedbackEl = $(kavachIdInput).closest('.card-body').find('.kavach-id-feedback');
    const suggestionsEl = cardElement.querySelector(`#suggestions_kavach_${stationId}`);

    if (!kavachIdInput || !suggestionsEl) {
        console.error(`Kavach ID Input or suggestions element not found for ID: ${stationId}`);
        return;
    }

    const autoFilledFields = [nameEl, latEl, lonEl, stationCodeEl, optimumStaticEl, onboardSlotsEl];

    const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        $(suggestionsEl).hide();
    };

    const handleKavachIdValidation = (isSelectionEvent = false) => {
        const currentKavachIdValue = kavachIdInput.value.trim();
        const lookupData = skavIdLookup[currentKavachIdValue];

        autoFilledFields.forEach(el => { if(el) el.dataset.autoFilled = "false"; });
        kavachIdInput.classList.remove('is-invalid', 'is-valid');
        if (feedbackEl && feedbackEl.length) {
            feedbackEl.text('').hide().removeClass('text-success text-warning text-danger');
        }

        let isDuplicate = false;
        if (currentKavachIdValue) {
            const count = currentPlanningStations.filter(s => s.id !== stationId && s.KavachID === currentKavachIdValue).length;
            if (count > 0) {
                isDuplicate = true;
            }
        }

        if (isDuplicate) {
            kavachIdInput.classList.add('is-invalid');
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('This Kavach ID is already used. Please use a unique ID.').addClass('text-danger').show();
            }
        } else if (lookupData) {
            kavachIdInput.classList.add('is-valid');

            updateStationData(stationId, 'KavachID', currentKavachIdValue);

            if (stationCodeEl) {
                stationCodeEl.value = lookupData.code || '';
                stationCodeEl.dataset.originalValue = stationCodeEl.value;
                stationCodeEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'StationCode', stationCodeEl.value);
            }
            if (nameEl) {
                nameEl.value = lookupData.name || '';
                nameEl.dataset.originalValue = nameEl.value;
                nameEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'stationName', nameEl.value);
            }
            if (latEl) {
                latEl.value = lookupData.latitude || '';
                latEl.dataset.originalValue = latEl.value;
                latEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'latitude', latEl.value);
            }
            if (lonEl) {
                lonEl.value = lookupData.longitude || '';
                lonEl.dataset.originalValue = lonEl.value;
                lonEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'longitude', lonEl.value);
            }
            if (optimumStaticEl && lookupData.optimum_static_profile_transfer !== undefined) {
                optimumStaticEl.value = lookupData.optimum_static_profile_transfer;
                optimumStaticEl.dataset.originalValue = optimumStaticEl.value;
                optimumStaticEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'optimum_static_profile_transfer', optimumStaticEl.value);
            }
            if (onboardSlotsEl && lookupData.onboard_slots !== undefined) {
                onboardSlotsEl.value = lookupData.onboard_slots;
                onboardSlotsEl.dataset.originalValue = onboardSlotsEl.value;
                onboardSlotsEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'onboard_slots', onboardSlotsEl.value);
            }

            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID found. Fields auto-filled.').removeClass('text-danger text-warning').addClass('text-success').show();
                setTimeout(() => { if (feedbackEl.hasClass('text-success')) feedbackEl.fadeOut();}, 3000);
            }
        } else if (currentKavachIdValue && isSelectionEvent) {
            kavachIdInput.classList.add('is-invalid');
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID not found. Please verify or enter details manually.').addClass('text-danger').show();
            }
            if (stationCodeEl) { stationCodeEl.value = ''; updateStationData(stationId, 'StationCode', ''); }
            if (nameEl) { nameEl.value = ''; updateStationData(stationId, 'stationName', ''); }
            if (latEl) { latEl.value = ''; updateStationData(stationId, 'latitude', ''); }
            if (lonEl) { lonEl.value = ''; updateStationData(stationId, 'longitude', ''); }
            if (optimumStaticEl) { optimumStaticEl.value = ''; updateStationData(stationId, 'optimum_static_profile_transfer', ''); }
            if (onboardSlotsEl) { onboardSlotsEl.value = ''; updateStationData(stationId, 'onboard_slots', ''); }

        } else if (!currentKavachIdValue) {
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('').hide();
            }
            if (stationCodeEl) { stationCodeEl.value = ''; updateStationData(stationId, 'StationCode', ''); }
            if (nameEl) { nameEl.value = ''; updateStationData(stationId, 'stationName', ''); }
            if (latEl) { latEl.value = ''; updateStationData(stationId, 'latitude', ''); }
            if (lonEl) { lonEl.value = ''; updateStationData(stationId, 'longitude', ''); }
            if (optimumStaticEl) { optimumStaticEl.value = ''; updateStationData(stationId, 'optimum_static_profile_transfer', ''); }
            if (onboardSlotsEl) { onboardSlotsEl.value = ''; updateStationData(stationId, 'onboard_slots', ''); }
        }
    };

    autoFilledFields.forEach(el => {
        if (!el) return;
        el.addEventListener('blur', function(event) {
            const targetEl = event.target;
            if (targetEl.dataset.autoFilled === "true" && targetEl.value !== targetEl.dataset.originalValue) {
                const labelText = $(targetEl).prev('label').text() || 'This field';
                if (!confirm(`${labelText} was auto-filled. Are you sure you want to change it to "${targetEl.value}"?`)) {
                    targetEl.value = targetEl.dataset.originalValue;
                } else {
                    targetEl.dataset.originalValue = targetEl.value;
                }
            }
            const fieldNameFromId = targetEl.id.split('_')[0];
            const dataFieldName = {
                'KavachID': 'KavachID',
                'StationCode': 'StationCode',
                'stationName': 'stationName',
                'Latitude': 'latitude',
                'Longtitude': 'longitude',
                'radiusSlider': 'safe_radius_km',
                'frequencySlider': 'allocated_frequency',
                'OptimumStatic': 'optimum_static_profile_transfer',
                'onboardSlots': 'onboard_slots',
            }[fieldNameFromId] || fieldNameFromId.toLowerCase();

            let parsedValue = targetEl.value;
            if (['latitude', 'longitude', 'safe_radius_km', 'optimum_static_profile_transfer', 'onboard_slots', 'allocated_frequency'].includes(dataFieldName)) {
                 parsedValue = parseFloat(targetEl.value) || 0;
                 if (dataFieldName === 'allocated_frequency' || dataFieldName === 'optimum_static_profile_transfer' || dataFieldName === 'onboard_slots') {
                     parsedValue = parseInt(targetEl.value) || 0;
                 }
            }
            updateStationData(stationId, dataFieldName, parsedValue);
        });
    });

    kavachIdInput.addEventListener('input', () => {
        const idValue = kavachIdInput.value.trim();
        hideSuggestions();
        kavachIdInput.classList.remove('is-valid');

        if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
            feedbackEl.text('').hide();
        }

        const currentlyUsedIdsInOtherCards = new Set(
            currentPlanningStations
                .filter(s => s.id !== stationId && s.KavachID)
                .map(s => s.KavachID)
        );

        if (idValue.length > 0) {
            const potentialMatches = Object.keys(skavIdLookup).filter(key => key.startsWith(idValue));
            const availableMatches = potentialMatches.filter(match => !currentlyUsedIdsInOtherCards.has(match));

            if (availableMatches.length > 0) {
                availableMatches.slice(0, 10).forEach(match => {
                    const suggestionItem = document.createElement('a');
                    suggestionItem.href = '#';
                    suggestionItem.classList.add('list-group-item', 'list-group-item-action', 'py-1', 'px-2');
                    suggestionItem.textContent = `${match} (${skavIdLookup[match].name || 'N/A'})`;
                    suggestionItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        kavachIdInput.value = match;
                        hideSuggestions();
                        handleKavachIdValidation(true);
                    });
                    suggestionsEl.appendChild(suggestionItem);
                });
                $(suggestionsEl).show();
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
            handleKavachIdValidation(false);
        }

        if (idValue.length > 0) {
            if (skavIdLookup[idValue]) {
                if (feedbackEl && feedbackEl.length) {
                    if (!feedbackEl.hasClass('text-success')) {
                        feedbackEl.text('Kavach ID found.').addClass('text-success').removeClass('text-warning text-danger').show();
                        setTimeout(() => { if(feedbackEl.hasClass('text-success')) feedbackEl.fadeOut(); }, 2000);
                    }
                }
            } else if (idValue.length === parseInt(kavachIdInput.maxLength, 10)) {
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('Kavach ID may not exist in master list.').addClass('text-warning').removeClass('text-success text-danger').show();
                }
            } else if (currentlyUsedIdsInOtherCards.has(idValue)) {
                 if (feedbackEl && feedbackEl.length) {
                    feedbackEl.text('This Kavach ID is already used.').addClass('text-danger').removeClass('text-warning text-success').show();
                 }
            } else {
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('').hide();
                }
            }
        } else {
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('').hide();
            }
        }
    });

    kavachIdInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSuggestions();
            if (kavachIdInput.value.trim() !== "") {
                handleKavachIdValidation(true);
            } else {
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('').hide();
                }
            }
        }, 150);
    });

    kavachIdInput.addEventListener('keydown', (e) => {
        const items = suggestionsEl.querySelectorAll('.list-group-item-action');
        if (!$(suggestionsEl).is(":visible") || items.length === 0) return;

        let currentFocus = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('active')) currentFocus = index;
        });

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[currentFocus]?.classList.remove('active');
            currentFocus = (currentFocus + 1) % items.length;
            items[currentFocus]?.classList.add('active');
            items[currentFocus]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[currentFocus]?.classList.remove('active');
            currentFocus = (currentFocus - 1 + items.length) % items.length;
            items[currentFocus]?.classList.add('active');
            items[currentFocus]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && currentFocus > -1) {
            e.preventDefault();
            items[currentFocus]?.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideSuggestions();
        }
    });

    document.addEventListener('click', (e) => {
        if (!kavachIdInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });

    // These listeners are technically redundant because of inline oninput,
    // but kept here for completeness in case inline handlers are removed.
    const fieldsToUpdateOnInput = [
        { selector: `#StationCode_${stationId}`, fieldName: 'StationCode', type: 'string' },
        { selector: `#stationName_${stationId}`, fieldName: 'stationName', type: 'string' },
        { selector: `#Latitude_${stationId}`, fieldName: 'latitude', type: 'float' },
        { selector: `#Longtitude_${stationId}`, fieldName: 'longitude', type: 'float' },
        { selector: `#OptimumStatic_${stationId}`, fieldName: 'optimum_static_profile_transfer', type: 'int' },
        { selector: `#onboardSlots_${stationId}`, fieldName: 'onboard_slots', type: 'int' },
        { selector: `#radiusSlider_${stationId}`, fieldName: 'safe_radius_km', type: 'float' },
        { selector: `#frequencySlider_${stationId}`, fieldName: 'allocated_frequency', type: 'int' }
    ];

    fieldsToUpdateOnInput.forEach(field => {
        const element = cardElement.querySelector(field.selector);
        if (element) {
            element.addEventListener('input', () => {
                let valueToUpdate = element.value;
                if (field.type === 'float') {
                    valueToUpdate = parseFloat(element.value) || 0;
                } else if (field.type === 'int') {
                    valueToUpdate = parseInt(element.value) || 0;
                }
                updateStationData(stationId, field.fieldName, valueToUpdate);
            });
        }
    });
}

// This function clears all planning stations from the UI and global state
export function clearPlanningStations() { // Exported for HTML button click
    if (confirm('Are you sure you want to clear all planning stations?')) {
        currentPlanningStations = []; // Clear the global array
        savePlanningStationsToLocalStorage(); // Clear from localStorage
        document.getElementById('stationContainer').innerHTML = ''; // Clear cards from DOM
        stationCounter = 0; // Reset counter
        updateStationNumbers(); // Re-index (will effectively clear numbers)
        document.getElementById('allocationResults').style.display = 'none'; // Hide results
        refreshMap(); // Update map to remove all planning stations
    }
}

// This function prepares the UI for manual input, usually on initial load or reset
export function showManual() { // Exported for initial setup from main.js
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();

    $('#manualInputActions').show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide();
    
    $('#submitContainer').hide();
    $('#submitArrowGuide').hide();
    
    currentPlanningStations = []; 
    stationCounter = 0; 
    savePlanningStationsToLocalStorage(); // Ensure localStorage is cleared too
    document.getElementById('allocationResults').style.display = 'none';
}

// --- Local Storage Management ---
export function savePlanningStationsToLocalStorage() { // Exported for use by other modules
    localStorage.setItem('planningStations', JSON.stringify(currentPlanningStations));
    console.log("Planning stations saved to localStorage.");
}

export function loadPlanningStationsFromLocalStorage() { // Exported for initial setup from main.js
    const storedStations = localStorage.getItem('planningStations');
    if (storedStations) {
        const loaded = JSON.parse(storedStations);
        currentPlanningStations = []; // Clear array before loading to prevent duplicates on re-load
        loaded.forEach(stationData => {
            _createStationCardFromLoadedData(stationData); // Use internal helper
        });
        updateStationNumbers(); // Ensure correct numbering and data.station_number
        console.log("Planning stations loaded from localStorage.");
    } else {
        currentPlanningStations = [];
        console.log("No planning stations found in localStorage.");
    }
}

// Internal helper function to create a station card when loading from stored data
function _createStationCardFromLoadedData(stationData) {
    const stationId = stationData.id || generateUniqueStationId();

    currentPlanningStations.push({ ...stationData, id: stationId });

    const container = document.getElementById("stationContainer");
    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = `card_${stationId}`;

    cardWrapper.innerHTML = `
        <div class="card shadow p-0 h-100">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                id="headerFor_${stationId}"
                data-bs-toggle="collapse"
                data-bs-target="#collapse_${stationId}"
                aria-expanded="false" <!-- Start collapsed for loaded cards -->
                aria-controls="collapse_${stationId}"
                style="cursor: pointer;">
                <span class="station-title-text">Station ${currentPlanningStations.length}</span>
                <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); window.removeStation('${stationId}')"></button>
            </div>
            <div class="collapse" id="collapse_${stationId}" aria-labelledby="headerFor_${stationId}"> <!-- Start collapsed for loaded cards -->
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
    `;
    container.appendChild(cardWrapper);
    _setupKavachIdListener(cardWrapper, stationId);
}
