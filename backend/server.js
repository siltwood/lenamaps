const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Transportation modes configuration
const transportationModes = {
  walk: { color: '#3b82f6', icon: '🚶' },
  bike: { color: '#22c55e', icon: '🚴' },
  bus: { color: '#ef4444', icon: '🚌' },
  car: { color: '#f59e0b', icon: '🚗' }
};

// No saved trips
const trips = [];

// GET all trips (read-only)
app.get('/api/trips', (req, res) => {
  res.json(trips);
});

// GET transportation modes
app.get('/api/transportation-modes', (req, res) => {
  res.json(transportationModes);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Transportation modes endpoint: http://localhost:${PORT}/api/transportation-modes`);
  console.log(`Trips endpoint: http://localhost:${PORT}/api/trips`);
});