import React, { useState, useEffect } from 'react';
import { Topic, User, GameMode } from './types';
import { TopicSelector } from './components/TopicSelector';
import { GameBoard } from './components/GameBoard';
import { UserSetup } from './components/UserSetup';
import { GameModeSelector } from './components/GameModeSelector';
import { DailyArchives } from './components/DailyArchives';
import { UserSettings } from './components/UserSettings';
import { GradeSelector } from './components/GradeSelector';
import { TOPICS } from './data/topics';
import AuthService from './services/authService';


type GameView = 'user-setup' | 'game-mode-selector' | 'topic-selector' | 'game-board' | 'daily-archives' | 'user-settings' | 'grade-selector';

function App() {
  const [currentView, setCurrentView] = useState<GameView>('user-setup');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [tempGradeForDaily, setTempGradeForDaily] = useState<string | null>(null);
  const [authService] = useState(() => AuthService.getInstance());

  // Function to randomly select a topic
  const selectRandomTopic = (): Topic => {
    const randomIndex = Math.floor(Math.random() * TOPICS.length);
    return TOPICS[randomIndex];
  };

  // Check for existing user on app load and handle OAuth callback
  useEffect(() => {
    const initializeUser = async () => {
      // First, check for OAuth callback
      const googleUser = await authService.handleAuthCallback();
      if (googleUser) {
        // User just signed in with Google, check if they have a profile
        const savedUser = await authService.getUser();
        if (savedUser) {
          setUser(savedUser);
          setCurrentView('game-mode-selector');
        } else {
          // New Google user, show setup
          setCurrentView('user-setup');
        }
      } else {
        // No OAuth callback, check for existing user
        const savedUser = await authService.getUser();
        if (savedUser) {
          setUser(savedUser);
          // Show game mode selector instead of going directly to game
          setCurrentView('game-mode-selector');
        }
      }
    };
    initializeUser();
  }, [authService]);

  const handleUserSetup = (userData: User) => {
    setUser(userData);
    // Show game mode selector after user setup
    setCurrentView('game-mode-selector');
  };

  const handleGameModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    // Reset temp grade when starting a new game mode
    setTempGradeForDaily(null);
    
    if (mode === 'daily') {
      // For daily mode, we don't need a topic - it will be determined by the daily service
      setCurrentView('game-board');
    } else {
      // For random mode, select a random topic and go to game board
      const randomTopic = selectRandomTopic();
      setSelectedTopic(randomTopic);
      setCurrentView('game-board');
    }
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
    if (gameMode === 'daily') {
      // For daily mode, stay on game board (daily sentences don't change topics)
      return;
    } else {
      // For random mode, select a new random topic
      const randomTopic = selectRandomTopic();
      setSelectedTopic(randomTopic);
      // Stay on game board with new topic
    }
  };

  const handleShowArchives = () => {
    setCurrentView('daily-archives');
  };

  const handleBackFromArchives = () => {
    setCurrentView('game-board');
  };

  const handleShowSettings = () => {
    setCurrentView('user-settings');
  };

  const handleBackFromSettings = () => {
    setCurrentView('game-board');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    setCurrentView('game-board');
  };

  const handleGradeChange = (newGrade: string) => {
    if (newGrade === 'select') {
      // Show grade selector screen
      setCurrentView('grade-selector');
      return;
    }
    
    // For daily mode, only temporarily change the grade without affecting the profile
    if (gameMode === 'daily') {
      setTempGradeForDaily(newGrade);
      // Return to game board with new grade
      setCurrentView('game-board');
    } else {
      // For random mode, create a temporary user with the new grade for this session
      const tempUser = { ...user!, grade: newGrade };
      setUser(tempUser);
      // Return to game board
      setCurrentView('game-board');
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setUser(null);
    setSelectedTopic(null);
    setGameMode(null);
    setTotalScore(0);
    setGamesPlayed(0);
    setTempGradeForDaily(null);
    setCurrentView('user-setup');
  };

  // Get the effective grade for the current game session
  const getEffectiveGrade = (): string => {
    if (gameMode === 'daily' && tempGradeForDaily) {
      return tempGradeForDaily;
    }
    return user?.grade || '';
  };

  // Get the effective user for the current game session
  const getEffectiveUser = (): User | null => {
    if (!user) return null;
    
    if (gameMode === 'daily' && tempGradeForDaily) {
      return { ...user, grade: tempGradeForDaily };
    }
    return user;
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
                <div className="flex items-center space-x-3">
                  {user.picture && (
                    <img 
                      src={user.picture} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-gray-200"
                    />
                  )}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Welcome, {user.name}!</span>
                    <span className="mx-2">•</span>
                    <span>{getEffectiveGrade()}</span>
                    {gameMode && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="capitalize">{gameMode} Mode</span>
                      </>
                    )}
                    {gameMode === 'daily' && tempGradeForDaily && tempGradeForDaily !== user.grade && (
                      <span className="ml-2 text-xs text-blue-600">(Temporary grade)</span>
                    )}
                    {user.isAuthenticated && (
                      <span className="ml-2 text-xs text-green-600">✓ Google Account</span>
                    )}
                  </div>
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
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleShowSettings}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {user.isAuthenticated ? 'Sign Out' : 'Logout'}
                  </button>
                </div>
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
        
        {currentView === 'game-mode-selector' && user && (
          <GameModeSelector user={user} onModeSelect={handleGameModeSelect} />
        )}
        
        {currentView === 'topic-selector' && user && (
          <TopicSelector onTopicSelect={handleTopicSelect} />
        )}
        
        {currentView === 'game-board' && user && (
          <GameBoard
            key={`${gameMode}-${getEffectiveGrade()}`}
            selectedTopic={selectedTopic}
            user={getEffectiveUser()!}
            gameMode={gameMode}
            onGameComplete={handleGameComplete}
            onBackToTopics={handleBackToTopics}
            onShowArchives={handleShowArchives}
            onGradeChange={handleGradeChange}
          />
        )}

        {currentView === 'daily-archives' && user && (
          <DailyArchives user={user} onBack={handleBackFromArchives} />
        )}

        {currentView === 'user-settings' && user && (
          <UserSettings 
            user={user} 
            onBack={handleBackFromSettings} 
            onUserUpdate={handleUserUpdate}
          />
        )}

        {currentView === 'grade-selector' && user && (
          <GradeSelector
            user={user}
            onGradeSelect={handleGradeChange}
            onBack={() => setCurrentView('game-board')}
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