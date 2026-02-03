import React, { useState, useEffect, useCallback } from 'react';
import { Topic, GameSentence, Correction, User, GameMode, DailySentence } from '../types';
import { LLMService } from '../services/llmService';
import { DailySentenceService } from '../services/dailySentenceService';
import { GameLogic } from '../utils/gameLogic';
import { sanitizeString, validateAndSanitizeSentence } from '../utils/inputSanitization';
import { RotateCcw, Archive } from 'lucide-react';
// Database import kept for future use when Test DB button is re-enabled
// import { Database } from 'lucide-react';

interface GameBoardProps {
  selectedTopic: Topic | null;
  user: User;
  gameMode: GameMode | null;
  onGameComplete: (score: number) => void;
  onBackToTopics: () => void;
  onShowArchives: () => void;
  onGradeChange?: (newGrade: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  selectedTopic,
  user,
  gameMode,
  onGameComplete,
  onBackToTopics,
  onShowArchives,
  onGradeChange
}) => {
  const [currentSentence, setCurrentSentence] = useState<GameSentence | null>(null);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(4);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<Array<{
    attempt: number;
    userInput: string;
    corrections: Correction[];
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Normalize user input to handle curly quotes and special characters
  const normalizeString = (str: string) => {
    return str
      .replace(/[''′‛]/g, "'")  // Replace curly/smart apostrophes with straight ones
      .replace(/[""″‟]/g, '"')  // Replace curly/smart quotes with straight ones
      .replace(/[–—]/g, '-')  // Replace em/en dashes with hyphens
      .replace(/\u2019/g, "'"); // Replace right single quotation mark (U+2019) with straight apostrophe
  };

  const generateNewSentence = useCallback(async (gradeOverride?: string) => {
    setIsLoading(true);
    setAttempts(0);
    setCorrections([]);
    setAttemptHistory([]);
    setIsComplete(false);
    setShowHint(false);

    try {
      if (gameMode === 'daily') {
        // Generate daily sentence
        console.log('Generating daily sentence for user:', user.name, 'with grade:', gradeOverride || user.grade);
        
        // If we have a grade override, create a temporary user object with that grade
        const userForSentence = gradeOverride ? { ...user, grade: gradeOverride } : user;
        const dailySentence = await DailySentenceService.getTodaysSentence(userForSentence);
        
        console.log('Setting currentSentence state to:', dailySentence);
        setCurrentSentence(dailySentence);
        
        // Ensure userInput is properly initialized
        if (dailySentence && dailySentence.incorrectSentence) {
          console.log('Setting userInput to:', dailySentence.incorrectSentence);
          setUserInput(dailySentence.incorrectSentence);
        } else {
          console.log('Setting userInput to empty string (fallback)');
          setUserInput(''); // Fallback to empty string
        }
      } else {
        // Generate random sentence
        if (!selectedTopic) {
          console.error('No topic selected for random mode');
          return;
        }
        
        console.log('Attempting to generate sentence for topic:', selectedTopic.name);
        console.log('User difficulty:', user.difficulty);
        
        const llmResponse = await LLMService.generateSentenceWithErrors(
          selectedTopic.name,
          user.difficulty,
          user.grade
        );

        console.log('Generated sentence:', llmResponse.incorrectSentence);

        const gameSentence: GameSentence = {
          id: Date.now().toString(),
          incorrectSentence: llmResponse.incorrectSentence,
          correctSentence: llmResponse.correctSentence,
          topic: selectedTopic.name,
          difficulty: user.difficulty,
          errors: llmResponse.errors
        };

        setCurrentSentence(gameSentence);
        setUserInput(gameSentence.incorrectSentence); // Pre-fill with incorrect sentence
      }
    } catch (error) {
      console.error('Error generating sentence:', error);
      
      if (gameMode === 'daily') {
        // For daily mode, we need to handle this differently
        console.log('Using fallback daily sentence');
        const fallbackDaily = DailySentenceService.getFallbackDailySentence(
          DailySentenceService.getTodayDate(),
          user.grade,
          { id: 'fallback', name: 'Daily Challenge' }
        );
        setCurrentSentence(fallbackDaily);
        setUserInput(fallbackDaily.incorrectSentence); // Pre-fill with incorrect sentence
      } else {
        // Use fallback sentence for random mode
        console.log('Using fallback sentence for topic:', selectedTopic?.id);
        const fallback = LLMService.getFallbackSentence(selectedTopic?.id || 'basketball', user.grade);
        const gameSentence: GameSentence = {
          id: Date.now().toString(),
          incorrectSentence: fallback.incorrectSentence,
          correctSentence: fallback.correctSentence,
          topic: selectedTopic?.name || 'Basketball',
          difficulty: user.difficulty,
          errors: fallback.errors
        };
        setCurrentSentence(gameSentence);
        setUserInput(gameSentence.incorrectSentence); // Pre-fill with incorrect sentence
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopic, user, gameMode]);

  useEffect(() => {
    generateNewSentence();
  }, [generateNewSentence]);

  const handleSubmit = () => {
    if (!currentSentence) {
      return;
    }

    // Validate and sanitize user input
    const inputValidation = validateAndSanitizeSentence(userInput);
    if (!inputValidation.isValid) {
      alert(inputValidation.error || 'Please enter a valid sentence');
      return;
    }

    // Use sanitized input for processing
    const sanitizedInput = inputValidation.sanitized;
    
    if (!GameLogic.validateUserInput(sanitizedInput)) {
      alert('Invalid input. Please check your sentence and try again.');
      return;
    }

    const normalizedUserInput = normalizeString(sanitizedInput);

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const newCorrections = GameLogic.checkCorrections(
      normalizedUserInput,
      currentSentence.correctSentence,
      currentSentence.incorrectSentence,
      currentSentence.errors
    );
    setCorrections(newCorrections);

    // Save this attempt to history
    setAttemptHistory(prev => [...prev, {
      attempt: newAttempts,
      userInput: userInput,
      corrections: newCorrections
    }]);

    const isCorrect = GameLogic.isSentenceCorrect(normalizedUserInput, currentSentence.correctSentence);
    
    // Debug logging
    console.log('Original user input:', JSON.stringify(userInput));
    console.log('Normalized user input:', JSON.stringify(normalizedUserInput));
    console.log('Correct sentence:', JSON.stringify(currentSentence.correctSentence));
    console.log('Is correct:', isCorrect);
    
    if (isCorrect || newAttempts >= maxAttempts) {
      const finalScore = GameLogic.calculateScore(newAttempts, maxAttempts, newCorrections);
      setScore(finalScore);
      setIsComplete(true);

      // Save daily result if in daily mode
      if (gameMode === 'daily' && currentSentence) {
        const dailySentence = currentSentence as DailySentence;
        DailySentenceService.saveDailyResult(
          dailySentence.date,
          dailySentence.grade,
          dailySentence.topic,
          dailySentence.incorrectSentence,
          dailySentence.correctSentence,
          finalScore,
          newAttempts
        );
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const renderHighlightedInput = (inputText: string, inputCorrections: Correction[]) => {
    if (!inputText || inputCorrections.length === 0) {
      return <span>{inputText}</span>;
    }

    const userWords = inputText.split(' ');
    const parts: React.ReactNode[] = [];

    userWords.forEach((word, wordIndex) => {
      // Check if this word position has a correction
      const correction = inputCorrections.find(c => c.position === wordIndex);
      
      if (correction) {
        // Add the highlighted correction
        const className = correction.type === 'correct' 
          ? 'bg-green-200 text-green-800 font-semibold' 
          : 'bg-red-200 text-red-800 font-semibold';
        
        parts.push(
          <span key={wordIndex} className={className}>
            {word}
          </span>
        );
      } else {
        // Add normal word
        parts.push(<span key={wordIndex}>{word}</span>);
      }
      
      // Add space between words (except for the last word)
      if (wordIndex < userWords.length - 1) {
        parts.push(' ');
      }
    });

    return <>{parts}</>;
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {gameMode === 'daily' ? 'Loading today\'s challenge...' : 'Generating your sentence...'}
          </p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {GameLogic.isSentenceCorrect(normalizeString(userInput), currentSentence!.correctSentence) 
              ? 'Great job! You got it right!' 
              : 'Game Over!'
            }
          </h2>
          
          <div className="mb-6">
            <div className="text-lg text-gray-600 mb-2">Your Score:</div>
            <div className="text-3xl font-bold text-primary-600">{score}</div>
          </div>

          <div className="mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Correct Answer:</h3>
            <div className="bg-gray-50 p-3 rounded-lg text-gray-700">
              {currentSentence!.correctSentence}
            </div>
            {!GameLogic.isSentenceCorrect(normalizeString(userInput), currentSentence!.correctSentence) && userInput.trim() && (
              <>
                <h3 className="font-semibold text-gray-900 mb-2 mt-4">Your last guess:</h3>
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-gray-700">
                  {userInput}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {gameMode === 'daily' ? (
              <>
                <button
                  onClick={onShowArchives}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Archive size={20} />
                  View Archives
                </button>
                <button
                  onClick={() => {
                    console.log('Try Different Grade button clicked - calling onGradeChange');
                    // Instead of showing modal, go to grade selection screen
                    if (onGradeChange) {
                      onGradeChange('select'); // Special value to indicate grade selection mode
                    }
                  }}
                  className="btn-secondary"
                >
                  Try Different Grade
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => generateNewSentence()}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} />
                  New Sentence
                </button>
                <button
                  onClick={onBackToTopics}
                  className="btn-secondary"
                >
                  New Topic
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    console.log('Rendering: currentSentence is null/undefined');
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('Rendering with currentSentence:', currentSentence);
  console.log('userInput state:', userInput);

  return (
    <>
      <div className="max-w-2xl mx-auto p-6">
        <div className="card">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {gameMode === 'daily' ? '📅' : selectedTopic?.icon || '🎯'}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {gameMode === 'daily' ? 'Daily Challenge' : selectedTopic?.name || 'Game'}
                </h2>
                <p className="text-sm text-gray-500">
                  Attempt {attempts + 1} of {maxAttempts} • {user.name} ({user.grade}) • {gameMode === 'daily' ? 'Daily Mode' : 'Random Topic'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Archive and Test DB buttons removed - kept for future use if needed */}
              {/* 
              {gameMode === 'daily' && (
                <>
                  <button
                    onClick={onShowArchives}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Archive size={16} />
                    Archives
                  </button>
                  <button
                    onClick={async () => {
                      console.log('Testing database connection...');
                      try {
                        const status = await DailySentenceService.checkDatabaseStatus();
                        console.log('Database status:', status);
                        alert(`Database Status:\nConnected: ${status.connected}\nTables Exist: ${status.tablesExist}\nDaily Sentences: ${status.dailySentencesCount}`);
                      } catch (error) {
                        console.error('Database test failed:', error);
                        alert('Database test failed. Check console for details.');
                      }
                    }}
                    className="btn-secondary text-sm flex items-center gap-1"
                    title="Test Database Connection"
                  >
                    <Database size={16} />
                    Test DB
                  </button>
                </>
              )}
              */}
              {gameMode !== 'daily' && (
                <button
                  onClick={onBackToTopics}
                  className="btn-secondary text-sm"
                >
                  New Topic
                </button>
              )}
            </div>
          </div>

          {/* Original Sentence */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Original Sentence:</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-lg text-gray-800">{currentSentence.incorrectSentence}</p>
            </div>
          </div>

          {/* User Input */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Your Correction:</h3>
            <textarea
              value={userInput}
              onChange={(e) => {
                const newValue = e.target.value;
                // Validate input length
                if (newValue.length <= 1000) {
                  // Sanitize input in real-time
                  const sanitized = sanitizeString(newValue);
                  setUserInput(sanitized);
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your corrected sentence here..."
              className="input-field min-h-[100px] resize-none"
              disabled={isComplete}
              maxLength={1000}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
            />
          </div>

          {/* Attempt History */}
          {attemptHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your Attempts:</h3>
              <div className="space-y-3">
                {attemptHistory.map((attempt, index) => (
                  <div key={attempt.attempt} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Attempt {attempt.attempt}
                      </span>
                      <span className="text-xs text-gray-500">
                        {attempt.corrections.filter(c => c.type === 'correct').length} correct, 
                        {attempt.corrections.filter(c => c.type === 'incorrect').length} incorrect
                      </span>
                    </div>
                    <div className="text-lg text-gray-800 whitespace-pre-wrap">
                      {renderHighlightedInput(attempt.userInput, attempt.corrections)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend for highlights */}
          {corrections.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 rounded"></div>
                  <span>Correct changes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 rounded"></div>
                  <span>Incorrect changes</span>
                </div>
              </div>
            </div>
          )}

          {/* Hint */}
          {attempts > 0 && !showHint && (
            <div className="mb-6">
              <button
                onClick={() => setShowHint(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                💡 Need a hint?
              </button>
            </div>
          )}

          {showHint && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Hint:</strong> Look for spelling mistakes, missing punctuation, and capitalization errors.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!(userInput && userInput.trim()) || isComplete}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Correction
            </button>
          </div>
        </div>
      </div>

      {/* Grade selection is now handled by parent component */}
    </>
  );
}; 