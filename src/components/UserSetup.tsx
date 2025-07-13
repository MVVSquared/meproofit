import React, { useState } from 'react';
import { User } from '../types';

interface UserSetupProps {
  onUserSetup: (user: User) => void;
}

export const UserSetup: React.FC<UserSetupProps> = ({ onUserSetup }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !grade) return;

    setIsSubmitting(true);
    
    // Create user object
    const user: User = {
      name: name.trim(),
      grade,
      difficulty: getDifficultyFromGrade(grade)
    };

    // Store in localStorage for persistence
    localStorage.setItem('meproofit-user', JSON.stringify(user));
    
    onUserSetup(user);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to MeProofIt!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Let's get to know you so we can make your learning experience perfect!
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
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
              />
            </div>

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
}; 