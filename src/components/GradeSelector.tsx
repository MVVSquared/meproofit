import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeft } from 'lucide-react';

interface GradeSelectorProps {
  user: User;
  onGradeSelect: (grade: string) => void;
  onBack: () => void;
}

export const GradeSelector: React.FC<GradeSelectorProps> = ({
  user,
  onGradeSelect,
  onBack
}) => {
  const [selectedGrade, setSelectedGrade] = useState(user.grade);

  const grades = [
    { value: 'K', label: 'K', description: 'Kindergarten' },
    { value: '1st', label: '1st', description: 'First Grade' },
    { value: '2nd', label: '2nd', description: 'Second Grade' },
    { value: '3rd', label: '3rd', description: 'Third Grade' },
    { value: '4th', label: '4th', description: 'Fourth Grade' },
    { value: '5th', label: '5th', description: 'Fifth Grade' },
    { value: 'middle', label: 'Middle', description: 'Middle School' },
    { value: 'high', label: 'High', description: 'High School' },
    { value: 'beyond', label: 'Beyond', description: 'Advanced' }
  ];

  const handleGradeSelect = () => {
    onGradeSelect(selectedGrade);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Game
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Choose a Grade Level
          </h1>
          <p className="text-lg text-gray-600">
            Select a different grade to try their daily challenge
          </p>
        </div>

        {/* Grade Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {grades.map((grade) => (
            <button
              key={grade.value}
              onClick={() => setSelectedGrade(grade.value)}
              className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedGrade === grade.value
                  ? 'border-primary-500 bg-primary-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  selectedGrade === grade.value ? 'text-primary-600' : 'text-gray-700'
                }`}>
                  {grade.label}
                </div>
                <div className={`text-sm ${
                  selectedGrade === grade.value ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {grade.description}
                </div>
                {grade.value === user.grade && (
                  <div className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Your default grade
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Grade Info */}
        <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Selected Grade: {selectedGrade}
            </h3>
            <p className="text-gray-600">
              {selectedGrade === user.grade 
                ? "This is your default grade level."
                : `You'll be trying a daily challenge designed for ${selectedGrade} grade students.`
              }
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onBack}
            className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGradeSelect}
            className="px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold"
          >
            Try This Grade
          </button>
        </div>
      </div>
    </div>
  );
}; 