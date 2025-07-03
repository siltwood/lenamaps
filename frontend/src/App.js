import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GoogleMap from './components/GoogleMap';
import TripSidebar from './components/TripSidebar';
import TripCreator from './components/TripCreator';
import LocationSearch from './components/LocationSearch';
import './App.css';

function App() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creatorWaypoints, setCreatorWaypoints] = useState([]);
  const [creatorSegments, setCreatorSegments] = useState([]);
  const [currentTransportationMode, setCurrentTransportationMode] = useState('walk');
  const [mapCenter, setMapCenter] = useState({ lat: 40.7505, lng: -73.9934 });

  useEffect(() => {
    fetchTrips();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTrips = async () => {
    try {
      const response = await axios.get('/api/trips');
      setTrips(response.data);
      if (response.data.length > 0 && !selectedTrip) {
        setSelectedTrip(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = () => {
    setIsCreating(true);
    setSelectedTrip(null);
    setCreatorWaypoints([]);
    setCreatorSegments([]);
  };

  const handleCloseCreator = () => {
    setIsCreating(false);
    setCreatorWaypoints([]);
    setCreatorSegments([]);
  };

  const handleTripCreated = (newTrip) => {
    setTrips([...trips, newTrip]);
    setSelectedTrip(newTrip);
    setIsCreating(false);
  };

  const handleMapClick = (lat, lng) => {
    if (!isCreating) return;
    
    const newWaypoint = [lat, lng];
    const updatedWaypoints = [...creatorWaypoints, newWaypoint];
    setCreatorWaypoints(updatedWaypoints);

    // Add a new segment if we have at least 2 waypoints
    if (updatedWaypoints.length >= 2) {
      const newSegment = {
        mode: currentTransportationMode,
        startIndex: updatedWaypoints.length - 2,
        endIndex: updatedWaypoints.length - 1
      };
      setCreatorSegments([...creatorSegments, newSegment]);
    }
  };

  const handleLocationSearch = (location) => {
    console.log('App received location search:', location);
    setMapCenter({ lat: location.lat, lng: location.lng });
    // If creating a trip and no waypoints yet, add this as first waypoint
    if (isCreating && creatorWaypoints.length === 0) {
      handleMapClick(location.lat, location.lng);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      await axios.delete(`/api/trips/${tripId}`);
      setTrips(trips.filter(trip => trip.id !== tripId));
      // If the deleted trip was selected, clear selection
      if (selectedTrip && selectedTrip.id === tripId) {
        setSelectedTrip(null);
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error deleting trip. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="header">
          <h1>LenaMaps</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <p>Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5em' }}>🗺️</span> 
          <span>LenaMaps - Trip Visualization</span>
        </h1>
        <div className="header-search">
          {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && 
           process.env.REACT_APP_GOOGLE_MAPS_API_KEY !== "your_google_maps_api_key_here" ? (
            <LocationSearch 
              onLocationSelect={handleLocationSearch}
              placeholder="Search for a city to start your trip..."
            />
          ) : (
            <div style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: '25px',
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.8)'
            }}>
              Set up Google Maps API to enable search
            </div>
          )}
        </div>
      </header>
      <div className="main-content">
        <TripSidebar 
          trips={trips}
          selectedTrip={selectedTrip}
          onTripSelect={setSelectedTrip}
          onCreateTrip={handleCreateTrip}
          onDeleteTrip={handleDeleteTrip}
          isCreating={isCreating}
        />
        <div className="map-container">
          <GoogleMap 
            trip={selectedTrip}
            isCreating={isCreating}
            waypoints={creatorWaypoints}
            segments={creatorSegments}
            onMapClick={handleMapClick}
            center={mapCenter}
            onWaypointsChange={setCreatorWaypoints}
          />
        </div>
      </div>
      
      <TripCreator
        isCreating={isCreating}
        onClose={handleCloseCreator}
        onTripCreated={handleTripCreated}
        waypoints={creatorWaypoints}
        segments={creatorSegments}
        onWaypointsChange={setCreatorWaypoints}
        onSegmentsChange={setCreatorSegments}
        currentTransportationMode={currentTransportationMode}
        onTransportationModeChange={setCurrentTransportationMode}
      />
    </div>
  );
}

export default App; 