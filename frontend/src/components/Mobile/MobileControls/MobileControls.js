import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationSearch from '../../Shared/LocationSearch';
import DragHandle from '../../common/DragHandle';
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
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cardPosition, setCardPosition] = useState({ x: 8, y: window.innerHeight - 400 });
  const cardRef = useRef(null);
  
  // Switch view mode when animator is toggled
  useEffect(() => {
    if (showRouteAnimator) {
      setViewMode('animator');
    } else {
      setViewMode('planner');
    }
  }, [showRouteAnimator]);

  // Handle clicked location from map - ONLY when card is open and in planner mode
  useEffect(() => {
    if (clickedLocation && showCard && viewMode === 'planner') {
      const newLocations = [...locations];
      const emptyIndex = newLocations.findIndex(loc => !loc);
      
      if (emptyIndex !== -1) {
        newLocations[emptyIndex] = clickedLocation;
        onLocationsChange(newLocations, 'ADD_LOCATION');
        calculateRoute(newLocations, legModes);
      }
      
      if (onLocationUsed) {
        onLocationUsed();
      }
    }
  }, [clickedLocation]);

  const calculateRoute = (locs, modes) => {
    const filledLocations = locs.filter(loc => loc !== null);
    if (filledLocations.length >= 1 && onDirectionsCalculated) {
      if (filledLocations.length === 1) {
        const routeData = {
          origin: filledLocations[0],
          destination: null,
          waypoints: [],
          mode: modes[0] || 'walk',
          segments: [],
          allLocations: locs,
          allModes: modes,
          routeId: filledLocations.map(loc => `${loc.lat},${loc.lng}`).join('_') + '_' + modes.join('-')
        };
        onDirectionsCalculated(routeData);
      } else {
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
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setDragStart({
        x: clientX - cardPosition.x,
        y: clientY - cardPosition.y
      });
    }
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    
    // Keep card within viewport bounds
    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 320);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 240);
    
    setCardPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(20, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      // Add both touch and mouse listeners
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

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
      <div className="mobile-card-header">
        <DragHandle />
        <h4>Plan Your Route</h4>
        <div className="mobile-header-actions">
          <button 
            className="minimize-button" 
            onClick={() => setShowCard(false)}
            title="Minimize"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 9h8v1H4z"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="mobile-planner-content">
        <div className="mobile-segments-container">
          {/* Render all location segments */}
          {locations.map((location, index) => (
            <div key={index} className="mobile-segment">
              <div className="mobile-route-row">
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
                      onClick={() => setShowSearchInputs(prev => ({ ...prev, [index]: false }))}
                    >
                      ×
                    </button>
                  </div>
                ) : !location ? (
                  <input 
                    type="text"
                    placeholder={index === 0 ? "Tap map or search..." : "Tap map or search..."}
                    className="mobile-route-input"
                    onClick={() => setShowSearchInputs(prev => ({ ...prev, [index]: true }))}
                    readOnly
                  />
                ) : (
                  <div 
                    className="mobile-route-input filled"
                    onClick={() => setShowSearchInputs(prev => ({ ...prev, [index]: true }))}
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
        className={`mobile-card ${!showCard ? 'collapsed' : ''} ${isDragging ? 'dragging' : ''}`}
        style={showCard ? {
          position: 'fixed',
          left: `${cardPosition.x}px`,
          top: `${cardPosition.y}px`,
          transition: isDragging ? 'none' : undefined
        } : {}}
        onTouchStart={handleDragStart}
        onMouseDown={handleDragStart}
      >
        {viewMode === 'animator' ? renderAnimator() : renderPlanner()}
      </div>

      {/* FAB when card is hidden */}
      {!showCard && (
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