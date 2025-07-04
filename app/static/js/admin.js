document.addEventListener('DOMContentLoaded', function() {
    const stationList = document.getElementById('stationList');
    const addStationForm = document.getElementById('addStationForm');
    const formMessage = document.getElementById('formMessage');
    const updateStationForm = document.getElementById('updateStationForm');
    const updateFormMessage = document.getElementById('updateFormMessage');
    const updateStationModal = new bootstrap.Modal(document.getElementById('updateStationModal'));
    const tableSelect = document.getElementById('tableSelect'); // New: Table selection dropdown

    let currentTable = tableSelect.value; // Track the currently selected table

    // Function to fetch and display stations
    const loadStations = () => {
        // Fetch from the currently selected table
        fetch(`/api/get_stations?table=${currentTable}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Failed to fetch stations'); });
                }
                return response.json();
            })
            .then(data => {
                stationList.innerHTML = ''; // Clear existing list
                if (data.stations && data.stations.length > 0) {
                    data.stations.forEach(station => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${station.id}</td>
                            <td>${station.name}</td>
                            <td>${station.Station_Code || 'N/A'}</td>
                            <td>${station.SKac_ID || 'N/A'}</td>
                            <td>${station.latitude.toFixed(4)},<br>${station.longitude.toFixed(4)}</td>
                            <td>${station.safe_radius_km || 'N/A'}</td>
                            <td>${station.allocated_frequency || 'N/A'}</td>
                            <td>${station.timeslot || 'N/A'}</td>
                            <td>${station.Area_type || 'N/A'}</td>
                            <td><span class="badge ${station.status === 'approved' ? 'bg-success' : (station.status === 'Allocated Planning' ? 'bg-info' : 'bg-warning')}">${station.status || 'N/A'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info update-btn"
                                    data-id="${station.id}"
                                    data-name="${station.name}"
                                    data-station_code="${station.Station_Code || ''}"
                                    data-skac_id="${station.SKac_ID || ''}"
                                    data-latitude="${station.latitude}"
                                    data-longitude="${station.longitude}"
                                    data-safe_radius_km="${station.safe_radius_km || ''}"
                                    data-allocated_frequency="${station.allocated_frequency || ''}"
                                    data-timeslot="${station.timeslot || ''}"
                                    data-area_type="${station.Area_type || ''}"
                                    data-status="${station.status || ''}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-btn" data-id="${station.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </td>
                        `;
                        stationList.appendChild(row);
                    });
                    attachEventListeners(); // Re-attach event listeners after rendering
                } else {
                    stationList.innerHTML = `<tr><td colspan="11">No stations found in ${currentTable.replace('_', ' ')}.</td></tr>`;
                }
            })
            .catch(error => {
                console.error('Error loading stations:', error);
                showMessage(`Error loading stations: ${error.message}`, 'danger', formMessage);
            });
    };

    const openUpdateModal = (event) => {
        const button = event.target.closest('.update-btn');
        // Populate all fields
        document.getElementById('updateStationId').value = button.dataset.id;
        document.getElementById('updateName').value = button.dataset.name;
        document.getElementById('updateStationCode').value = button.dataset.station_code;
        document.getElementById('updateSKacID').value = button.dataset.skac_id;
        document.getElementById('updateLatitude').value = button.dataset.latitude;
        document.getElementById('updateLongitude').value = button.dataset.longitude;
        document.getElementById('updateSafeRadiusKm').value = button.dataset.safe_radius_km;
        document.getElementById('updateAllocatedFrequency').value = button.dataset.allocated_frequency;
        document.getElementById('updateTimeslot').value = button.dataset.timeslot;
        document.getElementById('updateAreaType').value = button.dataset.area_type;
        document.getElementById('updateStatus').value = button.dataset.status;

        updateStationModal.show();
    };

    const handleDelete = (event) => {
        const stationId = event.target.closest('.delete-btn').dataset.id;
        if (confirm('Are you sure you want to delete this station?')) {
            fetch('/api/delete_station', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: stationId, target_table: currentTable }), // Pass target_table
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success', formMessage);
                    loadStations();
                } else {
                    showMessage(data.message, 'danger', formMessage);
                }
            })
            .catch(error => {
                console.error('Error deleting station:', error);
                showMessage(`Error deleting station: ${error.message}`, 'danger', formMessage);
            });
        }
    };
    
    const attachEventListeners = () => {
        document.querySelectorAll('.update-btn').forEach(button => {
            button.addEventListener('click', openUpdateModal);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDelete);
        });
    };

    // Add Station Form Submission (always targets approved_stations)
    addStationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(addStationForm);
        const stationData = Object.fromEntries(formData.entries());
        // No need to pass target_table here, as this form is specifically for approved_stations

        fetch('/api/add_station', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stationData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success', formMessage);
                addStationForm.reset();
                // Only reload if the current view is 'approved_stations'
                if (currentTable === 'approved_stations') {
                    loadStations();
                }
            } else {
                showMessage(data.message, 'danger', formMessage);
            }
        })
        .catch(error => {
            console.error('Error adding station:', error);
            showMessage(`Error adding station: ${error.message}`, 'danger', formMessage);
        });
    });

    // Update Station Form Submission (targets currently selected table)
    updateStationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(updateStationForm);
        const stationData = Object.fromEntries(formData.entries());
        stationData.target_table = currentTable; // Pass target_table

        fetch('/api/update_station', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stationData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Station updated successfully!', 'success', formMessage);
                updateStationModal.hide();
                loadStations(); // Reload current table
            } else {
                showMessage(data.message, 'danger', updateFormMessage);
            }
        })
        .catch(error => {
            console.error('Error updating station:', error);
            showMessage(`Error updating station: ${error.message}`, 'danger', updateFormMessage);
        });
    });
    
    function showMessage(message, type, element) {
        element.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
        setTimeout(() => {
            element.innerHTML = '';
        }, 4000);
    }

    // Event listener for table selection dropdown
    tableSelect.addEventListener('change', function() {
        currentTable = this.value;
        loadStations(); // Load stations from the newly selected table
    });

    // Initial load of stations (defaults to approved_stations)
    loadStations();
});

