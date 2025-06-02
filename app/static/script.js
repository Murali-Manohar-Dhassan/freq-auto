// --- Global State ---
let manualStationCount = 0;
let skavIdLookup = {};

// --- JSON Loading ---
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

// --- DOM Ready / Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    loadSkavIdLookup(() => {
        console.log("S-Kavach ID lookup loaded. Initializing UI.");
        showManual(); // Set initial view
    });

    // Example: If you have other general modals like 'skavModal' (not for station type)
    // const skavModalElement = document.getElementById('skavModal');
    // if (skavModalElement) {
    //     // skavModalInstance = new bootstrap.Modal(skavModalElement); // Define skavModalInstance globally if needed
    //     // $('#skavModalIsSkavBtn').on('click', _handleModalConfirmSkav);
    //     // ... other listeners for this general modal
    // }
});


// --- UI Control Functions ---
function showManual() {
    // $('#manualSection').show(); // This line is no longer needed if the div is removed
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();

    $('#manualInputActions').show(); // Show the new container for action buttons
    $('#addStationBtn').show();      // This button is inside #manualInputActions
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide();

    $('#submitContainer').hide();
    $('#submitArrowGuide').hide(); // Ensure arrow is hidden initially
    manualStationCount = 0;
    updateStationNumbers();
}

function showUpload() {
    $('#uploadSection').show();
    $('#manualSection').hide();
    $('#stationContainer').empty().show();
    $('#submitContainer').hide();
    $('#uploadBtn').show();
    updateStationNumbers();
}

// --- New Station Addition Workflow ---
function initiateAddStationSequence() {
    // Validate the current last station card IF it exists
    if (manualStationCount > 0) {
        const prevStationCardSuffix = `manual_${manualStationCount}`;
        const prevStationCardId = `stationCard_${prevStationCardSuffix}`;
        const prevStationCard = $(`#${prevStationCardId}`);

        if (prevStationCard.length) {
            let cardIsValid = true;
            let firstInvalidElementInCard = null;
            // Find all required inputs within this specific card
            prevStationCard.find('input[required]').each(function() {
                const input = $(this);
                input.removeClass('is-invalid'); // Clear previous validation styling

                if (!input.val().trim()) {
                    cardIsValid = false;
                    input.addClass('is-invalid');
                    if (!firstInvalidElementInCard) {
                        firstInvalidElementInCard = input;
                    }
                    // console.warn for debugging if needed
                }
            });

            if (!cardIsValid) {
                alert(`Please fill in all required fields for ${prevStationCard.find('.station-title-text').text()} before adding a new station. The first empty required field has been focused.`);
                
                const collapseElement = prevStationCard.find('.collapse');
                if (collapseElement.length && !collapseElement.hasClass('show')) {
                    // Use Bootstrap's static method to get or create instance to prevent issues
                    bootstrap.Collapse.getOrCreateInstance(collapseElement[0]).show();
                    const headerId = collapseElement.attr('aria-labelledby');
                    if(headerId) $(`#${headerId}`).attr('aria-expanded', 'true');
                }
                if (firstInvalidElementInCard) {
                    firstInvalidElementInCard.focus();
                }
                return; // Stop the sequence
            }
        }

        // Collapse the previously added card's body if it exists and is expanded (original logic)
        const prevCollapseElement = document.getElementById(`collapse_${prevStationCardSuffix}`);
        const prevHeaderElement = $(`#headerFor_${prevStationCardSuffix}`);

        if (prevCollapseElement && prevCollapseElement.classList.contains('show')) {
            // Use Bootstrap's static method
            bootstrap.Collapse.getOrCreateInstance(prevCollapseElement).hide();
        }
        if (prevHeaderElement) {
            prevHeaderElement.attr('aria-expanded', 'false');
        }
    }
    _proceedToAddActualStationField(); // Proceed if current card is valid or no cards yet
}

