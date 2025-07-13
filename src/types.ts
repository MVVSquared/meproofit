export interface Topic {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface User {
  name: string;
  grade: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameSentence {
  id: string;
  incorrectSentence: string;
  correctSentence: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  errors: SentenceError[];
}

export interface SentenceError {
  type: 'spelling' | 'punctuation' | 'capitalization';
  incorrectText: string;
  correctText: string;
  position: number;
}

export interface GameState {
  currentSentence: GameSentence | null;
  userInput: string;
  attempts: number;
  maxAttempts: number;
  corrections: Correction[];
  isComplete: boolean;
  score: number;
}

export interface Correction {
  type: 'correct' | 'incorrect';
  originalText: string;
  correctedText: string;
  position: number;
}

export interface LLMResponse {
  incorrectSentence: string;
  correctSentence: string;
  errors: SentenceError[];
} 