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
    
    // Use a more flexible approach to detect changes
    let userIndex = 0;
    let originalIndex = 0;
    
    while (userIndex < userWords.length && originalIndex < originalWords.length) {
      const userWord = userWords[userIndex];
      const originalWord = originalWords[originalIndex];
      
      // If words match, move both indices forward
      if (userWord === originalWord) {
        userIndex++;
        originalIndex++;
        continue;
      }
      
      // Check if this is a known error correction
      const expectedCorrection = expectedCorrections.get(originalWord);
      if (expectedCorrection && userWord === expectedCorrection) {
        corrections.push({
          type: 'correct',
          originalText: originalWord,
          correctedText: userWord,
          position: userIndex
        });
        userIndex++;
        originalIndex++;
        continue;
      }
      
      // Check if user split a word (e.g., "Highschool" -> "High school")
      if (originalWord && userWord && originalWord.length > userWord.length && userIndex + 1 < userWords.length) {
        const nextUserWord = userWords[userIndex + 1];
        const combinedWords = userWord + ' ' + nextUserWord;
        
        if (combinedWords === originalWord) {
          // User split a word correctly
          corrections.push({
            type: 'correct',
            originalText: originalWord,
            correctedText: userWord + ' ' + nextUserWord,
            position: userIndex
          });
          userIndex += 2; // Skip both words
          originalIndex++;
          continue;
        }
      }
      
      // Check if user combined words (e.g., "High school" -> "Highschool")
      if (userWord && originalWord && userWord.length > originalWord.length && originalIndex + 1 < originalWords.length) {
        const nextOriginalWord = originalWords[originalIndex + 1];
        const combinedOriginal = originalWord + ' ' + nextOriginalWord;
        
        if (userWord === combinedOriginal) {
          // User combined words correctly
          corrections.push({
            type: 'correct',
            originalText: originalWord + ' ' + nextOriginalWord,
            correctedText: userWord,
            position: userIndex
          });
          userIndex++;
          originalIndex += 2; // Skip both original words
          continue;
        }
      }
      
      // If we get here, it's an incorrect change
      corrections.push({
        type: 'incorrect',
        originalText: originalWord,
        correctedText: userWord,
        position: userIndex
      });
      
      userIndex++;
      originalIndex++;
    }
    
    // Handle remaining words
    while (userIndex < userWords.length) {
      corrections.push({
        type: 'incorrect',
        originalText: '',
        correctedText: userWords[userIndex],
        position: userIndex
      });
      userIndex++;
    }
    
    return corrections;
  }

  static isSentenceCorrect(userInput: string, correctSentence: string): boolean {
    // Normalize both strings for comparison
    const normalizeString = (str: string) => {
      return str
        .trim()
        .replace(/\s+/g, ' '); // Replace multiple spaces with single space
    };
    
    return normalizeString(userInput) === normalizeString(correctSentence);
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
    // Allow both straight and curly quotes/apostrophes, plus common punctuation
    if (input.trim().length === 0) return false;
    
    // Normalize the input to handle curly quotes and other special characters
    const normalizedInput = input
      .replace(/[''′]/g, "'")  // Replace curly/smart apostrophes with straight ones
      .replace(/[""″]/g, '"')  // Replace curly/smart quotes with straight ones
      .replace(/[–—]/g, '-');  // Replace em/en dashes with hyphens
    
    // Now test with the normalized input - hyphen doesn't need escaping in character class
    return /^[a-zA-Z0-9\s.,!?;:'"()\-]+$/.test(normalizedInput);
  }
} 