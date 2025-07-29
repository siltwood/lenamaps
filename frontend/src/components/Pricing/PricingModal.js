import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import './PricingModal.css';

const PricingModal = ({ isOpen, onClose }) => {
  const { user, userTier, updateUserTier } = useAuth();
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      description: 'Perfect for trying out LeNa Maps',
      features: [
        '500 map loads per day',
        '100 route calculations',
        '50 place searches',
        'Basic route animation',
        'Community support'
      ],
      limitations: [
        'No video export',
        'No route saving',
        'Limited API calls'
      ],
      color: '#CD7F32'
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      description: 'Great for regular users',
      features: [
        '2,500 map loads per day',
        '500 route calculations',
        '250 place searches',
        'HD video export (720p)',
        'Save up to 50 routes',
        'Email support'
      ],
      limitations: [
        'No 4K video export',
        'No API access'
      ],
      color: '#C0C0C0',
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29.99,
      description: 'For power users and businesses',
      features: [
        '10,000 map loads per day',
        '2,000 route calculations',
        '1,000 place searches',
        '4K video export',
        'Unlimited route saving',
        'API access',
        'Priority support',
        'Custom branding'
      ],
      limitations: [],
      color: '#FFD700'
    }
  ];

  const handleSelectPlan = async (planId) => {
    if (!user) {
      alert('Please sign in to upgrade your plan');
      return;
    }

    if (planId === userTier) {
      return; // Already on this plan
    }

    setLoading(true);
    
    try {
      if (planId === 'free') {
        // Downgrade to free
        await updateUserTier('free');
        alert('Downgraded to free plan');
      } else {
        // For now, just update the tier locally
        // In production, this would integrate with Stripe
        await updateUserTier(planId);
        alert(`Upgraded to ${planId} plan! (This is a demo - no payment required)`);
      }
      onClose();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`pricing-modal-wrapper ${isOpen ? 'open' : ''}`}>
      <div className="pricing-modal-backdrop" onClick={onClose} />
      <div className="pricing-modal">
        <button className="pricing-modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="pricing-header">
          <h2>Choose Your Plan</h2>
          <p>Unlock more features and higher API limits</p>
        </div>

        <div className="pricing-grid">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className={`pricing-card ${plan.popular ? 'popular' : ''} ${userTier === plan.id ? 'current' : ''}`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              
              <div className="plan-header">
                <h3 style={{ color: plan.color }}>{plan.name}</h3>
                <div className="plan-price">
                  {plan.price === 0 ? (
                    <span className="amount">Free</span>
                  ) : (
                    <>
                      <span className="currency">$</span>
                      <span className="amount">{plan.price}</span>
                      <span className="period">/month</span>
                    </>
                  )}
                </div>
                <p className="plan-description">{plan.description}</p>
              </div>

              <div className="plan-features">
                <h4>Features</h4>
                <ul>
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <FontAwesomeIcon icon={faCheck} className="feature-icon" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {plan.limitations.length > 0 && (
                  <>
                    <h4>Limitations</h4>
                    <ul className="limitations">
                      {plan.limitations.map((limitation, i) => (
                        <li key={i}>
                          <FontAwesomeIcon icon={faTimes} className="limitation-icon" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <button
                className={`plan-button ${userTier === plan.id ? 'current' : ''}`}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading || userTier === plan.id}
              >
                {userTier === plan.id ? 'Current Plan' : 
                 userTier === 'pro' && plan.id !== 'pro' ? 'Downgrade' :
                 'Select Plan'}
              </button>
            </div>
          ))}
        </div>

        <div className="pricing-footer">
          <p>All plans include automatic usage tracking and rate limiting to prevent unexpected charges.</p>
          <p>Cancel or change your plan anytime. No hidden fees.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;