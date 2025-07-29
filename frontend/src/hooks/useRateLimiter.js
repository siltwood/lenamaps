import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import rateLimiter from '../services/rateLimiter';

export const useRateLimiter = () => {
  const { user, userTier } = useAuth();

  useEffect(() => {
    // Update rate limiter when user or tier changes
    if (user) {
      rateLimiter.setUserTier(userTier, user.id);
    } else {
      rateLimiter.setUserTier('free', null);
    }
  }, [user, userTier]);

  return rateLimiter;
};