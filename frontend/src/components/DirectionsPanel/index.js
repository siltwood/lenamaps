import React, { useState, useEffect, useCallback, useRef } from 'react';
import LocationSearch from '../LocationSearch';
import Modal from '../Modal';
import axios from 'axios';
import DirectionsHeader from './DirectionsHeader';
import LocationInput from './LocationInput';
import TransportationModeSelector from './TransportationModeSelector';
import { calculateRouteData, getLocationLabel } from '../../utils/routeCalculations';

const DirectionsPanel = ({ 
  onDirectionsCalculated, 
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
  canUndo = false,
  isEditing = false,
  editingTrip = null,
  lastAction = null
}) => {
  const [transportationModes, setTransportationModes] = useState({});
  const [segments, setSegments] = useState([]);
  const [tripName, setTripName] = useState(editingTrip ? editingTrip.name : '');
  const [isCalculating, setIsCalculating] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [position, setPosition] = useState({ x: 10, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    fetchTransportationModes();
  }, []);

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
        
        // Normal click - add to next empty location slot
        const emptyIndex = newLocations.findIndex(loc => !loc);
        if (emptyIndex !== -1) {
          newLocations[emptyIndex] = clickedLocation;
          onLocationsChange(newLocations, 'ADD_LOCATION');
          
          // Auto-calculate route or show marker for single location
          const filledLocations = newLocations.filter(loc => loc !== null);
          if (filledLocations.length >= 1) {
            setIsCalculating(true);
            
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
                allLocations: filledLocations,
                allModes: legModes,
                // Add a stable ID based on locations
                routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + legModes.join('-')
              };
              setSegments(segments);
              onDirectionsCalculated(routeData);
            } else {
              // Single location - just show marker
              const routeData = {
                origin: filledLocations[0],
                destination: null,
                waypoints: [],
                mode: legModes[0],
                segments: [],
                allLocations: filledLocations,
                allModes: legModes,
                // Add a stable ID based on locations
                routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + legModes.join('-')
              };
              setSegments([]);
              onDirectionsCalculated(routeData);
            }
            
            setIsCalculating(false);
          }
        }
      }
      
      // Notify parent that location was used
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Removed auto-recalculate on mode change to prevent annoying re-renders

  const fetchTransportationModes = async () => {
    try {
      const response = await axios.get('/api/transportation-modes');
      setTransportationModes(response.data);
    } catch (error) {
      console.error('Error fetching transportation modes:', error);
    }
  };

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
        setSegments(segments);
        onDirectionsCalculated(routeData);
      } else {
        // Clear routes when we have less than 2 locations
        setSegments([]);
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
        setIsCalculating(true);
        
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
            allLocations: filledLocations,
            allModes: legModes,
            routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + legModes.join('-')
          };
          setSegments(segments);
          onDirectionsCalculated(routeData);
        } else {
          // Single location - just show marker
          const routeData = {
            origin: filledLocations[0],
            destination: null,
            waypoints: [],
            mode: legModes[0],
            segments: [],
            allLocations: filledLocations,
            allModes: legModes,
            routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + legModes.join('-')
          };
          setSegments([]);
          onDirectionsCalculated(routeData);
        }
        
        setIsCalculating(false);
      } else {
        // No locations - clear everything
        setSegments([]);
        onDirectionsCalculated(null);
      }
    }
  };

  const updateLegMode = (index, mode) => {
    if (onLegModesChange) {
      const newModes = [...legModes];
      newModes[index] = mode;
      console.log('DirectionsPanel updateLegMode:', {
        index: index,
        oldMode: legModes[index],
        newMode: mode,
        allModes: newModes
      });
      onLegModesChange(newModes, index); // Pass index for action tracking
      
      // Update the route data immediately with new modes (visual update only)
      const filledLocations = locations.filter(loc => loc !== null);
      if (filledLocations.length >= 2 && onDirectionsCalculated) {
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
      onLocationsChange([null, null]);
      onLegModesChange(['walk']);
    }
    setSegments([]);
    setTripName('');
    // Clear dragged segments
    if (window.draggedSegments) {
      window.draggedSegments = {};
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
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
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
          className="expand-button"
          onClick={handleExpand}
          title="Plan Your Route"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          onClear();
          setSegments([]);
          setTripName('');
          if (window.draggedSegments) {
            window.draggedSegments = {};
          }
        }}
        onClose={onClose}
        onMinimize={handleMinimize}
        canUndo={canUndo}
        getUndoTooltip={getUndoTooltip}
        lastAction={lastAction}
      />

      <div className="directions-content">
        <div className="route-inputs">
          {/* Display all locations in sequence */}
          {locations.map((location, index) => (
            <div key={index}>
              <div className={`input-group ${!location && index === locations.findIndex(l => !l) ? 'awaiting-click' : ''}`}>
                <label>
                  Location {getLocationLabel(index)}
                </label>
                {!location ? (
                  <LocationSearch 
                    onLocationSelect={(loc) => updateLocation(index, loc)}
                    placeholder={`Enter location ${getLocationLabel(index)}...`}
                  />
                ) : (
                  <div className="selected-location">
                    <span>📍 {location.name || location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</span>
                    {index > 1 && (
                      <button 
                        className="remove-location-btn"
                        onClick={() => removeLocation(index)}
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

        </div>

      </div>
      
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

export default DirectionsPanel;