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
  isAnimating,
  showRouteAnimator
}) => {
  const [showCard, setShowCard] = useState(true);
  const [showSearchA, setShowSearchA] = useState(false);
  const [showSearchB, setShowSearchB] = useState(false);

  // Hide card when route animator is shown
  useEffect(() => {
    if (showRouteAnimator) {
      setShowCard(false);
    }
  }, [showRouteAnimator]);

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


  // Don't render anything if route animator is showing
  if (showRouteAnimator) {
    return null;
  }

  return (
    <div className="mobile-controls-container">
      {/* Compact Route Card */}
      <div className={`mobile-card ${!showCard ? 'collapsed' : ''}`}>
        <div className="mobile-card-header">
          <h4>Plan Your Route</h4>
          <button 
            className="mobile-card-close"
            onClick={() => setShowCard(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 9h8v1H4z"/>
            </svg>
          </button>
        </div>
        <div className="mobile-quick-route">
          {/* Start Location */}
          <div className="mobile-route-row">
            <div className="mobile-route-marker start">A</div>
            {showSearchA ? (
              <div className="mobile-search-container">
                <LocationSearch
                  onLocationSelect={(location) => {
                    const newLocations = [...locations];
                    newLocations[0] = location;
                    onLocationsChange(newLocations);
                    setShowSearchA(false);
                    
                    // If we have both locations, calculate route
                    if (newLocations[1]) {
                      calculateRoute(newLocations, legModes);
                    }
                  }}
                  placeholder="Search for point A..."
                />
                <button 
                  className="mobile-search-cancel"
                  onClick={() => setShowSearchA(false)}
                >
                  ×
                </button>
              </div>
            ) : !locations[0] ? (
              <input 
                type="text"
                placeholder="Tap map or search..."
                className="mobile-route-input"
                onClick={() => setShowSearchA(true)}
                readOnly
              />
            ) : (
              <div 
                className="mobile-route-input filled"
                onClick={() => setShowSearchA(true)}
              >
                {locations[0].name?.split(',')[0] || 'Location A'}
              </div>
            )}
          </div>

          {/* End Location */}
          <div className="mobile-route-row">
            <div className="mobile-route-marker end">B</div>
            {showSearchB ? (
              <div className="mobile-search-container">
                <LocationSearch
                  onLocationSelect={(location) => {
                    const newLocations = [...locations];
                    newLocations[1] = location;
                    onLocationsChange(newLocations);
                    setShowSearchB(false);
                    
                    // If we have both locations, calculate route
                    if (newLocations[0]) {
                      calculateRoute(newLocations, legModes);
                    }
                  }}
                  placeholder="Search for point B..."
                />
                <button 
                  className="mobile-search-cancel"
                  onClick={() => setShowSearchB(false)}
                >
                  ×
                </button>
              </div>
            ) : !locations[1] ? (
              <input 
                type="text"
                placeholder="Tap map for end..."
                className="mobile-route-input"
                onClick={() => setShowSearchB(true)}
                readOnly
              />
            ) : (
              <div 
                className="mobile-route-input filled"
                onClick={() => setShowSearchB(true)}
              >
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
                if (onUndo) {
                  try {
                    onUndo();
                  } catch (error) {
                    console.error('Undo error:', error);
                  }
                }
              }}
              disabled={!canUndo}
              style={{ height: '44px' }}
              title="Undo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
              </svg>
            </button>
            <button 
              className="mobile-action-btn secondary"
              onClick={handleClear}
              disabled={!canUndo && locations.filter(l => l).length === 0}
              style={{ height: '44px' }}
              title="Clear All"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
            <button 
              className="mobile-action-btn primary"
              onClick={() => {
                if (directionsRoute && onShowAnimator) {
                  onShowAnimator();
                  // Card will auto-hide via useEffect when showRouteAnimator changes
                } else {
                  calculateRoute(locations, legModes);
                }
              }}
              disabled={locations.filter(l => l).length < 2}
              title={directionsRoute ? "Animate Route" : "Calculate Route"}
              style={{ height: '44px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>


      {/* Main FAB for route planning - only show when card is closed */}
      {!showCard && (
        <div className="mobile-fab-container">
          <button 
            className="unified-icon primary"
            onClick={() => setShowCard(true)}
            aria-label="Plan Route"
            style={{ position: 'fixed', left: '20px', bottom: '20px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M9 9l6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileControls;