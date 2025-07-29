import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LimitReachedModal.css';

const LimitReachedModal = ({ isOpen, onClose, limitDetails }) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="limit-modal-overlay">
      <div className="limit-modal">
        <div className="limit-modal-icon">
          <span>🚫</span>
        </div>
        
        <h2>Daily Limit Reached</h2>
        
        <p className="limit-modal-message">
          You've used up your free daily allowance for {limitDetails?.apiType || 'API'} requests.
        </p>
        
        <div className="limit-modal-stats">
          <div className="limit-stat">
            <span className="limit-stat-label">Used today</span>
            <span className="limit-stat-value">{limitDetails?.usage || 0}</span>
          </div>
          <div className="limit-stat">
            <span className="limit-stat-label">Daily limit</span>
            <span className="limit-stat-value">{limitDetails?.limit || 0}</span>
          </div>
        </div>

        {!user ? (
          <>
            <p className="limit-modal-upgrade">
              Sign up for a free account to get 5x more API calls per day, or upgrade to Pro for unlimited access.
            </p>
            
            <div className="limit-modal-actions">
              <button 
                className="limit-modal-btn limit-modal-btn-primary"
                onClick={() => {
                  onClose();
                  const event = new CustomEvent('openAuthModal');
                  window.dispatchEvent(event);
                }}
              >
                Sign Up Free
              </button>
              <button 
                className="limit-modal-btn limit-modal-btn-secondary"
                onClick={onClose}
              >
                Maybe Later
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="limit-modal-upgrade">
              Upgrade to a higher tier for more API calls and premium features.
            </p>
            
            <div className="limit-modal-actions">
              <button 
                className="limit-modal-btn limit-modal-btn-primary"
                onClick={() => {
                  onClose();
                  const event = new CustomEvent('openPricingModal');
                  window.dispatchEvent(event);
                }}
              >
                View Plans
              </button>
              <button 
                className="limit-modal-btn limit-modal-btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        )}
        
        <p className="limit-modal-reset">
          Your limits will reset at midnight (local time).
        </p>
      </div>
    </div>
  );
};

export default LimitReachedModal;