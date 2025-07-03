import React, { useState, useEffect, useRef } from 'react';

const LocationSearch = ({ onLocationSelect, placeholder = "Search for a city or location..." }) => {
  const [searchInput, setSearchInput] = useState('');
  const searchBoxRef = useRef();
  const autocompleteRef = useRef();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!window.google?.maps?.places || !searchBoxRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(searchBoxRef.current, {
      types: ['(cities)'],
      fields: ['place_id', 'geometry', 'name', 'formatted_address']
    });

      const handlePlaceSelect = (place) => {
    setIsSearching(false);
    
    if (!place.geometry || !place.geometry.location) {
      console.error('No geometry found for place');
      return;
    }

    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      name: place.name,
      address: place.formatted_address
    };

    console.log('Selected location:', location);

    if (onLocationSelect) {
      onLocationSelect(location);
    }

    setSearchInput(place.formatted_address || place.name);
  };

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      handlePlaceSelect(place);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onLocationSelect]);

  // Handle Enter key press for manual search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performManualSearch();
    }
  };

  // Perform manual search using Places TextSearch
  const performManualSearch = () => {
    if (!searchInput.trim() || !window.google?.maps?.places) return;
    
    setIsSearching(true);
    
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    
    const request = {
      query: searchInput,
      fields: ['place_id', 'geometry', 'name', 'formatted_address']
    };

    service.textSearch(request, (results, status) => {
      setIsSearching(false);
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        const place = results[0];
        
        if (place.geometry && place.geometry.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name,
            address: place.formatted_address
          };

          if (onLocationSelect) {
            onLocationSelect(location);
          }

          setSearchInput(place.formatted_address || place.name);
        }
      } else {
        console.log('No results found for:', searchInput);
      }
    });
  };

  return (
    <div className="location-search" style={{ position: 'relative' }}>
      <input
        ref={searchBoxRef}
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={isSearching ? "Searching..." : placeholder}
        className="location-search-input"
        disabled={isSearching}
      />
      {isSearching && (
        <div style={{ 
          position: 'absolute', 
          right: '10px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          fontSize: '12px',
          color: '#666'
        }}>
          🔍
        </div>
      )}
    </div>
  );
};

export default LocationSearch; 