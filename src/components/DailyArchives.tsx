import React, { useState, useEffect, useCallback } from 'react';
import { ArchiveEntry, User } from '../types';
import { DailySentenceService } from '../services/dailySentenceService';
import { ArrowLeft, Calendar, Trophy } from 'lucide-react';

interface DailyArchivesProps {
  user: User;
  onBack: () => void;
}

export const DailyArchives: React.FC<DailyArchivesProps> = ({ user, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState(user.grade);
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const loadArchives = useCallback(() => {
    setIsLoading(true);
    const gradeArchives = DailySentenceService.getArchiveForGrade(selectedGrade);
    setArchives(gradeArchives);
    setIsLoading(false);
  }, [selectedGrade]);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getGradeLabel = (grade: string): string => {
    const option = gradeOptions.find(opt => opt.value === grade);
    return option ? option.label : grade;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Game
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Daily Archives</h1>
      </div>

      {/* Grade Selector */}
      <div className="card mb-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse Daily Challenges</h2>
          <p className="text-sm text-gray-600">
            Select a grade level to explore past daily sentences
          </p>
        </div>
        
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {gradeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedGrade(option.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedGrade === option.value
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              {option.value}
            </button>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Currently viewing: <span className="font-medium text-primary-600">{getGradeLabel(selectedGrade)}</span>
            {selectedGrade !== user.grade && (
              <span className="ml-2">
                • <button 
                  onClick={() => setSelectedGrade(user.grade)}
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  Switch to your grade ({user.grade})
                </button>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Archives List */}
      {isLoading ? (
        <div className="card text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading archives...</p>
        </div>
      ) : archives.length === 0 ? (
        <div className="card text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Archives Yet for {getGradeLabel(selectedGrade)}
          </h3>
          <p className="text-gray-600 mb-4">
            Complete some daily challenges for {getGradeLabel(selectedGrade)} to see them here!
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Try selecting a different grade level above to explore daily challenges from other grade levels. 
              You can practice with easier or more challenging content!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {archives.map((entry, index) => (
            <div key={`${entry.date}-${entry.grade}`} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <span className="font-semibold text-gray-900">
                      {formatDate(entry.date)}
                    </span>
                    <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                      {entry.topic}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Original Sentence:</h4>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-gray-800">{entry.incorrectSentence}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Correct Answer:</h4>
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-gray-800">{entry.correctSentence}</p>
                    </div>
                  </div>
                </div>
                
                {/* Score Display */}
                {entry.userScore !== undefined && (
                  <div className="ml-6 text-center">
                    <div className="bg-primary-50 rounded-lg p-4 min-w-[80px]">
                      <div className="flex items-center justify-center mb-2">
                        <Trophy className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="text-2xl font-bold text-primary-600">
                        {entry.userScore}
                      </div>
                      <div className="text-xs text-gray-600">
                        {entry.userAttempts} attempt{entry.userAttempts !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {archives.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {archives.length}
              </div>
              <div className="text-sm text-gray-600">Challenges Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {archives.filter(entry => entry.userScore !== undefined).length}
              </div>
              <div className="text-sm text-gray-600">With Scores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(
                  archives
                    .filter(entry => entry.userScore !== undefined)
                    .reduce((sum, entry) => sum + (entry.userScore || 0), 0) / 
                  archives.filter(entry => entry.userScore !== undefined).length
                ) || 0}
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(
                  archives
                    .filter(entry => entry.userAttempts !== undefined)
                    .reduce((sum, entry) => sum + (entry.userAttempts || 0), 0) / 
                  archives.filter(entry => entry.userAttempts !== undefined).length
                ) || 0}
              </div>
              <div className="text-sm text-gray-600">Avg Attempts</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 