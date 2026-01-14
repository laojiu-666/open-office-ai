import type { ILLMProvider, LLMProviderId, ProviderConfig } from '@/types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

export function createLLMProvider(config: ProviderConfig): ILLMProvider {
  switch (config.providerId) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.baseUrl);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.baseUrl);
    case 'custom':
      // Custom provider uses OpenAI-compatible API
      return new OpenAIProvider(config.apiKey, config.baseUrl);
    default:
      throw new Error(`Unknown provider: ${config.providerId}`);
  }
}

export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
