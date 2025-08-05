import React, { useState, useEffect } from 'react';
import LocationSearch from '../LocationSearch';
import { getLocationLabel } from '../../utils/routeCalculations';
import TRANSPORTATION_MODES from '../../constants/transportationModes';
import '../../styles/unified-icons.css';
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
  onUndo,
  onClearHistory,
  canUndo = false,
  onShowAnimator,
  isAnimating
}) => {
  const [showCard, setShowCard] = useState(true); // Start expanded

  // Handle clicked location from map - ONLY when card is open (like desktop)
  useEffect(() => {
    if (clickedLocation && showCard) {
      const newLocations = [...locations];
      const emptyIndex = newLocations.findIndex(loc => !loc);
      
      if (emptyIndex !== -1) {
        newLocations[emptyIndex] = clickedLocation;
        onLocationsChange(newLocations, 'ADD_LOCATION');
        
        // Calculate route or show marker
        calculateRoute(newLocations, legModes);
      }
      
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateRoute = (locs, modes) => {
    const filledLocations = locs.filter(loc => loc !== null);
    if (filledLocations.length >= 1 && onDirectionsCalculated) {
      if (filledLocations.length === 1) {
        // Single location - just show marker
        const routeData = {
          origin: filledLocations[0],
          destination: null,
          waypoints: [],
          mode: modes[0] || 'walk',
          segments: [],
          allLocations: locs,
          allModes: modes,
          routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
        };
        onDirectionsCalculated(routeData);
      } else {
        // Multiple locations - create route with all segments
        const segments = [];
        for (let i = 0; i < filledLocations.length - 1; i++) {
          segments.push({
            mode: modes[i] || 'walk',
            startIndex: i,
            endIndex: i + 1
          });
        }
        
        const routeData = {
          origin: filledLocations[0],
          destination: filledLocations[filledLocations.length - 1],
          waypoints: filledLocations.slice(1, -1),
          mode: modes[0],
          segments,
          allLocations: locs,
          allModes: modes,
          routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
        };
        
        onDirectionsCalculated(routeData);
        // Don't hide card - let user add more waypoints if they want
      }
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
    try {
      if (onLocationsChange && onLegModesChange) {
        onLocationsChange([null, null], null);
        onLegModesChange(['walk']);
        onDirectionsCalculated(null);
        if (onClearHistory) {
          onClearHistory();
        }
      }
    } catch (error) {
      console.error('Clear error:', error);
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
              onClick={() => {
                console.log('Undo button clicked, canUndo:', canUndo);
                if (onUndo) {
                  try {
                    onUndo();
                  } catch (error) {
                    console.error('Undo error:', error);
                  }
                }
              }}
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
              onClick={() => {
                console.log('Camera button clicked - directionsRoute:', !!directionsRoute, 'onShowAnimator:', !!onShowAnimator);
                console.log('directionsRoute details:', directionsRoute);
                if (directionsRoute && onShowAnimator) {
                  onShowAnimator();
                  setShowCard(false); // Hide the card when showing animator
                } else {
                  console.log('No route, calculating new route...');
                  calculateRoute(locations, legModes);
                }
              }}
              disabled={locations.filter(l => l).length < 2}
              title={directionsRoute ? "Animate Route" : "Calculate Route"}
            >
              <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>


      {/* Main FAB for route planning */}
      <div className="mobile-fab-container">
        <button 
          className="unified-icon primary"
          onClick={() => setShowCard(!showCard)}
          aria-label="Plan Route"
          style={{ position: 'fixed', right: '20px', bottom: '20px' }}
        >
          {showCard ? (
            <span style={{ fontSize: '28px', lineHeight: '1' }}>×</span>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M9 9l6 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileControls;