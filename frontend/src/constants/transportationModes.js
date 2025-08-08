export const TRANSPORTATION_MODES = {
  walk: { color: '#3b82f6', icon: '🚶' },
  bike: { color: '#22c55e', icon: '🚴' },
  bus: { color: '#ef4444', icon: '🚌' },
  car: { color: '#f59e0b', icon: '🚗' }
};

export const TRANSPORTATION_COLORS = {
  walk: '#3b82f6',
  bike: '#22c55e',
  bus: '#ef4444',
  car: '#f59e0b'
};

export const TRANSPORT_ICONS = {
  walk: '🚶',
  bike: '🚴',
  car: '🚗',
  bus: '🚌'
};

export const DEFAULT_CENTER = { lat: 40.7505, lng: -73.9934 };

export const MAP_CONFIG = {
  zoom: 13,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false
};

export default TRANSPORTATION_MODES;
