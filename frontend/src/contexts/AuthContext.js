import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getCurrentUser, onAuthStateChange } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState('free');
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Check current user on mount
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user || null);
        fetchUserProfile(session?.user?.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserTier('free');
        setSubscription(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await getCurrentUser();
      setUser(user);
      if (user) {
        await fetchUserProfile(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*, subscriptions(*)')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (profile) {
        setUserTier(profile.tier || 'free');
        setSubscription(profile.subscriptions?.[0] || null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // If profile doesn't exist, create one
      if (error.code === 'PGRST116') {
        await createUserProfile(userId);
      }
    }
  };

  const createUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: userId,
            tier: 'free',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setUserTier('free');
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const updateUserTier = async (newTier) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ tier: newTier })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setUserTier(newTier);
    } catch (error) {
      console.error('Error updating user tier:', error);
    }
  };

  const value = {
    user,
    loading,
    userTier,
    subscription,
    updateUserTier,
    refreshProfile: () => fetchUserProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};