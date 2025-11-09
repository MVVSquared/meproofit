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
  // Google account information (optional)
  googleId?: string;
  email?: string;
  picture?: string;
  // Authentication metadata
  isAuthenticated?: boolean;
  lastLogin?: string;
}

export type GameMode = 'daily' | 'random';

export interface GameSentence {
  id: string;
  incorrectSentence: string;
  correctSentence: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  errors: SentenceError[];
}

export interface DailySentence extends GameSentence {
  date: string; // YYYY-MM-DD format
  grade: string;
  isDaily: true;
}

export interface ArchiveEntry {
  date: string;
  grade: string;
  topic: string;
  incorrectSentence: string;
  correctSentence: string;
  userScore?: number;
  userAttempts?: number;
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