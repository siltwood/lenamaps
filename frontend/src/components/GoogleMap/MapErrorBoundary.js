import React from 'react';
import './MapErrorBoundary.css';

const MapErrorBoundary = ({ error, onRetry }) => {
  // Determine error type and message
  const getErrorDetails = () => {
    if (!error) {
      return {
        title: 'Maps Loading Issue',
        message: 'The map is taking longer than expected to load.',
        icon: '🗺️'
      };
    }

    const errorString = error.toString().toLowerCase();
    
    if (errorString.includes('quota') || errorString.includes('limit exceeded')) {
      return {
        title: 'API Quota Exceeded',
        message: 'The Google Maps API daily quota has been reached. Please try again tomorrow or contact the site owner.',
        icon: '📊'
      };
    }
    
    if (errorString.includes('api key') || errorString.includes('invalid key')) {
      return {
        title: 'API Key Issue',
        message: 'There\'s a problem with the Google Maps API configuration. Please contact the site owner.',
        icon: '🔑'
      };
    }
    
    if (errorString.includes('billing') || errorString.includes('payment')) {
      return {
        title: 'Billing Issue',
        message: 'The Google Maps API billing needs attention. Please contact the site owner.',
        icon: '💳'
      };
    }
    
    if (errorString.includes('network') || errorString.includes('connection')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to Google Maps. Please check your internet connection.',
        icon: '🌐'
      };
    }
    
    return {
      title: 'Maps Unavailable',
      message: 'Google Maps is temporarily unavailable. Please try again in a few moments.',
      icon: '⚠️'
    };
  };

  const { title, message, icon } = getErrorDetails();

  return (
    <div className="map-error-boundary">
      <div className="error-container">
        <div className="error-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{message}</p>
        
        {error && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <code>{error.toString()}</code>
          </details>
        )}
        
        <div className="error-actions">
          <button onClick={onRetry} className="retry-button">
            🔄 Try Again
          </button>
          <a 
            href="https://console.cloud.google.com/google/maps-apis/overview" 
            target="_blank" 
            rel="noopener noreferrer"
            className="console-link"
          >
            Open Google Console →
          </a>
        </div>
        
        <div className="error-tips">
          <h4>Common Solutions:</h4>
          <ul>
            <li>Check API quotas in Google Cloud Console</li>
            <li>Verify billing account is active</li>
            <li>Ensure API key has proper restrictions</li>
            <li>Wait for daily quota reset (midnight PST)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MapErrorBoundary;