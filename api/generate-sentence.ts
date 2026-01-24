// IMPORTANT:
// Vercel's Node runtime for serverless functions executes CommonJS by default.
// If this file compiles to JS containing ESM `import` statements, the function will crash at startup with:
// "SyntaxError: Cannot use import statement outside a module"
//
// To avoid that, keep runtime imports as `require()` and use type-only imports via `import()`.
type VercelRequest = import('@vercel/node').VercelRequest;
type VercelResponse = import('@vercel/node').VercelResponse;

// Use built-in fetch() (Node 18+) to avoid ESM/CJS loader issues with axios.

// Initialize Supabase client for token verification
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function supabaseAuthGetUser(token: string): Promise<{ userId: string | null; error: string | null }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, error: 'Supabase not configured' };
  }

  try {
    const base = normalizeSupabaseUrl(supabaseUrl);
    const resp = await fetch(`${base}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`
      }
    });

    if (!resp.ok) {
      return { userId: null, error: 'Invalid or expired token' };
    }

    const data: any = await resp.json().catch(() => null);
    const id = data?.id;
    if (!id || typeof id !== 'string') {
      return { userId: null, error: 'Invalid or expired token' };
    }

    return { userId: id, error: null };
  } catch (e: any) {
    console.error('Token verification error:', e?.message || String(e));
    return { userId: null, error: 'Token verification failed' };
  }
}

async function supabaseRest<T>(
  token: string,
  pathAndQuery: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; text: string | null }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 0, data: null, text: 'Supabase not configured' };
  }

  const base = normalizeSupabaseUrl(supabaseUrl);
  const url = `${base}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`;

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> | undefined)
  };

  const resp = await fetch(url, {
    ...init,
    headers
  });

  const text = await resp.text().catch(() => null);
  const data = text ? (JSON.parse(text) as T) : null;

  return { ok: resp.ok, status: resp.status, data, text };
}

async function getJsonBody(req: VercelRequest): Promise<any> {
  // Vercel usually populates req.body for JSON, but in some deployments it can be undefined.
  // This helper makes the function resilient and prevents “unhandled 500” crashes.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return null;
      }
    }
    return req.body;
  }

  // If body wasn't parsed, read the raw stream and attempt JSON parse.
  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 10; // Number of requests allowed
const RATE_LIMIT_WINDOW = 60; // Time window in seconds (1 minute)

// Helper function to check rate limit
async function checkRateLimit(token: string, userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase not configured, allow request (fallback for development)
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS, resetAt: Date.now() + RATE_LIMIT_WINDOW * 1000 };
  }

  try {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Fetch timestamps for this user within the time window
    const query =
      `/rest/v1/rate_limits?select=timestamp` +
      `&user_id=eq.${encodeURIComponent(userId)}` +
      `&timestamp=gte.${windowStart}` +
      `&order=timestamp.desc`;

    let records: Array<{ timestamp: number }> = [];
    try {
      const resp = await supabaseRest<Array<{ timestamp: number }>>(token, query, { method: 'GET' });
      if (resp.ok && Array.isArray(resp.data)) {
        records = resp.data;
      } else if (resp.status !== 404) {
        // If table doesn't exist, PostgREST may return 404; treat that as "no records"
        console.error('Rate limit check error:', { status: resp.status, body: resp.text });
      }
    } catch (e: any) {
      console.error('Rate limit check error:', e?.message || String(e));
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS, resetAt: Date.now() + RATE_LIMIT_WINDOW * 1000 };
    }

    const requestCount = records.length || 0;
    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - requestCount);
    const allowed = requestCount < RATE_LIMIT_REQUESTS;
    const resetAt = records.length > 0
      ? (records[records.length - 1].timestamp + RATE_LIMIT_WINDOW) * 1000
      : (now + RATE_LIMIT_WINDOW) * 1000;

    // Record this request if allowed
    if (allowed) {
      supabaseRest<any>(token, '/rest/v1/rate_limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          user_id: userId,
          timestamp: now,
          endpoint: 'generate-sentence'
        })
      }).catch((err: any) => {
        // Log but don't fail the request if rate limit recording fails
        console.error('Failed to record rate limit:', err?.message || String(err));
      });
    }

    // Clean up old records (older than 2 windows to keep table size manageable)
    const cleanupThreshold = now - (RATE_LIMIT_WINDOW * 2);
    supabaseRest<any>(token,
      `/rest/v1/rate_limits?user_id=eq.${encodeURIComponent(userId)}&timestamp=lt.${cleanupThreshold}`,
      { method: 'DELETE' }
    ).catch((err: any) => {
      // Silent cleanup failure
      console.error('Rate limit cleanup failed:', err?.message || String(err));
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
  return supabaseAuthGetUser(token);
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
  try {
    // Always stamp responses so we can confirm which deployment served the request.
    // (Visible in browser DevTools → Network → Response Headers)
    const build =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_DEPLOYMENT_ID ||
      process.env.VERCEL_BUILD_ID ||
      'unknown';
    res.setHeader('X-MeProofIt-Build', build);

    // Force at least one log line per invocation (helps when debugging “no logs”).
    console.log('generate-sentence invoked', {
      build,
      method: req.method,
      url: req.url,
      hasAuthHeader: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', process.env.REACT_APP_SITE_URL || '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Expose-Headers', 'X-MeProofIt-Build');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(200).end();
    }

    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', process.env.REACT_APP_SITE_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'X-MeProofIt-Build');

    // Only allow POST requests
    if (req.method !== 'POST') {
      // Log the actual method for debugging
      console.warn('Invalid method received:', {
        method: req.method,
        url: req.url,
        headers: req.headers
      });
      return res.status(405).json({ 
        error: 'Method not allowed',
        allowedMethods: ['POST', 'OPTIONS'],
        receivedMethod: req.method
      });
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
    const rateLimit = await checkRateLimit(token, userId);
    
    if (!rateLimit.allowed) {
      // Log rate limit violation (for security monitoring)
      console.warn('Rate limit exceeded', {
        userId: userId.substring(0, 8) + '...',
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
        timestamp: new Date().toISOString()
      });
      
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
    const body = await getJsonBody(req);
    const { topic, difficulty, grade } = body || {};
  
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
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
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
    const openAiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
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
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 800
      })
    });

    const openAiText = await openAiResp.text();
    if (!openAiResp.ok) {
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(openAiText);
      } catch {
        // ignore
      }
      const code = parsedErr?.error?.code;
      const message = parsedErr?.error?.message || openAiText || 'OpenAI request failed';
      const err: any = new Error(message);
      err.openAiStatus = openAiResp.status;
      err.openAiCode = code;
      throw err;
    }

    const openAiJson: any = JSON.parse(openAiText);
    const content = openAiJson?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('OpenAI response missing message content');
    }
    
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
      status: error.openAiStatus,
      code: error.openAiCode
    });
    
    // Expose minimal, safe info to client (helps debugging without leaking secrets)
    const openAiStatus = error.openAiStatus;
    const openAiCode = error.openAiCode;

    return res.status(500).json({
      error: 'Failed to generate sentence. Please try again.',
      details: {
        openAiStatus,
        openAiCode
      }
    });
  }
  } catch (unhandled: any) {
    // This catches issues like undefined req.body or other unexpected runtime failures
    console.error('Unhandled API error (generate-sentence):', {
      message: unhandled?.message || String(unhandled),
      name: unhandled?.name,
    });

    return res.status(500).json({
      error: 'Internal server error in sentence generator.',
      details: {
        stage: 'unhandled',
      }
    });
  }
}
