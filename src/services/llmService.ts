import axios from 'axios';
import { LLMResponse } from '../types';

// You'll need to set up your OpenAI API key in environment variables
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class LLMService {
  static async generateSentenceWithErrors(topic: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<LLMResponse> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildPrompt(topic, difficulty);
    
    try {
      const response = await axios.post(OPENAI_API_URL, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an educational game assistant that creates sentences with intentional spelling and punctuation errors for 3rd-5th grade students.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
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
      console.error('Error generating sentence:', error);
      throw new Error('Failed to generate sentence with errors');
    }
  }

  private static buildPrompt(topic: string, difficulty: string): string {
    const errorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    
    return `Create a sentence about ${topic} with exactly ${errorCount} errors (mix of spelling, punctuation, and capitalization errors) for a ${difficulty} level 3rd-5th grade student.

Please respond in this exact JSON format:
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
}

Make sure the sentence is engaging and age-appropriate.`;
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
      
      return parsed as LLMResponse;
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response');
    }
  }

  // Fallback method for when LLM is not available
  static getFallbackSentence(topic: string): LLMResponse {
    const fallbackSentences = {
      basketball: {
        incorrectSentence: "the basketball player shooted the ball into the hoop!",
        correctSentence: "The basketball player shot the ball into the hoop!",
        errors: [
          {
            type: "capitalization" as const,
            incorrectText: "the",
            correctText: "The",
            position: 0
          },
          {
            type: "spelling" as const,
            incorrectText: "shooted",
            correctText: "shot",
            position: 4
          }
        ]
      },
      animals: {
        incorrectSentence: "the cat sleeped peacefully on the soft bed.",
        correctSentence: "The cat slept peacefully on the soft bed.",
        errors: [
          {
            type: "capitalization" as const,
            incorrectText: "the",
            correctText: "The",
            position: 0
          },
          {
            type: "spelling" as const,
            incorrectText: "sleeped",
            correctText: "slept",
            position: 4
          }
        ]
      },
      space: {
        incorrectSentence: "astronauts float in space because there is no gravity.",
        correctSentence: "Astronauts float in space because there is no gravity.",
        errors: [
          {
            type: "capitalization" as const,
            incorrectText: "astronauts",
            correctText: "Astronauts",
            position: 0
          }
        ]
      }
    };

    const fallback = fallbackSentences[topic as keyof typeof fallbackSentences] || fallbackSentences.basketball;
    return fallback;
  }
} 