// --- Global State ---
let stationCounter = 0; // Renamed from manualStationCount, tracks the number of planning stations
let skavIdLookup = {}; // Stores the S-Kavach ID lookup data
let currentPlanningStations = []; // Global array to hold all planning station data (renamed from stationsData)

// NEW GLOBAL VARIABLES FOR MAP INTEGRATION
let mymap; // Will hold the Leaflet map instance
let coverageCircles = {}; // Stores references to Leaflet circle objects for highlight/unhighlight
let activeCoverageCircle = null; // To track the currently highlighted circle
let coverageGroupLayer; // A Leaflet FeatureGroup for all coverage circles (managed by JS)
let overlapHighlightGroupLayer; // A Leaflet FeatureGroup for explicit overlap highlights (managed by JS)

// Define Leaflet highlight style (moved from previous response for consistency)
const HIGHLIGHT_STYLE = { color: 'black', fillColor: 'yellow', fillOpacity: 0.5, weight: 4 };

// Define frequency colors for consistency between JS and Python
// Ensure these match your Python's FREQ_COLORS for visual consistency.
const FREQ_COLORS = {
    1: { outline: '#00FF00', fill: '#90EE90' },  // Green, LightGreen
    2: { outline: '#0000FF', fill: '#ADD8E6' },  // Blue, LightBlue
    3: { outline: '#FFFF00', fill: '#FFFACD' },  // Yellow, LemonChiffon
    4: { outline: '#FFA500', fill: '#FFDAB9' },  // Orange, PeachPuff
    5: { outline: '#800080', fill: '#DDA0DD' },  // Purple, Plum
    6: { outline: '#FFC0CB', fill: '#FFB6C1' },  // Pink, LightPink
    7: { outline: '#A52A2A', fill: '#F5DEB3' }   // Brown, Wheat
};
const DEFAULT_MAP_COLOR = { outline: 'grey', fill: 'lightgrey' };


// --- DOM Utility Functions for Loading Spinner ---
// (These are copied from previous response; ensure they align with your actual implementation)
function showLoadingSpinner(message = "Processing... Please wait.") {
    const spinner = document.getElementById('loadingSpinnerOverlay');
    const msgElement = document.getElementById('loadingMessage');
    if (msgElement) msgElement.textContent = message;
    if (spinner) spinner.style.display = 'flex';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinnerOverlay');
    if (spinner) spinner.style.display = 'none';
}


