// WebSocket connection
let ws;
let pickupMarker, dropoffMarker;
let pickupMode = true; // Toggle between pickup and dropoff selection
let jobs = [];
let jobHistory = [];
let drivers = [];
let customers = [];
let authToken = localStorage.getItem('authToken');
let userName = localStorage.getItem('userName');

// Check authentication
if (!authToken) {
  window.location.href = '/login';
}

// Verify token
fetch('/api/auth/verify', {
  headers: { 'Authorization': `Bearer ${authToken}` }
}).then(res => {
  if (!res.ok) {
    localStorage.clear();
    window.location.href = '/login';
  }
  return res.json();
}).then(data => {
  document.getElementById('userName').textContent = data.user.name;
}).catch(() => {
  localStorage.clear();
  window.location.href = '/login';
});

// Logout function
function logout() {
  fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  }).then(() => {
    localStorage.clear();
    window.location.href = '/login';
  });
}

// Initialize map (centered on London, UK - change to your city)
const map = L.map('map').setView([51.5074, -0.1278], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Driver markers on map
const driverMarkers = new Map();

// Connect to WebSocket
function connectWebSocket() {
  ws = new WebSocket(`ws://${window.location.host}`);
  
  ws.onopen = () => {
    console.log('Connected to server');
    ws.send(JSON.stringify({ type: 'register', role: 'reception' }));
    loadCustomers();
    loadJobHistory();
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'initial_data':
        jobs = data.jobs;
        drivers = data.drivers;
        updateJobsList();
        updateDriversList();
        updateDriverMarkers();
        break;
      case 'job_created':
      case 'job_updated':
        updateJob(data.job);
        if (data.driver) {
          updateDriver(data.driver);
        }
        break;
      case 'job_accepted':
        updateJob(data.job);
      case 'job_completed':
        // Remove from active jobs
        jobs = jobs.filter(j => j.id !== data.job.id);
        jobHistory.unshift(data.job);
        updateJobsList();
        updateJobHistory();
        if (data.driver) {
          updateDriver(data.driver);
        }
        break;
      case 'driver_updated':
      case 'driver_location':
        updateDriver(data.driver);
        break;
        updateDriver(data.driver);
        break;

// Load customers
async function loadCustomers() {
  const response = await fetch('/api/customers');
  customers = await response.json();
  updateCustomerSuggestions();
}

// Load job history
async function loadJobHistory() {
  const response = await fetch('/api/jobs/history');
  jobHistory = await response.json();
  updateJobHistory();
}

// Update customer suggestions
function updateCustomerSuggestions() {
  const datalist = document.getElementById('customerSuggestions');
  datalist.innerHTML = customers.map(c => 
    `<option value="${c.name}" data-phone="${c.phone}">${c.name} - ${c.phone}</option>`
  ).join('');
}

// Auto-fill customer phone when name is selected
document.getElementById('customerName').addEventListener('input', (e) => {
  const name = e.target.value;
  const customer = customers.find(c => c.name === name);
  if (customer) {
    document.getElementById('customerPhone').value = customer.phone;
  }
});

// Tab switching
function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tab + 'Tab').classList.add('active');
}
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
    setTimeout(connectWebSocket, 3000);
  };
}

connectWebSocket();

// Address geocoding functionality
let geocodeTimeout;

document.getElementById('pickupAddress').addEventListener('input', (e) => {
  clearTimeout(geocodeTimeout);
  const query = e.target.value;
  
  if (query.length < 3) {
    document.getElementById('pickupSuggestions').classList.remove('show');
    return;
  }
  
  geocodeTimeout = setTimeout(() => {
    searchAddress(query, 'pickup');
  }, 500);
});

document.getElementById('dropoffAddress').addEventListener('input', (e) => {
  clearTimeout(geocodeTimeout);
  const query = e.target.value;
  
  if (query.length < 3) {
    document.getElementById('dropoffSuggestions').classList.remove('show');
    return;
  }
  
  geocodeTimeout = setTimeout(() => {
    searchAddress(query, 'dropoff');
  }, 500);
});

async function searchAddress(query, type) {
  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ address: query })
    });
    
    const results = await response.json();
    displayAddressSuggestions(results, type);
  } catch (error) {
    console.error('Geocoding error:', error);
  }
}

function displayAddressSuggestions(results, type) {
  const suggestionsDiv = document.getElementById(`${type}Suggestions`);
  
  if (results.length === 0) {
    suggestionsDiv.classList.remove('show');
    return;
  }
  
  suggestionsDiv.innerHTML = results.map(result => `
    <div class="address-suggestion-item" onclick="selectAddress('${type}', ${result.lat}, ${result.lng}, '${result.display_name.replace(/'/g, "\\'")}')">
      ${result.display_name}
    </div>
  `).join('');
  
  suggestionsDiv.classList.add('show');
}

