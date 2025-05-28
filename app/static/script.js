// Counter for manually added stations to ensure unique IDs
let manualStationCount = 0;
let stationLookup = {}; // Will be loaded from JSON
let skavModalInstance; // Needs to be accessible globally or passed around
let currentPotentialSkavCard = null; // Card that might become S-Kav
let currentPotentialSkavCodeInput = null; // Its code input

// --- JSON Loading ---
function loadStationLookup(callback) {
    // Make sure this path is correct based on your Flask static folder setup
    fetch('/static/stationLookup.json') 
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            stationLookup = data;
            console.log("Station lookup data loaded successfully."); // Debug message
            if (callback) callback();
        })
        .catch(err => {
            console.error("Failed to load station lookup data:", err); // Debug message
            alert("Failed to load station lookup data: " + err.message + "\nPlease ensure 'stationLookup.json' exists in your 'static' folder and is valid JSON.");
        });
}

// --- DOM Ready / Initialization ---
document.addEventListener('DOMContentLoaded', function () {
    loadStationLookup(() => {
        // --- ADDED: Initialize Modal and Attach Listeners HERE ---
        const modalElement = document.getElementById('skavModal');
        if (modalElement) {
            skavModalInstance = new bootstrap.Modal(modalElement);
            
            // Attach listeners to modal buttons
            const isSkavBtn = document.getElementById('skavModalIsSkavBtn');
            const fillNowBtn = document.getElementById('skavModalFillNowBtn');
            const cancelAddBtn = document.getElementById('skavModalCancelAddBtn');

            if (isSkavBtn) isSkavBtn.addEventListener('click', _handleModalConfirmSkav);
            if (fillNowBtn) fillNowBtn.addEventListener('click', _handleModalFillNow);
            if (cancelAddBtn) cancelAddBtn.addEventListener('click', _handleModalCancelAdd);

            console.log("Modal and listeners initialized."); // Debug message
        } else {
            console.error("S-Kav Modal element not found!");
        }
        
        // Show the initial view
        showManual();
        // --- END ADDED ---
    });
});


// --- UI Control Functions (No Changes Needed) ---
function showManual() {
    $('#manualSection').show();
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide(); // Hide initially
    $('#submitContainer').hide();
    manualStationCount = 0;
    updateStationNumbers();
    currentPotentialSkavCard = null; 
    currentPotentialSkavCodeInput = null;
}

function showUpload() {
    $('#uploadSection').show();
    $('#manualSection').hide();
    $('#stationContainer').empty().show(); 
    $('#submitContainer').hide();
    $('#uploadBtn').show();
    updateStationNumbers();
    currentPotentialSkavCard = null; 
    currentPotentialSkavCodeInput = null;
}

// --- Manual Station Input Functions (No Changes Needed, except _proceedToAddActualStationField) ---
function addStationField() {
    if (manualStationCount > 0) {
        const lastStationIdSuffix = `manual_${manualStationCount}`;
        const lastStationCard = document.getElementById(`stationCard_${lastStationIdSuffix}`);
        const lastStationCodeInput = document.getElementById(`StationCode${lastStationIdSuffix}`);

        if (lastStationCodeInput && !lastStationCodeInput.value.trim() && (!lastStationCard || lastStationCard.dataset.isSkav !== 'true')) {
            $('#skavModalText').text(`Station ${manualStationCount}'s code is empty. Is it an S-Kav station (its code will be auto-generated from adjacent stations)? Or do you want to fill its code now?`);
            currentPotentialSkavCard = lastStationCard;
            currentPotentialSkavCodeInput = lastStationCodeInput;
            if (skavModalInstance) { // Check if modal is initialized
                 skavModalInstance.show();
            } else {
                alert("Modal not ready. Please wait or check console for errors.");
            }
            return;
        }
    }
    _proceedToAddActualStationField();
}

function _handleModalConfirmSkav() {
    if (currentPotentialSkavCard && currentPotentialSkavCodeInput) {
        currentPotentialSkavCard.dataset.isSkav = 'true';
        currentPotentialSkavCodeInput.placeholder = "S-Kav (auto-gen)";
        $(currentPotentialSkavCodeInput).prop('disabled', true).addClass('skav-input-pending'); // Disable and style
        $(currentPotentialSkavCard).find('.card-header').removeClass('bg-primary').addClass('bg-warning text-dark');
    }
    if (skavModalInstance) skavModalInstance.hide();
    _proceedToAddActualStationField(); 
    currentPotentialSkavCard = null;
    currentPotentialSkavCodeInput = null;
}

