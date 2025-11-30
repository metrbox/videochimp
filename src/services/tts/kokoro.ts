import axios from 'axios';
import config from '../../config';
import logger from '../../utils/logger';
import { TTSProvider } from '../../types';

export class KokoroTTSProvider implements TTSProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    if (!config.apiKeys.kokoro) {
      throw new Error('Kokoro API key not configured');
    }
    this.apiUrl = config.tts.kokoro.apiUrl;
    this.apiKey = config.apiKeys.kokoro;
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      logger.debug('Generating speech with Kokoro TTS', { textLength: text.length });

      // Note: Adjust this based on actual Kokoro API documentation
      // This is a common pattern for TTS APIs
      const response = await axios.post(
        this.apiUrl,
        {
          text,
          voice: config.tts.kokoro.voice,
          output_format: 'mp3',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      const buffer = Buffer.from(response.data);
      logger.debug('Kokoro TTS generation complete', { bufferSize: buffer.length });

      return buffer;
    } catch (error) {
      logger.error('Kokoro TTS generation failed', { error });
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Kokoro TTS failed: ${message}`);
      }
      throw new Error(`Kokoro TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
