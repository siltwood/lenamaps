import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/supabase';
import AuthModal from '../Auth/AuthModal';
import './UserMenu.css';

const UserMenu = () => {
  const { user, userTier, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'pro': return '#FFD700';
      case 'basic': return '#C0C0C0';
      default: return '#CD7F32';
    }
  };

  if (loading) {
    return <div className="user-menu-skeleton" />;
  }

  return (
    <>
      <div className="user-menu">
        {user ? (
          <div className="user-menu-wrapper">
            <button 
              className="user-menu-button"
              onClick={() => setShowMenu(!showMenu)}
            >
              <div className="user-avatar">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="user-tier" style={{ color: getTierColor(userTier) }}>
                {userTier.toUpperCase()}
              </span>
            </button>
            
            {showMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="user-email">{user.email}</div>
                  <div className="user-tier-badge">
                    {userTier} tier
                  </div>
                </div>
                
                <div className="user-menu-items">
                  <button className="user-menu-item">
                    📊 Usage Dashboard
                  </button>
                  <button className="user-menu-item">
                    💳 Manage Subscription
                  </button>
                  <button className="user-menu-item">
                    💾 Saved Routes
                  </button>
                  <button className="user-menu-item">
                    ⚙️ Settings
                  </button>
                  <hr className="user-menu-divider" />
                  <button 
                    className="user-menu-item logout"
                    onClick={handleSignOut}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="sign-in-button"
            onClick={() => setShowAuthModal(true)}
          >
            Sign In
          </button>
        )}
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default UserMenu;