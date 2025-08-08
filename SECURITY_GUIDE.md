# Google Maps API Security Guide

## Current Setup
Your app uses the Google Maps JavaScript API, which **must** be loaded client-side. This is normal and expected - the key will be visible in the browser, but you can secure it with restrictions.

## Steps to Secure Your API Key

### 1. Create Separate Keys for Development and Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create two API keys:
   - **Development Key**: For local development
   - **Production Key**: For your deployed site

### 2. Restrict Your Development Key

Click on your development key and add these restrictions:

**Application Restrictions:**
- Select "HTTP referrers (websites)"
- Add these referrers:
  - `http://localhost:3000/*`
  - `http://localhost:5000/*`
  - `http://127.0.0.1:3000/*`

**API Restrictions:**
- Select "Restrict key"
- Enable only these APIs:
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Directions API

### 3. Restrict Your Production Key

Click on your production key and add:

**Application Restrictions:**
- Select "HTTP referrers (websites)"
- Add your production domains:
  - `https://yourdomain.com/*`
  - `https://www.yourdomain.com/*`
  - `https://your-app.herokuapp.com/*` (if using Heroku)

**API Restrictions:**
- Same as development (Maps, Places, Geocoding, Directions)

### 4. Set Up Environment Variables

**For Development (.env):**
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_development_key_here
```

**For Production (Heroku):**
```bash
heroku config:set REACT_APP_GOOGLE_MAPS_API_KEY=your_production_key_here
```

### 5. Add Quotas and Alerts

In Google Cloud Console:
1. Go to APIs & Services → Credentials
2. Click on your API key
3. Set up quotas:
   - Set daily request limits
   - Set per-user rate limits
4. Set up billing alerts to notify you of unusual usage

## Why This is Secure

1. **Domain Restrictions**: Even if someone sees your key, they can only use it from your allowed domains
2. **API Restrictions**: The key only works for specific Google Maps APIs
3. **Quotas**: Limits potential damage from abuse
4. **Separate Keys**: Production key never appears in development

## Important Notes

- The Maps JavaScript API key **will always be visible** in the browser - this is by design
- Security comes from restrictions, not hiding the key
- Never commit your production key to Git (use environment variables)
- Regularly rotate your keys (every 90 days recommended)

## Monitor Usage

Check your API usage regularly:
1. Go to Google Cloud Console
2. Navigate to APIs & Services → Metrics
3. Look for unusual spikes or patterns
4. Set up alerts for quota usage

## If Your Key is Compromised

1. Immediately regenerate the key in Google Cloud Console
2. Update your environment variables
3. Redeploy your application
4. Review API usage logs for unauthorized access