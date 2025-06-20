// --- Global State ---
let stationCounter = 0; // Renamed from manualStationCount
let skavIdLookup = {};
let stationsData = []; // Global array to hold all planning station data

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
    return `station_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Changed prefix
}

// Renamed from initiateAddStationSequence
function addNewStation() {
    if (stationCounter > 0) { // Using stationCounter for validation
        // Validate the current last station card IF it exists
        const prevStationId = stationsData[stationsData.length - 1]?.id;
        if (prevStationId) {
            const prevStationCard = $(`#card_${prevStationId}`); // Updated ID prefix
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

        // Collapse the previously added card's body
        const prevStationIdToCollapse = stationsData[stationsData.length - 1]?.id;
        if (prevStationIdToCollapse) {
            const prevCollapseElement = document.getElementById(`collapse_${prevStationIdToCollapse}`); // Updated ID prefix
            const prevHeaderElement = $(`#headerFor_${prevStationIdToCollapse}`); // Updated ID prefix
            if (prevCollapseElement && prevCollapseElement.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(prevCollapseElement).hide();
            }
            if (prevHeaderElement) {
                prevHeaderElement.attr('aria-expanded', 'false');
            }
        }
    }
    createStationCard(); 
}

function createStationCard() {
    stationCounter++; // Renamed from manualStationCount
    const stationId = generateUniqueStationId(); // Generate a unique ID for the new station
    const cardWrapperId = `card_${stationId}`; // Generic prefix for card wrapper ID

    // Initialize new station data
    const newStation = {
        id: stationId,
        station_number: stationCounter, // For display purposes
        KavachID: '',
        StationCode: '',
        stationName: '',
        latitude: '',
        longitude: '',
        optimum_static_profile_transfer: 0,
        onboard_slots: 0,
        safe_radius_km: 12.0, // Default value from your HTML
        allocated_frequency: 4, // Default value from your HTML
    };
    stationsData.push(newStation); // Add the new station to the global array

    const container = document.getElementById("stationContainer");
    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = cardWrapperId;

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
                <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStationCard('${cardWrapperId}', '${stationId}')"></button>
            </div>
            <div class="collapse show" id="collapse_${stationId}" aria-labelledby="headerFor_${stationId}">
                <div class="card-body">
                    <label class="form-label">Stationary Kavach ID:</label>
                    <div class="input-wrapper">
                        <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID_${stationId}" placeholder="Enter Kavach ID" oninput="this.value = this.value.replace(/[^0-9]/g, ''); updateStationData('${stationId}', 'KavachID', this.value)" maxlength="10" autocomplete="off">
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
                    
                    <div class="col-6">
                        <label class="form-label">Safe Radius (km): <span id="radius-value-${stationId}">${newStation.safe_radius_km}</span></label>
                        <input type="range"
                            class="form-range mb-2"
                            id="radiusSlider_${stationId}"
                            min="7"
                            max="25"
                            step="1"
                            value="${newStation.safe_radius_km}"
                            oninput="document.getElementById('radius-value-${stationId}').textContent = this.value; updateStationData('${stationId}', 'safe_radius_km', this.value)">
                    </div>

                    <div class="col-6">
                        <label class="form-label">Frequency: <span id="frequency-value-${stationId}">${newStation.allocated_frequency}</span></label>
                        <input type="range"
                            class="form-range mb-2"
                            id="frequencySlider_${stationId}"
                            min="1"
                            max="7"
                            step="1"
                            value="${newStation.allocated_frequency}"
                            oninput="document.getElementById('frequency-value-${stationId}').textContent = this.value; updateStationData('${stationId}', 'allocated_frequency', this.value)">
                    </div>
                </div>
            </div>
        </div>
    `;
    container.appendChild(cardWrapper);
    setupKavachIdListener(cardWrapper, stationId); // Keep this if it's setting up other Kavach ID specific logic

    updateStationNumbers(); // Re-index displayed station numbers if needed
    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $(`#KavachID_${stationId}`).focus(); // Updated ID prefix

    if ($('#stationContainer .station-card').length > 0) {
        $('#finishManualInputBtn').show();
    }
    $('#submitContainer').hide();
}

