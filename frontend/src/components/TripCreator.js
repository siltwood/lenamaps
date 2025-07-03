import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TripCreator = ({ 
  isCreating, 
  onClose, 
  onTripCreated, 
  waypoints, 
  segments, 
  onWaypointsChange, 
  onSegmentsChange,
  onTransportationModeChange,
  currentTransportationMode = 'walk'
}) => {
  const [tripName, setTripName] = useState('');
  const [transportationModes, setTransportationModes] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch available transportation modes
    const fetchModes = async () => {
      try {
        const response = await axios.get('/api/transportation-modes');
        setTransportationModes(response.data);
      } catch (error) {
        console.error('Error fetching transportation modes:', error);
      }
    };
    
    if (isCreating) {
      fetchModes();
    }
  }, [isCreating]);

  const removeLastWaypoint = () => {
    if (waypoints.length === 0) return;
    
    const updatedWaypoints = waypoints.slice(0, -1);
    onWaypointsChange(updatedWaypoints);
    
    // Remove the last segment if it exists
    if (segments.length > 0) {
      onSegmentsChange(segments.slice(0, -1));
    }
  };

  const clearTrip = () => {
    onWaypointsChange([]);
    onSegmentsChange([]);
    setTripName('');
  };

  const saveTrip = async () => {
    if (!tripName.trim()) {
      alert('Please enter a trip name');
      return;
    }
    
    if (waypoints.length < 2) {
      alert('Please add at least 2 waypoints to create a trip');
      return;
    }

    setSaving(true);
    try {
      const tripData = {
        name: tripName.trim(),
        waypoints: waypoints,
        segments: segments
      };

      const response = await axios.post('/api/trips', tripData);
      onTripCreated(response.data);
      clearTrip();
      onClose();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Error saving trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isCreating) return null;

  return (
    <>
      {/* Transportation Mode Selector - Floating Toolbar */}
      <div className="transportation-toolbar">
        <div className="toolbar-section">
          <h4>Select Transportation:</h4>
          <div className="transportation-modes">
            {Object.entries(transportationModes).map(([key, mode]) => (
              <button
                key={key}
                className={`transport-btn ${currentTransportationMode === key ? 'active' : ''}`}
                onClick={() => onTransportationModeChange(key)}
                title={mode.name}
              >
                <span className="transport-icon">{mode.icon}</span>
                <span className="transport-name">{mode.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="toolbar-section">
          <div className="trip-stats">
            <span>Waypoints: {waypoints.length}</span>
            <span>Segments: {segments.length}</span>
          </div>
        </div>

        <div className="toolbar-actions">
          <button onClick={removeLastWaypoint} disabled={waypoints.length === 0} className="btn-small btn-secondary">
            Undo
          </button>
          <button onClick={clearTrip} disabled={waypoints.length === 0} className="btn-small btn-secondary">
            Clear
          </button>
          <button onClick={onClose} className="btn-small btn-secondary">
            Cancel
          </button>
        </div>
      </div>

      {/* Trip Name Modal - Only show when ready to save */}
      {waypoints.length >= 2 && (
        <div className="save-trip-modal">
          <div className="save-trip-content">
            <h3>Save Your Trip</h3>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Enter trip name..."
              className="trip-name-input"
            />
            <div className="save-actions">
              <button onClick={saveTrip} disabled={!tripName.trim() || saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TripCreator; 