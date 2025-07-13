import { Correction, SentenceError } from '../types';

export class GameLogic {
  static checkCorrections(
    userInput: string,
    correctSentence: string,
    originalIncorrectSentence: string,
    errors: SentenceError[]
  ): Correction[] {
    const corrections: Correction[] = [];
    
    // Create a map of expected corrections from the original sentence
    const expectedCorrections = new Map<string, string>();
    errors.forEach(error => {
      expectedCorrections.set(error.incorrectText, error.correctText);
    });

    // Split sentences into words for comparison
    const userWords = userInput.split(' ');
    const originalWords = originalIncorrectSentence.split(' ');
    const correctWords = correctSentence.split(' ');
    
    // Only show feedback for words that the player actually changed
    for (let i = 0; i < userWords.length && i < originalWords.length; i++) {
      const userWord = userWords[i];
      const originalWord = originalWords[i];
      const correctWord = correctWords[i] || '';
      
      // Only show feedback if the player changed this word from the original
      if (userWord !== originalWord) {
        // Check if their change was correct
        if (userWord === correctWord) {
          corrections.push({
            type: 'correct',
            originalText: originalWord,
            correctedText: userWord,
            position: i
          });
        } else {
          corrections.push({
            type: 'incorrect',
            originalText: originalWord,
            correctedText: userWord,
            position: i
          });
        }
      }
    }
    
    // Handle case where user added extra words
    for (let i = originalWords.length; i < userWords.length; i++) {
      corrections.push({
        type: 'incorrect',
        originalText: '',
        correctedText: userWords[i],
        position: i
      });
    }
    
    return corrections;
  }

  static isSentenceCorrect(userInput: string, correctSentence: string): boolean {
    return userInput.trim() === correctSentence.trim();
  }

  static calculateScore(attempts: number, maxAttempts: number, corrections: Correction[]): number {
    const baseScore = 100;
    const attemptPenalty = (attempts - 1) * 20;
    const correctionBonus = corrections.filter(c => c.type === 'correct').length * 10;
    
    return Math.max(0, baseScore - attemptPenalty + correctionBonus);
  }

  static getDifficultyLevel(grade: number): 'easy' | 'medium' | 'hard' {
    if (grade <= 3) return 'easy';
    if (grade <= 4) return 'medium';
    return 'hard';
  }

  static validateUserInput(input: string): boolean {
    // Basic validation - ensure input is not empty and contains reasonable characters
    return input.trim().length > 0 && /^[a-zA-Z0-9\s.,!?;:'"()-]+$/.test(input);
  }
} 