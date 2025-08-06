import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, LocationSearch, DonateButton } from './Shared';
import { DirectionsPanel } from './Desktop';
import { MobileControls } from './Mobile';
import { useMobileDetection } from '../utils/deviceDetection';

function AppContent() {
  const [directionsRoute, setDirectionsRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.1181, lng: -123.4307 }); // Port Angeles, WA
  const [shouldCenterMap, setShouldCenterMap] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [directionsLocations, setDirectionsLocations] = useState([null, null]);
  const [directionsLegModes, setDirectionsLegModes] = useState(['walk']);
  const [isAnimating, setIsAnimating] = useState(false);
  const isMobile = useMobileDetection();
  const [showRouteAnimator, setShowRouteAnimator] = useState(!isMobile); // Show on desktop by default, hide on mobile
  const [routeDraggingEnabled, setRouteDraggingEnabled] = useState(false); // Default off for both mobile and desktop
  const mapRef = useRef(null); // Store map instance reference
  
  // Undo functionality
  const [history, setHistory] = useState([]);
  const [lastAction, setLastAction] = useState(null);

  // Save state to history before making changes
  const saveToHistory = useCallback((action) => {
    // Only save valid states to history
    if (directionsLocations && directionsLegModes) {
      setHistory(prev => [...prev, {
        locations: directionsLocations,
        legModes: directionsLegModes,
        // Don't save the full route object - it has Google Maps objects that don't serialize well
        // Just save the essential data needed to recreate it
        routeId: directionsRoute?.routeId || null,
        action: action
      }]);
      setLastAction(action);
    }
  }, [directionsLocations, directionsLegModes, directionsRoute]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      // Validate state before restoring
      if (previousState.locations && previousState.legModes) {
        setDirectionsLocations(previousState.locations);
        setDirectionsLegModes(previousState.legModes);
        
        // Recreate the route from locations and modes
        const filledLocations = previousState.locations.filter(loc => loc !== null);
        if (filledLocations.length >= 1) {
          const segments = [];
          for (let i = 0; i < filledLocations.length - 1; i++) {
            segments.push({
              mode: previousState.legModes[i] || 'walk',
              startIndex: i,
              endIndex: i + 1
            });
          }
          
          const routeData = {
            origin: filledLocations[0],
            destination: filledLocations.length > 1 ? filledLocations[filledLocations.length - 1] : null,
            waypoints: filledLocations.slice(1, -1),
            mode: previousState.legModes[0] || 'walk',
            segments,
            allLocations: previousState.locations,
            allModes: previousState.legModes,
            routeId: previousState.routeId || `undo_${Date.now()}`
          };
          setDirectionsRoute(routeData);
        } else {
          setDirectionsRoute(null);
        }
        
        setHistory(prev => prev.slice(0, -1));
        setLastAction(null);
      }
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
        <header className={`header ${isMobile ? 'header-mobile' : ''}`}>
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
            isMobile={isMobile}
            showRouteAnimator={showRouteAnimator}
            onHideRouteAnimator={() => {
              setShowRouteAnimator(false);
            }}
            routeDraggingEnabled={routeDraggingEnabled}
          />
        </div>
      </div>
      
      {isMobile ? (
        <MobileControls
          key="mobile-controls"
          onDirectionsCalculated={setDirectionsRoute}
          clickedLocation={clickedLocation}
          onLocationUsed={handleLocationUsed}
          locations={directionsLocations}
          legModes={directionsLegModes}
          onLocationsChange={setDirectionsLocationsWithHistory}
          onLegModesChange={setDirectionsLegModesWithHistory}
          directionsRoute={directionsRoute}
          onUndo={handleUndo}
          onClearHistory={handleClearHistory}
          canUndo={history.length > 0}
          onShowAnimator={() => {
            setShowRouteAnimator(true);
          }}
          onHideAnimator={() => {
            setShowRouteAnimator(false);
          }}
          isAnimating={isAnimating}
          showRouteAnimator={showRouteAnimator}
          routeDraggingEnabled={routeDraggingEnabled}
          onRouteDraggingToggle={setRouteDraggingEnabled}
        />
      ) : (
        !isAnimating && (
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
            routeDraggingEnabled={routeDraggingEnabled}
            onRouteDraggingToggle={setRouteDraggingEnabled}
          />
        )
      )}
    </div>
  );
}

export default AppContent;