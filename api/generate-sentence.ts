import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for token verification
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 10; // Number of requests allowed
const RATE_LIMIT_WINDOW = 60; // Time window in seconds (1 minute)

// Helper function to check rate limit
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase not configured, allow request (fallback for development)
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS, resetAt: Date.now() + RATE_LIMIT_WINDOW * 1000 };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Get rate limit records for this user within the time window
    const { data: records, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', windowStart)
      .order('timestamp', { ascending: false });

    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('Rate limit check error:', error);
      // On error, allow request but log it
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS, resetAt: now + RATE_LIMIT_WINDOW };
    }

    const requestCount = records?.length || 0;
    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - requestCount);
    const allowed = requestCount < RATE_LIMIT_REQUESTS;
    const resetAt = records && records.length > 0 
      ? (records[records.length - 1].timestamp + RATE_LIMIT_WINDOW) * 1000
      : (now + RATE_LIMIT_WINDOW) * 1000;

    // Record this request if allowed
    if (allowed) {
      await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          timestamp: now,
          endpoint: 'generate-sentence'
        })
        .catch(err => {
          // Log but don't fail the request if rate limit recording fails
          console.error('Failed to record rate limit:', err);
        });
    }

    // Clean up old records (older than 2 windows to keep table size manageable)
    const cleanupThreshold = now - (RATE_LIMIT_WINDOW * 2);
    supabase
      .from('rate_limits')
      .delete()
      .lt('timestamp', cleanupThreshold)
      .catch(err => {
        // Silent cleanup failure
        console.error('Rate limit cleanup failed:', err);
      });

    return { allowed, remaining, resetAt };
  } catch (error: any) {
    console.error('Rate limit check error:', error);
    // On error, allow request but log it
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS, resetAt: Date.now() + RATE_LIMIT_WINDOW * 1000 };
  }
}

// Helper function to verify authentication token
async function verifyAuthToken(token: string): Promise<{ userId: string | null; error: string | null }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, error: 'Supabase not configured' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { userId: null, error: 'Invalid or expired token' };
    }
    
    return { userId: user.id, error: null };
  } catch (error: any) {
    console.error('Token verification error:', error.message);
    return { userId: null, error: 'Token verification failed' };
  }
}

// Helper function to determine content type based on grade
function getContentType(grade: string): string {
  if (grade.indexOf('K') !== -1 || grade.indexOf('1st') !== -1 || grade.indexOf('2nd') !== -1 || 
      grade.indexOf('3rd') !== -1 || grade.indexOf('4th') !== -1 || grade.indexOf('5th') !== -1) {
    return 'sentences';
  } else {
    return 'paragraphs';
  }
}

