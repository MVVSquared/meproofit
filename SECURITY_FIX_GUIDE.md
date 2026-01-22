# Security Fix Implementation Guide

This guide provides step-by-step instructions to fix the **CRITICAL** security issue: exposed OpenAI API key.

---

## 🔴 CRITICAL FIX: Move OpenAI API to Backend

### Step 1: Create Vercel Serverless Function

Create a new directory and file:

```bash
mkdir -p api/generate-sentence
```

Create `api/generate-sentence.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  // Get API key from server-side environment variable (NOT REACT_APP_*)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Build the prompt (same logic as in llmService.ts)
  const errorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const contentType = getContentType(grade);
  const gradeDescription = getGradeDescription(grade);
  
  const prompt = `Create a ${contentType} about ${topic} with exactly ${errorCount} errors for a ${difficulty} level ${gradeDescription} student.

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
${grade.indexOf('K') !== -1 || grade.indexOf('1st') !== -1 || grade.indexOf('2nd') !== -1 || 
 grade.indexOf('3rd') !== -1 || grade.indexOf('4th') !== -1 || grade.indexOf('5th') !== -1 
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

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an educational game assistant that creates ${contentType} with intentional spelling, punctuation, and capitalization errors for ${grade} students. Always respond with valid JSON only.`
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

    return res.status(200).json({
      incorrectSentence: parsed.incorrectSentence,
      correctSentence: parsed.correctSentence,
      errors: parsed.errors
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    
    // Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'Failed to generate sentence. Please try again.' 
    });
  }
}

// Helper functions (same as in llmService.ts)
function getContentType(grade: string): string {
  if (grade.indexOf('K') !== -1 || grade.indexOf('1st') !== -1 || grade.indexOf('2nd') !== -1 || 
      grade.indexOf('3rd') !== -1 || grade.indexOf('4th') !== -1 || grade.indexOf('5th') !== -1) {
    return 'sentences';
  } else {
    return 'paragraphs';
  }
}

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
```

### Step 2: Install Required Dependencies

```bash
npm install @vercel/node
```

### Step 3: Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Remove** `REACT_APP_OPENAI_API_KEY` (or keep it but don't use it)
3. **Add** `OPENAI_API_KEY` (without `REACT_APP_` prefix) with your OpenAI API key
4. Make sure it's set for **Production**, **Preview**, and **Development** environments

### Step 4: Update llmService.ts

Replace the direct OpenAI API call with a call to your backend:

```typescript
// src/services/llmService.ts

// ❌ REMOVE THIS:
// const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
// const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ✅ ADD THIS:
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export class LLMService {
  static async generateSentenceWithErrors(
    topic: string, 
    difficulty: 'easy' | 'medium' | 'hard',
    grade: string
  ): Promise<LLMResponse> {
    // First, try to get a cached sentence from the database
    try {
      const cachedSentence = await DatabaseService.getCachedSentence(topic, grade, difficulty);
      if (cachedSentence) {
        console.log('Using cached sentence for topic:', topic);
        return {
          incorrectSentence: cachedSentence.incorrectSentence,
          correctSentence: cachedSentence.correctSentence,
          errors: cachedSentence.errors
        };
      }
    } catch (error) {
      console.log('Cache lookup failed, generating new sentence:', error);
    }

    // Call your backend API instead of OpenAI directly
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-sentence`, {
        topic,
        difficulty,
        grade
      });

      const llmResponse: LLMResponse = {
        incorrectSentence: response.data.incorrectSentence,
        correctSentence: response.data.correctSentence,
        errors: response.data.errors
      };

      // Cache the generated sentence in the database
      try {
        await DatabaseService.cacheSentence(llmResponse, topic, grade, difficulty);
        console.log('Cached new sentence for topic:', topic);
      } catch (cacheError) {
        console.error('Failed to cache sentence:', cacheError);
        // Don't throw error - sentence generation was successful
      }

      return llmResponse;
    } catch (error) {
      console.error('Error generating sentence with API:', error);
      console.log('Falling back to predefined sentences');
      return this.getFallbackSentence(topic, grade);
    }
  }

  // ... rest of the class remains the same
}
```

### Step 5: Update vercel.json (if needed)

Ensure your `vercel.json` doesn't interfere with API routes:

```json
{
  "version": 2,
  "name": "meproofit",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build",
        "installCommand": "npm install --legacy-peer-deps"
      }
    },
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 6: Test Locally

