import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, LocationSearch } from './Shared';
import { DirectionsPanel } from './Desktop';
import { MobileControls } from './Mobile';
import { useMobileDetection } from '../utils/deviceDetection';
import { hasSharedTrip, loadSharedTrip, clearSharedTripFromURL } from '../utils/shareUtils';

function AppContent() {
  const [directionsRoute, setDirectionsRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 48.1181, lng: -123.4307 }); // Default: Port Angeles, WA
  const [shouldCenterMap, setShouldCenterMap] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [directionsLocations, setDirectionsLocations] = useState([null, null]);
  const [directionsLegModes, setDirectionsLegModes] = useState(['walk']);
  const [isAnimating, setIsAnimating] = useState(false);
  const isMobile = useMobileDetection();
  const [showRouteAnimator, setShowRouteAnimator] = useState(!isMobile); // Show on desktop by default, hide on mobile
  const [mapInstance, setMapInstance] = useState(null); // Store map instance
  
  // Undo functionality
  const [history, setHistory] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  
  
  // Check for shared trip in URL on mount
  useEffect(() => {
    if (hasSharedTrip()) {
      const sharedTrip = loadSharedTrip();
      
      if (sharedTrip) {
        console.log('Loading shared trip:', sharedTrip);
        
        // Set the locations and modes
        setDirectionsLocations(sharedTrip.locations);
        setDirectionsLegModes(sharedTrip.modes);
        
        // Auto-calculate the route
        if (sharedTrip.locations.length >= 2) {
          const segments = [];
          for (let i = 0; i < sharedTrip.locations.length - 1; i++) {
            segments.push({
              mode: sharedTrip.modes[i] || 'walk',
              startIndex: i,
              endIndex: i + 1
            });
          }
          
          const routeData = {
            origin: sharedTrip.locations[0],
            destination: sharedTrip.locations[sharedTrip.locations.length - 1],
            waypoints: sharedTrip.locations.slice(1, -1),
            mode: sharedTrip.modes[0] || 'walk',
            segments,
            allLocations: sharedTrip.locations,
            allModes: sharedTrip.modes,
            routeId: `shared_${Date.now()}`
          };
          
          setDirectionsRoute(routeData);
          
          // Center map on first location
          setMapCenter({ 
            lat: sharedTrip.locations[0].lat, 
            lng: sharedTrip.locations[0].lng 
          });
          setShouldCenterMap(true);
        } else if (sharedTrip.locations.length === 1) {
          // Single location - just center on it
          setMapCenter({ 
            lat: sharedTrip.locations[0].lat, 
            lng: sharedTrip.locations[0].lng 
          });
          setShouldCenterMap(true);
        }
        
        // Clear the trip from URL to clean up the address bar
        clearSharedTripFromURL();
      }
    } else {
      // No shared trip - try to get user's location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setMapCenter(userLocation);
            setShouldCenterMap(true);
          },
          (error) => {
            // Silently fail - use default location
            // Geolocation error - silently fail
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0
          }
        );
      }
    }
  }, []); // Run only once on mount

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
        // Use the raw setters (not the WithHistory versions) to avoid creating new history entries
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
    console.log('[AppContent] handleLocationSearch called - centering map to searched location:', location.name || 'unnamed');
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
    // Only save to history if there's an actual change and an action type
    if (actionType && JSON.stringify(newLocations) !== JSON.stringify(directionsLocations)) {
      // Find what changed by comparing
      let action = { type: actionType };
      
      // Find the index that changed
      for (let i = 0; i < Math.max(newLocations.length, directionsLocations.length); i++) {
        const oldLoc = directionsLocations[i];
        const newLoc = newLocations[i];
        
        // Check if this location changed (comparing coordinates or null state)
        const oldKey = oldLoc ? `${oldLoc.lat},${oldLoc.lng}` : 'null';
        const newKey = newLoc ? `${newLoc.lat},${newLoc.lng}` : 'null';
        
        if (oldKey !== newKey) {
          action.index = i;
          action.oldLocation = oldLoc;
          action.newLocation = newLoc;
          break;
        }
      }
      
      // Add any extra data
      if (extraData) {
        action = { ...action, ...extraData };
      }
      
      // Save the CURRENT state (before change) to history
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


  return (
    <div className="app">
      {!isAnimating && (
        <header className={`header ${isMobile ? 'header-mobile' : ''}`}>
        <div className="header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💋 LenaMaps - Animate your Google Maps Route</span>
          </h1>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="header-search">
          {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
           process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== "your_google_maps_api_key_here" ? (
            <LocationSearch 
              onLocationSelect={handleLocationSearch}
              placeholder="Search locations..."
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
            onAnimationStateChange={setIsAnimating}
            isMobile={isMobile}
            showRouteAnimator={showRouteAnimator}
            onHideRouteAnimator={() => {
              setShowRouteAnimator(false);
            }}
            onMapReady={setMapInstance}
          />
          {!isAnimating && (
            <div className="bmc-button-container" style={{
              position: 'absolute',
              top: '10px',
              right: '60px',
              zIndex: 1000
            }}>
              <a 
                href="https://www.buymeacoffee.com/lenamaps" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: isMobile ? '6px 10px' : '10px 16px',
                  backgroundColor: '#FFDD00',
                  color: '#000000',
                  fontFamily: 'Cookie, cursive',
                  fontSize: isMobile ? '14px' : '18px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                }}
              >
                ☕ Buy me a coffee
              </a>
            </div>
          )}
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
            console.log('[AppContent] onShowAnimator called - entering animation mode');
            // Center on first marker when entering animation mode on mobile
            if (mapInstance && directionsRoute && directionsRoute.allLocations && directionsRoute.allLocations.length > 0) {
              const firstLocation = directionsRoute.allLocations[0];
              if (firstLocation && firstLocation.lat && firstLocation.lng) {
                console.log('[AppContent] Centering on first marker for animation:', firstLocation.name || 'unnamed');
                mapInstance.setCenter(new window.google.maps.LatLng(firstLocation.lat, firstLocation.lng));
                mapInstance.setZoom(17);
              }
            }
            setShowRouteAnimator(true);
          }}
          onHideAnimator={() => {
            setShowRouteAnimator(false);
          }}
          isAnimating={isAnimating}
          showRouteAnimator={showRouteAnimator}
          map={mapInstance}
          onAnimationStateChange={setIsAnimating}
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
            map={mapInstance}
          />
        )
      )}
    </div>
  );
}

export default AppContent;
