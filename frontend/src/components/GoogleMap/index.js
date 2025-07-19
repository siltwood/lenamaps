import React from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import MapComponent from './components/MapComponent';

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🗺️</div>
          <p>Loading Google Maps...</p>
        </div>
      );
    case Status.FAILURE:
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          color: '#ef4444',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <h3>Google Maps API Error</h3>
          <p>Please check your API key in <code>frontend/.env.local</code></p>
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            See <strong>GOOGLE_MAPS_SETUP.md</strong> for setup instructions
          </p>
        </div>
      );
    default:
      return null;
  }
};

const GoogleMap = (props) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  

  return (
    <Wrapper 
      apiKey={apiKey}
      render={render}
      libraries={['places', 'geometry', 'marker']}
      version="weekly"
    >
      <MapComponent {...props} />
    </Wrapper>
  );
};

export default GoogleMap;