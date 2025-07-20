import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon } from 'lucide-react';

interface UserSettingsProps {
  user: User;
  onBack: () => void;
  onUserUpdate: (updatedUser: User) => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ user, onBack, onUserUpdate }) => {
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState(user.grade);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    
    try {
      // Create updated user object
      const updatedUser: User = {
        name: name.trim(),
        grade,
        difficulty: getDifficultyFromGrade(grade)
      };

      // Update localStorage
      localStorage.setItem('meproofit-user', JSON.stringify(updatedUser));
      
      // Call parent handler to update app state
      onUserUpdate(updatedUser);
    } catch (error) {
      console.error('Error updating user settings:', error);
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
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-600">Update your name and grade level</p>
          </div>
        </div>

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
            />
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
    </div>
  );
}; 