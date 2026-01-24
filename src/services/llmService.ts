import axios from 'axios';
import { LLMResponse } from '../types';
import { DatabaseService } from './databaseService';
import AuthService from './authService';

// API endpoint for sentence generation (backend handles OpenAI API key securely)
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

    // Call backend API instead of OpenAI directly (API key is secured on server)
    try {
      // Get Supabase session token for authentication (use singleton to avoid multiple GoTrueClient instances)
      let authToken: string | null = null;
      try {
        const session = await AuthService.getInstance().getSession();
        if (session?.access_token) {
          authToken = session.access_token;
        }
      } catch (authError) {
        // If auth isn't configured/available, we'll continue without a token.
        // The API will return 401 if authentication is required.
        console.log('Auth token lookup failed, continuing without token:', authError);
      }

      // If no auth token, try to continue without it (for backward compatibility with local users)
      // The API will reject the request if authentication is required
      const relativeUrl = '/api/generate-sentence';
      const normalizedBase = API_BASE_URL ? API_BASE_URL.replace(/\/+$/, '') : '';
      const configuredUrl = normalizedBase ? `${normalizedBase}${relativeUrl}` : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const postToApi = async (url: string) =>
        axios.post(
          url,
          { topic, difficulty, grade },
          { headers }
        );

      // Try configured URL first (if set), then fall back to same-origin relative URL.
      // This helps if REACT_APP_API_URL is misconfigured (common cause of 404s).
      let response;
      try {
        response = await postToApi(configuredUrl || relativeUrl);
      } catch (primaryError: any) {
        const status = primaryError?.response?.status;
        const shouldRetryWithRelative =
          !!configuredUrl &&
          configuredUrl !== relativeUrl &&
          status === 404;

        if (shouldRetryWithRelative) {
          console.warn(
            `API endpoint not found at ${configuredUrl}. Retrying with same-origin ${relativeUrl}.`
          );
          response = await postToApi(relativeUrl);
        } else {
          throw primaryError;
        }
      }

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
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401) {
        console.log('Authentication required for AI-generated sentences. Using fallback sentences.');
        // Don't log the full error for 401s to avoid cluttering console
      } else if (error.response?.status === 429) {
        // Handle rate limit errors
        const retryAfter = error.response?.data?.retryAfter || 60;
        console.warn(`Rate limit exceeded. Please wait ${retryAfter} seconds before trying again. Using fallback sentences.`);
        // Could show a user-friendly message here if needed
      } else {
        console.error('Error generating sentence with API:', error.message || error);
      }
      console.log('Falling back to predefined sentences');
      return this.getFallbackSentence(topic, grade);
    }
  }

  private static getContentType(grade: string): string {
    if (grade.indexOf('K') !== -1 || grade.indexOf('1st') !== -1 || grade.indexOf('2nd') !== -1 || 
        grade.indexOf('3rd') !== -1 || grade.indexOf('4th') !== -1 || grade.indexOf('5th') !== -1) {
      return 'sentences';
    } else {
      return 'paragraphs';
    }
  }

  private static buildPrompt(topic: string, difficulty: string, grade: string): string {
    const errorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const contentType = this.getContentType(grade);
    const gradeDescription = this.getGradeDescription(grade);
    
    return `Create a ${contentType} about ${topic} with exactly ${errorCount} errors for a ${difficulty} level ${gradeDescription} student.

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

${grade.indexOf('K') !== -1 ? 'Use very simple words and short sentences. Focus on basic concepts like colors, numbers, simple animals, or everyday objects.' : ''}
${grade.indexOf('1st') !== -1 ? 'Use simple vocabulary and short sentences. Focus on familiar topics like family, school, pets, or basic activities.' : ''}
${grade.indexOf('2nd') !== -1 ? 'Use age-appropriate vocabulary. Focus on familiar topics like friends, games, animals, or simple activities.' : ''}

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

  private static getGradeDescription(grade: string): string {
    if (grade.indexOf('K') !== -1 || grade.indexOf('1st') !== -1 || grade.indexOf('2nd') !== -1 || 
        grade.indexOf('3rd') !== -1 || grade.indexOf('4th') !== -1 || grade.indexOf('5th') !== -1) {
      return 'elementary school';
    } else if (grade.indexOf('6th') !== -1 || grade.indexOf('7th') !== -1 || grade.indexOf('8th') !== -1) {
      return 'middle school';
    } else {
      return 'high school';
    }
  }

  private static validateAndCorrectCapitalization(sentence: string): string {
    // Common words that should NOT be capitalized
    const commonWords = [
      'basketball', 'soccer', 'football', 'baseball', 'tennis', 'swimming',
      'pizza', 'hamburger', 'chicken', 'apple', 'banana', 'orange',
      'cat', 'dog', 'bird', 'fish', 'elephant', 'lion', 'tiger',
      'car', 'bike', 'train', 'plane', 'boat', 'bus',
      'book', 'pencil', 'paper', 'computer', 'phone', 'tablet',
      'spring', 'summer', 'fall', 'winter',
      'math', 'science', 'history', 'english', 'art', 'music',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Split into words and check each one
    const words = sentence.split(' ');
    const correctedWords = words.map((word, index) => {
      // Always capitalize first word of sentence
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }

      // Check if it's a common word that shouldn't be capitalized
      const cleanWord = word.replace(/[.,!?;:'"()]/g, '').toLowerCase();
      if (commonWords.indexOf(cleanWord) !== -1) {
        // Preserve punctuation
        const punctuation = word.match(/[.,!?;:'"()]/g);
        const baseWord = word.replace(/[.,!?;:'"()]/g, '');
        return baseWord.toLowerCase() + (punctuation ? punctuation.join('') : '');
      }

      // Check if it's a proper noun (starts with capital, not in common words)
      // This is a simple heuristic - you might want to expand this
      if (word.charAt(0) === word.charAt(0).toUpperCase() && 
          commonWords.indexOf(word.toLowerCase()) === -1 &&
          word.length > 1) {
        // Keep it capitalized - likely a proper noun
        return word;
      }

      return word;
    });

    return correctedWords.join(' ');
  }

  private static parseLLMResponse(content: string): LLMResponse {
    try {
      // Extract JSON from the response (in case there's extra text)
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
        if (validTypes.indexOf(error.type) === -1) {
          throw new Error(`Invalid error type: ${error.type}`);
        }
      }

      // Validate and correct capitalization in the correct sentence
      const correctedSentence = this.validateAndCorrectCapitalization(parsed.correctSentence);
      
      // If we made corrections, log them for debugging
      if (correctedSentence !== parsed.correctSentence) {
        console.log('Capitalization corrected:', {
          original: parsed.correctSentence,
          corrected: correctedSentence
        });
      }

      // Update the response with corrected sentence
      const validatedResponse: LLMResponse = {
        incorrectSentence: parsed.incorrectSentence,
        correctSentence: correctedSentence,
        errors: parsed.errors
      };
      
      return validatedResponse;
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response');
    }
  }

  // Fallback method for when LLM is not available
  static getFallbackSentence(topic: string, grade: string): LLMResponse {
    
    const fallbackSentences = {
      basketball: [
        // Elementary school sentences
        {
          incorrectSentence: "the basketball player shooted the ball into the hoop!",
          correctSentence: "The basketball player shot the ball into the hoop!",
          errors: [
            { type: "capitalization" as const, incorrectText: "the", correctText: "The", position: 0 },
            { type: "spelling" as const, incorrectText: "shooted", correctText: "shot", position: 4 }
          ]
        },
        {
          incorrectSentence: "michael jordan was one of the best basketball players ever.",
          correctSentence: "Michael Jordan was one of the best basketball players ever.",
          errors: [
            { type: "capitalization" as const, incorrectText: "michael", correctText: "Michael", position: 0 },
            { type: "capitalization" as const, incorrectText: "jordan", correctText: "Jordan", position: 1 }
          ]
        },
        // Middle/High school paragraphs
        {
          incorrectSentence: "basketball was invented by dr james naismith in 1891. he created the game to keep his students active during the winter months. the first basketball game was played with a soccer ball and two peach baskets.",
          correctSentence: "Basketball was invented by Dr. James Naismith in 1891. He created the game to keep his students active during the winter months. The first basketball game was played with a soccer ball and two peach baskets.",
          errors: [
            { type: "capitalization" as const, incorrectText: "basketball", correctText: "Basketball", position: 0 },
            { type: "punctuation" as const, incorrectText: "dr james", correctText: "Dr. James", position: 3 },
            { type: "capitalization" as const, incorrectText: "he", correctText: "He", position: 8 },
            { type: "capitalization" as const, incorrectText: "the", correctText: "The", position: 12 }
          ]
        }
      ],
      animals: [
        // Elementary school sentences
        {
          incorrectSentence: "the cat sleeped peacefully on the soft bed.",
          correctSentence: "The cat slept peacefully on the soft bed.",
          errors: [
            { type: "capitalization" as const, incorrectText: "the", correctText: "The", position: 0 },
            { type: "spelling" as const, incorrectText: "sleeped", correctText: "slept", position: 4 }
          ]
        },
        {
          incorrectSentence: "elephants are the biggest land animals in the world!",
          correctSentence: "Elephants are the biggest land animals in the world!",
          errors: [
            { type: "capitalization" as const, incorrectText: "elephants", correctText: "Elephants", position: 0 }
          ]
        },
        // Middle/High school paragraphs
        {
          incorrectSentence: "lions are known as the kings of the jungle. they live in groups called prides and hunt together. female lions do most of the hunting for the pride.",
          correctSentence: "Lions are known as the kings of the jungle. They live in groups called prides and hunt together. Female lions do most of the hunting for the pride.",
          errors: [
            { type: "capitalization" as const, incorrectText: "lions", correctText: "Lions", position: 0 },
            { type: "capitalization" as const, incorrectText: "they", correctText: "They", position: 4 },
            { type: "capitalization" as const, incorrectText: "female", correctText: "Female", position: 8 }
          ]
        }
      ],
      space: [
        {
          incorrectSentence: "astronauts float in space because there is no gravity.",
          correctSentence: "Astronauts float in space because there is no gravity.",
          errors: [
            { type: "capitalization" as const, incorrectText: "astronauts", correctText: "Astronauts", position: 0 }
          ]
        },
        {
          incorrectSentence: "the moon orbits around the earth every 28 days.",
          correctSentence: "The moon orbits around the Earth every 28 days.",
          errors: [
            { type: "capitalization" as const, incorrectText: "the", correctText: "The", position: 0 },
            { type: "capitalization" as const, incorrectText: "earth", correctText: "Earth", position: 5 }
          ]
        }
      ],
      ocean: [
        {
          incorrectSentence: "dolphins are very smart animals that live in the ocean.",
          correctSentence: "Dolphins are very smart animals that live in the ocean.",
          errors: [
            { type: "capitalization" as const, incorrectText: "dolphins", correctText: "Dolphins", position: 0 }
          ]
        },
        {
          incorrectSentence: "the great barrier reef is the largest coral reef in the world!",
          correctSentence: "The Great Barrier Reef is the largest coral reef in the world!",
          errors: [
            { type: "capitalization" as const, incorrectText: "the", correctText: "The", position: 0 },
            { type: "capitalization" as const, incorrectText: "great", correctText: "Great", position: 1 },
            { type: "capitalization" as const, incorrectText: "barrier", correctText: "Barrier", position: 2 }
          ]
        }
      ],
      dinosaurs: [
        {
          incorrectSentence: "tyrannosaurus rex was one of the biggest dinosaurs ever.",
          correctSentence: "Tyrannosaurus rex was one of the biggest dinosaurs ever.",
          errors: [
            { type: "capitalization" as const, incorrectText: "tyrannosaurus", correctText: "Tyrannosaurus", position: 0 }
          ]
        },
        {
          incorrectSentence: "dinosaurs lived on earth millions of years ago.",
          correctSentence: "Dinosaurs lived on Earth millions of years ago.",
          errors: [
            { type: "capitalization" as const, incorrectText: "dinosaurs", correctText: "Dinosaurs", position: 0 },
            { type: "capitalization" as const, incorrectText: "earth", correctText: "Earth", position: 3 }
          ]
        }
      ],
      weather: [
        {
          incorrectSentence: "thunderstorms can be scary but they are also exciting!",
          correctSentence: "Thunderstorms can be scary, but they are also exciting!",
          errors: [
            { type: "capitalization" as const, incorrectText: "thunderstorms", correctText: "Thunderstorms", position: 0 },
            { type: "punctuation" as const, incorrectText: "scary but", correctText: "scary, but", position: 3 }
          ]
        },
        {
          incorrectSentence: "snow falls from clouds when the temperature is below freezing.",
          correctSentence: "Snow falls from clouds when the temperature is below freezing.",
          errors: [
            { type: "capitalization" as const, incorrectText: "snow", correctText: "Snow", position: 0 }
          ]
        }
      ],
      food: [
        {
          incorrectSentence: "pizza is one of the most popular foods in the world.",
          correctSentence: "Pizza is one of the most popular foods in the world.",
          errors: [
            { type: "capitalization" as const, incorrectText: "pizza", correctText: "Pizza", position: 0 }
          ]
        },
        {
          incorrectSentence: "chocolate chip cookies are my favorite dessert!",
          correctSentence: "Chocolate chip cookies are my favorite dessert!",
          errors: [
            { type: "capitalization" as const, incorrectText: "chocolate", correctText: "Chocolate", position: 0 }
          ]
        }
      ],
      sports: [
        {
          incorrectSentence: "soccer is played by millions of people around the world.",
          correctSentence: "Soccer is played by millions of people around the world.",
          errors: [
            { type: "capitalization" as const, incorrectText: "soccer", correctText: "Soccer", position: 0 }
          ]
        },
        {
          incorrectSentence: "the olympic games bring athletes from many countries together.",
          correctSentence: "The Olympic Games bring athletes from many countries together.",
          errors: [
            { type: "capitalization" as const, incorrectText: "the", correctText: "The", position: 0 },
            { type: "capitalization" as const, incorrectText: "olympic", correctText: "Olympic", position: 1 },
            { type: "capitalization" as const, incorrectText: "games", correctText: "Games", position: 2 }
          ]
        }
      ],
      school: [
        {
          incorrectSentence: "reading books helps students learn new things every day.",
          correctSentence: "Reading books helps students learn new things every day.",
          errors: [
            { type: "capitalization" as const, incorrectText: "reading", correctText: "Reading", position: 0 }
          ]
        },
        {
          incorrectSentence: "math and science are important subjects in school!",
          correctSentence: "Math and Science are important subjects in school!",
          errors: [
            { type: "capitalization" as const, incorrectText: "math", correctText: "Math", position: 0 },
            { type: "capitalization" as const, incorrectText: "science", correctText: "Science", position: 2 }
          ]
        }
      ],
      nature: [
        {
          incorrectSentence: "trees provide oxygen for all living things on earth.",
          correctSentence: "Trees provide oxygen for all living things on Earth.",
          errors: [
            { type: "capitalization" as const, incorrectText: "trees", correctText: "Trees", position: 0 },
            { type: "capitalization" as const, incorrectText: "earth", correctText: "Earth", position: 6 }
          ]
        },
        {
          incorrectSentence: "flowers bloom in the spring when the weather gets warmer.",
          correctSentence: "Flowers bloom in the spring when the weather gets warmer.",
          errors: [
            { type: "capitalization" as const, incorrectText: "flowers", correctText: "Flowers", position: 0 }
          ]
        }
      ]
    };

    const topicSentences = fallbackSentences[topic as keyof typeof fallbackSentences] || fallbackSentences.basketball;
    
    // Randomly select one of the sentences for this topic
    const randomIndex = Math.floor(Math.random() * topicSentences.length);
    return topicSentences[randomIndex];
  }
} 