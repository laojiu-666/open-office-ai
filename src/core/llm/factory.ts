import type { ILLMProvider, ProviderConfig, AIConnection, GenerationProfile } from '@/types';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { getApiUrl } from './presets';
import { CapabilityRouter } from '@core/capability-router';

export interface LLMProviderSelection {
  provider: ILLMProvider;
  connection: AIConnection;
  model: string;
}

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

    case 'gemini':
      return new GeminiProvider(config.apiKey, config.baseUrl);

    // OpenAI 兼容的供应商
    case 'glm':
    case 'doubao':
    case 'deepseek-janus':
    case 'grok':
    case 'custom':
      return new OpenAIProvider(config.apiKey, getUrl(''));

    // 非 OpenAI 兼容的供应商（需要特殊处理）
    case 'qianfan':
    case 'dashscope':
      // 暂时使用 OpenAI Provider 作为兜底，后续可以实现专用 Provider
      return new OpenAIProvider(config.apiKey, getUrl(''));

    default:
      throw new Error(`Unknown provider: ${config.providerId}`);
  }
}

/**
 * 根据能力路由选择连接并创建 LLM Provider
 */
export function createLLMProviderFromConnections(
  connections: AIConnection[],
  generationProfile?: GenerationProfile
): LLMProviderSelection | null {
  const router = new CapabilityRouter(connections, generationProfile);
  const connection = router.getTextConnection();
  if (!connection) {
    return null;
  }
  const model = connection.capabilities?.text?.model || connection.model;
  const config: ProviderConfig = {
    providerId: connection.providerId,
    apiKey: connection.apiKey,
    baseUrl: connection.baseUrl,
    model,
  };
  return { provider: createLLMProvider(config), connection, model };
}

export { OpenAIProvider } from './openai';
export { GeminiProvider } from './gemini';
export { PROVIDER_PRESETS, getProviderPreset, getProviderOptions, normalizeBaseUrl, getApiUrl } from './presets';
