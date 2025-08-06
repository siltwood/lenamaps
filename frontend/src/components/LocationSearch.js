import React, { useState, useEffect, useRef } from 'react';

// Custom autocomplete implementation using Places Service
const LocationSearch = ({ onLocationSelect, placeholder = "Search for a city or location..." }) => {
  const [searchInput, setSearchInput] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const searchTimeout = useRef(null);
  const containerRef = useRef(null);
  const sessionToken = useRef(null);

  useEffect(() => {
    // Function to initialize services
    const initializeServices = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        // Note: PlacesService requires a map or HTMLDivElement that's in the DOM
        const div = document.createElement('div');
        document.body.appendChild(div);
        div.style.display = 'none';
        placesService.current = new window.google.maps.places.PlacesService(div);
        // Create initial session token
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
      } else {
        // Retry after a short delay
        setTimeout(initializeServices, 500);
      }
    };

    initializeServices();
  }, []);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = (input) => {
    
    if (!autocompleteService.current || input.length < 2) {
      setPredictions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      { 
        input,
        sessionToken: sessionToken.current 
      },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setSelectedIndex(-1);

    // Debounce the search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  const selectPlace = (placeId, description) => {
    if (!placesService.current) {
      console.error('Places service not initialized');
      return;
    }

    placesService.current.getDetails(
      {
        placeId,
        fields: ['geometry', 'name', 'formatted_address'],
        sessionToken: sessionToken.current
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name,
            address: place.formatted_address
          };

          setSearchInput(description);
          setPredictions([]);
          setShowDropdown(false);

          // Create new session token after place selection
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();

          if (onLocationSelect) {
            onLocationSelect(location);
          }
        } else {
          console.error('Failed to get place details:', status);
        }
      }
    );
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        if (showDropdown && predictions.length > 0) {
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < predictions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        if (showDropdown && predictions.length > 0) {
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (showDropdown && selectedIndex >= 0 && selectedIndex < predictions.length) {
          // Select from dropdown
          const prediction = predictions[selectedIndex];
          selectPlace(prediction.place_id, prediction.description);
        } else if (searchInput.trim()) {
          // No dropdown or selection - perform geocoding search
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: searchInput }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const result = results[0];
              const location = {
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                name: result.address_components[0]?.long_name || searchInput,
                address: result.formatted_address
              };
              
              setSearchInput(result.formatted_address);
              setPredictions([]);
              setShowDropdown(false);
              
              // Create new session token after geocoding search
              sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
              
              if (onLocationSelect) {
                onLocationSelect(location);
              }
            } else {
            }
          });
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  
  return (
    <div ref={containerRef} className="location-search-custom">
      <input
        type="text"
        value={searchInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="location-search-input"
      />
      
      {showDropdown && predictions.length > 0 && (
        <div className="location-search-dropdown">
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              className={`location-search-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => selectPlace(prediction.place_id, prediction.description)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="location-search-item-main">
                {prediction.structured_formatting.main_text}
              </div>
              <div className="location-search-item-secondary">
                {prediction.structured_formatting.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;