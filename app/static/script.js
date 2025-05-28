// --- Global State ---
let manualStationCount = 0;
let skavIdLookup = {}; // Switched to skavIdLookup

// Modal Instances
let stationTypeModalInstance;
let adjacentCodesModalInstance;

// To store context for card creation after modal interactions
let currentStationTypeContext = null; // 'standard' or 'adjacent_skav'
let adjacentCodesContext = null; // { prevCode, nextCode }

// --- JSON Loading ---
function loadSkavIdLookup(callback) {
    // Ensure this path is correct for your Flask static folder
    fetch('/static/skavidLookup.json') 
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for skavIdLookup.json`);
            }
            return response.json();
        })
        .then(data => {
            skavIdLookup = data;
            console.log("S-Kavach ID lookup data loaded successfully:", skavIdLookup);
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
        // Initialize Modals
        const stationTypeModalElement = document.getElementById('stationTypeModal');
        const adjacentCodesModalElement = document.getElementById('adjacentCodesModal');

        if (stationTypeModalElement) {
            stationTypeModalInstance = new bootstrap.Modal(stationTypeModalElement);
            // Attach listeners for stationTypeModal
            document.getElementById('isStandardSiteBtn').addEventListener('click', handleStandardSiteSelected);
            document.getElementById('isAdjacentSitedBtn').addEventListener('click', handleAdjacentSitedSelected);
        } else {
            console.error("Station Type Modal element not found!");
        }

        if (adjacentCodesModalElement) {
            adjacentCodesModalInstance = new bootstrap.Modal(adjacentCodesModalElement);
            // Attach listener for adjacentCodesModal
            document.getElementById('submitAdjacentCodesBtn').addEventListener('click', handleSubmitAdjacentCodes);
        } else {
            console.error("Adjacent Codes Modal element not found!");
        }
        
        console.log("Modals initialized.");
        showManual(); // Set initial view
    });
});


// --- UI Control Functions (showManual, showUpload - largely unchanged) ---
function showManual() {
    $('#manualSection').show();
    $('#uploadSection').hide();
    $('#stationContainer').empty().show();
    $('#addStationBtn').show();
    $('#finishManualInputBtn').text('Finish & Preview Stations').hide();
    $('#submitContainer').hide();
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
    // Reset context for the new station
    currentStationTypeContext = null;
    adjacentCodesContext = null;
    $('#prevStationCodeInput').val(''); // Clear inputs in adjacent codes modal
    $('#nextStationCodeInput').val('');
    $('#prevStationCodeFeedback').text('');
    $('#nextStationCodeFeedback').text('');


    // Collapse the previously added card's body if it exists and is expanded
    if (manualStationCount > 0) {
        const prevStationToCollapseIdSuffix = `manual_${manualStationCount}`;
        const prevCollapseElement = document.getElementById(`collapse_${prevStationToCollapseIdSuffix}`);
        if (prevCollapseElement && prevCollapseElement.classList.contains('show')) {
            new bootstrap.Collapse(prevCollapseElement, { toggle: false }).hide();
            $(`#headerFor_${prevStationToCollapseIdSuffix}`).attr('aria-expanded', 'false');
        }
    }
    
    if (stationTypeModalInstance) {
        stationTypeModalInstance.show();
    } else {
        alert("Station Type Modal not initialized. Please check console.");
    }
}

function handleStandardSiteSelected() {
    currentStationTypeContext = 'standard';
    if (stationTypeModalInstance) stationTypeModalInstance.hide();
    _proceedToAddActualStationField();
}

function handleAdjacentSitedSelected() {
    currentStationTypeContext = 'adjacent_skav';
    if (stationTypeModalInstance) stationTypeModalInstance.hide();
    if (adjacentCodesModalInstance) {
        adjacentCodesModalInstance.show();
    } else {
        alert("Adjacent Codes Modal not initialized. Please check console.");
    }
}

