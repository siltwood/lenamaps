import React, { useState, useEffect } from 'react';
import mapsApiWrapper from '../../services/mapsApiWrapper';
import { useAuth } from '../../contexts/AuthContext';
import './UsageWarning.css';

const UsageWarning = () => {
  const { user } = useAuth();
  const [warning, setWarning] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkUsage = () => {
      const stats = mapsApiWrapper.getUsageStats();
      
      // Calculate overall usage percentage
      const usagePercentages = Object.values(stats).map(api => api.daily.percentage);
      const maxUsage = Math.max(...usagePercentages);
      
      if (maxUsage >= 100 && !dismissed) {
        setWarning({
          level: 'blocked',
          message: "You've reached your daily API limit",
          percentage: 100
        });
      } else if (maxUsage >= 80 && !dismissed) {
        setWarning({
          level: 'critical',
          message: `You're at ${Math.round(maxUsage)}% of your daily limit`,
          percentage: maxUsage
        });
      } else if (maxUsage >= 60 && !dismissed) {
        setWarning({
          level: 'warning',
          message: `${Math.round(maxUsage)}% of daily limit used`,
          percentage: maxUsage
        });
      } else {
        setWarning(null);
      }
    };

    checkUsage();
    const interval = setInterval(checkUsage, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [dismissed]);

  if (!warning || dismissed) return null;

  return (
    <div className={`usage-warning usage-warning-${warning.level}`}>
      <div className="usage-warning-content">
        <span className="usage-warning-icon">
          {warning.level === 'blocked' ? '🚫' : '⚠️'}
        </span>
        <span className="usage-warning-message">{warning.message}</span>
        {!user && (
          <button 
            className="usage-warning-action"
            onClick={() => {
              // Trigger auth modal
              const event = new CustomEvent('openAuthModal');
              window.dispatchEvent(event);
            }}
          >
            Sign up for more
          </button>
        )}
        {warning.level !== 'blocked' && (
          <button 
            className="usage-warning-dismiss"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default UsageWarning;