import { DailySentence, ArchiveEntry, User } from '../types';
import { LLMService } from './llmService';
import { TOPICS } from '../data/topics';

export class DailySentenceService {
  private static readonly DAILY_SENTENCE_KEY = 'meproofit-daily-sentences';
  private static readonly DAILY_ARCHIVE_KEY = 'meproofit-daily-archive';

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

    try {
      // Try to get sentence from LLM
      const llmResponse = await LLMService.generateSentenceWithErrors(
        topic.name,
        difficulty,
        grade
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

      return dailySentence;
    } catch (error) {
      console.error('Error generating daily sentence with LLM:', error);
      // Fallback to predefined sentence
      return this.getFallbackDailySentence(date, grade, topic);
    }
  }

  // Get today's sentence for a user
  static async getTodaysSentence(user: User): Promise<DailySentence> {
    const today = this.getTodayDate();
    const cacheKey = `${today}-${user.grade}`;
    
    // Check if we have today's sentence cached
    const cached = this.getCachedDailySentence(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate new daily sentence
    const dailySentence = await this.generateDailySentence(today, user.grade);
    
    // Cache it
    this.cacheDailySentence(cacheKey, dailySentence);
    
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
  private static cacheDailySentence(key: string, sentence: DailySentence): void {
    try {
      const cached = this.getCachedDailySentences();
      cached[key] = sentence;
      localStorage.setItem(this.DAILY_SENTENCE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching daily sentence:', error);
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

  // Save user's daily sentence result to archive
  static saveDailyResult(date: string, grade: string, topic: string, 
                        incorrectSentence: string, correctSentence: string, 
                        score: number, attempts: number): void {
    try {
      const archive = this.getArchive();
      const key = `${date}-${grade}`;
      
      archive[key] = {
        date,
        grade,
        topic,
        incorrectSentence,
        correctSentence,
        userScore: score,
        userAttempts: attempts
      };

      localStorage.setItem(this.DAILY_ARCHIVE_KEY, JSON.stringify(archive));
    } catch (error) {
      console.error('Error saving daily result:', error);
    }
  }

  // Get archive entries for a specific grade
  static getArchiveForGrade(grade: string): ArchiveEntry[] {
    try {
      const archive = this.getArchive();
      const entries: ArchiveEntry[] = [];
      
      Object.keys(archive).forEach(key => {
        const entry = archive[key] as ArchiveEntry;
        if (entry.grade === grade) {
          entries.push(entry);
        }
      });

      // Sort by date (newest first)
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting archive for grade:', error);
      return [];
    }
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
} 