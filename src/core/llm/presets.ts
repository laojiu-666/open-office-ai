import type { LLMProviderId, ProviderPreset } from '@/types';

/**
 * 供应商预设配置
 * - defaultBaseUrl: 用户只需填写此 URL，无需添加 /v1
 * - apiPathSuffix: 系统自动拼接的路径后缀
 * - capabilities: 支持的能力（text, image）
 */
export const PROVIDER_PRESETS: Record<LLMProviderId, ProviderPreset> = {
  openai: {
    providerId: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o',
    defaultImageModel: 'dall-e-3',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
    capabilities: ['text', 'image'],
  },
  gemini: {
    providerId: 'gemini',
    label: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-pro',
    defaultImageModel: 'imagen-3',
    apiPathSuffix: '/v1beta',
    isOpenAICompatible: false,
    capabilities: ['text', 'image'],
  },
  glm: {
    providerId: 'glm',
    label: '智谱 GLM',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas',
    defaultModel: 'glm-4',
    defaultImageModel: 'cogview-4',
    apiPathSuffix: '/v4',
    isOpenAICompatible: true,
    capabilities: ['text', 'image'],
  },
  doubao: {
    providerId: 'doubao',
    label: '火山方舟/豆包',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api',
    defaultModel: 'doubao-1.8',
    defaultImageModel: 'seedream-4.5',
    apiPathSuffix: '/v3',
    isOpenAICompatible: true,
    capabilities: ['text', 'image'],
  },
  'deepseek-janus': {
    providerId: 'deepseek-janus',
    label: 'DeepSeek Janus',
    defaultBaseUrl: 'https://api.deepinfra.com',
    defaultModel: 'deepseek-ai/DeepSeek-LLM',
    defaultImageModel: 'deepseek-ai/Janus-Pro-7B',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
    capabilities: ['text', 'image'],
  },
  grok: {
    providerId: 'grok',
    label: 'Grok (xAI)',
    defaultBaseUrl: 'https://api.x.ai',
    defaultModel: 'grok-4',
    defaultImageModel: 'grok-2-image-1212',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
    capabilities: ['text', 'image'],
  },
  qianfan: {
    providerId: 'qianfan',
    label: '百度千帆',
    defaultBaseUrl: 'https://aip.baidubce.com',
    defaultModel: 'ernie-4.5-turbo',
    defaultImageModel: 'wenxin-yige',
    apiPathSuffix: '/rpc/2.0/ai_custom',
    isOpenAICompatible: false,
    capabilities: ['text', 'image'],
  },
  dashscope: {
    providerId: 'dashscope',
    label: '阿里云百炼',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    defaultModel: 'qwen-vl-max',
    defaultImageModel: 'wanx-v1',
    apiPathSuffix: '/api/v1',
    isOpenAICompatible: false,
    capabilities: ['text', 'image'],
  },
  custom: {
    providerId: 'custom',
    label: '自定义 (OpenAI 兼容)',
    defaultBaseUrl: '',
    defaultModel: '',
    defaultImageModel: '',
    apiPathSuffix: '/v1',
    isOpenAICompatible: true,
    capabilities: ['text', 'image'],
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