// Helper function to get grade description
function getGradeDescription(grade: string): string {
  if (grade.indexOf('K') !== -1 || grade.indexOf('1st') !== -1 || grade.indexOf('2nd') !== -1 || 
      grade.indexOf('3rd') !== -1 || grade.indexOf('4th') !== -1 || grade.indexOf('5th') !== -1) {
    return 'elementary school';
  } else if (grade.indexOf('6th') !== -1 || grade.indexOf('7th') !== -1 || grade.indexOf('8th') !== -1) {
    return 'middle school';
  } else {
    return 'high school';
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.REACT_APP_SITE_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', process.env.REACT_APP_SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Log unauthorized access attempt (for security monitoring)
    console.warn('Unauthorized API access attempt - no auth token provided', {
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({ error: 'Authentication required. Please sign in to use this feature.' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { userId, error: authError } = await verifyAuthToken(token);
  
  if (authError || !userId) {
    // Log failed authentication attempt (for security monitoring)
    console.warn('Failed authentication attempt', {
      error: authError,
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({ error: 'Invalid or expired authentication. Please sign in again.' });
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(userId);
  
  if (!rateLimit.allowed) {
    // Log rate limit violation (for security monitoring)
    console.warn('Rate limit exceeded', {
      userId: userId.substring(0, 8) + '...',
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
      timestamp: new Date().toISOString()
    });
    
    // Return rate limit error with reset time
    const resetDate = new Date(rateLimit.resetAt);
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    });
  }

  // Log successful authenticated request (for monitoring)
  console.log('Authenticated API request', {
    userId: userId.substring(0, 8) + '...', // Only log partial user ID for privacy
    remaining: rateLimit.remaining,
    timestamp: new Date().toISOString()
  });
  
  // Add rate limit headers to response
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());

  // Validate required parameters
  const { topic, difficulty, grade } = req.body;
  
  if (!topic || !difficulty || !grade) {
    return res.status(400).json({ 
      error: 'Missing required parameters: topic, difficulty, grade' 
    });
  }

  // Validate difficulty value
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty level' });
  }

  // Validate topic is a string
  if (typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid topic' });
  }

  // Sanitize topic (prevent XSS)
  const sanitizedTopic = topic.trim().replace(/[<>]/g, '');
  if (sanitizedTopic.length === 0 || sanitizedTopic.length > 100) {
    return res.status(400).json({ error: 'Invalid topic' });
  }

  // Check for dangerous patterns in topic
  if (/<script|javascript:|on\w+\s*=/i.test(sanitizedTopic)) {
    return res.status(400).json({ error: 'Invalid topic' });
  }

  // Validate grade is a string
  if (typeof grade !== 'string' || grade.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid grade' });
  }

  // Sanitize grade
  const sanitizedGrade = grade.trim().replace(/[<>]/g, '');
  if (sanitizedGrade.length === 0 || sanitizedGrade.length > 20) {
    return res.status(400).json({ error: 'Invalid grade' });
  }

  // Check for dangerous patterns in grade
  if (/<script|javascript:|on\w+\s*=/i.test(sanitizedGrade)) {
    return res.status(400).json({ error: 'Invalid grade' });
  }

  // Get API key from server-side environment variable (NOT REACT_APP_*)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Build the prompt (same logic as in llmService.ts)
  // Use sanitized values
  const errorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const contentType = getContentType(sanitizedGrade);
  const gradeDescription = getGradeDescription(sanitizedGrade);
  
  const prompt = `Create a ${contentType} about ${sanitizedTopic} with exactly ${errorCount} errors for a ${difficulty} level ${gradeDescription} student.

IMPORTANT: Include a mix of these error types:
- SPELLING errors (common misspellings like "recieve" instead of "receive")
- PUNCTUATION errors (missing commas, periods, apostrophes, semicolons)
- CAPITALIZATION errors (missing capital letters at start of sentences or proper nouns)

CAPITALIZATION RULES - ONLY capitalize:
- First word of a sentence
- Proper nouns (names of people, places, specific brands)
- Days of the week, months
- Titles when used as proper nouns

DO NOT capitalize:
- Common nouns (sports, animals, foods, objects)
- Generic terms (basketball, soccer, pizza, cat, dog)
- Seasons (spring, summer, fall, winter)
- School subjects (math, science, history) unless they're proper nouns

Make the ${contentType} engaging and age-appropriate for ${gradeDescription} students.
${sanitizedGrade.indexOf('K') !== -1 || sanitizedGrade.indexOf('1st') !== -1 || sanitizedGrade.indexOf('2nd') !== -1 || 
 sanitizedGrade.indexOf('3rd') !== -1 || sanitizedGrade.indexOf('4th') !== -1 || sanitizedGrade.indexOf('5th') !== -1 
  ? 'Keep it to 1-2 sentences maximum. Use simple, basic vocabulary appropriate for young children. Avoid complex words or concepts.' 
  : 'Make it 2-3 sentences that form a cohesive paragraph.'}

${sanitizedGrade.indexOf('K') !== -1 ? 'Use very simple words and short sentences. Focus on basic concepts like colors, numbers, simple animals, or everyday objects.' : ''}
${sanitizedGrade.indexOf('1st') !== -1 ? 'Use simple vocabulary and short sentences. Focus on familiar topics like family, school, pets, or basic activities.' : ''}
${sanitizedGrade.indexOf('2nd') !== -1 ? 'Use age-appropriate vocabulary. Focus on familiar topics like friends, games, animals, or simple activities.' : ''}

Respond ONLY with this exact JSON format (no other text):
{
  "incorrectSentence": "the ${contentType} with errors",
  "correctSentence": "the ${contentType} without errors",
  "errors": [
    {
      "type": "spelling|punctuation|capitalization",
      "incorrectText": "the incorrect text",
      "correctText": "the correct text",
      "position": 0
    }
  ]
}`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an educational game assistant that creates ${contentType} with intentional spelling, punctuation, and capitalization errors for ${sanitizedGrade} students. Always respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    
    // Parse and validate the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate the response structure
    if (!parsed.incorrectSentence || !parsed.correctSentence || !parsed.errors) {
      throw new Error('Invalid response structure');
    }
    
    // Validate error types
    const validTypes = ['spelling', 'punctuation', 'capitalization'];
    for (const error of parsed.errors) {
      if (!validTypes.includes(error.type)) {
        throw new Error(`Invalid error type: ${error.type}`);
      }
    }

    // Return the validated response
    return res.status(200).json({
      incorrectSentence: parsed.incorrectSentence,
      correctSentence: parsed.correctSentence,
      errors: parsed.errors
    });
  } catch (error: any) {
    // Log error server-side (not exposed to client)
    console.error('OpenAI API error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'Failed to generate sentence. Please try again.' 
    });
  }
}
