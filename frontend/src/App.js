import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppContent from './components/AppContent';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;