function _proceedToAddActualStationField() {
    manualStationCount++;
    const container = document.getElementById("stationContainer");
    const stationIdSuffix = `manual_${manualStationCount}`;
    const cardWrapperId = `stationCard_${stationIdSuffix}`;

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = cardWrapperId;

    cardWrapper.innerHTML = `
        <div class="card shadow p-0 h-100">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                 id="headerFor_${stationIdSuffix}"
                 data-bs-toggle="collapse"
                 data-bs-target="#collapse_${stationIdSuffix}"
                 aria-expanded="true"
                 aria-controls="collapse_${stationIdSuffix}"
                 style="cursor: pointer;">
                <span class="station-title-text">Station ${manualStationCount}</span>
                <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStationCard('${cardWrapperId}')"></button>
            </div>
            <div class="collapse show" id="collapse_${stationIdSuffix}" aria-labelledby="headerFor_${stationIdSuffix}">
                <div class="card-body">
                    <label class="form-label">Stationary Kavach ID:</label>
                    <div class="input-wrapper">
                        <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" placeholder="Enter Kavach ID" oninput="this.value = this.value.replace(/[^0-9]/g, '')" maxlength="10" autocomplete="off">
                        <div class="suggestions-box list-group" id="suggestions_kavach_${stationIdSuffix}"></div>
                    </div>
                    <div class="form-text kavach-id-feedback mb-2"></div>

                    <label class="form-label">Station Code:</label>
                    <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" placeholder="Enter Station Code" required>

                    <label class="form-label">Station Name:</label>
                    <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" placeholder="Auto-filled or manual entry" required>

                    <label class="form-label">Stationary Unit Tower Latitude:</label>
                    <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}" placeholder="Auto-filled or manual entry" required>

                    <label class="form-label">Stationary Unit Tower Longitude:</label>
                    <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}" placeholder="Auto-filled or manual entry" required>

                    <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                    <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" required>

                    <label class="form-label">Onboard Slots:</label>
                    <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" required>
                </div>
            </div>
        </div>
    `;
    container.appendChild(cardWrapper);
    setupKavachIdListener(cardWrapper, stationIdSuffix);

    updateStationNumbers();
    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $(`#KavachID${stationIdSuffix}`).focus(); // Focus on the Kavach ID of the new card

    if ($('#stationContainer .station-card').length > 0) {
        $('#finishManualInputBtn').show();
    }
    $('#submitContainer').hide();
}

function removeStationCard(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        const collapseId = card.querySelector('.collapse')?.id;
        if (collapseId) {
            const collapseElement = document.getElementById(collapseId);
            if (collapseElement) {
                const collapseInstance = bootstrap.Collapse.getInstance(collapseElement);
                if (collapseInstance) {
                    collapseInstance.dispose();
                }
            }
        }
        card.remove();
        updateStationNumbers(); // Renumber stations
        if ($('#stationContainer .station-card').length === 0) {
            $('#finishManualInputBtn').hide();
            $('#submitContainer').hide();
            manualStationCount = 0;
        }
    }
}

