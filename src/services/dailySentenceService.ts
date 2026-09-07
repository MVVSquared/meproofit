import { DailySentence, ArchiveEntry, User, Correction } from '../types';
import { LLMService } from './llmService';
import { DatabaseService } from './databaseService';
import { TOPICS } from '../data/topics';
import { debugLog } from '../utils/debug';

export class DailySentenceService {
  private static readonly DAILY_SENTENCE_KEY = 'meproofit-daily-sentences';
  private static readonly DAILY_ARCHIVE_KEY = 'meproofit-daily-archive';

  private static isK1(grade: string): boolean {
    const g = String(grade || '').toLowerCase();
    return g.includes('k') || g.includes('1st');
  }

  private static hasEnoughErrorsForGrade(sentence: DailySentence, grade: string): boolean {
    if (!sentence?.incorrectSentence || !sentence?.correctSentence) return false;
    const errors = sentence.errors;
    if (!Array.isArray(errors) || errors.length < 2) return false;
    // K-1 daily sentences must be spelling-only. Reject cached basketball-style
    // fallbacks that mix in capitalization/punctuation errors.
    if (this.isK1(grade)) {
      return errors.every((error) => String(error?.type || '').toLowerCase() === 'spelling');
    }
    return true;
  }

  // Get today's date in YYYY-MM-DD format (GMT)
  static getTodayDate(): string {
    const now = new Date();
    // Convert to GMT midnight
    const gmtDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return gmtDate.toISOString().split('T')[0];
  }

  // Generate a daily sentence for a specific date and grade
  static async generateDailySentence(date: string, grade: string): Promise<DailySentence> {
    const difficulty = this.getDifficultyFromGrade(grade);
    
    // Use a deterministic topic selection based on date and grade
    const topicIndex = this.getTopicIndexForDate(date, grade);
    const topic = TOPICS[topicIndex];

    debugLog(`Generating daily sentence for ${date}, grade ${grade}, topic ${topic.name}`);

    try {
      // Try to get sentence from LLM (isDaily: true applies grade-based error rules)
      const llmResponse = await LLMService.generateSentenceWithErrors(
        topic.name,
        difficulty,
        grade,
        true
      );

      const dailySentence: DailySentence = {
        id: `${date}-${grade}`,
        incorrectSentence: llmResponse.incorrectSentence,
        correctSentence: llmResponse.correctSentence,
        topic: topic.name,
        difficulty,
        errors: llmResponse.errors,
        date,
        grade,
        isDaily: true
      };

      debugLog('Generated daily sentence:', dailySentence);

      // Try to save to database (K-1 must have at least 2 errors - don't persist invalid)
      try {
        if (this.hasEnoughErrorsForGrade(dailySentence, grade)) {
          await DatabaseService.createDailySentence(dailySentence);
          debugLog('Successfully saved daily sentence to database');
        } else {
          debugLog('Skipping save: K-1 sentence has fewer than 2 errors');
        }
      } catch (dbError) {
        console.error('Failed to save daily sentence to database:', dbError);
        // Continue with local cache as fallback
      }

      return dailySentence;
    } catch (error) {
      console.error('Error generating daily sentence with LLM:', error);
      // Fallback to predefined sentence
      const fallbackSentence = this.getFallbackDailySentence(date, grade, topic);
      
      // Try to save fallback to database (K-1 must have at least 2 errors)
      try {
        if (this.hasEnoughErrorsForGrade(fallbackSentence, grade)) {
          await DatabaseService.createDailySentence(fallbackSentence);
          debugLog('Successfully saved fallback daily sentence to database');
        } else {
          debugLog('Skipping save of fallback: K-1 sentence has fewer than 2 errors');
        }
      } catch (dbError) {
        console.error('Failed to save fallback daily sentence to database:', dbError);
      }
      
      return fallbackSentence;
    }
  }

  // Get today's sentence for a user
  static async getTodaysSentence(user: User): Promise<DailySentence> {
    const today = this.getTodayDate();
    const cacheKey = `${today}-${user.grade}`;
    
    debugLog(`Getting today's sentence for ${user.name}, grade ${user.grade}, date ${today}`);
    
    // First, try to get from database
    try {
      const dbSentence = await DatabaseService.getDailySentence(today, user.grade);
      if (dbSentence && this.hasEnoughErrorsForGrade(dbSentence, user.grade)) {
        debugLog('Found daily sentence in database:', dbSentence);
        return dbSentence;
      }
      if (dbSentence && !this.hasEnoughErrorsForGrade(dbSentence, user.grade)) {
        debugLog('Ignoring stored sentence that does not match grade error rules, will regenerate');
      }
    } catch (error) {
      debugLog('Database lookup failed, will generate new sentence:', error);
    }
    
    // Check local cache as backup
    const cached = this.getCachedDailySentence(cacheKey);
    if (cached && this.hasEnoughErrorsForGrade(cached, user.grade)) {
      debugLog('Found daily sentence in local cache:', cached);
      return cached;
    }
    if (cached && !this.hasEnoughErrorsForGrade(cached, user.grade)) {
      debugLog('Ignoring cached sentence that does not match grade error rules, will regenerate');
    }

    // Generate new daily sentence
    debugLog('No cached sentence found, generating new one...');
    const dailySentence = await this.generateDailySentence(today, user.grade);
    
    // Cache locally only if valid for grade (e.g. K-1 must have at least 2 errors)
    if (this.hasEnoughErrorsForGrade(dailySentence, user.grade)) {
      this.cacheDailySentence(cacheKey, dailySentence);
    }
    
    return dailySentence;
  }

