import React, { useState, useEffect, useRef } from 'react';
import LocationSearchCustom from './LocationSearchCustom';

const LocationSearch = ({ onLocationSelect, placeholder = "Search for a city or location..." }) => {
  const [searchInput, setSearchInput] = useState('');
  const [useNewAPI, setUseNewAPI] = useState(false);
  const containerRef = useRef();
  const inputRef = useRef();
  
  // Check if we should use custom implementation
  const useCustomImplementation = process.env.REACT_APP_USE_CUSTOM_AUTOCOMPLETE === 'true';

  useEffect(() => {
    // Check if new API is available
    const timer = setTimeout(() => {
      if (!window.google?.maps?.places) return;

      // Try to use new PlaceAutocompleteElement if available
      if (window.google.maps.places.PlaceAutocompleteElement) {
        setUseNewAPI(true);
        
        try {
          // Create the new PlaceAutocompleteElement
          const input = document.createElement('gmp-place-autocomplete');
          input.setAttribute('placeholder', placeholder);
          // Set initial styles to prevent purple flash
          input.style.background = '#ffffff';
          input.style.display = 'block';
          
          if (containerRef.current) {
            // Clear container
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(input);
            
            
            // Try to log all available events
            setTimeout(() => {
              if (input.shadowRoot) {
                const shadowInput = input.shadowRoot.querySelector('input');
                
                // If we find it, immediately start monitoring
                if (shadowInput) {
                  // Direct input listener on shadow element
                  shadowInput.addEventListener('input', (e) => {
                    currentValue = e.target.value;
                  });
                  
                  // Also monitor on keyup for safety
                  shadowInput.addEventListener('keyup', (e) => {
                    currentValue = e.target.value;
                  });
                }
              }
            }, 500);
            
            // Listen for ALL events to see what's available
            const allEvents = ['gmpx-input', 'gmpx-querychange', 'gmpx-select', 'gmpx-request-error', 
                              'input', 'change', 'keydown', 'keyup', 'focus', 'blur'];
            allEvents.forEach(eventName => {
              input.addEventListener(eventName, (e) => {
                
                // Special handling for input event
                if (eventName === 'input') {
                  // The input event is bubbling from shadow DOM
                  // Let's try to access the shadow input immediately
                  setTimeout(() => {
                    const shadowInput = input.shadowRoot?.querySelector('input');
                    if (shadowInput) {
                      currentValue = shadowInput.value;
                    }
                  }, 0);
                  
                  // Also try immediate access
                  const shadowInput = input.shadowRoot?.querySelector('input');
                  if (shadowInput?.value) {
                    currentValue = shadowInput.value;
                  }
                }
              });
            });
            
            // Store the current input value and selected suggestion
            let currentValue = '';
            let selectedSuggestion = null;
            
            // Multiple methods to get input value
            const getInputValue = () => {
              // Method 1: Shadow DOM input (most reliable)
              const shadowInput = input.shadowRoot?.querySelector('input');
              if (shadowInput?.value) {
                return shadowInput.value;
              }
              
              // Method 2: Direct value property
              if (input.value !== undefined && input.value !== '') {
                return input.value;
              }
              
              // Method 3: Check for query property
              if (input.query !== undefined && input.query !== '') {
                return input.query;
              }
              
              // Method 4: Return stored value
              return currentValue;
            };
            
            // Listen for input value changes
            input.addEventListener('gmpx-input', (e) => {
              currentValue = e.detail?.value || '';
            });
            
            // Listen for suggestion selection
            input.addEventListener('gmpx-select', (e) => {
              selectedSuggestion = e.detail;
            });
            
            
            // Container level
            containerRef.current.addEventListener('keydown', async (e) => {
              const actualValue = getInputValue();
              
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                
                // One more attempt to get the value directly when Enter is pressed
                const shadowInput = input.shadowRoot?.querySelector('input');
                const directValue = shadowInput?.value || '';
                
                const searchValue = directValue || actualValue || currentValue;
                
                // If no suggestion selected but we have text, search for it
                if (!selectedSuggestion && searchValue) {
                  
                  // Use Geocoding API to search for the text
                  const geocoder = new window.google.maps.Geocoder();
                  
                  geocoder.geocode({ address: searchValue }, (results, status) => {
                    
                    if (status === 'OK' && results[0]) {
                      const result = results[0];
                      const location = {
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng(),
                        name: result.address_components[0]?.long_name || searchValue,
                        address: result.formatted_address
                      };
                      
                      if (onLocationSelect) {
                        onLocationSelect(location);
                      }
                    } else {
                    }
                  });
                } else {
                }
              }
            }, true); // Use capture
            
            // Try to add listener directly to the element
            input.addEventListener('keydown', (e) => {
            }, true);
            
            // Monitor shadow DOM input if available
            setTimeout(() => {
              const shadowInput = input.shadowRoot?.querySelector('input');
              if (shadowInput) {
                shadowInput.addEventListener('input', (e) => {
                  currentValue = e.target.value;
                });
                
                shadowInput.addEventListener('keydown', (e) => {
                });
              }
            }, 1000);
            
            // Use MutationObserver as fallback to detect value changes
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                  currentValue = input.value || '';
                }
              });
            });
            
            // Observe the PlaceAutocompleteElement for attribute changes
            observer.observe(input, { 
              attributes: true, 
              attributeFilter: ['value', 'query'],
              subtree: true 
            });
            
            // Also try to observe the shadow DOM input when available
            setTimeout(() => {
              const shadowInput = input.shadowRoot?.querySelector('input');
              if (shadowInput) {
                const shadowObserver = new MutationObserver(() => {
                  const newValue = shadowInput.value;
                  if (newValue !== currentValue) {
                    currentValue = newValue;
                  }
                });
                
                shadowObserver.observe(shadowInput, { 
                  attributes: true, 
                  attributeFilter: ['value'] 
                });
                
                // Also poll shadow input value
                setInterval(() => {
                  const val = shadowInput.value;
                  if (val && val !== currentValue) {
                    currentValue = val;
                  }
                }, 100);
              }
            }, 1000);
            
            // Handle place selection from dropdown
            input.addEventListener('gmp-placeselect', async (e) => {
              const place = e.detail.place;
              
              if (!place) return;

              try {
                // Fetch full place details
                await place.fetchFields({ 
                  fields: ['displayName', 'formattedAddress', 'location', 'id'] 
                });
                
                const location = {
                  lat: place.location.lat(),
                  lng: place.location.lng(),
                  name: place.displayName || '',
                  address: place.formattedAddress || '',
                  placeId: place.id || ''
                };

                if (onLocationSelect) {
                  onLocationSelect(location);
                }
                
                // Clear the selected suggestion
                selectedSuggestion = null;
              } catch (error) {
              }
            });
          }
        } catch (error) {
          setUseNewAPI(false);
        }
      } else {
        // PlaceAutocompleteElement not available
        setUseNewAPI(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [onLocationSelect, placeholder, useNewAPI]);

  // Render custom implementation if enabled
  if (useCustomImplementation) {
    return <LocationSearchCustom onLocationSelect={onLocationSelect} placeholder={placeholder} />;
  }

  // Render new API implementation
  if (useNewAPI) {
    return <div ref={containerRef} className="location-search" />;
  }

  // Render basic input (fallback)
  return (
    <div className="location-search" style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder={placeholder}
        className="location-search-input"
      />
    </div>
  );
};

export default LocationSearch; 