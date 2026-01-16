import type { LLMProviderId, ProviderPreset } from '@/types';

/**
 * 供应商预设配置
 * - defaultBaseUrl: 用户只需填写此 URL，无需添加 /v1
 * - apiPathSuffix: 系统自动拼接的路径后缀
 */
export const PROVIDER_PRESETS: Record<LLMProviderId, ProviderPreset> = {
  openai: {
    providerId: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
  },
  anthropic: {
    providerId: 'anthropic',
    label: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    apiPathSuffix: '',
    isOpenAICompatible: false,
  },
  gemini: {
    providerId: 'gemini',
    label: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-pro',
    apiPathSuffix: '/v1beta',
    isOpenAICompatible: false,
  },
  deepseek: {
    providerId: 'deepseek',
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
  },
  glm: {
    providerId: 'glm',
    label: '智谱 GLM',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas',
    defaultModel: 'glm-4',
    apiPathSuffix: '/v4',
    isOpenAICompatible: true,
  },
  doubao: {
    providerId: 'doubao',
    label: '字节豆包',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api',
    defaultModel: '',
    apiPathSuffix: '/v3',
    isOpenAICompatible: true,
  },
  kimi: {
    providerId: 'kimi',
    label: 'Moonshot Kimi',
    defaultBaseUrl: 'https://api.moonshot.cn',
    defaultModel: 'moonshot-v1-8k',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
  },
  custom: {
    providerId: 'custom',
    label: '自定义 (OpenAI 兼容)',
    defaultBaseUrl: '',
    defaultModel: '',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
  },
};

/**
 * 获取供应商预设
 */
export function getProviderPreset(providerId: LLMProviderId): ProviderPreset {
  return PROVIDER_PRESETS[providerId];
}

/**
 * 获取所有供应商选项（用于 UI 下拉列表）
 */
export function getProviderOptions(): Array<{ value: LLMProviderId; label: string }> {
  return Object.values(PROVIDER_PRESETS).map((preset) => ({
    value: preset.providerId,
    label: preset.label,
  }));
}

/**
 * 规范化 Base URL
 * - 移除尾部斜杠
 * - 移除已存在的 API 路径后缀（如 /v1）
 */
export function normalizeBaseUrl(baseUrl: string, providerId: LLMProviderId): string {
  let url = baseUrl.trim();

  // 移除尾部斜杠
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // 获取预设的路径后缀
  const preset = PROVIDER_PRESETS[providerId];
  const suffix = preset.apiPathSuffix;

  // 如果 URL 已包含路径后缀，移除它
  if (suffix && url.endsWith(suffix)) {
    url = url.slice(0, -suffix.length);
  }

  return url;
}

/**
 * 获取完整的 API URL
 * @param baseUrl 用户输入的 base URL（不含 /v1）
 * @param providerId 供应商 ID
 * @param endpoint API 端点（如 /chat/completions）
 */
export function getApiUrl(
  baseUrl: string,
  providerId: LLMProviderId,
  endpoint: string
): string {
  const normalizedBase = normalizeBaseUrl(baseUrl, providerId);
  const preset = PROVIDER_PRESETS[providerId];

  // 拼接: baseUrl + apiPathSuffix + endpoint
  return `${normalizedBase}${preset.apiPathSuffix}${endpoint}`;
}
