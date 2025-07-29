import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppContent from './components/AppContent';
import './App.css';

// Import test utilities in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/testRateLimits');
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;