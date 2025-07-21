import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import GoogleMap from './components/GoogleMap';
import DirectionsPanel from './components/DirectionsPanel';
import LocationSearch from './components/LocationSearch';
import './App.css';

function App() {
  const [isDirectionsMode, setIsDirectionsMode] = useState(true); // Start in directions mode
  const [directionsRoute, setDirectionsRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.1181, lng: -123.4307 }); // Port Angeles, WA
  const [shouldCenterMap, setShouldCenterMap] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [directionsOrigin, setDirectionsOrigin] = useState(null);
  const [directionsDestination, setDirectionsDestination] = useState(null);
  const [directionsWaypoints, setDirectionsWaypoints] = useState([]);
  const [directionsWaypointModes, setDirectionsWaypointModes] = useState([]);
  const [directionsLocations, setDirectionsLocations] = useState([null, null]);
  const [directionsLegModes, setDirectionsLegModes] = useState(['walk']);
  const [actionHistory, setActionHistory] = useState([]); // Comprehensive action history
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Sidebar collapse state
  const [isAnimating, setIsAnimating] = useState(false); // Animation state
  
  // Use ref to always have current value in callbacks
  const isDirectionsModeRef = useRef(isDirectionsMode);
  useEffect(() => {
    isDirectionsModeRef.current = isDirectionsMode;
  }, [isDirectionsMode]);

  useEffect(() => {
    fetchTrips();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const fetchTrips = async () => {
    try {
      const response = await axios.get('/api/trips');
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
    }
  };

  // Helper function to add an action to history
  const addActionToHistory = useCallback((action) => {
    
    setActionHistory(prev => {
      const lastAction = prev[prev.length - 1];
      
      // Check if we should combine with the last action
      // If the last action was adding a location and this is changing its mode within 2 seconds
      if (lastAction && 
          action.type === 'CHANGE_MODE' && 
          (lastAction.type === 'ADD_LOCATION' || lastAction.type === 'ADD_DESTINATION') &&
          action.index === lastAction.index && 
          Date.now() - lastAction.timestamp < 2000) {
        
        // Combine the actions - replace the last action with a combined one
        const combinedAction = {
          ...lastAction,
          type: 'ADD_LOCATION_WITH_MODE',
          mode: action.newMode,
          originalMode: action.oldMode,
          timestamp: lastAction.timestamp, // Keep original timestamp
          // Update the previous state to have the original walk mode
          previousState: {
            ...lastAction.previousState,
            legModes: lastAction.previousState.legModes.map((mode, i) => 
              i === action.index ? action.oldMode : mode
            )
          }
        };
        
        return [...prev.slice(0, -1), combinedAction];
      }
      
      // Otherwise add as normal
      return [...prev, {
        ...action,
        timestamp: Date.now(),
        // Store current state for restoration
        previousState: {
          locations: [...directionsLocations],
          legModes: [...directionsLegModes],
          draggedSegments: window.draggedSegments ? {...window.draggedSegments} : {}
        }
      }];
    });
  }, [directionsLocations, directionsLegModes]);


  const handleCloseDirections = () => {
    setIsDirectionsMode(false);
    setDirectionsRoute(null);
    setDirectionsOrigin(null);
    setDirectionsDestination(null);
    setDirectionsWaypoints([]);
    setDirectionsWaypointModes([]);
    setDirectionsLocations([null, null]);
    setDirectionsLegModes(['walk']);
    setActionHistory([]); // Clear action history
    // Clear dragged segments
    if (window.draggedSegments) {
      window.draggedSegments = {};
    }
  };

  const handleDirectionsCalculated = (routeData) => {
    setDirectionsRoute(routeData);
  };


  const handleLocationSearch = useCallback((location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setShouldCenterMap(true); // Only center when user explicitly searches
  }, []);

  const handleMapCentered = useCallback(() => {
    setShouldCenterMap(false);
  }, []);

  const handleDeleteTrip = async (tripId) => {
    try {
      await axios.delete(`/api/trips/${tripId}`);
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error deleting trip. Please try again.');
    }
  };

  const handleMapClick = useCallback((lat, lng, locationInfo) => {
    if (isDirectionsModeRef.current) {
      setClickedLocation({ lat, lng, ...locationInfo });
    }
  }, []);

  const handleLocationUsed = useCallback(() => {
    setClickedLocation(null);
  }, []);

  // Wrapper functions to track history
  const updateDirectionsLocations = useCallback((newLocations, providedActionType = null) => {
    // Find what changed
    let changeIndex = -1;
    let changeDetails = {};
    let actionType = providedActionType || 'MODIFY_LOCATION';
    
    for (let i = 0; i < Math.max(newLocations.length, directionsLocations.length); i++) {
      if (JSON.stringify(newLocations[i]) !== JSON.stringify(directionsLocations[i])) {
        changeIndex = i;
        // Only auto-detect action type if not provided
        if (!providedActionType) {
          if (!directionsLocations[i] && newLocations[i]) {
            actionType = 'ADD_LOCATION';
            changeDetails = { location: newLocations[i] };
          } else if (directionsLocations[i] && !newLocations[i]) {
            actionType = 'CLEAR_LOCATION';
            changeDetails = { location: directionsLocations[i] };
          } else if (newLocations.length > directionsLocations.length) {
            actionType = 'ADD_DESTINATION';
            changeDetails = { location: newLocations[i] };
          }
        } else {
          // Use provided action type
          if (actionType === 'ADD_LOCATION' || actionType === 'ADD_DESTINATION') {
            changeDetails = { location: newLocations[i] };
          } else if (actionType === 'CLEAR_LOCATION') {
            changeDetails = { location: directionsLocations[i] };
          }
        }
        break;
      }
    }
    
    // Add action to history
    addActionToHistory({
      type: actionType,
      index: changeIndex,
      ...changeDetails
    });
    
    setDirectionsLocations(newLocations);
  }, [directionsLocations, addActionToHistory]);

  const updateDirectionsLegModes = useCallback((newModes, segmentIndex = null) => {
    console.log('App updateDirectionsLegModes:', {
      newModes: newModes,
      segmentIndex: segmentIndex,
      previousModes: directionsLegModes
    });
    // Track mode change
    if (segmentIndex !== null) {
      addActionToHistory({
        type: 'CHANGE_MODE',
        index: segmentIndex,
        oldMode: directionsLegModes[segmentIndex],
        newMode: newModes[segmentIndex]
      });
    }
    
    setDirectionsLegModes(newModes);
  }, [directionsLegModes, addActionToHistory]);

  const handleUndo = useCallback(() => {
    if (actionHistory.length > 0) {
      const lastAction = actionHistory[actionHistory.length - 1];
      const previousState = lastAction.previousState;
      
      // Save current state to redo stack
      
      // Restore previous state - this must happen BEFORE removing from history
      setDirectionsLocations(previousState.locations);
      setDirectionsLegModes(previousState.legModes);
      
      // Restore dragged segments
      if (previousState.draggedSegments) {
        window.draggedSegments = previousState.draggedSegments;
      } else {
        window.draggedSegments = {};
      }
      
      // Remove the last action from history AFTER state is restored
      setActionHistory(prev => prev.slice(0, -1));
      
      // Recalculate route with restored state immediately
      const filledLocs = previousState.locations.filter(loc => loc !== null);
      
      if (filledLocs.length >= 2) {
        const segments = [];
        for (let i = 0; i < filledLocs.length - 1; i++) {
          segments.push({
            mode: previousState.legModes[i] || 'walk',
            startIndex: i,
            endIndex: i + 1
          });
        }
        const routeData = {
          origin: filledLocs[0],
          destination: filledLocs[filledLocs.length - 1],
          waypoints: filledLocs.slice(1, -1),
          mode: previousState.legModes[0],
          segments,
          allLocations: filledLocs,
          allModes: previousState.legModes,
          routeId: filledLocs.map(loc => `${loc.lat},${loc.lng}`).join('_')
        };
        setDirectionsRoute(routeData);
      } else if (filledLocs.length === 1) {
        // Single location - just show marker
        const routeData = {
          origin: filledLocs[0],
          destination: null,
          waypoints: [],
          mode: previousState.legModes[0],
          segments: [],
          allLocations: filledLocs,
          allModes: previousState.legModes,
          routeId: filledLocs.map(loc => `${loc.lat},${loc.lng}`).join('_')
        };
        setDirectionsRoute(routeData);
      } else {
        // No locations - clear everything by setting null with a different routeId
        setDirectionsRoute({ routeId: 'empty', allLocations: [], allModes: [] });
      }
    }
  }, [actionHistory, directionsLocations, directionsLegModes]);


  const handleClear = useCallback(() => {
    setActionHistory([]); // Clear action history
    setDirectionsLocations([null, null]);
    setDirectionsLegModes(['walk']);
    setDirectionsRoute(null);
    // Clear dragged segments
    if (window.draggedSegments) {
      window.draggedSegments = {};
    }
  }, []);

  const handleRouteDragged = useCallback((draggedRoute) => {
    // Handle segment-specific dragging with the new format
    if (draggedRoute.segmentIndex !== undefined && draggedRoute.draggedPath) {
      // Add drag action to history
      addActionToHistory({
        type: 'DRAG_SEGMENT',
        index: draggedRoute.segmentIndex,
        draggedPath: draggedRoute.draggedPath,
        segmentMode: draggedRoute.segmentMode
      });
      
      // Store the dragged segment info but don't update locations
      // The route remains visually dragged on the map
      
      // Update the directions route to reflect the dragged state
      const newRoute = {
        ...directionsRoute,
        draggedSegments: {
          ...(directionsRoute?.draggedSegments || {}),
          [draggedRoute.segmentIndex]: {
            path: draggedRoute.draggedPath,
            mode: draggedRoute.segmentMode
          }
        }
      };
      setDirectionsRoute(newRoute);
      return;
    }
    
    // Handle old format for backward compatibility
    if (draggedRoute.allLocations && draggedRoute.draggedSegmentIndex !== undefined) {
      // This is a segment drag - update only the affected locations
      updateDirectionsLocations(draggedRoute.allLocations);
      
      // Recalculate just the dragged segment
      const newRoute = {
        ...directionsRoute,
        allLocations: draggedRoute.allLocations
      };
      setDirectionsRoute(newRoute);
      return;
    }
    
    // Legacy code for full route dragging
    const newLocations = [draggedRoute.origin];
    
    // Add waypoints if any
    if (draggedRoute.waypoints && draggedRoute.waypoints.length > 0) {
      newLocations.push(...draggedRoute.waypoints);
    }
    
    // Add destination
    newLocations.push(draggedRoute.destination);
    
    // Update locations while preserving leg modes
    updateDirectionsLocations(newLocations);
    
    // If we have more locations than before, add default walk modes
    if (newLocations.length - 1 > directionsLegModes.length) {
      const newModes = [...directionsLegModes];
      while (newModes.length < newLocations.length - 1) {
        newModes.push('walk');
      }
      updateDirectionsLegModes(newModes);
    }
  }, [directionsLegModes, updateDirectionsLocations, updateDirectionsLegModes]);

  // Update route when leg modes change
  useEffect(() => {
    const filledLocs = directionsLocations.filter(loc => loc !== null);
    
    if (filledLocs.length >= 2) {
      const segments = [];
      for (let i = 0; i < filledLocs.length - 1; i++) {
        segments.push({
          mode: directionsLegModes[i] || 'walk',
          startIndex: i,
          endIndex: i + 1
        });
      }
      const routeData = {
        origin: filledLocs[0],
        destination: filledLocs[filledLocs.length - 1],
        waypoints: filledLocs.slice(1, -1),
        mode: directionsLegModes[0],
        segments,
        allLocations: filledLocs,
        allModes: directionsLegModes,
        routeId: filledLocs.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + directionsLegModes.join('-')
      };
      setDirectionsRoute(routeData);
    } else if (filledLocs.length === 1) {
      // Single location - just show marker with updated mode
      const routeData = {
        origin: filledLocs[0],
        destination: null,
        waypoints: [],
        mode: directionsLegModes[0],
        segments: [],
        allLocations: filledLocs,
        allModes: directionsLegModes,
        routeId: filledLocs.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + directionsLegModes[0]
      };
      console.log('App: Setting single location route:', {
        mode: directionsLegModes[0],
        allModes: directionsLegModes,
        routeData: routeData
      });
      setDirectionsRoute(routeData);
    }
  }, [directionsLegModes, directionsLocations]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts in directions mode and when not animating
      if (!isDirectionsMode || isAnimating) return;
      
      // Check if the event is from an input field
      const isInputField = e.target.tagName === 'INPUT' || 
                          e.target.tagName === 'TEXTAREA' || 
                          e.target.contentEditable === 'true';
      
      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        // Don't prevent default if in an input field (let them undo their typing)
        if (!isInputField) {
          e.preventDefault();
          if (actionHistory.length > 0) {
            handleUndo();
          }
        }
      }
      
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirectionsMode, isAnimating, actionHistory.length, handleUndo]);


  return (
    <div className="app">
      <header className="header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>LenaMaps - Animate your Google Maps Route</span>
        </h1>
        <div className="header-search">
          {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
           process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== "your_google_maps_api_key_here" ? (
            <LocationSearch 
              onLocationSelect={handleLocationSearch}
              placeholder="Search for a city to start your trip..."
            />
          ) : (
            <div style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: '25px',
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.8)'
            }}>
              Set up Google Maps API to enable search
            </div>
          )}
        </div>
      </header>
      <div className="main-content">
        <div className="map-container">
          <GoogleMap
            isCreating={false}
            directionsRoute={directionsRoute}
            center={mapCenter}
            shouldCenterMap={shouldCenterMap}
            onMapCentered={handleMapCentered}
            onMapClick={handleMapClick}
            isDirectionsMode={isDirectionsMode}
            directionsOrigin={directionsOrigin}
            directionsDestination={directionsDestination}
            directionsWaypoints={directionsWaypoints}
            directionsWaypointModes={directionsWaypointModes}
            directionsLocations={directionsLocations}
            directionsLegModes={directionsLegModes}
            onRouteDragged={handleRouteDragged}
            onAnimationStateChange={setIsAnimating}
          />
        </div>
      </div>
      
      {isDirectionsMode && !isAnimating && (
        <DirectionsPanel
          isOpen={true}
          onClose={handleCloseDirections}
          onDirectionsCalculated={handleDirectionsCalculated}
          clickedLocation={clickedLocation}
          onLocationUsed={handleLocationUsed}
          onOriginChange={setDirectionsOrigin}
          onDestinationChange={setDirectionsDestination}
          waypoints={directionsWaypoints}
          waypointModes={directionsWaypointModes}
          onWaypointsChange={setDirectionsWaypoints}
          onWaypointModesChange={setDirectionsWaypointModes}
          locations={directionsLocations}
          legModes={directionsLegModes}
          onLocationsChange={updateDirectionsLocations}
          onLegModesChange={updateDirectionsLegModes}
          onUndo={handleUndo}
          onClear={handleClear}
          canUndo={actionHistory.length > 0}
          isEditing={false}
          lastAction={actionHistory.length > 0 ? actionHistory[actionHistory.length - 1] : null}
        />
      )}
    </div>
  );
}

export default App; 