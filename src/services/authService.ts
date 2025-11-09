import { User } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from './databaseService';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export class AuthService {
  private static instance: AuthService;
  private supabase: SupabaseClient | null = null;

  private constructor() {
    if (isSupabaseConfigured) {
      this.supabase = createClient(supabaseUrl!, supabaseAnonKey!);
      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // User signed in, sync to localStorage for backward compatibility
          this.syncSupabaseUserToLocalStorage(session);
        } else if (event === 'SIGNED_OUT') {
          // User signed out, clear localStorage
          localStorage.removeItem('meproofit-google-user');
          localStorage.removeItem('meproofit-user');
        }
      });
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign in with Google using Supabase OAuth
   * This will redirect to Google and then back to the app
   * Note: This method will cause a page redirect, so code after it won't execute
   */
  public async signInWithGoogle(): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
    }

    // Get the current URL for redirect
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    
    // Initiate Google OAuth flow through Supabase
    // This will redirect the browser to Google, then back to the app
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    // If we get here, the redirect should happen automatically
    // The actual user data will be available after redirect via handleAuthCallback()
  }

  /**
   * Handle OAuth callback after redirect
   * Supabase automatically processes the OAuth callback and stores the session
   */
  public async handleAuthCallback(): Promise<GoogleUser | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      // Check for OAuth callback in URL hash or query params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const errorParam = hashParams.get('error') || queryParams.get('error');

      if (errorParam) {
        console.error('OAuth error:', errorParam);
        // Clear error from URL
        window.history.replaceState(null, '', window.location.pathname);
        return null;
      }

      // If we have an access token in the URL, Supabase should have processed it
      // Get the session (Supabase automatically handles the OAuth callback)
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Failed to get session:', sessionError);
        return null;
      }

      // If we have a session and there was an OAuth callback, clear the URL
      if (session && (accessToken || hashParams.toString() || queryParams.toString())) {
        // Clear the hash/query params from URL
        window.history.replaceState(null, '', window.location.pathname);
        return this.getGoogleUserFromSession(session);
      }

      // No callback detected, but check if user is already signed in
      if (session?.user) {
        return this.getGoogleUserFromSession(session);
      }

      return null;
    } catch (error) {
      console.error('Error handling auth callback:', error);
      return null;
    }
  }

  /**
   * Extract Google user info from Supabase session
   */
  private getGoogleUserFromSession(session: any): GoogleUser {
    const user = session.user;
    const userMetadata = user.user_metadata || {};
    
    return {
      id: user.id,
      email: user.email || userMetadata.email || '',
      name: userMetadata.full_name || userMetadata.name || user.email?.split('@')[0] || 'User',
      picture: userMetadata.avatar_url || userMetadata.picture || ''
    };
  }

  /**
   * Sync Supabase user to localStorage for backward compatibility
   */
  private async syncSupabaseUserToLocalStorage(session: any) {
    if (!session?.user) return;

    const googleUser = this.getGoogleUserFromSession(session);
    localStorage.setItem('meproofit-google-user', JSON.stringify(googleUser));

    // Try to get user profile from database
    try {
      const profile = await DatabaseService.getUserProfile(session.user.id);
      if (profile) {
        const user: User = {
          name: profile.name || googleUser.name,
          grade: profile.grade,
          difficulty: profile.difficulty,
          googleId: googleUser.id,
          email: googleUser.email,
          picture: googleUser.picture,
          isAuthenticated: true,
          lastLogin: new Date().toISOString()
        };
        localStorage.setItem('meproofit-user', JSON.stringify(user));
      }
    } catch (error) {
      // Profile doesn't exist yet, that's okay
      console.log('User profile not found, will be created on setup');
    }
  }

  /**
   * Sign out from both Supabase and clear local storage
   */
  public async signOut(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
    localStorage.removeItem('meproofit-google-user');
    localStorage.removeItem('meproofit-user');
  }

  /**
   * Get current Google user from Supabase session or localStorage
   */
  public async getCurrentGoogleUser(): Promise<GoogleUser | null> {
    // First try Supabase session
    if (this.supabase) {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        return this.getGoogleUserFromSession(session);
      }
    }

    // Fallback to localStorage
    const stored = localStorage.getItem('meproofit-google-user');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Check if user is signed in with Google
   */
  public async isGoogleUserSignedIn(): Promise<boolean> {
    const user = await this.getCurrentGoogleUser();
    return !!user;
  }

  /**
   * Get current Supabase session
   */
  public async getSession() {
    if (!this.supabase) {
      return null;
    }
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Create User object from Google user and grade
   */
  public createUserFromGoogle(googleUser: GoogleUser, grade: string): User {
    return {
      name: googleUser.name,
      grade,
      difficulty: this.getDifficultyFromGrade(grade),
      googleId: googleUser.id,
      email: googleUser.email,
      picture: googleUser.picture,
      isAuthenticated: true,
      lastLogin: new Date().toISOString()
    };
  }

  private getDifficultyFromGrade(grade: string): 'easy' | 'medium' | 'hard' {
    switch (grade) {
      case 'K':
      case '1st':
      case '2nd':
        return 'easy';
      case '3rd':
      case '4th':
      case '5th':
        return 'medium';
      case 'middle':
      case 'high':
      case 'beyond':
        return 'hard';
      default:
        return 'medium';
    }
  }

  /**
   * Save user to localStorage and optionally to Supabase
   */
  public async saveUser(user: User, syncToSupabase: boolean = false): Promise<void> {
    localStorage.setItem('meproofit-user', JSON.stringify(user));
    
    // If user is authenticated and Supabase is configured, sync to database
    if (syncToSupabase && user.isAuthenticated && this.supabase) {
      try {
        const session = await this.getSession();
        if (session?.user) {
          // Create or update user profile in Supabase
          await DatabaseService.createUserProfile(session.user.id, {
            name: user.name,
            grade: user.grade,
            difficulty: user.difficulty
          });
        }
      } catch (error) {
        console.error('Error syncing user to Supabase:', error);
        // Don't throw - localStorage save succeeded
      }
    }
  }

  /**
   * Get user from localStorage or Supabase
   */
  public async getUser(): Promise<User | null> {
    // First try to get from Supabase if authenticated
    if (this.supabase) {
      const session = await this.getSession();
      if (session?.user) {
        try {
          const profile = await DatabaseService.getUserProfile(session.user.id);
          if (profile) {
            const googleUser = await this.getCurrentGoogleUser();
            const user: User = {
              name: profile.name,
              grade: profile.grade,
              difficulty: profile.difficulty,
              googleId: session.user.id,
              email: googleUser?.email,
              picture: googleUser?.picture,
              isAuthenticated: true,
              lastLogin: new Date().toISOString()
            };
            // Sync to localStorage for backward compatibility
            localStorage.setItem('meproofit-user', JSON.stringify(user));
            return user;
          }
        } catch (error) {
          // Profile doesn't exist, fall through to localStorage
        }
      }
    }

    // Fallback to localStorage
    const stored = localStorage.getItem('meproofit-user');
    return stored ? JSON.parse(stored) : null;
  }
}

export default AuthService;

