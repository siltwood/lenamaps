# Authentication System Test Checklist

## 1. Initial Load
- [ ] App loads without errors
- [ ] "Sign In" button appears in top-left corner
- [ ] API Usage indicator appears in top-right corner
- [ ] No console errors

## 2. Sign Up Flow
- [ ] Click "Sign In" button
- [ ] Auth modal opens with email/password fields
- [ ] Try creating a new account with:
  - Email: test@example.com
  - Password: TestPassword123!
- [ ] Check for any error messages
- [ ] Successful signup should close modal and show user menu

## 3. User Menu
- [ ] User avatar shows first letter of email
- [ ] "FREE" tier badge is displayed
- [ ] Click on user menu to open dropdown
- [ ] Dropdown shows:
  - User email
  - Free tier badge
  - Menu options (Usage Dashboard, Manage Subscription, etc.)

## 4. Pricing Modal
- [ ] Click "Manage Subscription" in user menu
- [ ] Pricing modal opens with 3 tiers
- [ ] Free tier shows as "Current Plan"
- [ ] Try selecting Basic or Pro tier
- [ ] Should show upgrade confirmation

## 5. API Usage Tracking
- [ ] Usage indicator shows percentage
- [ ] Click on usage indicator
- [ ] Should show breakdown by API type
- [ ] All usage should be at 0% initially

## 6. Rate Limiting
- [ ] Create a route with multiple points
- [ ] Check that API calls are tracked
- [ ] Usage indicator should update

## 7. Sign Out
- [ ] Click user menu → Sign Out
- [ ] Should return to signed-out state
- [ ] "Sign In" button reappears

## Common Issues to Check:

### If auth modal doesn't work:
1. Check browser console for errors
2. Verify Supabase URL and anon key are correct
3. Check if Supabase project has email auth enabled

### If user profile errors:
1. Check if SQL schema was run in Supabase
2. Verify RLS policies are enabled
3. Check network tab for 404/403 errors

### If rate limiting doesn't update:
1. Check if useRateLimiter hook is working
2. Verify user tier is being fetched
3. Check localStorage for usage data

## Console Commands for Debugging:

Open browser console and run:
```javascript
// Check if Supabase is connected
localStorage.getItem('supabase.auth.token')

// Check current usage
localStorage.getItem('apiUsage')

// Check rate limiter
window.rateLimiter?.getUsageStats()
```