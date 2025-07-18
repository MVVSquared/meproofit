import React, { useState, useEffect } from 'react';
import { Topic, User } from './types';
import { TopicSelector } from './components/TopicSelector';
import { GameBoard } from './components/GameBoard';
import { UserSetup } from './components/UserSetup';

type GameView = 'user-setup' | 'topic-selector' | 'game-board';

function App() {
  const [currentView, setCurrentView] = useState<GameView>('user-setup');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  // Check for existing user on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('meproofit-user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setCurrentView('topic-selector');
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('meproofit-user');
      }
    }
  }, []);

  const handleUserSetup = (userData: User) => {
    setUser(userData);
    setCurrentView('topic-selector');
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setCurrentView('game-board');
  };

  const handleGameComplete = (score: number) => {
    setTotalScore(prev => prev + score);
    setGamesPlayed(prev => prev + 1);
  };

  const handleBackToTopics = () => {
    setCurrentView('topic-selector');
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedTopic(null);
    setTotalScore(0);
    setGamesPlayed(0);
    localStorage.removeItem('meproofit-user');
    setCurrentView('user-setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">MeProofIt</h1>
              <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                Beta
              </span>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Welcome, {user.name}!</span>
                  <span className="mx-2">•</span>
                  <span>{user.grade}</span>
                </div>
                
                {gamesPlayed > 0 && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Games:</span> {gamesPlayed}
                    </div>
                    <div>
                      <span className="font-medium">Total Score:</span> {totalScore}
                    </div>
                    <div>
                      <span className="font-medium">Average:</span> {Math.round(totalScore / gamesPlayed)}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {currentView === 'user-setup' && (
          <UserSetup onUserSetup={handleUserSetup} />
        )}
        
        {currentView === 'topic-selector' && user && (
          <TopicSelector onTopicSelect={handleTopicSelect} />
        )}
        
        {currentView === 'game-board' && selectedTopic && user && (
          <GameBoard
            selectedTopic={selectedTopic}
            user={user}
            onGameComplete={handleGameComplete}
            onBackToTopics={handleBackToTopics}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2024 MeProofIt. Making learning fun, one correction at a time! 🎯</p>
            <p className="mt-1">
              Designed for students to practice spelling and punctuation skills.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 