function selectAddress(type, lat, lng, displayName) {
  document.getElementById(`${type}Lat`).value = lat.toFixed(6);
  document.getElementById(`${type}Lng`).value = lng.toFixed(6);
  document.getElementById(`${type}Address`).value = displayName;
  document.getElementById(`${type}Suggestions`).classList.remove('show');
  
  // Update marker on map
  if (type === 'pickup') {
    if (pickupMarker) {
      map.removeLayer(pickupMarker);
    }
    pickupMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'pickup-icon',
        html: '<div style="background: #667eea; color: white; padding: 5px 10px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);">PICKUP</div>',
        iconSize: [70, 35]
      })
    }).addTo(map);
    map.setView([lat, lng], 14);
  } else {
    if (dropoffMarker) {
      map.removeLayer(dropoffMarker);
    }
    dropoffMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'dropoff-icon',
        html: '<div style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 10px rgba(231, 76, 60, 0.3);">DROPOFF</div>',
        iconSize: [80, 35]
      })
    }).addTo(map);
    
    // Calculate estimate if both locations are set
    calculateEstimate();
  }
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.form-group')) {
    document.querySelectorAll('.address-suggestions').forEach(div => {
      div.classList.remove('show');
    });
  }
});

// Map click handler
map.on('click', (e) => {
  const vehicleType = document.getElementById('vehicleType').value;
  
  if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
    // Call server to calculate price
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: { lat: pickupLat, lng: pickupLng },
        dropoff: { lat: dropoffLat, lng: dropoffLng },
        customerName: 'Estimate',
        customerPhone: '000',
        vehicleType: vehicleType
      })
    });
    
    if (response.ok) {
      const job = await response.json();
      
      // Remove the estimate job
      jobs = jobs.filter(j => j.customerName !== 'Estimate');
      
      // Show price breakdown
      document.getElementById('priceEstimate').style.display = 'block';
      document.getElementById('estDistance').textContent = `${job.distance} km`;
      document.getElementById('estDuration').textContent = `${job.duration} min`;
      document.getElementById('estBase').textContent = `$${job.estimatedPrice.toFixed(2)}`;
      document.getElementById('estTimeSurge').textContent = `x${job.estimatedPrice}`;
      document.getElementById('estWeatherSurge').textContent = `x${job.estimatedPrice}`;
      document.getElementById('estTotal').textContent = `$${job.estimatedPrice.toFixed(2)}`;
    }
  }
}

// Listen for vehicle type changes to recalculate
document.getElementById('vehicleType').addEventListener('change', calculateEstimate);   
    // Calculate estimate
    calculateEstimate();
  }
});

// Calculate price estimate
async function calculateEstimate() {
  const vehicleType = document.getElementById('vehicleType').value;
  const paymentMethod = document.getElementById('paymentMethod').value;
  
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName,
      customerPhone,
      pickup: { lat: pickupLat, lng: pickupLng },
      dropoff: { lat: dropoffLat, lng: dropoffLng },
      notes,
      vehicleType,
      paymentMethod
    })
  });
  
  if (response.ok) {
    // Reset form
    document.getElementById('jobForm').reset();
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    pickupMarker = null;
    dropoffMarker = null;
    pickupMode = true;
    document.getElementById('priceEstimate').style.display = 'none';
    
    // Reload customers in case a new one was created
    await loadCustomers()
      jobs = jobs.filter(j => j.customerName !== 'Estimate');
      
      // Show price breakdown
      document.getElementById('priceEstimate').style.display = 'block';
      document.getElementById('estDistance').textContent = `${job.distance} km`;
      document.getElementById('estDuration').textContent = `${job.duration} min`;
      document.getElementById('estBase').textContent = `$${job.estimatedPrice.toFixed(2)}`;
      document.getElementById('estTimeSurge').textContent = `x${job.estimatedPrice}`;
      document.getElementById('estWeatherSurge').textContent = `x${job.estimatedPrice}`;
      document.getElementById('estTotal').textContent = `$${job.estimatedPrice.toFixed(2)}`;
    }
  }
}

// Form submission
document.getElementById('jobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const customerName = document.getElementById('customerName').value;
  const customerPhone = document.getElementById('customerPhone').value;
  const pickupLat = parseFloat(document.getElementById('pickupLat').value);
  const pickupLng = parseFloat(document.getElementById('pickupLng').value);
  const dropoffLat = parseFloat(document.getElementById('dropoffLat').value);
  const dropoffLng = parseFloat(document.getElementById('dropoffLng').value);
  const notes = document.getElementById('notes').value;
  
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName,
      customerPhone,
      pickup: { lat: pickupLat, lng: pickupLng },
      dropoff: { lat: dropoffLat, lng: dropoffLng },
      notes
    })
  });
  
  if (response.ok) {
    // Reset form
    document.getElementById('jobForm').reset();
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    pickupMarker = null;
    dropoffMarker = null;
    pickupMode = true;
    document.getElementById('priceEstimate').style.display = 'none';
  }
});