function _handleModalFillNow() {
    if (currentPotentialSkavCodeInput) {
        currentPotentialSkavCodeInput.focus();
        const feedbackEl = $(currentPotentialSkavCodeInput).closest('.card-body').find('.station-code-feedback');
        if (feedbackEl.length === 0) {
             $(currentPotentialSkavCodeInput).after('<div class="form-text text-danger station-code-feedback">Please fill in the station code.</div>');
        } else {
             feedbackEl.text('Please fill in the station code.').addClass('text-danger').show();
        }
    }
    if (skavModalInstance) skavModalInstance.hide();
    currentPotentialSkavCard = null;
    currentPotentialSkavCodeInput = null;
}

function _handleModalCancelAdd() {
    if (skavModalInstance) skavModalInstance.hide();
    currentPotentialSkavCard = null;
    currentPotentialSkavCodeInput = null;
}


/**
 * The core logic for creating and appending a new station card.
 * // --- MODIFIED: Added HTML structure for suggestions ---
 */
function _proceedToAddActualStationField() {
    // Collapse the previously added card's body
    if (manualStationCount > 0) {
        const prevStationToCollapseIdSuffix = `manual_${manualStationCount}`;
        const prevCollapseElement = document.getElementById(`collapse_${prevStationToCollapseIdSuffix}`);
        if (prevCollapseElement && prevCollapseElement.classList.contains('show')) {
            // Only hide if it's not the S-Kav we just marked (optional, but current logic hides)
            new bootstrap.Collapse(prevCollapseElement, { toggle: false }).hide();
             // Update the header 'aria-expanded' to false
            $(`#headerFor_${prevStationToCollapseIdSuffix}`).attr('aria-expanded', 'false');
        }
    }

    manualStationCount++; 
    const container = document.getElementById("stationContainer");
    const stationIdSuffix = `manual_${manualStationCount}`;
    const cardWrapperId = `stationCard_${stationIdSuffix}`;

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = cardWrapperId;

    // --- MODIFIED: Added wrapper and suggestions div around station code input ---
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
                    <label class="form-label">Station Code:</label>
                    <div class="station-code-wrapper"> 
                        <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" placeholder="Enter Station Code" oninput="this.value = this.value.toUpperCase()" maxlength="5" autocomplete="off">
                        <div class="station-code-suggestions list-group" id="suggestions_${stationIdSuffix}"></div> 
                    </div>
                    <div class="form-text station-code-feedback mb-2"></div> 

                    <label class="form-label">Station Name:</label>
                    <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" required>

                    <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                    <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" required>

                    <label class="form-label">Onboard Slots:</label>
                    <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" required>
                    
                    <label class="form-label">Stationary Kavach ID:</label>
                    <input type="number" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" min="0">

                    <label class="form-label">Stationary Unit Tower Latitude:</label>
                    <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}">

                    <label class="form-label">Stationary Unit Tower Longitude:</label>
                    <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}">
                </div>
            </div>
        </div>
    `;
    // --- END MODIFIED ---

    container.appendChild(cardWrapper);
    setupStationCodeListener(cardWrapper, stationIdSuffix); // Setup listener for the new card
    updateStationNumbers();

    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if ($('#stationContainer .station-card').length > 0) {
        $('#finishManualInputBtn').show();
    }
    $('#submitContainer').hide();
}

// --- removeStationCard (No Changes Needed) ---
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
        updateStationNumbers(); 
        if ($('#stationContainer .station-card').length === 0) {
            $('#finishManualInputBtn').hide();
            $('#submitContainer').hide();
            manualStationCount = 0; 
        } 
    }
}

// --- updateStationNumbers (No Changes Needed) ---
function updateStationNumbers() {
    let visibleStationIndex = 0;
    $('#stationContainer .station-card').each(function() {
        visibleStationIndex++;
        $(this).find('.station-title-text').text(`Station ${visibleStationIndex}`);
    });
    if (visibleStationIndex === 0) {
        manualStationCount = 0;
    } 
}

// --- finishManualInput (No Changes Needed) ---
function finishManualInput() {
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


/**
 * Sets up listeners for station code input, validation, S-Kav logic,
 * and the new suggestion feature.
 * // --- MODIFIED: Added suggestion logic and listeners ---
 */
function setupStationCodeListener(cardElement, stationIdSuffix) {
    const stationCodeInput = cardElement.querySelector(`#StationCode${stationIdSuffix}`);
    const nameEl = cardElement.querySelector(`#stationName${stationIdSuffix}`);
    const latEl = cardElement.querySelector(`#Lattitude${stationIdSuffix}`);
    const lonEl = cardElement.querySelector(`#Longtitude${stationIdSuffix}`);
    const feedbackEl = $(stationCodeInput).closest('.card-body').find('.station-code-feedback');
    const suggestionsEl = cardElement.querySelector(`#suggestions_${stationIdSuffix}`); // Get the suggestions div

    if (!stationCodeInput || !suggestionsEl) {
        console.error(`Input or suggestions element not found for suffix: ${stationIdSuffix}`);
        return;
    }

    const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        $(suggestionsEl).hide();
    };

    const handleStationCodeValidation = (isBlurEvent = false) => {
        const code = stationCodeInput.value.toUpperCase().trim();
        const lookup = stationLookup[code];

        if (!isBlurEvent && feedbackEl && feedbackEl.length) {
            feedbackEl.text('').hide();
        }

        if (lookup) {
            if (nameEl) nameEl.value = lookup.name || '';
            if (latEl) latEl.value = lookup.latitude || '';
            if (lonEl) lonEl.value = lookup.longitude || '';
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Code found.').removeClass('text-danger text-warning').addClass('text-success').show();
                setTimeout(() => feedbackEl.fadeOut(), 2000);
            }
        } else {
            // Only clear these if they were likely auto-filled before. 
            // If user typed them, maybe don't clear? For now, we clear.
            // if (nameEl) nameEl.value = ''; 
            // if (latEl) latEl.value = '';
            // if (lonEl) lonEl.value = '';

            // Only clear and show 'not found' on blur, not every keystroke.
            if (isBlurEvent && code) {
                // Check if it's an S-Kav input; if so, don't clear it.
                if (stationCodeInput.placeholder !== "S-Kav (auto-gen)") {
                    // stationCodeInput.value = ''; // Decide if you want to clear on blur if not found. Can be annoying.
                    if (feedbackEl && feedbackEl.length) {
                         feedbackEl.text('Station code not found.').addClass('text-danger').removeClass('text-success text-warning').show();
                    }
                }
            }
        }
    };

    stationCodeInput.addEventListener('input', () => {
        const code = stationCodeInput.value.toUpperCase().trim();
        suggestionsEl.innerHTML = ''; // Clear old suggestions

        // --- ADDED: Suggestion Generation ---
        if (code.length > 0 && !stationCodeInput.disabled) { // Only show suggestions if not disabled (like S-Kav pending)
            const matches = Object.keys(stationLookup).filter(key => key.startsWith(code));

            if (matches.length > 0) {
                matches.slice(0, 10).forEach(match => {
                    const suggestionItem = document.createElement('a');
                    suggestionItem.href = '#';
                    suggestionItem.classList.add('list-group-item', 'list-group-item-action', 'py-1', 'px-2'); // Smaller padding
                    suggestionItem.textContent = `${match} (${stationLookup[match].name || 'N/A'})`;
                    
                    suggestionItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        stationCodeInput.value = match;
                        hideSuggestions();
                        // IMPORTANT: Manually trigger the 'input' event again *after* setting value
                        // This ensures the S-Kav logic runs with the selected value.
                        stationCodeInput.dispatchEvent(new Event('input', { bubbles: true })); 
                        stationCodeInput.focus(); 
                    });
                    suggestionsEl.appendChild(suggestionItem);
                });
                $(suggestionsEl).show();
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
        }
        // --- END ADDED ---

        handleStationCodeValidation(false); // Run validation

        // --- S-Kav Auto-fill Logic (Keep As Is) ---
        const currentNumericId = parseInt(stationIdSuffix.split('_')[1]);
        if (!currentNumericId) return;

        const attemptAutoFillSkav = (skavNumericId, code1, code2) => {
            const skavCard = document.getElementById(`stationCard_manual_${skavNumericId}`);
            if (skavCard && skavCard.dataset.isSkav === 'true' && skavCard.dataset.isSkavFilled !== 'true') {
                const skavCodeInput = document.getElementById(`StationCodemanual_${skavNumericId}`);
                if (skavCodeInput && code1 && code2) {
                    skavCodeInput.value = `${code1}-${code2}`;
                    $(skavCard).find('.card-header').removeClass('bg-warning text-dark').addClass('bg-primary');
                    $(skavCodeInput).removeClass('skav-input-pending').prop('disabled', false); // Re-enable
                    skavCard.dataset.isSkavFilled = 'true';
                    // S-Kav code is not validated against lookup, so no event dispatch needed
                }
            }
        };

        const currentCodeForSkav = stationCodeInput.value.toUpperCase().trim();

        // 1. Check if THIS card (currentNumericId) can complete a PREVIOUS S-Kav (currentNumericId - 1)
        if (currentNumericId > 2) { 
             const skavCandidateNumericId = currentNumericId - 1;
             const beforeSkavNumericId = currentNumericId - 2;
             const beforeSkavCodeInput = document.getElementById(`StationCodemanual_${beforeSkavNumericId}`);
             const codeBeforeSkav = beforeSkavCodeInput ? beforeSkavCodeInput.value.trim().toUpperCase() : null;
             if (currentCodeForSkav && codeBeforeSkav) {
                 attemptAutoFillSkav(skavCandidateNumericId, codeBeforeSkav, currentCodeForSkav);
             }
        }

        // 2. Check if THIS card (currentNumericId) can complete a NEXT S-Kav (currentNumericId + 1)
        const skavCandidateNextNumericId = currentNumericId + 1;
        const afterSkavNumericId = currentNumericId + 2;
        const afterSkavCodeInput = document.getElementById(`StationCodemanual_${afterSkavNumericId}`);
        if(afterSkavCodeInput) {
            const codeAfterSkav = afterSkavCodeInput.value.trim().toUpperCase();
            if (currentCodeForSkav && codeAfterSkav) {
                attemptAutoFillSkav(skavCandidateNextNumericId, currentCodeForSkav, codeAfterSkav);
            }
        }
        // --- End S-Kav Logic ---
    });

    // --- MODIFIED: Blur listener with delay ---
    stationCodeInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSuggestions();
            handleStationCodeValidation(true); 
        }, 150); 
    });

    // --- ADDED: Keyboard navigation and hide on outside click ---
    stationCodeInput.addEventListener('keydown', (e) => {
        const items = suggestionsEl.querySelectorAll('.list-group-item-action');
        if (items.length === 0) return;

        let currentFocus = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('active')) {
                currentFocus = index;
            }
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
             hideSuggestions();
        }
    });

    document.addEventListener('click', (e) => {
        if (!stationCodeInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });
    // --- END ADDED ---
}

