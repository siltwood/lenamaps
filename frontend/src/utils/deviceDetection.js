import { useState, useEffect } from 'react';

// Comprehensive mobile detection
export const isMobileDevice = () => {
  // Primary check: viewport width (most reliable)
  if (window.innerWidth <= 768) {
    return true;
  }
  
  // Secondary check: user agent for actual mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
    return true;
  }
  
  // Tertiary check: touch + small screen (but not touch laptops)
  if (window.matchMedia && window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches) {
    return true;
  }
  
  return false;
};

// Hook for using mobile detection with React
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    // Listen for resize and orientation change
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    // Also listen for media query changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(max-width: 768px)");
      mediaQuery.addListener(checkMobile);
      
      return () => {
        window.removeEventListener('resize', checkMobile);
        window.removeEventListener('orientationchange', checkMobile);
        mediaQuery.removeListener(checkMobile);
      };
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  return isMobile;
};
