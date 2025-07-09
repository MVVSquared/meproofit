import { GameSentence, Correction, SentenceError } from '../types';

export class GameLogic {
  static checkCorrections(
    userInput: string,
    correctSentence: string,
    errors: SentenceError[]
  ): Correction[] {
    const corrections: Correction[] = [];
    
    // Create a map of expected corrections
    const expectedCorrections = new Map<string, string>();
    errors.forEach(error => {
      expectedCorrections.set(error.incorrectText, error.correctText);
    });

    // Compare user input with correct sentence
    const userWords = userInput.split(' ');
    const correctWords = correctSentence.split(' ');
    
    let userIndex = 0;
    let correctIndex = 0;
    
    while (userIndex < userWords.length && correctIndex < correctWords.length) {
      const userWord = userWords[userIndex];
      const correctWord = correctWords[correctIndex];
      
      if (userWord === correctWord) {
        // Word is correct
        userIndex++;
        correctIndex++;
      } else {
        // Check if this is an expected correction
        const expectedCorrection = expectedCorrections.get(userWord);
        if (expectedCorrection && expectedCorrection === correctWord) {
          corrections.push({
            type: 'correct',
            originalText: userWord,
            correctedText: correctWord,
            position: userIndex
          });
        } else {
          corrections.push({
            type: 'incorrect',
            originalText: userWord,
            correctedText: correctWord,
            position: userIndex
          });
        }
        userIndex++;
        correctIndex++;
      }
    }
    
    // Handle extra or missing words
    while (userIndex < userWords.length) {
      corrections.push({
        type: 'incorrect',
        originalText: userWords[userIndex],
        correctedText: '',
        position: userIndex
      });
      userIndex++;
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