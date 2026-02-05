/**
 * Vercel Serverless Function (CommonJS)
 *
 * Why this file exists:
 * - We previously hit: "SyntaxError: Cannot use import statement outside a module"
 * - That indicates Vercel executed the built function as CommonJS while the output contained ESM imports.
 * - This implementation is plain CommonJS (no ESM imports) to avoid loader/build ambiguity.
 *
 * Notes:
 * - Uses Node 18+ global fetch() (no axios dependency).
 * - Uses Supabase Auth REST + PostgREST endpoints (no supabase-js dependency).
 */
 
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

// Security: Require authentication by default in production
// Set REQUIRE_AUTH_FOR_AI=false to allow anonymous access (not recommended for production)
// In development, defaults to false for easier testing
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
const authEnvVar = String(process.env.REQUIRE_AUTH_FOR_AI || '').toLowerCase();
const REQUIRE_AUTH_FOR_AI = authEnvVar === 'true' 
  ? true 
  : authEnvVar === 'false' 
    ? false 
    : isProduction; // Default: require auth in production, allow anonymous in development

// Best-effort in-memory rate limit for anonymous users (per warm lambda instance).
// This is not perfect across all instances, but it restores “no sign-in needed” behavior safely.
// Anonymous rate limiting now uses Supabase (see checkAnonRateLimit function)
 
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
 
function normalizeSupabaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}
 
function getBuildFingerprint() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_BUILD_ID ||
    'unknown'
  );
}
 
function getAllowedOrigin(req) {
  // Get the origin from the request
  const requestOrigin = req.headers.origin;
  
  // If no Origin header, this is either:
  // 1. Same-origin request (browser doesn't send Origin) - CORS not needed
  // 2. Server-to-server request - CORS not needed
  // In both cases, we don't need to set CORS headers
  if (!requestOrigin) {
    return null;
  }
  
  // Build list of allowed origins
  const allowedOrigins = [];
  
  // Add production URL if set
  if (process.env.REACT_APP_SITE_URL) {
    allowedOrigins.push(process.env.REACT_APP_SITE_URL);
  }
  
  // Add Vercel preview/deployment URLs if available
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // In development, allow localhost origins
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3001');
    allowedOrigins.push('http://127.0.0.1:3000');
    allowedOrigins.push('http://127.0.0.1:3001');
  }
  
  // Check if the request origin is in the allowed list
  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Origin not in allowed list - return null (will result in no CORS header)
  // Browser will block the cross-origin request
  return null;
}