// --- Data Submission and Excel Handling ---
function submitData() {
    const stationData = [];
    document.getElementById("loadingSpinner").style.display = "block";
    $('#loadingMessage').text('Processing... Please wait.');

    let allValid = true;
    $('#stationContainer .station-card').each(function(index) {
        const card = $(this);
        const stationVisualNumber = index + 1; // For error messages (based on current visual order)
        
        // Find the actual station ID suffix (e.g., "manual_X") for more robust field finding
        const cardId = card.attr('id');
        const idSuffix = cardId ? cardId.substring(cardId.indexOf('_') + 0) : ''; // includes the "manual_" or "excel_" part

        const nameInput = card.find(`#stationName${idSuffix}`);
        const stationCodeInput = card.find(`#StationCode${idSuffix}`);
        
        const name = nameInput.val() ? nameInput.val().trim() : '';
        const stationCodeValue = stationCodeInput.val() ? stationCodeInput.val().trim().toUpperCase() : '';

        const staticVal = parseInt(card.find(`#OptimumStatic${idSuffix}`).val()) || 0;
        const onboardSlotsVal = parseInt(card.find(`#onboardSlots${idSuffix}`).val()) || 0;
        const kavachIDVal = parseInt(card.find(`#KavachID${idSuffix}`).val()) || 0;
        const latitudeVal = parseFloat(card.find(`#Lattitude${idSuffix}`).val()) || null;
        const longitudeVal = parseFloat(card.find(`#Longtitude${idSuffix}`).val()) || null;

        // Validation
        let cardHasError = false;
        if (!name) {
            alert(`Station Name cannot be empty for Station displayed as #${stationVisualNumber} (ID: ${idSuffix}).`);
            nameInput.addClass('is-invalid');
            cardHasError = true;
        } else {
            nameInput.removeClass('is-invalid');
        }

        if (!stationCodeValue) {
             // Check if it was an S-Kav that failed to auto-generate
            if (card.data('isSkav') === 'true') {
                alert(`Station Code for S-Kav station displayed as #${stationVisualNumber} (ID: ${idSuffix}) could not be auto-generated. Please ensure adjacent station codes are filled or fill this manually.`);
            } else {
                alert(`Station Code cannot be empty for Station displayed as #${stationVisualNumber} (ID: ${idSuffix}).`);
            }
            stationCodeInput.addClass('is-invalid');
            cardHasError = true;
        } else {
            stationCodeInput.removeClass('is-invalid');
        }
        
        if(cardHasError){
            allValid = false;
            // Expand card if collapsed to show error
            const collapseElement = card.find('.collapse');
            if (collapseElement.length && !collapseElement.hasClass('show')) {
                new bootstrap.Collapse(collapseElement[0], { toggle: false }).show();
            }
        }


        if (allValid) { // Only push if this card passed its own validation step (within loop)
            stationData.push({
                name: name,
                StationCode: stationCodeValue,
                Static: staticVal,
                onboardSlots: onboardSlotsVal,
                KavachID: kavachIDVal,
                Lattitude: latitudeVal, // Corrected typo from Lattitude
                Longitude: longitudeVal
            });
        }
    });

    if (!allValid) {
        document.getElementById("loadingSpinner").style.display = "none";
        alert("Please correct the highlighted errors before submitting.");
        return; // Stop submission
    }
    
    if (stationData.length === 0 && $('#stationContainer .station-card').length > 0) {
        // This case implies allValid was false from the start or became false
        document.getElementById("loadingSpinner").style.display = "none";
        return; 
    }
    
    if (stationData.length === 0) {
        alert("No station data to submit. Please add some stations.");
        document.getElementById("loadingSpinner").style.display = "none";
        return;
    }

    fetch("/allocate_slots_endpoint", { // Your Flask endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stationData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.fileUrl) {
            checkFileReady(data.fileUrl);
        } else {
            alert(data.message || data.error || "Error generating file from server.");
            document.getElementById("loadingSpinner").style.display = "none";
        }
    })
    .catch(err => {
        alert("Submission Error: " + err.message);
        document.getElementById("loadingSpinner").style.display = "none";
    });
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

    fetch("/upload_excel", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        $('#loadingSpinner').hide();
        if (result.error) {
            alert("Error: " + result.error); return;
        }
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
            alert("No valid data found in Excel or invalid format."); return;
        }
        populateFieldsFromExcel(result.data);
        $('#manualSection').hide(); // Keep manual section hidden
        $('#uploadSection').hide(); 
        $('#stationContainer').show(); // Ensure station container is visible
        $('#submitContainer').show();
        // updateStationNumbers(); // Called by populateFieldsFromExcel
    })
    .catch(err => {
        alert("Failed to upload or process Excel file. " + err.message);
        $('#loadingSpinner').hide();
    });
}

