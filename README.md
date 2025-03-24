# OpenAI Voice Chat Application

A real-time voice chat application powered by OpenAI's speech-to-text and text-to-speech APIs. This application allows users to have a natural voice conversation with OpenAI, with responses delivered in audio form.

## Features

- Real-time voice chat with OpenAI
- Speech-to-text using OpenAI Whisper API
- Text-to-speech using OpenAI TTS API
- WebSocket integration for real-time communication
- Beautiful, responsive UI

## Project Structure

- `frontend/`: Next.js application with React and TypeScript
- `backend/`: Express.js server with Socket.IO for WebSockets

## Setup Instructions

### Prerequisites

- Node.js v14 or higher
- OpenAI API key

### Environment Setup

1. Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Start the backend server:

```bash
npm start
```

The server will run on http://localhost:5000.

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will run on http://localhost:3000.

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Click on the "Try Voice Chat" button or navigate to the Voice Chat page
3. Click the microphone button to start recording
4. Speak your message
5. Click the button again to stop recording and send your message
6. Wait for OpenAI's audio response

## Technical Details

- WebSockets (Socket.IO) for real-time communication
- OpenAI Whisper API for speech-to-text transcription
- OpenAI GPT-3.5 for generating responses
- OpenAI TTS-1 for converting text responses to speech
- React hooks for state management
- MediaRecorder API for audio recording

## License

MIT
