import React from 'react';
import './DonateButton.css';

const DonateButton = () => {
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
      >
        <span className="donate-icon">☕</span>
        <span className="donate-text">Support</span>
      </button>
    </div>
  );
};

export default DonateButton;