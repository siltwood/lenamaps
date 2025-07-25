import React, { useState, useEffect } from 'react';
import mapsApiWrapper from '../../services/mapsApiWrapper';
import './ApiUsageIndicator.css';

const ApiUsageIndicator = () => {
  const [usage, setUsage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateUsage = () => {
      setUsage(mapsApiWrapper.getUsageStats());
    };

    updateUsage();
    const interval = setInterval(updateUsage, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!usage) return null;

  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'safe';
  };

  const totalUsagePercentage = Object.values(usage).reduce((sum, api) => 
    sum + api.daily.percentage, 0) / Object.keys(usage).length;

  return (
    <div className="api-usage-indicator">
      <button 
        className={`usage-toggle ${getColorClass(totalUsagePercentage)}`}
        onClick={() => setShowDetails(!showDetails)}
        title="API Usage"
      >
        <span className="usage-icon">📊</span>
        <span className="usage-percent">{Math.round(totalUsagePercentage)}%</span>
      </button>
      
      {showDetails && (
        <div className="usage-details">
          <h4>API Usage Today</h4>
          {Object.entries(usage).map(([apiType, data]) => (
            <div key={apiType} className="usage-item">
              <div className="usage-label">
                {apiType.charAt(0).toUpperCase() + apiType.slice(1)}
              </div>
              <div className="usage-bar">
                <div 
                  className={`usage-fill ${getColorClass(data.daily.percentage)}`}
                  style={{ width: `${Math.min(100, data.daily.percentage)}%` }}
                />
              </div>
              <div className="usage-text">
                {data.daily.used} / {data.daily.limit}
              </div>
            </div>
          ))}
          <div className="usage-note">
            Limits reset at midnight. Consider upgrading if you frequently hit limits.
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiUsageIndicator;