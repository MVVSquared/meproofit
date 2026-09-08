import { Correction, SentenceError } from '../types';
import { validateAndSanitizeSentence, normalizeSentenceInput, isSafeInput } from './inputSanitization';

type AlignPair = { leftIndex: number | null; rightIndex: number | null };

export interface CompletionCopy {
  emoji: string;
  headline: string;
  shortLabel: string;
  cardClass: string;
  textClass: string;
  mutedTextClass: string;
  badgeClass: string;
}

const RESULT_STYLES = {
  perfect: {
    cardClass: 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-md',
    textClass: 'text-amber-700',
    mutedTextClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800'
  },
  excellent: {
    cardClass: 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-md',
    textClass: 'text-green-700',
    mutedTextClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-800'
  },
  goodJob: {
    cardClass: 'border-sky-300 bg-sky-50 hover:border-sky-400 hover:shadow-md',
    textClass: 'text-sky-700',
    mutedTextClass: 'text-sky-600',
    badgeClass: 'bg-sky-100 text-sky-800'
  },
  whew: {
    cardClass: 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:shadow-md',
    textClass: 'text-orange-700',
    mutedTextClass: 'text-orange-600',
    badgeClass: 'bg-orange-100 text-orange-800'
  },
  missed: {
    cardClass: 'border-rose-300 bg-rose-50 hover:border-rose-400 hover:shadow-md',
    textClass: 'text-rose-700',
    mutedTextClass: 'text-rose-600',
    badgeClass: 'bg-rose-100 text-rose-800'
  },
  finished: {
    cardClass: 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:shadow-md',
    textClass: 'text-slate-700',
    mutedTextClass: 'text-slate-600',
    badgeClass: 'bg-slate-100 text-slate-800'
  }
} as const;

export class GameLogic {
  static normalizeForCompare(str: string): string {
    return str
      .replace(/[''′‛]/g, "'")
      .replace(/[""″‟]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\u2019/g, "'");
  }

  static tokenize(sentence: string): string[] {
    return this.normalizeForCompare(sentence).trim().split(/\s+/).filter(Boolean);
  }

  static checkCorrections(
    userInput: string,
    correctSentence: string,
    originalIncorrectSentence: string,
    _errors: SentenceError[]
  ): Correction[] {
    const userWords = this.tokenize(userInput);
    const originalWords = this.tokenize(originalIncorrectSentence);
    const correctWords = this.tokenize(correctSentence);
    const intendedByOriginalIndex = this.mapIntendedFixes(originalWords, correctWords);
    const alignment = this.alignWords(originalWords, userWords);
    const corrections: Correction[] = [];

    alignment.forEach(pair => {
      if (pair.rightIndex === null) {
        return;
      }

      const userWord = userWords[pair.rightIndex];
      const originalWord = pair.leftIndex !== null ? originalWords[pair.leftIndex] : '';

      if (pair.leftIndex !== null && userWord === originalWord) {
        return;
      }

      let isCorrectChange = false;
      if (pair.leftIndex !== null && intendedByOriginalIndex.has(pair.leftIndex)) {
        isCorrectChange = userWord === intendedByOriginalIndex.get(pair.leftIndex);
      } else if (pair.leftIndex !== null && pair.leftIndex < correctWords.length) {
        isCorrectChange = userWord === correctWords[pair.leftIndex];
      } else if (pair.rightIndex < correctWords.length) {
        isCorrectChange = userWord === correctWords[pair.rightIndex];
      }

      corrections.push({
        type: isCorrectChange ? 'correct' : 'incorrect',
        originalText: originalWord,
        correctedText: userWord,
        position: pair.rightIndex
      });
    });

    return corrections;
  }

