import { useEffect, useRef } from 'react';
import { createMarkerContent, clearAdvancedMarker, createPolylineOptions } from '../utils/mapHelpers';

const TripRenderer = ({ 
  map, 
  directionsService,
  trip, 
  isCreating,
  isDirectionsMode 
}) => {
  const markersRef = useRef([]);
  const routeRenderersRef = useRef([]);
  const segmentMarkersRef = useRef([]);

  // Render existing trip
  useEffect(() => {
    if (!map || !trip || isCreating || isDirectionsMode) return;

    // Clear existing markers and routes
    markersRef.current.forEach(marker => clearAdvancedMarker(marker));
    markersRef.current = [];
    
    // Clear routes directly
    routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
    routeRenderersRef.current = [];
    
    // Clear segment markers
    segmentMarkersRef.current.forEach(marker => clearAdvancedMarker(marker));
    segmentMarkersRef.current = [];

    // Add markers for trip segments
    const { AdvancedMarkerElement } = window.google.maps.marker;
    const newMarkers = [];
    
    trip.segments.forEach((segment, index) => {
      // Start marker
      const startContent = createMarkerContent(segment.icon, segment.color);
      const startMarker = new AdvancedMarkerElement({
        position: { lat: segment.coordinates[0][0], lng: segment.coordinates[0][1] },
        map: map,
        title: index === 0 ? 'Trip Start' : `Transfer to ${segment.mode}`,
        content: startContent
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 4px;">
              ${segment.icon} ${segment.mode.charAt(0).toUpperCase() + segment.mode.slice(1)}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              ${index === 0 ? 'Start your journey' : `Continue by ${segment.mode}`}
            </div>
          </div>
        `
      });

      startMarker.addListener('click', () => {
        infoWindow.open(map, startMarker);
      });

      newMarkers.push(startMarker);

      // End marker for last segment
      if (index === trip.segments.length - 1) {
        const endContent = createMarkerContent('🏁', '#10b981');
        const endMarker = new AdvancedMarkerElement({
          position: { 
            lat: segment.coordinates[segment.coordinates.length - 1][0], 
            lng: segment.coordinates[segment.coordinates.length - 1][1] 
          },
          map: map,
          title: 'Trip End',
          content: endContent
        });

        const endInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <div style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 4px;">
                🏁 Trip Complete
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                Final destination reached
              </div>
            </div>
          `
        });

        endMarker.addListener('click', () => {
          endInfoWindow.open(map, endMarker);
        });

        newMarkers.push(endMarker);
      }
    });

    markersRef.current = newMarkers;

    // Draw the trip route segments
    if (trip.segments.length > 0 && directionsService) {
      const drawTripSegments = async () => {
        const newRenderers = [];

        for (let i = 0; i < trip.segments.length; i++) {
          const segment = trip.segments[i];
          
          if (segment.coordinates.length < 2) continue;

          // Create polyline options
          const polylineOptions = createPolylineOptions(segment.mode, segment.color);

          // Create a new DirectionsRenderer for this segment
          const segmentRenderer = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: polylineOptions,
            preserveViewport: true,
            suppressInfoWindows: true,
            suppressBicyclingLayer: true
          });

          segmentRenderer.setMap(map);

          // Determine travel mode
          let travelMode = window.google.maps.TravelMode.WALKING;
          switch (segment.mode) {
            case 'bike':
              travelMode = window.google.maps.TravelMode.BICYCLING;
              break;
            case 'car':
              travelMode = window.google.maps.TravelMode.DRIVING;
              break;
            case 'bus':
              travelMode = window.google.maps.TravelMode.TRANSIT;
              break;
          }

          const startCoord = segment.coordinates[0];
          const endCoord = segment.coordinates[segment.coordinates.length - 1];

          const request = {
            origin: new window.google.maps.LatLng(startCoord[0], startCoord[1]),
            destination: new window.google.maps.LatLng(endCoord[0], endCoord[1]),
            travelMode: travelMode
          };

          try {
            const result = await new Promise((resolve, reject) => {
              directionsService.route(request, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                  resolve(result);
                } else {
                  reject(status);
                }
              });
            });

            segmentRenderer.setDirections(result);
            newRenderers.push(segmentRenderer);
          } catch (error) {
            console.error('Directions request failed for trip segment:', error);
            
            // If bus/transit route fails, fall back to driving route
            if (segment.mode === 'bus' && error === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
              
              // Create a new request with driving mode
              const fallbackRequest = {
                origin: request.origin,
                destination: request.destination,
                travelMode: window.google.maps.TravelMode.DRIVING
              };
              
              try {
                const fallbackResult = await new Promise((resolve, reject) => {
                  directionsService.route(fallbackRequest, (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                      resolve(result);
                    } else {
                      reject(status);
                    }
                  });
                });
                
                // Use the same renderer with bus styling but driving route
                segmentRenderer.setDirections(fallbackResult);
                newRenderers.push(segmentRenderer);
              } catch (fallbackError) {
                console.error('Fallback driving route also failed:', fallbackError);
              }
            }
          }
        }

        routeRenderersRef.current = newRenderers;
      };

      // Fit bounds to show all coordinates
      const allCoordinates = trip.segments.flatMap(segment => 
        segment.coordinates.map(coord => ({ lat: coord[0], lng: coord[1] }))
      );

      const bounds = new window.google.maps.LatLngBounds();
      allCoordinates.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds);

      // Draw the segments
      drawTripSegments();
    }
  }, [map, trip, isCreating, directionsService, isDirectionsMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => clearAdvancedMarker(marker));
      routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
      segmentMarkersRef.current.forEach(marker => clearAdvancedMarker(marker));
    };
  }, []);

  return null;
};

export default TripRenderer;