  // Get deterministic topic index based on date and grade
  private static getTopicIndexForDate(date: string, grade: string): number {
    // Create a hash from date and grade to ensure consistency
    const hash = this.simpleHash(date + grade);
    return hash % TOPICS.length;
  }

  // Simple hash function for deterministic topic selection
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get difficulty from grade
  private static getDifficultyFromGrade(grade: string): 'easy' | 'medium' | 'hard' {
    switch (grade) {
      case 'K':
      case '1st':
      case '2nd':
        return 'easy';
      case '3rd':
      case '4th':
      case '5th':
        return 'medium';
      case 'middle':
      case 'high':
      case 'beyond':
        return 'hard';
      default:
        return 'medium';
    }
  }

  // Cache daily sentence in localStorage
  // Security Note: Daily sentences are game content (not sensitive personal data)
  // Caching is acceptable for performance, but Supabase is preferred for authenticated users
  private static cacheDailySentence(key: string, sentence: DailySentence): void {
    try {
      const cached = this.getCachedDailySentences();
      cached[key] = sentence;
      localStorage.setItem(this.DAILY_SENTENCE_KEY, JSON.stringify(cached));
      debugLog('Cached daily sentence locally:', key);
    } catch (error) {
      console.error('Error caching daily sentence locally:', error);
    }
  }

  // Get cached daily sentence
  private static getCachedDailySentence(key: string): DailySentence | null {
    try {
      const cached = this.getCachedDailySentences();
      return cached[key] || null;
    } catch (error) {
      console.error('Error getting cached daily sentence:', error);
      return null;
    }
  }