  private static mapIntendedFixes(originalWords: string[], correctWords: string[]): Map<number, string> {
    const intended = new Map<number, string>();

    if (originalWords.length === correctWords.length) {
      originalWords.forEach((word, index) => {
        if (word !== correctWords[index]) {
          intended.set(index, correctWords[index]);
        }
      });
      return intended;
    }

    this.alignWords(originalWords, correctWords).forEach(pair => {
      if (pair.leftIndex === null || pair.rightIndex === null) {
        return;
      }
      if (originalWords[pair.leftIndex] !== correctWords[pair.rightIndex]) {
        intended.set(pair.leftIndex, correctWords[pair.rightIndex]);
      }
    });

    return intended;
  }

  private static alignWords(left: string[], right: string[]): AlignPair[] {
    const pairs: AlignPair[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] === right[rightIndex]) {
        pairs.push({ leftIndex, rightIndex });
        leftIndex += 1;
        rightIndex += 1;
        continue;
      }

      const nextLeft = this.findAhead(left, right[rightIndex], leftIndex + 1);
      const nextRight = this.findAhead(right, left[leftIndex], rightIndex + 1);

      if (nextLeft !== -1 && (nextRight === -1 || nextLeft - leftIndex <= nextRight - rightIndex)) {
        while (leftIndex < nextLeft) {
          pairs.push({ leftIndex, rightIndex: null });
          leftIndex += 1;
        }
      } else if (nextRight !== -1) {
        while (rightIndex < nextRight) {
          pairs.push({ leftIndex: null, rightIndex });
          rightIndex += 1;
        }
      } else {
        pairs.push({ leftIndex, rightIndex });
        leftIndex += 1;
        rightIndex += 1;
      }
    }

    while (leftIndex < left.length) {
      pairs.push({ leftIndex, rightIndex: null });
      leftIndex += 1;
    }
    while (rightIndex < right.length) {
      pairs.push({ leftIndex: null, rightIndex });
      rightIndex += 1;
    }

    return pairs;
  }

  private static findAhead(words: string[], target: string, start: number, window: number = 3): number {
    const end = Math.min(words.length, start + window);
    for (let index = start; index < end; index += 1) {
      if (words[index] === target) {
        return index;
      }
    }
    return -1;
  }

  static getCompletionCopy(
    gotItRight: boolean | null,
    attempts: number,
    options?: { maxAttempts?: number; isDaily?: boolean }
  ): CompletionCopy {
    const maxAttempts = options?.maxAttempts ?? 4;
    const isDaily = options?.isDaily ?? true;

    if (gotItRight) {
      if (attempts <= 1) {
        return {
          emoji: '🌟',
          headline: 'Perfect! You got it in 1 guess.',
          shortLabel: 'Perfect',
          ...RESULT_STYLES.perfect
        };
      }
      if (attempts === 2) {
        return {
          emoji: '🎉',
          headline: 'Excellent! You got it in 2 guesses.',
          shortLabel: 'Excellent',
          ...RESULT_STYLES.excellent
        };
      }
      if (attempts === 3) {
        return {
          emoji: '👍',
          headline: 'Good job! You got it in 3 guesses.',
          shortLabel: 'Good job',
          ...RESULT_STYLES.goodJob
        };
      }
      return {
        emoji: '😅',
        headline: 'Whew! You got it on the final guess.',
        shortLabel: 'Whew',
        ...RESULT_STYLES.whew
      };
    }

    if (gotItRight === false) {
      return {
        emoji: '🌤️',
        headline: isDaily
          ? 'Too bad, but come back tomorrow to try again.'
          : 'Too bad — try another sentence.',
        shortLabel: isDaily ? 'Try tomorrow' : 'Try again',
        ...RESULT_STYLES.missed
      };
    }

    return {
      emoji: '📝',
      headline: attempts === maxAttempts
        ? 'You used all 4 guesses.'
        : `You finished in ${attempts} guess${attempts === 1 ? '' : 'es'}.`,
      shortLabel: `${attempts} guess${attempts === 1 ? '' : 'es'}`,
      ...RESULT_STYLES.finished
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
