import React, { useState } from 'react';
import { Topic } from './types';
import { TopicSelector } from './components/TopicSelector';
import { GameBoard } from './components/GameBoard';

type GameView = 'topic-selector' | 'game-board';

function App() {
  const [currentView, setCurrentView] = useState<GameView>('topic-selector');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {currentView === 'topic-selector' && (
          <TopicSelector onTopicSelect={handleTopicSelect} />
        )}
        
        {currentView === 'game-board' && selectedTopic && (
          <GameBoard
            selectedTopic={selectedTopic}
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
              Designed for 3rd-5th grade students to practice spelling and punctuation skills.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 