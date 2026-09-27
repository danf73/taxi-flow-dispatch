const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('public'));

// Authentication data
let users = [
  { id: 1, username: 'admin', password: hashPassword('admin123'), name: 'Admin User', role: 'staff' },
  { id: 2, username: 'dispatcher', password: hashPassword('dispatch123'), name: 'Dispatcher One', role: 'staff' }
];

let sessions = new Map(); // token -> { userId, role, expiresAt }

// Simple password hashing (in production, use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate auth token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify auth middleware
function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const session = sessions.get(token);
  
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.user = session;
  next();
}

// Data stores (in production, use a database)
let jobs = [];
let jobHistory = [];
let customers = [];
let drivers = [
  { 
    id: 1, 
    name: 'John Driver', 
    pin: '1234',
    status: 'offline',
    shiftStatus: 'off-duty',
    currentLocation: { lat: 51.5074, lng: -0.1278 },
    vehicleType: 'sedan',
    vehicleNumber: 'ABC123',
    phone: '+44 7700 900001',
    email: 'john@taxiflow.com',
    photo: 'https://i.pravatar.cc/150?img=12',
    rating: 4.8,
    totalJobs: 156,
    todayEarnings: 0,
    totalEarnings: 12450.50
  },
  { 
    id: 2, 
    name: 'Sarah Transport', 
    pin: '2345',
    status: 'offline',
    shiftStatus: 'off-duty',
    currentLocation: { lat: 51.5154, lng: -0.1419 },
    vehicleType: 'suv',
    vehicleNumber: 'XYZ789',
    phone: '+44 7700 900002',
    email: 'sarah@taxiflow.com',
    photo: 'https://i.pravatar.cc/150?img=5',
    rating: 4.9,
    totalJobs: 203,
    todayEarnings: 0,
    totalEarnings: 18920.25
  },
  { 
    id: 3, 
    name: 'Mike Taxi', 
    pin: '3456',
    status: 'offline',
    shiftStatus: 'off-duty',
    currentLocation: { lat: 51.5014, lng: -0.1419 },
    vehicleType: 'sedan',
    vehicleNumber: 'DEF456',
    phone: '+44 7700 900003',
    email: 'mike@taxiflow.com',
    photo: 'https://i.pravatar.cc/150?img=33',
    rating: 4.7,
    totalJobs: 189,
    todayEarnings: 0,
    totalEarnings: 15780.00
  },
  { 
    id: 4, 
    name: 'Emma Ride', 
    pin: '4567',
    status: 'offline',
    shiftStatus: 'off-duty',
    currentLocation: { lat: 51.5274, lng: -0.1378 },
    vehicleType: 'van',
    vehicleNumber: 'GHI789',
    phone: '+44 7700 900004',
    email: 'emma@taxiflow.com',
    photo: 'https://i.pravatar.cc/150?img=9',
    rating: 4.9,
    totalJobs: 167,
    todayEarnings: 0,
    totalEarnings: 14230.75
  }
];

let jobIdCounter = 1;
let customerIdCounter = 1;

// Vehicle type pricing multipliers
const vehicleTypes = {
  sedan: { name: 'Standard Sedan', multiplier: 1.0, capacity: 4 },
  suv: { name: 'SUV', multiplier: 1.4, capacity: 6 },
  van: { name: 'Van', multiplier: 1.6, capacity: 8 },
  luxury: { name: 'Luxury', multiplier: 2.0, capacity: 4 },
  wheelchair: { name: 'Wheelchair Accessible', multiplier: 1.3, capacity: 3 }
};

// Payment methods
const paymentMethods = ['cash', 'card', 'account', 'app'];

// Analytics data
let analytics = {
  today: {
    revenue: 0,
    jobs: 0,
    completedJobs: 0,
    cancelledJobs: 0
  },
  thisWeek: {
    revenue: 0,
    jobs: 0
  },
  thisMonth: {
    revenue: 0,
    jobs: 0
  }
};

// WebSocket connections
let connections = new Map(); // connectionId -> { ws, type: 'reception' | 'driver', driverId }

// Broadcast to all connections of a specific type
function broadcast(type, data) {
  connections.forEach((conn, id) => {
    if (conn.type === type && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(data));
    }
  });
}

