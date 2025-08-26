import React, { useState, useEffect, useCallback, useRef } from 'react';
import LocationSearch from '../../Shared/LocationSearch';
import DirectionsHeader from './DirectionsHeader';
import { getLocationLabel } from '../../../utils/routeCalculations';
import TRANSPORTATION_MODES from '../../../constants/transportationModes';
import { generateShareableURL, copyToClipboard } from '../../../utils/shareUtils';
import '../../../styles/unified-icons.css';

const DirectionsPanel = ({ 
  onDirectionsCalculated,
  directionsRoute,
  isOpen,
  onClose,
  clickedLocation,
  onLocationUsed,
  onOriginChange,
  onDestinationChange,
  waypoints = [],
  waypointModes = [],
  onWaypointsChange,
  onWaypointModesChange,
  locations = [null, null],
  legModes = ['walk'],
  onLocationsChange,
  onLegModesChange,
  onUndo,
  onClear,
  onClearHistory,
  canUndo = false,
  isEditing = false,
  editingTrip = null,
  lastAction = null,
  map
}) => {
  const [transportationModes] = useState(TRANSPORTATION_MODES);
  const [position, setPosition] = useState({ x: 10, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false); // Start open
  const [activeInput, setActiveInput] = useState(null); // Track which input is active
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const panelRef = useRef(null);
  
  // Store position before minimizing
  const savedPositionRef = useRef(null);


  // Notify parent when first location (origin) changes
  useEffect(() => {
    if (onOriginChange && locations[0]) {
      onOriginChange(locations[0]);
    }
  }, [locations, onOriginChange]);

  // Notify parent when last location (current destination) changes
  useEffect(() => {
    if (onDestinationChange && locations.length > 1) {
      const lastLocation = locations[locations.length - 1];
      onDestinationChange(lastLocation);
    }
  }, [locations, onDestinationChange]);

  // Handle clicked location from map
  useEffect(() => {
    if (clickedLocation && isOpen) {
      if (onLocationsChange) {
        const newLocations = [...locations];
        
        // If there's an active input (edit mode), replace that specific location
        if (activeInput !== null && activeInput !== undefined) {
          newLocations[activeInput] = clickedLocation;
          // Clear active input to exit edit mode and show the updated location
          setActiveInput(null);
        } else {
          // Otherwise, find the first empty slot
          const emptyIndex = newLocations.findIndex(loc => !loc);
          if (emptyIndex !== -1) {
            newLocations[emptyIndex] = clickedLocation;
          }
        }
        onLocationsChange(newLocations, 'ADD_LOCATION');
        
        // Don't center or zoom map when placing first marker
        
        // Auto-calculate route or show marker for single location
        const filledLocations = newLocations.filter(loc => loc !== null);
        if (filledLocations.length >= 1) {
          
          if (filledLocations.length >= 2) {
            // Multiple locations - create route
            const segments = [];
            for (let i = 0; i < filledLocations.length - 1; i++) {
              segments.push({
                mode: legModes[i] || 'walk',
                startIndex: i,
                endIndex: i + 1
              });
            }
            const routeData = {
              origin: filledLocations[0],
              destination: filledLocations[filledLocations.length - 1],
              waypoints: filledLocations.slice(1, -1),
              mode: legModes[0],
              segments,
              allLocations: newLocations, // Pass ALL locations including nulls
              allModes: legModes,
              // Add a stable ID based on locations
              routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + legModes.join('-')
            };
            onDirectionsCalculated(routeData);
          } else {
            // Single location - don't calculate route, just let the marker show
            onDirectionsCalculated(null);
          }
        }
      }
      
      // Notify parent that location was used
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation, activeInput, isOpen, locations, onLocationsChange, onLocationUsed, onDirectionsCalculated, legModes]);
  
  // Removed auto-recalculate on mode change to prevent annoying re-renders


  const addNextLeg = () => {
    if (onLocationsChange && onLegModesChange) {
      // Add a new destination
      onLocationsChange([...locations, null], 'ADD_DESTINATION');
      // Add transportation mode for the new leg
      onLegModesChange([...legModes, 'walk']);
    }
  };

  const removeLocation = (index) => {
    if (index === 0 || index === 1) return; // Can't remove A or B
    
    if (onLocationsChange && onLegModesChange) {
      const newLocations = locations.filter((_, i) => i !== index);
      // When removing a location, we need to remove the leg mode that leads TO that location
      // If we're removing location C (index 2), we remove the B→C leg mode (index 1)
      const newModes = [...legModes];
      if (index <= legModes.length) {
        newModes.splice(index - 1, 1); // Remove the leg mode leading to this location
      }
      
      // Clear dragged segments since the route structure has changed
      if (window.draggedSegments) {
        // Remove dragged data for segments that no longer exist
        const newDraggedSegments = {};
        for (let i = 0; i < newLocations.length - 1; i++) {
          if (i < index - 1 && window.draggedSegments[i]) {
            // Keep dragged segments before the removed location
            newDraggedSegments[i] = window.draggedSegments[i];
          } else if (i >= index - 1 && window.draggedSegments[i + 1]) {
            // Shift dragged segments after the removed location
            newDraggedSegments[i] = window.draggedSegments[i + 1];
            newDraggedSegments[i].segmentIndex = i; // Update the index
          }
        }
        window.draggedSegments = newDraggedSegments;
      }
      
      onLocationsChange(newLocations, 'REMOVE_LOCATION');
      onLegModesChange(newModes);
      
      // Recalculate route after removal
      const filledLocations = newLocations.filter(loc => loc !== null);
      if (filledLocations.length >= 2) {
        const segments = [];
        for (let i = 0; i < filledLocations.length - 1; i++) {
          segments.push({
            mode: newModes[i] || 'walk',
            startIndex: i,
            endIndex: i + 1
          });
        }
        const routeData = {
          origin: filledLocations[0],
          destination: filledLocations[filledLocations.length - 1],
          waypoints: filledLocations.slice(1, -1),
          mode: newModes[0],
          segments,
          allLocations: filledLocations,
          allModes: newModes,
          routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + newModes.join('-')
        };
        onDirectionsCalculated(routeData);
      } else {
        // Clear routes when we have less than 2 locations
        onDirectionsCalculated(null);
      }
    }
  };

  const updateLocation = (index, location) => {
    if (onLocationsChange) {
      const newLocations = [...locations];
      newLocations[index] = location;
      // Determine action type
      const actionType = location ? 'ADD_LOCATION' : 'CLEAR_LOCATION';
      onLocationsChange(newLocations, actionType);
      
      // Auto-calculate route or show marker for single location
      const filledLocations = newLocations.filter(loc => loc !== null);
      if (filledLocations.length >= 1) {
        if (filledLocations.length >= 2) {
          // Multiple locations - create route
          const segments = [];
          for (let i = 0; i < filledLocations.length - 1; i++) {
            segments.push({
              mode: legModes[i] || 'walk',
              startIndex: i,
              endIndex: i + 1
            });
          }
          const routeData = {
            origin: filledLocations[0],
            destination: filledLocations[filledLocations.length - 1],
            waypoints: filledLocations.slice(1, -1),
            mode: legModes[0],
            segments,
            allLocations: newLocations, // Pass ALL locations including nulls
            allModes: legModes,
            routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + legModes.join('-')
          };
          onDirectionsCalculated(routeData);
        } else {
          // Single location - don't calculate route, just let the marker show
          onDirectionsCalculated(null);
        }
      } else {
        // No locations - clear everything
        onDirectionsCalculated(null);
      }
    }
  };

  const updateLegMode = (index, mode) => {
    if (onLegModesChange) {
      const newModes = [...legModes];
      newModes[index] = mode;
      onLegModesChange(newModes, index); // Pass index for action tracking
      
      // Update the route data immediately with new modes (visual update only)
      const filledLocations = locations.filter(loc => loc !== null);
      if (filledLocations.length === 1) {
        // Single location - don't calculate route, just let the marker show
        // The marker will be handled by RouteSegmentManager
      } else if (filledLocations.length >= 2 && onDirectionsCalculated) {
        const segments = [];
        for (let i = 0; i < filledLocations.length - 1; i++) {
          segments.push({
            mode: newModes[i] || 'walk',
            startIndex: i,
            endIndex: i + 1
          });
        }
        const routeData = {
          origin: filledLocations[0],
          destination: filledLocations[filledLocations.length - 1],
          waypoints: filledLocations.slice(1, -1),
          mode: newModes[0],
          segments,
          allLocations: filledLocations,
          allModes: newModes,
          routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + newModes.join('-')
        };
        onDirectionsCalculated(routeData);
      }
    }
  };

  
  const getUndoTooltip = (lastAction) => {
    if (!lastAction) return "Undo last action";
    
    const label = getLocationLabel(lastAction.index);
    
    switch (lastAction.type) {
      case 'ADD_LOCATION':
        return `Undo: Add location ${label}`;
      case 'CLEAR_LOCATION':
        return `Undo: Clear location ${label}`;
      case 'ADD_DESTINATION':
        return `Undo: Add destination ${label}`;
      case 'CHANGE_MODE':
        return `Undo: Change ${label} → ${getLocationLabel(lastAction.index + 1)} to ${lastAction.newMode}`;
      case 'DRAG_SEGMENT':
        return `Undo: Drag route ${label} → ${getLocationLabel(lastAction.index + 1)}`;
      case 'ADD_LOCATION_WITH_MODE':
        return `Undo: Add ${lastAction.mode} location ${label}`;
      default:
        return "Undo last action";
    }
  };




  const handleReset = () => {
    if (onLocationsChange && onLegModesChange) {
      onLocationsChange([null, null], null); // Don't track this in history
      onLegModesChange(['walk']);
    }
    // Clear dragged segments
    if (window.draggedSegments) {
      window.draggedSegments = {};
    }
  };

  const handleShare = async () => {
    const shareableURL = generateShareableURL(locations, legModes);
    
    if (!shareableURL) {
      alert('Please add at least one location to share');
      return;
    }
    
    const copied = await copyToClipboard(shareableURL);
    
    if (copied) {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 3000);
    } else {
      alert('Failed to copy link. URL: ' + shareableURL);
    }
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep panel within viewport bounds
    const panel = panelRef.current;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMinimize = () => {
    savedPositionRef.current = { ...position };
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
    // Restore saved position if available
    if (savedPositionRef.current) {
      setPosition(savedPositionRef.current);
    }
  };

  if (!isOpen) return null;

  // Render minimized state
  if (isMinimized) {
    return (
      <div 
        className="directions-panel-minimized"
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '20px',
          zIndex: 2000
        }}
      >
        <button 
          className="unified-icon primary"
          onClick={handleExpand}
          title="Visualize Your Route"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <path d="M9 9l6 6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div 
      className="directions-panel"
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <DirectionsHeader
        isEditing={isEditing}
        editingTrip={editingTrip}
        onUndo={onUndo}
        onClear={() => {
          handleReset();
          // Clear undo history
          if (onClearHistory) {
            onClearHistory();
          }
          // Also clear the route on the map
          if (onDirectionsCalculated) {
            onDirectionsCalculated({
              routeId: 'empty',
              allLocations: [],
              allModes: []
            });
          }
        }}
        onClose={onClose}
        onMinimize={handleMinimize}
        canUndo={canUndo}
        canClear={locations.some(loc => loc !== null) || canUndo}
        getUndoTooltip={getUndoTooltip}
        lastAction={lastAction}
      />

      <div className="directions-content">
        <div className="route-inputs">
          {/* Display all locations in sequence */}
          {locations.map((location, index) => (
            <div key={index}>
              <div className={`input-group ${!location && index === locations.findIndex(l => !l) ? 'awaiting-click' : ''} ${activeInput === index ? 'awaiting-input' : ''}`}>
                <label>
                  Location {getLocationLabel(index)}
                </label>
                {!location || activeInput === index ? (
                  <LocationSearch 
                    onLocationSelect={(loc) => {
                      updateLocation(index, loc);
                      setActiveInput(null); // Clear active input
                      
                      // Don't center or zoom map when placing first marker
                    }}
                    placeholder={`Enter location ${getLocationLabel(index)}...`}
                    onFocus={() => setActiveInput(index)}
                    onBlur={() => {
                      // Only clear active input if we're not selecting a location
                      setTimeout(() => {
                        if (activeInput === index && location) {
                          setActiveInput(null);
                        }
                      }, 200);
                    }}
                    defaultValue={location?.name || location?.address || ''}
                  />
                ) : (
                  <div 
                    className={`selected-location ${activeInput === index ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInput(index);
                      // Don't clear the location immediately - just mark it as active for editing
                    }}
                    style={{
                      ...(activeInput === index ? {
                        backgroundColor: '#eff6ff',
                        borderColor: '#3b82f6',
                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                      } : {})
                    }}
                  >
                    <span>📍 {location.name || location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</span>
                    {index > 1 && (
                      <button 
                        className="remove-location-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLocation(index);
                        }}
                        title="Remove location"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Show transportation mode selector between locations */}
              {index < locations.length - 1 && (
                <div className="leg-mode-selector">
                  <label>{getLocationLabel(index)} → {getLocationLabel(index + 1)} Transportation:</label>
                  <div className="mode-buttons compact">
                    {Object.entries(transportationModes).map(([mode, config]) => (
                      <button
                        key={mode}
                        className={`mode-button compact ${legModes[index] === mode ? 'active' : ''}`}
                        onClick={() => updateLegMode(index, mode)}
                        style={{
                          backgroundColor: legModes[index] === mode ? config.color : 'transparent',
                          borderColor: config.color,
                          color: legModes[index] === mode ? 'white' : config.color
                        }}
                      >
                        <span className="mode-icon">{config.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          ))}
          
          {/* Add Next Leg Button */}
          <button 
            className="add-stop-button"
            onClick={(e) => {
              e.preventDefault();
              addNextLeg();
            }}
            type="button"
          >
            <span>➕ Add Next Location ({getLocationLabel(locations.length)})</span>
          </button>

          {/* Share Button - only show when we have a valid route */}
          {directionsRoute && locations.filter(loc => loc !== null).length >= 2 && (
            <div className="share-section" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
              <button 
                className="share-button"
                onClick={handleShare}
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
              >
                <span>🔗</span>
                <span>{showCopiedMessage ? '✅ Link Copied!' : 'Share Trip'}</span>
              </button>
              {showCopiedMessage && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  Share link copied to clipboard!
                </div>
              )}
            </div>
          )}


        </div>

      </div>
    </div>
  );
};

export default DirectionsPanel;
