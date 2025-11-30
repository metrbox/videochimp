# VideoChimp

AI-powered video generation service that automatically creates professional explainer videos by combining images with AI-generated voiceovers.

## Features

- **Multiple TTS Providers**: Support for OpenAI, OpenRouter, and Kokoro API
- **Async Processing**: Job queue system for handling multiple video generation requests
- **High Quality Output**: 1920x1080 video output with proper scaling and padding
- **RESTful API**: Simple API endpoints for video generation and job management
- **Flexible Audio**: Multiple TTS provider options for voiceover generation

## Prerequisites

- Node.js 18+ or TypeScript runtime
- Redis (for job queue)
- FFmpeg (for video processing)

### Installing FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Installing Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Use Redis Docker image or WSL

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd videochimp
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with API keys:
```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379

# Add your API keys
OPENAI_API_KEY=your_openai_key
OPENROUTER_API_KEY=your_openrouter_key
KOKORO_API_KEY=your_kokoro_key

# Choose default TTS provider
DEFAULT_TTS_PROVIDER=openai
```

## Usage

### Development

Start the development server with hot reload:
```bash
npm run dev
```

### Production

Build and run:
```bash
npm run build
npm start
```

## API Endpoints

### 1. Generate Video

**POST** `/api/videos/generate`

Creates a new video generation job.

**Request Body:**
```json
{
  "segments": [
    {
      "imageUrl": "https://example.com/image1.jpg",
      "script": "Welcome to this explainer video. Today we'll discuss..."
    },
    {
      "imageUrl": "https://example.com/image2.jpg",
      "script": "In this section, we explore the key concepts..."
    }
  ],
  "ttsProvider": "openai"
}
```

**Parameters:**
- `segments` (required): Array of video segments
  - `imageUrl` (required): URL to the image
  - `script` (required): Text to be converted to speech
- `ttsProvider` (optional): TTS provider to use (`openai`, `openrouter`, or `kokoro`). Defaults to `DEFAULT_TTS_PROVIDER` from config.

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Video generation job created"
}
```

### 2. Check Job Status

**GET** `/api/videos/jobs/:jobId`

Gets the current status of a video generation job.

**Response:**
```json
{
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "complete",
    "videoUrl": "/api/videos/download/550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:35:00.000Z"
  }
}
```

**Status Values:**
- `pending`: Job is queued
- `processing`: Video is being generated
- `complete`: Video is ready for download
- `failed`: Job failed (check `error` field)

### 3. Download Video

**GET** `/api/videos/download/:jobId`

Downloads the generated video file.

**Response:**
- Content-Type: `video/mp4`
- Binary video file

### 4. Health Check

**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Example Usage with cURL

### Generate a video:
```bash
curl -X POST http://localhost:3000/api/videos/generate \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {
        "imageUrl": "https://example.com/image1.jpg",
        "script": "Hello and welcome to this video"
      },
      {
        "imageUrl": "https://example.com/image2.jpg",
        "script": "This is the second part of our presentation"
      }
    ],
    "ttsProvider": "openai"
  }'
```

### Check job status:
```bash
curl http://localhost:3000/api/videos/jobs/YOUR_JOB_ID
```

### Download video:
```bash
curl -O http://localhost:3000/api/videos/download/YOUR_JOB_ID
```

## Example Usage with n8n

The provided n8n workflow demonstrates integration:

1. **Data Analysis**: Analyzes data and generates a report
2. **Story Creation**: Converts report into structured segments with visual prompts and scripts
3. **Image Generation**: Creates images from visual prompts
4. **Video Generation**: Calls VideoChimp API to generate final video
5. **Polling**: Waits for job completion
6. **Download**: Retrieves the final video

See the n8n workflow JSON in the project for the complete example.

## TTS Provider Configuration

### OpenAI TTS
```env
OPENAI_API_KEY=sk-...
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
```

Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### Kokoro API
```env
KOKORO_API_KEY=your_key
KOKORO_API_URL=https://api.kokoro.ai/v1/tts
KOKORO_VOICE=en-us-1
```

**Note**: Adjust the API URL and voice based on Kokoro's actual API documentation.

### OpenRouter
```env
OPENROUTER_API_KEY=your_key
OPENROUTER_TTS_MODEL=openai/tts-1
```

**Note**: OpenRouter primarily routes LLM requests. The TTS implementation assumes they might route to OpenAI's TTS or similar services.

## Architecture

```
videochimp/
├── src/
│   ├── config/          # Configuration management
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── tts/        # TTS provider implementations
│   │   ├── video.ts    # Video generation service
│   │   └── queue.ts    # Job queue management
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   └── index.ts        # Application entry point
├── uploads/            # Temporary file storage
└── outputs/            # Generated videos
```

## Video Processing Pipeline

1. **Job Creation**: API receives segments and creates a job
2. **Queue**: Job is added to Redis-backed queue
3. **Worker Processing**:
   - Download images from URLs
   - Generate audio using selected TTS provider
   - Create video segments (image + audio)
   - Merge all segments into final video
4. **Completion**: Video is saved and URL is provided

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `202`: Accepted (job created)
- `400`: Bad request (validation errors)
- `404`: Not found
- `500`: Server error

Error responses include descriptive messages:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Limitations

- Maximum video quality: 1920x1080
- Images are scaled and padded to maintain aspect ratio
- Audio format: MP3 with AAC encoding
- Video format: MP4 (H.264)

## Development

### Project Structure
- TypeScript for type safety
- Express for API server
- BullMQ for job queue
- FFmpeg for video processing
- Winston for logging

### Adding a New TTS Provider

1. Create provider class in `src/services/tts/`:
```typescript
export class NewTTSProvider implements TTSProvider {
  async generateSpeech(text: string): Promise<Buffer> {
    // Implementation
  }
}
```

2. Add to `TTSFactory` in `src/services/tts/index.ts`

3. Update configuration and types

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open a GitHub issue.
