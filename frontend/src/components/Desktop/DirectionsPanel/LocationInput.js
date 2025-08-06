import React from 'react';
import LocationSearch from '../LocationSearch';

const LocationInput = ({ 
  index, 
  location, 
  label,
  isNextEmpty,
  onLocationUpdate,
  onLocationRemove,
  canRemove
}) => {
  return (
    <div>
      <div className={`input-group ${!location && isNextEmpty ? 'awaiting-click' : ''}`}>
        <label>
          Location {label}
          {!location && isNextEmpty && (
            <span className="click-hint"> (or click on map)</span>
          )}
        </label>
        {!location ? (
          <LocationSearch 
            onLocationSelect={(loc) => onLocationUpdate(index, loc)}
            placeholder={`Enter location ${label}...`}
          />
        ) : (
          <div className="selected-location">
            📍 {location.name || location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
            <button 
              onClick={() => onLocationUpdate(index, null)}
              className="clear-location-btn"
              aria-label={`Clear location ${label}`}
            >
              ✕
            </button>
          </div>
        )}
      </div>
      
      {canRemove && (
        <button 
          className="remove-location-btn"
          onClick={() => onLocationRemove(index)}
          aria-label={`Remove location ${label}`}
        >
          Remove {label}
        </button>
      )}
    </div>
  );
};

export default LocationInput;