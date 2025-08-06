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
  const zoomListenerRef = useRef(null);
  const currentZoomRef = useRef(13);

  // Calculate marker scale based on zoom level
  const getMarkerScale = (zoom) => {
    // Base scale at zoom 13
    const baseZoom = 13;
    const maxScale = 1.2;  // Maximum scale at high zoom
    const minScale = 0.5;  // Minimum scale at low zoom
    
    // Scale decreases as you zoom out
    const scaleFactor = Math.pow(2, (zoom - baseZoom) * 0.15);
    return Math.max(minScale, Math.min(maxScale, scaleFactor));
  };

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
        // Silently ignore clearing errors
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
    const scale = getMarkerScale(currentZoomRef.current);
    const markerContent = createMarkerContent(icon, color, false, null, null, scale);
    
    // Add intelligent offset to avoid Google's transit markers and labels
    let offsetLat = 0.00015; // Default offset
    let offsetLng = 0.00015;
    
    // For bus stops, use a larger offset to avoid route number labels
    if (isBusStop || icon === '🚌') {
      offsetLat = 0.0004; // Larger offset for bus stops
      offsetLng = 0.0002; // Larger horizontal offset
    }
    
    // Vary offset based on marker index to avoid overlapping our own markers
    const markerIndex = title === 'Start' ? 0 : title === 'End' ? 2 : 1;
    offsetLat += markerIndex * 0.00005;
    offsetLng -= markerIndex * 0.00005;
    
    const offsetLocation = {
      lat: location.lat + offsetLat,
      lng: location.lng + offsetLng
    };
    
    const marker = new AdvancedMarkerElement({
      position: offsetLocation,
      map: map,
      title: title,
      content: markerContent,
      zIndex: zIndex,
      collisionBehavior: window.google.maps.CollisionBehavior.REQUIRED
    });
    
    // Store the base icon and color for updates
    marker._icon = icon;
    marker._color = color;
    
    return marker;
  };

  // Create a transition marker (two icons)
  const createTransitionMarker = (location, fromIcon, fromColor, toIcon, toColor) => {
    const { AdvancedMarkerElement } = window.google.maps.marker;
    const scale = getMarkerScale(currentZoomRef.current);
    const transitionContent = createMarkerContent(fromIcon, fromColor, true, toIcon, toColor, scale);
    
    // Add intelligent offset to avoid Google's transit markers and labels
    let offsetLat = 0.0002; // Larger default for transitions
    let offsetLng = 0.0002;
    
    // If either mode is bus, use larger offset
    if (fromIcon === '🚌' || toIcon === '🚌') {
      offsetLat = 0.0005; // Much larger offset for bus transitions
      offsetLng = 0.0003; // Larger horizontal offset
    }
    
    const offsetLocation = {
      lat: location.lat + offsetLat,
      lng: location.lng + offsetLng
    };
    
    const marker = new AdvancedMarkerElement({
      position: offsetLocation,
      map: map,
      title: `Transfer`,
      content: transitionContent,
      zIndex: 5100, // Higher than regular markers
      collisionBehavior: window.google.maps.CollisionBehavior.REQUIRED
    });
    
    // Store the icons and colors for updates
    marker._fromIcon = fromIcon;
    marker._fromColor = fromColor;
    marker._toIcon = toIcon;
    marker._toColor = toColor;
    marker._isTransition = true;
    
    return marker;
  };

  // Update all markers with new scale
  const updateMarkersScale = useCallback(() => {
    if (!map) return;
    
    const newZoom = map.getZoom();
    currentZoomRef.current = newZoom;
    const scale = getMarkerScale(newZoom);
    
    segmentsRef.current.forEach(segment => {
      if (segment.markers) {
        // Update start marker
        if (segment.markers.start && segment.markers.start._icon) {
          const newContent = createMarkerContent(
            segment.markers.start._icon,
            segment.markers.start._color,
            false,
            null,
            null,
            scale
          );
          segment.markers.start.content = newContent;
        }
        
        // Update end marker
        if (segment.markers.end && segment.markers.end._icon) {
          const newContent = createMarkerContent(
            segment.markers.end._icon,
            segment.markers.end._color,
            false,
            null,
            null,
            scale
          );
          segment.markers.end.content = newContent;
        }
        
        // Update transition marker
        if (segment.markers.transition && segment.markers.transition._isTransition) {
          const newContent = createMarkerContent(
            segment.markers.transition._fromIcon,
            segment.markers.transition._fromColor,
            true,
            segment.markers.transition._toIcon,
            segment.markers.transition._toColor,
            scale
          );
          segment.markers.transition.content = newContent;
        }
      }
    });
  }, [map]);

  // Set up zoom listener
  useEffect(() => {
    if (!map) return;
    
    // Get initial zoom
    currentZoomRef.current = map.getZoom();
    
    // Listen for zoom changes
    zoomListenerRef.current = map.addListener('zoom_changed', updateMarkersScale);
    
    return () => {
      if (zoomListenerRef.current) {
        window.google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }
    };
  }, [map, updateMarkersScale]);

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
          // Locations changed - be selective about what to clear
          // Only clear segments that are beyond the new route length
          const newSegmentCount = Math.max(0, validLocations.length - 1);
          const currentSegmentCount = segmentsRef.current.filter(s => s.id !== 'single-marker').length;
          
          if (newSegmentCount < currentSegmentCount) {
            // Route shortened - clear extra segments
            for (let i = currentSegmentCount - 1; i >= newSegmentCount; i--) {
              clearSegment(segmentsRef.current[i]);
              segmentsRef.current.splice(i, 1);
            }
          }
          // For route extension, we'll handle it in the rendering section
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
        // Check if mode changed
        const currentMode = validModes[0] || 'walk';
        
        if (existingMarker.mode !== currentMode) {
          // Mode changed, clear the old marker and create new one
          clearSegment(existingMarker);
          segmentsRef.current = [];
        } else {
          // Same marker already exists, don't recreate it
          return;
        }
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
        
        // Start with existing segments that are still valid
        const newSegments = [];
        const existingSegmentCount = segmentsRef.current.filter(s => s.id !== 'single-marker').length;
        
        // Copy existing segments that are still valid
        for (let i = 0; i < Math.min(existingSegmentCount, validLocations.length - 1); i++) {
          if (segmentsRef.current[i] && segmentsRef.current[i].id !== 'single-marker') {
            newSegments.push(segmentsRef.current[i]);
          }
        }
        
        // Only render new segments (those that don't exist yet)
        const startIndex = existingSegmentCount;
        
        for (let i = startIndex; i < validLocations.length - 1; i++) {
          const segmentMode = validModes[i] || 'walk';
          const segmentOrigin = validLocations[i];
          const segmentDestination = validLocations[i + 1];
          
          // Determine travel mode (bus uses DRIVING for reliability)
          let travelMode = window.google.maps.TravelMode.WALKING;
          switch (segmentMode) {
            case 'bike':
              travelMode = window.google.maps.TravelMode.BICYCLING;
              break;
            case 'car':
            case 'bus': // Treat bus as driving for reliable routes
              travelMode = window.google.maps.TravelMode.DRIVING;
              break;
            case 'walk':
            default:
              travelMode = window.google.maps.TravelMode.WALKING;
              break;
          }
          
          // Validate locations before making request
          if (!segmentOrigin || !segmentDestination || 
              segmentOrigin.lat == null || segmentOrigin.lng == null ||
              segmentDestination.lat == null || segmentDestination.lng == null) {
            // Invalid segment locations, skip this segment
            continue;
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
                // Extra safety check for travelMode
                if (!request || !request.travelMode) {
                  reject('Invalid request: missing travelMode');
                  return;
                }
                
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
              // If bike mode fails, try walking
              if (segmentMode === 'bike') {
                try {
                  const altRequest = {
                    origin: request.origin,
                    destination: request.destination,
                    travelMode: window.google.maps.TravelMode.WALKING
                  };
                  
                  result = await new Promise((resolve, reject) => {
                    directionsService.route(altRequest, (result, status) => {
                      if (status === window.google.maps.DirectionsStatus.OK) {
                        resolve(result);
                      } else {
                        reject(status);
                      }
                    });
                  });
                  
                  routeFound = true;
                } catch (altErr) {
                  // Walking also failed
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
            if (i === 0 && startIndex === 0) {
              // Check if we already have a single marker at this location
              const existingSingleMarker = segmentsRef.current.length === 1 && 
                segmentsRef.current[0].id === 'single-marker' &&
                segmentsRef.current[0].startLocation.lat === segmentOrigin.lat &&
                segmentsRef.current[0].startLocation.lng === segmentOrigin.lng;
              
              if (existingSingleMarker) {
                
                // Check if mode changed
                if (segmentsRef.current[0].mode !== segmentMode) {
                  // Mode changed, clear the old marker and create new one
                  clearAdvancedMarker(segmentsRef.current[0].markers.start);
                  markers.start = createMarker(
                    segmentOrigin,
                    modeIcon,
                    modeColor,
                    'Start',
                    5000,
                    segmentMode === 'bus'
                  );
                  segmentsRef.current = [];
                } else {
                  // Reuse the existing marker
                  markers.start = segmentsRef.current[0].markers.start;
                  // Remove the single marker from segmentsRef but don't clear it from the map
                  const singleMarkerSegment = segmentsRef.current[0];
                  segmentsRef.current = [];
                  // Make sure we don't accidentally clear this marker later
                  delete singleMarkerSegment.markers.start;
                }
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
            
            // Insert at the correct index to maintain order
            newSegments[i] = segment;
            
          } catch (error) {
            
            // Last resort: try to find ANY route that gets us closer
            const straightLinePath = [
              new window.google.maps.LatLng(segmentOrigin.lat, segmentOrigin.lng),
              new window.google.maps.LatLng(segmentDestination.lat, segmentDestination.lng)
            ];
            
            // This should rarely happen now since we try multiple modes
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
                
                // Insert at the correct index to maintain order
                newSegments[i] = segment;
                
              } catch (fallbackError) {
                // Fallback driving route also failed
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