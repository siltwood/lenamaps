// Transportation mode colors
export const TRANSPORTATION_COLORS = {
  walk: "#3b82f6",  // Blue
  bike: "#22c55e",  // Green
  bus: "#ef4444",   // Red
  car: "#f59e0b"    // Orange
};

// Transportation icons
export const TRANSPORT_ICONS = {
  walk: '🚶',
  bike: '🚴',
  car: '🚗',
  bus: '🚌'
};

// Default map center (NYC)
export const DEFAULT_CENTER = { lat: 40.7505, lng: -73.9934 };

// Map configuration
export const MAP_CONFIG = {
  zoom: 13,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false,
  styles: [
    {
      featureType: "transit",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit.station",
      elementType: "all",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit.station.bus",
      elementType: "all",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit.line",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    }
  ]
};