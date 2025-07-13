import React, { useState, useEffect, useCallback } from 'react';
import { Topic, GameSentence, Correction, User } from '../types';
import { LLMService } from '../services/llmService';
import { GameLogic } from '../utils/gameLogic';
import { RotateCcw } from 'lucide-react';

interface GameBoardProps {
  selectedTopic: Topic;
  user: User;
  onGameComplete: (score: number) => void;
  onBackToTopics: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  selectedTopic,
  user,
  onGameComplete,
  onBackToTopics
}) => {
  const [currentSentence, setCurrentSentence] = useState<GameSentence | null>(null);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(4);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const generateNewSentence = useCallback(async () => {
    setIsLoading(true);
    setUserInput('');
    setAttempts(0);
    setCorrections([]);
    setIsComplete(false);
    setShowHint(false);

    try {
      // Try to get sentence from LLM using user's difficulty level
      console.log('Attempting to generate sentence for topic:', selectedTopic.name);
      console.log('API Key status:', process.env.REACT_APP_OPENAI_API_KEY ? 'Present' : 'Missing');
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
    } catch (error) {
      console.error('Error generating sentence:', error);
      console.log('Using fallback sentence for topic:', selectedTopic.id);
      
      // Use fallback sentence
      const fallback = LLMService.getFallbackSentence(selectedTopic.id, user.grade);
      const gameSentence: GameSentence = {
        id: Date.now().toString(),
        incorrectSentence: fallback.incorrectSentence,
        correctSentence: fallback.correctSentence,
        topic: selectedTopic.name,
        difficulty: user.difficulty,
        errors: fallback.errors
      };
      setCurrentSentence(gameSentence);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopic, user.difficulty, user.grade]);

  useEffect(() => {
    generateNewSentence();
  }, [generateNewSentence]);

  const handleSubmit = () => {
    if (!currentSentence || !GameLogic.validateUserInput(userInput)) {
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const newCorrections = GameLogic.checkCorrections(
      userInput,
      currentSentence.correctSentence,
      currentSentence.incorrectSentence,
      currentSentence.errors
    );
    setCorrections(newCorrections);

    const isCorrect = GameLogic.isSentenceCorrect(userInput, currentSentence.correctSentence);
    
    if (isCorrect || newAttempts >= maxAttempts) {
      const finalScore = GameLogic.calculateScore(newAttempts, maxAttempts, newCorrections);
      setScore(finalScore);
      setIsComplete(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const renderHighlightedInput = () => {
    if (!userInput || corrections.length === 0) {
      return <span>{userInput}</span>;
    }

    const sortedCorrections = [...corrections].sort((a, b) => a.position - b.position);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedCorrections.forEach(correction => {
      // Add text before this correction
      if (correction.position > lastIndex) {
        parts.push(userInput.substring(lastIndex, correction.position));
      }

      // Add the highlighted correction
      const className = correction.type === 'correct' 
        ? 'bg-green-200 text-green-800 font-semibold' 
        : 'bg-red-200 text-red-800 font-semibold';
      
      parts.push(
        <span key={correction.position} className={className}>
          {correction.correctedText}
        </span>
      );

      lastIndex = correction.position + correction.correctedText.length;
    });

    // Add any remaining text
    if (lastIndex < userInput.length) {
      parts.push(userInput.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Generating your sentence...</p>
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
            {GameLogic.isSentenceCorrect(userInput, currentSentence!.correctSentence) 
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
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={generateNewSentence}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              New Sentence
            </button>
            <button
              onClick={onBackToTopics}
              className="btn-secondary"
            >
              Choose Different Topic
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedTopic.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedTopic.name}</h2>
              <p className="text-sm text-gray-500">
                Attempt {attempts + 1} of {maxAttempts} • {user.name} ({user.grade})
              </p>
            </div>
          </div>
          <button
            onClick={onBackToTopics}
            className="btn-secondary text-sm"
          >
            Change Topic
          </button>
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
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your corrected sentence here..."
            className="input-field min-h-[100px] resize-none"
            disabled={isComplete}
          />
        </div>

        {/* Highlighted Preview */}
        {corrections.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Your Changes:</h3>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="text-lg text-gray-800 whitespace-pre-wrap">
                {renderHighlightedInput()}
              </div>
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
            disabled={!userInput.trim() || isComplete}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Correction
          </button>
        </div>
      </div>
    </div>
  );
}; 