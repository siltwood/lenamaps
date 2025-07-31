import React, { useState, useCallback, useRef } from 'react';
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

  const handleRouteDragged = useCallback((draggedRoute) => {
    // Handle segment-specific dragging
    if (draggedRoute.segmentIndex !== undefined && draggedRoute.draggedPath) {
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
  }, [directionsRoute]);

  return (
    <div className="app">
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
          isOpen={true}
          onDirectionsCalculated={setDirectionsRoute}
          clickedLocation={clickedLocation}
          onLocationUsed={handleLocationUsed}
          locations={directionsLocations}
          legModes={directionsLegModes}
          onLocationsChange={setDirectionsLocations}
          onLegModesChange={setDirectionsLegModes}
        />
      )}
    </div>
  );
}

export default AppContent;