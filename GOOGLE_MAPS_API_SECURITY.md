# Google Maps API Security Guide

## ⚠️ IMPORTANT: Protect Your API Key

Your Google Maps API key is exposed in the frontend. Without proper restrictions, anyone could use it and rack up charges on your account.

## Setting Up API Key Restrictions

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/apis/credentials
- Select your project
- Click on your API key

### 2. Set Application Restrictions
Choose "Website restrictions" and add your allowed domains:
- `http://localhost:3000/*` (for development)
- `https://yourdomain.com/*` (for production)
- `https://www.yourdomain.com/*` (if using www)

### 3. Set API Restrictions
Under "API restrictions", select "Restrict key" and check only these APIs:
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API

### 4. Set Quotas (HIGHLY RECOMMENDED)
Go to each API's quota page and set daily limits:

#### Directions API
- Quota: 2,500 requests per day
- Cost: ~$5-25/day depending on complexity

#### Places API  
- Quota: 1,000 requests per day
- Cost: ~$17/day for Autocomplete

#### Geocoding API
- Quota: 2,500 requests per day
- Cost: ~$5/day

#### Maps JavaScript API
- Quota: 25,000 map loads per day
- Cost: First 28,000 loads free per month

### 5. Set Budget Alerts
1. Go to Billing → Budgets & alerts
2. Create a budget (e.g., $50/month)
3. Set alerts at 50%, 90%, and 100%

### 6. Monitor Usage
- Check daily: https://console.cloud.google.com/apis/dashboard
- Enable email alerts for unusual activity

## Alternative: Use a Backend Proxy (More Secure)

If your app becomes popular, consider:
1. Move API key to a backend server
2. Frontend calls your backend
3. Backend calls Google Maps with the key
4. This way, the key is never exposed

## Emergency: If Your Key Is Compromised

1. Immediately regenerate the key in Google Cloud Console
2. Update your `.env.local` file
3. Check your billing for unauthorized usage
4. Contact Google Cloud Support if needed