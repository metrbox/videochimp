export interface VideoSegment {
  imageUrl: string;
  script: string;
}

export interface VideoGenerationRequest {
  segments: VideoSegment[];
  ttsProvider?: 'openai' | 'openrouter' | 'kokoro';
}

export interface JobData {
  id: string;
  segments: VideoSegment[];
  ttsProvider: 'openai' | 'openrouter' | 'kokoro';
  status: 'pending' | 'processing' | 'complete' | 'failed';
  videoUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TTSProvider {
  generateSpeech(text: string): Promise<Buffer>;
}
