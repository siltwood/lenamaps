# Google Maps API Key Setup

## Important Security Notice
**NEVER commit your actual API key to version control!**

## Setup Instructions

1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

2. Get your Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Directions API
   - Create credentials (API Key)
   - Restrict the key to your domains for production

3. Add your API key to `.env.local`:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

## Security Best Practices

- The `.env.local` file is already in `.gitignore` and will not be committed
- For production, use environment variables in your hosting platform
- Restrict your API key to specific domains/IPs in Google Cloud Console
- Set up quotas and budget alerts

## Troubleshooting

If you see "Google Maps API Error":
1. Check that your API key is correctly set in `.env.local`
2. Verify all required APIs are enabled in Google Cloud Console
3. Check for any API key restrictions that might be blocking requests