function populateFieldsFromExcel(stationDataArray) {
    const container = document.getElementById("stationContainer");
    container.innerHTML = ""; // Clear previous entries
    manualStationCount = 0; // Reset for excel data, as IDs will be excel_X

    stationDataArray.forEach((station, index) => {
        // For Excel-populated cards, we use a different ID prefix to avoid collision with manual ones if we were to mix.
        // However, the current UI switches between manual and upload, clearing the container.
        // Using 'manualStationCount' here for consistency in ID generation if we ever merge.
        // Or, better, use a specific excel counter.
        const excelStationIndex = index + 1;
        const stationIdSuffix = `excel_${excelStationIndex}`; // Distinct suffix for Excel items
        const cardWrapperId = `stationCard_${stationIdSuffix}`;
        
        const cardWrapper = document.createElement("div");
        cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
        cardWrapper.id = cardWrapperId;

        // Normalize keys from Excel data (handle different possible capitalizations/spacings)
        const sCode = station["Station Code"] || station["station code"] || station["StationCode"] || '';
        const sName = station["Station Name"] || station["station name"] || station["StationName"] || station["name"] || '';
        const sStatic = station["Static"] || station["Optimum no. of Simultaneous Exclusive Static Profile Transfer"] || 0;
        const sOnboard = station["Onboard Slots"] || station["onboardSlots"] || station["onboardslots"] || 0;
        const sKavachID = station["Stationary Kavach ID"] || station["KavachID"] || station["kavachid"] || 0;
        const sLat = station["Stationary Unit Tower Lattitude"] || station["Lattitude"] || station["latitude"] || ''; // Corrected Lattitude typo
        const sLon = station["Stationary Unit Tower Longitude"] || station["Longitude"] || station["longitude"] || '';


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
                        <label class="form-label">Station Code:</label>
                        <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" placeholder="Enter Station Code" oninput="this.value = this.value.toUpperCase()" maxlength="5" value="${sCode}">
                        <div class="form-text station-code-feedback mb-2"></div>

                        <label class="form-label">Station Name:</label>
                        <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" value="${sName}" required>

                        <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                        <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" value="${sStatic}" required>

                        <label class="form-label">Onboard Slots:</label>
                        <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" value="${sOnboard}" required>
                        
                        <label class="form-label">Stationary Kavach ID:</label>
                        <input type="number" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" min="0" value="${sKavachID}">

                        <label class="form-label">Stationary Unit Tower Latitude:</label>
                        <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}" value="${sLat}">

                        <label class="form-label">Stationary Unit Tower Longitude:</label>
                        <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}" value="${sLon}">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(cardWrapper);
        // Excel cards also get the listener, though S-Kav logic primarily targets manual entry.
        // If an Excel card has an empty code and neighbors, it *could* be auto-filled if manually marked S-Kav, but that's not the primary design.
        setupStationCodeListener(cardWrapper, stationIdSuffix); 
    });

    if (stationDataArray.length > 0) {
        $('#submitContainer').show();
    } else {
        $('#submitContainer').hide();
        alert("No valid station data to populate from Excel.");
    }
    updateStationNumbers(); // Update visual numbering for Excel cards
}