function updateStationNumbers() {
    let visibleStationIndex = 0;
    $('#stationContainer .station-card').each(function() {
        visibleStationIndex++;
        $(this).find('.station-title-text').text(`Station ${visibleStationIndex}`);
    });
     // If all cards are removed, reset manualStationCount.
    // The re-indexing handles dynamic numbering, but manualStationCount tracks additions.
    // It's reset in showManual() and removeStationCard if count is 0.
    // For accurate suffix generation, manualStationCount should reflect highest suffix number used.
    // However, re-indexing on remove might make manualStationCount less reliable for new card suffixes if we allow arbitrary deletes and re-indexing to set it.
    // Current model: manualStationCount only increments. Suffixes are stable. Card titles re-index visually.
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
        let cardHasErrorForThisIteration  = false; // Tracks errors found in this specific validation pass for THIS card

        // --- Kavach ID Uniqueness and Validity Check ---
        const kavachIdInput = card.find('.kavach-id-input');
        const kavachIdValue  = kavachIdInput.val().trim();
        const kavachFeedbackEl = card.find('.kavach-id-feedback');

        // Clear previous 'is-invalid' from this function's pass for Kavach ID, but respect live validation's state if possible
        // For simplicity, let's ensure it's re-evaluated for emptiness and duplication here.
        kavachIdInput.removeClass('is-invalid'); // Reset for this validation pass
        // Do not clear text-danger from feedbackEl if it was set by live validation for duplicates/not found
        // kavachFeedbackEl.text('').hide().removeClass('text-danger text-warning text-success');

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

        if (cardHasErrorForThisIteration  && cardId) {
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

function setupKavachIdListener(cardElement, stationIdSuffix) {
    const kavachIdInput = cardElement.querySelector(`#KavachID${stationIdSuffix}`);
    const stationCodeEl = cardElement.querySelector(`#StationCode${stationIdSuffix}`);
    const nameEl = cardElement.querySelector(`#stationName${stationIdSuffix}`);
    const latEl = cardElement.querySelector(`#Lattitude${stationIdSuffix}`);
    const lonEl = cardElement.querySelector(`#Longtitude${stationIdSuffix}`);
    const feedbackEl = $(kavachIdInput).closest('.card-body').find('.kavach-id-feedback');
    const suggestionsEl = cardElement.querySelector(`#suggestions_kavach_${stationIdSuffix}`);

    // For debugging, ensure elements are found:
    // console.log({kavachIdInput, stationCodeEl, nameEl, latEl, lonEl, feedbackEl, suggestionsEl, stationIdSuffix});

    if (!kavachIdInput || !suggestionsEl) {
        console.error(`Kavach ID Input or suggestions element not found for suffix: ${stationIdSuffix}`);
        return;
    }

    const autoFilledFields = [nameEl, latEl, lonEl, stationCodeEl];

    const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        $(suggestionsEl).hide();
    };

    const handleKavachIdValidation = (isSelectionEvent = false) => { // Renamed isBlurEvent for clarity
        const currentKavachIdValue  = kavachIdInput.value.trim();
        const lookupData  = skavIdLookup[currentKavachIdValue ];
        // For debugging:
        // console.log(`handleKavachIdValidation for ID "${kavachId}", Lookup found:`, lookup);

        autoFilledFields.forEach(el => { if(el) el.dataset.autoFilled = "false"; }); // Reset auto-filled state
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
            if (stationCodeEl) {
                stationCodeEl.value = lookupData.code || ''; // Uses specific stationCode from JSON
                stationCodeEl.dataset.originalValue = stationCodeEl.value;
                stationCodeEl.dataset.autoFilled = "true";
            }
            if (nameEl) {
                nameEl.value = lookupData.name || '';
                nameEl.dataset.originalValue = nameEl.value;
                nameEl.dataset.autoFilled = "true";
            }
            if (latEl) {
                latEl.value = lookupData.latitude || '';
                latEl.dataset.originalValue = latEl.value;
                latEl.dataset.autoFilled = "true";
            }
            if (lonEl) {
                lonEl.value = lookupData.longitude || '';
                lonEl.dataset.originalValue = lonEl.value;
                lonEl.dataset.autoFilled = "true";
            }

            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID found. Fields auto-filled.').removeClass('text-danger text-warning').addClass('text-success').show();
                setTimeout(() => { if (feedbackEl.hasClass('text-success')) feedbackEl.fadeOut();}, 3000);
            }
        } else if (currentKavachIdValue && isSelectionEvent) {
            // 3. Kavach ID entered but not found in lookup (and not duplicate, and it's a blur/selection event)
            kavachIdInput.classList.add('is-invalid');
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID not found. Please verify or enter details manually.').addClass('text-danger').show();
            }
        } else if (currentKavachIdValue && isSelectionEvent) { // No lookup found
            // 4. Kavach ID is required, empty, and blurred (let global validation handle exact message for empty required)
            // Clear fields ONLY IF they were previously auto-filled AND the Kavach ID input is now empty OR it's a blur/selection event
            kavachIdInput.classList.add('is-invalid');
             if (feedbackEl && feedbackEl.length) { // Optional: specific feedback for empty required Kavach ID
                 feedbackEl.text('Kavach ID is required.').addClass('text-danger').show();
             }
        } else if (!currentKavachIdValue) {
            // 5. Kavach ID input is empty (and not a required blur event) - clear feedback
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('').hide();
            }
        }
    };
    
    // Add change listeners for confirmation on auto-filled fields (original logic is good)
    autoFilledFields.forEach(el => {
        if (!el) return;
        el.addEventListener('blur', function(event) {
            const targetEl = event.target;
            if (targetEl.dataset.autoFilled === "true" && targetEl.value !== targetEl.dataset.originalValue) {
                const labelText = $(targetEl).prev('label').text() || 'This field';
                if (!confirm(`${labelText} was auto-filled. Are you sure you want to change it to "${targetEl.value}"?`)) {
                    targetEl.value = targetEl.dataset.originalValue;
                } else {
                    targetEl.dataset.originalValue = targetEl.value; // User confirmed the change
                    // targetEl.dataset.autoFilled = "false"; // Optional: mark as manually confirmed
                }
            }
        });
    });

    kavachIdInput.addEventListener('input', () => {
        const idValue = kavachIdInput.value.trim();
        suggestionsEl.innerHTML = ''; // Clear previous suggestions
        kavachIdInput.classList.remove('is-valid'); // Remove valid status while typing

        if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) { // Clear non-error feedback on new input
             feedbackEl.text('').hide(); // Clear non-error feedback on new input
        }

        // Get Kavach IDs currently used in OTHER cards
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
            const potentialMatches  = Object.keys(skavIdLookup).filter(key => key.startsWith(idValue));
            const availableMatches = potentialMatches.filter(match => !currentlyUsedIdsInOtherCards.has(match) || match === idValue); // Allow current value if it's being edited
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
                        handleKavachIdValidation(true); // Treat as a selection/confirmation event
                        kavachIdInput.focus(); // TRY COMMENTING THIS OUT if clicks don't register fields
                    });
                    suggestionsEl.appendChild(suggestionItem);
                });
                $(suggestionsEl).show();
            } else {
                hideSuggestions();
            }
        } else { // Input is empty
            hideSuggestions();
            handleKavachIdValidation(false); // Kavach ID is cleared, update state (e.g. clear feedback)
        }

        // Light, continuous feedback (optional, handleKavachIdValidation on blur is more definitive)
        if (idValue.length === parseInt(kavachIdInput.maxLength, 10) && !skavIdLookup[idValue] && !currentlyUsedIdsInOtherCards.has(idValue)) {
             if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) { // Only show warning if not already an error
                 feedbackEl.text('Kavach ID may not exist in master list.').addClass('text-warning').removeClass('text-success text-danger').show();
             }
        } else if (skavIdLookup[idValue]) {
             if (feedbackEl && feedbackEl.length) { // ID is valid and found
                if (!feedbackEl.hasClass('text-success')) { // Avoid flickering if already success
                    feedbackEl.text('Kavach ID found.').addClass('text-success').removeClass('text-warning text-danger').show();
                    setTimeout(() => { if(feedbackEl.hasClass('text-success')) feedbackEl.fadeOut(); }, 2000);
                }
             }
        }
        // No "else hide" here for warning, it should persist until blur or correction
    });

    kavachIdInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSuggestions(); // Always hide suggestions on blur after a delay
            // Perform full validation/feedback only if input is not empty or was not just cleared.
            if (kavachIdInput.value.trim() !== "") {
                 handleKavachIdValidation(true); // Final validation on blur
            } else {
                 // If input is empty on blur, ensure feedback is cleared if not an error
                 if (feedbackEl && feedbackEl.length && !feedbackEl.hasClass('text-danger')) {
                     feedbackEl.text('').hide();
                 }
            }
        }, 150); // 150ms delay allows click on suggestion to register
    });

    // Keyboard navigation (original logic is good)
    kavachIdInput.addEventListener('keydown', (e) => {
        const items = suggestionsEl.querySelectorAll('.list-group-item-action');
        if (!$(suggestionsEl).is(":visible") || items.length === 0) return; // Check if suggestions are visible

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
            items[currentFocus]?.click(); // Simulate click on active suggestion
        } else if (e.key === 'Escape') {
            e.preventDefault(); // Prevent other escape key actions
            hideSuggestions();
        }
    });

    // Hide suggestions if clicked outside (original logic is good)
    document.addEventListener('click', (e) => {
        if (!kavachIdInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });
}

