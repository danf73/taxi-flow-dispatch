// WebSocket connection
let ws;
let currentDriverId = null;
let currentDriver = null;
let jobs = [];
let currentRoute = null;
let shiftActive = false;

// Initialize map
const map = L.map('map').setView([51.5074, -0.1278], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load drivers for selection
async function loadDrivers() {
  const response = await fetch('/api/drivers');
  const drivers = await response.json();
  
  const select = document.getElementById('driverSelect');
  select.innerHTML = '<option value="">Select Driver...</option>' +
    drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

loadDrivers();

// Toggle shift
async function toggleShift() {
  if (!currentDriverId) {
    alert('Please select a driver first');
    return;
  }
  
  const action = shiftActive ? 'end' : 'start';
  
  const response = await fetch(`/api/drivers/${currentDriverId}/shift`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  
  if (response.ok) {
    const driver = await response.json();
    currentDriver = driver;
    shiftActive = driver.shiftStatus === 'on-duty';
    updateShiftButton();
    updateEarningsDisplay();
    showNotification(shiftActive ? 'Shift started! Ready for jobs.' : 'Shift ended. Have a great day!');
  }
}

// Update shift button
function updateShiftButton() {
  const button = document.getElementById('shiftToggle');
  if (shiftActive) {
    button.textContent = 'End Shift';
    button.style.background = '#e74c3c';
  } else {
    button.textContent = 'Start Shift';
    button.style.background = '#27ae60';
  }
}

// Update earnings display
function updateEarningsDisplay() {
  const display = document.getElementById('earningsDisplay');
  if (currentDriver) {
    display.textContent = `Today: $${currentDriver.todayEarnings?.toFixed(2) || '0.00'} | Total: $${currentDriver.totalEarnings?.toFixed(2) || '0.00'} | Rating: ${currentDriver.rating?.toFixed(1) || 'N/A'}⭐`;
  }
}

// Driver selection
document.getElementById('driverSelect').addEventListener('change', (e) => {
  currentDriverId = parseInt(e.target.value);
  if (currentDriverId) {
    loadDriverInfo();
    connectWebSocket();
  }
});

// Load driver info
async function loadDriverInfo() {
  const response = await fetch('/api/drivers');
  const drivers = await response.json();
  currentDriver = drivers.find(d => d.id === currentDriverId);
  
  if (currentDriver) {
    updateEarningsDisplay();
    shiftActive = currentDriver.shiftStatus === 'on-duty';
    updateShiftButton();
  }
}

// Connect to WebSocket
function connectWebSocket() {
  if (ws) {
    ws.close();
  }
  
  ws = new WebSocket(`ws://${window.location.host}`);
  
  ws.onopen = () => {
    console.log('Connected to server');
    ws.send(JSON.stringify({
      type: 'register',
      role: 'driver',
      driverId: currentDriverId
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'initial_data':
        jobs = data.jobs;
        updateJobsList();
        break;
      case 'new_job':
        if (!jobs.find(j => j.id === data.job.id)) {
          jobs.push(data.job);
          updateJobsList();
          showNotification('New job available!');
        }
        break;
      case 'job_accepted':
      case 'job_updated':
        updateJob(data.job);
        break;
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
  };
}

// Update jobs list
function updateJobsList() {
  const container = document.getElementById('jobsContainer');
  const availableJobs = jobs.filter(j => j.status === 'pending');
  const myJobs = jobs.filter(j => j.assignedDriverId === currentDriverId && j.status !== 'completed');
  
  document.getElementById('jobCount').textContent = availableJobs.length + myJobs.length;
  
  if (availableJobs.length === 0 && myJobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div>No available jobs at the moment</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  if (myJobs.length > 0) {
    html += '<div class="section-title">My Jobs</div>';
    myJobs.forEach(job => {
      html += renderJobCard(job, true);
    });
  }
  
  if (availableJobs.length > 0) {
    html += '<div class="section-title">Available Jobs</div>';
    availableJobs.forEach(job => {
      html += renderJobCard(job, false);
    });
  }
  
  container.innerHTML = html;
  
  // Add event listeners
  attachJobEventListeners();
}

// Render job card
function renderJobCard(job, isAssigned) {
  const statusBadge = isAssigned ? '<span class="badge badge-assigned">Assigned</span>' : '<span class="badge badge-new">New</span>';
  
  let actionButtons = '';
  if (isAssigned) {
    if (job.status === 'accepted') {
      actionButtons = `
        <button class="btn btn-arrived" onclick="updateJobStatus(${job.id}, 'arrived')">Arrived at Pickup</button>
        <button class="btn btn-navigate" onclick="navigateToJob(${job.id})">Navigate</button>
      `;
    } else if (job.status === 'arrived') {
      actionButtons = `
        <button class="btn btn-pickup" onclick="updateJobStatus(${job.id}, 'picked_up')">Customer Picked Up</button>
        <button class="btn btn-navigate" onclick="navigateToJob(${job.id})">Navigate to Dropoff</button>
      `;
    } else if (job.status === 'picked_up' || job.status === 'in_progress') {
      actionButtons = `
        <button class="btn btn-navigate" onclick="navigateToJob(${job.id})">Navigate to Dropoff</button>
        <button class="btn btn-complete" onclick="completeJob(${job.id})">Complete Job</button>
      `;
    }
  } else {
    actionButtons = `
      <button class="btn btn-accept" onclick="acceptJob(${job.id})">Accept</button>
      <button class="btn btn-decline" onclick="declineJob(${job.id})">Decline</button>
    `;
  }
  
  const vehicleTypeLabel = {
    sedan: 'Sedan',
    suv: 'SUV',
    van: 'Van',
    luxury: 'Luxury',
    wheelchair: 'Wheelchair'
  }[job.vehicleType] || 'Sedan';
  
  return `
    <div class="job-card ${isAssigned ? 'assigned' : ''}" data-job-id="${job.id}">
      <div class="job-header">
        <div>
          <span class="job-id">Job #${job.id}</span>
          ${statusBadge}
        </div>
        <div class="job-price">$${job.estimatedPrice.toFixed(2)}</div>
      </div>
      
      <div class="job-details">
        <div class="job-details-row">
          <span class="job-details-label">Customer:</span>
          <span class="job-details-value">${job.customerName}</span>
        </div>
        <div class="job-details-row">
          <span class="job-details-label">Phone:</span>
          <span class="job-details-value">${job.customerPhone}</span>
        </div>
        <div class="job-details-row">
          <span class="job-details-label">Vehicle:</span>
          <span class="job-details-value">${vehicleTypeLabel}</span>
        </div>
        <div class="job-details-row">
          <span class="job-details-label">Payment:</span>
          <span class="job-details-value">${job.paymentMethod.toUpperCase()}</span>
        </div>
        <div class="job-details-row">
          <span class="job-details-label">Distance:</span>
          <span class="job-details-value">${job.distance} km</span>
        </div>
        <div class="job-details-row">
          <span class="job-details-label">Duration:</span>
          <span class="job-details-value">~${job.duration} min</span>
        </div>
        ${job.notes ? `
        <div class="job-details-row">
          <span class="job-details-label">Notes:</span>
          <span class="job-details-value">${job.notes}</span>
        </div>
        ` : ''}
        ${isAssigned ? `
        <div class="job-details-row">
          <span class="job-details-label">Status:</span>
          <span class="job-details-value" style="text-transform: capitalize;">${job.status.replace('_', ' ')}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="job-actions">
        ${actionButtons}
      </div>
    </div>
  `;
}

// Attach event listeners
function attachJobEventListeners() {
  // Event delegation is already handled by onclick attributes
  // This function can be extended for additional listeners
}

// Accept job
async function acceptJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId: currentDriverId })
  });
  
  if (response.ok) {
    const data = await response.json();
    updateJob(data.job);
    showNotification('Job accepted! Navigate to pickup location.');
  } else {
    const error = await response.json();
    alert(error.error || 'Failed to accept job');
  }
}

// Decline job
async function declineJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId: currentDriverId })
  });
  
  if (response.ok) {
    jobs = jobs.filter(j => j.id !== jobId);
    updateJobsList();
    showNotification('Job declined');
  }
}

// Complete job
async function completeJob(jobId) {
  const rating = prompt('Rate this trip (1-5 stars):', '5');
  if (!rating) return;
  
  const finalPrice = prompt('Final price (leave empty for estimated price):');
  
  const response = await fetch(`/api/jobs/${jobId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status: 'completed',
      finalPrice: finalPrice ? parseFloat(finalPrice) : null,
      rating: parseFloat(rating)
    })
  });
  
  if (response.ok) {
    jobs = jobs.filter(j => j.id !== jobId);
    updateJobsList();
    clearRoute();
    await loadDriverInfo(); // Refresh earnings
    showNotification('Job completed! Great work! 🎉');
  }
}

// Update job status
async function updateJobStatus(jobId, status) {
  const response = await fetch(`/api/jobs/${jobId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  
  if (response.ok) {
    const job = await response.json();
    updateJob(job);
    
    const statusMessages = {
      'arrived': 'Marked as arrived at pickup location',
      'picked_up': 'Customer picked up! Navigate to dropoff.',
      'in_progress': 'Trip in progress'
    };
    
    showNotification(statusMessages[status] || 'Status updated');
  }
}

// Navigate to job
function navigateToJob(jobId) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;
  
  clearRoute();
  
  // Draw route on map
  const pickupMarker = L.marker([job.pickup.lat, job.pickup.lng], {
    icon: L.divIcon({
      className: 'pickup-icon',
      html: '<div style="background: #3498db; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">PICKUP</div>',
      iconSize: [70, 35]
    })
  }).addTo(map);
  
  const dropoffMarker = L.marker([job.dropoff.lat, job.dropoff.lng], {
    icon: L.divIcon({
      className: 'dropoff-icon',
      html: '<div style="background: #e74c3c; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">DROPOFF</div>',
      iconSize: [80, 35]
    })
  }).addTo(map);
  
  // Draw line between points
  const routeLine = L.polyline([
    [job.pickup.lat, job.pickup.lng],
    [job.dropoff.lat, job.dropoff.lng]
  ], {
    color: '#3498db',
    weight: 4,
    opacity: 0.7
  }).addTo(map);
  
  currentRoute = {
    pickupMarker,
    dropoffMarker,
    routeLine
  };
  
  // Fit map to show route
  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
  
  // Add popups
  pickupMarker.bindPopup(`
    <strong>Pickup Location</strong><br>
    Customer: ${job.customerName}<br>
    Phone: ${job.customerPhone}
  `).openPopup();
}

// Clear route from map
function clearRoute() {
  if (currentRoute) {
    map.removeLayer(currentRoute.pickupMarker);
    map.removeLayer(currentRoute.dropoffMarker);
    map.removeLayer(currentRoute.routeLine);
    currentRoute = null;
  }
}

// Update single job
function updateJob(job) {
  const index = jobs.findIndex(j => j.id === job.id);
  if (index !== -1) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }
  updateJobsList();
}

// Show notification
function showNotification(message) {
  // Simple alert for now - could be enhanced with toast notifications
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Taxi Driver App', { body: message });
  }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
