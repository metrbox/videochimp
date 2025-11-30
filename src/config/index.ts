import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  apiKeys: {
    openai?: string;
    openrouter?: string;
    kokoro?: string;
  };
  storage: {
    uploadDir: string;
    outputDir: string;
  };
  tts: {
    defaultProvider: 'openai' | 'openrouter' | 'kokoro';
    openai: {
      model: string;
      voice: string;
    };
    kokoro: {
      apiUrl: string;
      voice: string;
    };
    openrouter: {
      model: string;
    };
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    kokoro: process.env.KOKORO_API_KEY,
  },
  storage: {
    uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
    outputDir: path.resolve(process.env.OUTPUT_DIR || './outputs'),
  },
  tts: {
    defaultProvider: (process.env.DEFAULT_TTS_PROVIDER as any) || 'openai',
    openai: {
      model: process.env.OPENAI_TTS_MODEL || 'tts-1',
      voice: process.env.OPENAI_TTS_VOICE || 'alloy',
    },
    kokoro: {
      apiUrl: process.env.KOKORO_API_URL || 'https://api.kokoro.ai/v1/tts',
      voice: process.env.KOKORO_VOICE || 'en-us-1',
    },
    openrouter: {
      model: process.env.OPENROUTER_TTS_MODEL || '',
    },
  },
};

// Ensure storage directories exist
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}
if (!fs.existsSync(config.storage.outputDir)) {
  fs.mkdirSync(config.storage.outputDir, { recursive: true });
}

export default config;