  // Get all cached daily sentences
  private static getCachedDailySentences(): Record<string, DailySentence> {
    try {
      const cached = localStorage.getItem(this.DAILY_SENTENCE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error getting cached daily sentences:', error);
      return {};
    }
  }

  // Save user's daily sentence result to archive.
  // Guests: browser localStorage. Signed-in users: also their account in Supabase.
  static async saveDailyResult(
    sentence: DailySentence,
    score: number,
    attempts: number,
    userInput: string,
    corrections: Correction[]
  ): Promise<void> {
    const entry: ArchiveEntry = {
      date: sentence.date,
      grade: sentence.grade,
      topic: sentence.topic,
      incorrectSentence: sentence.incorrectSentence,
      correctSentence: sentence.correctSentence,
      userScore: score,
      userAttempts: attempts,
      userInput,
      corrections
    };

    this.saveLocalArchiveEntry(entry);

    try {
      const userId = await DatabaseService.getCurrentUserId();
      if (!userId) {
        return;
      }

      await DatabaseService.createDailySentence(sentence);
      await DatabaseService.saveDailyResult(
        userId,
        sentence.id,
        score,
        attempts,
        userInput,
        corrections
      );
      debugLog('Saved daily result to account:', sentence.id);
    } catch (error) {
      console.error('Error saving daily result to account:', error);
    }
  }

  static async getDailyResult(date: string, grade: string): Promise<ArchiveEntry | null> {
    const key = `${date}-${grade}`;
    const local = this.getArchive()[key] || null;
    const localCompleted = local && local.userScore !== undefined ? local : null;

    try {
      const userId = await DatabaseService.getCurrentUserId();
      if (userId) {
        const remote = await DatabaseService.getUserDailyResult(userId, key);
        if (remote && remote.userScore !== undefined) {
          this.saveLocalArchiveEntry(remote);
          return remote;
        }

        if (localCompleted) {
          await this.syncLocalResultToAccount(userId, localCompleted);
          return localCompleted;
        }

        return null;
      }
    } catch (error) {
      debugLog('Account lookup for daily result failed, using local archive:', error);
    }

    return localCompleted;
  }

  private static async syncLocalResultToAccount(userId: string, entry: ArchiveEntry): Promise<void> {
    if (entry.userScore === undefined) {
      return;
    }

    try {
      const sentenceId = `${entry.date}-${entry.grade}`;
      let sentence = await DatabaseService.getDailySentence(entry.date, entry.grade);

      if (!sentence && entry.incorrectSentence && entry.correctSentence) {
        sentence = {
          id: sentenceId,
          date: entry.date,
          grade: entry.grade,
          topic: entry.topic || 'Daily Challenge',
          incorrectSentence: entry.incorrectSentence,
          correctSentence: entry.correctSentence,
          errors: [],
          difficulty: 'medium',
          isDaily: true
        };
        await DatabaseService.createDailySentence(sentence);
      }

      if (!sentence) {
        return;
      }

      await DatabaseService.saveDailyResult(
        userId,
        sentence.id,
        entry.userScore,
        entry.userAttempts || 1,
        entry.userInput || '',
        entry.corrections || []
      );
      debugLog('Synced local daily result to account:', sentence.id);
    } catch (error) {
      console.error('Error syncing local daily result to account:', error);
    }
  }

  private static saveLocalArchiveEntry(entry: ArchiveEntry): void {
    try {
      const archive = this.getArchive();
      archive[`${entry.date}-${entry.grade}`] = entry;
      localStorage.setItem(this.DAILY_ARCHIVE_KEY, JSON.stringify(archive));
      debugLog('Saved daily result to local archive:', `${entry.date}-${entry.grade}`);
    } catch (error) {
      console.error('Error saving daily result locally:', error);
    }
  }

  // Get archive entries for a specific grade
  static async getArchiveForGrade(grade: string): Promise<ArchiveEntry[]> {
    const byKey = new Map<string, ArchiveEntry>();

    try {
      const archive = this.getArchive();
      Object.keys(archive).forEach(key => {
        const entry = archive[key] as ArchiveEntry;
        if (entry.grade === grade) {
          byKey.set(`${entry.date}-${entry.grade}`, entry);
        }
      });
    } catch (error) {
      console.error('Error getting local archive for grade:', error);
    }

    try {
      const userId = await DatabaseService.getCurrentUserId();
      if (userId) {
        const remoteEntries = await DatabaseService.getUserDailyResults(userId, grade);
        remoteEntries.forEach(entry => {
          byKey.set(`${entry.date}-${entry.grade}`, entry);
        });
      }
    } catch (error) {
      debugLog('Could not load account archives, using local results:', error);
    }

    return Array.from(byKey.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  static async getTodaysResultsByGrade(): Promise<Record<string, ArchiveEntry>> {
    const today = this.getTodayDate();
    const byGrade: Record<string, ArchiveEntry> = {};

    try {
      const archive = this.getArchive();
      Object.keys(archive).forEach(key => {
        const entry = archive[key] as ArchiveEntry;
        if (entry.date === today && entry.userScore !== undefined) {
          byGrade[entry.grade] = entry;
        }
      });
    } catch (error) {
      console.error('Error reading local results for today:', error);
    }

    try {
      const userId = await DatabaseService.getCurrentUserId();
      if (userId) {
        const remoteEntries = await DatabaseService.getUserDailyResultsForDate(userId, today);
        remoteEntries.forEach(entry => {
          if (entry.userScore !== undefined) {
            byGrade[entry.grade] = entry;
          }
        });
      }
    } catch (error) {
      debugLog('Could not load account results for today, using local results:', error);
    }

    return byGrade;
  }

  // Get all archive entries
  static getArchive(): Record<string, ArchiveEntry> {
    try {
      const archive = localStorage.getItem(this.DAILY_ARCHIVE_KEY);
      return archive ? JSON.parse(archive) : {};
    } catch (error) {
      console.error('Error getting archive:', error);
      return {};
    }
  }

  // Get fallback daily sentence
  static getFallbackDailySentence(date: string, grade: string, topic: any): DailySentence {
    const difficulty = this.getDifficultyFromGrade(grade);
    
    // Use fallback sentences from LLMService but make them deterministic
    const fallbackResponse = LLMService.getFallbackSentence(topic.id, grade);
    
    return {
      id: `${date}-${grade}`,
      incorrectSentence: fallbackResponse.incorrectSentence,
      correctSentence: fallbackResponse.correctSentence,
      topic: topic.name,
      difficulty,
      errors: fallbackResponse.errors,
      date,
      grade,
      isDaily: true
    };
  }

  // Debug method to check database status
  static async checkDatabaseStatus(): Promise<{ connected: boolean; tablesExist: boolean; dailySentencesCount: number }> {
    try {
      // Test connection by trying to get a daily sentence
      const testDate = this.getTodayDate();
      const testGrade = '3rd';
      
      const result = await DatabaseService.getDailySentence(testDate, testGrade);
      
      return {
        connected: true,
        tablesExist: true,
        dailySentencesCount: result ? 1 : 0
      };
    } catch (error) {
      console.error('Database status check failed:', error);
      return {
        connected: false,
        tablesExist: false,
        dailySentencesCount: 0
      };
    }
  }
} 