function updateStationData(stationId, field, value) {
    console.log(`[updateStationData] Called for ID: ${stationId}, Field: ${field}, Value: ${value}`);
    const stationIndex = stationsData.findIndex(s => s.id === stationId);
    if (stationIndex !== -1) {
        // Handle fields that should be strings
        if (['KavachID', 'StationCode', 'stationName'].includes(field)) {
            stationsData[stationIndex][field] = value; // Assign directly as a string
        }
        // Handle fields that should be numbers (float or integer)
        else if (['latitude', 'longitude', 'safe_radius_km', 'optimum_static_profile_transfer', 'onboard_slots', 'allocated_frequency'].includes(field)) {
            // Use parseFloat for lat/lon/radius, parseInt for frequency
            if (field === 'allocated_frequency') {
                stationsData[stationIndex][field] = parseInt(value) || 1; // Default frequency to 1
            } else {
                stationsData[stationIndex][field] = parseFloat(value) || 0; // Default to 0 if parsing fails
            }
        }
        // Fallback for any other fields, though current design expects known fields
        else {
            stationsData[stationIndex][field] = value;
        }

        console.log(`[updateStationData] Updated station data for ${stationId}:`, stationsData[stationIndex]);

        // Always refresh the map when station data changes
        // The map update will now handle drawing all conflicts visually
        refreshMap(); 
        
        // Optionally, still show immediate single-station text conflict if needed
        // checkSingleStationConflicts(stationsData[stationIndex]);
        // Consider if you need both. The map is now the source of truth for visual conflicts.
        // If checkSingleStationConflicts is too redundant or causes flickering, remove this call.
    } else {
        console.warn(`[updateStationData] Station with ID ${stationId} not found in stationsData array.`);
    }
}

// Function to remove a station card and update stationsData
function removeStationCard(cardWrapperId, stationId) {
    $(`#${cardWrapperId}`).remove();
    stationsData = stationsData.filter(s => s.id !== stationId);
    updateStationNumbers(); // Update displayed numbers
    refreshMap(); // Refresh map after removal
    if (stationsData.length === 0) {
        $('#finishManualInputBtn').hide();
    }
}

// Function to update the displayed station numbers after add/remove
function updateStationNumbers() {
    $('#stationContainer .station-card').each(function(index) {
        $(this).find('.station-title-text').text(`Station ${index + 1}`);
    });
}

