import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStop } from '@fortawesome/free-solid-svg-icons';
import { TRANSPORTATION_COLORS, TRANSPORT_ICONS } from '../../../constants/transportationModes';
import DragHandle from '../../common/DragHandle';
import Modal from './Modal';
import { isMobileDevice } from '../../../utils/deviceDetection';
import '../../../styles/unified-icons.css';
import './RouteAnimator.css';

const RouteAnimator = ({ map, directionsRoute, onAnimationStateChange, isMobile = false, forceShow = false, onClose, embeddedInModal = false, onMinimize }) => {
  
  // Start expanded on desktop and when forceShow is true on mobile
  const [isMinimized, setIsMinimized] = useState(() => {
    // Desktop starts expanded, mobile with forceShow starts expanded too
    return false; // Always start expanded when shown
  });
  const [isAnimating, setIsAnimatingState] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [position, setPosition] = useState(isMobile ? { x: 10, y: 60 } : { x: Math.max(10, window.innerWidth - 480), y: window.innerHeight - 250 });
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
  }
  
  // Wrapper to notify parent when animation state changes
  const setIsAnimating = (value) => {
    setIsAnimatingState(value);
    if (onAnimationStateChange) {
      onAnimationStateChange(value);
    }
  }
  const [zoomLevel, setZoomLevel] = useState('medium'); // 'close', 'medium', 'far'
  const [animationProgress, setAnimationProgress] = useState(0); // 0-100 for timeline
  
  // Add effect to update zoom whenever zoom level changes
  useEffect(() => {
    // Update the ref for animation loop access
    zoomLevelRef.current = zoomLevel;
    
    // Update zoom when RouteAnimator is visible/expanded
    // Remove the isAnimating requirement so zoom works even when paused/stopped
    if (map && !isMinimized) {
      if (zoomLevel === 'close') {
        map.setZoom(18);
        // Center on current animation position if available, or first location
        if (polylineRef.current && isAnimating && offsetRef) {
          const path = polylineRef.current.getPath();
          const progress = offsetRef.current / 100;
          const currentIndex = Math.floor(progress * (path.getLength() - 1));
          if (currentIndex < path.getLength()) {
            const currentPos = path.getAt(currentIndex);
            if (currentPos) {
              map.panTo(currentPos);
            }
          }
        } else if (directionsRoute && directionsRoute.allLocations && directionsRoute.allLocations.length > 0) {
          // Not animating, center on first location
          const loc = directionsRoute.allLocations[0];
          if (loc && loc.lat && loc.lng) {
            map.panTo(new window.google.maps.LatLng(loc.lat, loc.lng));
          }
        }
      } else if (zoomLevel === 'medium') {
        map.setZoom(16);
        // Center on current animation position if available, or first location
        if (polylineRef.current && isAnimating && offsetRef) {
          const path = polylineRef.current.getPath();
          const progress = offsetRef.current / 100;
          const currentIndex = Math.floor(progress * (path.getLength() - 1));
          if (currentIndex < path.getLength()) {
            const currentPos = path.getAt(currentIndex);
            if (currentPos) {
              map.panTo(currentPos);
            }
          }
        } else if (directionsRoute && directionsRoute.allLocations && directionsRoute.allLocations.length > 0) {
          // Not animating, center on first location
          const loc = directionsRoute.allLocations[0];
          if (loc && loc.lat && loc.lng) {
            map.panTo(new window.google.maps.LatLng(loc.lat, loc.lng));
          }
        }
      } else if (zoomLevel === 'far') {
        // Fit the entire route when "far" is selected
        // Check if we have a route to show with at least 2 locations
        if (directionsRoute && directionsRoute.allLocations && directionsRoute.allLocations.length >= 2) {
          const bounds = new window.google.maps.LatLngBounds();
          
          // Always include all route locations
          directionsRoute.allLocations.forEach(loc => {
            if (loc && loc.lat && loc.lng) {
              bounds.extend(new window.google.maps.LatLng(loc.lat, loc.lng));
            }
          });
          
          // If we have a polyline (during animation), also include its path
          if (polylineRef.current) {
            const path = polylineRef.current.getPath();
            // Add a sample of points to get accurate bounds without adding too many
            const step = Math.max(1, Math.floor(path.getLength() / 50));
            for (let i = 0; i < path.getLength(); i += step) {
              bounds.extend(path.getAt(i));
            }
          } else if (directionsRoute.segments && directionsRoute.segments.length > 0) {
            // Include segment paths if available and not animating
            directionsRoute.segments.forEach(segment => {
              if (segment.route && segment.route.overview_path) {
                // Sample points from segments too
                const step = Math.max(1, Math.floor(segment.route.overview_path.length / 20));
                for (let i = 0; i < segment.route.overview_path.length; i += step) {
                  bounds.extend(segment.route.overview_path[i]);
                }
              }
            });
          }
          
          // Fit bounds with padding
          const padding = { top: 50, right: 50, bottom: 50, left: 50 };
          map.fitBounds(bounds, padding);
        } else if (directionsRoute && directionsRoute.allLocations && directionsRoute.allLocations.length === 1) {
          // Single location, just zoom out to show area
          const loc = directionsRoute.allLocations[0];
          if (loc && loc.lat && loc.lng) {
            map.panTo(new window.google.maps.LatLng(loc.lat, loc.lng));
            map.setZoom(13);
          }
        } else {
          // No route, just zoom out to see more
          map.setZoom(13);
        }
      }
    }
  }, [zoomLevel, map, directionsRoute, isMinimized, isAnimating]);
  
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
  const totalDistanceRef = useRef(0); // Store total route distance in km
  const zoomLevelRef = useRef(zoomLevel); // Track zoom level in animation

  // Calculate marker scale based on zoom level
  const getMarkerScale = (zoom) => {
    // Base scale at zoom 13
    const baseZoom = 13;
    const maxScale = 1.2;  // Maximum scale at high zoom
    const minScale = 0.5;  // Minimum scale at low zoom
    
    // Scale decreases as you zoom out
    const scaleFactor = Math.pow(2, (zoom - baseZoom) * 0.15);
    return Math.max(minScale, Math.min(maxScale, scaleFactor));
  }

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
    isAnimatingRef.current = false;
    isPausedRef.current = false;
    distanceTraveledRef.current = 0;
    lastTimestampRef.current = null;
    // Position tracking removed - handled by Symbol API
    setAnimationProgress(0); // Reset progress bar
    
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

  // Clean up animation when component unmounts or is hidden on mobile
  useEffect(() => {
    return () => {
      // When component unmounts, ensure animation is stopped
      if (isAnimatingRef.current) {
        // Clean up animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Clean up polyline
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }
        
        // Clean up marker
        if (markerRef.current) {
          if (window.google?.maps?.marker?.AdvancedMarkerElement && markerRef.current.map !== undefined) {
            markerRef.current.map = null;
          } else {
            markerRef.current.setMap(null);
          }
          markerRef.current = null;
        }
        
        // Reset state
        isAnimatingRef.current = false;
        isPausedRef.current = false;
      }
    };
  }, []);

  // Densify path by adding intermediate points for smoother animation
  const densifyPath = (originalPath) => {
    const densifiedPath = [];
    
    // Calculate total route distance to determine appropriate segment length
    let totalDistance = 0;
    for (let i = 0; i < originalPath.length - 1; i++) {
      totalDistance += window.google.maps.geometry.spherical.computeDistanceBetween(
        originalPath[i],
        originalPath[i + 1]
      );
    }
    
    // More aggressive optimization for long routes
    const totalDistanceKm = totalDistance / 1000;
    let maxSegmentLength;
    let maxPointsPerSegment;
    
    if (totalDistanceKm > 2000) {
      // Cross-country route (>2000km): Extremely sparse points
      maxSegmentLength = 50000; // 50km segments
      maxPointsPerSegment = 1; // Max 1 intermediate point
    } else if (totalDistanceKm > 1000) {
      // Very long route (>1000km): Very sparse points
      maxSegmentLength = 20000; // 20km segments
      maxPointsPerSegment = 2; // Max 2 intermediate points
    } else if (totalDistanceKm > 100) {
      // Long route (100-1000km): Sparse points
      maxSegmentLength = 5000; // 5km segments  
      maxPointsPerSegment = 3; // Max 3 intermediate points
    } else if (totalDistanceKm > 10) {
      // Medium route (10-100km): Moderate density
      maxSegmentLength = 500; // 500m segments
      maxPointsPerSegment = 10; // Max 10 intermediate points
    } else {
      // Short route (<10km): High density for smooth animation
      maxSegmentLength = 100; // 100m segments
      maxPointsPerSegment = 20; // Max 20 intermediate points
    }
    
    // Much stricter limit for very long routes
    let maxTotalPoints;
    if (totalDistanceKm > 2000) {
      maxTotalPoints = 200; // Only 200 points for cross-country
    } else if (totalDistanceKm > 1000) {
      maxTotalPoints = 500; // 500 points for very long routes
    } else if (totalDistanceKm > 100) {
      maxTotalPoints = 1000; // 1000 points for long routes
    } else {
      maxTotalPoints = Math.min(5000, Math.max(100, totalDistanceKm * 50));
    }
    let currentPointCount = 0;
    
    for (let i = 0; i < originalPath.length - 1; i++) {
      densifiedPath.push(originalPath[i]);
      currentPointCount++;
      
      // Stop adding points if we hit the limit
      if (currentPointCount >= maxTotalPoints) {
        break;
      }
      
      const segmentDistance = window.google.maps.geometry.spherical.computeDistanceBetween(
        originalPath[i],
        originalPath[i + 1]
      );
      
      // If segment is longer than max, add intermediate points
      if (segmentDistance > maxSegmentLength) {
        const numIntermediatePoints = Math.min(maxPointsPerSegment, 
          Math.ceil(segmentDistance / maxSegmentLength));
        
        // Check if adding these points would exceed our limit
        const pointsToAdd = Math.min(numIntermediatePoints, 
          maxTotalPoints - currentPointCount);
        
        for (let j = 1; j <= pointsToAdd; j++) {
          const fraction = j / (numIntermediatePoints + 1);
          const intermediatePoint = window.google.maps.geometry.spherical.interpolate(
            originalPath[i],
            originalPath[i + 1],
            fraction
          );
          densifiedPath.push(intermediatePoint);
          currentPointCount++;
        }
      }
    }
    
    // Add the last point only if we haven't hit the limit
    if (currentPointCount < maxTotalPoints && 
        densifiedPath[densifiedPath.length - 1] !== originalPath[originalPath.length - 1]) {
      densifiedPath.push(originalPath[originalPath.length - 1]);
    }
    
    console.log(`Route: ${totalDistanceKm.toFixed(1)}km, Points: ${densifiedPath.length}`);
    return densifiedPath;
  }

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
  }

  const startAnimation = async () => {
    if (!directionsRoute || !directionsRoute.allLocations || directionsRoute.allLocations.length < 2) {
      showModal('Please create a route with at least two locations before starting the animation.', 'No Route Available', 'warning');
      return;
    }

    setIsAnimating(true);
    setIsPaused(false);
    isAnimatingRef.current = true;
    isPausedRef.current = false;
    
    // Save current position and minimize the panel when animation starts
    savedPositionRef.current = { ...position };
    if (!embeddedInModal) {
      setIsMinimized(true);
    }
    
    // Disable map interactions during animation to prevent user from panning away
    map.setOptions({
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      gestureHandling: 'none'
    });

    // Use the EXISTING route data from directionsRoute instead of fetching new
    const allLocations = directionsRoute.allLocations;
    const allModes = directionsRoute.allModes || [];
    
    let fullPath = [];
    let segmentInfo = [];
    
    try {
      // IMPORTANT: We need to get the ACTUAL route that's displayed on the map
      // The blue line is drawn by DirectionsRenderer objects that have the route data
      
      // First check if we have stored route segments with actual route data
      if (window._routeSegments && window._routeSegments.length > 0) {
        console.log('Using global route segments (exact match to displayed route)');
        
        for (let i = 0; i < window._routeSegments.length; i++) {
          const segment = window._routeSegments[i];
          const mode = segment.mode || allModes[i] || 'walk';
          
          if (segment.route && segment.route.routes && segment.route.routes[0]) {
            const route = segment.route.routes[0];
            let segmentPath = [];
            
            // Check distance to decide detail level
            const segmentDistance = segment.distance ? segment.distance.value : 0;
            
            if (segmentDistance > 50000 || !route.legs) {
              // Long segment - use overview_path
              segmentPath = route.overview_path || [];
            } else {
              // Get detailed path from steps for accuracy
              route.legs.forEach(leg => {
                if (leg.steps) {
                  leg.steps.forEach(step => {
                    if (step.path) {
                      segmentPath = segmentPath.concat(step.path);
                    } else if (step.lat_lngs) {
                      segmentPath = segmentPath.concat(step.lat_lngs);
                    }
                  });
                }
              });
              
              // Fallback to overview_path if no steps
              if (segmentPath.length === 0) {
                segmentPath = route.overview_path || [];
              }
            }
            
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
        }
        
        console.log(`Extracted ${fullPath.length} points from ${window._routeSegments.length} segments`);
      }
      
      // Fallback: If no segments or incomplete path, create simple straight lines
      if (fullPath.length === 0 && allLocations.length >= 2) {
        console.log('No segments found, creating straight line paths');
        
        for (let i = 0; i < allLocations.length - 1; i++) {
          const start = new window.google.maps.LatLng(allLocations[i].lat, allLocations[i].lng);
          const end = new window.google.maps.LatLng(allLocations[i + 1].lat, allLocations[i + 1].lng);
          const mode = allModes[i] || 'walk';
          
          // Create interpolated path for smooth animation
          const interpolatedPath = [];
          const distance = window.google.maps.geometry.spherical.computeDistanceBetween(start, end);
          const steps = Math.min(100, Math.max(10, Math.floor(distance / 1000))); // 1 point per km, max 100
          
          for (let j = 0; j <= steps; j++) {
            const fraction = j / steps;
            interpolatedPath.push(window.google.maps.geometry.spherical.interpolate(start, end, fraction));
          }
          
          const segmentStartIndex = fullPath.length;
          fullPath = fullPath.concat(interpolatedPath);
          
          segmentInfo.push({
            startIndex: segmentStartIndex,
            endIndex: fullPath.length,
            mode: mode,
            locationIndex: i
          });
        }
      }
      
      if (fullPath.length === 0) {
        throw new Error('No path generated');
      }
      
      // Calculate total distance first
      let routeDistance = 0;
      for (let i = 0; i < fullPath.length - 1; i++) {
        routeDistance += window.google.maps.geometry.spherical.computeDistanceBetween(
          fullPath[i],
          fullPath[i + 1]
        );
      }
      const routeDistanceKm = routeDistance / 1000;
      
      console.log(`Route distance: ${routeDistanceKm.toFixed(0)}km, Raw path points: ${fullPath.length}`);
      
      // Use full path for accuracy, but optimize densification for performance
      let densifiedPath;
      
      // IMPORTANT: Use exact route from Google Maps when available
      // This ensures the animation follows the actual road path
      if (window._routeSegments && window._routeSegments.length > 0 && fullPath.length > 0) {
        console.log(`Using EXACT Google Maps route with ${fullPath.length} points`);
        densifiedPath = fullPath; // No densification - follow the exact dotted line
      } else if (routeDistanceKm > 100) {
        // Long routes without exact path - still use as-is
        console.log('Long route - using points without densification');
        densifiedPath = fullPath;
      } else {
        // Only for very short routes (<100km), add minimal smoothing
        console.log('Short route - minimal smoothing');
        densifiedPath = [];
        for (let i = 0; i < fullPath.length - 1; i++) {
          densifiedPath.push(fullPath[i]);
          
          const segmentDistance = window.google.maps.geometry.spherical.computeDistanceBetween(
            fullPath[i],
            fullPath[i + 1]
          );
          
          // Add ONE intermediate point only for gaps 1-3km
          if (segmentDistance > 1000 && segmentDistance < 3000) {
            const midPoint = window.google.maps.geometry.spherical.interpolate(
              fullPath[i],
              fullPath[i + 1],
              0.5
            );
            densifiedPath.push(midPoint);
          }
        }
        densifiedPath.push(fullPath[fullPath.length - 1]);
      }
      
      console.log(`Final path: ${densifiedPath.length} points`);
      
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
      
      // Calculate total route distance for speed adjustment
      let totalDistance = 0;
      for (let i = 0; i < densifiedPath.length - 1; i++) {
        totalDistance += window.google.maps.geometry.spherical.computeDistanceBetween(
          densifiedPath[i],
          densifiedPath[i + 1]
        );
      }
      
      // Store total distance for speed calculation
      const totalDistanceKm = totalDistance / 1000;
      totalDistanceRef.current = totalDistanceKm;
      
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
        geodesic: false, // Use the exact path points from the directions
        strokeColor: 'transparent', // Make the line itself invisible
        strokeOpacity: 0,
        strokeWeight: 20, // Keep it wide for click detection
        icons: [{
          icon: lineSymbol,
          offset: '0%'
        }],
        map: map,
        clickable: true,
        zIndex: 1000
      });
      
      // Add click listener to jump to position
      polylineRef.current.addListener('click', (e) => {
        if (isPausedRef.current || !isAnimatingRef.current) {
          // Find closest point on path
          let closestDistance = Infinity;
          let closestIndex = 0;
          
          for (let i = 0; i < densifiedPath.length; i++) {
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
              e.latLng,
              densifiedPath[i]
            );
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = i;
            }
          }
          
          // Set animation position to this point
          const progress = (closestIndex / (densifiedPath.length - 1)) * 100;
          countRef.current = progress * 2; // Convert to count (0-200 range)
          offsetRef.current = progress;
          setAnimationProgress(progress); // Update UI state
          
          // Update visual position immediately
          const icons = polylineRef.current.get('icons');
          icons[0].offset = progress + '%';
          polylineRef.current.set('icons', icons);
          
          // Pan to the clicked location
          map.panTo(e.latLng);
          
          // If paused, stay paused but at new position
          // If stopped, start from this position
          if (!isAnimatingRef.current) {
            // Restart animation from this position
            setIsAnimating(true);
            setIsPaused(false);
            isAnimatingRef.current = true;
            isPausedRef.current = false;
            animateAlongRoute(true);
          }
        }
      });
      
      // Start with a smooth pan to the beginning of the route
      const startPos = densifiedPath[0];
      map.panTo(startPos);
      
      // Set zoom based on selected level
      let zoomValue = 16; // default medium
      if (zoomLevel === 'close') {
        zoomValue = 18; // Street level view
      } else if (zoomLevel === 'far') {
        // Fit the entire route in view
        const bounds = new window.google.maps.LatLngBounds();
        densifiedPath.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
        // Add some padding so the route isn't at the edge
        const padding = { top: 50, right: 50, bottom: 50, left: 50 };
        map.fitBounds(bounds, padding);
      } else {
        map.setZoom(zoomValue);
      }
      
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
      showModal('Failed to start the animation. Please try again.', 'Animation Error', 'error');
      setIsAnimating(false);
    }
  }

  // Removed auto-start on mobile - let user control it

  // Removed createAnimationMarker - using Symbol Animation API

  const animateAlongRoute = (isResuming = false) => {
    // Don't capture zoom level - use the current state value directly
    // Initialize count only if starting fresh (not resuming from pause)
    if (!isResuming) {
      // Starting fresh - reset to beginning
      countRef.current = 0;
      // Reset frame counter for visual updates
      if (animateRef.current) {
        animateRef.current.frameCount = 0;
      }
    }
    // If resuming from pause, countRef.current already has the correct value
    
    // Calculate total route distance ONCE at the start
    let totalRouteDistance = 0;
    if (pathRef.current && pathRef.current.length > 1) {
      for (let i = 0; i < pathRef.current.length - 1; i++) {
        totalRouteDistance += window.google.maps.geometry.spherical.computeDistanceBetween(
          pathRef.current[i],
          pathRef.current[i + 1]
        );
      }
    }
    
    let lastTimestamp = performance.now();
    
    const animate = (timestamp) => {
      if (!isAnimatingRef.current || isPausedRef.current || !polylineRef.current) {
        return;
      }

      // Calculate delta time for frame-independent animation
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // IMPORTANT: Clamp deltaTime to prevent huge jumps when tab loses focus or frames are delayed
      // Maximum deltaTime is 100ms (10 fps minimum)
      const clampedDeltaTime = Math.min(deltaTime, 100);
      
      // Log huge delta times that might cause jumps
      if (deltaTime > 100) {
      }
      
      // CONSTANT SPEED IN METERS PER SECOND
      // Move at the same speed on the map regardless of trip length
      
      if (!totalRouteDistance || totalRouteDistance === 0) return;
      
      // Set speed in meters per second based on animation speed setting
      // Scale speed based on route distance for better experience
      let baseSpeed;
      const routeDistanceKm = totalRouteDistance / 1000;
      
      // Adaptive base speed based on route length
      if (routeDistanceKm > 1000) {
        // Very long routes: Much faster animation
        baseSpeed = 2000; // 2km/s for cross-country (was 5km/s)
      } else if (routeDistanceKm > 100) {
        // Long routes: Faster animation
        baseSpeed = 500; // 500m/s for long routes (was 1km/s)
      } else if (routeDistanceKm > 10) {
        // Medium routes: Moderate speed
        baseSpeed = 150; // 150m/s for medium routes (was 300m/s)
      } else {
        // Short routes: Slower for detail
        baseSpeed = 50; // 50m/s for short routes (was 100m/s)
      }
      
      // No more user speed controls - zoom handles everything!
      
      // Apply zoom-based speed adjustment
      // Get current map zoom level (typically 1-20)
      const currentZoom = map.getZoom();
      let zoomSpeedMultiplier;
      
      // Smooth exponential scaling based on zoom
      // At zoom 18: 0.3x speed (very slow for detail)
      // At zoom 15: 1.0x speed (normal)
      // At zoom 10: 3.0x speed (fast for overview)
      // At zoom 5:  8.0x speed (very fast for continent view)
      
      // Use exponential function for smooth scaling
      // Formula: multiplier = base^(15-zoom)/divisor
      const zoomDiff = 15 - currentZoom; // Negative when zoomed in, positive when zoomed out
      zoomSpeedMultiplier = Math.pow(1.15, zoomDiff);
      
      // Clamp to reasonable range
      zoomSpeedMultiplier = Math.max(0.3, Math.min(5.0, zoomSpeedMultiplier));
      
      // Log significant speed changes (optional, remove in production)
      if (Math.abs(zoomDiff) > 3) {
        console.log(`Zoom ${currentZoom}: Speed multiplier ${zoomSpeedMultiplier.toFixed(1)}x`);
      }
      
      // Apply zoom multiplier directly to base speed
      let metersPerSecond = baseSpeed * zoomSpeedMultiplier;
      
      // Calculate how much of the total route to cover in this frame
      const metersThisFrame = metersPerSecond * (clampedDeltaTime / 1000);
      const percentageThisFrame = (metersThisFrame / totalRouteDistance) * 100;
      
      // Increment position by the calculated percentage
      countRef.current = countRef.current + (percentageThisFrame * 2); // *2 because count is 0-200
      if (countRef.current >= 200) countRef.current = 200;
      
      // Optimize visual updates based on route length
      // Long routes need less frequent updates to stay smooth
      const visualUpdateFrequency = routeDistanceKm > 1000 ? 10 : 
                                    routeDistanceKm > 500 ? 5 : 
                                    routeDistanceKm > 100 ? 3 : 1;
      
      // Update symbol position (less frequently for long routes)
      // Use frame counter instead of progress for modulo check
      if (!animateRef.current) animateRef.current = { frameCount: 0 };
      animateRef.current.frameCount++;
      
      if (animateRef.current.frameCount % visualUpdateFrequency === 0 || countRef.current >= 198) {
        const icons = polylineRef.current.get('icons');
        icons[0].offset = (countRef.current / 2) + '%';
        polylineRef.current.set('icons', icons);
      }
      
      // Track progress and update UI
      offsetRef.current = countRef.current / 2;
      // Always update progress for smooth UI
      const newProgress = countRef.current / 2;
      setAnimationProgress(newProgress);
      
      // Check if we need to change the transport mode icon (less frequently for performance)
      if (animateRef.current.frameCount % 10 === 0 && segmentPathsRef.current && pathRef.current) {
        const progress = offsetRef.current / 100;
        const currentPointIndex = Math.floor(progress * (pathRef.current.length - 1));
        
        // Find which segment we're in
        let currentSegment = null;
        for (const segment of segmentPathsRef.current) {
          if (currentPointIndex >= segment.startIndex && currentPointIndex < segment.endIndex) {
            currentSegment = segment;
            break;
          }
        }
        
        // Update icon color if mode changed
        if (currentSegment && polylineRef.current) {
          const icons = polylineRef.current.get('icons');
          if (icons && icons[0]) {
            const currentMode = currentSegment.mode;
            // Only update if mode actually changed
            if (!icons[0].icon._lastMode || icons[0].icon._lastMode !== currentMode) {
              icons[0].icon = {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: TRANSPORTATION_COLORS[currentMode],
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                _lastMode: currentMode // Track last mode to avoid unnecessary updates
              };
              polylineRef.current.set('icons', icons);
            }
          }
        }
      }
      
      // Smart camera panning - pan when marker approaches edge of screen
      // Use the stored densified path for accurate position
      const path = pathRef.current;
      const numPoints = path.length;
      const progress = offsetRef.current / 100;
      
      // Use floating point index for smoother interpolation
      const floatIndex = progress * (numPoints - 1);
      const currentIndex = Math.floor(floatIndex);
      const nextIndex = Math.min(currentIndex + 1, numPoints - 1);
      const interpolationFactor = floatIndex - currentIndex;
      
      if (currentIndex < numPoints && path[currentIndex] && path[nextIndex]) {
        const currentPos = path[currentIndex];
        const nextPos = path[nextIndex];
        
        // Interpolate between points for smoother movement
        // Handle both LatLng objects and plain objects
        const currLat = typeof currentPos.lat === 'function' ? currentPos.lat() : currentPos.lat;
        const currLng = typeof currentPos.lng === 'function' ? currentPos.lng() : currentPos.lng;
        const nextLat = typeof nextPos.lat === 'function' ? nextPos.lat() : nextPos.lat;
        const nextLng = typeof nextPos.lng === 'function' ? nextPos.lng() : nextPos.lng;
        
        const lat = currLat + (nextLat - currLat) * interpolationFactor;
        const lng = currLng + (nextLng - currLng) * interpolationFactor;
        const markerPosition = new window.google.maps.LatLng(lat, lng);
          
          // Camera following strategy based on zoom level
          if (zoomLevelRef.current !== 'far') {
            const bounds = map.getBounds();
            if (bounds) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              
              // For Close view - keep marker centered always
              if (zoomLevelRef.current === 'close') {
                // Check every frame and keep perfectly centered
                map.panTo(markerPosition);
              } 
              // For Medium view - keep marker loosely centered
              else if (zoomLevelRef.current === 'medium') {
                // Use larger buffer for medium view (30% from edge)
                const latBuffer = (ne.lat() - sw.lat()) * 0.3;
                const lngBuffer = (ne.lng() - sw.lng()) * 0.3;
                
                // Check if marker is outside the safe zone
                const outsideSafeZone = markerPosition.lat() > ne.lat() - latBuffer ||
                                        markerPosition.lat() < sw.lat() + latBuffer ||
                                        markerPosition.lng() > ne.lng() - lngBuffer ||
                                        markerPosition.lng() < sw.lng() + lngBuffer;
                
                if (outsideSafeZone) {
                  // Re-center on marker
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
  }

  const pauseAnimation = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    // Cancel the animation frame when pausing
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }

  const resumeAnimation = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    // Resume the animation from where it left off - countRef already has the position
    animateAlongRoute(true); // Pass true to indicate we're resuming
  }



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
  }

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

  // When embedded in modal on mobile, just render the controls
  if (embeddedInModal) {
    return (
      <>
        <div className="mobile-card-header">
          {!isMobile && <DragHandle />}
          <h4>Route Animator</h4>
          <div className="mobile-header-actions">
            <button 
              className="minimize-button"
              onClick={() => {
                // Call minimize callback if provided
                if (onMinimize) {
                  onMinimize();
                }
              }}
              title="Minimize"
              style={{ marginRight: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 9h8v1H4z"/>
              </svg>
            </button>
            <button 
              className="mobile-header-btn"
              onClick={() => {
                if (isAnimating) {
                  stopAnimation();
                }
                if (onClose) {
                  onClose();
                }
              }}
              title="Back to Route"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M15 7H3.83l5.59-5.59L8 0 0 8l8 8 1.41-1.41L3.83 9H15V7z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="mobile-animator-controls">
          <div className="controls-section">
            <div className="playback-controls">
              {!isAnimating ? (
                <button onClick={startAnimation} className="mobile-control-btn play">
                  <FontAwesomeIcon icon={faPlay} /> Play
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button onClick={resumeAnimation} className="mobile-control-btn play">
                      <FontAwesomeIcon icon={faPlay} /> Resume
                    </button>
                  ) : (
                    <button onClick={pauseAnimation} className="mobile-control-btn pause">
                      <FontAwesomeIcon icon={faPause} /> Pause
                    </button>
                  )}
                  <button onClick={stopAnimation} className="mobile-control-btn stop">
                    <FontAwesomeIcon icon={faStop} /> Exit Animation
                  </button>
                </>
              )}
            </div>
            
            <div className="zoom-control">
              <div className="zoom-radio-group">
                <label className={`zoom-radio ${zoomLevel === 'close' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="close"
                    checked={zoomLevel === 'close'}
                    onChange={() => setZoomLevel('close')}
                  />
                  <span>Close</span>
                  <small>(Street level)</small>
                </label>
                <label className={`zoom-radio ${zoomLevel === 'medium' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="medium"
                    checked={zoomLevel === 'medium'}
                    onChange={() => setZoomLevel('medium')}
                  />
                  <span>Medium</span>
                  <small>(Neighborhood)</small>
                </label>
                <label className={`zoom-radio ${zoomLevel === 'far' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="far"
                    checked={zoomLevel === 'far'}
                    onChange={() => setZoomLevel('far')}
                  />
                  <span>Whole Route</span>
                  <small>(Full view)</small>
                </label>
              </div>
            </div>
            
            <div className="timeline-control">
              <div className="timeline-container">
                <div className="timeline-track">
                  <div 
                    className="timeline-progress" 
                    style={{ 
                      width: `${animationProgress}%`,
                      transition: 'none'
                    }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={animationProgress}
                  onChange={(e) => {
                    const newProgress = parseFloat(e.target.value);
                    setAnimationProgress(newProgress);
                    
                    // Update animation position
                    countRef.current = newProgress * 2;
                    offsetRef.current = newProgress;
                    
                    // Update visual position if animating
                    if (polylineRef.current) {
                      const icons = polylineRef.current.get('icons');
                      if (icons && icons.length > 0) {
                        icons[0].offset = newProgress + '%';
                        polylineRef.current.set('icons', icons);
                      }
                      
                      // Pan to new position
                      const path = polylineRef.current.getPath();
                      const numPoints = path.getLength();
                      const floatIndex = (newProgress / 100) * (numPoints - 1);
                      const currentIndex = Math.floor(floatIndex);
                      
                      if (currentIndex < numPoints) {
                        const currentPos = path.getAt(currentIndex);
                        if (currentPos && map) {
                          map.panTo(currentPos);
                        }
                      }
                    }
                    
                    // Pause if playing
                    if (isAnimating && !isPaused) {
                      pauseAnimation();
                    }
                  }}
                  className={`timeline-slider ${isMobile ? 'mobile-thumb' : 'no-thumb'}`}
                />
                <div className="timeline-labels">
                  <span>0%</span>
                  <span>{Math.round(animationProgress)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Modal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
        />
      </>
    );
  }
  
  // Render minimized state 
  if (isMinimized) {
    // On mobile, always show camera icon FAB when minimized (ignore forceShow)
    if (isMobile || isMobileDevice()) {
      return (
        <div className="route-animator-minimized mobile">
          <button 
            className="unified-icon animation"
            onClick={() => setIsMinimized(false)}
            title="Show Animation Controls"
            style={{ position: 'fixed', left: '20px', bottom: '20px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c .55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
        </div>
      );
    }
    // Desktop minimized state - keep the same as before
    if (!forceShow) {
      return (
        <div className="route-animator-minimized">
          <button 
            className="unified-icon animation"
            onClick={() => setIsMinimized(false)}
            title="Show Animation Controls"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c .55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
        </div>
      );
    }
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
        {!isMobile && <DragHandle />}
        <h4>Route Animator</h4>
        <div className="header-actions">
          {isMobile && onClose ? (
            <>
              <button className="minimize-button" onClick={() => {
                savedPositionRef.current = { ...position };
                setIsMinimized(true);
              }} title="Minimize">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 9h8v1H4z"/>
                </svg>
              </button>
              <button className="close-button" onClick={() => {
                // Stop animation if running to clean up markers
                if (isAnimating) {
                  stopAnimation();
                }
                onClose();
              }} title="Back to Route">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M15 7H3.83l5.59-5.59L8 0 0 8l8 8 1.41-1.41L3.83 9H15V7z"/>
                </svg>
              </button>
            </>
          ) : (
            <button className="minimize-button" onClick={() => {
              savedPositionRef.current = { ...position };
              setIsMinimized(true);
            }} title="Minimize panel">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 9h8v1H4z"/>
              </svg>
            </button>
          )}
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
                    <FontAwesomeIcon icon={faStop} /> Exit Animation
                  </button>
                </>
              )}
            </div>
            
            <div className="zoom-control">
              <div className="zoom-radio-group">
                <label className={`zoom-radio ${zoomLevel === 'close' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="close"
                    checked={zoomLevel === 'close'}
                    onChange={() => setZoomLevel('close')}
                  />
                  <span>Close</span>
                  <small>(Street level)</small>
                </label>
                <label className={`zoom-radio ${zoomLevel === 'medium' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="medium"
                    checked={zoomLevel === 'medium'}
                    onChange={() => setZoomLevel('medium')}
                  />
                  <span>Medium</span>
                  <small>(Neighborhood)</small>
                </label>
                <label className={`zoom-radio ${zoomLevel === 'far' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="zoom"
                    value="far"
                    checked={zoomLevel === 'far'}
                    onChange={() => setZoomLevel('far')}
                  />
                  <span>Whole Route</span>
                  <small>(Full view)</small>
                </label>
              </div>
            </div>
            
            <div className="timeline-control">
              <label>Timeline Scrubber</label>
              <div className="timeline-container">
                <div className="timeline-track">
                  <div 
                    className="timeline-progress" 
                    style={{ 
                      width: `${animationProgress}%`,
                      transition: 'none' // Remove any CSS transitions that might interfere
                    }}
                    key={`progress-${Math.floor(animationProgress)}`} // Force re-render
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={animationProgress}
                  onChange={(e) => {
                    const newProgress = parseFloat(e.target.value);
                    setAnimationProgress(newProgress);
                    
                    // Update animation position
                    countRef.current = newProgress * 2;
                    offsetRef.current = newProgress;
                    
                    // Update visual position if animating
                    if (polylineRef.current) {
                      const icons = polylineRef.current.get('icons');
                      if (icons && icons.length > 0) {
                        icons[0].offset = newProgress + '%';
                        polylineRef.current.set('icons', icons);
                      }
                      
                      // Pan to new position
                      const path = polylineRef.current.getPath();
                      const numPoints = path.getLength();
                      const floatIndex = (newProgress / 100) * (numPoints - 1);
                      const currentIndex = Math.floor(floatIndex);
                      
                      if (currentIndex < numPoints) {
                        const currentPos = path.getAt(currentIndex);
                        if (currentPos && map) {
                          map.panTo(currentPos);
                        }
                      }
                    }
                    
                    // Pause if playing
                    if (isAnimating && !isPaused) {
                      pauseAnimation();
                    }
                  }}
                  className="timeline-slider"
                />
                <div className="timeline-labels">
                  <span>0%</span>
                  <span>{Math.round(animationProgress)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            
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
