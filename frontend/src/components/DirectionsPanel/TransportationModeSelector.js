import React from 'react';

const TransportationModeSelector = ({ 
  fromLabel, 
  toLabel, 
  modes, 
  selectedMode, 
  transportationModes, 
  onModeChange 
}) => {
  return (
    <div className="leg-mode-selector">
      <label>{fromLabel} → {toLabel} Transportation:</label>
      <div className="mode-buttons compact">
        {Object.entries(transportationModes).map(([mode, config]) => (
          <button
            key={mode}
            className={`mode-button compact ${selectedMode === mode ? 'active' : ''}`}
            onClick={() => onModeChange(mode)}
            style={{
              backgroundColor: selectedMode === mode ? config.color : 'transparent',
              borderColor: config.color,
              color: selectedMode === mode ? 'white' : config.color
            }}
          >
            <span className="mode-icon">{config.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TransportationModeSelector;