function submitData() {
    if (!validateAllStationCards()) { // Validate before submitting
        return;
    }

    const stationsData = [];
    $('#stationContainer .station-card').each(function() {
        const card = $(this);
        const cardId = card.attr('id');
        const stationIdSuffixFromCard = cardId.replace('stationCard_', ''); // e.g. "manual_1"

        // Helper function to get numerical value, defaulting to 0 if parsing fails or empty
        const getIntValue = (selector) => {
            const val = card.find(selector).val();
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? 0 : parsed; // Return 0 if empty or not a number
        };
        const getFloatValue = (selector) => {
            const val = card.find(selector).val();
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0.0 : parsed; // Return 0.0 if empty or not a number
        };

        const station = {
            KavachID: card.find(`#KavachID${stationIdSuffixFromCard}`).val(),
            StationCode: card.find(`#StationCode${stationIdSuffixFromCard}`).val(),
            name: card.find(`#stationName${stationIdSuffixFromCard}`).val(),
            Lattitude: getFloatValue(`#Lattitude${stationIdSuffixFromCard}`), // Convert to float
            Longitude: getFloatValue(`#Longtitude${stationIdSuffixFromCard}`), // Convert to float
            onboardSlots: getIntValue(`#onboardSlots${stationIdSuffixFromCard}`), // Convert to integer
            Static: getIntValue(`#OptimumStatic${stationIdSuffixFromCard}`)     // Convert to integer
            // isAdjacentSkav: false, // This flag is likely not needed if backend is simplified
        };
        stationsData.push(station);
    });

    if (stationsData.length === 0) {
        alert("No stations to submit.");
        return;
    }

    console.log("Submitting Data (with numbers):", stationsData);
    $('#loadingMessage').text('Submitting data to server...');
    $('#loadingSpinnerOverlay').show(); // THEN show the overlay

    fetch("/allocate_slots_endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stationsData)
    })
    .then(response => {
        if (!response.ok) { // Check for non-2xx responses
            return response.json().then(errData => { // Try to parse error response
                throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
            }).catch(() => { // If parsing error response fails
                throw new Error(`Server error: ${response.status} - Unable to parse error response.`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.fileUrl) {
            // Assuming checkFileReady will handle further UI updates,
            // including potentially updating #loadingMessage and eventually hiding the spinner.
            // If checkFileReady is quick and just triggers a download, you might hide the spinner here
            // or just before window.location.href in checkFileReady.
            $('#loadingMessage').text('Preparing your download...'); // Update message
            checkFileReady(data.fileUrl);
            // IMPORTANT: Your checkFileReady function should hide #loadingSpinnerOverlay
            // once the file is ready/downloaded or if an error occurs during that stage.
            // Example: if checkFileReady directly triggers download:
            window.location.href = data.fileUrl;
            setTimeout(() => $('#loadingSpinnerOverlay').hide(), 2000); // Hide after a short delay
        } else {
            alert(data.message || data.error || "Unknown response from server after submission.");
            $('#loadingSpinnerOverlay').hide(); // Hide on error or unexpected response
        }
    })
    .catch(err => {
        alert("Submission Error: " + err.message);
        $('#loadingSpinnerOverlay').hide(); // Hide on network error or exception
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
                        //window.location.href = fileUrl; // Trigger download
                        $('#loadingSpinner').hide();
                        $('#stationContainer').empty();
                        $('#submitContainer').hide();
                        showManual(); // Reset to initial view
                    }, 1000);
                } else if (response.status === 404 || attempts >= maxAttempts) {
                    let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                    alert(message + " Please check the server or try again later.");
                    $('#loadingSpinner').hide();
                } else {
                    attempts++;
                    $('#loadingMessage').text(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`);
                    setTimeout(poll, checkInterval);
                }
            })
            .catch(err => {
                alert("Error checking file readiness: " + err.message);
                $('#loadingSpinner').hide();
            });
    }
    poll();
}

// --- (Keep your existing Global State, JSON Loading, DOM Ready, UI Control,
// ---  initiateAddStationSequence, _proceedToAddActualStationField, removeStationCard,
// ---  updateStationNumbers, validateAllStationCards, finishManualInput,
// ---  setupKavachIdListener, submitData, checkFileReady functions as previously refined) ---

// Ensure showUpload is defined if you have a button for it
function showUpload() {
    $('#uploadSection').show();
    $('#manualSection').hide();
    $('#stationContainer').empty().hide(); // Hide container initially for upload view
    $('#submitContainer').hide();
    $('#finishManualInputBtn').hide(); // Hide finish button from manual mode
    $('#addStationBtn').hide(); // Hide add station button from manual mode
    // Clear file input if needed
    const fileInput = document.getElementById("excelFile");
    if (fileInput) {
        fileInput.value = ""; // Reset file input
    }
    // updateStationNumbers(); // Not needed here as container is empty
}


function uploadExcel() {
    $('#loadingSpinner').show();
    $('#loadingMessage').text('Uploading and processing Excel file...');
    const fileInput = document.getElementById("excelFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an Excel file.");
        $('#loadingSpinner').hide();
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload_excel", { // Ensure this is your correct Flask endpoint for Excel upload
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            // Try to get error message from JSON response, then fall back to status text
            return response.json()
                .catch(() => null) // If response is not JSON or empty
                .then(errData => {
                    const errorMessage = errData ? (errData.error || errData.message) : response.statusText;
                    throw new Error(errorMessage || `Server error: ${response.status}`);
                });
        }
        return response.json();
    })
    .then(result => {
        $('#loadingSpinner').hide();
        if (result.error) {
            alert("Error processing Excel: " + result.error);
            return;
        }
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
            alert("No valid data found in Excel or the format is incorrect.");
            return;
        }
        populateFieldsFromExcel(result.data);
        $('#manualSection').hide(); // Hide manual input section
        $('#uploadSection').hide(); // Hide upload section after processing
        $('#stationContainer').show(); // Show the container with populated cards
        $('#submitContainer').show(); // Show the submit button area
        $('#finishManualInputBtn').text('Review Excel Data & Submit').show(); // Or a more appropriate text
        $('#addStationBtn').hide(); // Typically hide "Add manual station" when in Excel review mode
    })
    .catch(err => {
        alert("Failed to upload or process Excel file. " + err.message);
        $('#loadingSpinner').hide();
    });
}

function populateFieldsFromExcel(stationDataArray) {
    const container = document.getElementById("stationContainer");
    container.innerHTML = ""; // Clear previous entries
    // manualStationCount = 0; // Not strictly needed here if Excel cards use 'excel_' prefix and manual mode resets its own count.

    stationDataArray.forEach((station, index) => {
        const excelStationIndex = index + 1;
        const stationIdSuffix = `excel_${excelStationIndex}`; // Distinct suffix for Excel items
        const cardWrapperId = `stationCard_${stationIdSuffix}`;

        const cardWrapper = document.createElement("div");
        cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
        cardWrapper.id = cardWrapperId;

        // Normalize keys from Excel data (handle different possible capitalizations/spacings)
        // Provide default empty strings or 0 for numbers if data might be missing
        const sKavachID = String(station["Stationary Kavach ID"] || station["KavachID"] || station["kavachid"] || '');
        const sName = String(station["Station Name"] || station["station name"] || station["StationName"] || station["name"] || '');
        const sCode = String(station["Station Code"] || station["station code"] || station["StationCode"] || '');
        const sLat = String(station["Stationary Unit Tower Latitude"] || station["Lattitude"] || station["latitude"] || ''); // Typo Lattitude might be in excel
        const sLon = String(station["Stationary Unit Tower Longitude"] || station["Longitude"] || station["longitude"] || '');
        const sStatic = String(station["Static"] || station["Optimum no. of Simultaneous Exclusive Static Profile Transfer"] || '0');
        const sOnboard = String(station["Onboard Slots"] || station["onboardSlots"] || station["onboardslots"] || '0');

        cardWrapper.innerHTML = `
            <div class="card shadow p-0 h-100">
                <div class="card-header bg-info text-white d-flex justify-content-between align-items-center"
                     id="headerFor_${stationIdSuffix}"
                     data-bs-toggle="collapse"
                     data-bs-target="#collapse_${stationIdSuffix}"
                     aria-expanded="true"
                     aria-controls="collapse_${stationIdSuffix}"
                     style="cursor: pointer;">
                    <span class="station-title-text">Station ${excelStationIndex} (Excel)</span>
                    <button type="button" class="btn-close btn-close-white" aria-label="Close" onclick="event.stopPropagation(); removeStationCard('${cardWrapperId}')"></button>
                </div>
                <div class="collapse show" id="collapse_${stationIdSuffix}" aria-labelledby="headerFor_${stationIdSuffix}">
                    <div class="card-body">
                        <label class="form-label">Stationary Kavach ID:</label>
                        <div class="input-wrapper">
                             <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" placeholder="Excel Value" value="${sKavachID}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" maxlength="10" autocomplete="off">
                             <div class="suggestions-box list-group" id="suggestions_kavach_${stationIdSuffix}"></div>
                        </div>
                        <div class="form-text kavach-id-feedback mb-2"></div>

                        <label class="form-label">Station Code:</label>
                        <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" placeholder="Excel Value" value="${sCode}" required>

                        <label class="form-label">Station Name:</label>
                        <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" value="${sName}" placeholder="Excel Value" required>

                        <label class="form-label">Stationary Unit Tower Latitude:</label>
                        <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}" value="${sLat}" placeholder="Excel Value" required>

                        <label class="form-label">Stationary Unit Tower Longitude:</label>
                        <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}" value="${sLon}" placeholder="Excel Value" required>

                        <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                        <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" value="${sStatic}" required>

                        <label class="form-label">Onboard Slots:</label>
                        <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" value="${sOnboard}" required>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(cardWrapper);

        // Setup listener for Kavach ID. This will also attach blur listeners for confirmation.
        // For Excel data, the initial values are considered "original" and "auto-filled" for this purpose.
        setupKavachIdListener(cardWrapper, stationIdSuffix);

        // Manually mark fields as "auto-filled" from Excel and set their original values
        // so that the confirmation logic in setupKavachIdListener works if user edits them.
        const kavachIdEl = cardWrapper.querySelector(`#KavachID${stationIdSuffix}`);
        const stationCodeElPop = cardWrapper.querySelector(`#StationCode${stationIdSuffix}`);
        const nameElPop = cardWrapper.querySelector(`#stationName${stationIdSuffix}`);
        const latElPop = cardWrapper.querySelector(`#Lattitude${stationIdSuffix}`);
        const lonElPop = cardWrapper.querySelector(`#Longtitude${stationIdSuffix}`);

        // We assume values from Excel are definitive, like an auto-fill.
        if (kavachIdEl) { kavachIdEl.dataset.originalValue = sKavachID; kavachIdEl.dataset.autoFilled = "true"; }
        if (stationCodeElPop) { stationCodeElPop.dataset.originalValue = sCode; stationCodeElPop.dataset.autoFilled = "true"; }
        if (nameElPop) { nameElPop.dataset.originalValue = sName; nameElPop.dataset.autoFilled = "true"; }
        if (latElPop) { latElPop.dataset.originalValue = sLat; latElPop.dataset.autoFilled = "true"; }
        if (lonElPop) { lonElPop.dataset.originalValue = sLon; lonElPop.dataset.autoFilled = "true"; }
    });

    if (stationDataArray.length > 0) {
        $('#submitContainer').show(); // Redundant? Already shown in uploadExcel.
    } else {
        $('#submitContainer').hide();
        alert("No valid station data to populate from Excel."); // Should have been caught earlier.
    }
    updateStationNumbers(); // Update visual numbering for Excel cards
}