// Uconst vehicleTypeLabel = {
      sedan: 'Sedan',
      suv: 'SUV',
      van: 'Van',
      luxury: 'Luxury',
      wheelchair: 'Wheelchair'
    }[job.vehicleType] || 'Sedan';
    
    return `
      <div class="job-card">
        <div class="job-header">
          <span class="job-id">Job #${job.id}</span>
          <span class="job-status status-${job.status}">${job.status.replace('_', ' ')}</span>
        </div>
        <div class="job-details">
          <div><strong>Customer:</strong> ${job.customerName}</div>
          <div><strong>Phone:</strong> ${job.customerPhone}</div>
          <div><strong>Vehicle:</strong> ${vehicleTypeLabel}</div>
          <div><strong>Payment:</strong> ${job.paymentMethod.toUpperCase()
  
  jobsList.innerHTML = activeJobs.map(job => {
    const driver = drivers.find(d => d.id === job.assignedDriverId);
    return `
      <div class="job-card">
        <div class="job-header">
          <span class="job-id">Job #${job.id}</span>
          <span class="job-status status-${job.status}">${job.status}</span>
        </div>
        <div class="job-details">
          <div><strong>Customer:</strong> ${job.{
    const shiftBadge = driver.shiftStatus === 'on-duty' 
      ? '<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 8px;">ON DUTY</span>'
      : '<span style="background: #95a5a6; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 8px;">OFF DUTY</span>';
    
    return `
      <div class="driver-card">
        <div class="driver-info">
          <div class="driver-name">
            ${driver.name} 
            ${shiftBadge}
          </div>
          <div style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">
            ${driver.vehicleType.toUpperCase()} - ${driver.vehicleNumber}
          </div>
          <div style="margin-top: 4px;">
            <span class="driver-status driver-${driver.status}">${driver.status}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update job history
function updateJobHistory() {
  const historyDiv = document.getElementById('jobHistory');
  
  if (jobHistory.length === 0) {
    historyDiv.innerHTML = '<div class="empty-state">No job history</div>';
    return;
  }
  
  historyDiv.innerHTML = jobHistory.slice(0, 20).map(job => {
    const driver = drivers.find(d => d.id === job.assignedDriverId);
    const completedDate = job.completedAt ? new Date(job.completedAt).toLocaleString() : 'N/A';
    
    return `
      <div class="job-card">
        <div class="job-header">
          <span class="job-id">Job #${job.id}</span>
          <span class="job-status status-${job.status}">${job.status.replace('_', ' ')}</span>
        </div>
        <div class="job-details">
          <div><strong>Customer:</strong> ${job.customerName}</div>
          <div><strong>Completed:</strong> ${completedDate}</div>
          ${driver ? `<div><strong>Driver:</strong> ${driver.name}</div>` : ''}
          <div><strong>Payment:</strong> ${job.paymentMethod.toUpperCase()}</div>
        </div>
        <div class="job-price">$${(job.finalPrice || job.estimatedPrice).toFixed(2)}</div>
      </div>
    `;
  }     <div class="job-price">$${job.estimatedPrice.toFixed(2)}</div>
      </div>
    `;
  }).join('');
}

// Update drivers list
function updateDriversList() {
  const driversList = document.getElementById('driversList');
  
  driversList.innerHTML = drivers.map(driver => `
    <div class="driver-card">
      <div class="driver-info">
        <div class="driver-name">${driver.name}</div>
        <span class="driver-status driver-${driver.status}">${driver.status}</span>
      </div>
    </div>
  `).join('');
}

// Update driver markers on map
function updateDriverMarkers() {
  // Clear old markers
  driverMarkers.forEach(marker => map.removeLayer(marker));
  driverMarkers.clear();
  
  // Add new markers
  drivers.forEach(driver => {
    if (driver.currentLocation) {
      const marker = L.marker([driver.currentLocation.lat, driver.currentLocation.lng], {
        icon: L.divIcon({
          className: 'driver-marker',
          html: `<div style="background: ${driver.status === 'available' ? '#27ae60' : '#e74c3c'}; color: white; padding: 5px 8px; border-radius: 50%; font-weight: bold; text-align: center; width: 30px; height: 30px; line-height: 20px;">🚗</div>`,
          iconSize: [30, 30]
        })
      }).addTo(map);
      
      marker.bindPopup(`<strong>${driver.name}</strong><br>Status: ${driver.status}`);
      driverMarkers.set(driver.id, marker);
    }
  });
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

// Update single driver
function updateDriver(driver) {
  const index = drivers.findIndex(d => d.id === driver.id);
  if (index !== -1) {
    drivers[index] = driver;
  }
  updateDriversList();
  updateDriverMarkers();
}
