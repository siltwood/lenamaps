// Rate limiter for Google Maps API calls
import { getLimitsForTier } from '../config/apiConfig';

class RateLimiter {
  constructor() {
    this.queues = {
      directions: [],
      places: [],
      geocoding: []
    };
    
    this.userTier = 'free';
    this.userId = null;
    this.limits = getLimitsForTier('free');
    
    this.usage = this.loadUsageFromStorage();
    this.resetDailyUsage();
  }

  loadUsageFromStorage() {
    const stored = localStorage.getItem('apiUsage');
    if (stored) {
      const data = JSON.parse(stored);
      // Reset if it's a new day
      if (new Date(data.date).toDateString() !== new Date().toDateString()) {
        return this.getEmptyUsage();
      }
      return data;
    }
    return this.getEmptyUsage();
  }

  getEmptyUsage() {
    const usage = {
      date: new Date().toISOString(),
      directions: { second: 0, minute: 0, day: 0 },
      places: { second: 0, minute: 0, day: 0 },
      geocoding: { second: 0, minute: 0, day: 0 },
      mapLoads: { second: 0, minute: 0, day: 0 }
    };
    
    return usage;
  }

  saveUsage() {
    localStorage.setItem('apiUsage', JSON.stringify(this.usage));
  }

  resetDailyUsage() {
    // Reset daily usage at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow - now;
    setTimeout(() => {
      this.usage = this.getEmptyUsage();
      this.saveUsage();
      this.resetDailyUsage();
    }, msUntilMidnight);
  }

  async checkLimit(apiType) {
    const limit = this.limits[apiType];
    if (!this.usage[apiType]) {
      this.usage[apiType] = { second: 0, minute: 0, day: 0 };
    }
    const usage = this.usage[apiType];
    
    // Check daily limit
    if (usage.day >= limit.daily) {
      const percentage = (usage.day / limit.daily) * 100;
      const error = new Error(`You've reached your daily limit for ${apiType} API.`);
      error.type = 'DAILY_LIMIT_REACHED';
      error.details = {
        type: 'DAILY_LIMIT_REACHED',
        message: `You've reached your daily limit for ${apiType} API.`,
        apiType,
        usage: usage.day,
        limit: limit.daily,
        percentage
      };
      throw error;
    }
    
    // Check per-minute limit
    if (usage.minute >= limit.perMinute) {
      // Wait until next minute
      await this.waitForNextMinute();
    }
    
    // Check per-second limit
    if (usage.second >= limit.perSecond) {
      // Wait until next second
      await this.waitForNextSecond();
    }
    
    return true;
  }

  incrementUsage(apiType) {
    if (!this.usage[apiType]) {
      this.usage[apiType] = { second: 0, minute: 0, day: 0 };
    }
    
    this.usage[apiType].second++;
    this.usage[apiType].minute++;
    this.usage[apiType].day++;
    
    // Reset second counter after 1 second
    setTimeout(() => {
      if (this.usage[apiType]) {
        this.usage[apiType].second = Math.max(0, this.usage[apiType].second - 1);
      }
    }, 1000);
    
    // Reset minute counter after 1 minute
    setTimeout(() => {
      if (this.usage[apiType]) {
        this.usage[apiType].minute = Math.max(0, this.usage[apiType].minute - 1);
      }
    }, 60000);
    
    this.saveUsage();
  }

  async waitForNextSecond() {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async waitForNextMinute() {
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    const msUntilNextMinute = nextMinute - now;
    return new Promise(resolve => setTimeout(resolve, msUntilNextMinute));
  }

  async executeWithRateLimit(apiType, fn) {
    try {
      await this.checkLimit(apiType);
      this.incrementUsage(apiType);
      return await fn();
    } catch (error) {
      if (error.type === 'DAILY_LIMIT_REACHED') {
        // Create a custom error that components can handle
        const limitError = new Error(error.message);
        limitError.type = 'DAILY_LIMIT_REACHED';
        limitError.details = error;
        throw limitError;
      }
      throw error;
    }
  }

  getUsageStats() {
    const stats = {};
    const apiTypes = ['directions', 'places', 'geocoding', 'mapLoads'];
    
    apiTypes.forEach(apiType => {
      const limit = this.limits[apiType] || { daily: 1, perMinute: 1, perSecond: 1 };
      const usage = this.usage[apiType] || { second: 0, minute: 0, day: 0 };
      
      const used = usage.day || 0;
      const dailyLimit = limit.daily || 1;
      const percentage = Math.min(100, (used / dailyLimit) * 100);
      
      stats[apiType] = {
        daily: {
          used: used,
          limit: dailyLimit,
          percentage: percentage
        }
      };
    });
    return stats;
  }

  setUserTier(tier, userId = null) {
    this.userTier = tier;
    this.userId = userId;
    this.limits = getLimitsForTier(tier);
    
    // If user is logged in, use server-side tracking
    if (userId) {
      this.syncWithServer();
    }
  }

  async syncWithServer() {
    if (!this.userId) return;
    
    try {
      // This will be implemented when we set up the backend
      // For now, just use local storage
      console.log('Syncing usage with server for user:', this.userId);
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  }
}

export default new RateLimiter();