function validateAllStationCards() {
    let allValid = true;
    let firstInvalidElement = null;
    const cardsWithErrors = new Set(); // To store IDs of cards with errors
    const seenKavachIds = new Map(); // Key: KavachID, Value: stationNumberText of first occurrence

    $('#stationContainer .station-card').each(function(index) {
        const card = $(this);
        const cardId = card.attr('id'); // Get card ID
        const stationNumberText = card.find('.station-title-text').text();
        let cardHasErrorForThisIteration = false; // Tracks errors found in this specific validation pass for THIS card

        // --- Kavach ID Uniqueness and Validity Check ---
        const kavachIdInput = card.find('.kavach-id-input');
        const kavachIdValue = kavachIdInput.val().trim();
        const kavachFeedbackEl = card.find('.kavach-id-feedback');

        kavachIdInput.removeClass('is-invalid'); // Reset for this validation pass

        if (!kavachIdValue && kavachIdInput.prop('required')) { // Check if empty AND required
            allValid = false;
            cardHasErrorForThisIteration = true;
            kavachIdInput.addClass('is-invalid');
            if (!kavachFeedbackEl.hasClass('text-danger')) { // Don't overwrite more specific errors
                kavachFeedbackEl.text('Kavach ID is required.').addClass('text-danger').show();
            }
            if (!firstInvalidElement) firstInvalidElement = kavachIdInput;
        } else if (kavachIdValue) {
            if (seenKavachIds.has(kavachIdValue)) { // Duplicate found
                allValid = false;
                cardHasErrorForThisIteration = true;
                kavachIdInput.addClass('is-invalid');
                kavachFeedbackEl.text(`Duplicate ID. Used in ${seenKavachIds.get(kavachIdValue)}.`).addClass('text-danger').show();
                if (!firstInvalidElement) firstInvalidElement = kavachIdInput;

                // Also mark the FIRST instance of the duplicate as an error if not already
                const firstInstanceCardId = $(`#stationContainer .station-card .kavach-id-input`).filter(function() { return $(this).val().trim() === kavachIdValue; }).first().closest('.station-card').attr('id');
                if (firstInstanceCardId && firstInstanceCardId !== cardId) {
                    const firstInstanceCard = $(`#${firstInstanceCardId}`);
                    firstInstanceCard.find('.kavach-id-input').addClass('is-invalid');
                    firstInstanceCard.find('.kavach-id-feedback').text('Duplicate ID. This ID is used again.').addClass('text-danger').show();
                    cardsWithErrors.add(firstInstanceCardId); // Ensure original duplicate card is also expanded
                }

            } else {
                seenKavachIds.set(kavachIdValue, stationNumberText);
                // If not a duplicate, check if it's in skavIdLookup (if live validation didn't already mark it)
                if (!skavIdLookup[kavachIdValue]) {
                    allValid = false; // Or just a warning? For now, treat as invalid if not in master.
                    cardHasErrorForThisIteration = true;
                    kavachIdInput.addClass('is-invalid');
                    if (!kavachFeedbackEl.hasClass('text-danger')) {
                        kavachFeedbackEl.text('Kavach ID not found in master list.').addClass('text-danger').show();
                    }
                    if (!firstInvalidElement) firstInvalidElement = kavachIdInput;
                } else {
                    // It's unique and found in lookup - mark valid if no other issues
                    // kavachIdInput.addClass('is-valid'); // Bootstrap's 'is-valid' can be used
                }
            }
        }

        // --- Check other required fields (excluding Kavach ID as it's handled above) ---
        card.find('input[required]').not('.kavach-id-input').each(function() {
            const input = $(this);
            input.removeClass('is-invalid'); // Clear previous 'is-invalid' for these fields for this pass

            if (!input.val().trim()) {
                allValid = false;
                cardHasErrorForThisIteration = true; // Mark that this card has an error
                input.addClass('is-invalid');
                // Find and display error for this specific field if a feedback div exists or create one
                const fieldLabel = input.prev('label').text() || input.attr('placeholder') || 'Field';
                if (!firstInvalidElement) {
                    firstInvalidElement = input;
                }
                console.warn(`Validation Error: "${fieldLabel}" in ${stationNumberText} is empty.`);
            }
        });

        if (cardHasErrorForThisIteration && cardId) {
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
                    const headerId = collapseElement.attr('aria-labelledby');
                    if (headerId) $(`#${headerId}`).attr('aria-expanded', 'true');
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

    if ($('#stationContainer .station-card').length > 0) {
        $('#stationContainer .station-card .collapse').each(function() {
            const collapseElement = this;
            if (!collapseElement.classList.contains('show')) {
                new bootstrap.Collapse(collapseElement, { toggle: false }).show();
            }
            const headerId = $(collapseElement).attr('aria-labelledby');
            if(headerId) {
                $(`#${headerId}`).attr('aria-expanded', 'true');
            }
        });
        $('#addStationBtn').show();
        $('#finishManualInputBtn').text('Expand All Cards').show();
        $('#submitContainer').show();
    } else {
        alert("Please add at least one station.");
        $('#finishManualInputBtn').text('Finish & Preview Stations');
    }
}

function setupKavachIdListener(cardElement, stationId) {
    const kavachIdInput = cardElement.querySelector(`#KavachID_${stationId}`);
    const stationCodeEl = cardElement.querySelector(`#StationCode_${stationId}`);
    const nameEl = cardElement.querySelector(`#stationName_${stationId}`);
    const latEl = cardElement.querySelector(`#Latitude_${stationId}`);
    const lonEl = cardElement.querySelector(`#Longtitude_${stationId}`);
    // Using jQuery for feedbackEl based on your provided code; ensure it's correctly finding the element.
    const feedbackEl = $(kavachIdInput).closest('.card-body').find('.kavach-id-feedback');
    const suggestionsEl = cardElement.querySelector(`#suggestions_kavach_${stationId}`);

    // This log confirms elements are found
    console.log({kavachIdInput, stationCodeEl, nameEl, latEl, lonEl, feedbackEl, suggestionsEl, stationId});

    if (!kavachIdInput || !suggestionsEl) {
        console.error(`Kavach ID Input or suggestions element not found for ID: ${stationId}`);
        return;
    }

    // Array of elements that can be auto-filled, used for iterating
    const autoFilledFields = [nameEl, latEl, lonEl, stationCodeEl];

    // Helper function to hide suggestions
    const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        $(suggestionsEl).hide();
    };

    // Main validation and autofill logic, now an inner function
    const handleKavachIdValidation = (isSelectionEvent = false) => {
        const currentKavachIdValue = kavachIdInput.value.trim();
        const lookupData = skavIdLookup[currentKavachIdValue];
        console.log(`handleKavachIdValidation for ID "${currentKavachIdValue}", Lookup found:`, lookupData);

        // Reset autoFilled status for all relevant fields at the start of validation
        autoFilledFields.forEach(el => { if(el) el.dataset.autoFilled = "false"; });
        kavachIdInput.classList.remove('is-invalid', 'is-valid');
        if (feedbackEl && feedbackEl.length) {
            feedbackEl.text('').hide().removeClass('text-success text-warning text-danger');
        }

        // 1. Check for Duplicates (highest priority feedback)
        let isDuplicate = false;
        if (currentKavachIdValue) {
            $('#stationContainer .station-card').each(function() {
                const otherCardInput = $(this).find('.kavach-id-input')[0];
                // Check if it's a different card's input and has the same value
                if (otherCardInput && otherCardInput !== kavachIdInput && $(otherCardInput).val().trim() === currentKavachIdValue) {
                    isDuplicate = true;
                    return false; // Break .each()
                }
            });
        }

        if (isDuplicate) {
            kavachIdInput.classList.add('is-invalid');
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('This Kavach ID is already used. Please use a unique ID.').addClass('text-danger').show();
            }
            // Do not proceed to auto-fill if it's a duplicate
        } else if (lookupData) {
            // 2. Valid Kavach ID Found (and not a duplicate) - Auto-fill
            kavachIdInput.classList.add('is-valid');

            // --- CRITICAL ADDITIONS: Assign values, call updateStationData, and log autofill ---
            // Always update KavachID in the array when it's confirmed valid
            updateStationData(stationId, 'KavachID', currentKavachIdValue);

            if (stationCodeEl) {
                stationCodeEl.value = lookupData.code || '';
                stationCodeEl.dataset.originalValue = stationCodeEl.value; // Store for change detection
                stationCodeEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'StationCode', stationCodeEl.value); // <--- ADDED: Update the data array
                console.log(`[handleKavachIdValidation] Autofilled StationCode: ${stationCodeEl.value}`); // <--- ADDED: Confirm log
            }
            if (nameEl) {
                nameEl.value = lookupData.name || '';
                nameEl.dataset.originalValue = nameEl.value;
                nameEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'stationName', nameEl.value); // <--- ADDED: Update the data array
                console.log(`[handleKavachIdValidation] Autofilled StationName: ${nameEl.value}`); // <--- ADDED: Confirm log
            }
            if (latEl) {
                latEl.value = lookupData.latitude || '';
                latEl.dataset.originalValue = latEl.value;
                latEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'latitude', latEl.value); // <--- ADDED: Update the data array
                console.log(`[handleKavachIdValidation] Autofilled Latitude: ${latEl.value}`); // <--- ADDED: Confirm log
            }
            if (lonEl) {
                lonEl.value = lookupData.longitude || '';
                lonEl.dataset.originalValue = lonEl.value;
                lonEl.dataset.autoFilled = "true";
                updateStationData(stationId, 'longitude', lonEl.value); // <--- ADDED: Update the data array
                console.log(`[handleKavachIdValidation] Autofilled Longitude: ${lonEl.value}`); // <--- ADDED: Confirm log
            }

            console.log(`[handleKavachIdValidation] Done with autofill attempts. Map refresh will be triggered by updateStationData for lat/lon.`);

            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID found. Fields auto-filled.').removeClass('text-danger text-warning').addClass('text-success').show();
                setTimeout(() => { if (feedbackEl.hasClass('text-success')) feedbackEl.fadeOut();}, 3000);
            }
        } else if (currentKavachIdValue && isSelectionEvent) { // No lookup found, but it's a selection event (e.g. blur after typing a full ID)
            // 3. Kavach ID entered but not found in lookup (and not duplicate, and it's a blur/selection event)
            kavachIdInput.classList.add('is-invalid');
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID not found. Please verify or enter details manually.').addClass('text-danger').show();
            }
            // Clear autofilled fields if the ID is invalid
            if (stationCodeEl) { stationCodeEl.value = ''; updateStationData(stationId, 'StationCode', ''); }
            if (nameEl) { nameEl.value = ''; updateStationData(stationId, 'stationName', ''); }
            if (latEl) { latEl.value = ''; updateStationData(stationId, 'latitude', ''); }
            if (lonEl) { lonEl.value = ''; updateStationData(stationId, 'longitude', ''); }

        } else if (!currentKavachIdValue) { // Input is empty
            // 4. Kavach ID input is empty on blur or input (initial state or cleared)
            if (feedbackEl && feedbackEl.length) {
                 feedbackEl.text('').hide(); // Clear feedback if not an active error
            }
            // Clear autofilled fields if the ID is cleared
            if (stationCodeEl) { stationCodeEl.value = ''; updateStationData(stationId, 'StationCode', ''); }
            if (nameEl) { nameEl.value = ''; updateStationData(stationId, 'stationName', ''); }
            if (latEl) { latEl.value = ''; updateStationData(stationId, 'latitude', ''); }
            if (lonEl) { lonEl.value = ''; updateStationData(stationId, 'longitude', ''); }
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
                    // targetEl.dataset.autoFilled = "false"; // Optional: mark as manually confirmed if user overrides
                }
            }
            // IMPORTANT: Update the stationsData array when a user manually blurs an autofilled field.
            // This ensures manual changes are committed to the data model.
            // Dynamically determine the field name from element ID
            const fieldNameFromId = targetEl.id.split('_')[0]; // e.g., "StationCode", "Latitude"
            // Convert to the exact field name used in stationsData if necessary (e.g., "Latitude" -> "latitude")
            // Assuming your updateStationData can handle these directly or you have a mapping.
            const dataFieldName = {
                'KavachID': 'KavachID', // If KavachID is also in autoFilledFields, but it's usually handled separately
                'StationCode': 'StationCode',
                'stationName': 'stationName',
                'Latitude': 'latitude',
                'Longtitude': 'longitude', // Note: your HTML ID is 'Longtitude', but data field is 'longitude'
                'safeRadiusKm': 'safe_radius_km', // Example for other fields if they were in autoFilledFields
                'OptimumStatic': 'optimum_static_profile_transfer',
                'onboardSlots': 'onboard_slots',
                'allocatedFrequency': 'allocated_frequency'
            }[fieldNameFromId] || fieldNameFromId.toLowerCase(); // Fallback to lowercase for common cases

            updateStationData(stationId, dataFieldName, targetEl.value);
        });
    });

    // Event listener for input changes on Kavach ID field (for suggestions and initial validation)
    kavachIdInput.addEventListener('input', () => {
        const idValue = kavachIdInput.value.trim();
        hideSuggestions(); // Clear previous suggestions
        kavachIdInput.classList.remove('is-valid'); // Remove valid status while typing

        if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) { // Clear non-error feedback on new input
            feedbackEl.text('').hide();
        }

        // Get Kavach IDs currently used in OTHER cards to avoid suggesting duplicates
        const currentlyUsedIdsInOtherCards = new Set();
        $('#stationContainer .station-card').each(function() {
            const otherCardInput = $(this).find('.kavach-id-input')[0];
            if (otherCardInput && otherCardInput !== kavachIdInput) { // Exclude self
                const usedId = $(otherCardInput).val().trim();
                if (usedId) {
                    currentlyUsedIdsInOtherCards.add(usedId);
                }
            }
        });

        if (idValue.length > 0) {
            const potentialMatches = Object.keys(skavIdLookup).filter(key => key.startsWith(idValue));
            // Only suggest IDs that are not currently used by other stations
            const availableMatches = potentialMatches.filter(match => !currentlyUsedIdsInOtherCards.has(match) || match === idValue); // Allow current value if it's being edited

            if (availableMatches.length > 0) {
                availableMatches.slice(0, 10).forEach(match => { // Limit to 10 suggestions
                    const suggestionItem = document.createElement('a');
                    suggestionItem.href = '#';
                    suggestionItem.classList.add('list-group-item', 'list-group-item-action', 'py-1', 'px-2');
                    suggestionItem.textContent = `${match} (${skavIdLookup[match].name || 'N/A'})`;
                    suggestionItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        kavachIdInput.value = match; // Set the input value to the selected suggestion
                        hideSuggestions(); // Hide suggestions after selection
                        handleKavachIdValidation(true); // Treat as a selection/confirmation event to trigger autofill
                        // kavachIdInput.focus(); // Removed: This can sometimes cause unexpected blur/focus loops
                    });
                    suggestionsEl.appendChild(suggestionItem);
                });
                $(suggestionsEl).show(); // Show the suggestions box
            } else {
                hideSuggestions(); // No matches, hide suggestions
            }
        } else { // Input is empty
            hideSuggestions();
            handleKavachIdValidation(false); // Kavach ID is cleared, update state (e.g., clear feedback)
        }

        // Optional: Light, continuous feedback while typing
        if (idValue.length > 0) { // Only show feedback if something is typed
            if (skavIdLookup[idValue]) {
                if (feedbackEl && feedbackEl.length) {
                    if (!feedbackEl.hasClass('text-success')) { // Avoid flickering if already success
                        feedbackEl.text('Kavach ID found.').addClass('text-success').removeClass('text-warning text-danger').show();
                        setTimeout(() => { if(feedbackEl.hasClass('text-success')) feedbackEl.fadeOut(); }, 2000);
                    }
                }
            } else if (idValue.length === parseInt(kavachIdInput.maxLength, 10)) { // If max length reached and not found
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('Kavach ID may not exist in master list.').addClass('text-warning').removeClass('text-success text-danger').show();
                }
            } else if (currentlyUsedIdsInOtherCards.has(idValue)) { // If it's a duplicate
                 if (feedbackEl && feedbackEl.length) {
                     feedbackEl.text('This Kavach ID is already used.').addClass('text-danger').removeClass('text-warning text-success').show();
                 }
            } else { // Clear feedback if valid partial input or not found yet
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('').hide();
                }
            }
        } else { // If input is empty
             if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('').hide();
             }
        }
    });


    // Event listener for Kavach ID input blur (final validation)
    kavachIdInput.addEventListener('blur', () => {
        setTimeout(() => { // Small delay to allow click on suggestion to register before hiding
            hideSuggestions(); // Always hide suggestions on blur
            // Perform full validation/feedback only if input is not empty
            if (kavachIdInput.value.trim() !== "") {
                handleKavachIdValidation(true); // Final validation on blur, treating as a selection event
            } else {
                // If input is empty on blur, ensure feedback is cleared if not an active error
                if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                    feedbackEl.text('').hide();
                }
            }
        }, 150); // 150ms delay allows click on suggestion to register
    });

    // Keyboard navigation for suggestions
    kavachIdInput.addEventListener('keydown', (e) => {
        const items = suggestionsEl.querySelectorAll('.list-group-item-action');
        if (!$(suggestionsEl).is(":visible") || items.length === 0) return; // Only if suggestions are visible

        let currentFocus = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('active')) currentFocus = index;
        });

        if (e.key === 'ArrowDown') {
            e.preventDefault(); // Prevent cursor movement in input
            items[currentFocus]?.classList.remove('active');
            currentFocus = (currentFocus + 1) % items.length;
            items[currentFocus]?.classList.add('active');
            items[currentFocus]?.scrollIntoView({ block: 'nearest' }); // Scroll to focused item
        } else if (e.key === 'ArrowUp') {
            e.preventDefault(); // Prevent cursor movement in input
            items[currentFocus]?.classList.remove('active');
            currentFocus = (currentFocus - 1 + items.length) % items.length;
            items[currentFocus]?.classList.add('active');
            items[currentFocus]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && currentFocus > -1) {
            e.preventDefault();
            items[currentFocus]?.click(); // Simulate click on the active suggestion
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideSuggestions(); // Hide suggestions on Escape
        }
    });

    // Hide suggestions if clicked outside the input or suggestions box
    document.addEventListener('click', (e) => {
        if (!kavachIdInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });

    // Attach event listeners to other fields to update stationsData (for manual inputs)
    const fieldsToUpdateOnInput = [
        { selector: `#StationCode_${stationId}`, fieldName: 'StationCode' },
        { selector: `#stationName_${stationId}`, fieldName: 'stationName' },
        { selector: `#Latitude_${stationId}`, fieldName: 'latitude' },
        { selector: `#Longtitude_${stationId}`, fieldName: 'longitude' },
        { selector: `#safeRadiusKm_${stationId}`, fieldName: 'safe_radius_km' },
        { selector: `#OptimumStatic_${stationId}`, fieldName: 'optimum_static_profile_transfer' },
        { selector: `#onboardSlots_${stationId}`, fieldName: 'onboard_slots' },
        { selector: `#allocatedFrequency_${stationId}`, fieldName: 'allocated_frequency' }
    ];

    fieldsToUpdateOnInput.forEach(field => {
        const element = cardElement.querySelector(field.selector);
        if (element) {
            element.addEventListener('input', () => {
                // This updates the stationsData array as the user types manually
                updateStationData(stationId, field.fieldName, element.value);
            });
        }
    });

    // Special handling for the stationType dropdown
    const stationTypeEl = cardElement.querySelector(`#stationType_${stationId}`);
    if (stationTypeEl) {
        stationTypeEl.addEventListener('change', () => {
            updateStationData(stationId, 'station_type', stationTypeEl.value);
        });
    }
}

