-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type TEXT NOT NULL CHECK (api_type IN ('directions', 'places', 'geocoding', 'map_loads')),
  count INTEGER DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, api_type, date)
);

-- Saved routes table
CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  route_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route shares table (for public sharing)
CREATE TABLE IF NOT EXISTS route_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES saved_routes(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 0, 9),
  views INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, date);
CREATE INDEX idx_api_usage_date ON api_usage(date);
CREATE INDEX idx_saved_routes_user ON saved_routes(user_id);
CREATE INDEX idx_route_shares_code ON route_shares(share_code);

-- Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions: Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- API usage: Users can view and insert their own usage
CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can track own usage" ON api_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON api_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Saved routes: Users can manage their own routes
CREATE POLICY "Users can view own routes" ON saved_routes
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create routes" ON saved_routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes" ON saved_routes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes" ON saved_routes
  FOR DELETE USING (auth.uid() = user_id);

-- Route shares: Anyone can view public shares
CREATE POLICY "Anyone can view public shares" ON route_shares
  FOR SELECT USING (true);

CREATE POLICY "Route owners can create shares" ON route_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_routes 
      WHERE saved_routes.id = route_shares.route_id 
      AND saved_routes.user_id = auth.uid()
    )
  );

-- Functions
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_routes_updated_at BEFORE UPDATE ON saved_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to track API usage
CREATE OR REPLACE FUNCTION track_api_usage(
  p_user_id UUID,
  p_api_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_usage (user_id, api_type, count)
  VALUES (p_user_id, p_api_type, p_count)
  ON CONFLICT (user_id, api_type, date)
  DO UPDATE SET count = api_usage.count + EXCLUDED.count;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily usage stats
CREATE OR REPLACE FUNCTION get_daily_usage_stats(p_user_id UUID)
RETURNS TABLE (
  api_type TEXT,
  daily_count BIGINT,
  date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.api_type,
    SUM(au.count)::BIGINT as daily_count,
    au.date
  FROM api_usage au
  WHERE au.user_id = p_user_id
    AND au.date = CURRENT_DATE
  GROUP BY au.api_type, au.date;
END;
$$ LANGUAGE plpgsql;