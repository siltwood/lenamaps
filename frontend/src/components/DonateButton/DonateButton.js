import React, { useState } from 'react';
import './DonateButton.css';

const DonateButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  // You can replace this with your actual donation link
  // Options: Buy Me a Coffee, Ko-fi, Patreon, PayPal, etc.
  const DONATION_URL = 'https://www.buymeacoffee.com/yourusername';

  const handleDonateClick = () => {
    window.open(DONATION_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="donate-button-container">
      <button 
        className="donate-button"
        onClick={handleDonateClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="donate-icon">☕</span>
        <span className="donate-text">Support</span>
      </button>
      
      {showTooltip && (
        <div className="donate-tooltip">
          Help keep LenaMaps free by buying me a coffee!
        </div>
      )}
    </div>
  );
};

export default DonateButton;