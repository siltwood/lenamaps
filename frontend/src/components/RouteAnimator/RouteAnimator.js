import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faPlay, faPause, faStop } from '@fortawesome/free-solid-svg-icons';
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
  const [animationSpeed, setAnimationSpeed] = useState(2);
  
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
    
    if (polylineRef.current) {
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
    lastCameraPositionRef.current = null;
    cameraVelocityRef.current = null;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.map !== undefined) {
          markerRef.current.map = null;
        } else {
          markerRef.current.setMap(null);
        }
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
    const maxSegmentLength = 1; // 1 meter segments for silky smooth movement
    
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
          
          // Add intermediate points for smoother animation
          const interpolatedPath = [];
          const steps = 10; // Number of intermediate points
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
      
      // Create polyline without symbol (we'll use a separate marker)
      polylineRef.current = new window.google.maps.Polyline({
        path: densifiedPath,
        geodesic: true,
        strokeColor: '#CCCCCC',
        strokeOpacity: 0.3,
        strokeWeight: 4,
        map: map
      });
      
      // Create marker with circle and icon
      if (window.google?.maps?.marker?.AdvancedMarkerElement) {
        // Get current zoom and scale
        currentZoomRef.current = map.getZoom();
        const scale = getMarkerScale(currentZoomRef.current);
        
        // Create custom content with circle and emoji
        const content = document.createElement('div');
        const size = 50 * scale;
        const fontSize = 24 * scale;
        const borderWidth = 4 * scale;
        
        content.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          background-color: ${TRANSPORTATION_COLORS[initialMode]};
          border-radius: 50%;
          border: ${borderWidth}px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          box-shadow: 0 ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.4);
          cursor: pointer;
        `;
        content.textContent = TRANSPORT_ICONS[initialMode];
        
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          map: map,
          content: content,
          position: densifiedPath[0],
          zIndex: 10000
        });
        markerRef.current._currentMode = initialMode;
      } else {
        // Fallback to regular marker
        markerRef.current = new window.google.maps.Marker({
          map: map,
          position: densifiedPath[0],
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: TRANSPORTATION_COLORS[initialMode],
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3
          },
          zIndex: 10000
        });
      }
      
      const startPos = fullPath[0];
      
      // Set initial zoom and center on start position with instant zoom
      map.moveCamera({
        center: startPos,
        zoom: 16
      });
      
      // Set up camera following interval to ensure it works from the start
      if (cameraUpdateIntervalRef.current) {
        clearInterval(cameraUpdateIntervalRef.current);
      }
      
      // Camera following handled in animation loop
      
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

  const animateAlongRoute = () => {
    // Store map reference in closure
    const mapInstance = map;
    
    // Initialize offset
    if (!isPaused) {
      offsetRef.current = 0;
    }
    
    const animateSymbol = () => {
      if (!isAnimatingRef.current || isPausedRef.current) {
        animationRef.current = null;
        return;
      }

      // Animate the marker position along path
      // Speed: 0.015% per frame at 1x speed (smooth speed)
      const increment = 0.015 * animationSpeedRef.current;
      offsetRef.current = Math.min(offsetRef.current + increment, 100);
      
      if (offsetRef.current >= 100) {
        offsetRef.current = 100;
      }
      
      // Get current position for marker and camera
      const polylinePath = polylineRef.current.getPath();
      const pathLength = polylinePath.getLength();
      const exactIndex = (offsetRef.current / 100) * (pathLength - 1);
      const currentIndex = Math.floor(exactIndex);
      const nextIndex = Math.min(currentIndex + 1, pathLength - 1);
      const fraction = exactIndex - currentIndex;
      
      // Interpolate between points for smoother movement
      let position;
      if (currentIndex < pathLength - 1) {
        const currentPos = polylinePath.getAt(currentIndex);
        const nextPos = polylinePath.getAt(nextIndex);
        const lat = currentPos.lat() + (nextPos.lat() - currentPos.lat()) * fraction;
        const lng = currentPos.lng() + (nextPos.lng() - currentPos.lng()) * fraction;
        position = new window.google.maps.LatLng(lat, lng);
      } else {
        position = polylinePath.getAt(pathLength - 1);
      }
      
      // Update marker position
      if (markerRef.current) {
        if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.position !== undefined) {
          markerRef.current.position = position;
        } else {
          markerRef.current.setPosition(position);
        }
      }
      
      // Update progress
      setProgress(offsetRef.current);
      
      // Position tracking handled by Symbol Animation API
      
      // Check which segment we're on and update marker if needed
      if (segmentPathsRef.current && markerRef.current) {
        let currentMode = 'walk';
        
        for (const segment of segmentPathsRef.current) {
          if (currentIndex >= segment.startIndex && currentIndex < segment.endIndex) {
            currentMode = segment.mode;
            break;
          }
        }
        
        // Update marker if mode changed
        if (markerRef.current._currentMode !== currentMode) {
          markerRef.current._currentMode = currentMode;
          
          if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.content) {
            // Update advanced marker content with current scale
            const scale = getMarkerScale(currentZoomRef.current);
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
          } else {
            // Update regular marker icon
            markerRef.current.setIcon({
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: TRANSPORTATION_COLORS[currentMode],
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3
            });
          }
        }
      }
      
      // Smooth camera following with interpolation
      if (mapInstance && position) {
        // Initialize camera position if this is the first frame
        if (!lastCameraPositionRef.current) {
          lastCameraPositionRef.current = position;
          mapInstance.setCenter(position);
        } else {
          // Calculate smooth camera position
          const smoothingFactor = 0.05; // Ultra smooth camera following
          
          const currentCameraPos = lastCameraPositionRef.current;
          const targetPos = position;
          
          // Interpolate between current camera position and target
          const newLat = currentCameraPos.lat() + (targetPos.lat() - currentCameraPos.lat()) * smoothingFactor;
          const newLng = currentCameraPos.lng() + (targetPos.lng() - currentCameraPos.lng()) * smoothingFactor;
          const smoothCameraPos = new window.google.maps.LatLng(newLat, newLng);
          
          // Update camera position
          mapInstance.setCenter(smoothCameraPos);
          lastCameraPositionRef.current = smoothCameraPos;
        }
        
        // Adjust zoom based on speed
        const currentZoom = mapInstance.getZoom();
        const targetZoom = animationSpeedRef.current > 4 ? 15 : 
                          animationSpeedRef.current < 2 ? 17 : 16;
        
        if (Math.abs(currentZoom - targetZoom) > 1) {
          // Use setOptions for instant zoom change
          mapInstance.setOptions({ zoom: targetZoom });
        }
      }

      // Check if animation is complete
      if (offsetRef.current >= 100) {
        setIsAnimating(false);
        setIsPaused(false);
        isAnimatingRef.current = false;
        isPausedRef.current = false;
        
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
        
        if (polylineRef.current) {
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
      } else {
        // Continue animation
        animationRef.current = requestAnimationFrame(animateSymbol);
      }
    };
    
    // Store the animate function for resume
    animateRef.current = animateSymbol;

    // Start the animation loop
    animationRef.current = requestAnimationFrame(animateSymbol);
  };
  

  const pauseAnimation = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const resumeAnimation = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    // Reset timestamp to avoid jump
    lastTimestampRef.current = null;
    // Continue animation loop
    if (pathRef.current) {
      animationRef.current = requestAnimationFrame(animateRef.current);
    }
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
          right: '60px',
          bottom: '20px',
          zIndex: 2000
        }}
      >
        <button 
          className="expand-button"
          onClick={() => setIsMinimized(false)}
          title="Route Animator"
        >
          <FontAwesomeIcon icon={faVideo} />
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
          <button className="minimize-button" onClick={() => setIsMinimized(true)} title="Minimize panel">
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
              <label>Speed: {animationSpeed}x</label>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={animationSpeed}
                onChange={(e) => {
                  const newSpeed = parseFloat(e.target.value);
                  setAnimationSpeed(newSpeed);
                }}
              />
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