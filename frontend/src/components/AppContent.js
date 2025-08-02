import React, { useState, useCallback } from 'react';
import GoogleMap from './GoogleMap';
import DirectionsPanel from './DirectionsPanel';
import LocationSearch from './LocationSearch';
import DonateButton from './DonateButton/DonateButton';

function AppContent() {
  const [directionsRoute, setDirectionsRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.1181, lng: -123.4307 }); // Port Angeles, WA
  const [shouldCenterMap, setShouldCenterMap] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [directionsLocations, setDirectionsLocations] = useState([null, null]);
  const [directionsLegModes, setDirectionsLegModes] = useState(['walk']);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Undo functionality
  const [history, setHistory] = useState([]);
  const [lastAction, setLastAction] = useState(null);

  // Save state to history before making changes
  const saveToHistory = useCallback((action) => {
    setHistory(prev => [...prev, {
      locations: directionsLocations,
      legModes: directionsLegModes,
      route: directionsRoute,
      action: action
    }]);
    setLastAction(action);
  }, [directionsLocations, directionsLegModes, directionsRoute]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setDirectionsLocations(previousState.locations);
      setDirectionsLegModes(previousState.legModes);
      setDirectionsRoute(previousState.route);
      setHistory(prev => prev.slice(0, -1));
      setLastAction(null);
    }
  }, [history]);

  // Clear history (for reset)
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setLastAction(null);
  }, []);

  const handleLocationSearch = useCallback((location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setShouldCenterMap(true);
  }, []);

  const handleMapCentered = useCallback(() => {
    setShouldCenterMap(false);
  }, []);

  const handleMapClick = useCallback((lat, lng, locationInfo) => {
    setClickedLocation({ lat, lng, ...locationInfo });
  }, []);

  const handleLocationUsed = useCallback(() => {
    setClickedLocation(null);
  }, []);

  // Wrapped setters that save to history
  const setDirectionsLocationsWithHistory = useCallback((newLocations, actionType, extraData) => {
    // Save current state before changing
    if (actionType) {
      // Find what changed by comparing with current locations
      let action = { type: actionType };
      
      // Find the index that changed
      for (let i = 0; i < Math.max(newLocations.length, directionsLocations.length); i++) {
        if (newLocations[i] !== directionsLocations[i]) {
          action.index = i;
          break;
        }
      }
      
      // Add any extra data (like mode for ADD_LOCATION_WITH_MODE)
      if (extraData) {
        action = { ...action, ...extraData };
      }
      
      saveToHistory(action);
    }
    setDirectionsLocations(newLocations);
  }, [saveToHistory, directionsLocations]);

  const setDirectionsLegModesWithHistory = useCallback((newModes, index) => {
    // Create action for mode change if index is provided
    if (index !== undefined) {
      const action = {
        type: 'mode_change',
        index: index,
        newMode: newModes[index]
      };
      saveToHistory(action);
    }
    setDirectionsLegModes(newModes);
  }, [saveToHistory]);

  const handleRouteDragged = useCallback((draggedRoute) => {
    // Handle segment-specific dragging
    if (draggedRoute.segmentIndex !== undefined && draggedRoute.draggedPath) {
      // Save to history
      saveToHistory({
        type: 'route_drag',
        index: draggedRoute.segmentIndex
      });
      
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
    }
  }, [directionsRoute, saveToHistory]);

  return (
    <div className="app">
      {!isAnimating && (
        <header className="header">
        <div className="header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>LenaMaps - Animate your Google Maps Route</span>
          </h1>
        </div>
        <div className="header-right">
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
          <DonateButton />
        </div>
        </header>
      )}
      <div className="main-content">
        <div className="map-container">
          <GoogleMap
            directionsRoute={directionsRoute}
            center={mapCenter}
            shouldCenterMap={shouldCenterMap}
            onMapCentered={handleMapCentered}
            onMapClick={handleMapClick}
            directionsLocations={directionsLocations}
            directionsLegModes={directionsLegModes}
            onRouteDragged={handleRouteDragged}
            onAnimationStateChange={setIsAnimating}
          />
        </div>
      </div>
      
      {!isAnimating && (
        <DirectionsPanel
          key="directions-panel"
          isOpen={true}
          onDirectionsCalculated={setDirectionsRoute}
          clickedLocation={clickedLocation}
          onLocationUsed={handleLocationUsed}
          locations={directionsLocations}
          legModes={directionsLegModes}
          onLocationsChange={setDirectionsLocationsWithHistory}
          onLegModesChange={setDirectionsLegModesWithHistory}
          onUndo={handleUndo}
          onClearHistory={handleClearHistory}
          canUndo={history.length > 0}
          lastAction={lastAction}
        />
      )}
    </div>
  );
}

export default AppContent;