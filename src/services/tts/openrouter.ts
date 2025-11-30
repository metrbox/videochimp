import axios from 'axios';
import config from '../../config';
import logger from '../../utils/logger';
import { TTSProvider } from '../../types';

export class OpenRouterTTSProvider implements TTSProvider {
  private apiKey: string;

  constructor() {
    if (!config.apiKeys.openrouter) {
      throw new Error('OpenRouter API key not configured');
    }
    this.apiKey = config.apiKeys.openrouter;
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      logger.debug('Generating speech with OpenRouter TTS', { textLength: text.length });

      // Note: OpenRouter primarily routes LLM requests
      // This implementation assumes they might route TTS requests in the future
      // or route to OpenAI's TTS through their service
      const response = await axios.post(
        'https://openrouter.ai/api/v1/audio/speech',
        {
          model: config.tts.openrouter.model || 'openai/tts-1',
          input: text,
          voice: 'alloy',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://videochimp.app',
          },
          responseType: 'arraybuffer',
        }
      );

      const buffer = Buffer.from(response.data);
      logger.debug('OpenRouter TTS generation complete', { bufferSize: buffer.length });

      return buffer;
    } catch (error) {
      logger.error('OpenRouter TTS generation failed', { error });
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`OpenRouter TTS failed: ${message}`);
      }
      throw new Error(`OpenRouter TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