function setCors(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  } else {
    // Log in development to help debug CORS issues
    if (process.env.NODE_ENV !== 'production') {
      const requestOrigin = req.headers.origin;
      console.warn('CORS: Origin not allowed', {
        requestOrigin,
        allowedOrigins: [
          process.env.REACT_APP_SITE_URL,
          process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
        ].filter(Boolean)
      });
    }
    // If no allowed origin, don't set the header (browser will block cross-origin requests)
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Let the browser read our debug build header
  res.setHeader('Access-Control-Expose-Headers', 'X-MeProofIt-Build');
  
  // For preflight requests, allow credentials if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function getClientIp(req) {
  // Prefer the first IP in X-Forwarded-For (client, proxy1, proxy2...)
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.trim()) return xri.trim();
  // Fallback (may be undefined in some runtimes)
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function checkAnonRateLimit(ip) {
  // Use Supabase for persistent rate limiting across serverless instances
  // Store anonymous rate limits using a special identifier format: "anon:IP_ADDRESS"
  const anonUserId = `anon:${ip}`;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    // Fallback to permissive if Supabase not configured
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_SEC * 1000,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW_SEC;

  // Read recent timestamps for this IP
  const query =
    `/rest/v1/rate_limits?select=timestamp` +
    `&user_id=eq.${encodeURIComponent(anonUserId)}` +
    `&timestamp=gte.${windowStart}` +
    `&order=timestamp.desc`;

  let records = [];
  try {
    // Use anon key without auth token for anonymous rate limiting
    const base = normalizeSupabaseUrl(supabaseUrl);
    const resp = await fetch(`${base}${query}`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    });

    if (resp.ok) {
      const text = await resp.text().catch(() => '');
      try {
        const data = text ? JSON.parse(text) : null;
        if (Array.isArray(data)) records = data;
      } catch {
        // Ignore parse errors
      }
    }
  } catch {
    // If rate limiting fails, fail open (availability over strictness)
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_SEC * 1000,
    };
  }

  const count = records.length;
  const remaining = Math.max(0, RATE_LIMIT_REQUESTS - count);
  const allowed = count < RATE_LIMIT_REQUESTS;
  const resetAt =
    count > 0 ? (records[records.length - 1].timestamp + RATE_LIMIT_WINDOW_SEC) * 1000 : (now + RATE_LIMIT_WINDOW_SEC) * 1000;

  if (allowed) {
    // Record request (non-blocking)
    const base = normalizeSupabaseUrl(supabaseUrl);
    fetch(`${base}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ 
        user_id: anonUserId, 
        endpoint: 'generate-sentence', 
        timestamp: now 
      }),
    }).catch(() => {});

    // Cleanup old records (non-blocking)
    const cleanupThreshold = now - RATE_LIMIT_WINDOW_SEC * 2;
    fetch(
      `${base}/rest/v1/rate_limits?user_id=eq.${encodeURIComponent(anonUserId)}&timestamp=lt.${cleanupThreshold}`,
      {
        method: 'DELETE',
        headers: {
          apikey: supabaseAnonKey,
        },
      }
    ).catch(() => {});
  }

  return { allowed, remaining, resetAt };
}
 
function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined && req.body !== null) {
      // Some runtimes populate req.body already
      if (typeof req.body === 'string') {
        try {
          resolve(JSON.parse(req.body));
        } catch {
          resolve(null);
        }
        return;
      }
      resolve(req.body);
      return;
    }
 
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}
 
async function supabaseAuthGetUserId(token) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, error: 'Supabase not configured' };
  }
 
  try {
    const base = normalizeSupabaseUrl(supabaseUrl);
    const resp = await fetch(`${base}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
 
    if (!resp.ok) return { userId: null, error: 'Invalid or expired token' };
 
    const data = await resp.json().catch(() => null);
    const id = data && data.id;
    if (!id || typeof id !== 'string') return { userId: null, error: 'Invalid or expired token' };
 
    return { userId: id, error: null };
  } catch (e) {
    return { userId: null, error: 'Token verification failed' };
  }
}
 
async function supabaseRest(token, pathAndQuery, init) {
  const base = normalizeSupabaseUrl(supabaseUrl);
  const url = `${base}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`;
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    ...(init && init.headers ? init.headers : {}),
  };
 
  const resp = await fetch(url, { ...(init || {}), headers });
  const text = await resp.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: resp.ok, status: resp.status, data, text };
}
 
async function checkRateLimit(token, userId) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_SEC * 1000,
    };
  }
 
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW_SEC;
 
  // Read recent timestamps
  const query =
    `/rest/v1/rate_limits?select=timestamp` +
    `&user_id=eq.${encodeURIComponent(userId)}` +
    `&timestamp=gte.${windowStart}` +
    `&order=timestamp.desc`;
 
  let records = [];
  try {
    const resp = await supabaseRest(token, query, { method: 'GET' });
    if (resp.ok && Array.isArray(resp.data)) records = resp.data;
    // If the table doesn't exist / PostgREST not configured, fail open (availability over strictness)
  } catch {
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_SEC * 1000,
    };
  }
 
  const count = records.length;
  const remaining = Math.max(0, RATE_LIMIT_REQUESTS - count);
  const allowed = count < RATE_LIMIT_REQUESTS;
  const resetAt =
    count > 0 ? (records[records.length - 1].timestamp + RATE_LIMIT_WINDOW_SEC) * 1000 : (now + RATE_LIMIT_WINDOW_SEC) * 1000;
 
  if (allowed) {
    // Record request (non-blocking)
    supabaseRest(token, '/rest/v1/rate_limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, endpoint: 'generate-sentence', timestamp: now }),
    }).catch(() => {});
 
    // Cleanup old (non-blocking)
    const cleanupThreshold = now - RATE_LIMIT_WINDOW_SEC * 2;
    supabaseRest(
      token,
      `/rest/v1/rate_limits?user_id=eq.${encodeURIComponent(userId)}&timestamp=lt.${cleanupThreshold}`,
      { method: 'DELETE' }
    ).catch(() => {});
  }
 
  return { allowed, remaining, resetAt };
}
 
function getContentType(grade) {
  const g = String(grade || '');
  if (
    g.includes('K') ||
    g.includes('1st') ||
    g.includes('2nd') ||
    g.includes('3rd') ||
    g.includes('4th') ||
    g.includes('5th')
  ) {
    return 'sentences';
  }
  return 'paragraphs';
}
 
