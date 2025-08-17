import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationSearch from '../../Shared/LocationSearch';
import TRANSPORTATION_MODES from '../../../constants/transportationModes';
import RouteAnimator from '../../Desktop/RouteAnimator/RouteAnimator';
import '../../../styles/unified-icons.css';
import './MobileControls.css';

const MobileControls = ({ 
  onDirectionsCalculated,
  clickedLocation,
  onLocationUsed,
  locations = [null, null],
  legModes = ['walk'],
  onLocationsChange,
  onLegModesChange,
  directionsRoute,
  onUndo,
  onClearHistory,
  canUndo = false,
  onShowAnimator,
  onHideAnimator,
  isAnimating,
  showRouteAnimator,
  map,
  onAnimationStateChange
}) => {
  const [showCard, setShowCard] = useState(true);
  const [viewMode, setViewMode] = useState('planner'); // 'planner' or 'animator'
  const [showSearchInputs, setShowSearchInputs] = useState({});
  const [activeInput, setActiveInput] = useState(null); // Track which input is active for clicking
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [cardTranslateY, setCardTranslateY] = useState(0);
  
  // Reset position when card is shown
  useEffect(() => {
    if (showCard) {
      setCardTranslateY(0);
    }
  }, [showCard]);
  
  // Card ref for animations
  const cardRef = useRef(null);
  
  // Switch view mode when animator is toggled
  useEffect(() => {
    if (showRouteAnimator) {
      setViewMode('animator');
    } else {
      setViewMode('planner');
    }
  }, [showRouteAnimator]);

  // Add global mouse move and up listeners for smoother dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e) => handleDragMove(e);
      const handleGlobalEnd = () => handleDragEnd();
      
      // Add touch event listeners with { passive: false } to allow preventDefault
      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('mouseup', handleGlobalEnd);
      document.addEventListener('touchmove', handleGlobalMove, { passive: true });
      document.addEventListener('touchend', handleGlobalEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMove);
        document.removeEventListener('mouseup', handleGlobalEnd);
        document.removeEventListener('touchmove', handleGlobalMove);
        document.removeEventListener('touchend', handleGlobalEnd);
      };
    }
  }, [isDragging, dragStartY]);

  // Handle clicked location from map - ONLY when card is open and in planner mode
  useEffect(() => {
    if (clickedLocation && showCard && viewMode === 'planner') {
      const newLocations = [...locations];
      
      // If there's an active input (edit mode), replace that specific location
      if (activeInput !== null) {
        newLocations[activeInput] = clickedLocation;
        // Clear active input and close search box to show the updated location
        const indexToClose = activeInput; // Capture the value before clearing
        setActiveInput(null);
        setShowSearchInputs(prev => ({ ...prev, [indexToClose]: false }));
      } else {
        // Otherwise, find the first empty slot
        const emptyIndex = newLocations.findIndex(loc => !loc);
        if (emptyIndex !== -1) {
          newLocations[emptyIndex] = clickedLocation;
        }
      }
      
      onLocationsChange(newLocations, 'ADD_LOCATION');
      
      // ALWAYS recalculate route if we have at least 2 locations (even in edit mode)
      const filledCount = newLocations.filter(l => l).length;
      if (filledCount >= 2) {
        calculateRoute(newLocations, legModes);
      }
      
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation]);

  const calculateRoute = (locs, modes) => {
    const filledLocations = locs.filter(loc => loc !== null);
    if (filledLocations.length >= 2 && onDirectionsCalculated) {
      // Only calculate route when we have at least 2 locations
      const segments = [];
      for (let i = 0; i < filledLocations.length - 1; i++) {
        segments.push({
          mode: modes[i] || 'walk',
          startIndex: i,
          endIndex: i + 1
        });
      }
      
      const routeData = {
        origin: filledLocations[0],
        destination: filledLocations[filledLocations.length - 1],
        waypoints: filledLocations.slice(1, -1),
        mode: modes[0],
        segments,
        allLocations: locs,
        allModes: modes,
        routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
      };
      
      onDirectionsCalculated(routeData);
    }
  };


  const handleClear = () => {
    try {
      if (onLocationsChange && onLegModesChange) {
        onLocationsChange([null, null], null);
        onLegModesChange(['walk']);
        onDirectionsCalculated(null);
        if (onClearHistory) {
          onClearHistory();
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };


  // Handle drag events (both touch and mouse for testing)
  const handleDragStart = (e) => {
    // Only preventDefault for mouse events, not touch (which are passive by default)
    if (!e.touches) {
      e.preventDefault();
    }
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setDragStartY(clientY - cardTranslateY); // Account for current position
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    // Don't preventDefault here - it causes issues with passive event listeners
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY;
    
    // Limit dragging - don't allow dragging above initial position (deltaY < 0 means dragging up)
    // Allow dragging down without limit for minimizing
    const constrainedDeltaY = Math.max(0, deltaY);
    setCardTranslateY(constrainedDeltaY);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Get viewport height and card position
    const viewportHeight = window.innerHeight;
    const cardRect = cardRef.current?.getBoundingClientRect();
    
    if (cardRect) {
      const cardTop = cardRect.top;
      const cardDefaultTop = viewportHeight * 0.6; // Default position of card
      
      // If card top is dragged below 80px from bottom of screen, minimize it
      if (cardTop > viewportHeight - 80) {
        // Calculate how far to slide from current position
        const slideDistance = viewportHeight - cardDefaultTop;
        setCardTranslateY(slideDistance);
        setTimeout(() => {
          setShowCard(false);
        }, 400); // Wait for slide animation to complete
      }
      // Otherwise, keep it where the user dragged it - don't snap back
      // cardTranslateY is already set to the current position
    }
  };

  // Render animator controls inline
  const renderAnimator = () => {
    if (!map || !directionsRoute) return null;
    
    return (
      <RouteAnimator
        map={map}
        directionsRoute={directionsRoute}
        onAnimationStateChange={(isAnimating) => {
          // Hide the card when animation starts, show when it stops
          setShowCard(!isAnimating);
          // Pass the state up to parent
          if (onAnimationStateChange) {
            onAnimationStateChange(isAnimating);
          }
        }}
        isMobile={true}
        forceShow={true}
        onClose={() => {
          setViewMode('planner');
          if (onHideAnimator) {
            onHideAnimator();
          }
        }}
        onMinimize={() => setShowCard(false)}
        embeddedInModal={true}
      />
    );
  };

  // Render planner view
  const renderPlanner = () => (
    <>
      <div className="mobile-planner-header">
        <h2>Visualize Your Route</h2>
      </div>
      <div className="mobile-planner-content">
        <div className="mobile-segments-container">
          {/* Render all location segments */}
          {locations.map((location, index) => (
            <div key={index} className="mobile-segment">
              <div className="mobile-route-row" style={{ position: 'relative' }}>
                <div className={`mobile-route-marker ${index === 0 ? 'start' : index === locations.length - 1 ? 'end' : 'waypoint'}`}>
                  {String.fromCharCode(65 + index)}
                </div>
                {showSearchInputs[index] ? (
                  <div className="mobile-search-container">
                    <LocationSearch
                      onLocationSelect={(loc) => {
                        const newLocations = [...locations];
                        newLocations[index] = loc;
                        onLocationsChange(newLocations);
                        setShowSearchInputs(prev => ({ ...prev, [index]: false }));
                        setActiveInput(null); // Clear active input
                        
                        // Center map on point A when it's searched (not clicked)
                        if (index === 0 && map) {
                          map.panTo({ lat: loc.lat, lng: loc.lng });
                          map.setZoom(15); // Zoom in to show the location clearly
                        }
                        
                        // Calculate route if we have at least 2 locations
                        const filledCount = newLocations.filter(l => l).length;
                        if (filledCount >= 2) {
                          calculateRoute(newLocations, legModes);
                        }
                      }}
                      placeholder={`Search for point ${String.fromCharCode(65 + index)}...`}
                    />
                    <button 
                      className="mobile-search-cancel"
                      onClick={() => {
                        setShowSearchInputs(prev => ({ ...prev, [index]: false }));
                        setActiveInput(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : !location ? (
                  <input 
                    type="text"
                    placeholder={index === 0 ? "Tap map or search..." : "Tap map or search..."}
                    className={`mobile-route-input ${activeInput === index ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInput(index);
                      setShowSearchInputs(prev => ({ ...prev, [index]: true }));
                    }}
                    readOnly
                  />
                ) : activeInput === index && showSearchInputs[index] ? (
                  <div className="mobile-search-container">
                    <LocationSearch
                      onLocationSelect={(loc) => {
                        const newLocations = [...locations];
                        newLocations[index] = loc;
                        onLocationsChange(newLocations);
                        setShowSearchInputs(prev => ({ ...prev, [index]: false }));
                        setActiveInput(null); // Clear active input
                        
                        // Center map on point A when it's searched (not clicked)
                        if (index === 0 && map) {
                          map.panTo({ lat: loc.lat, lng: loc.lng });
                          map.setZoom(15); // Zoom in to show the location clearly
                        }
                        
                        // Calculate route if we have at least 2 locations
                        const filledCount = newLocations.filter(l => l).length;
                        if (filledCount >= 2) {
                          calculateRoute(newLocations, legModes);
                        }
                      }}
                      placeholder={`Search for point ${String.fromCharCode(65 + index)}...`}
                      defaultValue={location?.name || location?.address || ''}
                    />
                    <button 
                      className="mobile-search-cancel"
                      onClick={() => {
                        setShowSearchInputs(prev => ({ ...prev, [index]: false }));
                        setActiveInput(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`mobile-route-input filled ${activeInput === index ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInput(index);
                      // Don't clear the location immediately - just mark it as active for editing
                      setShowSearchInputs(prev => ({ ...prev, [index]: true }));
                    }}
                  >
                    {location.name?.split(',')[0] || `Location ${String.fromCharCode(65 + index)}`}
                  </div>
                )}
                {/* Remove button for locations after B */}
                {index > 1 && (
                  <button
                    className="mobile-remove-btn"
                    onClick={() => {
                      // Remove location and adjust transport modes
                      const newLocations = locations.filter((_, i) => i !== index);
                      // Remove the transport mode that leads TO this location
                      const newModes = [...legModes];
                      if (index - 1 < newModes.length) {
                        newModes.splice(index - 1, 1);
                      }
                      onLocationsChange(newLocations, 'REMOVE_LOCATION');
                      onLegModesChange(newModes);
                      
                      // Recalculate route if we still have enough locations
                      if (newLocations.filter(l => l).length >= 2) {
                        calculateRoute(newLocations, newModes);
                      }
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Transport mode selector between segments */}
              {index < locations.length - 1 && (
                <div className="mobile-segment-transport">
                  {Object.entries(TRANSPORTATION_MODES).map(([mode, config]) => (
                    <button
                      key={mode}
                      className={`mobile-transport-btn ${legModes[index] === mode ? 'active' : ''}`}
                      onClick={() => {
                        const newModes = [...legModes];
                        newModes[index] = mode;
                        onLegModesChange(newModes);
                        if (locations.filter(l => l).length >= 2) {
                          calculateRoute(locations, newModes);
                        }
                      }}
                      title={mode}
                    >
                      {config.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Add next location button */}
          <button
            className="mobile-add-waypoint-btn"
            onClick={() => {
              // Add a new location at the end (like desktop)
              const newLocations = [...locations, null];
              const newModes = [...legModes, 'walk'];
              onLocationsChange(newLocations, 'ADD_DESTINATION');
              onLegModesChange(newModes);
            }}
          >
            + Add Next Location ({String.fromCharCode(65 + locations.length)})
          </button>
        </div>


        {/* Action Buttons */}
        <div className="mobile-actions">
          <button 
            className="mobile-action-btn secondary"
            onClick={() => onUndo && onUndo()}
            disabled={!canUndo}
            style={{ height: '44px', fontSize: '20px' }}
            title="Undo"
          >
            ↩️
          </button>
          <button 
            className="mobile-action-btn secondary"
            onClick={handleClear}
            disabled={!canUndo && locations.filter(l => l).length === 0}
            style={{ height: '44px', fontSize: '20px' }}
            title="Clear All"
          >
            🔄
          </button>
          <button 
            className="mobile-action-btn primary"
            onClick={() => {
              if (directionsRoute) {
                // Just trigger the animator - it will handle everything
                if (onShowAnimator) {
                  onShowAnimator();
                }
              } else {
                calculateRoute(locations, legModes);
              }
            }}
            disabled={locations.filter(l => l).length < 2}
            title={directionsRoute ? "Animate Route" : "Calculate Route"}
            style={{ height: '44px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c .55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="mobile-controls-container">
      {/* Single Modal Card */}
      <div 
        ref={cardRef}
        className={`mobile-card ${!showCard ? 'collapsed' : ''}`}
        style={{
          transform: `translateY(${cardTranslateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s ease-in-out'
        }}
      >
        {/* Draggable handle for repositioning */}
        <div 
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={isDragging ? handleDragMove : undefined}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80px',
            height: '35px',
            cursor: isDragging ? 'grabbing' : 'grab',
            zIndex: 2,
            touchAction: 'none'
          }}
          aria-label="Drag to reposition"
        />
        {/* Minimize button at top right */}
        <button
          onClick={() => {
            // Slide card off screen then hide
            const viewportHeight = window.innerHeight;
            const cardDefaultTop = viewportHeight * 0.6;
            const slideDistance = viewportHeight - cardDefaultTop;
            setCardTranslateY(slideDistance);
            setTimeout(() => {
              setShowCard(false);
            }, 400);
          }}
          style={{
            position: 'absolute',
            top: '3px',
            right: '12px',
            width: '24px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: 0
          }}
          aria-label="Minimize"
        >
          −
        </button>
        {viewMode === 'animator' ? renderAnimator() : renderPlanner()}
      </div>

      {/* FAB when card is hidden - only show if not in animator mode */}
      {!showCard && viewMode !== 'animator' && (
        <div className="mobile-fab-container">
          <button 
            className="unified-icon primary"
            onClick={() => setShowCard(true)}
            aria-label="Plan Route"
            style={{ position: 'fixed', left: '20px', bottom: '20px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M9 9l6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileControls;
