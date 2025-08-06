import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationSearch from '../LocationSearch';
import { getLocationLabel } from '../../utils/routeCalculations';
import TRANSPORTATION_MODES from '../../constants/transportationModes';
import { isMobileDevice } from '../../utils/deviceDetection';
import './DirectionsPanel.mobile.css';

const DirectionsPanelMobile = ({ 
  onDirectionsCalculated, 
  isOpen,
  onClose,
  clickedLocation,
  onLocationUsed,
  locations = [null, null],
  legModes = ['walk'],
  onLocationsChange,
  onLegModesChange,
  onUndo,
  onClearHistory,
  canUndo = false,
  lastAction = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const panelRef = useRef(null);
  const contentRef = useRef(null);

  // Check if we're on mobile
  const isMobile = isMobileDevice();

  // Handle clicked location from map
  useEffect(() => {
    if (clickedLocation && isOpen) {
      if (onLocationsChange) {
        const newLocations = [...locations];
        const emptyIndex = newLocations.findIndex(loc => !loc);
        
        if (emptyIndex !== -1) {
          newLocations[emptyIndex] = clickedLocation;
          onLocationsChange(newLocations, 'ADD_LOCATION');
          
          // Auto-calculate route if we have enough locations
          const filledLocations = newLocations.filter(loc => loc !== null);
          if (filledLocations.length >= 2) {
            calculateRoute(newLocations, legModes);
          } else if (filledLocations.length === 1) {
            // Show single marker
            showSingleMarker(newLocations, legModes);
          }
          
          // Expand panel when location is added
          if (isMobile) {
            setIsExpanded(true);
          }
        }
      }
      
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateRoute = (locs, modes) => {
    const filledLocations = locs.filter(loc => loc !== null);
    if (filledLocations.length >= 2 && onDirectionsCalculated) {
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
        allLocations: filledLocations,
        allModes: modes,
        routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
      };
      
      onDirectionsCalculated(routeData);
    }
  };

  const showSingleMarker = (locs, modes) => {
    const filledLocations = locs.filter(loc => loc !== null);
    if (filledLocations.length === 1 && onDirectionsCalculated) {
      const routeData = {
        origin: filledLocations[0],
        destination: null,
        waypoints: [],
        mode: modes[0],
        segments: [],
        allLocations: filledLocations,
        allModes: modes,
        routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
      };
      onDirectionsCalculated(routeData);
    }
  };

  const updateLocation = (index, location) => {
    if (onLocationsChange) {
      const newLocations = [...locations];
      newLocations[index] = location;
      const actionType = location ? 'ADD_LOCATION' : 'CLEAR_LOCATION';
      onLocationsChange(newLocations, actionType);
      
      const filledLocations = newLocations.filter(loc => loc !== null);
      if (filledLocations.length >= 2) {
        calculateRoute(newLocations, legModes);
      } else if (filledLocations.length === 1) {
        showSingleMarker(newLocations, legModes);
      } else {
        onDirectionsCalculated(null);
      }
    }
  };

  const updateLegMode = (index, mode) => {
    if (onLegModesChange) {
      const newModes = [...legModes];
      newModes[index] = mode;
      onLegModesChange(newModes, index);
      
      // Update route with new mode
      const filledLocations = locations.filter(loc => loc !== null);
      if (filledLocations.length >= 2) {
        calculateRoute(locations, newModes);
      } else if (filledLocations.length === 1) {
        showSingleMarker(locations, newModes);
      }
    }
  };

  const addNextLeg = () => {
    if (onLocationsChange && onLegModesChange) {
      onLocationsChange([...locations, null], 'ADD_DESTINATION');
      onLegModesChange([...legModes, 'walk']);
    }
  };

  const removeLocation = (index) => {
    if (index === 0 || index === 1) return;
    
    if (onLocationsChange && onLegModesChange) {
      const newLocations = locations.filter((_, i) => i !== index);
      const newModes = [...legModes];
      if (index <= legModes.length) {
        newModes.splice(index - 1, 1);
      }
      
      onLocationsChange(newLocations, 'REMOVE_LOCATION');
      onLegModesChange(newModes);
      
      const filledLocations = newLocations.filter(loc => loc !== null);
      if (filledLocations.length >= 2) {
        calculateRoute(newLocations, newModes);
      } else {
        onDirectionsCalculated(null);
      }
    }
  };

  const handleReset = () => {
    if (onLocationsChange && onLegModesChange) {
      onLocationsChange([null, null], null);
      onLegModesChange(['walk']);
    }
    if (onClearHistory) {
      onClearHistory();
    }
    if (onDirectionsCalculated) {
      onDirectionsCalculated({
        routeId: 'empty',
        allLocations: [],
        allModes: []
      });
    }
  };

  // Touch handlers for swipe gesture
  const handleTouchStart = (e) => {
    if (e.target.closest('.mobile-drag-handle')) {
      setIsDragging(true);
      setDragStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    
    const deltaY = e.touches[0].clientY - dragStartY;
    setTranslateY(Math.max(0, deltaY)); // Only allow dragging down
  }, [isDragging, dragStartY]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If dragged more than 100px, close the panel
    if (translateY > 100) {
      setIsExpanded(false);
    }
    
    setTranslateY(0);
  }, [translateY]);

  // Add touch event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  if (!isOpen) return null;

  // Mobile layout
  if (isMobile) {
    return (
      <>
        {/* Floating Action Button */}
        <button 
          className={`mobile-fab ${isExpanded ? 'hide' : ''}`}
          onClick={() => setIsExpanded(true)}
          aria-label="Plan Route"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <path d="M9 9l6 6" />
          </svg>
        </button>

        {/* Mobile Bottom Sheet */}
        <div className="directions-panel-mobile-wrapper">
          <div 
            className={`directions-panel-mobile-backdrop ${isExpanded ? 'visible' : ''}`}
            onClick={() => setIsExpanded(false)}
          />
          
          <div 
            ref={panelRef}
            className={`directions-panel-mobile ${isExpanded ? 'open' : ''}`}
            style={{ transform: translateY ? `translateY(${translateY}px)` : undefined }}
            onTouchStart={handleTouchStart}
          >
            {/* Drag Handle */}
            <div className="mobile-drag-handle" />
            
            {/* Header */}
            <div className="directions-panel-mobile-header">
              <div className="mobile-header-title">
                <h3>Plan Your Route</h3>
                <button 
                  className="mobile-close-btn"
                  onClick={() => setIsExpanded(false)}
                >
                  ×
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="mobile-quick-actions">
                <button 
                  className={`mobile-action-chip ${canUndo ? '' : 'disabled'}`}
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  ↶ Undo
                </button>
                <button 
                  className="mobile-action-chip"
                  onClick={handleReset}
                >
                  ⟲ Clear All
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div ref={contentRef} className="directions-panel-mobile-content">
              {/* Location Inputs */}
              {locations.map((location, index) => (
                <div key={index}>
                  <div className="mobile-location-card">
                    <div className="mobile-location-label">
                      <span className={`mobile-location-marker ${index === 0 ? 'origin' : index === locations.length - 1 ? 'destination' : 'waypoint'}`}>
                        {getLocationLabel(index)}
                      </span>
                      <span>
                        {index === 0 ? 'Starting Point' : 
                         index === locations.length - 1 ? 'Destination' : 
                         `Stop ${index}`}
                      </span>
                    </div>
                    
                    {!location ? (
                      <LocationSearch 
                        onLocationSelect={(loc) => updateLocation(index, loc)}
                        placeholder={`Search or tap map...`}
                        className="mobile-location-input"
                      />
                    ) : (
                      <div className="mobile-location-selected">
                        <span>{location.name || location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</span>
                        {index > 1 && (
                          <button 
                            className="mobile-clear-location"
                            onClick={() => removeLocation(index)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Transportation Mode */}
                  {index < locations.length - 1 && (
                    <div className="mobile-transport-selector">
                      <div className="mobile-transport-label">
                        How to get from {getLocationLabel(index)} to {getLocationLabel(index + 1)}?
                      </div>
                      <div className="mobile-transport-modes">
                        {Object.entries(TRANSPORTATION_MODES).map(([mode, config]) => (
                          <button
                            key={mode}
                            className={`mobile-transport-btn ${legModes[index] === mode ? 'active' : ''}`}
                            onClick={() => updateLegMode(index, mode)}
                          >
                            <span className="mobile-transport-icon">{config.icon}</span>
                            <span className="mobile-transport-name">{config.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add Destination Button */}
              <button 
                className="mobile-add-destination"
                onClick={addNextLeg}
              >
                <span>+</span>
                <span>Add Stop ({getLocationLabel(locations.length)})</span>
              </button>
            </div>
            
            {/* Bottom Action Bar */}
            <div className="mobile-action-bar">
              <button 
                className="mobile-action-secondary"
                onClick={() => setIsExpanded(false)}
              >
                Close
              </button>
              <button 
                className="mobile-action-primary"
                disabled={locations.filter(l => l).length < 2}
                onClick={() => {
                  calculateRoute(locations, legModes);
                  setIsExpanded(false);
                }}
              >
                Show Route
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop layout - use original component
  return null; // The original DirectionsPanel will handle desktop
};

export default DirectionsPanelMobile;