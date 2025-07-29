import rateLimiter from './rateLimiter';

class MapsApiWrapper {
  constructor() {
    this.directionsService = null;
    this.placesService = null;
    this.geocoder = null;
  }

  initialize(map) {
    if (window.google) {
      this.directionsService = new window.google.maps.DirectionsService();
      this.placesService = new window.google.maps.places.PlacesService(map);
      this.geocoder = new window.google.maps.Geocoder();
    }
  }

  async getDirections(request) {
    try {
      return await rateLimiter.executeWithRateLimit('directions', async () => {
        return new Promise((resolve, reject) => {
          this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          });
        });
      });
    } catch (error) {
      if (error.type === 'DAILY_LIMIT_REACHED') {
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('rateLimitExceeded', { 
          detail: error.details 
        }));
      }
      throw error;
    }
  }

  async searchPlaces(request) {
    try {
      return await rateLimiter.executeWithRateLimit('places', async () => {
        return new Promise((resolve, reject) => {
          this.placesService.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              resolve(results);
            } else {
              reject(new Error(`Places search failed: ${status}`));
            }
          });
        });
      });
    } catch (error) {
      if (error.type === 'DAILY_LIMIT_REACHED') {
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('rateLimitExceeded', { 
          detail: error.details 
        }));
      }
      throw error;
    }
  }

  async geocode(request) {
    try {
      return await rateLimiter.executeWithRateLimit('geocoding', async () => {
        return new Promise((resolve, reject) => {
          this.geocoder.geocode(request, (results, status) => {
            if (status === 'OK') {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });
      });
    } catch (error) {
      if (error.type === 'DAILY_LIMIT_REACHED') {
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('rateLimitExceeded', { 
          detail: error.details 
        }));
      }
      throw error;
    }
  }

  // Get current usage statistics
  getUsageStats() {
    return rateLimiter.getUsageStats();
  }

  // Check if we're approaching limits
  isApproachingLimit(apiType, threshold = 0.8) {
    const stats = this.getUsageStats();
    const usage = stats[apiType];
    return usage.daily.percentage >= (threshold * 100);
  }
}

export default new MapsApiWrapper();