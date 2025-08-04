import React, { useState, useEffect } from 'react';
import LocationSearch from '../LocationSearch';
import { getLocationLabel } from '../../utils/routeCalculations';
import TRANSPORTATION_MODES from '../../constants/transportationModes';
import './MobileControls.css';

const MobileControls = ({ 
  onDirectionsCalculated,
  clickedLocation,
  onLocationUsed,
  locations = [null, null],
  legModes = ['walk'],
  onLocationsChange,
  onLegModesChange,
  directionsRoute,
  isAnimating,
  onStartAnimation,
  onStopAnimation,
  animationProgress = 0,
  onUndo,
  onClearHistory,
  canUndo = false
}) => {
  const [showCard, setShowCard] = useState(false);
  const [showAnimationControls, setShowAnimationControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState('regular');

  // Handle clicked location from map
  useEffect(() => {
    if (clickedLocation) {
      const newLocations = [...locations];
      const emptyIndex = newLocations.findIndex(loc => !loc);
      
      if (emptyIndex !== -1) {
        newLocations[emptyIndex] = clickedLocation;
        onLocationsChange(newLocations, 'ADD_LOCATION');
        
        // Auto-calculate route if we have both locations
        const filledLocations = newLocations.filter(loc => loc !== null);
        if (filledLocations.length >= 2) {
          calculateRoute(newLocations, legModes);
        }
        
        // Show the card when location is added
        setShowCard(true);
      }
      
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateRoute = (locs, modes) => {
    const filledLocations = locs.filter(loc => loc !== null);
    if (filledLocations.length >= 2 && onDirectionsCalculated) {
      const segments = [{
        mode: modes[0] || 'walk',
        startIndex: 0,
        endIndex: 1
      }];
      
      const routeData = {
        origin: filledLocations[0],
        destination: filledLocations[1],
        waypoints: [],
        mode: modes[0],
        segments,
        allLocations: filledLocations,
        allModes: modes,
        routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
      };
      
      onDirectionsCalculated(routeData);
      setShowCard(false); // Hide card after calculating route
    }
  };

  const updateLocation = (index, location) => {
    if (onLocationsChange) {
      const newLocations = [...locations];
      newLocations[index] = location;
      onLocationsChange(newLocations, location ? 'ADD_LOCATION' : 'CLEAR_LOCATION');
      
      const filledLocations = newLocations.filter(loc => loc !== null);
      if (filledLocations.length >= 2) {
        calculateRoute(newLocations, legModes);
      }
    }
  };

  const updateTransportMode = (mode) => {
    if (onLegModesChange) {
      const newModes = [mode];
      onLegModesChange(newModes, 0);
      
      // Update route if we have locations
      const filledLocations = locations.filter(loc => loc !== null);
      if (filledLocations.length >= 2) {
        calculateRoute(locations, newModes);
      }
    }
  };

  const handleClear = () => {
    if (onLocationsChange && onLegModesChange) {
      onLocationsChange([null, null], null);
      onLegModesChange(['walk']);
      onDirectionsCalculated(null);
      if (onClearHistory) {
        onClearHistory();
      }
    }
  };

  const handlePlayPause = () => {
    if (isAnimating) {
      setIsPaused(!isPaused);
      // TODO: Connect to actual pause functionality
    } else {
      setShowAnimationControls(true);
      if (onStartAnimation) {
        onStartAnimation();
      }
    }
  };

  const handleStop = () => {
    setShowAnimationControls(false);
    setIsPaused(false);
    if (onStopAnimation) {
      onStopAnimation();
    }
  };

  return (
    <div className="mobile-controls-container">
      {/* Compact Route Card */}
      <div className={`mobile-card ${!showCard ? 'collapsed' : ''}`}>
        <div className="mobile-quick-route">
          {/* Start Location */}
          <div className="mobile-route-row">
            <div className="mobile-route-marker start">A</div>
            {!locations[0] ? (
              <input 
                type="text"
                placeholder="Tap map or search..."
                className="mobile-route-input"
                onClick={() => {/* Will implement search */}}
                readOnly
              />
            ) : (
              <div className="mobile-route-input filled">
                {locations[0].name?.split(',')[0] || 'Location A'}
              </div>
            )}
          </div>

          {/* End Location */}
          <div className="mobile-route-row">
            <div className="mobile-route-marker end">B</div>
            {!locations[1] ? (
              <input 
                type="text"
                placeholder="Tap map for end..."
                className="mobile-route-input"
                onClick={() => {/* Will implement search */}}
                readOnly
              />
            ) : (
              <div className="mobile-route-input filled">
                {locations[1].name?.split(',')[0] || 'Location B'}
              </div>
            )}
          </div>

          {/* Transport Mode Pills */}
          <div className="mobile-transport-pills">
            {Object.entries(TRANSPORTATION_MODES).map(([mode, config]) => (
              <button
                key={mode}
                className={`mobile-transport-pill ${legModes[0] === mode ? 'active' : ''}`}
                onClick={() => updateTransportMode(mode)}
              >
                {config.icon}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mobile-actions">
            <button 
              className="mobile-action-btn secondary"
              onClick={onUndo}
              disabled={!canUndo}
              style={{ fontSize: '25px' }}
            >
              ↶
            </button>
            <button 
              className="mobile-action-btn secondary"
              onClick={handleClear}
              style={{ fontSize: '25px' }}
            >
              ⟲
            </button>
            <button 
              className="mobile-action-btn primary"
              onClick={() => calculateRoute(locations, legModes)}
              disabled={locations.filter(l => l).length < 2}
            >
              <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Animation Controls (when animating) */}
      {showAnimationControls && (
        <div className="mobile-animation-controls">
          <div className="mobile-animation-header">
            <span className="mobile-animation-title">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </span>
            <button 
              className="mobile-animation-close"
              onClick={handleStop}
              style={{ fontSize: '25px' }}
            >
              ×
            </button>
          </div>

          <div className="mobile-playback-controls">
            <button 
              className={`mobile-playback-btn ${isPaused ? 'play' : 'pause'}`}
              onClick={handlePlayPause}
              style={{ fontSize: '25px' }}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
            <button 
              className="mobile-playback-btn stop"
              onClick={handleStop}
              style={{ fontSize: '25px' }}
            >
              ⏹
            </button>
          </div>

          <div className="mobile-timeline">
            <div className="mobile-timeline-label">
              <span>Progress</span>
              <span>{Math.round(animationProgress)}%</span>
            </div>
            <div className="mobile-timeline-track">
              <div 
                className="mobile-timeline-progress"
                style={{ width: `${animationProgress}%` }}
              />
            </div>
          </div>

          <div className="mobile-speed-selector">
            <button 
              className={`mobile-speed-btn ${animationSpeed === 'slow' ? 'active' : ''}`}
              onClick={() => setAnimationSpeed('slow')}
            >
              Slow
            </button>
            <button 
              className={`mobile-speed-btn ${animationSpeed === 'regular' ? 'active' : ''}`}
              onClick={() => setAnimationSpeed('regular')}
            >
              Regular
            </button>
            <button 
              className={`mobile-speed-btn ${animationSpeed === 'fast' ? 'active' : ''}`}
              onClick={() => setAnimationSpeed('fast')}
            >
              Fast
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="mobile-fab-container">
        {/* Show animation button if route exists */}
        {directionsRoute && !showAnimationControls && (
          <button 
            className="mobile-fab secondary play"
            onClick={handlePlayPause}
            aria-label="Animate Route"
          >
            <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
        )}
        
        {/* Main FAB for route planning */}
        <button 
          className={`mobile-fab primary ${showCard ? 'secondary' : ''}`}
          onClick={() => setShowCard(!showCard)}
          aria-label="Plan Route"
          style={{ fontSize: '25px' }}
        >
          {showCard ? '×' : '🗺'}
        </button>
      </div>
    </div>
  );
};

export default MobileControls;