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
                        row.innerHTML = `
                            <td>${station.id}</td>
                            <td>${station.name}</td>
                            <td>${station.latitude.toFixed(4)}</td>
                            <td>${station.longitude.toFixed(4)}</td>
                            <td>${station.safe_radius_km}</td>
                            <td>${station.allocated_frequency || 'N/A'}</td>
                            <td><span class="badge ${station.status === 'approved' ? 'bg-success' : 'bg-warning'}">${station.status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info update-btn" data-id="${station.id}" 
                                    data-name="${station.name}" 
                                    data-latitude="${station.latitude}" 
                                    data-longitude="${station.longitude}" 
                                    data-safe_radius_km="${station.safe_radius_km}"
                                    data-allocated_frequency="${station.allocated_frequency || ''}"
                                    data-status="${station.status}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-danger delete-btn" data-id="${station.id}">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </td>
                        `;
                        stationList.appendChild(row);
                    });

                    // Add event listeners to the new buttons
                    document.querySelectorAll('.update-btn').forEach(button => {
                        button.addEventListener('click', openUpdateModal);
                    });
                    document.querySelectorAll('.delete-btn').forEach(button => {
                        button.addEventListener('click', handleDelete);
                    });

                }
            })
            .catch(error => console.error('Error loading stations:', error));
    };

    // Function to handle form submission (Add Station)
    addStationForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(addStationForm);
        const stationData = Object.fromEntries(formData.entries());

        // Basic validation
        if (!stationData.name || !stationData.latitude || !stationData.longitude || !stationData.safe_radius_km || !stationData.status) {
            showMessage('Please fill out all fields.', 'danger',  formMessage);
            return;
        }

        fetch('/api/add_station', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(stationData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success', formMessage);
                addStationForm.reset(); // Clear the form
                loadStations(); // Refresh the list
            } else {
                showMessage(data.message, 'danger', formMessage);
            }
        })
        .catch(error => {
            console.error('Error adding station:', error);
            showMessage('An unexpected error occurred.', 'danger', formMessage);
        });
    });
    
    // Function to open the update modal and populate it
    const openUpdateModal = (event) => {
        const button = event.target.closest('.update-btn');
        const id = button.dataset.id;
        const name = button.dataset.name;
        const latitude = button.dataset.latitude;
        const longitude = button.dataset.longitude;
        const safe_radius_km = button.dataset.safe_radius_km;
        const allocated_frequency = button.dataset.allocated_frequency;
        const status = button.dataset.status;

        document.getElementById('updateStationId').value = id;
        document.getElementById('updateName').value = name;
        document.getElementById('updateLatitude').value = latitude;
        document.getElementById('updateLongitude').value = longitude;
        document.getElementById('updateSafeRadiusKm').value = safe_radius_km;
        document.getElementById('updateAllocatedFrequency').value = allocated_frequency;
        document.getElementById('updateStatus').value = status;

        updateStationModal.show();
    };

    // Function to handle form submission (Update Station)
    updateStationForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(updateStationForm);
        const stationData = Object.fromEntries(formData.entries());

        // Ensure ID is a number
        stationData.id = parseInt(stationData.id);
        // Convert numbers to correct types
        stationData.latitude = parseFloat(stationData.latitude);
        stationData.longitude = parseFloat(stationData.longitude);
        stationData.safe_radius_km = parseFloat(stationData.safe_radius_km);
        stationData.allocated_frequency = parseInt(stationData.allocated_frequency);


        fetch('/api/update_station', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(stationData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success', updateFormMessage);
                updateStationModal.hide();
                loadStations(); // Refresh the list
            } else {
                showMessage(data.message, 'danger', updateFormMessage);
            }
        })
        .catch(error => {
            console.error('Error updating station:', error);
            showMessage('An unexpected error occurred.', 'danger', updateFormMessage);
        });
    });

    // Function to handle station deletion
    const handleDelete = (event) => {
        const stationId = event.target.closest('.delete-btn').dataset.id;
        if (confirm('Are you sure you want to delete this station?')) {
            fetch('/api/delete_station', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: stationId }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success', formMessage);
                    loadStations(); // Refresh the list
                } else {
                    showMessage(data.message, 'danger', formMessage);
                }
            })
            .catch(error => {
                console.error('Error deleting station:', error);
                showMessage('An unexpected error occurred.', 'danger', formMessage);
            });
        }
    };
    
    // Helper function to display messages
    function showMessage(message, type) {
        formMessage.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
        setTimeout(() => {
            formMessage.innerHTML = '';
        }, 3000);
    }

    // Initial load of stations
    loadStations();
});
