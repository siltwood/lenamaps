# LenaMaps - Route Planning & Animation

A full-stack application for planning multi-modal transportation routes and watching them come to life with smooth animations. Create routes using different transportation modes (walk, bike, car, bus) and watch an animated playback of your journey with a marker that follows your path!

## Features

- 🗺️ **Google Maps integration** with professional-grade mapping
- 🔍 **City/location search** - Find any place worldwide
- 📍 **Click-to-add locations** - Build routes by clicking on the map
- 🚶🚴🚗🚌 **4 transportation modes** - Walk, Bike, Car, and Bus with mode-specific routing
- 🎨 **Color-coded route segments** with custom icons for each mode
- ↩️ **Undo functionality** - Undo your last action with Cmd/Ctrl+Z
- 🎬 **Route Animation Playback** - Watch your route animated with:
  - Play/Pause/Stop controls
  - Adjustable playback speed (0.5x to 20x)
  - Camera follows the animated marker
  - Transportation mode icons change during playback
  - Progress bar showing completion percentage
- 🎯 **Draggable UI panels** - Both route planner and animator can be moved around
- 🔄 **Dynamic route recalculation** - Change transportation modes and see instant updates
- 📱 **Responsive design** for desktop and mobile
- ⚡ **Real-time preview** while creating routes

## Technology Stack

### Backend
- Node.js
- Express.js
- CORS for cross-origin requests

### Frontend
- React 18
- Google Maps JavaScript API with React wrapper
- Google Places API for location search
- Google Directions API for smart routing
- Axios for API calls
- Modern CSS with responsive design

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm
- Google Maps API Key (see [API_KEY_SETUP.md](API_KEY_SETUP.md))

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd lenamaps
   ```

2. Install all dependencies (root, backend, and frontend):
   ```bash
   npm run install-all
   ```

3. **Set up Google Maps API** (Required):
   - Follow the detailed instructions in `GOOGLE_MAPS_SETUP.md`
   - Get your free API key from Google Cloud Console
   - Add it to `frontend/.env.local`

### Running the Application

1. Start both backend and frontend servers:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5001`
   - Frontend development server on `http://localhost:3000`

2. Open your browser and go to `http://localhost:3000`

### Alternative: Run servers separately

If you prefer to run the servers separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## Project Structure

```
lenamaps/
├── backend/
│   ├── server.js          # Express server with trip API
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── GoogleMap.js        # Google Maps component
│   │   │   ├── LocationSearch.js   # Location search with autocomplete
│   │   │   ├── TripCreator.js      # Trip creation modal
│   │   │   └── TripSidebar.js      # Trip list and details
│   │   ├── App.js         # Main application component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Global styles
│   ├── .env.local         # Google Maps API key (you create this)
│   └── package.json       # Frontend dependencies
├── package.json           # Root package with dev scripts
├── README.md
└── GOOGLE_MAPS_SETUP.md   # Google Maps API setup instructions
```

## 🎮 How to Use

### Creating a New Trip

1. **Click "Create Trip"** button in the sidebar
2. **Enter trip name** in the popup form
3. **Click on the map** to add waypoints in sequence
4. **Select transportation modes** for each segment between waypoints
5. **Save your trip** when finished

### Managing Trips

- **View trips** in the sidebar list
- **Select a trip** to view it on the map
- **Click markers and routes** for detailed information
- **Use the interactive map** to explore different areas

## 🚀 Available Transportation Modes

- 🚴‍♀️ **Bike** - Green (`#22c55e`)
- 🚌 **Bus** - Blue (`#3b82f6`) 
- 🚶‍♀️ **Walking** - Orange (`#f59e0b`)
- 🚗 **Car** - Red (`#ef4444`)
- 🚇 **Subway** - Purple (`#8b5cf6`)
- 🚆 **Train** - Cyan (`#06b6d4`)
- ✈️ **Flight** - Sky blue (`#0ea5e9`)
- 🛴 **Scooter** - Orange (`#f97316`)
- 🚕 **Uber/Taxi** - Black (`#000000`)

## API Endpoints

- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get specific trip by ID
- `POST /api/trips` - Create new trip
- `PUT /api/trips/:id` - Update existing trip
- `DELETE /api/trips/:id` - Delete trip
- `GET /api/transportation-modes` - Get available transportation modes

## Customization

### Adding New Transportation Modes

1. Edit the `transportationModes` object in `backend/server.js`
2. Add your mode with color, icon, and name
3. Restart the backend server
4. The frontend will automatically load the new modes

## Sample Data Structure

```json
{
  "id": 2,
  "name": "Your Trip Name",
  "segments": [
    {
      "id": 1,
      "mode": "bike",
      "coordinates": [[40.7589, -73.9851], [40.7505, -73.9934]],
      "color": "#22c55e",
      "icon": "🚴‍♀️"
    },
    {
      "id": 2,
      "mode": "subway",
      "coordinates": [[40.7505, -73.9934], [40.7614, -73.9776]],
      "color": "#8b5cf6", 
      "icon": "🚇"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## Future Enhancements

- [x] ✅ Interactive trip creation
- [x] ✅ Multiple transportation modes
- [x] ✅ Trip management (create, save, view)
- [ ] Trip editing and updating
- [ ] GPS tracking integration
- [ ] Trip statistics and analytics
- [ ] Export trip data (GPX, KML)
- [ ] User authentication and accounts
- [ ] Database integration (PostgreSQL, MongoDB)
- [ ] Real-time trip tracking
- [ ] Social sharing features
- [ ] Trip photos and notes

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License 