// The new and improved function to update the map with ALL planning stations
function refreshMap() {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = '<div class="map-placeholder"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

    // Filter out stations that don't have coordinates yet
    const planningStationsPayload = stationsData
        .map(s => ({
            lat: parseFloat(s.latitude),
            lon: parseFloat(s.longitude),
            rad: parseFloat(s.safe_radius_km) || 12.0, // Default to 12 as per your HTML
            name: s.stationName || `Station ${s.station_number}`, // Use stationName or number for map label
            frequency: parseInt(s.allocated_frequency) || 1 // Send the frequency, default to 1 if invalid/missing
        }))
        .filter(s => !isNaN(s.lat) && !isNaN(s.lon)); // Only send valid coordinates

    fetch('/api/update_map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planning_stations: planningStationsPayload })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then(mapHtml => {
        mapContainer.innerHTML = `<iframe srcdoc="${mapHtml.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; border: none;"></iframe>`;
    })
    .catch(error => {
        console.error('Error loading map:', error);
        mapContainer.innerHTML = '<div class="map-placeholder"><p class="text-danger">Error loading map</p></div>';
    });
}
// Function to check conflicts for a SINGLE station. This is more efficient for immediate feedback.
// IMPORTANT: This function still uses the single station approach.
// The primary visual conflict detection will now happen in refreshMap -> update_map backend.
function checkSingleStationConflicts(stationData) {
    if (!stationData.latitude || !stationData.longitude || !stationData.allocated_frequency) {
        document.getElementById('conflictWarning').style.display = 'none';
        return;
    }

    const payload = {
        lat: parseFloat(stationData.latitude),
        lon: parseFloat(stationData.longitude),
        rad: parseFloat(stationData.safe_radius_km) || 12.0, // Default to 12
        frequency: parseInt(stationData.allocated_frequency) || 1 // *** IMPORTANT: Send frequency here too! ***
    };

    fetch('/api/check_conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        const warningDiv = document.getElementById('conflictWarning');
        if (result.hasConflict) {
            warningDiv.style.display = 'block';
            warningDiv.innerHTML = `
                <strong>⚠️ Coverage Conflict!</strong>
                <p class="mb-0">This station's coverage overlaps with approved station(s): ${result.conflictingStations.join(', ')}</p>
            `;
        } else {
            warningDiv.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Error checking conflicts:', error);
        document.getElementById('conflictWarning').style.display = 'none';
    });
}