function handleSubmitAdjacentCodes() {
    const prevCode = $('#prevStationCodeInput').val().trim().toUpperCase();
    const nextCode = $('#nextStationCodeInput').val().trim().toUpperCase();

    let isValid = true;
    if (!prevCode) {
        $('#prevStationCodeFeedback').text('Previous station code is required.').addClass('text-danger');
        isValid = false;
    } else {
        $('#prevStationCodeFeedback').text('').removeClass('text-danger');
    }

    if (!nextCode) {
        $('#nextStationCodeFeedback').text('Next station code is required.').addClass('text-danger');
        isValid = false;
    } else {
        $('#nextStationCodeFeedback').text('').removeClass('text-danger');
    }
    
    if (prevCode === nextCode && prevCode !== "") {
        $('#prevStationCodeFeedback').text('Previous and Next codes cannot be the same.').addClass('text-danger');
        $('#nextStationCodeFeedback').text('Previous and Next codes cannot be the same.').addClass('text-danger');
        isValid = false;
    }


    if (isValid) {
        adjacentCodesContext = { prevCode, nextCode };
        if (adjacentCodesModalInstance) adjacentCodesModalInstance.hide();
        _proceedToAddActualStationField();
    }
}


/**
 * Core logic for creating and appending a new station card.
 * Adapts based on currentStationTypeContext.
 */
function _proceedToAddActualStationField() {
    manualStationCount++; 
    const container = document.getElementById("stationContainer");
    const stationIdSuffix = `manual_${manualStationCount}`;
    const cardWrapperId = `stationCard_${stationIdSuffix}`;

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "col-12 col-sm-6 col-md-4 mb-3 station-card";
    cardWrapper.id = cardWrapperId;

    let stationCodeValue = "";
    let stationNameValue = "";
    let kavachIdPlaceholder = "Enter Kavach ID";
    let stationCodeReadonly = false;
    let stationNameReadonly = false;
    let kavachIdDisabled = false;
    let latLonDisabled = false;

    if (currentStationTypeContext === 'adjacent_skav' && adjacentCodesContext) {
        stationCodeValue = `${adjacentCodesContext.prevCode}-${adjacentCodesContext.nextCode}`;
        stationNameValue = `S-Kav (${adjacentCodesContext.prevCode}-${adjacentCodesContext.nextCode})`;
        kavachIdPlaceholder = "N/A for S-Kav (Adjacent)";
        stationCodeReadonly = true;
        stationNameReadonly = true;
        kavachIdDisabled = true; // Kavach ID not applicable or not primary for this type
        latLonDisabled = true; // Lat/Lon not applicable or not primary for this type
    }

    cardWrapper.innerHTML = `
        <div class="card shadow p-0 h-100">
            <div class="card-header ${currentStationTypeContext === 'adjacent_skav' ? 'bg-warning text-dark' : 'bg-primary text-white'} d-flex justify-content-between align-items-center"
                 id="headerFor_${stationIdSuffix}"
                 data-bs-toggle="collapse"
                 data-bs-target="#collapse_${stationIdSuffix}"
                 aria-expanded="true" 
                 aria-controls="collapse_${stationIdSuffix}"
                 style="cursor: pointer;">
                <span class="station-title-text">Station ${manualStationCount} ${currentStationTypeContext === 'adjacent_skav' ? '(S-Kavach)' : ''}</span>
                <button type="button" class="btn-close ${currentStationTypeContext === 'adjacent_skav' ? '' : 'btn-close-white'}" aria-label="Close" onclick="event.stopPropagation(); removeStationCard('${cardWrapperId}')"></button>
            </div>
            <div class="collapse show" id="collapse_${stationIdSuffix}" aria-labelledby="headerFor_${stationIdSuffix}">
                <div class="card-body">
                    <label class="form-label">Stationary Kavach ID:</label>
                    <div class="input-wrapper"> 
                        <input type="text" class="form-control mb-2 kavach-id-input" id="KavachID${stationIdSuffix}" placeholder="${kavachIdPlaceholder}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" maxlength="10" autocomplete="off" ${kavachIdDisabled ? 'disabled' : ''}>
                        <div class="suggestions-box list-group" id="suggestions_kavach_${stationIdSuffix}"></div> 
                    </div>
                    <div class="form-text kavach-id-feedback mb-2"></div> 

                    <label class="form-label">Station Code:</label>
                    <input type="text" class="form-control mb-2 station-code-input" id="StationCode${stationIdSuffix}" value="${stationCodeValue}" placeholder="Auto-filled or S-Kav" ${stationCodeReadonly ? 'readonly' : ''}>
                    
                    <label class="form-label">Station Name:</label>
                    <input type="text" class="form-control mb-2 station-name-input" id="stationName${stationIdSuffix}" value="${stationNameValue}" placeholder="Auto-filled or S-Kav" ${stationNameReadonly ? 'readonly' : ''} required>

                    <label class="form-label">Stationary Unit Tower Latitude:</label>
                    <input type="number" step="any" class="form-control mb-2 latitude-input" id="Lattitude${stationIdSuffix}" placeholder="Auto-filled" ${latLonDisabled ? 'disabled' : ''}>

                    <label class="form-label">Stationary Unit Tower Longitude:</label>
                    <input type="number" step="any" class="form-control mb-2 longitude-input" id="Longtitude${stationIdSuffix}" placeholder="Auto-filled" ${latLonDisabled ? 'disabled' : ''}>

                    <label class="form-label">Optimum no. of Simultaneous Exclusive Static Profile Transfer:</label>
                    <input type="number" class="form-control mb-2 optimum-static-input" id="OptimumStatic${stationIdSuffix}" min="0" required>

                    <label class="form-label">Onboard Slots:</label>
                    <input type="number" class="form-control mb-2 onboard-slots-input" id="onboardSlots${stationIdSuffix}" min="0" required>
                </div>
            </div>
        </div>
    `;

    container.appendChild(cardWrapper);

    if (currentStationTypeContext === 'standard' && !kavachIdDisabled) {
        setupKavachIdListener(cardWrapper, stationIdSuffix); // Setup listener for Kavach ID
    } else if (currentStationTypeContext === 'adjacent_skav') {
        // For adjacent S-Kav, fields are pre-filled, no listener needed for Kavach ID
        // but we might want to focus on the first manual input
        const onboardSlotsInput = cardWrapper.querySelector(`#onboardSlots${stationIdSuffix}`);
        if(onboardSlotsInput) onboardSlotsInput.focus();
    }


    updateStationNumbers();
    cardWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if ($('#stationContainer .station-card').length > 0) {
        $('#finishManualInputBtn').show();
    }
    $('#submitContainer').hide();
}

