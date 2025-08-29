// Animation constants for RouteAnimator

export const ANIMATION_ZOOM = {
  FOLLOW_MODE_SHORT: 12,   // Zoom for short routes (<50km)
  FOLLOW_MODE_MEDIUM: 11,  // Zoom for medium routes (50-500km)  
  FOLLOW_MODE_LONG: 10,    // Zoom for long routes (>500km)
  DEFAULT: 13,             // Default zoom level
};

export const ANIMATION_PADDING = {
  WHOLE_ROUTE: { top: 100, right: 100, bottom: 100, left: 100 }, // Padding for whole route view
};

// Speed settings (meters per second base speeds)
export const ANIMATION_SPEEDS = {
  WHOLE_ROUTE: {
    CROSS_CONTINENTAL: 20000,  // >2000km routes
    CROSS_COUNTRY: 10000,      // >1000km routes  
    LONG_INTERSTATE: 5000,     // >500km routes
    REGIONAL: 2000,             // >100km routes
    MEDIUM: 800,                // >50km routes
    SHORT: 400,                 // >10km routes
    VERY_SHORT: 150             // <10km routes
  },
  FOLLOW_MODE: {
    VERY_LONG: 500,             // >1000km routes
    LONG: 200,                  // >100km routes
    MEDIUM: 100,                // >10km routes
    SHORT: 60                   // <10km routes
  }
};

// Distance thresholds (km)
export const DISTANCE_THRESHOLDS = {
  CROSS_CONTINENTAL: 2000,
  CROSS_COUNTRY: 1000,
  LONG_INTERSTATE: 500,
  REGIONAL: 100,
  MEDIUM: 50,
  SHORT: 10
};

// Playback speed multipliers
export const PLAYBACK_MULTIPLIERS = {
  SLOW: 0.5,
  MEDIUM: 1.0,
  FAST: 2.0
};

// Animation frame settings
export const ANIMATION_TIMING = {
  UPDATE_INTERVAL_MS: 50,     // Animation update interval
  SYMBOL_UPDATE_MS: 200,       // Symbol position update interval
  MODE_SWITCH_DELAY_MS: 100,   // Delay when switching modes
};

// Marker scale settings
export const MARKER_SCALE = {
  BASE_ZOOM: 13,
  MAX_SCALE: 1.2,
  MIN_SCALE: 0.5,
};