// Function to load S-Kavach ID lookup data
function loadSkavIdLookup(callback) {
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
// This function is called by the "Add Station" button onclick
function addNewStation() {
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
    createStationCard(); // Call the function to create and append the new card
}

// Function to create the HTML for a new station card and append it
function createStationCard() {
    stationCounter++; // Increment for the new station
    const stationId = generateUniqueStationId(); // Generate a unique ID

    // Initialize new station data object, align with HTML IDs and backend expectations
    const newStation = {
        id: stationId,
        station_number: stationCounter, // For display purposes in the UI
        KavachID: '',
        StationCode: '',
        stationName: '',
        latitude: '',
        longitude: '',
        optimum_static_profile_transfer: 0,
        onboard_slots: 0, // This corresponds to 'onboard-slots-input'
        safe_radius_km: 12.0, // Default value from your HTML
        allocated_frequency: 4, // Default value from your HTML
        type: 'planning' // Explicitly mark as a planning station
    };
    currentPlanningStations.push(newStation); // Add to the global array

    const container = document.getElementById("stationContainer");
    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = `card_${stationId}`; // Assign the unique ID to the card wrapper

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
                <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStation('${stationId}')"></button>
            </div>
            <div class="collapse show" id="collapse_${stationId}" aria-labelledby="headerFor_${stationId}">
                <div class="card-body">
                    <label class="form-label">Stationary Kavach ID:</label>
                    <div class="input-wrapper">
                        <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID_${stationId}" placeholder="Enter Kavach ID" oninput="this.value = this.value.replace(/[^0-9]/g, ''); updateStationData('${stationId}', 'KavachID', this.value)" maxlength="10" autocomplete="off" required>
                        <div class="suggestions-box list-group" id="suggestions_kavach_${stationId}"></div>
                    </div>
                    <div class="form-text kavach-id-feedback mb-2"></div>

                    <label class="form-label">Station Code:</label>
                    <input type="text" class="form-control mb-2 station-code-input" id="StationCode_${stationId}" placeholder="Enter Station Code" required oninput="updateStationData('${stationId}', 'StationCode', this.value)">

                    <label class="form-label">Station Name:</label>
                    <input type="text" class="form-control mb-2 station-name-input" id="stationName_${stationId}" placeholder="Auto-filled or manual entry" required oninput="updateStationData('${stationId}', 'stationName', this.value)">

                    <label class="form-label">Stationary Unit Tower Latitude:</label>
                    <input type="number" step="any" class="form-control mb-2 latitude-input" id="Latitude_${stationId}" placeholder="Auto-filled or manual entry" required max="37.100" min="8.06666667" oninput="updateStationData('${stationId}', 'latitude', this.value)">

                    <label class="form-label">Stationary Unit Tower Longitude:</label>
                    <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude_${stationId}" placeholder="Auto-filled or manual entry" required max="92.100" min="68.06666667" oninput="updateStationData('${stationId}', 'longitude', this.value)">

                    <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                    <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic_${stationId}" min="0" required oninput="updateStationData('${stationId}', 'optimum_static_profile_transfer', this.value)">

                    <label class="form-label">Onboard Slots:</label>
                    <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots_${stationId}" min="0" required oninput="updateStationData('${stationId}', 'onboard_slots', this.value)">
                    
                    <div class="mb-2">
                        <label class="form-label">Radius (km): <span id="radius-value-${stationId}">${newStation.safe_radius_km}</span></label>
                        <input type="range"
                            class="form-range"
                            id="radiusSlider_${stationId}"
                            min="7"
                            max="25"
                            step="1"
                            value="${newStation.safe_radius_km}"
                            oninput="document.getElementById('radius-value-${stationId}').textContent = this.value; updateStationData('${stationId}', 'safe_radius_km', parseFloat(this.value))">
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
                            oninput="document.getElementById('frequency-value-${stationId}').textContent = this.value; updateStationData('${stationId}', 'allocated_frequency', parseInt(this.value))">
                    </div>
                </div>
            </div>
        </div>
    `;
    container.appendChild(cardWrapper);
    setupKavachIdListener(cardWrapper, stationId); // Setup autocomplete and validation for Kavach ID

    updateStationNumbers(); // Re-index displayed station numbers
    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $(`#KavachID_${stationId}`).focus(); // Focus on the first input of the new card

    // Show/hide relevant buttons/containers (Adjusted logic from previous response based on your original)
    if (currentPlanningStations.length > 0) {
        $('#manualInputActions').show(); // Ensure manual input actions are visible
        $('#addStationBtn').show(); // Ensure add station button is visible
    }
    // The finishManualInputBtn and submitContainer are managed by finishManualInput() and submitData()
    // and might be hidden until validation or specific actions.
}

// Renamed from removeStationCard for clarity given its argument
function removeStation(stationIdToRemove) {
    // Remove the station from the DOM
    const cardElement = document.getElementById(`card_${stationIdToRemove}`);
    if (cardElement) {
        cardElement.remove();
    }

    // Remove the station from the global currentPlanningStations array
    const initialLength = currentPlanningStations.length;
    currentPlanningStations = currentPlanningStations.filter(station => station.id !== stationIdToRemove);

    // If a station was actually removed, re-evaluate stationCounter and update numbers
    if (currentPlanningStations.length < initialLength) {
        stationCounter = currentPlanningStations.length; // Update stationCounter to reflect current count
        updateStationNumbers(); // Re-index displayed station numbers
        savePlanningStationsToLocalStorage(); // Save to local storage after modification
        refreshMap(); // Update map after station removal

        // Hide relevant sections if no planning stations are left
        if (currentPlanningStations.length === 0) {
            $('#submitContainer').hide();
            $('#allocationResults').hide();
            // Show the map placeholder again if no stations at all
            $('#mapid').hide();
            $('#mapPlaceholder').show();
        }
    }
}


// Function to update data for a specific station in the global array
function updateStationData(stationId, field, value) {
    console.log(`[updateStationData] Called for ID: ${stationId}, Field: ${field}, Value: ${value}`);
    const stationIndex = currentPlanningStations.findIndex(s => s.id === stationId);
    if (stationIndex !== -1) {
        // Handle fields that should be strings
        if (['KavachID', 'StationCode', 'stationName'].includes(field)) {
            currentPlanningStations[stationIndex][field] = value;
        }
        // Handle fields that should be numbers (float or integer)
        else if (['latitude', 'longitude', 'safe_radius_km', 'optimum_static_profile_transfer', 'onboard_slots', 'allocated_frequency'].includes(field)) {
            // Use parseFloat for lat/lon/radius, parseInt for others like frequency, slots, etc.
            if (field === 'allocated_frequency' || field === 'optimum_static_profile_transfer' || field === 'onboard_slots') {
                currentPlanningStations[stationIndex][field] = parseInt(value) || 0; // Default to 0 if parsing fails
            } else { // latitude, longitude, safe_radius_km
                currentPlanningStations[stationIndex][field] = parseFloat(value) || 0; // Default to 0 if parsing fails
            }
        }
        // Fallback for any other fields, though current design expects known fields
        else {
            currentPlanningStations[stationIndex][field] = value;
        }

        console.log(`[updateStationData] Updated station data for ${stationId}:`, currentPlanningStations[stationIndex]);

        // Always refresh the map when station data changes
        refreshMap();
        
        // Removed: checkSingleStationConflicts(stationsData[stationIndex]);
        // Conflicts are now handled visually by the map.
    } else {
        console.warn(`[updateStationData] Station with ID ${stationId} not found in currentPlanningStations array.`);
    }
    savePlanningStationsToLocalStorage(); // Save to local storage after any data update
}

// Function to update the displayed station numbers on the cards
function updateStationNumbers() {
    $('#stationContainer .station-card').each(function(index) {
        const cardId = $(this).attr('id');
        const stationId = cardId.replace('card_', '');
        const station = currentPlanningStations.find(s => s.id === stationId);

        if (station) {
            station.station_number = index + 1; // Update data model
            $(this).find('.station-title-text').text(`Station ${index + 1}`); // Update display
            // Update onclick for remove button to reflect new index if needed (though stationId is more robust)
            $(this).find('.btn-close').attr('onclick', `event.stopPropagation(); removeStation('${stationId}')`);
        }
    });
    // Update stationCounter to reflect the total number of cards
    stationCounter = currentPlanningStations.length;
}

// Function to validate all station cards
function validateAllStationCards() {
    let allValid = true;
    let firstInvalidElement = null;
    const cardsWithErrors = new Set(); // To store IDs of cards with errors
    const seenKavachIds = new Map(); // Key: KavachID, Value: stationNumberText of first occurrence

    $('#stationContainer .station-card').each(function(index) {
        const card = $(this);
        const cardId = card.attr('id');
        const stationNumberText = card.find('.station-title-text').text();
        let cardHasErrorForThisIteration = false;

        // Reset all validation states for inputs in this card for the current pass
        card.find('input').removeClass('is-invalid is-valid');
        card.find('.form-text').text('').hide().removeClass('text-success text-warning text-danger');


        // --- Kavach ID Uniqueness and Validity Check ---
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
            if (seenKavachIds.has(kavachIdValue)) { // Duplicate found
                allValid = false;
                cardHasErrorForThisIteration = true;
                kavachIdInput.addClass('is-invalid');
                kavachFeedbackEl.text(`Duplicate ID. Used in ${seenKavachIds.get(kavachIdValue)}.`).addClass('text-danger').show();
                if (!firstInvalidElement) firstInvalidElement = kavachIdInput;

                // Also mark the FIRST instance of the duplicate as an error if not already
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
                    kavachIdInput.addClass('is-valid'); // Valid and unique
                }
            }
        }

        // --- Check other required fields and number range validations ---
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

function finishManualInput() {
    if (!validateAllStationCards()) {
        return; // Stop if validation fails
    }

    if (currentPlanningStations.length > 0) { // Check length of actual data, not just cards
        $('#stationContainer .station-card .collapse').each(function() {
            const collapseElement = this;
            if (collapseElement.classList.contains('show')) { // Collapse if currently open
                bootstrap.Collapse.getOrCreateInstance(collapseElement).hide();
            }
            const headerId = $(collapseElement).attr('aria-labelledby');
            if(headerId) {
                $(`#${headerId}`).attr('aria-expanded', 'false'); // Set to false if collapsing
            }
        });
        $('#addStationBtn').show(); // Always allow adding more
        $('#finishManualInputBtn').text('Collapse All Cards').show(); // Text change
        $('#submitContainer').show(); // Show submit button after validation
    } else {
        alert("Please add at least one station.");
        // Revert button text if no stations
        $('#finishManualInputBtn').text('Finish & Preview Stations'); 
    }
}

// Function to set up listeners for Kavach ID input and autofill logic
function setupKavachIdListener(cardElement, stationId) {
    const kavachIdInput = cardElement.querySelector(`#KavachID_${stationId}`);
    const stationCodeEl = cardElement.querySelector(`#StationCode_${stationId}`);
    const nameEl = cardElement.querySelector(`#stationName_${stationId}`);
    const latEl = cardElement.querySelector(`#Latitude_${stationId}`);
    const lonEl = cardElement.querySelector(`#Longtitude_${stationId}`); // Note: HTML ID is Longtitude, data field is longitude
    const optimumStaticEl = cardElement.querySelector(`#OptimumStatic_${stationId}`);
    const onboardSlotsEl = cardElement.querySelector(`#onboardSlots_${stationId}`);

    const feedbackEl = $(kavachIdInput).closest('.card-body').find('.kavach-id-feedback');
    const suggestionsEl = cardElement.querySelector(`#suggestions_kavach_${stationId}`);

    console.log({kavachIdInput, stationCodeEl, nameEl, latEl, lonEl, feedbackEl, suggestionsEl, stationId});

    if (!kavachIdInput || !suggestionsEl) {
        console.error(`Kavach ID Input or suggestions element not found for ID: ${stationId}`);
        return;
    }

    const autoFilledFields = [nameEl, latEl, lonEl, stationCodeEl]; // Elements that can be auto-filled
    // Add other relevant fields if they can be auto-filled from skavIdLookup
    // For example, if lookupData had optimum_static_profile_transfer or onboard_slots
    // autoFilledFields.push(optimumStaticEl, onboardSlotsEl);


    const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        $(suggestionsEl).hide();
    };

    // Main validation and autofill logic
    const handleKavachIdValidation = (isSelectionEvent = false) => {
        const currentKavachIdValue = kavachIdInput.value.trim();
        const lookupData = skavIdLookup[currentKavachIdValue];
        console.log(`handleKavachIdValidation for ID "${currentKavachIdValue}", Lookup found:`, lookupData);

        autoFilledFields.forEach(el => { if(el) el.dataset.autoFilled = "false"; });
        kavachIdInput.classList.remove('is-invalid', 'is-valid');
        if (feedbackEl && feedbackEl.length) {
            feedbackEl.text('').hide().removeClass('text-success text-warning text-danger');
        }

        let isDuplicate = false;
        if (currentKavachIdValue) {
            // Check for duplicates within currentPlanningStations array (more reliable than DOM)
            const count = currentPlanningStations.filter(s => s.KavachID === currentKavachIdValue && s.id !== stationId).length;
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

            // --- CRITICAL ADDITIONS: Assign values and call updateStationData ---
            // Update KavachID in the data array immediately if valid
            updateStationData(stationId, 'KavachID', currentKavachIdValue);

            if (stationCodeEl) {
                stationCodeEl.value = lookupData.code || '';
                stationCodeEl.dataset.originalValue = stationCodeEl.value;
                stationCodeEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'StationCode', stationCodeEl.value);
                console.log(`[handleKavachIdValidation] Autofilled StationCode: ${stationCodeEl.value}`);
            }
            if (nameEl) {
                nameEl.value = lookupData.name || '';
                nameEl.dataset.originalValue = nameEl.value;
                nameEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'stationName', nameEl.value);
                console.log(`[handleKavachIdValidation] Autofilled StationName: ${nameEl.value}`);
            }
            if (latEl) {
                latEl.value = lookupData.latitude || '';
                latEl.dataset.originalValue = latEl.value;
                latEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'latitude', latEl.value);
                console.log(`[handleKavachIdValidation] Autofilled Latitude: ${latEl.value}`);
            }
            if (lonEl) {
                lonEl.value = lookupData.longitude || '';
                lonEl.dataset.originalValue = lonEl.value;
                lonEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'longitude', lonEl.value); // Use 'longitude' for data field
                console.log(`[handleKavachIdValidation] Autofilled Longitude: ${lonEl.value}`);
            }
            // If lookup data contains optimum_static_profile_transfer or onboard_slots, autofill them too
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


            console.log(`[handleKavachIdValidation] Done with autofill attempts. Map refresh will be triggered by updateStationData for lat/lon.`);

            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID found. Fields auto-filled.').removeClass('text-danger text-warning').addClass('text-success').show();
                setTimeout(() => { if (feedbackEl.hasClass('text-success')) feedbackEl.fadeOut();}, 3000);
            }
        } else if (currentKavachIdValue && isSelectionEvent) {
            kavachIdInput.classList.add('is-invalid');
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID not found. Please verify or enter details manually.').addClass('text-danger').show();
            }
            // Clear autofilled fields if the ID is invalid (user typed, but not found)
            if (stationCodeEl) { stationCodeEl.value = ''; updateStationData(stationId, 'StationCode', ''); }
            if (nameEl) { nameEl.value = ''; updateStationData(stationId, 'stationName', ''); }
            if (latEl) { latEl.value = ''; updateStationData(stationId, 'latitude', ''); }
            if (lonEl) { lonEl.value = ''; updateStationData(stationId, 'longitude', ''); }
            if (optimumStaticEl) { optimumStaticEl.value = ''; updateStationData(stationId, 'optimum_static_profile_transfer', ''); }
            if (onboardSlotsEl) { onboardSlotsEl.value = ''; updateStationData(stationId, 'onboard_slots', ''); }

        } else if (!currentKavachIdValue) { // Input is empty
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('').hide();
            }
            // Clear autofilled fields if the ID is cleared
            if (stationCodeEl) { stationCodeEl.value = ''; updateStationData(stationId, 'StationCode', ''); }
            if (nameEl) { nameEl.value = ''; updateStationData(stationId, 'stationName', ''); }
            if (latEl) { latEl.value = ''; updateStationData(stationId, 'latitude', ''); }
            if (lonEl) { lonEl.value = ''; updateStationData(stationId, 'longitude', ''); }
            if (optimumStaticEl) { optimumStaticEl.value = ''; updateStationData(stationId, 'optimum_static_profile_transfer', ''); }
            if (onboardSlotsEl) { onboardSlotsEl.value = ''; updateStationData(stationId, 'onboard_slots', ''); }
        }
    };

    // Add change listeners for confirmation on auto-filled fields
    autoFilledFields.forEach(el => {
        if (!el) return;
        el.addEventListener('blur', function(event) {
            const targetEl = event.target;
            // Only prompt if it was auto-filled AND value changed from its original auto-filled value
            if (targetEl.dataset.autoFilled === "true" && targetEl.value !== targetEl.dataset.originalValue) {
                const labelText = $(targetEl).prev('label').text() || 'This field';
                if (!confirm(`${labelText} was auto-filled. Are you sure you want to change it to "${targetEl.value}"?`)) {
                    targetEl.value = targetEl.dataset.originalValue;
                } else {
                    targetEl.dataset.originalValue = targetEl.value; // User confirmed the change
                }
            }
            // IMPORTANT: Update the currentPlanningStations array when a user manually blurs an autofilled field.
            const fieldNameFromId = targetEl.id.split('_')[0];
            const dataFieldName = {
                'KavachID': 'KavachID',
                'StationCode': 'StationCode',
                'stationName': 'stationName',
                'Latitude': 'latitude',
                'Longtitude': 'longitude', // Corrected mapping for 'Longtitude' HTML ID
                'radiusSlider': 'safe_radius_km', // For radius slider
                'frequencySlider': 'allocated_frequency', // For frequency slider
                'OptimumStatic': 'optimum_static_profile_transfer',
                'onboardSlots': 'onboard_slots',
            }[fieldNameFromId] || fieldNameFromId.toLowerCase(); // Fallback for other cases

            // Ensure value is correctly parsed if it's a number field
            let parsedValue = targetEl.value;
            if (['latitude', 'longitude', 'safe_radius_km', 'optimum_static_profile_transfer', 'onboard_slots', 'allocated_frequency'].includes(dataFieldName)) {
                 parsedValue = parseFloat(targetEl.value) || 0; // Or parseInt for integer fields
                 if (dataFieldName === 'allocated_frequency' || dataFieldName === 'optimum_static_profile_transfer' || dataFieldName === 'onboard_slots') {
                     parsedValue = parseInt(targetEl.value) || 0;
                 }
            }
            updateStationData(stationId, dataFieldName, parsedValue);
        });
    });

    // Event listener for input changes on Kavach ID field (for suggestions and initial validation)
    kavachIdInput.addEventListener('input', () => {
        const idValue = kavachIdInput.value.trim();
        hideSuggestions();
        kavachIdInput.classList.remove('is-valid');

        if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
            feedbackEl.text('').hide();
        }

        const currentlyUsedIdsInOtherCards = new Set(
            currentPlanningStations
                .filter(s => s.id !== stationId && s.KavachID) // Filter for other stations that have a KavachID
                .map(s => s.KavachID)
        );

        if (idValue.length > 0) {
            const potentialMatches = Object.keys(skavIdLookup).filter(key => key.startsWith(idValue));
            const availableMatches = potentialMatches.filter(match => !currentlyUsedIdsInOtherCards.has(match)); // Don't suggest duplicates

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
                        handleKavachIdValidation(true); // Treat as a selection to trigger autofill
                    });
                    suggestionsEl.appendChild(suggestionItem);
                });
                $(suggestionsEl).show();
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
            handleKavachIdValidation(false); // Kavach ID is cleared, update state
        }

        // Optional: Light, continuous feedback while typing
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

    // Event listener for Kavach ID input blur (final validation)
    kavachIdInput.addEventListener('blur', () => {
        setTimeout(() => { // Small delay to allow click on suggestion to register before hiding
            hideSuggestions();
            if (kavachIdInput.value.trim() !== "") {
                handleKavachIdValidation(true); // Final validation on blur
            } else {
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('').hide();
                }
            }
        }, 150);
    });

    // Keyboard navigation for suggestions
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

    // Hide suggestions if clicked outside the input or suggestions box
    document.addEventListener('click', (e) => {
        if (!kavachIdInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });

    // Event listeners for other fields to update currentPlanningStations
    // The HTML's `oninput` handlers directly call `updateStationData`, which is good.
    // This block is now mostly redundant if `oninput` is directly on HTML,
    // but ensures all values are correctly parsed and updated.
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
            // These event listeners are slightly redundant if `oninput` is directly in HTML,
            // but can act as a safety net or for more complex logic not suitable for inline.
            // Since HTML already has `oninput`, we can ensure `updateStationData` does the parsing.
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


// The new and improved function to update the map with ALL planning stations
async function refreshMap() { // Made async
    showLoadingSpinner("Updating map visualization..."); // Show spinner

    const mapidDiv = document.getElementById('mapid');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    const conflictWarning = document.getElementById('conflictWarning');

    // Filter out stations that don't have valid coordinates
    const planningStationsPayload = currentPlanningStations
        .map(s => ({
            id: s.id, // Include ID for accurate mapping in backend/frontend
            lat: parseFloat(s.latitude),
            lon: parseFloat(s.longitude),
            rad: parseFloat(s.safe_radius_km) || 12.0,
            name: s.stationName || `Station ${s.station_number}`,
            frequency: parseInt(s.allocated_frequency) || 1,
            onboardSlots: parseInt(s.onboard_slots) || 0, // Ensure onboard slots are sent
            type: s.type // Pass the type (planning)
        }))
        .filter(s => !isNaN(s.lat) && !isNaN(s.lon)); // Only send valid coordinates

    if (planningStationsPayload.length === 0) {
        // If no valid stations, hide map and show placeholder
        mapidDiv.innerHTML = ''; // Clear map content
        mapidDiv.style.display = 'none';
        mapPlaceholder.style.display = 'flex'; // Show placeholder (flex for centering)
        conflictWarning.style.display = 'none'; // Hide conflict warning
        hideLoadingSpinner(); // Hide spinner
        console.log("No valid planning stations to display on the map.");
        return; // Exit if no stations
    }

    try {
        const response = await fetch('/api/update_map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planning_stations: planningStationsPayload })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const mapHtml = await response.text();
        
        if (mapHtml.includes('leaflet-container')) {
            mapidDiv.innerHTML = mapHtml;
            mapidDiv.style.display = 'block';
            mapPlaceholder.style.display = 'none';

            // IMPORTANT: Re-initialize Leaflet map interactions after new HTML is injected
            // Use a short timeout to ensure DOM has rendered
            setTimeout(() => {
                const mapInstance = L.DomUtil.get('mapid');
                if (mapInstance && mapInstance._leaflet_id) { // Check if Leaflet has fully initialized the map
                    mymap = mapInstance._leaflet_map; // Assign to global mymap
                    setupMapInteractions(); // Call the specific setup function for Leaflet layers/events
                } else {
                    console.warn("Leaflet map instance not found immediately after HTML injection. Map interactions might be limited.");
                }
            }, 50); // Small delay
        } else {
            console.warn("Received map HTML does not contain 'leaflet-container'. Displaying placeholder.");
            mapidDiv.innerHTML = '';
            mapidDiv.style.display = 'none';
            mapPlaceholder.style.display = 'flex';
        }

        // Check for conflicts by looking at the content of the returned map HTML
        const hasConflicts = mapHtml.includes('CONFLICT') || mapHtml.includes('OVERLAP');
        if (hasConflicts) {
            conflictWarning.style.display = 'block';
        } else {
            conflictWarning.style.display = 'none';
        }

    } catch (error) {
        console.error('Error refreshing map:', error);
        alert('An error occurred while updating the map. Check console for details: ' + error.message);
        mapidDiv.innerHTML = '';
        mapidDiv.style.display = 'none';
        mapPlaceholder.style.display = 'flex';
        conflictWarning.style.display = 'none';
    } finally {
        hideLoadingSpinner(); // Always hide spinner when done or on error
    }
}

// REMOVED: checkSingleStationConflicts as conflicts are now handled by refreshMap's backend call and visual rendering.
// If you need specific textual feedback for individual planning stations, that logic would be implemented
// on the backend and returned as part of the /api/update_map or /api/run_allocation response.


// Function to submit all valid planning station data for configuration generation
function submitData() {
    console.log("[submitData] Starting submission process.");
    if (!validateAllStationCards()) {
        console.log("[submitData] Validation failed. Aborting submission.");
        return;
    }

    // Use currentPlanningStations directly, mapping fields to backend expectation
    const payloadStations = currentPlanningStations.map(s => ({
        KavachID: s.KavachID,
        StationCode: s.StationCode,
        name: s.stationName,
        Latitude: parseFloat(s.latitude) || 0.0,
        Longitude: parseFloat(s.longitude) || 0.0,
        onboardSlots: parseInt(s.onboard_slots, 10) || 0,
        Static: parseInt(s.optimum_static_profile_transfer, 10) || 0, // This seems to be the backend's key for optimum_static_profile_transfer
        safe_radius_km: parseFloat(s.safe_radius_km) || 12.0,
        allocated_frequency: parseInt(s.allocated_frequency, 10) || 4
    }));

    if (payloadStations.length === 0) {
        alert("No stations to submit.");
        console.warn("[submitData] No stations in payload. Aborting.");
        return;
    }

    console.log("[submitData] Submitting Data (payloadStations):", payloadStations);
    showLoadingSpinner('Submitting data to server...'); // Show spinner with message

    fetch("/allocate_slots_endpoint", { // Verify this backend endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadStations)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
            }).catch(() => {
                throw new Error(`Server error: ${response.status} - Unable to parse error response.`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.fileUrl) {
            showLoadingSpinner('Preparing your download...'); // Update spinner message
            checkFileReady(data.fileUrl);
        } else {
            alert(data.message || data.error || "Unknown response from server after submission.");
            hideLoadingSpinner(); // Hide spinner on non-fileUrl response
        }
    })
    .catch(err => {
        alert("Submission Error: " + err.message);
        hideLoadingSpinner(); // Hide spinner on error
    });
}

function checkFileReady(fileUrl) {
    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = 3000;

    showLoadingSpinner(`Preparing file for download. Please wait...`); // Update spinner message

    function poll() {
        fetch(fileUrl, { method: "HEAD" })
            .then(response => {
                if (response.ok && response.status === 200) {
                    showLoadingSpinner('File ready! Starting download...'); // Update spinner message
                    setTimeout(() => {
                        window.location.href = fileUrl; // Trigger download
                        hideLoadingSpinner(); // Hide the overlay here
                        // Reset UI after successful download
                        clearPlanningStations(); // Clear all data and cards
                        showManual(); // Reset to initial view for new input
                    }, 1000);
                } else if (response.status === 404 || attempts >= maxAttempts) {
                    let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                    alert(message + " Please check the server or try again later.");
                    hideLoadingSpinner(); // Hide the overlay on error
                } else {
                    attempts++;
                    showLoadingSpinner(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`); // Update message
                    setTimeout(poll, checkInterval);
                }
            })
            .catch(err => {
                alert("Error checking file readiness: " + err.message);
                hideLoadingSpinner(); // Hide the overlay on network error
            });
    }
    poll();
}

// This function clears all planning stations from the UI and global state
function clearPlanningStations() { // New function to match HTML button onclick
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


// This function is still called 'showManual' but it now just represents showing the main input UI.
function showManual() {
    $('#uploadSection').hide(); // Assuming this section is still managed
    $('#stationContainer').empty().show(); // Clear and show the container for cards

    $('#manualInputActions').show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide(); // Reset text and hide if not needed
    
    $('#submitContainer').hide();
    $('#submitArrowGuide').hide();
    
    stationCounter = 0; // Reset stationCounter (important for correct numbering)
    // No need to call updateStationNumbers directly here, as createStationCard and loadPlanningStationsFromLocalStorage will handle it.
    // If you need an initial empty card when showManual is called, uncomment addNewStation();
    // addNewStation(); // Optional: Add one empty station card on initial load/reset
}

// NEW: Save planning stations to localStorage
function savePlanningStationsToLocalStorage() {
    localStorage.setItem('planningStations', JSON.stringify(currentPlanningStations));
    console.log("Planning stations saved to localStorage.");
}

// NEW: Load planning stations from localStorage
function loadPlanningStationsFromLocalStorage() {
    const storedStations = localStorage.getItem('planningStations');
    if (storedStations) {
        const loaded = JSON.parse(storedStations);
        currentPlanningStations = []; // Clear array before loading to prevent duplicates on re-load
        loaded.forEach(stationData => {
            // Re-create cards and push to currentPlanningStations
            createStationCardFromLoadedData(stationData);
        });
        updateStationNumbers(); // Ensure correct numbering and data.station_number
        console.log("Planning stations loaded from localStorage.");
    } else {
        currentPlanningStations = []; // Initialize empty if nothing stored
        console.log("No planning stations found in localStorage.");
    }
}

// NEW: Helper function to create a station card when loading from stored data
function createStationCardFromLoadedData(stationData) {
    // This is similar to createStationCard but uses existing data and doesn't increment stationCounter directly.
    // We update stationCounter after all cards are loaded.
    const stationId = stationData.id || generateUniqueStationId(); // Ensure ID if missing from old data

    // Push the loaded station data into currentPlanningStations
    // This assumes currentPlanningStations is empty before loadPlanningStationsFromLocalStorage is called.
    // If not, you might need to check for duplicates or manage the array differently.
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
                aria-expanded="true"
                aria-controls="collapse_${stationId}"
                style="cursor: pointer;">
                <span class="station-title-text">Station ${currentPlanningStations.length}</span> <!-- Temp number, updated by updateStationNumbers -->
                <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStation('${stationId}')"></button>
            </div>
            <div class="collapse" id="collapse_${stationId}" aria-labelledby="headerFor_${stationId}">
                <div class="card-body">
                    <label class="form-label">Stationary Kavach ID:</label>
                    <div class="input-wrapper">
                        <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID_${stationId}" placeholder="Enter Kavach ID" oninput="this.value = this.value.replace(/[^0-9]/g, ''); updateStationData('${stationId}', 'KavachID', this.value)" maxlength="10" autocomplete="off" required value="${stationData.KavachID || ''}">
                        <div class="suggestions-box list-group" id="suggestions_kavach_${stationId}"></div>
                    </div>
                    <div class="form-text kavach-id-feedback mb-2"></div>

                    <label class="form-label">Station Code:</label>
                    <input type="text" class="form-control mb-2 station-code-input" id="StationCode_${stationId}" placeholder="Enter Station Code" required oninput="updateStationData('${stationId}', 'StationCode', this.value)" value="${stationData.StationCode || ''}">

                    <label class="form-label">Station Name:</label>
                    <input type="text" class="form-control mb-2 station-name-input" id="stationName_${stationId}" placeholder="Auto-filled or manual entry" required oninput="updateStationData('${stationId}', 'stationName', this.value)" value="${stationData.stationName || ''}">

                    <label class="form-label">Stationary Unit Tower Latitude:</label>
                    <input type="number" step="any" class="form-control mb-2 latitude-input" id="Latitude_${stationId}" placeholder="Auto-filled or manual entry" required max="37.100" min="8.06666667" oninput="updateStationData('${stationId}', 'latitude', this.value)" value="${stationData.latitude || ''}">

                    <label class="form-label">Stationary Unit Tower Longitude:</label>
                    <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude_${stationId}" placeholder="Auto-filled or manual entry" required max="92.100" min="68.06666667" oninput="updateStationData('${stationId}', 'longitude', this.value)" value="${stationData.longitude || ''}">

                    <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                    <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic_${stationId}" min="0" required oninput="updateStationData('${stationId}', 'optimum_static_profile_transfer', this.value)" value="${stationData.optimum_static_profile_transfer || 0}">

                    <label class="form-label">Onboard Slots:</label>
                    <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots_${stationId}" min="0" required oninput="updateStationData('${stationId}', 'onboard_slots', this.value)" value="${stationData.onboard_slots || 0}">
                    
                    <div class="mb-2">
                        <label class="form-label">Radius (km): <span id="radius-value-${stationId}">${stationData.safe_radius_km}</span></label>
                        <input type="range"
                            class="form-range"
                            id="radiusSlider_${stationId}"
                            min="7"
                            max="25"
                            step="1"
                            value="${stationData.safe_radius_km}"
                            oninput="document.getElementById('radius-value-${stationId}').textContent = this.value; updateStationData('${stationId}', 'safe_radius_km', parseFloat(this.value))">
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
                            oninput="document.getElementById('frequency-value-${stationId}').textContent = this.value; updateStationData('${stationId}', 'allocated_frequency', parseInt(this.value))">
                    </div>
                </div>
            </div>
        </div>
    `;
    container.appendChild(cardWrapper);
    setupKavachIdListener(cardWrapper, stationId);
}

// NEW: Setup Leaflet map interactions after the map HTML is injected
function setupMapInteractions() {
    const mapElement = document.getElementById('mapid');
    if (!mapElement || !mapElement._leaflet_id) { // Check if Leaflet has fully initialized the map within the div
        console.error("Leaflet map instance is not available or not fully initialized in #mapid. Cannot set up interactions.");
        return;
    }
    mymap = mapElement._leaflet_map; // Assign the initialized map instance to the global variable

    // Clear existing FeatureGroups if they somehow persist, to avoid duplicates
    if (coverageGroupLayer && mymap.hasLayer(coverageGroupLayer)) {
        mymap.removeLayer(coverageGroupLayer);
    }
    if (overlapHighlightGroupLayer && mymap.hasLayer(overlapHighlightGroupLayer)) {
        mymap.removeLayer(overlapHighlightGroupLayer);
    }

    // Re-initialize Leaflet FeatureGroups
    coverageGroupLayer = L.featureGroup().addTo(mymap);
    overlapHighlightGroupLayer = L.featureGroup().addTo(mymap);

    // Remove existing LayerControl to prevent duplicates when map is refreshed
    mymap.eachControl(function(control) {
        if (control instanceof L.Control.Layers) {
            mymap.removeControl(control);
        }
    });

    // Assume allStationData and overlappingPairData are globally available from Flask's HTML injection
    // And assume approved_group, planning_group, conflict_group are also globally exposed by Folium.
    // If you encounter 'undefined' errors for these groups, you might need to adjust your Flask code
    // to ensure they are properly exposed to the global JS scope (e.g., via `m.get_root().script.add_child`).

    L.control.layers(mymap._targets.baseLayers, { // Use Folium's base layers if available
        'Approved Stations': window.approved_group, // Assuming global from Folium
        'Planning Stations': window.planning_group, // Assuming global from Folium
        'Potential Conflicts': window.conflict_group, // Assuming global from Folium
        'Overlap Highlights (Freq Conflict)': overlapHighlightGroupLayer,
        'Coverage Areas': coverageGroupLayer
    }, { collapsed: true }).addTo(mymap);

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
    mymap.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            let stationId = null;
            const popupContent = layer.getPopup() ? layer.getPopup().getContent() : '';

            // Attempt to extract station ID. Prioritize direct ID if Flask can embed it.
            // Otherwise, try to match by name (assuming station names are unique enough).
            let idMatch = popupContent.match(/ID:\s*([^<]+)/);
            if (idMatch) {
                stationId = idMatch[1].trim();
            } else {
                let nameMatch = popupContent.match(/<b>(.*?)<\/b>/);
                if (nameMatch) {
                    const stationName = nameMatch[1].trim();
                    // Check planning stations first (as they are in currentPlanningStations)
                    const planningStation = currentPlanningStations.find(s => s.stationName === stationName);
                    if (planningStation) {
                        stationId = planningStation.id;
                    } else if (typeof allStationData !== 'undefined') {
                        // Then check the full allStationData from backend (includes approved)
                        const approvedStation = allStationData.find(s => s.type === 'approved' && s.name === stationName);
                        if (approvedStation) stationId = approvedStation.id;
                    }
                }
            }
            
            if (stationId) {
                layer.on('click', function() {
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

// NEW: Function to draw all coverage circles
function drawCircles(stationDataArray) {
    if (!coverageGroupLayer) {
        console.error("coverageGroupLayer not initialized. Cannot draw circles.");
        return;
    }
    coverageGroupLayer.clearLayers();
    coverageCircles = {};

    for (const s of stationDataArray) {
        const radiusInMeters = parseFloat(s.radius) * 1000; // Ensure radius is number and convert to meters
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

// NEW: Function to highlight a specific circle by ID
function highlightCircle(stationId) {
    if (activeCoverageCircle && activeCoverageCircle.defaultStyle) {
        activeCoverageCircle.setStyle(activeCoverageCircle.defaultStyle);
    }

    const circleToHighlight = coverageCircles[stationId];
    if (circleToHighlight) {
        circleToHighlight.setStyle(HIGHLIGHT_STYLE);
        activeCoverageCircle = circleToHighlight;
        // Optionally pan to the highlighted circle
        mymap.panTo(circleToHighlight.getLatLng());
    }
}

// NEW: Function to draw overlap highlights (PolyLines)
function drawOverlapHighlights(overlapDataArray) {
    if (!overlapHighlightGroupLayer) {
        console.error("overlapHighlightGroupLayer not initialized. Cannot draw overlap highlights.");
        return;
    }
    overlapHighlightGroupLayer.clearLayers();

    for (const overlap of overlapDataArray) {
        L.polyline(overlap.line_coords, {
            color: 'darkred',
            weight: 5,
            opacity: 0.9,
            dashArray: '5, 10'
        })
        .bindPopup(overlap.popup_content || `FREQ ${overlap.frequency} OVERLAP: ${overlap.s1_name} & ${overlap.s2_name} - Dist: ${overlap.distance.toFixed(2)}km (Req: ${overlap.min_required.toFixed(2)}km)`)
        .addTo(overlapHighlightGroupLayer);
    }
}


// Function to run the allocation process
async function runAllocation() {
    showLoadingSpinner("Running allocation and conflict resolution...");
    try {
        if (currentPlanningStations.length === 0) {
            alert("Please add at least one planning station before running allocation.");
            hideLoadingSpinner();
            return;
        }

        const response = await fetch('/api/run_allocation', { // Verify this backend endpoint
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

        // Re-render map after allocation attempt to reflect any backend status changes
        refreshMap();

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
function submitData() {
    console.log("[submitData] Starting submission process.");
    if (!validateAllStationCards()) {
        console.log("[submitData] Validation failed. Aborting submission.");
        return;
    }

    // Use currentPlanningStations directly, mapping fields to backend expectation
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

    fetch("/allocate_slots_endpoint", { // Verify this backend endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadStations)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
            }).catch(() => {
                throw new Error(`Server error: ${response.status} - Unable to parse error response.`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.fileUrl) {
            showLoadingSpinner('Preparing your download...');
            checkFileReady(data.fileUrl);
        } else {
            alert(data.message || data.error || "Unknown response from server after submission.");
            hideLoadingSpinner();
        }
    })
    .catch(err => {
        alert("Submission Error: " + err.message);
        hideLoadingSpinner();
    });
}

function checkFileReady(fileUrl) {
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
                        clearPlanningStations(); // Clear all data and cards
                        showManual(); // Reset to initial view for new input
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

// This function is still called 'showManual' but it now just represents showing the main input UI.
function showManual() {
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();

    $('#manualInputActions').show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide();
    
    $('#submitContainer').hide();
    $('#submitArrowGuide').hide();
    
    // Clear the current planning stations and reset counter
    currentPlanningStations = []; 
    stationCounter = 0; 
    savePlanningStationsToLocalStorage(); // Ensure localStorage is cleared too
    document.getElementById('allocationResults').style.display = 'none'; // Hide results

    // No need to call updateStationNumbers directly here, as createStationCard and loadPlanningStationsFromLocalStorage will handle it.
    // If you want an empty card to appear immediately on page load/reset, uncomment the line below:
    // addNewStation(); 
}

// --- Local Storage Management ---
function savePlanningStationsToLocalStorage() {
    localStorage.setItem('planningStations', JSON.stringify(currentPlanningStations));
    console.log("Planning stations saved to localStorage.");
}

function loadPlanningStationsFromLocalStorage() {
    const storedStations = localStorage.getItem('planningStations');
    if (storedStations) {
        const loaded = JSON.parse(storedStations);
        currentPlanningStations = []; // Clear array before loading to prevent duplicates on re-load
        loaded.forEach(stationData => {
            createStationCardFromLoadedData(stationData);
        });
        updateStationNumbers(); // Ensure correct numbering and data.station_number
        console.log("Planning stations loaded from localStorage.");
    } else {
        currentPlanningStations = []; // Initialize empty if nothing stored
        console.log("No planning stations found in localStorage.");
    }
}

// --- DOM Ready / Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('floatingBrand').classList.add('show');
    loadSkavIdLookup(() => {
        console.log("S-Kavach ID lookup loaded. Initializing UI.");
        loadPlanningStationsFromLocalStorage(); // Load any saved stations first
        showManual(); // Set initial view and prepare UI
        // Initial map refresh. This will now display loaded stations or an empty map.
        refreshMap(); 
    });
});