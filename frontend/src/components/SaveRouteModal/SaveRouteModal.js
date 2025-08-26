import React, { useState } from 'react';
import './SaveRouteModal.css';

function SaveRouteModal({ isOpen, onClose, onSave, defaultName }) {
  const [routeName, setRouteName] = useState(defaultName || '');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (routeName.trim()) {
      onSave({
        name: routeName.trim(),
        description: description.trim()
      });
      onClose();
      setRouteName('');
      setDescription('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="save-route-modal-overlay" onClick={onClose}>
      <div className="save-route-modal" onClick={(e) => e.stopPropagation()}>
        <div className="save-route-header">
          <h2>Save Route</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="save-route-content">
          <div className="input-group">
            <label htmlFor="route-name">Route Name *</label>
            <input
              id="route-name"
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Enter a name for this route"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="input-group">
            <label htmlFor="route-description">Description (optional)</label>
            <textarea
              id="route-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this route"
              rows="3"
            />
          </div>
        </div>

        <div className="save-route-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={!routeName.trim()}
          >
            Save Route
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveRouteModal;