import OpenAI from 'openai';
import config from '../../config';
import logger from '../../utils/logger';
import { TTSProvider } from '../../types';

export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI;

  constructor() {
    if (!config.apiKeys.openai) {
      throw new Error('OpenAI API key not configured');
    }
    this.client = new OpenAI({ apiKey: config.apiKeys.openai });
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      logger.debug('Generating speech with OpenAI TTS', { textLength: text.length });

      const mp3 = await this.client.audio.speech.create({
        model: config.tts.openai.model,
        voice: config.tts.openai.voice as any,
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      logger.debug('OpenAI TTS generation complete', { bufferSize: buffer.length });

      return buffer;
    } catch (error) {
      logger.error('OpenAI TTS generation failed', { error });
      throw new Error(`OpenAI TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
