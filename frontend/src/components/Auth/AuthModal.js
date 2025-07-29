import React, { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';
import Modal from '../RouteAnimator/Modal';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const [view, setView] = useState('sign_in');

  return (
    <div className={`auth-modal-wrapper ${isOpen ? 'open' : ''}`}>
      <div className="auth-modal-backdrop" onClick={onClose} />
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="auth-modal-header">
          <h2>Welcome to LeNa Maps</h2>
          <p>Create an account to get 5x more API calls per day</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4285F4',
                  brandAccent: '#1967d2',
                }
              }
            },
            style: {
              button: {
                borderRadius: '8px',
                fontSize: '14px',
                padding: '10px 16px',
              },
              input: {
                borderRadius: '8px',
                fontSize: '14px',
                padding: '10px 12px',
              },
              label: {
                fontSize: '13px',
                marginBottom: '4px',
              },
              message: {
                fontSize: '13px',
                borderRadius: '8px',
                padding: '12px',
              },
            }
          }}
          providers={['google', 'github']}
          redirectTo={window.location.origin}
          onlyThirdPartyProviders={false}
          view={view}
        />

        <div className="auth-benefits">
          <h3>Free account includes:</h3>
          <ul>
            <li>🚀 5x more daily API calls (500 routes/day)</li>
            <li>📊 Usage tracking across sessions</li>
            <li>💾 Save your favorite routes</li>
          </ul>
          <p style="marginTop: '12px', fontSize: '13px', color: '#666'">No credit card required</p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;