function getGradeDescription(grade) {
  const g = String(grade || '');
  if (
    g.includes('K') ||
    g.includes('1st') ||
    g.includes('2nd') ||
    g.includes('3rd') ||
    g.includes('4th') ||
    g.includes('5th')
  ) {
    return 'elementary school';
  }
  if (g.includes('6th') || g.includes('7th') || g.includes('8th')) {
    return 'middle school';
  }
  return 'high school';
}

// Grade-based error rules for daily sentences only.
// Returns { errorRulesPrompt, typeHint, validTypes, sentenceConstructionRules }.
// sentenceConstructionRules: what punctuation/grammar the sentence itself must NOT use (keeps output in scope).
function getErrorRulesForGrade(grade) {
  const g = String(grade || '').toLowerCase();
  // K and 1st: only spelling and word placement (no tense, no punctuation/capitalization as errors).
  if (g.includes('k') || g.includes('1st')) {
    return {
      errorRulesPrompt: `IMPORTANT - Use ONLY these error types (do NOT use punctuation or capitalization as errors for the student to fix):
- SPELLING errors (common misspellings like "recieve" instead of "receive")
- WORD PLACEMENT errors (words in the wrong order; student must reorder to fix)

For WORD PLACEMENT: The correctSentence must be the version that makes sense in English. The incorrectSentence has a word in the wrong place. Example: correct = "The cat ran fast up the tree." (correct: "ran fast"); incorrect = "The cat fast ran up the tree." Do NOT make the "correct" version nonsensical (e.g. "The cat ran up the fast tree" is WRONG—a tree cannot be "fast").

Do NOT include tense errors. Do NOT include missing or incorrect punctuation as errors—the student should not have to correct punctuation. Do NOT include capitalization as an error. The sentence must still be properly capitalized and must end with a period, question mark, or exclamation mark.`,
      typeHint: 'spelling|word_placement',
      validTypes: ['spelling', 'word_placement'],
      sentenceConstructionRules: 'SENTENCE CONSTRUCTION: The sentence MUST end with proper punctuation (a period, question mark, or exclamation mark). Both correctSentence and incorrectSentence must be meaningful English. The correctSentence must make sense (e.g. "ran fast" is correct; "fast tree" is wrong). Do not use semicolons, colons, dashes, commas, or quotation marks in the middle of the sentence.',
    };
  }
  // 2nd and 3rd: add simple punctuation (periods, question marks, exclamation marks)
  if (g.includes('2nd') || g.includes('3rd')) {
    return {
      errorRulesPrompt: `IMPORTANT - Use ONLY these error types:
- SPELLING errors (common misspellings)
- TENSE errors (wrong verb form, e.g. "runned" instead of "ran")
- WORD PLACEMENT errors (words in wrong order—correctSentence must make sense, e.g. "ran fast" not "fast tree")
- PUNCTUATION errors: ONLY simple end punctuation - missing or wrong periods (.), question marks (?), or exclamation marks (!). Do NOT use commas or quotation marks yet.
- CAPITALIZATION errors: first letter of a sentence, proper nouns.

Do NOT use commas, apostrophes, or quotation marks as errors.`,
      typeHint: 'spelling|tense|word_placement|punctuation|capitalization',
      validTypes: ['spelling', 'tense', 'word_placement', 'punctuation', 'capitalization'],
      sentenceConstructionRules: 'SENTENCE CONSTRUCTION: Use only periods, question marks, or exclamation marks. Do not use commas, quotation marks, semicolons, colons, or dashes anywhere in the sentence.',
    };
  }
  // 4th and 5th: add commas and quotes (no semicolons, colons, or dashes)
  if (g.includes('4th') || g.includes('5th')) {
    return {
      errorRulesPrompt: `IMPORTANT - Use a mix of these error types:
- SPELLING errors (common misspellings)
- TENSE errors (wrong verb form)
- WORD PLACEMENT errors (words in wrong order—correctSentence must make sense, e.g. "ran fast" not "fast tree")
- PUNCTUATION errors: periods, question marks, exclamation marks, commas, and quotation marks (missing or incorrect).
- CAPITALIZATION errors: first word of sentence, proper nouns.

You may include commas and quotation marks as error types.`,
      typeHint: 'spelling|tense|word_placement|punctuation|capitalization',
      validTypes: ['spelling', 'tense', 'word_placement', 'punctuation', 'capitalization'],
      sentenceConstructionRules: 'SENTENCE CONSTRUCTION: Use only periods, question marks, exclamation marks, commas, and quotation marks. Do NOT use semicolons, colons, or dashes anywhere in the sentence. If you need to join two clauses, use a period and start a new sentence (e.g. "...Earth. It glows..." not "...Earth; it glows...").',
    };
  }
  // Middle, high, beyond: any error types
  return {
    errorRulesPrompt: `IMPORTANT: Include a mix of these error types:
- SPELLING errors (common misspellings like "recieve" instead of "receive")
- PUNCTUATION errors (missing commas, periods, apostrophes, semicolons, quotes)
- CAPITALIZATION errors (missing capital letters at start of sentences or proper nouns)
- TENSE errors (wrong verb form)
- WORD PLACEMENT errors (words in wrong order—correctSentence must make sense, e.g. "ran fast" not "fast tree")

CAPITALIZATION RULES - ONLY capitalize:
- First word of a sentence
- Proper nouns (names of people, places, specific brands)
- Days of the week, months
- Titles when used as proper nouns

DO NOT capitalize:
- Common nouns (sports, animals, foods, objects)
- Generic terms (basketball, soccer, pizza, cat, dog)
- Seasons (spring, summer, fall, winter)
- School subjects (math, science, history) unless they're proper nouns`,
    typeHint: 'spelling|punctuation|capitalization|tense|word_placement',
    validTypes: ['spelling', 'punctuation', 'capitalization', 'tense', 'word_placement'],
    sentenceConstructionRules: '', // no restriction for middle/high/beyond
  };
}

