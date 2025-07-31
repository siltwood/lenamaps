import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_CENTER, MAP_CONFIG } from '../utils/constants';
import { createMarkerContent, clearAdvancedMarker } from '../utils/mapHelpers';
import RouteSegmentManager from './RouteSegmentManager';
import RouteAnimator from '../../RouteAnimator';

const MapComponent = ({ 
  onMapClick, 
  center,
  shouldCenterMap = false,
  onMapCentered,
  directionsRoute,
  directionsLocations = [],
  directionsLegModes = [],
  onRouteDragged,
  onAnimationStateChange
}) => {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);

  // Initialize map
  const initMap = useCallback(() => {
    if (!mapRef.current) return;
    
    // Check if map already exists on the DOM element
    if (mapRef.current._mapInstance) {
      setMap(mapRef.current._mapInstance);
      return;
    }

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      mapId: 'eb5a26e3f8eb70b4dec5041c', // Your Google Cloud Map ID
      zoom: MAP_CONFIG.zoom,
      center: center || DEFAULT_CENTER,
      ...MAP_CONFIG
    });

    const directionsServiceInstance = new window.google.maps.DirectionsService();

    // Store map instance on DOM element to prevent re-initialization
    mapRef.current._mapInstance = mapInstance;
    
    setMap(mapInstance);
    setDirectionsService(directionsServiceInstance);

    // Add click listener
    mapInstance.addListener('click', (event) => {
      if (onMapClick) {
        // Reverse geocode to get place name and check for water
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
          if (status === 'OK' && results) {
            // Check if the clicked location is in water
            const isWater = results.some(result => {
              return result.types && (
                result.types.includes('natural_feature') ||
                result.types.includes('body_of_water') ||
                result.types.includes('ocean') ||
                result.types.includes('sea') ||
                result.types.includes('lake') ||
                result.types.includes('river')
              );
            });
            
            if (isWater) {
              // Find the first non-water result (usually the nearest land)
              const landResult = results.find(result => {
                return !result.types || !(
                  result.types.includes('natural_feature') ||
                  result.types.includes('body_of_water') ||
                  result.types.includes('ocean') ||
                  result.types.includes('sea') ||
                  result.types.includes('lake') ||
                  result.types.includes('river')
                );
              });
              
              if (landResult && landResult.geometry) {
                // Use the land location
                const landLocation = landResult.geometry.location;
                const landLat = typeof landLocation.lat === 'function' ? landLocation.lat() : landLocation.lat;
                const landLng = typeof landLocation.lng === 'function' ? landLocation.lng() : landLocation.lng;
                
                let name = '';
                if (landResult.address_components && landResult.address_components.length > 0) {
                  const types = ['route', 'neighborhood', 'locality'];
                  for (const type of types) {
                    const component = landResult.address_components.find(comp => comp.types.includes(type));
                    if (component) {
                      name = component.long_name;
                      break;
                    }
                  }
                  if (!name) {
                    name = landResult.address_components[0].long_name;
                  }
                }
                
                onMapClick(landLat, landLng, {
                  name: name || 'Shore Location',
                  address: landResult.formatted_address
                });
                
                return;
              }
            }
            
            // Not water or couldn't find land - proceed normally
            const result = results[0];
            let name = '';
            if (result.address_components && result.address_components.length > 0) {
              // Try to get a meaningful short name
              const types = ['establishment', 'point_of_interest', 'route', 'neighborhood', 'locality'];
              for (const type of types) {
                const component = result.address_components.find(comp => comp.types.includes(type));
                if (component) {
                  name = component.long_name;
                  break;
                }
              }
              if (!name) {
                name = result.address_components[0].long_name;
              }
            }
            
            onMapClick(event.latLng.lat(), event.latLng.lng(), {
              name: name || 'Selected Location',
              address: result.formatted_address
            });
          } else {
            // Fallback if geocoding fails
            onMapClick(event.latLng.lat(), event.latLng.lng());
          }
        });
      }
    });

  }, [onMapClick, center]);

  useEffect(() => {
    if (window.google) {
      initMap();
    }
  }, [initMap]);

  // Handle center changes from search only when requested
  useEffect(() => {
    if (map && center && shouldCenterMap) {
      map.setCenter(center);
      map.setZoom(16); // Zoom in when centering on a searched location
      
      // Notify parent that centering is complete
      if (onMapCentered) {
        onMapCentered();
      }
    }
  }, [map, center, shouldCenterMap, onMapCentered]);


  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      
      {/* Render child components */}
      <RouteSegmentManager
        map={map}
        directionsService={directionsService}
        directionsRoute={directionsRoute}
        onRouteDragged={onRouteDragged}
      />
      
      <RouteAnimator
        map={map}
        directionsRoute={directionsRoute}
        onAnimationStateChange={onAnimationStateChange}
      />
      
    </div>
  );
};

export default React.memo(MapComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders
  // Only re-render if specific props change that actually affect the map
  return (
    JSON.stringify(prevProps.center) === JSON.stringify(nextProps.center) &&
    prevProps.shouldCenterMap === nextProps.shouldCenterMap &&
    // Use stable routeId for comparison
    prevProps.directionsRoute?.routeId === nextProps.directionsRoute?.routeId
  );
});