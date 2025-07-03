# Google Maps API Setup Instructions

Your LenaMaps app now uses Google Maps with advanced features like snap-to-road, location search, and transportation-specific routing! Follow these steps to get your API key:

## 🚀 Quick Setup (5 minutes)

### 1. Get Google Maps API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable these APIs** (click "Enable" for each):
   - Maps JavaScript API
   - Places API
   - Directions API
   - Roads API (for snap-to-road)
4. **Create an API Key**:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy your API key

### 2. Add API Key to Your App

1. **Open the file**: `frontend/.env.local`
2. **Replace `your_google_maps_api_key_here`** with your actual API key:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBqT_your_actual_api_key_here
   ```
3. **Restart your development server**:
   ```bash
   npm run dev
   ```

## 🎯 New Google Maps Features

### ✅ **Snap-to-Road**
- Your waypoints automatically snap to actual roads
- Much more accurate than manual point placement

### 🔍 **City/Location Search** 
- Search bar in the header to find any city worldwide
- Autocomplete suggestions as you type
- Automatically centers map on searched location

### 🚴‍♀️ **Smart Transportation Routing**
- **Bike routes**: Uses actual bike lanes and cycling paths
- **Walking routes**: Pedestrian-friendly paths
- **Driving routes**: Optimal car routes with traffic data
- **Transit routes**: Public transportation with schedules

### 🗺️ **Enhanced Map Features**
- Street view integration
- Satellite/terrain view options
- Real traffic conditions
- Transit station markers

## 💰 Cost Information

- **Free tier**: 28,500 map loads per month
- **Places API**: 17,000 requests per month free
- **Directions API**: $5 per 1,000 requests after free quota
- Perfect for personal/development use!

## 🛠️ API Restrictions (Recommended)

For security, restrict your API key:

1. **Go to your API key** in Google Cloud Console
2. **Set Application Restrictions**:
   - HTTP referrers: `http://localhost:3000/*`
3. **Set API Restrictions**:
   - Only enable the 4 APIs listed above

## 🎉 Ready to Go!

Once you add your API key, you'll have:
- **Location search** to find any city
- **Snap-to-road** waypoint placement
- **Real bike lanes** and transportation routes
- **Professional-grade mapping** like Google Maps app

Your trips will now follow actual roads and bike paths instead of straight lines! Perfect for tracking real journeys with your girlfriend. 🚴‍♀️🗺️ 