// Broadcast to specific driver
function sendToDriver(driverId, data) {
  connections.forEach((conn, id) => {
    if (conn.type === 'driver' && conn.driverId === driverId && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  const connectionId = Date.now() + Math.random();
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'register') {
        connections.set(connectionId, {
          ws,
          type: data.role, // 'reception' or 'driver'
          driverId: data.driverId
        });
        
        // Send initial data
        if (data.role === 'reception') {
          ws.send(JSON.stringify({
            type: 'initial_data',
            jobs,
            drivers
          }));
        } else if (data.role === 'driver') {
          const driverJobs = jobs.filter(j => 
            j.status === 'pending' || 
            (j.assignedDriverId === data.driverId && j.status !== 'completed')
          );
          ws.send(JSON.stringify({
            type: 'initial_data',
            jobs: driverJobs
          }));
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    connections.delete(connectionId);
  });
});

// Authentication routes
app.post('/api/auth/login/staff', (req, res) => {
  const { username, password, remember } = req.body;
  
  const user = users.find(u => u.username === username && u.role === 'staff');
  
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  const token = generateToken();
  const expiresAt = Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000); // 30 days or 1 day
  
  sessions.set(token, {
    userId: user.id,
    role: user.role,
    expiresAt
  });
  
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    }
  });
});

app.post('/api/auth/login/driver', (req, res) => {
  const { driverId, pin, remember } = req.body;
  
  const driver = drivers.find(d => d.id === driverId);
  
  if (!driver || driver.pin !== pin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  
  const token = generateToken();
  const expiresAt = Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
  
  sessions.set(token, {
    userId: driver.id,
    role: 'driver',
    expiresAt
  });
  
  res.json({
    token,
    user: {
      id: driver.id,
      name: driver.name,
      role: 'driver'
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const session = sessions.get(token);
  
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  let user;
  if (session.role === 'staff') {
    user = users.find(u => u.id === session.userId);
  } else if (session.role === 'driver') {
    user = drivers.find(d => d.id === session.userId);
  }
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  res.json({
    user: {
      id: user.id,
      name: user.name,
      role: session.role
    }
  });
});

// Geocoding - Convert address to coordinates using Nominatim (OpenStreetMap)
app.post('/api/geocode', async (req, res) => {
  const { address } = req.body;
  
  try {
    const fetch = (await import('node-fetch')).default;
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TaxiDispatchSystem/1.0'
      }
    });
    
    const data = await response.json();
    
    const results = data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance
    }));
    
    res.json(results);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// WebSocket connection

// Get all jobs
app.get('/api/jobs', (req, res) => {
  const { status, driverId } = req.query;
  let filteredJobs = jobs;
  
  if (status) {
    filteredJobs = filteredJobs.filter(j => j.status === status);
  }
  
  if (driverId) {
    filteredJobs = filteredJobs.filter(j => j.assignedDriverId === parseInt(driverId));
  }
  
  res.json(filteredJobs);
});

// Get job history
app.get('/api/jobs/history', (req, res) => {
  res.json(jobHistory);
});

// Get customers
app.get('/api/customers', (req, res) => {
  res.json(customers);
});

// Search customers
app.get('/api/customers/search', (req, res) => {
  const { query } = req.query;
  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.phone.includes(query)
  );
  res.json(filtered);
});

// Create customer
app.post('/api/customers', (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  
  const customer = {
    id: customerIdCounter++,
    name,
    phone,
    email: email || '',
    address: address || '',
    notes: notes || '',
    totalJobs: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString()
  };
  
  customers.push(customer);
  res.json(customer);
});

// Get analytics
app.get('/api/analytics', (req, res) => {
  res.json(analytics);
});

// Get analytics with driver breakdown
app.get('/api/analytics/drivers', (req, res) => {
  const driverStats = drivers.map(driver => {
    const driverJobs = jobHistory.filter(j => j.assignedDriverId === driver.id);
    const todayJobs = driverJobs.filter(j => 
      new Date(j.completedAt).toDateString() === new Date().toDateString()
    );
    
    return {
      id: driver.id,
      name: driver.name,
      rating: driver.rating,
      totalJobs: driver.totalJobs,
      todayJobs: todayJobs.length,
      todayEarnings: driver.todayEarnings,
      totalEarnings: driver.totalEarnings,
      status: driver.status,
      shiftStatus: driver.shiftStatus
    };
  });
  
  res.json(driverStats);
});

// Get all drivers
app.get('/api/drivers', (req, res) => {
  res.json(drivers);
});

