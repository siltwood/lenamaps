const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Transportation modes configuration
const transportationModes = {
  bike: { color: "#22c55e", icon: "🚴‍♀️", name: "Bike" },
  bus: { color: "#3b82f6", icon: "🚌", name: "Bus" },
  walk: { color: "#f59e0b", icon: "🚶‍♀️", name: "Walk" },
  car: { color: "#ef4444", icon: "🚗", name: "Car" },
  subway: { color: "#8b5cf6", icon: "🚇", name: "Subway" },
  train: { color: "#06b6d4", icon: "🚆", name: "Train" },
  flight: { color: "#0ea5e9", icon: "✈️", name: "Flight" },
  scooter: { color: "#f97316", icon: "🛴", name: "Scooter" },
  uber: { color: "#000000", icon: "🚕", name: "Uber/Taxi" }
};

// Sample trip data
let trips = [];

let nextTripId = 1;

// Routes
app.get('/api/trips', (req, res) => {
  res.json(trips);
});

app.get('/api/trips/:id', (req, res) => {
  const trip = trips.find(t => t.id === parseInt(req.params.id));
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  res.json(trip);
});

app.post('/api/trips', (req, res) => {
  const { name, waypoints, segments } = req.body;
  
  if (!name || !waypoints || waypoints.length < 2) {
    return res.status(400).json({ error: 'Trip must have a name and at least 2 waypoints' });
  }

  // Generate segments from waypoints
  const tripSegments = segments || [];
  for (let i = 0; i < tripSegments.length; i++) {
    const mode = tripSegments[i].mode || 'walk';
    const modeConfig = transportationModes[mode] || transportationModes.walk;
    
    tripSegments[i] = {
      id: i + 1,
      mode: mode,
      coordinates: [waypoints[i], waypoints[i + 1]],
      color: modeConfig.color,
      icon: modeConfig.icon
    };
  }

  const newTrip = {
    id: nextTripId++,
    name: name,
    segments: tripSegments,
    createdAt: new Date().toISOString()
  };

  trips.push(newTrip);
  res.status(201).json(newTrip);
});

app.put('/api/trips/:id', (req, res) => {
  const tripId = parseInt(req.params.id);
  const tripIndex = trips.findIndex(t => t.id === tripId);
  
  if (tripIndex === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const { name, waypoints, segments } = req.body;
  
  // Update segments with new transportation modes
  const updatedSegments = segments || [];
  for (let i = 0; i < updatedSegments.length; i++) {
    const mode = updatedSegments[i].mode || 'walk';
    const modeConfig = transportationModes[mode] || transportationModes.walk;
    
    updatedSegments[i] = {
      id: i + 1,
      mode: mode,
      coordinates: [waypoints[i], waypoints[i + 1]],
      color: modeConfig.color,
      icon: modeConfig.icon
    };
  }

  trips[tripIndex] = {
    ...trips[tripIndex],
    name: name || trips[tripIndex].name,
    segments: updatedSegments,
    updatedAt: new Date().toISOString()
  };

  res.json(trips[tripIndex]);
});

app.delete('/api/trips/:id', (req, res) => {
  const tripId = parseInt(req.params.id);
  const tripIndex = trips.findIndex(t => t.id === tripId);
  
  if (tripIndex === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  trips.splice(tripIndex, 1);
  res.status(204).send();
});

app.get('/api/transportation-modes', (req, res) => {
  res.json(transportationModes);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 