import React from 'react';
import LocationSearchCustom from './LocationSearchCustom';

const LocationSearch = ({ onLocationSelect, placeholder = "Search for a city or location..." }) => {
  // Always use custom implementation for simplicity and consistency
  return <LocationSearchCustom onLocationSelect={onLocationSelect} placeholder={placeholder} />;
};

export default LocationSearch;