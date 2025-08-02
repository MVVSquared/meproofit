# Google OAuth Setup Guide for MeProofIt

This guide will help you set up Google OAuth authentication for your MeProofIt spelling correction game using Supabase.

## 1. Google Cloud Console Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. **Name**: `meproofit-auth` (or your preferred name)
4. Click "Create"

### Step 2: Enable Google+ API
1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click on it and click "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. **Application type**: Web application
4. **Name**: `MeProofIt Web Client`
5. **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - `https://your-vercel-domain.vercel.app` (for production)
6. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://your-vercel-domain.vercel.app/auth/callback` (for production)
7. Click "Create"
8. **Save the Client ID and Client Secret** (you'll need these for Supabase)

## 2. Supabase Authentication Configuration

### Step 1: Configure Google Provider
1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click "Edit"
3. **Enable**: Toggle to "Enabled"
4. **Client ID**: Paste your Google Client ID
5. **Client Secret**: Paste your Google Client Secret
6. **Redirect URL**: Copy the URL shown (you'll need this for Google)
7. Click "Save"

### Step 2: Update Google Redirect URI
1. Go back to Google Cloud Console → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add the Supabase redirect URL to **Authorized redirect URIs**
4. Click "Save"

### Step 3: Configure Auth Settings
1. In Supabase, go to **Authentication** → **Settings**
2. **Site URL**: Set to your production URL (e.g., `https://your-app.vercel.app`)
3. **Redirect URLs**: Add your callback URLs
4. **Enable email confirmations**: Disable (since we're using Google OAuth)
5. Click "Save"

## 3. Update Environment Variables

### Step 1: Add to .env file
```env
# Existing variables
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_OPENAI_API_KEY=your_openai_key

# New variables for production
REACT_APP_SITE_URL=https://your-app.vercel.app
```

### Step 2: Update Vercel Environment Variables
1. In Vercel dashboard, go to your project → **Settings** → **Environment Variables**
2. Add the same variables as above
3. Make sure to set them for **Production** environment

## 4. Update Database Schema

### Step 1: User Profiles Table
Run this SQL in Supabase SQL Editor:

```sql
-- Update user_profiles table to work with Google OAuth
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(10) NOT NULL DEFAULT '3rd',
  difficulty VARCHAR(10) NOT NULL DEFAULT 'medium',
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

## 5. Update Frontend Code

### Step 1: Install Supabase Auth Helpers
```bash
npm install @supabase/auth-helpers-react
```

### Step 2: Create Auth Context
Create `src/contexts/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/databaseService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) console.error('Error signing in with Google:', error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signInWithGoogle,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Step 3: Create Auth Callback Page
Create `src/pages/AuthCallback.tsx`:

```tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/databaseService';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
        return;
      }

      if (data.session) {
        // Check if user profile exists
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (profile) {
          navigate('/game');
        } else {
          navigate('/setup');
        }
      } else {
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
};
```

### Step 4: Update App.tsx
```tsx
import { AuthProvider } from './contexts/AuthContext';
import { AuthCallback } from './pages/AuthCallback';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

### Step 5: Update Login Component
```tsx
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to MeProofIt</h2>
          <p className="mt-2 text-gray-600">Sign in to start improving your spelling!</p>
        </div>
        
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
};
```

## 6. Testing

### Step 1: Local Development
1. Start your development server: `npm start`
2. Go to `http://localhost:3000`
3. Click "Continue with Google"
4. Complete Google OAuth flow
5. Verify you're redirected back to your app

### Step 2: Production Testing
1. Deploy to Vercel
2. Test the OAuth flow in production
3. Verify user profiles are created in Supabase

## 7. Security Considerations

### ✅ What's Secure:
- No password storage on your servers
- Google handles all authentication
- Supabase manages sessions securely
- Row Level Security protects user data

### 🔒 Additional Security:
- Enable email verification if needed
- Set up proper CORS policies
- Monitor auth logs in Supabase
- Regular security audits

## 8. User Experience Benefits

### ✅ For Users:
- One-click sign in with Google
- No password to remember
- Automatic profile creation
- Seamless experience

### ✅ For You:
- No password management
- Reduced security liability
- Better user adoption
- Professional authentication

This setup gives you enterprise-grade authentication with minimal effort and maximum security! 