// Create new job
app.post('/api/jobs', async (req, res) => {
  const { pickup, dropoff, customerName, customerPhone, customerId, notes, vehicleType, paymentMethod, scheduledTime } = req.body;
  
  // Find or create customer
  let customer = null;
  if (customerId) {
    customer = customers.find(c => c.id === customerId);
  } else {
    // Check if customer exists
    customer = customers.find(c => c.phone === customerPhone);
    if (!customer) {
      customer = {
        id: customerIdCounter++,
        name: customerName,
        phone: customerPhone,
        email: '',
        address: '',
        notes: '',
        totalJobs: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString()
      };
      customers.push(customer);
    }
  }
  
  // Calculate price
  const pricing = await calculatePrice(pickup, dropoff, vehicleType || 'sedan');
  
  const job = {
    id: jobIdCounter++,
    pickup,
    dropoff,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerId: customer.id,
    notes: notes || '',
    status: scheduledTime ? 'scheduled' : 'pending', // scheduled, pending, dispatched, accepted, arrived, picked_up, in_progress, completed, cancelled
    assignedDriverId: null,
    vehicleType: vehicleType || 'sedan',
    paymentMethod: paymentMethod || 'cash',
    estimatedPrice: pricing.price,
    finalPrice: null,
    distance: pricing.distance,
    duration: pricing.duration,
    scheduledTime: scheduledTime || null,
    createdAt: new Date().toISOString(),
    dispatchedAt: null,
    acceptedAt: null,
    arrivedAt: null,
    pickedUpAt: null,
    completedAt: null
  };
  
  jobs.push(job);
  
  // Update analytics
  analytics.today.jobs++;
  analytics.thisWeek.jobs++;
  analytics.thisMonth.jobs++;
  
  // Broadcast to all drivers and reception
  broadcast('driver', { type: 'new_job', job });
  broadcast('reception', { type: 'job_created', job });
  
  res.json(job);
});

// Driver accepts job
app.post('/api/jobs/:id/accept', (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;
  
  const job = jobs.find(j => j.id === parseInt(id));
  const driver = drivers.find(d => d.id === driverId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  if (driver.shiftStatus !== 'on-duty') {
    return res.status(400).json({ error: 'Driver must be on duty to accept jobs' });
  }
  
  if (job.status !== 'pending' && job.status !== 'dispatched' && job.status !== 'scheduled') {
    return res.status(400).json({ error: 'Job already accepted or completed' });
  }
  
  job.status = 'accepted';
  job.assignedDriverId = driverId;
  job.acceptedAt = new Date().toISOString();
  
  driver.status = 'busy';
  
  // Notify reception and all drivers
  broadcast('reception', { type: 'job_updated', job, driver });
  broadcast('driver', { type: 'job_accepted', job, driver });
  
  res.json({ job, driver });
});

// Driver declines job
app.post('/api/jobs/:id/decline', (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;
  
  const job = jobs.find(j => j.id === parseInt(id));
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Just log the decline, job remains available for other drivers
  console.log(`Driver ${driverId} declined job ${id}`);
  
  res.json({ message: 'Job declined' });
});

// Update job status
app.put('/api/jobs/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, finalPrice, rating } = req.body;
  
  const job = jobs.find(j => j.id === parseInt(id));
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const oldStatus = job.status;
  job.status = status;
  
  // Update timestamps based on status
  if (status === 'arrived') {
    job.arrivedAt = new Date().toISOString();
  } else if (status === 'picked_up') {
    job.pickedUpAt = new Date().toISOString();
  } else if (status === 'in_progress' && !job.pickedUpAt) {
    job.pickedUpAt = new Date().toISOString();
  } else if (status === 'completed') {
    job.completedAt = new Date().toISOString();
    job.finalPrice = finalPrice || job.estimatedPrice;
    
    if (job.assignedDriverId) {
      const driver = drivers.find(d => d.id === job.assignedDriverId);
      if (driver) {
        driver.status = 'available';
        driver.todayEarnings += job.finalPrice;
        driver.totalEarnings += job.finalPrice;
        driver.totalJobs++;
        
        if (rating) {
          driver.rating = ((driver.rating * (driver.totalJobs - 1)) + rating) / driver.totalJobs;
        }
      }
    }
    
    // Update customer stats
    const customer = customers.find(c => c.id === job.customerId);
    if (customer) {
      customer.totalJobs++;
      customer.totalSpent += job.finalPrice;
    }
    
    // Update analytics
    analytics.today.revenue += job.finalPrice;
    analytics.today.completedJobs++;
    analytics.thisWeek.revenue += job.finalPrice;
    analytics.thisMonth.revenue += job.finalPrice;
    
    // Move to history
    jobHistory.unshift(job);
    jobs = jobs.filter(j => j.id !== job.id);
  } else if (status === 'cancelled') {
    analytics.today.cancelledJobs++;
    jobHistory.unshift(job);
    jobs = jobs.filter(j => j.id !== job.id);
    
    if (job.assignedDriverId) {
      const driver = drivers.find(d => d.id === job.assignedDriverId);
      if (driver) {
        driver.status = 'available';
      }
    }
  }
  
  if (status === 'completed' || status === 'cancelled') {
    const driver = job.assignedDriverId ? drivers.find(d => d.id === job.assignedDriverId) : null;
    broadcast('reception', { type: 'job_completed', job, driver });
    broadcast('driver', { type: 'job_completed', job, driver });
  } else {
    const driver = job.assignedDriverId ? drivers.find(d => d.id === job.assignedDriverId) : null;
    broadcast('reception', { type: 'job_updated', job, driver });
    broadcast('driver', { type: 'job_updated', job, driver });
  }
  
  res.json(job);
});

