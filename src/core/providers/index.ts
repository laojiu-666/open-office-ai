/**
 * 供应商适配器模块
 * 统一导出所有适配器和注册表
 */

export { ProviderAdapter, BaseProviderAdapter } from './adapter';
export { ProviderRegistry, initializeRegistry, getRegistry } from './registry';
export { ProviderErrorClass, createProviderError } from './errors';

// 核心供应商适配器
export { OpenAIAdapter } from './adapters/openai';
export { GeminiAdapter } from './adapters/gemini';
export { GLMAdapter } from './adapters/glm';
export { DoubaoAdapter } from './adapters/doubao';

// 可选供应商适配器
export { DeepSeekJanusAdapter } from './adapters/deepseek-janus';
export { GrokAdapter } from './adapters/grok';
export { QianfanAdapter } from './adapters/qianfan';
export { DashScopeAdapter } from './adapters/dashscope';

// 创建默认注册表
import { OpenAIAdapter } from './adapters/openai';
import { GeminiAdapter } from './adapters/gemini';
import { GLMAdapter } from './adapters/glm';
import { DoubaoAdapter } from './adapters/doubao';
import { DeepSeekJanusAdapter } from './adapters/deepseek-janus';
import { GrokAdapter } from './adapters/grok';
import { QianfanAdapter } from './adapters/qianfan';
import { DashScopeAdapter } from './adapters/dashscope';

/**
 * 创建并初始化默认供应商注册表
 */
export function createDefaultRegistry() {
  const adapters = [
    new OpenAIAdapter(),
    new GeminiAdapter(),
    new GLMAdapter(),
    new DoubaoAdapter(),
    new DeepSeekJanusAdapter(),
    new GrokAdapter(),
    new QianfanAdapter(),
    new DashScopeAdapter(),
  ];

  return adapters;
}
