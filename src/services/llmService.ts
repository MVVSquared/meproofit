import axios from 'axios';
import { LLMResponse } from '../types';

// You'll need to set up your OpenAI API key in environment variables
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class LLMService {
  static async generateSentenceWithErrors(topic: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<LLMResponse> {
    // Only use fallback if API key is completely missing
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'test_key' || OPENAI_API_KEY === 'disabled') {
      console.log('Using fallback sentences - no valid API key');
      return this.getFallbackSentence(topic);
    }

    const prompt = this.buildPrompt(topic, difficulty);
    
    try {
      const response = await axios.post(OPENAI_API_URL, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an educational game assistant that creates sentences with intentional spelling, punctuation, and capitalization errors for 3rd-5th grade students. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      return this.parseLLMResponse(content);
    } catch (error) {
      console.error('Error generating sentence with LLM:', error);
      console.log('Falling back to predefined sentences');
      return this.getFallbackSentence(topic);
    }
  }

  private static buildPrompt(topic: string, difficulty: string): string {
    const errorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    
    return `Create a sentence about ${topic} with exactly ${errorCount} errors for a ${difficulty} level 3rd-5th grade student.

IMPORTANT: Include a mix of these error types:
- SPELLING errors (common misspellings like "recieve" instead of "receive")
- PUNCTUATION errors (missing commas, periods, apostrophes)
- CAPITALIZATION errors (missing capital letters at start of sentences or proper nouns)

Make the sentence engaging and age-appropriate for 3rd-5th graders.

Respond ONLY with this exact JSON format (no other text):
{
  "incorrectSentence": "the sentence with errors",
  "correctSentence": "the sentence without errors",
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
        if (!validTypes.includes(error.type)) {
          throw new Error(`Invalid error type: ${error.type}`);
        }
      }
      
      return parsed as LLMResponse;
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response');
    }
  }

  // Fallback method for when LLM is not available
  static getFallbackSentence(topic: string): LLMResponse {
    const fallbackSentences = {
      basketball: [
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
        }
      ],
      animals: [
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