// --- removeStationCard (largely unchanged) ---
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

// --- updateStationNumbers (unchanged) ---
function updateStationNumbers() {
    let visibleStationIndex = 0;
    $('#stationContainer .station-card').each(function() {
        visibleStationIndex++;
        const cardTypeSuffix = $(this).find('.card-header').text().includes('(S-Kav)') ? ' (S-Kav)' : '';
        $(this).find('.station-title-text').text(`Station ${visibleStationIndex}${cardTypeSuffix}`);
    });
    if (visibleStationIndex === 0) {
        manualStationCount = 0;
    } 
}

// --- finishManualInput (unchanged) ---
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
        alert("Please add at least one station."); // Consider replacing alert with a Bootstrap modal/toast
        $('#finishManualInputBtn').text('Finish & Preview Stations');
    }
}

/**
 * Sets up listeners for Stationary Kavach ID input, validation, and suggestions.
 * This is for 'standard' site type stations.
 */
function setupKavachIdListener(cardElement, stationIdSuffix) {
    const kavachIdInput = cardElement.querySelector(`#KavachID${stationIdSuffix}`);
    //const stationCodeEl = cardElement.querySelector(`#StationCode${stationIdSuffix}`);
    const nameEl = cardElement.querySelector(`#stationName${stationIdSuffix}`);
    const latEl = cardElement.querySelector(`#Lattitude${stationIdSuffix}`);
    const lonEl = cardElement.querySelector(`#Longtitude${stationIdSuffix}`);
    const feedbackEl = $(kavachIdInput).closest('.card-body').find('.kavach-id-feedback'); // Corrected selector
    const suggestionsEl = cardElement.querySelector(`#suggestions_kavach_${stationIdSuffix}`);

    if (!kavachIdInput || !suggestionsEl) {
        console.error(`Kavach ID Input or suggestions element not found for suffix: ${stationIdSuffix}`);
        return;
    }

    const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        $(suggestionsEl).hide();
    };

    const handleKavachIdValidation = (isBlurEvent = false) => {
        const kavachId = kavachIdInput.value.trim(); // Kavach ID is numeric string
        const lookup = skavIdLookup[kavachId];

        if (!isBlurEvent && feedbackEl && feedbackEl.length) {
            feedbackEl.text('').hide();
        }

        if (lookup) {
            //if (stationCodeEl) stationCodeEl.value = kavachId; // Use Kavach ID as Station Code
            if (nameEl) nameEl.value = lookup.name || '';
            if (latEl) latEl.value = lookup.latitude || '';
            if (lonEl) lonEl.value = lookup.longitude || '';
            if (feedbackEl && feedbackEl.length) {
                feedbackEl.text('Kavach ID found.').removeClass('text-danger text-warning').addClass('text-success').show();
                setTimeout(() => feedbackEl.fadeOut(), 2000);
            }
        } else {
            // Clear auto-filled fields if ID not found
            //if (stationCodeEl) stationCodeEl.value = ''; 
            if (nameEl) nameEl.value = '';
            if (latEl) latEl.value = '';
            if (lonEl) lonEl.value = '';

            if (isBlurEvent && kavachId) {
                if (feedbackEl && feedbackEl.length) {
                     feedbackEl.text('Kavach ID not found.').addClass('text-danger').removeClass('text-success text-warning').show();
                }
            }
        }
    };

    kavachIdInput.addEventListener('input', () => {
        const idValue = kavachIdInput.value.trim();
        suggestionsEl.innerHTML = ''; 

        if (idValue.length > 0) {
            const matches = Object.keys(skavIdLookup).filter(key => key.startsWith(idValue));

            if (matches.length > 0) {
                matches.slice(0, 10).forEach(match => {
                    const suggestionItem = document.createElement('a');
                    suggestionItem.href = '#';
                    suggestionItem.classList.add('list-group-item', 'list-group-item-action', 'py-1', 'px-2');
                    suggestionItem.textContent = `${match} (${skavIdLookup[match].name || 'N/A'})`;
                    
                    suggestionItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        kavachIdInput.value = match;
                        hideSuggestions();
                        handleKavachIdValidation(true); // Treat as blur to auto-fill
                        kavachIdInput.focus(); 
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
        handleKavachIdValidation(false); // Basic validation on input
    });

    kavachIdInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSuggestions();
            handleKavachIdValidation(true); 
        }, 150); 
    });

    kavachIdInput.addEventListener('keydown', (e) => {
        const items = suggestionsEl.querySelectorAll('.list-group-item-action');
        if (items.length === 0) return;
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
             hideSuggestions();
        }
    });

    document.addEventListener('click', (e) => {
        if (!kavachIdInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });
}

