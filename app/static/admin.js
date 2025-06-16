document.addEventListener('DOMContentLoaded', function() {
    const stationList = document.getElementById('stationList');
    const addStationForm = document.getElementById('addStationForm');
    const formMessage = document.getElementById('formMessage');
    const updateStationForm = document.getElementById('updateStationForm');
    const updateFormMessage = document.getElementById('updateFormMessage');
    const updateStationModal = new bootstrap.Modal(document.getElementById('updateStationModal'));

    // Function to fetch and display stations
    const loadStations = () => {
        fetch('/api/get_stations')
            .then(response => response.json())
            .then(data => {
                stationList.innerHTML = ''; // Clear existing list
                if (data.stations) {
                    data.stations.forEach(station => {
                        const row = document.createElement('tr');
                        // Display Station_Code and timeslot
                        row.innerHTML = `
                            <td>${station.id}</td>
                            <td>${station.name}</td>
                            <td>${station.Station_Code || 'N/A'}</td>
                            <td>${station.SKac_ID || 'N/A'}</td>
                            <td>${station.latitude.toFixed(4)},<br>${station.longitude.toFixed(4)}</td>
                            <td>${station.safe_radius_km}</td>
                            <td>${station.allocated_frequency || 'N/A'}</td>
                            <td>${station.timeslot || 'N/A'}</td>
                            <td>${station.Area_type || 'N/A'}</td>
                            <td><span class="badge ${station.status === 'approved' ? 'bg-success' : 'bg-warning'}">${station.status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info update-btn" 
                                    data-id="${station.id}" 
                                    data-name="${station.name}"
                                    data-station_code="${station.Station_Code || ''}"
                                    data-skac_id="${station.SKac_ID || ''}"
                                    data-latitude="${station.latitude}" 
                                    data-longitude="${station.longitude}" 
                                    data-safe_radius_km="${station.safe_radius_km}"
                                    data-allocated_frequency="${station.allocated_frequency || ''}"
                                    data-timeslot="${station.timeslot || ''}"
                                    data-area_type="${station.Area_type || ''}"
                                    data-status="${station.status}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-btn" data-id="${station.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </td>
                        `;
                        stationList.appendChild(row);
                    });

                    // Re-attach event listeners after rendering
                    attachEventListeners();
                }
            })
            .catch(error => console.error('Error loading stations:', error));
    };

    const openUpdateModal = (event) => {
        const button = event.target.closest('.update-btn');
        // Populate all fields including the new ones
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
                body: JSON.stringify({ id: stationId }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success', formMessage);
                    loadStations();
                } else {
                    showMessage(data.message, 'danger', formMessage);
                }
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

    addStationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(addStationForm);
        const stationData = Object.fromEntries(formData.entries());

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
                loadStations();
            } else {
                showMessage(data.message, 'danger', formMessage);
            }
        });
    });

    updateStationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(updateStationForm);
        const stationData = Object.fromEntries(formData.entries());

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
                loadStations();
            } else {
                showMessage(data.message, 'danger', updateFormMessage);
            }
        });
    });
    
    function showMessage(message, type, element) {
        element.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
        setTimeout(() => {
            element.innerHTML = '';
        }, 4000);
    }

    loadStations();
});
