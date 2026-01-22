import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Shield, Mail } from 'lucide-react';
import AuthService from '../services/authService';
import { validateAndSanitizeName } from '../utils/inputSanitization';

interface UserSettingsProps {
  user: User;
  onBack: () => void;
  onUserUpdate: (updatedUser: User) => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ user, onBack, onUserUpdate }) => {
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState(user.grade);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      // Create updated user object, preserving Google account info
      // Use sanitized name
      const updatedUser: User = {
        ...user, // Preserve all existing properties including Google account info
        name: nameValidation.sanitized,
        grade,
        difficulty: getDifficultyFromGrade(grade)
      };

      // Update localStorage using auth service
      authService.saveUser(updatedUser);
      
      // Call parent handler to update app state
      onUserUpdate(updatedUser);
    } catch (error) {
      console.error('Error updating user settings:', error);
      alert('Failed to update settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeLabel = (grade: string): string => {
    const option = gradeOptions.find(opt => opt.value === grade);
    return option ? option.label : grade;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Game
        </button>
        <h1 className="text-2xl font-bold text-gray-900">User Settings</h1>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          {user.picture ? (
            <img 
              src={user.picture} 
              alt={user.name}
              className="w-12 h-12 rounded-full border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-primary-600" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-600">Update your name and grade level</p>
            {user.isAuthenticated && (
              <div className="flex items-center gap-1 mt-1">
                <Shield size={14} className="text-green-600" />
                <span className="text-xs text-green-600 font-medium">Google Account</span>
              </div>
            )}
          </div>
        </div>

        {/* Google Account Info */}
        {user.isAuthenticated && user.email && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail size={16} className="text-green-600" />
              <h3 className="font-medium text-green-800">Google Account</h3>
            </div>
            <p className="text-sm text-green-700">{user.email}</p>
            <p className="text-xs text-green-600 mt-1">
              Your profile is linked to your Google account and will sync across devices.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input-field"
              required
              maxLength={50}
              pattern="[a-zA-Z\s'-\.]+"
              title="Name can only contain letters, spaces, hyphens, apostrophes, and periods"
            />
            {user.isAuthenticated && (
              <p className="text-xs text-gray-500 mt-1">
                This name will be used in the game, but your Google account name is preserved.
              </p>
            )}
          </div>

          {/* Grade Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Grade Level
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {gradeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGrade(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    grade === option.value
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  {option.value}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Selected: <span className="font-medium">{getGradeLabel(grade)}</span>
            </p>
          </div>

          {/* Difficulty Level Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Difficulty Level</h3>
            <p className="text-sm text-blue-800">
              Your grade level determines the difficulty of sentences you'll see:
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• <strong>Easy</strong> (K-2nd): 2 errors per sentence</li>
              <li>• <strong>Medium</strong> (3rd-5th): 3 errors per sentence</li>
              <li>• <strong>Hard</strong> (Middle+): 4 errors per sentence</li>
            </ul>
            <p className="text-sm text-blue-800 mt-2">
              Current difficulty: <span className="font-medium">{getDifficultyFromGrade(grade)}</span>
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!name.trim() || !grade || isSubmitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Additional Info */}
      <div className="mt-6 card">
        <h3 className="font-semibold text-gray-900 mb-3">About Grade Changes</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Changing your grade will affect the difficulty of new sentences you encounter</p>
          <p>• Your existing progress and archives will be preserved</p>
          <p>• You can always change back to your previous grade level</p>
          <p>• Daily challenges will be appropriate for your new grade level</p>
        </div>
      </div>

      {/* Account Security Info */}
      {user.isAuthenticated && (
        <div className="mt-6 card">
          <h3 className="font-semibold text-gray-900 mb-3">Account Security</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Your account is secured by Google's authentication system</p>
            <p>• No passwords are stored on our servers</p>
            <p>• You can sign out from any device using the Sign Out button</p>
            <p>• Your data is stored locally in your browser for privacy</p>
          </div>
        </div>
      )}
    </div>
  );
}; 