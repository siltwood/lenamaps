import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationSearch from '../../Shared/LocationSearch';
import DragHandle from '../../common/DragHandle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStop } from '@fortawesome/free-solid-svg-icons';
import TRANSPORTATION_MODES from '../../../constants/transportationModes';
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
  isAnimating,
  showRouteAnimator,
  map,
  onAnimationStateChange
}) => {
  const [showCard, setShowCard] = useState(true);
  const [showSearchA, setShowSearchA] = useState(false);
  const [showSearchB, setShowSearchB] = useState(false);
  const [viewMode, setViewMode] = useState('planner'); // 'planner' or 'animator'
  const [showSearchInputs, setShowSearchInputs] = useState({});
  
  // Animation state
  const [localIsAnimating, setLocalIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(3); // Default to Regular like desktop
  const [zoomLevel, setZoomLevel] = useState('medium');
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cardPosition, setCardPosition] = useState({ x: 8, y: window.innerHeight - 280 });
  const cardRef = useRef(null);
  
  // Switch to animator view when requested
  useEffect(() => {
    if (showRouteAnimator) {
      setViewMode('animator');
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

  const updateTransportMode = (mode) => {
    if (onLegModesChange) {
      const newModes = [...legModes];
      newModes[0] = mode;
      onLegModesChange(newModes, 'CHANGE_MODE');
      
      if (locations.filter(l => l).length >= 2) {
        calculateRoute(locations, newModes);
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

  // Animation controls
  const startAnimation = () => {
    if (!directionsRoute || !directionsRoute.allLocations || directionsRoute.allLocations.length < 2) {
      return;
    }
    // Trigger the actual RouteAnimator to show and start
    if (onShowAnimator) {
      onShowAnimator();
    }
    setLocalIsAnimating(true);
    setIsPaused(false);
    setShowCard(false); // Minimize when animation starts
  };

  const pauseAnimation = () => {
    setIsPaused(true);
  };

  const resumeAnimation = () => {
    setIsPaused(false);
  };

  const stopAnimation = () => {
    setLocalIsAnimating(false);
    setIsPaused(false);
    setAnimationProgress(0);
    if (onAnimationStateChange) {
      onAnimationStateChange(false);
    }
  };

  // Handle drag events
  const handleTouchStart = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - cardPosition.x,
        y: touch.clientY - cardPosition.y
      });
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    // Keep card within viewport bounds
    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 320);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 220);
    
    setCardPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(20, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  // Render animator view
  const renderAnimator = () => (
    <>
      <div className="mobile-card-header">
        <DragHandle />
        <h4>Route Animator</h4>
        <div className="mobile-header-actions">
          <button 
            className="mobile-header-btn"
            onClick={() => {
              setViewMode('planner');
              stopAnimation();
            }}
            title="Back to Route"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15 7H3.83l5.59-5.59L8 0 0 8l8 8 1.41-1.41L3.83 9H15V7z"/>
            </svg>
          </button>
          <button 
            className="mobile-header-btn minimize"
            onClick={() => setShowCard(false)}
            title="Minimize"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 9h8v1H4z"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="mobile-animator-controls">
        {/* Main Playback Controls */}
        <div className="mobile-playback-section">
          <div className="mobile-playback-btns">
            {!localIsAnimating ? (
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
                  <FontAwesomeIcon icon={faStop} /> Stop
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Timeline Scrubber */}
        <div className="mobile-timeline-section">
          <label className="mobile-section-label">Timeline</label>
          <div className="mobile-timeline-container">
            <div className="mobile-timeline-track">
              <div 
                className="mobile-timeline-fill" 
                style={{ width: `${animationProgress}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={animationProgress}
              onChange={(e) => {
                const newProgress = parseFloat(e.target.value);
                setAnimationProgress(newProgress);
                // TODO: Update actual animation position
              }}
              className="mobile-timeline-slider"
            />
          </div>
          <div className="mobile-timeline-labels">
            <span>0%</span>
            <span className="current">{Math.round(animationProgress)}%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Speed Control */}
        <div className="mobile-speed-section">
          <label className="mobile-section-label">Animation Speed</label>
          <div className="mobile-speed-group">
            {[
              { value: 1, label: 'Slow' },
              { value: 3, label: 'Regular' },
              { value: 6, label: 'Fast' }
            ].map(speed => (
              <label key={speed.value} className={`mobile-speed-option ${animationSpeed === speed.value ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="speed"
                  value={speed.value}
                  checked={animationSpeed === speed.value}
                  onChange={() => setAnimationSpeed(speed.value)}
                />
                <span>{speed.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Zoom Control - Compact Row */}
        <div className="mobile-zoom-section">
          <label className="mobile-section-label">View</label>
          <div className="mobile-zoom-group">
            {[
              { value: 'close', label: 'Close' },
              { value: 'medium', label: 'Medium' },
              { value: 'far', label: 'Full' }
            ].map(zoom => (
              <label key={zoom.value} className={`mobile-zoom-option ${zoomLevel === zoom.value ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="zoom"
                  value={zoom.value}
                  checked={zoomLevel === zoom.value}
                  onChange={() => setZoomLevel(zoom.value)}
                />
                <span>{zoom.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // Render planner view
  const renderPlanner = () => (
    <>
      <div className="mobile-card-header">
        <DragHandle />
        <h4>Plan Your Route</h4>
        <div className="mobile-header-actions">
          <button 
            className="mobile-header-btn minimize"
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
                {/* Remove button for waypoints */}
                {index > 1 && (
                  <button
                    className="mobile-remove-btn"
                    onClick={() => {
                      const newLocations = locations.filter((_, i) => i !== index);
                      const newModes = legModes.filter((_, i) => i !== index - 1);
                      onLocationsChange(newLocations);
                      onLegModesChange(newModes);
                      calculateRoute(newLocations, newModes);
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
          
          {/* Add waypoint button */}
          <button
            className="mobile-add-waypoint-btn"
            onClick={() => {
              const newLocations = [...locations];
              newLocations.splice(locations.length - 1, 0, null);
              const newModes = [...legModes, 'walk'];
              onLocationsChange(newLocations);
              onLegModesChange(newModes);
            }}
          >
            + Add waypoint
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mobile-actions">
          <button 
            className="mobile-action-btn secondary"
            onClick={() => onUndo && onUndo()}
            disabled={!canUndo}
            style={{ height: '44px' }}
            title="Undo"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
          </button>
          <button 
            className="mobile-action-btn secondary"
            onClick={handleClear}
            disabled={!canUndo && locations.filter(l => l).length === 0}
            style={{ height: '44px' }}
            title="Clear All"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>
          <button 
            className="mobile-action-btn primary"
            onClick={() => {
              if (directionsRoute) {
                setViewMode('animator');
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
        style={showCard && !isDragging ? {
          position: 'fixed',
          left: `${cardPosition.x}px`,
          bottom: `${window.innerHeight - cardPosition.y - 220}px`,
          transition: 'none'
        } : {}}
        onTouchStart={handleTouchStart}
      >
        {viewMode === 'animator' ? renderAnimator() : renderPlanner()}
      </div>

      {/* Single FAB that changes based on state */}
      {!showCard && (
        <div className="mobile-fab-container">
          <button 
            className={`unified-icon ${localIsAnimating ? 'animation' : 'primary'}`}
            onClick={() => setShowCard(true)}
            aria-label={localIsAnimating ? "Show Animation Controls" : "Plan Route"}
            style={{ position: 'fixed', left: '20px', bottom: '20px' }}
          >
            {localIsAnimating ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="18" r="3" />
                <path d="M9 9l6 6" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileControls;