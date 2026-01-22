import React, { useState, useEffect } from 'react';
import { User } from '../types';
import AuthService, { GoogleUser } from '../services/authService';
import { validateAndSanitizeName } from '../utils/inputSanitization';

interface UserSetupProps {
  onUserSetup: (user: User) => void;
}

export const UserSetup: React.FC<UserSetupProps> = ({ onUserSetup }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showGradeSelector, setShowGradeSelector] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [authService] = useState(() => AuthService.getInstance());

  const gradeOptions = [
    { value: 'K', label: 'Kindergarten' },
    { value: '1st', label: '1st Grade' },
    { value: '2nd', label: '2nd Grade' },
    { value: '3rd', label: '3rd Grade' },
    { value: '4th', label: '4th Grade' },
    { value: '5th', label: '5th Grade' },
    { value: 'middle', label: 'Middle School' },
    { value: 'high', label: 'High School' },
    { value: 'beyond', label: 'Beyond' }
  ];

  // Check if user is already signed in with Google
  useEffect(() => {
    const checkGoogleUser = async () => {
      const currentGoogleUser = await authService.getCurrentGoogleUser();
      if (currentGoogleUser) {
        setGoogleUser(currentGoogleUser);
        setName(currentGoogleUser.name);
      }
    };
    checkGoogleUser();
  }, [authService]);

  // Handle OAuth callback on mount
  useEffect(() => {
    const handleCallback = async () => {
      const googleUser = await authService.handleAuthCallback();
      if (googleUser) {
        setGoogleUser(googleUser);
        setName(googleUser.name);
        setShowGradeSelector(true);
      }
    };
    handleCallback();
  }, [authService]);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleSigningIn(true);
      // This will redirect to Google, so we won't reach the code below
      // The callback handler (in useEffect) will process the return after redirect
      await authService.signInWithGoogle();
      // If we get here, there was an error (redirect should have happened)
      console.error('Google sign-in did not redirect');
      alert('Failed to sign in with Google. Please try again.');
      setIsGoogleSigningIn(false);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      alert('Failed to sign in with Google. Please try again.');
      setIsGoogleSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !grade) return;

    // Validate and sanitize name input
    const nameValidation = validateAndSanitizeName(name);
    if (!nameValidation.isValid) {
      alert(nameValidation.error || 'Please enter a valid name');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let user: User;
      
      if (googleUser) {
        // Create authenticated user from Google account
        user = authService.createUserFromGoogle(googleUser, grade);
        // Save to both localStorage and Supabase
        await authService.saveUser(user, true);
      } else {
        // Create local user (existing behavior) - use sanitized name
        user = {
          name: nameValidation.sanitized,
          grade,
          difficulty: getDifficultyFromGrade(grade),
          isAuthenticated: false
        };
        // Save only to localStorage
        await authService.saveUser(user, false);
      }
      
      onUserSetup(user);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getDifficultyFromGrade = (grade: string): 'easy' | 'medium' | 'hard' => {
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
  };

  const handleContinueWithoutGoogle = () => {
    setShowGradeSelector(true);
  };

  if (showGradeSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {googleUser ? 'Almost there!' : 'Welcome to MeProofIt!'}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {googleUser 
                ? `Hi ${googleUser.name}! What grade are you in?`
                : "Let's get to know you so we can make your learning experience perfect!"
              }
            </p>

            {googleUser && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center space-x-3">
                  <img 
                    src={googleUser.picture} 
                    alt={googleUser.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="text-left">
                    <p className="font-medium text-green-800">{googleUser.name}</p>
                    <p className="text-sm text-green-600">{googleUser.email}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input (only show if not using Google) */}
              {!googleUser && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    What's your name?
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="input-field text-center text-lg"
                    required
                    autoFocus
                    maxLength={50}
                    pattern="[a-zA-Z\s'-\.]+"
                    title="Name can only contain letters, spaces, hyphens, apostrophes, and periods"
                  />
                </div>
              )}

              {/* Grade Selection */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  What grade are you in?
                </label>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="input-field text-center text-lg"
                  required
                >
                  <option value="">Select your grade</option>
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!name.trim() || !grade || isSubmitting}
                className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Getting Ready...' : 'Start Learning!'}
              </button>
            </form>

            <div className="mt-8 text-sm text-gray-500">
              <p>🎓 Personalized learning experience</p>
              <p>🎮 Fun spelling and punctuation practice</p>
              <p>📈 Track your progress and improve</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to MeProofIt!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Sign in to save your progress across devices, or continue without an account for local play.
          </p>

          {/* Google Sign-In Button */}
          <div className="space-y-4 mb-8">
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn}
              className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleSigningIn ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="font-medium">
                {isGoogleSigningIn ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button
              onClick={handleContinueWithoutGoogle}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Continue without account
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <p>🎓 Personalized learning experience</p>
            <p>🎮 Fun spelling and punctuation practice</p>
            <p>📈 Track your progress and improve</p>
            {!googleUser && (
              <p className="mt-2 text-xs text-gray-400">
                Note: Progress without an account is stored locally and won't sync across devices
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 