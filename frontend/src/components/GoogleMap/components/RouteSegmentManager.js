import { useEffect, useRef, useCallback } from 'react';
import { getTransportationColor, createPolylineOptions, createMarkerContent, clearAdvancedMarker } from '../utils/mapHelpers';
import { TRANSPORT_ICONS } from '../utils/constants';

const RouteSegmentManager = ({ 
  map, 
  directionsService, 
  directionsRoute,
  onRouteDragged 
}) => {
  const segmentsRef = useRef([]);
  const currentRouteIdRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);

  // Helper function to clear a single segment (route + markers)
  const clearSegment = (segment) => {
    if (!segment) return;
    
    // Clear route
    if (segment.routeRenderer) {
      if (segment.routeRenderer._hoverPolyline) {
        segment.routeRenderer._hoverPolyline.setMap(null);
      }
      segment.routeRenderer.setMap(null);
      try {
        segment.routeRenderer.setDirections({ routes: [] });
      } catch (e) {
        console.warn('Error clearing route:', e);
      }
    }
    
    // Clear markers
    if (segment.markers) {
      if (segment.markers.start) clearAdvancedMarker(segment.markers.start);
      if (segment.markers.end) clearAdvancedMarker(segment.markers.end);
      if (segment.markers.transition) clearAdvancedMarker(segment.markers.transition);
    }
  };

  // Helper function to clear all segments
  const clearAllSegments = useCallback(() => {
    segmentsRef.current.forEach((segment, index) => {
      clearSegment(segment);
    });
    segmentsRef.current = [];
  }, []);

  // Create a marker
  const createMarker = (location, icon, color, title, zIndex = 5000, isBusStop = false) => {
    const { AdvancedMarkerElement } = window.google.maps.marker;
    const markerContent = createMarkerContent(icon, color);
    
    // Add offset to avoid Google's transit markers and labels
    let offsetLat = 0.0001; // Default small offset
    let offsetLng = 0;
    
    // For bus stops, use a larger offset to avoid route number labels
    if (isBusStop || icon === '🚌') {
      offsetLat = 0.0003; // Larger offset for bus stops
      offsetLng = 0.0001; // Slight horizontal offset too
    }
    
    const offsetLocation = {
      lat: location.lat + offsetLat,
      lng: location.lng + offsetLng
    };
    
    return new AdvancedMarkerElement({
      position: offsetLocation,
      map: map,
      title: title,
      content: markerContent,
      zIndex: zIndex,
      collisionBehavior: window.google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
    });
  };

  // Create a transition marker (two icons)
  const createTransitionMarker = (location, fromIcon, fromColor, toIcon, toColor) => {
    const { AdvancedMarkerElement } = window.google.maps.marker;
    const transitionContent = createMarkerContent(fromIcon, fromColor, true, toIcon, toColor);
    
    // Add offset to avoid Google's transit markers and labels
    let offsetLat = 0.0001; // Default small offset
    let offsetLng = 0;
    
    // If either mode is bus, use larger offset
    if (fromIcon === '🚌' || toIcon === '🚌') {
      offsetLat = 0.0003; // Larger offset for bus transitions
      offsetLng = 0.0001; // Slight horizontal offset too
    }
    
    const offsetLocation = {
      lat: location.lat + offsetLat,
      lng: location.lng + offsetLng
    };
    
    return new AdvancedMarkerElement({
      position: offsetLocation,
      map: map,
      title: `Transfer`,
      content: transitionContent,
      zIndex: 5100, // Higher than regular markers
      collisionBehavior: window.google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
    });
  };

  // Main effect to render route segments with their markers
  useEffect(() => {
    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (!map || !directionsService || !directionsRoute) {
      clearAllSegments();
      return;
    }
    
    // Handle empty route (used for clearing)
    if (directionsRoute.routeId === 'empty' || !directionsRoute.allLocations || directionsRoute.allLocations.length === 0) {
      clearAllSegments();
      return;
    }

    const { allLocations, allModes } = directionsRoute;
    
    // Additional check: if all locations are null, clear everything
    if (allLocations.every(loc => !loc)) {
      clearAllSegments();
      return;
    }
    
    // Filter out null locations
    const validLocations = allLocations.filter(loc => loc !== null && loc !== undefined);
    // For modes: keep at least 1 mode for single location, or n-1 modes for n locations
    const validModes = allModes.slice(0, Math.max(1, validLocations.length - 1));
    
    // If no valid locations, clear everything
    if (validLocations.length === 0) {
      clearAllSegments();
      return;
    }
    
    // For single location, only clear if we don't already have a single marker
    if (validLocations.length === 1) {
      const alreadyHasSingleMarker = segmentsRef.current.length === 1 && 
                                     segmentsRef.current[0].id === 'single-marker';
      if (!alreadyHasSingleMarker) {
        clearAllSegments();
      }
    } else {
      // Special case: transitioning from 1 location to 2 locations
      const wasSingleMarker = segmentsRef.current.length === 1 && 
        segmentsRef.current[0].id === 'single-marker' &&
        validLocations.length === 2;
      
      if (wasSingleMarker) {
        // Keep the single marker - it will become the start marker of the route
        console.log('Keeping single marker as route start');
      } else {
        // Check if only modes changed (same locations)
        const prevLocations = segmentsRef.current
          .filter(s => s.startLocation) // Only get segments with actual locations
          .map(s => s.startLocation);
        const currentLocations = validLocations?.slice(0, -1) || [];
        const locationsSame = prevLocations.length === currentLocations.length && 
          JSON.stringify(prevLocations) === JSON.stringify(currentLocations);
        
        // If only modes changed, we need to recalculate routes
        // because bus/transit routes follow different paths than walking/driving
        if (locationsSame && segmentsRef.current.length > 0) {
          const modesChanged = segmentsRef.current.some((segment, i) => {
            const newMode = validModes[i] || 'walk';
            return segment.mode !== newMode;
          });
          
          if (modesChanged) {
            // Clear all segments and recalculate with new modes
            clearAllSegments();
            // Continue to the normal route calculation below
          } else {
            // No changes needed, return early
            return;
          }
        } else if (locationsSame) {
          // Same locations and modes, no update needed
          return;
        } else {
          // Clear existing segments only if locations changed
          clearAllSegments();
        }
      }
    }
    
    // Show markers even with just 1 location
    if (!validLocations || validLocations.length < 1) {
      return;
    }
    
    // If only 1 location, just show the marker without a route
    if (validLocations.length === 1) {
      // Check if we already have this exact marker
      const existingMarker = segmentsRef.current.find(s => s.id === 'single-marker');
      if (existingMarker && 
          existingMarker.startLocation.lat === validLocations[0].lat && 
          existingMarker.startLocation.lng === validLocations[0].lng) {
        // Same marker already exists, don't recreate it
        return;
      }
      
      const location = validLocations[0];
      const mode = validModes[0] || 'walk';
      const modeIcon = TRANSPORT_ICONS[mode] || '🚶';
      const modeColor = getTransportationColor(mode);
      
      const marker = createMarker(
        location,
        modeIcon,
        modeColor,
        'Start',
        5000,
        mode === 'bus'
      );
      
      segmentsRef.current = [{
        id: 'single-marker',
        markers: { start: marker },
        startLocation: location,
        mode: mode
      }];
      
      // Don't pan - let user control the viewport
      
      return;
    }

    // Generate a unique ID for this route render
    const routeId = Date.now();
    currentRouteIdRef.current = routeId;
    
    // Render immediately for better UX
    const renderSegments = async () => {
        // Check if this is still the current route
        if (currentRouteIdRef.current !== routeId) {
          return;
        }
        
        const newSegments = [];
        
        for (let i = 0; i < validLocations.length - 1; i++) {
          const segmentMode = validModes[i] || 'walk';
          const segmentOrigin = validLocations[i];
          const segmentDestination = validLocations[i + 1];
          
          // Determine travel mode
          let travelMode = window.google.maps.TravelMode.WALKING;
          switch (segmentMode) {
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
          
          const request = {
            origin: new window.google.maps.LatLng(segmentOrigin.lat, segmentOrigin.lng),
            destination: new window.google.maps.LatLng(segmentDestination.lat, segmentDestination.lng),
            travelMode: travelMode
          };
          
          // Create polyline options
          const polylineOptions = createPolylineOptions(segmentMode);
          
          try {
            let result;
            let routeFound = false;
            
            // First try the requested mode
            try {
              result = await new Promise((resolve, reject) => {
                directionsService.route(request, (result, status) => {
                  if (status === window.google.maps.DirectionsStatus.OK) {
                    resolve(result);
                  } else {
                    reject(status);
                  }
                });
              });
              routeFound = true;
            } catch (err) {
              console.log(`No ${segmentMode} route found, trying alternatives...`);
              
              // Try alternative modes
              const alternatives = [];
              if (segmentMode === 'bus') {
                alternatives.push(
                  { mode: window.google.maps.TravelMode.DRIVING, name: 'driving' },
                  { mode: window.google.maps.TravelMode.WALKING, name: 'walking' }
                );
              } else if (segmentMode === 'car') {
                alternatives.push(
                  { mode: window.google.maps.TravelMode.WALKING, name: 'walking' }
                );
              } else if (segmentMode === 'bike') {
                alternatives.push(
                  { mode: window.google.maps.TravelMode.WALKING, name: 'walking' },
                  { mode: window.google.maps.TravelMode.DRIVING, name: 'driving' }
                );
              }
              
              for (const alt of alternatives) {
                try {
                  const altRequest = {
                    origin: request.origin,
                    destination: request.destination,
                    travelMode: alt.mode
                  };
                  
                  result = await new Promise((resolve, reject) => {
                    directionsService.route(altRequest, (result, status) => {
                      if (status === window.google.maps.DirectionsStatus.OK) {
                        console.log(`Using ${alt.name} route as fallback for ${segmentMode}`);
                        resolve(result);
                      } else {
                        reject(status);
                      }
                    });
                  });
                  
                  routeFound = true;
                  break;
                } catch (altErr) {
                  continue;
                }
              }
            }
            
            if (!routeFound) {
              throw new Error('No route found with any travel mode');
            }
            
            // Check if this is still the current route after async operation
            if (currentRouteIdRef.current !== routeId) {
              return;
            }
            
            
            // Create the route renderer
            const rendererOptions = {
              suppressMarkers: true,
              polylineOptions: polylineOptions,
              draggable: true,
              preserveViewport: true,
              suppressInfoWindows: true,
              suppressBicyclingLayer: true
            };
            
            // For bus routes, suppress transit layer to avoid label conflicts
            if (segmentMode === 'bus') {
              rendererOptions.suppressPolylines = false;
              rendererOptions.markerOptions = {
                visible: false
              };
            }
            
            // Only create DirectionsRenderer if we have a valid result
            if (!result || !result.routes || !result.routes[0]) {
              throw new Error('Invalid directions result');
            }
            
            const segmentRenderer = new window.google.maps.DirectionsRenderer(rendererOptions);
            
            segmentRenderer.setMap(map);
            segmentRenderer.setDirections(result);
            
            // Create markers for this segment
            const markers = {};
            const modeIcon = TRANSPORT_ICONS[segmentMode] || '🚶';
            const modeColor = getTransportationColor(segmentMode);
            
            // Add start marker (only for first segment and if we don't already have one)
            if (i === 0) {
              // Check if we already have a single marker at this location
              const existingSingleMarker = segmentsRef.current.length === 1 && 
                segmentsRef.current[0].id === 'single-marker' &&
                segmentsRef.current[0].startLocation.lat === segmentOrigin.lat &&
                segmentsRef.current[0].startLocation.lng === segmentOrigin.lng;
              
              if (existingSingleMarker) {
                // Reuse the existing marker
                markers.start = segmentsRef.current[0].markers.start;
                // Remove the single marker from segmentsRef but don't clear it from the map
                const singleMarkerSegment = segmentsRef.current[0];
                segmentsRef.current = [];
                // Make sure we don't accidentally clear this marker later
                delete singleMarkerSegment.markers.start;
              } else {
                // Create new start marker
                markers.start = createMarker(
                  segmentOrigin,
                  modeIcon,
                  modeColor,
                  'Start',
                  5000,
                  segmentMode === 'bus'
                );
              }
            }
            
            // Check if this is the last segment
            const isLastSegment = i === validLocations.length - 2;
            
            // Add transition marker if mode changes to next segment
            if (!isLastSegment && i < validModes.length - 1 && validModes[i] !== validModes[i + 1]) {
              const nextMode = validModes[i + 1];
              const nextIcon = TRANSPORT_ICONS[nextMode] || '🚶';
              const nextColor = getTransportationColor(nextMode);
              
              markers.transition = createTransitionMarker(
                segmentDestination,
                modeIcon,
                modeColor,
                nextIcon,
                nextColor
              );
            }
            
            // Add end marker for last segment
            if (isLastSegment) {
              markers.end = createMarker(
                segmentDestination,
                modeIcon,
                modeColor,
                'End',
                5000,
                segmentMode === 'bus'
              );
            }
            
            // Create hover polyline for better interaction
            const hoverPolyline = new window.google.maps.Polyline({
              path: result.routes[0].overview_path,
              strokeColor: 'transparent',
              strokeOpacity: 0,
              strokeWeight: 20,
              zIndex: 1000,
              map: map
            });
            
            // Add hover listeners
            hoverPolyline.addListener('mouseover', () => {
              segmentRenderer.setOptions({
                polylineOptions: {
                  ...polylineOptions,
                  strokeWeight: 7,
                  strokeOpacity: 1,
                  zIndex: 1001
                }
              });
              map.setOptions({ draggableCursor: 'grab' });
            });
            
            hoverPolyline.addListener('mouseout', () => {
              segmentRenderer.setOptions({
                polylineOptions: polylineOptions
              });
              map.setOptions({ draggableCursor: null });
            });
            
            // Store reference to hover polyline
            segmentRenderer._hoverPolyline = hoverPolyline;
            
            // Listen for route changes when dragged
            segmentRenderer.addListener('directions_changed', () => {
              const newDirections = segmentRenderer.getDirections();
              if (onRouteDragged && newDirections.routes[0]) {
                const route = newDirections.routes[0];
                const newWaypoints = [];
                
                if (route.overview_path && route.overview_path.length > 2) {
                  const midIndex = Math.floor(route.overview_path.length / 2);
                  const midPoint = route.overview_path[midIndex];
                  newWaypoints.push({
                    location: {
                      lat: midPoint.lat(),
                      lng: midPoint.lng()
                    }
                  });
                }
                
                onRouteDragged({
                  segmentIndex: i,
                  waypoints: newWaypoints
                });
              }
            });
            
            // Store the complete segment
            const segment = {
              id: `segment-${i}`,
              index: i,
              mode: segmentMode,
              startLocation: segmentOrigin,
              endLocation: segmentDestination,
              routeRenderer: segmentRenderer,
              markers: markers
            };
            
            newSegments.push(segment);
            
          } catch (error) {
            console.warn(`Directions request failed for segment ${i}:`, error);
            
            // Last resort: try to find ANY route that gets us closer
            const straightLinePath = [
              new window.google.maps.LatLng(segmentOrigin.lat, segmentOrigin.lng),
              new window.google.maps.LatLng(segmentDestination.lat, segmentDestination.lng)
            ];
            
            // This should rarely happen now since we try multiple modes
            console.error(`Could not find any route for segment ${i}`);
            continue;
            
            // Handle transit fallback
            if (segmentMode === 'bus' && error === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
              
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
                      // Even fallback failed, use straight line
                      const straightLineRoute = {
                        routes: [{
                          overview_path: [
                            request.origin,
                            request.destination
                          ],
                          legs: [{
                            start_location: request.origin,
                            end_location: request.destination,
                            steps: [],
                            distance: { text: 'Direct path', value: 0 },
                            duration: { text: '', value: 0 }
                          }],
                          warnings: ['No transit/road found - showing direct path']
                        }]
                      };
                      resolve(straightLineRoute);
                    }
                  });
                });
                
                // Check if this is still the current route after async operation
                if (currentRouteIdRef.current !== routeId) {
                  return;
                }
                
                // Create the route renderer with bus styling but driving route
                const segmentRenderer = new window.google.maps.DirectionsRenderer({
                  suppressMarkers: true,
                  polylineOptions: polylineOptions, // Still use bus colors
                  draggable: true,
                  preserveViewport: true,
                  suppressInfoWindows: true,
                  suppressBicyclingLayer: true
                });
                
                segmentRenderer.setMap(map);
                segmentRenderer.setDirections(fallbackResult);
                
                // Create markers for this segment
                const markers = {};
                const modeIcon = TRANSPORT_ICONS[segmentMode] || '🚶';
                const modeColor = getTransportationColor(segmentMode);
                
                // Add start marker (only for first segment)
                if (i === 0) {
                  markers.start = createMarker(
                    segmentOrigin,
                    modeIcon,
                    modeColor,
                    'Start'
                  );
                }
                
                // Check if this is the last segment
                const isLastSegment = i === validLocations.length - 2;
                
                // Add transition marker if mode changes to next segment
                if (!isLastSegment && i < validModes.length - 1 && validModes[i] !== validModes[i + 1]) {
                  const nextMode = validModes[i + 1];
                  const nextIcon = TRANSPORT_ICONS[nextMode] || '🚶';
                  const nextColor = getTransportationColor(nextMode);
                  
                  markers.transition = createTransitionMarker(
                    segmentDestination,
                    modeIcon,
                    modeColor,
                    nextIcon,
                    nextColor
                  );
                }
                
                // Add end marker for last segment
                if (isLastSegment) {
                  markers.end = createMarker(
                    segmentDestination,
                    modeIcon,
                    modeColor,
                    'End',
                    5000,
                    segmentMode === 'bus'
                  );
                }
                
                // Store the complete segment
                const segment = {
                  id: `segment-${i}`,
                  index: i,
                  mode: segmentMode,
                  startLocation: segmentOrigin,
                  endLocation: segmentDestination,
                  routeRenderer: segmentRenderer,
                  markers: markers,
                  isFallback: true // Mark as fallback route
                };
                
                newSegments.push(segment);
                
              } catch (fallbackError) {
                console.error('Fallback driving route also failed:', fallbackError);
              }
            }
          }
        }
        
        // Only update if this is still the current route
        if (currentRouteIdRef.current === routeId) {
          segmentsRef.current = newSegments;
        }
    };
    
    renderSegments();

    // Cleanup function
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [map, directionsRoute, directionsService, onRouteDragged, clearAllSegments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      clearAllSegments();
    };
  }, [clearAllSegments]);

  return null;
};

export default RouteSegmentManager;