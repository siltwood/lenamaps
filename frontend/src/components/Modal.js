import React, { useState, useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'Delete', cancelText = 'Cancel' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure CSS is loaded before showing
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return { borderColor: '#ef4444', iconColor: '#ef4444', icon: '❌' };
      case 'success':
        return { borderColor: '#22c55e', iconColor: '#22c55e', icon: '✅' };
      case 'warning':
        return { borderColor: '#f59e0b', iconColor: '#f59e0b', icon: '⚠️' };
      default:
        return { borderColor: '#3b82f6', iconColor: '#3b82f6', icon: 'ℹ️' };
    }
  };

  const { borderColor, iconColor, icon } = getTypeStyles();

  return (
    <div className={`modal-overlay ${isVisible ? 'visible' : ''}`} onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        <div className="modal-header">
          <span style={{ color: iconColor, fontSize: '1.5rem' }}>{icon}</span>
          {title && <h3>{title}</h3>}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {type === 'warning' && onConfirm ? (
            <>
              <button className="modal-button modal-button-cancel" onClick={onClose}>
                {cancelText}
              </button>
              <button className="modal-button modal-button-confirm" onClick={() => {
                onConfirm();
                onClose();
              }}>
                {confirmText}
              </button>
            </>
          ) : (
            <button className="modal-button" onClick={onClose}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;