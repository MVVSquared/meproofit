import { createClient } from '@supabase/supabase-js';
import { DailySentence, ArchiveEntry, GameSentence, LLMResponse } from '../types';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export class DatabaseService {
  // User Management
  static async signUp(email: string, password: string, userData: { name: string; grade: string; difficulty: string }) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
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
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  static async createUserProfile(userId: string, userData: { name: string; grade: string; difficulty: string }) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    // Use upsert to handle both new profiles and updates
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        name: userData.name,
        grade: userData.grade,
        difficulty: userData.difficulty,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
  }

  static async getUserProfile(userId: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateUserStats(userId: string, score: number) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    // First get current stats
    const { data: currentStats, error: fetchError } = await supabase
      .from('user_profiles')
      .select('total_score, games_played')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Then update with new values
    const { error } = await supabase
      .from('user_profiles')
      .update({
        total_score: (currentStats?.total_score || 0) + score,
        games_played: (currentStats?.games_played || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  // Daily Sentences
  static async getDailySentence(date: string, grade: string): Promise<DailySentence | null> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('daily_sentences')
      .select('*')
      .eq('id', `${date}-${grade}`)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) return null;
    
    // Transform database fields to match TypeScript interface
    return {
      id: data.id,
      date: data.date,
      grade: data.grade,
      topic: data.topic,
      incorrectSentence: data.incorrect_sentence,
      correctSentence: data.correct_sentence,
      errors: data.errors,
      difficulty: data.difficulty,
      isDaily: true
    };
  }

  static async createDailySentence(dailySentence: DailySentence) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    // Upsert so the same date+grade is only stored once (first writer wins; others no-op)
    const { error } = await supabase
      .from('daily_sentences')
      .upsert(
        {
          id: dailySentence.id,
          date: dailySentence.date,
          grade: dailySentence.grade,
          topic: dailySentence.topic,
          incorrect_sentence: dailySentence.incorrectSentence,
          correct_sentence: dailySentence.correctSentence,
          errors: dailySentence.errors,
          difficulty: dailySentence.difficulty
        },
        { onConflict: 'id' }
      );

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
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
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
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
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
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('sentence_cache')
      .select('*')
      .eq('topic', topic)
      .eq('grade', grade)
      .eq('difficulty', difficulty)
      .order('usage_count', { ascending: true })
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      const cachedSentence = data[0];
      // Update usage count
      await this.updateSentenceUsage(cachedSentence.id);
      
      return {
        id: cachedSentence.id,
        incorrectSentence: cachedSentence.incorrect_sentence,
        correctSentence: cachedSentence.correct_sentence,
        topic: cachedSentence.topic,
        difficulty: cachedSentence.difficulty as 'easy' | 'medium' | 'hard',
        errors: cachedSentence.errors
      };
    }

    return null;
  }

  static async cacheSentence(llmResponse: LLMResponse, topic: string, grade: string, difficulty: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
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
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    // First get current usage count
    const { data: currentUsage, error: fetchError } = await supabase
      .from('sentence_cache')
      .select('usage_count')
      .eq('id', sentenceId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Then update with new count
    const { error } = await supabase
      .from('sentence_cache')
      .update({
        usage_count: (currentUsage?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', sentenceId);

    if (error) throw error;
  }

  // Analytics and Reporting
  static async getUserStats(userId: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select('total_score, games_played')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getLeaderboard(grade: string, limit: number = 10) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
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
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
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
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
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