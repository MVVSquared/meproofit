# MeProofIt - Spelling & Punctuation Game

A fun, educational web game designed for 3rd-5th grade students to practice spelling and punctuation skills. Players are presented with sentences containing intentional errors and have 4 attempts to correct them all.

## Features

- 🎯 **Topic-based Learning**: Choose from 10 engaging topics (Basketball, Animals, Space, etc.)
- 🤖 **AI-Powered Content**: Uses OpenAI GPT-4 to generate unique sentences with intentional errors
- 🎮 **Interactive Gameplay**: Real-time feedback with green/red highlighting for corrections
- 📊 **Progress Tracking**: Score tracking and performance analytics
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Beautiful, child-friendly interface with smooth animations

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: OpenAI GPT-4 API
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- OpenAI API key (optional - fallback sentences available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd meproofit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## LLM Configuration

### OpenAI GPT-4 (Recommended)

The app is configured to use OpenAI's GPT-4 API for generating sentences with errors. This provides:

- **High-quality content**: Age-appropriate, engaging sentences
- **Consistent error patterns**: Mix of spelling, punctuation, and capitalization errors
- **Topic relevance**: Contextually relevant content for each topic
- **Cost-effective**: ~$0.03 per 1K tokens

### Alternative LLM Options

If you prefer different LLM providers:

1. **Anthropic Claude**
   - Very good at educational content
   - Slightly more expensive but reliable
   - Update `llmService.ts` to use Claude API

2. **Google Gemini**
   - Lower cost per token
   - Good performance for text generation
   - Update `llmService.ts` to use Gemini API

3. **Local Models** (for privacy)
   - Consider using Ollama or similar local LLM solutions
   - Update `llmService.ts` to use local API endpoints

### Fallback System

The app includes a robust fallback system with predefined sentences for each topic, ensuring the game works even without API access.

## Game Mechanics

### Scoring System
- **Base Score**: 100 points
- **Attempt Penalty**: -20 points per attempt after the first
- **Correction Bonus**: +10 points per correct correction
- **Minimum Score**: 0 points

### Error Types
- **Spelling**: Common misspellings appropriate for grade level
- **Punctuation**: Missing or incorrect punctuation marks
- **Capitalization**: Missing or incorrect capitalization

### Difficulty Levels
- **Easy**: 2 errors (3rd grade)
- **Medium**: 3 errors (4th grade)  
- **Hard**: 4 errors (5th grade)

## Project Structure

```
src/
├── components/          # React components
│   ├── TopicSelector.tsx
│   └── GameBoard.tsx
├── services/           # API and external services
│   └── llmService.ts
├── utils/              # Utility functions
│   └── gameLogic.ts
├── data/               # Static data
│   └── topics.ts
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## Deployment

### AWS Deployment Options

1. **AWS Amplify** (Recommended for React apps)
   ```bash
   npm install -g @aws-amplify/cli
   amplify init
   amplify add hosting
   amplify publish
   ```

2. **AWS S3 + CloudFront**
   ```bash
   npm run build
   # Upload build/ folder to S3 bucket
   # Configure CloudFront distribution
   ```

3. **AWS Elastic Beanstalk**
   - Create a simple Express.js server to serve the React app
   - Deploy using Elastic Beanstalk

### Environment Variables for Production

Set these in your deployment platform:
```env
REACT_APP_OPENAI_API_KEY=your_production_api_key
NODE_ENV=production
```

## Mobile App Development

The React codebase is designed to be easily portable to mobile platforms:

### React Native
- Most components can be adapted with minimal changes
- Use React Native equivalents for web-specific libraries
- Replace Tailwind CSS with React Native styling

### Expo
- Excellent for rapid mobile development
- Can reuse most of the existing logic
- Built-in deployment to App Store and Google Play

### Flutter (Alternative)
- Rewrite the UI in Flutter
- Reuse the LLM service logic
- Better performance for complex animations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@meproofit.com or create an issue in the repository.

---

**Made with ❤️ for educational excellence** 