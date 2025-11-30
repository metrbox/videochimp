import { TTSProvider } from '../../types';
import { OpenAITTSProvider } from './openai';
import { KokoroTTSProvider } from './kokoro';
import { OpenRouterTTSProvider } from './openrouter';
import logger from '../../utils/logger';

export class TTSFactory {
  private static providers: Map<string, TTSProvider> = new Map();

  static getProvider(provider: 'openai' | 'openrouter' | 'kokoro'): TTSProvider {
    // Return cached provider if available
    if (this.providers.has(provider)) {
      return this.providers.get(provider)!;
    }

    // Create new provider instance
    let instance: TTSProvider;
    switch (provider) {
      case 'openai':
        instance = new OpenAITTSProvider();
        break;
      case 'kokoro':
        instance = new KokoroTTSProvider();
        break;
      case 'openrouter':
        instance = new OpenRouterTTSProvider();
        break;
      default:
        throw new Error(`Unknown TTS provider: ${provider}`);
    }

    // Cache the instance
    this.providers.set(provider, instance);
    logger.debug(`Created TTS provider: ${provider}`);

    return instance;
  }

  static async generateSpeech(
    text: string,
    provider: 'openai' | 'openrouter' | 'kokoro'
  ): Promise<Buffer> {
    const ttsProvider = this.getProvider(provider);
    return ttsProvider.generateSpeech(text);
  }
}

export * from './openai';
export * from './kokoro';
export * from './openrouter';
