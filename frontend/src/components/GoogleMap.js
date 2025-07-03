import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

const MapComponent = ({ 
  isCreating, 
  waypoints = [], 
  segments = [], 
  onMapClick, 
  onLocationSearch,
  trip,
  center,
  onWaypointsChange
}) => {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [markersArray, setMarkersArray] = useState([]);
  const [routeRenderers, setRouteRenderers] = useState([]);

  // Initialize map
  const initMap = useCallback(() => {
    if (!mapRef.current) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: 40.7505, lng: -73.9934 }, // NYC default
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: "transit",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "transit.station.bus",
          stylers: [{ visibility: "on" }]
        }
      ]
    });

    const directionsServiceInstance = new window.google.maps.DirectionsService();
    const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true, // We'll use custom markers
      polylineOptions: {
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    directionsRendererInstance.setMap(mapInstance);

    setMap(mapInstance);
    setDirectionsService(directionsServiceInstance);
    setDirectionsRenderer(directionsRendererInstance);

    // Add click listener for creating trips
    if (isCreating) {
      mapInstance.addListener('click', (event) => {
        if (onMapClick) {
          onMapClick(event.latLng.lat(), event.latLng.lng());
        }
      });
    }

  }, [isCreating, onMapClick]);

  useEffect(() => {
    if (window.google) {
      initMap();
    }
  }, [initMap]);

  // Handle center changes from search
  useEffect(() => {
    if (map && center) {
      console.log('Centering map on:', center);
      map.setCenter(center);
      map.setZoom(13);
    }
  }, [map, center]);

  // Clear existing markers - using useRef to avoid circular dependency
  const markersRef = useRef([]);
  const routeRenderersRef = useRef([]);
  const segmentMarkersRef = useRef([]);
  
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    setMarkersArray([]);
  }, []);



  // Get transportation mode colors and icons
  const getTransportationColor = (mode) => {
    const colors = {
      bike: "#22c55e",
      bus: "#3b82f6", 
      walk: "#f59e0b",
      car: "#ef4444",
      subway: "#8b5cf6",
      train: "#06b6d4",
      flight: "#0ea5e9",
      scooter: "#f97316",
      uber: "#000000"
    };
    return colors[mode] || "#f59e0b";
  };

  const getTransportationIcon = (mode) => {
    const icons = {
      bike: "🚴‍♀️",
      bus: "🚌",
      walk: "🚶‍♀️",
      car: "🚗",
      subway: "🚇",
      train: "🚆",
      flight: "✈️",
      scooter: "🛴",
      uber: "🚕"
    };
    return icons[mode] || "🚶‍♀️";
  };

  // Add segment marker with transportation icon
  const addSegmentMarker = (route, mode, segmentIndex) => {
    if (!route || !route.legs || !route.legs[0] || !map) return;
    
    const leg = route.legs[0];
    const path = leg.steps;
    
    if (path.length === 0) return;
    
    // Find the midpoint of the route
    let totalSteps = path.length;
    let midStep = Math.floor(totalSteps / 2);
    let midPoint = path[midStep].start_location;
    
    const icon = getTransportationIcon(mode);
    const color = getTransportationColor(mode);
    
    const marker = new window.google.maps.Marker({
      position: midPoint,
      map: map,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" font-size="10" fill="white">${icon}</text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12)
      },
      zIndex: 1000 + segmentIndex,
      title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Segment`
    });
    
    segmentMarkersRef.current.push(marker);
  };

  // Draw route with Google Directions API
  const drawRoute = useCallback(() => {
    if (!directionsService || !directionsRenderer || waypoints.length < 2) return;

    const start = new window.google.maps.LatLng(waypoints[0][0], waypoints[0][1]);
    const end = new window.google.maps.LatLng(
      waypoints[waypoints.length - 1][0], 
      waypoints[waypoints.length - 1][1]
    );

    const waypointsForGoogle = waypoints.slice(1, -1).map(point => ({
      location: new window.google.maps.LatLng(point[0], point[1]),
      stopover: true
    }));

    // Determine travel mode based on the first segment
    let travelMode = window.google.maps.TravelMode.WALKING;
    if (segments.length > 0) {
      switch (segments[0].mode) {
        case 'bike':
          travelMode = window.google.maps.TravelMode.BICYCLING;
          break;
        case 'car':
        case 'uber':
          travelMode = window.google.maps.TravelMode.DRIVING;
          break;
        case 'bus':
        case 'subway':
        case 'train':
          travelMode = window.google.maps.TravelMode.TRANSIT;
          break;
        default:
          travelMode = window.google.maps.TravelMode.WALKING;
      }
    }

    const request = {
      origin: start,
      destination: end,
      waypoints: waypointsForGoogle,
      travelMode: travelMode,
      optimizeWaypoints: false
    };

    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed:', status);
      }
    });

  }, [directionsService, directionsRenderer, waypoints, segments]);



  // Add waypoint markers for trip creation
  useEffect(() => {
    if (!map || !isCreating) return;

    // Clear existing markers and routes
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Clear routes directly
    routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
    routeRenderersRef.current = [];
    
    const newMarkers = waypoints.map((point, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point[0], lng: point[1] },
        map: map,
        title: `Waypoint ${index + 1}`,
        draggable: true,
        label: {
          text: (index + 1).toString(),
          color: 'white',
          fontWeight: 'bold'
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
          scale: 14
        }
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
      marker.addListener('dragend', (event) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        
        // Update waypoint in the array
        const updatedWaypoints = [...waypoints];
        updatedWaypoints[index] = [newLat, newLng];
        
        // Call parent's update function
        if (onWaypointsChange) {
          onWaypointsChange(updatedWaypoints);
        }
        
        console.log('Waypoint dragged to:', newLat, newLng);
      });

      return marker;
    });

    markersRef.current = newMarkers;
    setMarkersArray(newMarkers);

    // Draw colored segments instead of single route
    if (segments.length > 0 && waypoints.length >= 2) {
      // Draw colored segments inline to avoid dependency issues
      const drawSegments = async () => {
        if (!directionsService || !map) return;

        // Clear existing route renderers and segment markers
        routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
        routeRenderersRef.current = [];
        
        segmentMarkersRef.current.forEach(marker => marker.setMap(null));
        segmentMarkersRef.current = [];

        const newRenderers = [];

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const startPoint = waypoints[segment.startIndex];
          const endPoint = waypoints[segment.endIndex];

          if (!startPoint || !endPoint) continue;

          // Create a new DirectionsRenderer for this segment
          const segmentRenderer = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: getTransportationColor(segment.mode),
              strokeWeight: 5,
              strokeOpacity: 0.8
            }
          });

          segmentRenderer.setMap(map);

          // Determine travel mode
          let travelMode = window.google.maps.TravelMode.WALKING;
          switch (segment.mode) {
            case 'bike':
              travelMode = window.google.maps.TravelMode.BICYCLING;
              break;
            case 'car':
            case 'uber':
              travelMode = window.google.maps.TravelMode.DRIVING;
              break;
            case 'bus':
            case 'subway':
            case 'train':
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

            segmentRenderer.setDirections(result);
            newRenderers.push(segmentRenderer);
            
            // Add segment marker with transportation icon
            addSegmentMarker(result.routes[0], segment.mode, i);
          } catch (error) {
            console.error('Directions request failed for segment:', error);
          }
        }

        routeRenderersRef.current = newRenderers;
      };

      drawSegments();
    }

  }, [map, waypoints, segments, isCreating]);

  // Render existing trip
  useEffect(() => {
    if (!map || !trip || isCreating) return;

    // Clear existing markers and routes
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Clear routes directly
    routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
    routeRenderersRef.current = [];
    
    // Clear segment markers
    segmentMarkersRef.current.forEach(marker => marker.setMap(null));
    segmentMarkersRef.current = [];

    // Add markers for trip segments
    const newMarkers = [];
    trip.segments.forEach((segment, index) => {
      // Start marker
      const startMarker = new window.google.maps.Marker({
        position: { lat: segment.coordinates[0][0], lng: segment.coordinates[0][1] },
        map: map,
        title: index === 0 ? 'Trip Start' : `Transfer to ${segment.mode}`,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="16" fill="${segment.color}" stroke="white" stroke-width="3"/>
              <text x="18" y="18" text-anchor="middle" dominant-baseline="central" fill="white" font-size="16" font-family="Arial">${segment.icon}</text>
            </svg>
          `)}`
        }
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
        const endMarker = new window.google.maps.Marker({
          position: { 
            lat: segment.coordinates[segment.coordinates.length - 1][0], 
            lng: segment.coordinates[segment.coordinates.length - 1][1] 
          },
          map: map,
          title: 'Trip End',
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="16" fill="#10b981" stroke="white" stroke-width="3"/>
                <text x="18" y="18" text-anchor="middle" dominant-baseline="central" fill="white" font-size="16" font-family="Arial">🏁</text>
              </svg>
            `)}`
          }
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
    setMarkersArray(newMarkers);

    // Draw the trip route segments
    if (trip.segments.length > 0) {
      const drawTripSegments = async () => {
        const newRenderers = [];

        for (let i = 0; i < trip.segments.length; i++) {
          const segment = trip.segments[i];
          
          if (segment.coordinates.length < 2) continue;

          // Create a new DirectionsRenderer for this segment
          const segmentRenderer = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: segment.color,
              strokeWeight: 5,
              strokeOpacity: 0.8
            }
          });

          segmentRenderer.setMap(map);

          // Determine travel mode
          let travelMode = window.google.maps.TravelMode.WALKING;
          switch (segment.mode) {
            case 'bike':
              travelMode = window.google.maps.TravelMode.BICYCLING;
              break;
            case 'car':
            case 'uber':
              travelMode = window.google.maps.TravelMode.DRIVING;
              break;
            case 'bus':
            case 'subway':
            case 'train':
              travelMode = window.google.maps.TravelMode.TRANSIT;
              break;
            default:
              travelMode = window.google.maps.TravelMode.WALKING;
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
            
            // Add segment marker with transportation icon
            addSegmentMarker(result.routes[0], segment.mode, i);
          } catch (error) {
            console.error('Directions request failed for trip segment:', error);
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

  }, [map, trip, isCreating]);



  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🗺️</div>
          <p>Loading Google Maps...</p>
        </div>
      );
    case Status.FAILURE:
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          color: '#ef4444',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <h3>Google Maps API Error</h3>
          <p>Please check your API key in <code>frontend/.env.local</code></p>
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            See <strong>GOOGLE_MAPS_SETUP.md</strong> for setup instructions
          </p>
        </div>
      );
    default:
      return null;
  }
};

const GoogleMap = (props) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        flexDirection: 'column',
        color: '#f59e0b',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fffbeb',
        border: '2px dashed #f59e0b'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔑</div>
        <h3>Google Maps API Key Required</h3>
        <p>To use the map features, you need to:</p>
        <ol style={{ textAlign: 'left', margin: '1rem 0' }}>
          <li>Get a free API key from Google Cloud Console</li>
          <li>Add it to <code>frontend/.env.local</code></li>
          <li>Restart the development server</li>
        </ol>
        <p style={{ fontSize: '0.9rem' }}>
          📖 See <strong>GOOGLE_MAPS_SETUP.md</strong> for detailed instructions
        </p>
      </div>
    );
  }

  return (
    <Wrapper 
      apiKey={apiKey}
      render={render}
      libraries={['places', 'geometry']}
    >
      <MapComponent {...props} />
    </Wrapper>
  );
};

export default GoogleMap; 