function checkFileReady(fileUrl) {
    let attempts = 0;
    const maxAttempts = 20; 
    const checkInterval = 3000; 

    $('#loadingSpinner').show(); 
    $('#loadingMessage').text(`Preparing file for download. Please wait...`);

    function poll() {
        fetch(fileUrl, { method: "HEAD" })
        .then(response => {
            if (response.ok && response.status === 200) { 
                $('#loadingMessage').text('File ready! Starting download...');
                setTimeout(() => { 
                    window.location.href = fileUrl;
                    document.getElementById("loadingSpinner").style.display = "none";
                    $('#stationContainer').empty();
                    $('#submitContainer').hide();
                    // Reset to a default view after download
                    showManual(); // Or showUpload() or clear everything
                }, 1000);
            } else if (response.status === 404 || attempts >= maxAttempts) { 
                let message = response.status === 404 ? "File not found or not yet available." : "File processing timed out.";
                alert(message + " Please check the server or try again later.");
                document.getElementById("loadingSpinner").style.display = "none";
            } else { 
                attempts++;
                $('#loadingMessage').text(`Processing... Attempt ${attempts} of ${maxAttempts}. Status: ${response.status}`);
                setTimeout(poll, checkInterval);
            }
        })
        .catch(err => {
            alert("Error checking file readiness: " + err.message);
            document.getElementById("loadingSpinner").style.display = "none";
        });
    }
    poll();
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the Bootstrap modal instance
    const modalElement = document.getElementById('skavModal');
    if (modalElement) {
        skavModalInstance = new bootstrap.Modal(modalElement);
    } else {
        console.error("S-Kav Modal HTML element not found!");
    }

    // Setup modal button listeners
    $('#skavModalIsSkavBtn').on('click', _handleModalConfirmSkav);
    $('#skavModalFillNowBtn').on('click', _handleModalFillNow);
    $('#skavModalCancelAddBtn').on('click', _handleModalCancelAdd);
    
    // Initial UI setup
    showManual(); 
});