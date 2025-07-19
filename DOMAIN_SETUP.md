# Domain Setup: GoDaddy → Cloudflare → Heroku

## Overview
This guide will help you set up your custom domain with GoDaddy, route it through Cloudflare for CDN/SSL, and point it to your Heroku app.

## Step 1: Heroku Setup

1. Add your custom domain to Heroku:
   ```bash
   heroku domains:add yourdomain.com -a lenamaps
   heroku domains:add www.yourdomain.com -a lenamaps
   ```

2. Note the DNS target that Heroku provides (something like `hidden-sierra-12345.herokudns.com`)

## Step 2: Cloudflare Setup

1. **Create a Cloudflare account** (if you don't have one)
   - Go to https://cloudflare.com and sign up
   - Add your domain

2. **Add DNS Records in Cloudflare:**
   - Type: CNAME
   - Name: @ (or yourdomain.com)
   - Target: your-heroku-dns-target.herokudns.com
   - Proxy status: Proxied (orange cloud)

   - Type: CNAME
   - Name: www
   - Target: your-heroku-dns-target.herokudns.com
   - Proxy status: Proxied (orange cloud)

3. **SSL/TLS Settings:**
   - Go to SSL/TLS → Overview
   - Set encryption mode to "Full"

4. **Note your Cloudflare nameservers** (shown when you add the domain)

## Step 3: GoDaddy Setup

1. **Log in to GoDaddy**
2. Go to **My Products** → **Domains**
3. Click **DNS** next to your domain
4. Click **Change Nameservers**
5. Choose **Custom Nameservers**
6. Enter the Cloudflare nameservers:
   - Usually something like:
   - `xxx.ns.cloudflare.com`
   - `yyy.ns.cloudflare.com`

## Step 4: Wait for Propagation

- DNS changes can take up to 48 hours to propagate
- Usually happens within 1-2 hours
- You can check status at: https://www.whatsmydns.net/

## Step 5: Environment Variables

Make sure to set your environment variables on Heroku:

```bash
heroku config:set REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key -a lenamaps
```

## Troubleshooting

1. **SSL Certificate Errors:**
   - Make sure Cloudflare SSL is set to "Full" not "Full (Strict)"
   - Wait for Cloudflare to issue the certificate (usually automatic)

2. **Site Not Loading:**
   - Check Heroku logs: `heroku logs --tail -a lenamaps`
   - Verify DNS propagation
   - Ensure Cloudflare proxy is enabled (orange cloud)

3. **Heroku Free Tier Limits:**
   - Free dynos sleep after 30 mins of inactivity
   - Consider upgrading to Hobby tier for always-on dynos

## Additional Cloudflare Features (Optional)

1. **Page Rules:**
   - Always Use HTTPS
   - Cache Level: Standard

2. **Performance:**
   - Enable Auto Minify (JS, CSS, HTML)
   - Enable Brotli compression

3. **Security:**
   - Enable Bot Fight Mode
   - Set Security Level to Medium