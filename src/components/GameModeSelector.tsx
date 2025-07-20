import React from 'react';
import { GameMode, User } from '../types';
import { Calendar, Shuffle } from 'lucide-react';

interface GameModeSelectorProps {
  user: User;
  onModeSelect: (mode: GameMode) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ user, onModeSelect }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, {user.name}! 🎯
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          How would you like to practice today?
        </p>
        <p className="text-lg text-gray-500">
          Choose your learning adventure
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Daily Sentence Option */}
        <button
          onClick={() => onModeSelect('daily')}
          className="card hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-center group border-2 border-transparent hover:border-primary-200"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-200">
            📅
          </div>
          <div className="flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-primary-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Daily Challenge</h3>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Get today's special sentence for your grade level. 
            A new challenge every day at midnight GMT!
          </p>
          <div className="text-sm text-primary-600 font-medium">
            Perfect for consistent daily practice
          </div>
        </button>

        {/* Random Sentences Option */}
        <button
          onClick={() => onModeSelect('random')}
          className="card hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-center group border-2 border-transparent hover:border-primary-200"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-200">
            🎲
          </div>
          <div className="flex items-center justify-center mb-3">
            <Shuffle className="w-6 h-6 text-primary-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Random Practice</h3>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Practice with random topics and sentences. 
            Great for variety and extended learning sessions!
          </p>
          <div className="text-sm text-primary-600 font-medium">
            Explore different topics and difficulty levels
          </div>
        </button>
      </div>

      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full">
          <span className="text-sm font-medium">💡 Tip:</span>
          <span className="text-sm">
            Try the daily challenge for consistent progress, or random practice for variety!
          </span>
        </div>
      </div>
    </div>
  );
}; 