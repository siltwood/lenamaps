// Rate limiter for Google Maps API calls
class RateLimiter {
  constructor() {
    this.queues = {
      directions: [],
      places: [],
      geocoding: []
    };
    
    this.limits = {
      directions: {
        perSecond: 10,  // Conservative limit
        perMinute: 300,
        perDay: 2500    // Assuming ~$20/day budget
      },
      places: {
        perSecond: 10,
        perMinute: 300,
        perDay: 1000
      },
      geocoding: {
        perSecond: 50,
        perMinute: 3000,
        perDay: 5000
      }
    };
    
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
    return {
      date: new Date().toISOString(),
      directions: { second: 0, minute: 0, day: 0 },
      places: { second: 0, minute: 0, day: 0 },
      geocoding: { second: 0, minute: 0, day: 0 }
    };
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
    const usage = this.usage[apiType];
    
    // Check daily limit
    if (usage.day >= limit.perDay) {
      throw new Error(`Daily limit reached for ${apiType} API. Please try again tomorrow.`);
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
    this.usage[apiType].second++;
    this.usage[apiType].minute++;
    this.usage[apiType].day++;
    
    // Reset second counter after 1 second
    setTimeout(() => {
      this.usage[apiType].second = Math.max(0, this.usage[apiType].second - 1);
    }, 1000);
    
    // Reset minute counter after 1 minute
    setTimeout(() => {
      this.usage[apiType].minute = Math.max(0, this.usage[apiType].minute - 1);
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
      if (error.message.includes('limit reached')) {
        // Show user-friendly message
        throw error;
      }
      throw error;
    }
  }

  getUsageStats() {
    const stats = {};
    Object.keys(this.limits).forEach(apiType => {
      const limit = this.limits[apiType];
      const usage = this.usage[apiType];
      stats[apiType] = {
        daily: {
          used: usage.day,
          limit: limit.perDay,
          percentage: (usage.day / limit.perDay) * 100
        }
      };
    });
    return stats;
  }
}

export default new RateLimiter();