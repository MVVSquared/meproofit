import React, { useState, useEffect, useCallback } from 'react';
import { Topic, GameSentence, Correction } from '../types';
import { LLMService } from '../services/llmService';
import { GameLogic } from '../utils/gameLogic';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface GameBoardProps {
  selectedTopic: Topic;
  onGameComplete: (score: number) => void;
  onBackToTopics: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  selectedTopic,
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
      // Try to get sentence from LLM, fallback to predefined if API not available
      let llmResponse;
      try {
        llmResponse = await LLMService.generateSentenceWithErrors(
          selectedTopic.name,
          'medium'
        );
      } catch (error) {
        console.log('Using fallback sentence');
        llmResponse = LLMService.getFallbackSentence(selectedTopic.id);
      }

      const gameSentence: GameSentence = {
        id: Date.now().toString(),
        incorrectSentence: llmResponse.incorrectSentence,
        correctSentence: llmResponse.correctSentence,
        topic: selectedTopic.name,
        difficulty: 'medium',
        errors: llmResponse.errors
      };

      setCurrentSentence(gameSentence);
    } catch (error) {
      console.error('Error generating sentence:', error);
      // Use fallback sentence
      const fallback = LLMService.getFallbackSentence(selectedTopic.id);
      const gameSentence: GameSentence = {
        id: Date.now().toString(),
        incorrectSentence: fallback.incorrectSentence,
        correctSentence: fallback.correctSentence,
        topic: selectedTopic.name,
        difficulty: 'medium',
        errors: fallback.errors
      };
      setCurrentSentence(gameSentence);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopic]);

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
              <p className="text-sm text-gray-500">Attempt {attempts + 1} of {maxAttempts}</p>
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

        {/* Corrections Display */}
        {corrections.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Your Changes:</h3>
            <div className="space-y-2">
              {corrections.map((correction, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    correction.type === 'correct' 
                      ? 'bg-success-50 border-success-200' 
                      : 'bg-error-50 border-error-200'
                  }`}
                >
                  {correction.type === 'correct' ? (
                    <CheckCircle className="text-success-600" size={20} />
                  ) : (
                    <XCircle className="text-error-600" size={20} />
                  )}
                  <span className="text-sm">
                    <span className="font-medium">"{correction.originalText}"</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">"{correction.correctedText}"</span>
                  </span>
                </div>
              ))}
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