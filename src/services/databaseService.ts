import { createClient } from '@supabase/supabase-js';
import { User, DailySentence, ArchiveEntry, GameSentence, LLMResponse } from '../types';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class DatabaseService {
  // User Management
  static async signUp(email: string, password: string, userData: { name: string; grade: string; difficulty: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          grade: userData.grade,
          difficulty: userData.difficulty
        }
      }
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      await this.createUserProfile(data.user.id, userData);
    }

    return data;
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  static async createUserProfile(userId: string, userData: { name: string; grade: string; difficulty: string }) {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        name: userData.name,
        grade: userData.grade,
        difficulty: userData.difficulty
      });

    if (error) throw error;
  }

  static async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateUserStats(userId: string, score: number) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        total_score: supabase.sql`total_score + ${score}`,
        games_played: supabase.sql`games_played + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  // Daily Sentences
  static async getDailySentence(date: string, grade: string): Promise<DailySentence | null> {
    const { data, error } = await supabase
      .from('daily_sentences')
      .select('*')
      .eq('id', `${date}-${grade}`)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  static async createDailySentence(dailySentence: DailySentence) {
    const { error } = await supabase
      .from('daily_sentences')
      .insert({
        id: dailySentence.id,
        date: dailySentence.date,
        grade: dailySentence.grade,
        topic: dailySentence.topic,
        incorrect_sentence: dailySentence.incorrectSentence,
        correct_sentence: dailySentence.correctSentence,
        errors: dailySentence.errors,
        difficulty: dailySentence.difficulty
      });

    if (error) throw error;
  }

  static async saveDailyResult(
    userId: string,
    dailySentenceId: string,
    score: number,
    attempts: number,
    userInput: string,
    corrections: any[]
  ) {
    const { error } = await supabase
      .from('user_daily_results')
      .upsert({
        user_id: userId,
        daily_sentence_id: dailySentenceId,
        score,
        attempts,
        user_input: userInput,
        corrections
      }, {
        onConflict: 'user_id,daily_sentence_id'
      });

    if (error) throw error;

    // Update user stats
    await this.updateUserStats(userId, score);
  }

  static async getUserDailyResults(userId: string, grade: string): Promise<ArchiveEntry[]> {
    const { data, error } = await supabase
      .from('user_daily_results')
      .select(`
        *,
        daily_sentences (
          date,
          grade,
          topic,
          incorrect_sentence,
          correct_sentence
        )
      `)
      .eq('user_id', userId)
      .eq('daily_sentences.grade', grade)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    return data.map(result => ({
      date: result.daily_sentences.date,
      grade: result.daily_sentences.grade,
      topic: result.daily_sentences.topic,
      incorrectSentence: result.daily_sentences.incorrect_sentence,
      correctSentence: result.daily_sentences.correct_sentence,
      userScore: result.score,
      userAttempts: result.attempts
    }));
  }

  // Sentence Caching
  static async getCachedSentence(topic: string, grade: string, difficulty: string): Promise<GameSentence | null> {
    const { data, error } = await supabase
      .from('sentence_cache')
      .select('*')
      .eq('topic', topic)
      .eq('grade', grade)
      .eq('difficulty', difficulty)
      .order('usage_count', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      // Update usage count
      await this.updateSentenceUsage(data.id);
      
      return {
        id: data.id,
        incorrectSentence: data.incorrect_sentence,
        correctSentence: data.correct_sentence,
        topic: data.topic,
        difficulty: data.difficulty as 'easy' | 'medium' | 'hard',
        errors: data.errors
      };
    }

    return null;
  }

  static async cacheSentence(llmResponse: LLMResponse, topic: string, grade: string, difficulty: string) {
    const { error } = await supabase
      .from('sentence_cache')
      .insert({
        topic,
        grade,
        difficulty,
        incorrect_sentence: llmResponse.incorrectSentence,
        correct_sentence: llmResponse.correctSentence,
        errors: llmResponse.errors
      });

    if (error) throw error;
  }

  static async updateSentenceUsage(sentenceId: string) {
    const { error } = await supabase
      .from('sentence_cache')
      .update({
        usage_count: supabase.sql`usage_count + 1`,
        last_used_at: new Date().toISOString()
      })
      .eq('id', sentenceId);

    if (error) throw error;
  }

  // Analytics and Reporting
  static async getUserStats(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('total_score, games_played')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getLeaderboard(grade: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name, total_score, games_played')
      .eq('grade', grade)
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Cleanup and Maintenance
  static async cleanupOldCache(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabase
      .from('sentence_cache')
      .delete()
      .lt('last_used_at', cutoffDate.toISOString());

    if (error) throw error;
  }
}

// Real-time subscriptions for live updates
export const subscribeToUserResults = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('user_results')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_daily_results',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
}; 