import React from 'react';

const TripSidebar = ({ trips, selectedTrip, onTripSelect, isCollapsed }) => {
  const calculateTripStats = (trip) => {
    const totalDistance = trip.segments.reduce((sum, segment) => sum + (segment.distance || 0), 0);
    const totalDuration = trip.segments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
    const uniqueModes = [...new Set(trip.segments.map(s => s.mode))];
    
    return {
      stops: trip.waypoints.length,
      distance: (totalDistance / 1000).toFixed(1), // Convert to km
      duration: Math.round(totalDuration / 60), // Convert to minutes
      modes: uniqueModes
    };
  };

  const getModeEmoji = (mode) => {
    const modeEmojis = {
      walk: '🚶',
      bike: '🚴',
      bus: '🚌',
      car: '🚗'
    };
    return modeEmojis[mode] || '🚶';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>Saved Trips</h2>
      </div>
      
      <div className="trip-list">
        {trips.length === 0 ? (
          <p className="no-trips">No saved trips yet</p>
        ) : (
          trips.map((trip) => {
            const stats = calculateTripStats(trip);
            return (
              <div
                key={trip.id}
                className={`trip-item ${selectedTrip?.id === trip.id ? 'selected' : ''}`}
                onClick={() => onTripSelect(trip)}
              >
                <div className="trip-header">
                  <h3>{trip.name}</h3>
                </div>
                
                <div className="trip-stats">
                  <span className="stat">
                    <span className="stat-icon">📍</span>
                    {stats.stops} stops
                  </span>
                  <span className="stat">
                    <span className="stat-icon">📏</span>
                    {stats.distance} km
                  </span>
                  <span className="stat">
                    <span className="stat-icon">⏱️</span>
                    {stats.duration} min
                  </span>
                </div>
                
                <div className="trip-modes">
                  {stats.modes.map(mode => (
                    <span key={mode} className="mode-tag">
                      {getModeEmoji(mode)}
                    </span>
                  ))}
                </div>
                
                <div className="trip-date">
                  {formatDate(trip.created_at)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TripSidebar;