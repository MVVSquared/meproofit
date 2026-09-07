import { Correction, SentenceError } from '../types';
import { validateAndSanitizeSentence, normalizeSentenceInput, isSafeInput } from './inputSanitization';

export class GameLogic {
  static checkCorrections(
    userInput: string,
    correctSentence: string,
    originalIncorrectSentence: string,
    errors: SentenceError[]
  ): Correction[] {
    const corrections: Correction[] = [];
    
    // Normalize all sentences to handle curly quotes and special characters
    const normalizeString = (str: string) => {
      return str
        .replace(/[''′‛]/g, "'")  // Replace curly/smart apostrophes with straight ones
        .replace(/[""″‟]/g, '"')  // Replace curly/smart quotes with straight ones
        .replace(/[–—]/g, '-')  // Replace em/en dashes with hyphens
        .replace(/\u2019/g, "'"); // Replace right single quotation mark (U+2019) with straight apostrophe
    };
    
    const normalizedUserInput = normalizeString(userInput);
    const normalizedOriginalSentence = normalizeString(originalIncorrectSentence);
    
    // Create a map of expected corrections from the original sentence
    const expectedCorrections = new Map<string, string>();
    errors.forEach(error => {
      expectedCorrections.set(error.incorrectText, error.correctText);
    });

    // Split normalized sentences into words for comparison
    const userWords = normalizedUserInput.split(' ');
    const originalWords = normalizedOriginalSentence.split(' ');
    
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

  static getCompletionCopy(
    gotItRight: boolean | null,
    attempts: number,
    options?: { maxAttempts?: number; isDaily?: boolean }
  ): { emoji: string; headline: string; shortLabel: string } {
    const maxAttempts = options?.maxAttempts ?? 4;
    const isDaily = options?.isDaily ?? true;

    if (gotItRight) {
      if (attempts <= 1) {
        return {
          emoji: '🌟',
          headline: 'Perfect! You got it in 1 guess.',
          shortLabel: 'Perfect'
        };
      }
      if (attempts === 2) {
        return {
          emoji: '🎉',
          headline: 'Excellent! You got it in 2 guesses.',
          shortLabel: 'Excellent'
        };
      }
      if (attempts === 3) {
        return {
          emoji: '👍',
          headline: 'Good job! You got it in 3 guesses.',
          shortLabel: 'Good job'
        };
      }
      return {
        emoji: '😅',
        headline: 'Whew! You got it on the final guess.',
        shortLabel: 'Whew'
      };
    }

    if (gotItRight === false) {
      return {
        emoji: '🌤️',
        headline: isDaily
          ? 'Too bad, but come back tomorrow to try again.'
          : 'Too bad — try another sentence.',
        shortLabel: isDaily ? 'Try tomorrow' : 'Try again'
      };
    }

    return {
      emoji: '📝',
      headline: attempts === maxAttempts
        ? 'You used all 4 guesses.'
        : `You finished in ${attempts} guess${attempts === 1 ? '' : 'es'}.`,
      shortLabel: `${attempts} guess${attempts === 1 ? '' : 'es'}`
    };
  }

  static didSucceedFromResult(
    userInput: string | undefined,
    correctSentence: string,
    attempts: number | undefined,
    maxAttempts: number = 4
  ): boolean | null {
    if (userInput && userInput.trim()) {
      return this.isSentenceCorrect(userInput, correctSentence);
    }
    if (attempts && attempts < maxAttempts) {
      return true;
    }
    return null;
  }

  static isSentenceCorrect(userInput: string, correctSentence: string): boolean {
    // Normalize both strings for comparison - handle both spaces and special characters
    const normalizeString = (str: string) => {
      return str
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[''′‛]/g, "'")  // Replace curly/smart apostrophes with straight ones
        .replace(/[""″‟]/g, '"')  // Replace curly/smart quotes with straight ones
        .replace(/[–—]/g, '-')  // Replace em/en dashes with hyphens
        .replace(/\u2019/g, "'"); // Replace right single quotation mark (U+2019) with straight apostrophe
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
    // Use sanitization utility for validation
    const validation = validateAndSanitizeSentence(input);
    
    if (!validation.isValid) {
      if (validation.error) {
        console.warn('Input validation failed:', validation.error);
      }
      return false;
    }
    
    // Additional check for safe input patterns
    if (!isSafeInput(input)) {
      console.warn('Potentially unsafe input detected');
      return false;
    }
    
    return true;
  }

  /**
   * Sanitizes user input before processing
   * @param input - Raw user input
   * @returns Sanitized input safe for processing
   */
  static sanitizeUserInput(input: string): string {
    const validation = validateAndSanitizeSentence(input);
    if (validation.isValid) {
      return normalizeSentenceInput(validation.sanitized);
    }
    return normalizeSentenceInput(input); // Fallback to normalization only
  }
}