function submitData() {
    console.log("[submitData] Starting submission process.");
    if (!validateAllStationCards()) {
        console.log("[submitData] Validation failed. Aborting submission.");
        return;
    }

    // Use the global stationsData array directly, as it's kept up-to-date
    // The structure needs to match the backend expectation
    const payloadStations = stationsData.map(s => ({
        KavachID: s.KavachID,
        StationCode: s.StationCode,
        name: s.stationName,
        Latitude: parseFloat(s.latitude) || 0.0, // Ensure float conversion
        Longitude: parseFloat(s.longitude) || 0.0, // Ensure float conversion
        onboardSlots: parseInt(s.onboard_slots, 10) || 0, // Ensure integer conversion
        Static: parseInt(s.optimum_static_profile_transfer, 10) || 0, // Ensure integer conversion
        safe_radius_km: parseFloat(s.safe_radius_km) || 12.0, // Include this if needed by backend
        allocated_frequency: parseInt(s.allocated_frequency, 10) || 4 // Include this if needed by backend
    }));

    if (payloadStations.length === 0) {
        alert("No stations to submit.");
        console.warn("[submitData] No stations in payload. Aborting.");
        return;
    }

    console.log("[submitData] Submitting Data (payloadStations):", payloadStations);
    $('#loadingMessage').text('Submitting data to server...');
    $('#loadingSpinnerOverlay').show();

    fetch("/allocate_slots_endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadStations) // Submit the processed global data
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
            $('#loadingMessage').text('Preparing your download...');
            checkFileReady(data.fileUrl); 
        } else {
            alert(data.message || data.error || "Unknown response from server after submission.");
            $('#loadingSpinnerOverlay').hide();
        }
    })
    .catch(err => {
        alert("Submission Error: " + err.message);
        $('#loadingSpinnerOverlay').hide();
    });
}

