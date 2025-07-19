import { useEffect, useRef } from 'react';
import { createMarkerContent, clearAdvancedMarker, createPolylineOptions, getTransportationColor } from '../utils/mapHelpers';

const WaypointManager = ({ 
  map, 
  directionsService,
  isCreating, 
  waypoints, 
  segments, 
  onWaypointsChange 
}) => {
  const markersRef = useRef([]);
  const routeRenderersRef = useRef([]);
  const segmentMarkersRef = useRef([]);

  // Add waypoint markers for trip creation
  useEffect(() => {
    if (!map || !isCreating) return;

    // Clear existing markers and routes
    markersRef.current.forEach(marker => clearAdvancedMarker(marker));
    markersRef.current = [];
    
    // Clear routes directly
    routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
    routeRenderersRef.current = [];
    
    const { AdvancedMarkerElement } = window.google.maps.marker;
    
    const newMarkers = waypoints.map((point, index) => {
      const content = createMarkerContent((index + 1).toString(), '#3b82f6');
      content.style.fontSize = '16px';
      content.style.fontWeight = 'bold';
      content.style.width = '36px';
      content.style.height = '36px';
      
      const marker = new AdvancedMarkerElement({
        position: { lat: point[0], lng: point[1] },
        map: map,
        title: `Waypoint ${index + 1}`,
        gmpDraggable: true,
        content: content
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="font-weight: 600; font-size: 12px; color: #1f2937;">
              Waypoint ${index + 1}
            </div>
            <div style="font-size: 10px; color: #6b7280; font-family: monospace;">
              ${point[0].toFixed(4)}, ${point[1].toFixed(4)}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      // Add drag end listener to update waypoint position
      marker.addListener('dragend', () => {
        const position = marker.position;
        const newLat = position.lat;
        const newLng = position.lng;
        
        // Update waypoint in the array
        const updatedWaypoints = [...waypoints];
        updatedWaypoints[index] = [newLat, newLng];
        
        // Call parent's update function
        if (onWaypointsChange) {
          onWaypointsChange(updatedWaypoints);
        }
        
      });

      return marker;
    });

    markersRef.current = newMarkers;

    // Draw colored segments if we have them
    if (segments.length > 0 && waypoints.length >= 2 && directionsService) {
      const drawSegments = async () => {
        // Clear existing segment markers
        segmentMarkersRef.current.forEach(marker => clearAdvancedMarker(marker));
        segmentMarkersRef.current = [];

        const newPolylines = [];

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const startPoint = waypoints[segment.startIndex];
          const endPoint = waypoints[segment.endIndex];

          if (!startPoint || !endPoint) continue;

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
            default:
              travelMode = window.google.maps.TravelMode.WALKING;
          }

          const request = {
            origin: new window.google.maps.LatLng(startPoint[0], startPoint[1]),
            destination: new window.google.maps.LatLng(endPoint[0], endPoint[1]),
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

            // Create draggable polyline
            const route = result.routes[0];
            const polylineOptions = createPolylineOptions(segment.mode, getTransportationColor(segment.mode));
            polylineOptions.path = route.overview_path;
            polylineOptions.geodesic = true;
            polylineOptions.draggable = true;
            polylineOptions.editable = true;

            const polyline = new window.google.maps.Polyline(polylineOptions);
            polyline.setMap(map);

            // Listen for path changes when dragging
            polyline.addListener('mouseup', () => {
              const newPath = polyline.getPath();
              if (newPath && newPath.getLength() > 0) {
                // Update the segment waypoints based on new path
                const startPoint = newPath.getAt(0);
                const endPoint = newPath.getAt(newPath.getLength() - 1);
                
                if (onWaypointsChange && segments[i]) {
                  const updatedWaypoints = [...waypoints];
                  const segment = segments[i];
                  
                  // Update start and end waypoints
                  if (segment.startIndex < updatedWaypoints.length) {
                    updatedWaypoints[segment.startIndex] = [startPoint.lat(), startPoint.lng()];
                  }
                  if (segment.endIndex < updatedWaypoints.length) {
                    updatedWaypoints[segment.endIndex] = [endPoint.lat(), endPoint.lng()];
                  }
                  
                  onWaypointsChange(updatedWaypoints);
                }
              }
            });

            // Add hover effects
            polyline.addListener('mouseover', () => {
              polyline.setOptions({
                strokeWeight: 8,
                strokeOpacity: 1,
                zIndex: 1000
              });
            });

            polyline.addListener('mouseout', () => {
              polyline.setOptions({
                strokeWeight: 6,
                strokeOpacity: 0.8,
                zIndex: 1
              });
            });

            newPolylines.push(polyline);
          } catch (error) {
            console.error('Directions request failed for segment:', error);
            
            // If bus/transit route fails, fall back to driving route
            if (segment.mode === 'bus' && error === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
              
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
                
                // Create draggable polyline with bus styling but driving route
                const route = fallbackResult.routes[0];
                const polylineOptions = createPolylineOptions(segment.mode, getTransportationColor(segment.mode));
                polylineOptions.path = route.overview_path;
                polylineOptions.geodesic = true;
                polylineOptions.draggable = true;
                polylineOptions.editable = true;

                const polyline = new window.google.maps.Polyline(polylineOptions);
                polyline.setMap(map);
                newPolylines.push(polyline);
              } catch (fallbackError) {
                console.error('Fallback driving route also failed:', fallbackError);
              }
            }
          }
        }

        routeRenderersRef.current = newPolylines;
      };

      drawSegments();
    }
  }, [map, waypoints, segments, directionsService, onWaypointsChange, isCreating]);

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

export default WaypointManager;