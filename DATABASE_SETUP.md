# Database Setup Guide for MeProofIt

This guide will help you set up a Supabase database for your MeProofIt spelling correction game.

## 1. Create Supabase Project

### Step 1: Sign Up/Login
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"

### Step 2: Project Configuration
1. **Organization**: Select your organization
2. **Name**: `meproofit-db` (or your preferred name)
3. **Database Password**: Create a strong password (save this!)
4. **Region**: Choose closest to your users
5. **Pricing Plan**: Start with Free tier

### Step 3: Wait for Setup
- Project creation takes 1-2 minutes
- You'll receive an email when ready

## 2. Get API Keys

### Step 1: Access Project Settings
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (ends with `.supabase.co`)
   - **Anon Public Key** (starts with `eyJ...`)

### Step 2: Add to Environment Variables
Create a `.env` file in your project root:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here

# OpenAI Configuration (server-side only; DO NOT prefix with REACT_APP_)
OPENAI_API_KEY=your_openai_key_here
```

## 3. Database Schema Setup

### Step 1: Access SQL Editor
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**

### Step 2: Create Tables
Run the following SQL commands:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Daily sentences table
CREATE TABLE daily_sentences (
  id VARCHAR(20) PRIMARY KEY, -- "YYYY-MM-DD-grade"
  date DATE NOT NULL,
  grade VARCHAR(10) NOT NULL,
  topic VARCHAR(50) NOT NULL,
  incorrect_sentence TEXT NOT NULL,
  correct_sentence TEXT NOT NULL,
  errors JSONB NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User daily results table
CREATE TABLE user_daily_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_sentence_id VARCHAR(20) REFERENCES daily_sentences(id),
  score INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  user_input TEXT NOT NULL,
  corrections JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, daily_sentence_id)
);

-- Generated sentences cache table
CREATE TABLE sentence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  incorrect_sentence TEXT NOT NULL,
  correct_sentence TEXT NOT NULL,
  errors JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends Supabase auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  total_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_game_mode VARCHAR(10) DEFAULT 'daily',
  notifications_enabled BOOLEAN DEFAULT true,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_daily_sentences_date_grade ON daily_sentences(date, grade);
CREATE INDEX idx_user_daily_results_user_id ON user_daily_results(user_id);
CREATE INDEX idx_sentence_cache_topic_grade_difficulty ON sentence_cache(topic, grade, difficulty);
CREATE INDEX idx_sentence_cache_usage_count ON sentence_cache(usage_count);
CREATE INDEX idx_user_profiles_grade ON user_profiles(grade);
```

### Step 3: Set Up Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE daily_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Daily sentences: Read-only for authenticated users
CREATE POLICY "Daily sentences are viewable by authenticated users" ON daily_sentences
  FOR SELECT USING (auth.role() = 'authenticated');

-- User daily results: Users can only see their own results
CREATE POLICY "Users can view own daily results" ON user_daily_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily results" ON user_daily_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily results" ON user_daily_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Sentence cache: Read-only for authenticated users
CREATE POLICY "Sentence cache is viewable by authenticated users" ON sentence_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sentence cache can be inserted by authenticated users" ON sentence_cache
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Sentence cache can be updated by authenticated users" ON sentence_cache
  FOR UPDATE USING (auth.role() = 'authenticated');

-- User profiles: Users can only see and modify their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- User preferences: Users can only see and modify their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = id);
```

## 4. Install Dependencies

Run this command in your project directory:

```bash
npm install @supabase/supabase-js
```

## 5. Update Your Code

### Step 1: Update User Setup
Modify your `UserSetup` component to include email/password fields and use Supabase auth.

### Step 2: Update Services
The `DatabaseService` and updated `LLMService` are already provided in the codebase.

### Step 3: Update App Flow
Modify your main App component to use Supabase authentication instead of localStorage.

## 6. Environment Variables for Production

### Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the same environment variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` (server-side only; DO NOT prefix with REACT_APP_)

### Other Platforms
Add the environment variables to your deployment platform's configuration.

## 7. Testing the Setup

### Step 1: Test Database Connection
```javascript
// In your browser console or a test component
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Test connection
supabase.from('daily_sentences').select('count').then(console.log);
```

### Step 2: Test Authentication
```javascript
// Test sign up
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
});
```

## 8. Benefits of This Setup

### Performance
- ✅ **Cached sentences**: Reduce OpenAI API calls by 80-90%
- ✅ **Fast queries**: Indexed database for quick lookups
- ✅ **CDN**: Supabase serves data from edge locations

### Scalability
- ✅ **Automatic scaling**: Supabase handles traffic spikes
- ✅ **Real-time**: Live updates across devices
- ✅ **Backup**: Automatic daily backups

### Features
- ✅ **User accounts**: Secure authentication
- ✅ **Cross-device sync**: Play on any device
- ✅ **Analytics**: Track user progress
- ✅ **Leaderboards**: Compare with other students

### Cost Savings
- ✅ **Reduced API calls**: Cache sentences to save money
- ✅ **Free tier**: 50,000 monthly active users
- ✅ **Predictable pricing**: No surprise bills

## 9. Monitoring and Maintenance

### Supabase Dashboard
- Monitor usage in **Usage** tab
- View logs in **Logs** tab
- Check performance in **Database** tab

### Regular Tasks
- Review cached sentences usage
- Clean up old cache entries (automatic)
- Monitor API usage and costs

## 10. Next Steps

1. **Implement user authentication** in your components
2. **Update the daily sentence service** to use the database
3. **Add real-time features** for live updates
4. **Create admin dashboard** for managing content
5. **Add analytics** for tracking user engagement

This database setup will provide a solid foundation for scaling your MeProofIt application while reducing costs and improving user experience! 