// --- submitData function (placeholder, implement based on your backend) ---
function submitData() {
    const stationsData = [];
    $('#stationContainer .station-card').each(function(index) {
        const card = $(this);
        const stationIdSuffix = `manual_${index + 1}`; // Note: This assumes cards are not reordered or IDs changed.
                                                    // A more robust way would be to use the actual ID from the card element.
                                                    // For simplicity, using index. The actual ID is on card.id (e.g. stationCard_manual_X)
        const cardIdParts = card.attr('id').split('_');
        const actualSuffix = cardIdParts[cardIdParts.length-1]; // e.g. 1, 2, 3 from stationCard_manual_1

        const station = {
            KavachID: card.find(`#KavachIDmanual_${actualSuffix}`).val(),
            StationCode: card.find(`#StationCodemanual_${actualSuffix}`).val(),
            name: card.find(`#stationNamemanual_${actualSuffix}`).val(),
            Lattitude: card.find(`#Lattitudemanual_${actualSuffix}`).val(),
            Longitude: card.find(`#Longtitudemanual_${actualSuffix}`).val(),
            onboardSlots: card.find(`#onboardSlotsmanual_${actualSuffix}`).val(),
            Static: card.find(`#OptimumStaticmanual_${actualSuffix}`).val(),
            isAdjacentSkav: card.find('.card-header').hasClass('bg-warning') // Check if it was an adjacent S-Kav
        };
        stationsData.push(station);
    });

    if (stationsData.length === 0) {
        alert("No stations to submit."); // Replace with modal/toast
        return;
    }

    console.log("Submitting Data:", stationsData);
    // TODO: Implement AJAX call to your Flask backend
    // Example:
    fetch("/allocate_slots_endpoint", { // Your Flask endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stationsData)
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