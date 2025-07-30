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
    return new Promise((resolve, reject) => {
      this.directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  async searchPlaces(request) {
    return new Promise((resolve, reject) => {
      this.placesService.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  async geocode(request) {
    return new Promise((resolve, reject) => {
      this.geocoder.geocode(request, (results, status) => {
        if (status === 'OK') {
          resolve(results);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }
}

export default new MapsApiWrapper();