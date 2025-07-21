import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faPlay, faPause, faStop } from '@fortawesome/free-solid-svg-icons';
import { TRANSPORT_ICONS } from '../GoogleMap/utils/constants';
import DragHandle from '../common/DragHandle';
import Modal from './Modal';
import './RouteAnimator.css';

const RouteAnimator = ({ map, directionsRoute, onAnimationStateChange }) => {
  const [isMinimized, setIsMinimized] = useState(false); // Start open
  const [isAnimating, setIsAnimatingState] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [position, setPosition] = useState({ x: Math.max(10, window.innerWidth - 480), y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  
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
  const markerRef = useRef(null);
  const pathRef = useRef(null);
  const segmentPathsRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const isPausedRef = useRef(false);
  const prevRouteRef = useRef(null);
  const animateRef = useRef(null);
  const distanceTraveledRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const animationSpeedRef = useRef(animationSpeed);
  const lastPositionRef = useRef(null);
  const targetPositionRef = useRef(null);


  // Define stopAnimation early so it can be used in effects
  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setIsPaused(false);
    setProgress(0);
    isAnimatingRef.current = false;
    isPausedRef.current = false;
    distanceTraveledRef.current = 0;
    lastTimestampRef.current = null;
    lastPositionRef.current = null;
    targetPositionRef.current = null;
    
    if (markerRef.current) {
      if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.map !== undefined) {
        markerRef.current.map = null;
      } else {
        markerRef.current.setMap(null);
      }
      markerRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

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

  // Densify path by adding intermediate points for smoother animation
  const densifyPath = (originalPath) => {
    const densifiedPath = [];
    const maxSegmentLength = 2; // Reduced to 2 meters for ultra-smooth movement
    
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

    // Clear existing marker if any
    if (markerRef.current) {
      if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.map !== undefined) {
        markerRef.current.map = null;
      } else {
        markerRef.current.setMap(null);
      }
      markerRef.current = null;
    }

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
      
      
      // Create marker with initial mode
      const initialMode = allModes[0] || 'walk';
      markerRef.current = createAnimationMarker(initialMode);
      markerRef.current._currentMode = initialMode;
      
      // Set initial position
      const startPos = fullPath[0];
      if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.position !== undefined) {
        markerRef.current.position = startPos;
      } else {
        markerRef.current.setPosition(startPos);
      }
      
      // Set initial zoom and center on start position
      map.setCenter(startPos);
      map.setZoom(16); // Good default zoom level for route animation
      
      // Start animation after a brief delay for zoom to complete
      setTimeout(() => {
        animateAlongRoute(fullPath);
      }, 500);
      
    } catch (error) {
      console.error('Failed to start animation:', error);
      showModal('Failed to start the animation. Please try again.', 'Animation Error', 'error');
      setIsAnimating(false);
    }
  };

  const createAnimationMarker = (mode) => {
    const icon = TRANSPORT_ICONS[mode] || '🚶';
    
    if (!window.google?.maps?.marker?.AdvancedMarkerElement) {
      // Fallback - can't do emoji markers with regular API
      return new window.google.maps.Marker({
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#000000',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        },
        zIndex: 9999
      });
    }
    
    // Create custom content for just the emoji with black border
    const content = document.createElement('div');
    content.style.cssText = `
      font-size: 24px;
      text-shadow: 
        -1px -1px 0 #000,
         1px -1px 0 #000,
        -1px  1px 0 #000,
         1px  1px 0 #000,
        -2px -2px 0 #000,
         2px -2px 0 #000,
        -2px  2px 0 #000,
         2px  2px 0 #000;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
    `;
    content.textContent = icon;
    
    return new window.google.maps.marker.AdvancedMarkerElement({
      map: map,
      content: content,
      zIndex: 9999
    });
  };

  const animateAlongRoute = (path) => {
    const totalDistance = calculateTotalDistance(path);
    
    // Initialize or resume from stored distance
    if (!isPaused) {
      distanceTraveledRef.current = 0;
    }
    
    // Create the initial marker position
    if (markerRef.current && !isPaused) {
      const startPosition = getInterpolatedPosition(path, distanceTraveledRef.current);
      if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.position !== undefined) {
        markerRef.current.position = startPosition;
      } else {
        markerRef.current.setPosition(startPosition);
      }
    }
    
    const animate = (timestamp) => {
      if (!isAnimatingRef.current || isPausedRef.current) {
        animationRef.current = null;
        return;
      }

      // Calculate time delta
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const deltaTime = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // Calculate movement based on speed
      // Base speed: 500 km/h = ~138.89 m/s (fast but controllable)
      const baseSpeed = 500000 / 3600; // 500 km/h in m/s
      const moveDistance = (baseSpeed * animationSpeedRef.current * deltaTime) / 1000; // Convert ms to s
      distanceTraveledRef.current += moveDistance;
      
      // Don't exceed total distance
      if (distanceTraveledRef.current > totalDistance) {
        distanceTraveledRef.current = totalDistance;
      }
      
      // Get interpolated position
      const position = getInterpolatedPosition(path, distanceTraveledRef.current);
      
      // Determine which segment we're on based on current path index
      if (segmentPathsRef.current && markerRef.current) {
        // Find current path index based on distance
        let currentPathIndex = 0;
        let accumDist = 0;
        
        for (let i = 0; i < path.length - 1; i++) {
          const segDist = window.google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
          if (accumDist + segDist >= distanceTraveledRef.current) {
            currentPathIndex = i;
            break;
          }
          accumDist += segDist;
        }
        
        // Find which segment this index belongs to
        let currentMode = 'walk';
        for (const segment of segmentPathsRef.current) {
          if (currentPathIndex >= segment.startIndex && currentPathIndex < segment.endIndex) {
            currentMode = segment.mode;
            break;
          }
        }
        
        
        // Update marker icon if mode changed
        if (markerRef.current._currentMode !== currentMode) {
          markerRef.current._currentMode = currentMode;
          
          // For AdvancedMarkerElement, update the content
          if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.content) {
            const icon = TRANSPORT_ICONS[currentMode] || '🚶';
            const content = document.createElement('div');
            content.style.cssText = `
              font-size: 24px;
              text-shadow: 
                -1px -1px 0 #000,
                 1px -1px 0 #000,
                -1px  1px 0 #000,
                 1px  1px 0 #000,
                -2px -2px 0 #000,
                 2px -2px 0 #000,
                -2px  2px 0 #000,
                 2px  2px 0 #000;
              filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
            `;
            content.textContent = icon;
            markerRef.current.content = content;
          } else {
            // For regular marker, just change color
            markerRef.current.setIcon({
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#000000',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2
            });
          }
        }
      }
      
      // Update progress
      const progressPercent = Math.min((distanceTraveledRef.current / totalDistance) * 100, 100);
      setProgress(progressPercent);

      // Update marker position and map view
      if (markerRef.current && position) {
        // Apply position smoothing for ultra-smooth movement
        let smoothedPosition = position;
        
        if (lastPositionRef.current) {
          // Interpolate between last position and new position for smoothness
          const smoothingFactor = 0.3; // Higher = more responsive, lower = smoother
          const lastPos = lastPositionRef.current;
          
          const smoothedLat = lastPos.lat() + (position.lat() - lastPos.lat()) * smoothingFactor;
          const smoothedLng = lastPos.lng() + (position.lng() - lastPos.lng()) * smoothingFactor;
          
          smoothedPosition = new window.google.maps.LatLng(smoothedLat, smoothedLng);
        }
        
        lastPositionRef.current = smoothedPosition;
        
        // Handle AdvancedMarkerElement vs regular Marker
        if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.position !== undefined) {
          markerRef.current.position = smoothedPosition;
        } else {
          markerRef.current.setPosition(smoothedPosition);
        }
        
        // Always keep the marker centered during animation
        // Use setCenter for immediate positioning
        if (map) {
          map.setCenter(smoothedPosition);
        }
        
        // Optional: Adjust zoom based on speed to show more context at higher speeds
        // Only adjust zoom once per speed range to avoid conflicts with camera following
        const currentZoom = map.getZoom();
        const targetZoom = animationSpeedRef.current > 4 ? 15 : 
                          animationSpeedRef.current < 2 ? 17 : 16;
        
        if (Math.abs(currentZoom - targetZoom) > 1) {
          map.setZoom(targetZoom);
        }
      }

      // Check if animation is complete
      if (distanceTraveledRef.current >= totalDistance) {
        setIsAnimating(false);
        setIsPaused(false);
        isAnimatingRef.current = false;
        isPausedRef.current = false;
        if (markerRef.current) {
          const lastPosition = path[path.length - 1];
          if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.position !== undefined) {
            markerRef.current.position = lastPosition;
          } else {
            markerRef.current.setPosition(lastPosition);
          }
        }
      } else {
        // Continue animation
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    // Store the animate function for resume
    animateRef.current = animate;

    // Start the animation loop
    animationRef.current = requestAnimationFrame(animate);
  };
  
  const calculateTotalDistance = (path) => {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += window.google.maps.geometry.spherical.computeDistanceBetween(
        path[i], 
        path[i + 1]
      );
    }
    return total;
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