// Driver shift management
app.post('/api/drivers/:id/shift', (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'start' or 'end'
  
  const driver = drivers.find(d => d.id === parseInt(id));
  
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  if (action === 'start') {
    driver.shiftStatus = 'on-duty';
    driver.status = 'available';
    driver.todayEarnings = 0;
  } else if (action === 'end') {
    driver.shiftStatus = 'off-duty';
    driver.status = 'offline';
  }
  
  broadcast('reception', { type: 'driver_updated', driver });
  
  res.json(driver);
});

// Update driver location
app.post('/api/drivers/:id/location', (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;
  
  const driver = drivers.find(d => d.id === parseInt(id));
  
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  driver.currentLocation = { lat, lng };
  
  broadcast('reception', { type: 'driver_location', driver });
  
  res.json({ success: true });
});

// Calculate pricing based on distance, time, weather, and vehicle type
async function calculatePrice(pickup, dropoff, vehicleType = 'sedan') {
  // Calculate distance using Haversine formula
  const distance = calculateDistance(
    pickup.lat, pickup.lng,
    dropoff.lat, dropoff.lng
  );
  
  // Base price per mile/km
  let pricePerKm = 2.5;
  
  // Vehicle type multiplier
  const vehicleMultiplier = vehicleTypes[vehicleType]?.multiplier || 1.0;
  
  // Time-based surge pricing
  const hour = new Date().getHours();
  let timeSurge = 1.0;
  
  if (hour >= 17 && hour <= 19) {
    // Rush hour
    timeSurge = 1.5;
  } else if (hour >= 22 || hour <= 5) {
    // Night time
    timeSurge = 1.3;
  }
  
  // Weather-based surge (simulated - in production, use weather API)
  const weatherSurge = await getWeatherSurge(pickup.lat, pickup.lng);
  
  // Calculate final price
  const basePrice = 5.0; // Minimum fare
  const distancePrice = distance * pricePerKm;
  const totalPrice = (basePrice + distancePrice) * vehicleMultiplier * timeSurge * weatherSurge;
  
  // Estimated duration (simplified - 40 km/h average speed)
  const duration = Math.ceil((distance / 40) * 60); // minutes
  
  return {
    price: parseFloat(totalPrice.toFixed(2)),
    distance: parseFloat(distance.toFixed(2)),
    duration,
    breakdown: {
      base: basePrice,
      distance: parseFloat(distancePrice.toFixed(2)),
      vehicleMultiplier: vehicleMultiplier,
      timeSurge: timeSurge,
      weatherSurge: weatherSurge
    }
  };
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Simulated weather surge (in production, integrate with OpenWeatherMap or similar)
async function getWeatherSurge(lat, lng) {
  // Simulate weather conditions
  const rand = Math.random();
  
  if (rand < 0.1) {
    // 10% chance of bad weather (rain/snow)
    return 1.4;
  } else if (rand < 0.3) {
    // 20% chance of moderate weather
    return 1.2;
  }
  
  return 1.0; // Normal weather
}

// Serve HTML pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reception.html'));
});

app.get('/driver', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'driver.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Reception: http://localhost:${PORT}`);
  console.log(`Driver App: http://localhost:${PORT}/driver`);
});
