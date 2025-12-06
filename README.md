# AI Virtual Tour 🎙️🏠

A full-stack web application that generates AI-powered virtual tour scripts and converts them to speech with optional background music. Perfect for real estate listings, property tours, and promotional content creation.

![AI Virtual Tour](https://img.shields.io/badge/AI-Virtual_Tour-blue)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18.2-green)

## ✨ Features

- **AI Script Generation**: Uses Ollama-powered LLMs to create engaging virtual tour scripts
- **Text-to-Speech**: ElevenLabs integration for high-quality voice synthesis
- **Background Music**: Mix background music with generated speech
- **Multiple Moods**: Cinematic, Professional, Friendly, Inspiring, and Dramatic voice options
- **Flexible Duration**: Generate scripts for 15, 30, or 45-second tours
- **Real-time Audio Playback**: Immediate audio preview with base64 encoding
- **Comparison Tool**: Compare different AI-generated scripts side-by-side
- **Fallback Support**: Browser-based speech synthesis when ElevenLabs is unavailable

## 🏗️ Architecture

```
cursor-hackathon/
├── frontend/          # React TypeScript app (Vite)
├── server/           # Node.js Express API server
├── package.json      # Root package configuration
└── README.md         # This file
```

### Frontend (React + TypeScript + Vite)
- Modern React 19 with TypeScript
- Responsive UI with custom CSS
- Real-time audio playback
- Background music volume controls
- Script editing capabilities

### Backend (Node.js + Express)
- RESTful API endpoints
- Ollama integration for AI script generation
- ElevenLabs TTS integration
- Audio mixing capabilities
- File upload and output management

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (with built-in fetch support)
- **Ollama** running locally (for AI script generation)
- **ElevenLabs API key** (optional, for high-quality TTS)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd cursor-hackathon

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install server dependencies
cd ../server
npm install
```

2. **Set up Ollama:**
```bash
# Install Ollama from https://ollama.ai/
ollama serve

# Pull a model (recommended: phi3 or llama2)
ollama pull phi3:latest
```

3. **Configure environment variables:**

Create `.env.local` in the `server/` directory:
```env
PORT=3001
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=phi3:latest
ELEVENLABS_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE=alloy
USE_MOCK=false
```

Create `.env` in the `frontend/` directory:
```env
VITE_API_BASE=http://localhost:3001
```

### Running the Application

1. **Start the backend server:**
```bash
cd server
npm start
```

2. **Start the frontend (in a new terminal):**
```bash
cd frontend
npm run dev
```

3. **Open your browser:**
Navigate to `http://localhost:5173`

## 📖 Usage

### Creating a Virtual Tour

1. **Enter Property Details**: Describe your property or topic in the text area
2. **Select Mood**: Choose from Cinematic, Professional, Friendly, Inspiring, or Dramatic
3. **Set Duration**: Select 15, 30, or 45 seconds
4. **Generate Script**: Click "Generate Script" to create AI-powered content
5. **Customize**: Edit the generated script as needed
6. **Add Background Music** (optional):
   - Check "Background music" option
   - Enter filename from `server/music/` directory or remote URL
   - Adjust volume slider
7. **Generate Voice**: Click "Generate Voice" to convert script to speech

### Using the Comparator

Switch to the "Compare" tab to compare different AI-generated scripts side-by-side.

## 🔧 API Endpoints

### POST `/api/generate-script`
Generate AI script from property description.

**Request Body:**
```json
{
  "inputText": "Property description...",
  "mood": "cinematic",
  "duration": 30
}
```

**Response:**
```json
{
  "script": "Generated tour script...",
  "source": "ollama"
}
```

### POST `/api/tts`
Convert script to speech with optional background music.

**Request Body:**
```json
{
  "script": "Tour script text...",
  "voice": "alloy",
  "format": "mp3",
  "returnType": "base64",
  "backgroundMusic": "ambient_loop.mp3",
  "bgVolume": 0.18
}
```

**Response:**
```json
{
  "audioBase64": "base64_encoded_audio...",
  "source": "elevenlabs"
}
```

## 🎵 Background Music

Place audio files in the `server/music/` directory. Supported formats:
- MP3
- WAV
- Remote URLs supported

## 🔧 Configuration

### Environment Variables

#### Server (.env.local)
- `PORT`: Server port (default: 3001)
- `OLLAMA_URL`: Ollama API URL (default: http://localhost:11434)
- `OLLAMA_MODEL`: AI model to use (default: phi3:latest)
- `ELEVENLABS_KEY`: ElevenLabs API key
- `ELEVENLABS_VOICE`: Default voice ID (default: alloy)
- `USE_MOCK`: Use mock responses for testing (default: false)

#### Frontend (.env)
- `VITE_API_BASE`: Backend API URL (default: http://localhost:3001)

## 🛠️ Development

### Available Scripts

#### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

#### Server
```bash
npm start        # Start server with nodemon
npm run dev      # Start server (same as start)
```

### Project Structure

```
frontend/
├── src/
│   ├── App.tsx           # Main application component
│   ├── Comparator.tsx    # Script comparison tool
│   ├── components/       # Reusable components
│   ├── index.css         # Global styles
│   └── main.tsx          # Application entry point
└── package.json

server/
├── index.js              # Express server
├── mock-responses.json   # Mock data for testing
├── outputs/              # Generated audio files
├── music/                # Background music files
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC License

## 🙏 Acknowledgments

- **Ollama** for local AI model hosting
- **ElevenLabs** for high-quality text-to-speech
- **React & Vite** for the modern frontend framework
- **Express.js** for the robust backend API

## 🐛 Troubleshooting

### Common Issues

1. **Ollama connection failed**
   - Ensure Ollama is running: `ollama serve`
   - Check OLLAMA_URL in environment variables

2. **ElevenLabs TTS not working**
   - Verify ELEVENLABS_KEY is set correctly
   - Check API key validity on ElevenLabs dashboard

3. **Audio not playing**
   - Check browser console for errors
   - Ensure HTTPS in production (required for audio playback)
   - Try the browser fallback speech synthesis

4. **CORS errors**
   - Frontend and backend must run on different ports
   - Check ALLOWED_ORIGINS in server configuration

### Mock Mode

Set `USE_MOCK=true` in server environment to use mock responses for testing without external APIs.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Ensure all prerequisites are properly installed

---

**Happy touring! 🎉**
