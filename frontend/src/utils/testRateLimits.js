// Utility to test rate limits without making actual API calls
export const simulateHighUsage = () => {
  const usage = {
    date: new Date().toISOString(),
    directions: { second: 0, minute: 0, day: 95 },
    places: { second: 0, minute: 0, day: 45 },
    geocoding: { second: 0, minute: 0, day: 4500 },
    mapLoads: { second: 0, minute: 0, day: 450 }
  };
  
  localStorage.setItem('apiUsage', JSON.stringify(usage));
  window.location.reload();
};

export const simulateMaxUsage = () => {
  const usage = {
    date: new Date().toISOString(),
    directions: { second: 0, minute: 0, day: 100 },
    places: { second: 0, minute: 0, day: 50 },
    geocoding: { second: 0, minute: 0, day: 5000 },
    mapLoads: { second: 0, minute: 0, day: 500 }
  };
  
  localStorage.setItem('apiUsage', JSON.stringify(usage));
  window.location.reload();
};

export const resetUsage = () => {
  localStorage.removeItem('apiUsage');
  window.location.reload();
};

// Add these to window for easy testing
if (typeof window !== 'undefined') {
  window.testRateLimits = {
    high: simulateHighUsage,
    max: simulateMaxUsage,
    reset: resetUsage
  };
  
  console.log('Rate limit testing enabled. Use:');
  console.log('- window.testRateLimits.high() to simulate 95% usage');
  console.log('- window.testRateLimits.max() to simulate 100% usage');
  console.log('- window.testRateLimits.reset() to reset usage');
}