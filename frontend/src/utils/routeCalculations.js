export const calculateRouteData = (locations, legModes) => {
  const filledLocations = locations.filter(loc => loc !== null);
  
  if (filledLocations.length < 1) {
    return null;
  }
  
  if (filledLocations.length === 1) {
    // Single location - just show marker
    return {
      origin: filledLocations[0],
      destination: null,
      waypoints: [],
      mode: legModes[0] || 'walk',
      segments: [],
      allLocations: filledLocations,
      allModes: legModes
    };
  }
  
  // Multiple locations - create route
  const segments = [];
  for (let i = 0; i < filledLocations.length - 1; i++) {
    segments.push({
      mode: legModes[i] || 'walk',
      startIndex: i,
      endIndex: i + 1
    });
  }
  
  return {
    origin: filledLocations[0],
    destination: filledLocations[filledLocations.length - 1],
    waypoints: filledLocations.slice(1, -1),
    mode: legModes[0],
    segments,
    allLocations: filledLocations,
    allModes: legModes
  };
};

export const getLocationLabel = (index) => {
  return String.fromCharCode(65 + index); // A, B, C, D, etc.
};