1. **Set environment variable locally**:
   ```bash
   # Create .env.local (not .env - this won't be committed)
   OPENAI_API_KEY=your_openai_key_here
   ```

2. **Test the API endpoint**:
   ```bash
   # Start dev server
   npm start
   
   # In another terminal, test the API
   curl -X POST http://localhost:3000/api/generate-sentence \
     -H "Content-Type: application/json" \
     -d '{"topic":"basketball","difficulty":"medium","grade":"3rd"}'
   ```

3. **Test the full flow**:
   - Start the app
   - Try generating a sentence
   - Verify it works through the backend API

### Step 7: Deploy and Verify

1. **Commit your changes**:
   ```bash
   git add api/ src/services/llmService.ts
   git commit -m "Security fix: Move OpenAI API to backend"
   git push origin main
   ```

2. **Verify in Vercel**:
   - Check that the deployment succeeds
   - Verify the API route is accessible
   - Test the sentence generation in production

3. **Verify API key is not exposed**:
   - Open your production site
   - Open browser DevTools → Sources
   - Search for "OPENAI" or "sk-"
   - **You should NOT find your API key** in the client bundle

### Step 8: Clean Up

1. **Remove old environment variable** from Vercel (optional, but recommended):
   - Remove `REACT_APP_OPENAI_API_KEY` from Vercel environment variables
   - Keep it in `.env` for local development if needed (but it won't be used)

2. **Update documentation**:
   - Update `DEPLOYMENT_GUIDE.md` to reflect the new setup
   - Remove references to `REACT_APP_OPENAI_API_KEY` in client-side docs

---

## Testing Checklist

- [ ] API endpoint responds correctly
- [ ] Sentence generation works through backend
- [ ] Error handling works (test with invalid input)
- [ ] Caching still works
- [ ] Fallback sentences work when API fails
- [ ] API key is NOT visible in client-side code
- [ ] Production deployment works
- [ ] Rate limiting considerations (if implemented)

---

## Troubleshooting

### Issue: API route returns 404
**Solution**: Make sure `api/generate-sentence.ts` is in the root directory, not in `src/`

### Issue: Environment variable not found
**Solution**: 
- Verify `OPENAI_API_KEY` is set in Vercel (not `REACT_APP_OPENAI_API_KEY`)
- Redeploy after adding environment variables

### Issue: CORS errors
**Solution**: Vercel API routes should handle CORS automatically, but if issues persist, add CORS headers to the API function

### Issue: API calls failing
**Solution**: 
- Check Vercel function logs
- Verify API key is correct
- Check OpenAI API status
- Verify request format matches OpenAI API requirements

---

## Additional Security Improvements

While implementing this fix, consider also:

1. **Add rate limiting** to the API endpoint
2. **Add request validation** (already included in the code above)
3. **Add authentication** to the API endpoint (verify user is authenticated)
4. **Add logging** for security monitoring
5. **Add error tracking** (Sentry, etc.)

---

## Next Steps

After completing this fix:

1. ✅ Mark the critical security issue as resolved
2. ✅ Move on to HIGH priority issues from SECURITY_REVIEW.md
3. ✅ Update your security documentation
4. ✅ Conduct security testing before production

---

**Estimated Time**: 2-3 hours  
**Priority**: 🔴 CRITICAL - Do not deploy to production until this is fixed
