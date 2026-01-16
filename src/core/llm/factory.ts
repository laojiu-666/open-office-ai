import type { ILLMProvider, ProviderConfig } from '@/types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { getApiUrl } from './presets';

/**
 * 创建 LLM Provider 实例
 * @param config Provider 配置
 * @returns ILLMProvider 实例
 */
export function createLLMProvider(config: ProviderConfig): ILLMProvider {
  // 使用 URL 规范化获取完整的 API URL
  const getUrl = (endpoint: string) => getApiUrl(config.baseUrl, config.providerId, endpoint);

  switch (config.providerId) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, getUrl(''));

    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.baseUrl);

    case 'gemini':
      return new GeminiProvider(config.apiKey, config.baseUrl);

    // OpenAI 兼容的国内供应商
    case 'deepseek':
    case 'glm':
    case 'doubao':
    case 'kimi':
    case 'custom':
      return new OpenAIProvider(config.apiKey, getUrl(''));

    default:
      throw new Error(`Unknown provider: ${config.providerId}`);
  }
}

export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GeminiProvider } from './gemini';
export { PROVIDER_PRESETS, getProviderPreset, getProviderOptions, normalizeBaseUrl, getApiUrl } from './presets';
