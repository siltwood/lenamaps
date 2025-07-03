import React from 'react';

const TripSidebar = ({ trips, selectedTrip, onTripSelect, onCreateTrip, onDeleteTrip, isCreating }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem',
          gap: '1rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Your Trips</h2>
          <button 
            onClick={onCreateTrip}
            disabled={isCreating}
            className="create-trip-btn-compact"
          >
            {isCreating ? '...' : '+'}
          </button>
        </div>
      </div>
      
      {trips.length === 0 ? (
        <p>No trips found. Create your first trip!</p>
      ) : (
        trips.map(trip => (
          <div 
            key={trip.id}
            className={`trip-card ${selectedTrip?.id === trip.id ? 'selected' : ''}`}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <h3 
                style={{ margin: 0, fontSize: '0.95rem', cursor: 'pointer', flex: 1 }}
                onClick={() => onTripSelect(trip)}
              >
                {trip.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px'
                }}>
                  📍 NYC
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${trip.name}"?`)) {
                      onDeleteTrip(trip.id);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '2px',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px'
                  }}
                  title="Delete trip"
                >
                  ×
                </button>
              </div>
            </div>
            <div 
              style={{ 
                display: 'flex', 
                gap: '0.25rem',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => onTripSelect(trip)}
            >
              {trip.segments.map((segment, index) => (
                <React.Fragment key={segment.id}>
                  <span style={{ 
                    fontSize: '1.1rem',
                    filter: `hue-rotate(${segment.color === '#22c55e' ? '120deg' : segment.color === '#3b82f6' ? '220deg' : '0deg'})`
                  }}>
                    {segment.icon}
                  </span>
                  {index < trip.segments.length - 1 && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: '#cbd5e1',
                      margin: '0 0.1rem'
                    }}>
                      →
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))
      )}

      {selectedTrip && (
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            color: '#1e293b', 
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            📍 {selectedTrip.name}
          </h3>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem' 
          }}>
            {selectedTrip.segments.map((segment, index) => (
              <div key={segment.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #f1f5f9'
              }}>
                <span style={{ 
                  fontSize: '1.2rem',
                  width: '24px',
                  textAlign: 'center'
                }}>
                  {segment.icon}
                </span>
                <span style={{ 
                  color: segment.color, 
                  fontWeight: '500',
                  fontSize: '0.9rem'
                }}>
                  {segment.mode.charAt(0).toUpperCase() + segment.mode.slice(1)}
                </span>
                {index === 0 && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    marginLeft: 'auto'
                  }}>
                    Start
                  </span>
                )}
                {index === selectedTrip.segments.length - 1 && index > 0 && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    marginLeft: 'auto'
                  }}>
                    End
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anime-style decorative image */}
      <div className="sidebar-image">
        <img 
          src="/anime-girl.png" 
          alt="Trip planning inspiration" 
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default TripSidebar; 