import React from 'react';
import { Topic } from '../types';
import { TOPICS } from '../data/topics';

interface TopicSelectorProps {
  onTopicSelect: (topic: Topic) => void;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({ onTopicSelect }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to MeProofIt! 🎯
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Choose a topic to start practicing spelling and punctuation
        </p>
        <p className="text-lg text-gray-500">
          You'll have 4 tries to correct all the errors in each sentence
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onTopicSelect(topic)}
            className="card hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-center group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
              {topic.icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{topic.name}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {topic.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full">
          <span className="text-sm font-medium">💡 Tip:</span>
          <span className="text-sm">
            Start with topics you're most interested in!
          </span>
        </div>
      </div>
    </div>
  );
}; 