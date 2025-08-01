import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStop } from '@fortawesome/free-solid-svg-icons';
import { TRANSPORTATION_COLORS, TRANSPORT_ICONS } from '../GoogleMap/utils/constants';
import DragHandle from '../common/DragHandle';
import Modal from './Modal';
import './RouteAnimator.css';

const RouteAnimator = ({ map, directionsRoute, onAnimationStateChange }) => {
  const [isMinimized, setIsMinimized] = useState(false); // Start open
  const [isAnimating, setIsAnimatingState] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [position, setPosition] = useState({ x: Math.max(10, window.innerWidth - 480), y: window.innerHeight - 250 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  
  // Store position before minimizing
  const savedPositionRef = useRef(null);
  const mapRef = useRef(map);
  
  // Update map ref when prop changes
  useEffect(() => {
    mapRef.current = map;
  }, [map]);
  
  // Helper to show modal
  const showModal = (message, title = '', type = 'info') => {
    setModalState({ isOpen: true, title, message, type });
  };
  
  // Wrapper to notify parent when animation state changes
  const setIsAnimating = (value) => {
    setIsAnimatingState(value);
    if (onAnimationStateChange) {
      onAnimationStateChange(value);
    }
  };
  const [animationSpeed, setAnimationSpeed] = useState(3);
  const [zoomLevel, setZoomLevel] = useState('medium'); // 'close', 'medium', 'far'
  
  // Update speed ref when state changes
  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);
  const [progress, setProgress] = useState(0);
  
  const animationRef = useRef(null);
  // Removed markerRef - using pure Symbol Animation API
  const pathRef = useRef(null);
  const segmentPathsRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const isPausedRef = useRef(false);
  const prevRouteRef = useRef(null);
  const animateRef = useRef(null);
  const distanceTraveledRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const animationSpeedRef = useRef(animationSpeed);
  // Removed position refs - not needed with Symbol Animation API
  const cameraUpdateIntervalRef = useRef(null);
  const polylineRef = useRef(null);
  const offsetRef = useRef(0);
  const lastCameraPositionRef = useRef(null);
  const cameraVelocityRef = useRef(null);
  const markerRef = useRef(null);
  const zoomListenerRef = useRef(null);
  const currentZoomRef = useRef(13);
  const lastSymbolUpdateRef = useRef(0);
  const countRef = useRef(0); // Add ref to persist animation count

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

  // Update marker with new scale
  const updateMarkerScale = useCallback(() => {
    if (!map || !markerRef.current) return;
    
    const newZoom = map.getZoom();
    currentZoomRef.current = newZoom;
    const scale = getMarkerScale(newZoom);
    
    if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.content) {
      const currentMode = markerRef.current._currentMode || 'walk';
      const content = document.createElement('div');
      const size = 50 * scale;
      const fontSize = 24 * scale;
      const borderWidth = 4 * scale;
      
      content.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background-color: ${TRANSPORTATION_COLORS[currentMode]};
        border-radius: 50%;
        border: ${borderWidth}px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        box-shadow: 0 ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.4);
        cursor: pointer;
        transition: background-color 0.3s ease;
      `;
      content.textContent = TRANSPORT_ICONS[currentMode];
      markerRef.current.content = content;
    }
  }, [map]);

  // Define stopAnimation early so it can be used in effects
  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setIsPaused(false);
    setProgress(0);
    isAnimatingRef.current = false;
    isPausedRef.current = false;
    distanceTraveledRef.current = 0;
    lastTimestampRef.current = null;
    // Position tracking removed - handled by Symbol API
    
    // Expand the modal when animation stops
    setIsMinimized(false);
    
    // Re-enable map interactions
    if (map) {
      map.setOptions({
        draggable: true,
        scrollwheel: true,
        disableDoubleClickZoom: false,
        gestureHandling: 'auto'
      });
    }
    
    // Clear camera update interval
    if (cameraUpdateIntervalRef.current) {
      clearInterval(cameraUpdateIntervalRef.current);
      cameraUpdateIntervalRef.current = null;
    }
    
    if (zoomListenerRef.current) {
      window.google.maps.event.removeListener(zoomListenerRef.current);
      zoomListenerRef.current = null;
    }
    
    // Don't remove the polyline - just hide the animated symbol
    if (polylineRef.current) {
      // Reset the symbol to the start position
      const icons = polylineRef.current.get('icons');
      if (icons && icons.length > 0) {
        icons[0].offset = '0%';
        polylineRef.current.set('icons', icons);
      }
      // Hide the polyline that shows the animated symbol
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    
    if (markerRef.current) {
      if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.map !== undefined) {
        markerRef.current.map = null;
      } else {
        markerRef.current.setMap(null);
      }
      markerRef.current = null;
    }
    
    offsetRef.current = 0;
    countRef.current = 0; // Reset count when stopping
    lastCameraPositionRef.current = null;
    cameraVelocityRef.current = null;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [map, setIsAnimating]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Handle escape key to stop animation and unminimize
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isAnimatingRef.current) {
        stopAnimation();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [stopAnimation]);

  // Handle route changes (from undo/redo or other updates)
  useEffect(() => {
    // Check if the route actually changed
    const routeChanged = JSON.stringify(prevRouteRef.current) !== JSON.stringify(directionsRoute);
    
    if (routeChanged && isAnimating) {
      // Stop current animation when route changes
      stopAnimation();
    }
    
    // Update the previous route reference
    prevRouteRef.current = directionsRoute;
  }, [directionsRoute, isAnimating, stopAnimation]);

  // Set up zoom listener
  useEffect(() => {
    if (!map) return;
    
    // Get initial zoom
    currentZoomRef.current = map.getZoom();
    
    // Listen for zoom changes
    zoomListenerRef.current = map.addListener('zoom_changed', updateMarkerScale);
    
    return () => {
      if (zoomListenerRef.current) {
        window.google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }
    };
  }, [map, updateMarkerScale]);

  // Densify path by adding intermediate points for smoother animation
  const densifyPath = (originalPath) => {
    const densifiedPath = [];
    const maxSegmentLength = 5; // Smaller segments for smoother movement
    
    for (let i = 0; i < originalPath.length - 1; i++) {
      densifiedPath.push(originalPath[i]);
      
      const segmentDistance = window.google.maps.geometry.spherical.computeDistanceBetween(
        originalPath[i],
        originalPath[i + 1]
      );
      
      // If segment is longer than max, add intermediate points
      if (segmentDistance > maxSegmentLength) {
        const numIntermediatePoints = Math.ceil(segmentDistance / maxSegmentLength);
        
        for (let j = 1; j <= numIntermediatePoints; j++) {
          const fraction = j / (numIntermediatePoints + 1);
          const intermediatePoint = window.google.maps.geometry.spherical.interpolate(
            originalPath[i],
            originalPath[i + 1],
            fraction
          );
          densifiedPath.push(intermediatePoint);
        }
      }
    }
    
    // Add the last point
    densifiedPath.push(originalPath[originalPath.length - 1]);
    return densifiedPath;
  };

  // Get the interpolated position along the route
  const getInterpolatedPosition = (path, distance) => {
    let accumulatedDistance = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentDistance = window.google.maps.geometry.spherical.computeDistanceBetween(
        path[i], 
        path[i + 1]
      );
      
      if (accumulatedDistance + segmentDistance >= distance) {
        // We're on this segment
        const segmentProgress = (distance - accumulatedDistance) / segmentDistance;
        return window.google.maps.geometry.spherical.interpolate(
          path[i],
          path[i + 1],
          segmentProgress
        );
      }
      
      accumulatedDistance += segmentDistance;
    }
    
    // Return last position if we've exceeded the path
    return path[path.length - 1];
  };

  const startAnimation = async () => {
    if (!directionsRoute || !directionsRoute.allLocations || directionsRoute.allLocations.length < 2) {
      showModal('Please create a route with at least two locations before starting the animation.', 'No Route Available', 'warning');
      return;
    }

    setIsAnimating(true);
    setIsPaused(false);
    setProgress(0);
    isAnimatingRef.current = true;
    isPausedRef.current = false;
    
    // Save current position and minimize the panel when animation starts
    savedPositionRef.current = { ...position };
    setIsMinimized(true);
    
    // Disable map interactions during animation to prevent user from panning away
    map.setOptions({
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      gestureHandling: 'none'
    });

    // No marker cleanup needed - using pure Symbol Animation API

    // Get all DirectionsRenderer instances from the map
    const renderers = [];
    map.overlayMapTypes.forEach(() => {});
    
    // Access the route segments through a different approach
    // We'll request the directions again but extract the detailed path
    const directionsService = new window.google.maps.DirectionsService();
    const allLocations = directionsRoute.allLocations;
    const allModes = directionsRoute.allModes || [];
    
    
    let fullPath = [];
    let segmentInfo = [];
    
    try {
      // Process each segment
      for (let i = 0; i < allLocations.length - 1; i++) {
        const mode = allModes[i] || 'walk';
        let travelMode = window.google.maps.TravelMode.WALKING;
        
        switch (mode) {
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
          origin: new window.google.maps.LatLng(allLocations[i].lat, allLocations[i].lng),
          destination: new window.google.maps.LatLng(allLocations[i + 1].lat, allLocations[i + 1].lng),
          travelMode: travelMode
        };
        
        try {
          const result = await new Promise((resolve, reject) => {
            directionsService.route(request, (result, status) => {
              if (status === 'OK') {
                resolve(result);
              } else if (mode === 'bus' && status === 'ZERO_RESULTS') {
                // Fallback to driving
                const fallbackRequest = {
                  ...request,
                  travelMode: window.google.maps.TravelMode.DRIVING
                };
                directionsService.route(fallbackRequest, (fbResult, fbStatus) => {
                  if (fbStatus === 'OK') {
                    resolve(fbResult);
                  } else {
                    // Create straight line as last resort
                    const straightLineRoute = {
                      routes: [{
                        overview_path: [
                          request.origin,
                          request.destination
                        ],
                        legs: [{
                          start_location: request.origin,
                          end_location: request.destination,
                          steps: [{
                            path: [request.origin, request.destination]
                          }]
                        }]
                      }]
                    };
                    resolve(straightLineRoute);
                  }
                });
              } else {
                // Any other error - create straight line
                const straightLineRoute = {
                  routes: [{
                    overview_path: [
                      request.origin,
                      request.destination
                    ],
                    legs: [{
                      start_location: request.origin,
                      end_location: request.destination,
                      steps: [{
                        path: [request.origin, request.destination]
                      }]
                    }]
                  }]
                };
                resolve(straightLineRoute);
              }
            });
          });
          
          // Extract detailed path from the route
          if (result.routes && result.routes[0]) {
            const route = result.routes[0];
            let segmentPath = [];
            
            // Get all the detailed steps
            route.legs.forEach(leg => {
              leg.steps.forEach(step => {
                segmentPath = segmentPath.concat(step.path);
              });
            });
            
            // Store segment info
            const segmentStartIndex = fullPath.length;
            fullPath = fullPath.concat(segmentPath);
            
            segmentInfo.push({
              startIndex: segmentStartIndex,
              endIndex: fullPath.length,
              mode: mode,
              locationIndex: i
            });
            
          }
        } catch (err) {
          console.warn(`Segment ${i} failed, using straight line`, err);
          // Never fail - always show something
          const start = new window.google.maps.LatLng(allLocations[i].lat, allLocations[i].lng);
          const end = new window.google.maps.LatLng(allLocations[i + 1].lat, allLocations[i + 1].lng);
          
          // Add many intermediate points for smoother animation
          const interpolatedPath = [];
          const steps = 50; // Many intermediate points for smooth straight lines
          for (let j = 0; j <= steps; j++) {
            const fraction = j / steps;
            const lat = start.lat() + (end.lat() - start.lat()) * fraction;
            const lng = start.lng() + (end.lng() - start.lng()) * fraction;
            interpolatedPath.push(new window.google.maps.LatLng(lat, lng));
          }
          
          segmentInfo.push({
            startIndex: fullPath.length,
            endIndex: fullPath.length + interpolatedPath.length,
            mode: mode,
            locationIndex: i
          });
          
          fullPath = fullPath.concat(interpolatedPath);
        }
      }
      
      if (fullPath.length === 0) {
        throw new Error('No path generated');
      }
      
      // Densify the path for smoother animation
      const densifiedPath = densifyPath(fullPath);
      
      // Update segment info indices to match densified path
      const densifiedSegmentInfo = [];
      let densifiedIndex = 0;
      
      for (const segment of segmentInfo) {
        const startIdx = densifiedIndex;
        
        // Count how many densified points belong to this segment
        while (densifiedIndex < densifiedPath.length && 
               fullPath.indexOf(densifiedPath[densifiedIndex]) <= segment.endIndex - 1) {
          densifiedIndex++;
        }
        
        densifiedSegmentInfo.push({
          ...segment,
          startIndex: startIdx,
          endIndex: densifiedIndex
        });
      }
      
      pathRef.current = densifiedPath;
      segmentPathsRef.current = densifiedSegmentInfo;
      
      
      // Create polyline with animated symbol
      const initialMode = allModes[0] || 'walk';
      
      // Define larger circular symbols for each mode
      const transportSymbols = {
        walk: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: TRANSPORTATION_COLORS.walk,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        bike: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: TRANSPORTATION_COLORS.bike,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        car: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: TRANSPORTATION_COLORS.car,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        bus: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: TRANSPORTATION_COLORS.bus,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        }
      };
      
      const initialSymbol = transportSymbols[initialMode] || transportSymbols.walk;
      
      // Create polyline with animated symbol EXACTLY like Google's example
      const lineSymbol = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: TRANSPORTATION_COLORS[initialMode],
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      };
      
      polylineRef.current = new window.google.maps.Polyline({
        path: densifiedPath,
        geodesic: false,
        strokeColor: '#CCCCCC',
        strokeOpacity: 0.3,
        strokeWeight: 4,
        icons: [{
          icon: lineSymbol,
          offset: '0%'
        }],
        map: map
      });
      
      // Start with a cinematic view of the beginning of the route
      const startPos = densifiedPath[0];
      map.setCenter(startPos);
      
      // Set zoom based on selected level
      let zoomValue = 16; // default medium
      if (zoomLevel === 'close') {
        zoomValue = 18;
      } else if (zoomLevel === 'far') {
        zoomValue = 14;
      }
      map.setZoom(zoomValue);
      
      // Clear any existing camera update interval
      if (cameraUpdateIntervalRef.current) {
        clearInterval(cameraUpdateIntervalRef.current);
      }
      
      // Camera centering is handled in the animation loop
      
      // Start animation immediately
      setTimeout(() => {
        animateAlongRoute();
      }, 100);
      
    } catch (error) {
      console.error('Failed to start animation:', error);
      showModal('Failed to start the animation. Please try again.', 'Animation Error', 'error');
      setIsAnimating(false);
    }
  };

  // Removed createAnimationMarker - using Symbol Animation API

  const animateAlongRoute = (isResuming = false) => {
    // Initialize count only if starting fresh (not resuming from pause)
    if (!isResuming) {
      // Starting fresh - reset to beginning
      countRef.current = 0;
    }
    // If resuming from pause, countRef.current already has the correct value
    
    let lastTimestamp = performance.now();
    
    const animate = (timestamp) => {
      if (!isAnimatingRef.current || isPausedRef.current || !polylineRef.current) {
        return;
      }

      // Calculate delta time for frame-independent animation
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Increment based on animation speed and delta time
      const speedMultiplier = animationSpeedRef.current * 0.002; // Reduced from 0.003
      countRef.current = countRef.current + (speedMultiplier * deltaTime);
      if (countRef.current >= 200) countRef.current = 200;
      
      // Update symbol position
      const icons = polylineRef.current.get('icons');
      icons[0].offset = (countRef.current / 2) + '%';
      polylineRef.current.set('icons', icons);
      
      // Track progress
      offsetRef.current = countRef.current / 2;
      
      // Update progress
      setProgress(offsetRef.current);
      
      // Smart camera panning - pan when marker approaches edge of screen
      const path = polylineRef.current.getPath();
      const numPoints = path.getLength();
      const progress = offsetRef.current / 100;
      
      // Use floating point index for smoother interpolation
      const floatIndex = progress * (numPoints - 1);
      const currentIndex = Math.floor(floatIndex);
      const nextIndex = Math.min(currentIndex + 1, numPoints - 1);
      const interpolationFactor = floatIndex - currentIndex;
      
      if (currentIndex < numPoints) {
        const currentPos = path.getAt(currentIndex);
        const nextPos = path.getAt(nextIndex);
        
        if (currentPos && nextPos) {
          // Interpolate between points for smoother movement
          const lat = currentPos.lat() + (nextPos.lat() - currentPos.lat()) * interpolationFactor;
          const lng = currentPos.lng() + (nextPos.lng() - currentPos.lng()) * interpolationFactor;
          const markerPosition = new window.google.maps.LatLng(lat, lng);
          
          // Get map bounds and check if marker is near edge
          const bounds = map.getBounds();
          if (bounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            
            // Calculate buffer zone (20% from edge - triggers when closer to edge)
            const latBuffer = (ne.lat() - sw.lat()) * 0.2;
            const lngBuffer = (ne.lng() - sw.lng()) * 0.2;
            
            // Check if marker is within buffer zone of any edge
            const nearEdge = markerPosition.lat() > ne.lat() - latBuffer ||
                           markerPosition.lat() < sw.lat() + latBuffer ||
                           markerPosition.lng() > ne.lng() - lngBuffer ||
                           markerPosition.lng() < sw.lng() + lngBuffer;
            
            if (nearEdge) {
              // Pan ahead of the marker so it has room to travel
              // Calculate the direction of travel
              let lookAheadDistance = 30; // Look further ahead
              let lookAheadIndex = Math.min(floatIndex + lookAheadDistance, numPoints - 1);
              const lookAheadPos = path.getAt(Math.floor(lookAheadIndex));
              
              if (lookAheadPos) {
                // Pan to a position well ahead of the marker
                const panLat = markerPosition.lat() * 0.3 + lookAheadPos.lat() * 0.7;
                const panLng = markerPosition.lng() * 0.3 + lookAheadPos.lng() * 0.7;
                const panTarget = new window.google.maps.LatLng(panLat, panLng);
                
                // Pan to keep marker comfortably in view
                map.panTo(panTarget);
              } else {
                // Fallback to centering on marker position
                map.panTo(markerPosition);
              }
            }
          }
        }
      }

      // Check if animation is complete
      if (countRef.current >= 198) {
        // Use stopAnimation to ensure proper cleanup and callback notification
        stopAnimation();
      } else {
        // Continue animation
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
  };
  

  const pauseAnimation = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    // Cancel the animation frame when pausing
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const resumeAnimation = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    // Resume the animation from where it left off - countRef already has the position
    animateAlongRoute(true); // Pass true to indicate we're resuming
  };



  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep panel within viewport bounds
    const panel = panelRef.current;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle window resize to keep modal on screen
  useEffect(() => {
    const handleResize = () => {
      const panel = panelRef.current;
      if (panel && !isMinimized) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          const rect = panel.getBoundingClientRect();
          const padding = 10; // Minimum distance from edge
          
          setPosition(prev => {
            let newX = prev.x;
            let newY = prev.y;
            
            // Check right edge
            if (rect.right > window.innerWidth - padding) {
              newX = window.innerWidth - rect.width - padding;
            }
            
            // Check bottom edge
            if (rect.bottom > window.innerHeight - padding) {
              newY = window.innerHeight - rect.height - padding;
            }
            
            // Check left edge
            if (rect.left < padding) {
              newX = padding;
            }
            
            // Check top edge
            if (rect.top < padding) {
              newY = padding;
            }
            
            return { x: newX, y: newY };
          });
        });
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);

  // Render minimized state
  if (isMinimized) {
    return (
      <div 
        className="route-animator-minimized"
        style={{
          position: 'fixed',
          right: '80px',
          bottom: '20px',
          zIndex: 2000
        }}
      >
        <button 
          className="camera-icon-btn"
          onClick={() => setIsMinimized(false)}
          title="Show Animation Controls"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div 
      className="route-animator"
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="route-animator-header">
        <DragHandle />
        <h4>Route Animator</h4>
        <div className="header-actions">
          <button className="minimize-button" onClick={() => {
            savedPositionRef.current = { ...position };
            setIsMinimized(true);
          }} title="Minimize panel">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 9h8v1H4z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="route-animator-content">
          <div className="controls-section">
            <div className="playback-controls">
              {!isAnimating ? (
                <button onClick={startAnimation} className="control-btn play">
                  <FontAwesomeIcon icon={faPlay} /> Play
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button onClick={resumeAnimation} className="control-btn play">
                      <FontAwesomeIcon icon={faPlay} /> Resume
                    </button>
                  ) : (
                    <button onClick={pauseAnimation} className="control-btn pause">
                      <FontAwesomeIcon icon={faPause} /> Pause
                    </button>
                  )}
                  <button onClick={stopAnimation} className="control-btn stop">
                    <FontAwesomeIcon icon={faStop} /> Stop
                  </button>
                </>
              )}
            </div>
            
            <div className="speed-control">
              <label>Animation Speed</label>
              <div className="speed-radio-group">
                <label className={`speed-radio ${animationSpeed === 1 ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="speed"
                    value="1"
                    checked={animationSpeed === 1}
                    onChange={() => setAnimationSpeed(1)}
                  />
                  <span>Slow</span>
                </label>
                <label className={`speed-radio ${animationSpeed === 3 ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="speed"
                    value="3"
                    checked={animationSpeed === 3}
                    onChange={() => setAnimationSpeed(3)}
                  />
                  <span>Regular</span>
                </label>
                <label className={`speed-radio ${animationSpeed === 6 ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="speed"
                    value="6"
                    checked={animationSpeed === 6}
                    onChange={() => setAnimationSpeed(6)}
                  />
                  <span>Fast</span>
                </label>
              </div>
            </div>
            
            <div className="zoom-control">
              <label>Zoom Level</label>
              <div className="zoom-radio-group">
                <label className={`zoom-radio ${zoomLevel === 'close' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="close"
                    checked={zoomLevel === 'close'}
                    onChange={() => setZoomLevel('close')}
                    disabled={isAnimating}
                  />
                  <span>Close</span>
                </label>
                <label className={`zoom-radio ${zoomLevel === 'medium' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="medium"
                    checked={zoomLevel === 'medium'}
                    onChange={() => setZoomLevel('medium')}
                    disabled={isAnimating}
                  />
                  <span>Medium</span>
                </label>
                <label className={`zoom-radio ${zoomLevel === 'far' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="far"
                    checked={zoomLevel === 'far'}
                    onChange={() => setZoomLevel('far')}
                    disabled={isAnimating}
                  />
                  <span>Far</span>
                </label>
              </div>
            </div>
            
            {isAnimating && (
              <div className="progress-bar">
                <div className="progress-label">Progress: {Math.round(progress)}%</div>
                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
          </div>
        </div>
      
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

export default RouteAnimator;