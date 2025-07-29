// API Configuration and Limits
// These can be adjusted based on your budget and Google Cloud billing settings

const API_CONFIG = {
  // Daily limits based on approximate budget
  // Assuming $20/day budget with current pricing
  limits: {
    directions: {
      daily: 2500,      // ~$12.50-$25 depending on complexity
      perMinute: 300,   // Conservative to avoid rate limit errors
      perSecond: 10     // Smooth out requests
    },
    places: {
      daily: 500,       // ~$8.50-$16 depending on fields
      perMinute: 300,
      perSecond: 10
    },
    geocoding: {
      daily: 5000,      // ~$10
      perMinute: 3000,  // Google's limit
      perSecond: 50
    },
    mapLoads: {
      daily: 2000,      // ~$14 for map loads
      perMinute: 1000,
      perSecond: 50
    }
  },

  // Warning thresholds (percentage)
  warnings: {
    soft: 0.7,    // Show warning at 70%
    hard: 0.9     // Show strong warning at 90%
  },

  // Feature flags for rate limiting
  features: {
    enableRateLimiting: true,
    enableUsageTracking: true,
    showUsageIndicator: true,
    blockOnLimitReached: true,
    enableQueueing: false  // For future implementation
  },

  // User tiers (for future implementation)
  tiers: {
    free: {
      multiplier: 1,
      dailyMapLoads: 500,
      dailyDirections: 100,
      dailyPlaces: 50
    },
    basic: {
      multiplier: 5,
      dailyMapLoads: 2500,
      dailyDirections: 500,
      dailyPlaces: 250
    },
    pro: {
      multiplier: 20,
      dailyMapLoads: 10000,
      dailyDirections: 2000,
      dailyPlaces: 1000
    }
  }
};

// Get limits based on user tier (default to free)
export const getLimitsForTier = (tier = 'free') => {
  const tierConfig = API_CONFIG.tiers[tier] || API_CONFIG.tiers.free;
  return {
    directions: {
      daily: tierConfig.dailyDirections,
      perMinute: Math.min(300, tierConfig.dailyDirections / 10),
      perSecond: 10
    },
    places: {
      daily: tierConfig.dailyPlaces,
      perMinute: Math.min(300, tierConfig.dailyPlaces / 10),
      perSecond: 10
    },
    geocoding: {
      daily: tierConfig.dailyPlaces * 2, // Geocoding is cheaper, allow more
      perMinute: Math.min(300, tierConfig.dailyPlaces * 2 / 10),
      perSecond: 10
    },
    mapLoads: {
      daily: tierConfig.dailyMapLoads,
      perMinute: Math.min(1000, tierConfig.dailyMapLoads / 10),
      perSecond: 50
    }
  };
};

export default API_CONFIG;