function checkFileReady(fileUrl) {
    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = 3000;

    $('#loadingMessage').text(`Preparing file for download. Please wait...`);

    function poll() {
        fetch(fileUrl, { method: "HEAD" })
            .then(response => {
                if (response.ok && response.status === 200) {
                    $('#loadingMessage').text('File ready! Starting download...');
                    setTimeout(() => {
                        window.location.href = fileUrl; // Trigger download
                        $('#loadingSpinnerOverlay').hide(); // Hide the overlay here
                        $('#stationContainer').empty();
                        $('#submitContainer').hide();
                        showManual(); // Reset to initial view
                    }, 1000);
                } else if (response.status === 404 || attempts >= maxAttempts) {
                    let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                    alert(message + " Please check the server or try again later.");
                    $('#loadingSpinnerOverlay').hide(); // Hide the overlay on error
                } else {
                    attempts++;
                    $('#loadingMessage').text(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`);
                    setTimeout(poll, checkInterval);
                }
            })
            .catch(err => {
                alert("Error checking file readiness: " + err.message);
                $('#loadingSpinnerOverlay').hide(); // Hide the overlay on network error
            });
    }
    poll();
}


// This function is still called 'showManual' but it now just represents showing the main input UI. It can be renamed to something like 'initializeInputUI' if desired, but for now, we'll keep it as is.
function showManual() {
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();

    $('#manualInputActions').show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide();

    $('#submitContainer').hide();
    $('#submitArrowGuide').hide();
    stationCounter = 0; // Reset stationCounter
    updateStationNumbers();
}

// --- DOM Ready / Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    refreshMap(); // Call refreshMap with no stations initially
    loadSkavIdLookup(() => {
        console.log("S-Kavach ID lookup loaded. Initializing UI.");
        showManual(); // Set initial view
    });
});