module.exports = async (req, res) => {
  const build = getBuildFingerprint();
  res.setHeader('X-MeProofIt-Build', build);
  setCors(req, res);
 
  // One log per invocation so we can always see traffic in Vercel logs
  console.log('generate-sentence invoked', {
    build,
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.authorization,
    requiresAuth: REQUIRE_AUTH_FOR_AI,
    isProduction,
    timestamp: new Date().toISOString(),
  });
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }
 
  // Authentication check
  // In production, authentication is required by default for security
  // In development, anonymous access is allowed for easier testing
  const authHeader = req.headers.authorization;
  const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

  let token = null;
  let userId = null;

  if (hasBearer) {
    token = authHeader.slice('Bearer '.length);
    const verified = await supabaseAuthGetUserId(token);
    if (verified.userId) {
      userId = verified.userId;
    } else if (REQUIRE_AUTH_FOR_AI) {
      // Token provided but invalid - reject in production
      return res.status(401).json({ 
        error: 'Invalid or expired authentication token. Please sign in again.' 
      });
    }
  }

  // Require authentication if configured (default: required in production)
  if (REQUIRE_AUTH_FOR_AI && !userId) {
    return res.status(401).json({ 
      error: 'Authentication required. Please sign in to use this feature.',
      requiresAuth: true
    });
  }

  // Rate limit:
  // - If authenticated: use user-based limiter (persistent in Supabase)
  // - If anonymous: use IP-based limiter (persistent in Supabase, works across instances)
  let rateLimit;
  if (userId && token) {
    rateLimit = await checkRateLimit(token, userId);
  } else {
    const ip = getClientIp(req);
    rateLimit = await checkAnonRateLimit(ip);
  }
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)));
 
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    return res.status(429).json({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
    });
  }
 
  const body = await readJsonBody(req);
  const topic = body && body.topic;
  const difficulty = body && body.difficulty;
  const grade = body && body.grade;
  const isDaily = !!(body && body.isDaily);

  if (!topic || !difficulty || !grade) {
    return res.status(400).json({ error: 'Missing required parameters: topic, difficulty, grade' });
  }
 
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty level' });
  }
 
  if (typeof topic !== 'string' || !topic.trim()) return res.status(400).json({ error: 'Invalid topic' });
  if (typeof grade !== 'string' || !grade.trim()) return res.status(400).json({ error: 'Invalid grade' });
 
  const sanitizedTopic = topic.trim().replace(/[<>]/g, '');
  const sanitizedGrade = grade.trim().replace(/[<>]/g, '');
 
  if (!sanitizedTopic || sanitizedTopic.length > 100) return res.status(400).json({ error: 'Invalid topic' });
  if (!sanitizedGrade || sanitizedGrade.length > 20) return res.status(400).json({ error: 'Invalid grade' });
  if (/<script|javascript:|on\w+\s*=/i.test(sanitizedTopic)) return res.status(400).json({ error: 'Invalid topic' });
  if (/<script|javascript:|on\w+\s*=/i.test(sanitizedGrade)) return res.status(400).json({ error: 'Invalid grade' });
 
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }
 
  const errorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const contentType = getContentType(sanitizedGrade);
  const gradeDescription = getGradeDescription(sanitizedGrade);

  let prompt;
  let validTypes;
  if (isDaily) {
    const rules = getErrorRulesForGrade(sanitizedGrade);
    validTypes = rules.validTypes;
    const constructionRules = rules.sentenceConstructionRules
      ? `\n\n${rules.sentenceConstructionRules}`
      : '';
    prompt = `Create a ${contentType} about ${sanitizedTopic} with exactly ${errorCount} errors for a ${difficulty} level ${gradeDescription} student (daily challenge).

${rules.errorRulesPrompt}
${constructionRules}

Make the ${contentType} engaging and age-appropriate for ${gradeDescription} students.
${sanitizedGrade.includes('K') || sanitizedGrade.includes('1st') || sanitizedGrade.includes('2nd') || sanitizedGrade.includes('3rd') || sanitizedGrade.includes('4th') || sanitizedGrade.includes('5th')
  ? 'Keep it to 1-2 sentences maximum. Use simple, basic vocabulary appropriate for young children. Avoid complex words or concepts.'
  : 'Make it 2-3 sentences that form a cohesive paragraph.'}

Respond ONLY with this exact JSON format (no other text):
{
  "incorrectSentence": "the ${contentType} with errors",
  "correctSentence": "the ${contentType} without errors",
  "errors": [
    {
      "type": "${rules.typeHint}",
      "incorrectText": "the incorrect text",
      "correctText": "the correct text",
      "position": 0
    }
  ]
}`;
  } else {
    validTypes = ['spelling', 'punctuation', 'capitalization'];
    prompt = `Create a ${contentType} about ${sanitizedTopic} with exactly ${errorCount} errors for a ${difficulty} level ${gradeDescription} student.

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
${sanitizedGrade.includes('K') || sanitizedGrade.includes('1st') || sanitizedGrade.includes('2nd') || sanitizedGrade.includes('3rd') || sanitizedGrade.includes('4th') || sanitizedGrade.includes('5th')
  ? 'Keep it to 1-2 sentences maximum. Use simple, basic vocabulary appropriate for young children. Avoid complex words or concepts.'
  : 'Make it 2-3 sentences that form a cohesive paragraph.'}

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
  }
 
  try {
    const openAiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an educational game assistant that creates ${contentType} with intentional spelling, punctuation, and capitalization errors for ${sanitizedGrade} students. Always respond with valid JSON only.`,
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 800,
      }),
    });
 
    const openAiText = await openAiResp.text();
    if (!openAiResp.ok) {
      let parsedErr = null;
      try {
        parsedErr = JSON.parse(openAiText);
      } catch {
        parsedErr = null;
      }
      const openAiStatus = openAiResp.status;
      const openAiCode = parsedErr && parsedErr.error && parsedErr.error.code;
      console.error('OpenAI API error:', { openAiStatus, openAiCode, body: parsedErr || openAiText });
      return res.status(500).json({
        error: 'Failed to generate sentence. Please try again.',
        details: { openAiStatus, openAiCode },
      });
    }
 
    const openAiJson = JSON.parse(openAiText);
    const content = openAiJson && openAiJson.choices && openAiJson.choices[0] && openAiJson.choices[0].message && openAiJson.choices[0].message.content;
    if (typeof content !== 'string') throw new Error('OpenAI response missing message content');
 
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
 
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.incorrectSentence || !parsed.correctSentence || !parsed.errors) throw new Error('Invalid response structure');
 
    for (const e of parsed.errors) {
      if (!validTypes.includes(e.type)) throw new Error(`Invalid error type: ${e.type}`);
    }
 
    return res.status(200).json({
      incorrectSentence: parsed.incorrectSentence,
      correctSentence: parsed.correctSentence,
      errors: parsed.errors,
    });
  } catch (e) {
    console.error('Unhandled generate-sentence error:', { message: e && e.message ? e.message : String(e) });
    return res.status(500).json({ error: 'Internal server error in sentence generator.' });
  }
};

