# AI.tv

AI.tv is a Next.js application that provides real-time video analysis, commentary, and viewer chat simulation for streaming content.

## Features

- **Real-time Video Analysis**: Captures frames from videos at configurable FPS for processing
- **Live Commentary System**: Dual commentators with configurable personalities providing analysis and reactions
- **Viewer Chat Simulation**: Creates virtual viewer personas that respond to video content
- **Memory System**: Maintains context of previously seen content for continuity
- **Audio Transcription**: Processes uploaded audio files and returns text transcripts

## Technology Stack

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS with Shadcn UI components

### Backend
- Next.js API routes for chat, commentary, and transcription
- Stream-based response handling for real-time interactivity

### Model Integration
- **Llama Models**: Utilizes Meta's Llama 4 models for text generation
  - Llama 4 Scout for chat interactions
  - Llama 4 Maverick for detailed commentary and memory systems
- **Groq Integration**: High-performance inference API for delivering fast model responses
  - Text generation with configurable parameters
  - Text-to-speech using PlayAI voices for commentary

## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, set up your environment variables:

```
LLAMA_API_KEY=your_llama_api_key (Require updating code in the api endpoints)
GROQ_API_KEY=your_groq_api_key
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Configuration

The application includes several configuration files:

- `videoConfig.ts`: Frame rate and video processing settings
- `commentatorConfig.ts`: Commentator personalities and behavior
- `chatConfig.ts`: Chat message generation parameters
- `audioConfig.ts`: Audio processing settings