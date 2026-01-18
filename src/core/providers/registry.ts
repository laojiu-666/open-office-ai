import type { ProviderAdapter } from './adapter';
import type { LLMProviderId } from '@/types';

/**
 * 供应商注册表
 * 管理所有可用的供应商适配器
 */
export class ProviderRegistry {
  private adapters: Map<string, ProviderAdapter> = new Map();

  constructor(adapters: ProviderAdapter[]) {
    adapters.forEach((adapter) => {
      this.adapters.set(adapter.id, adapter);
    });
  }

  /**
   * 获取供应商适配器
   */
  getAdapter(providerId: LLMProviderId): ProviderAdapter | null {
    return this.adapters.get(providerId) || null;
  }

  /**
   * 检查供应商是否支持指定能力
   */
  supportsCapability(providerId: LLMProviderId, capability: 'text' | 'image'): boolean {
    const adapter = this.getAdapter(providerId);
    return adapter ? adapter.capabilities.includes(capability) : false;
  }

  /**
   * 获取所有支持指定能力的供应商
   */
  getProvidersByCapability(capability: 'text' | 'image'): ProviderAdapter[] {
    return Array.from(this.adapters.values()).filter((adapter) =>
      adapter.capabilities.includes(capability)
    );
  }

  /**
   * 注册新的适配器
   */
  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * 获取所有适配器
   */
  getAllAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
}

/**
 * 全局供应商注册表实例
 * 在应用启动时初始化
 */
let globalRegistry: ProviderRegistry | null = null;

/**
 * 初始化全局注册表
 */
export function initializeRegistry(adapters: ProviderAdapter[]): void {
  globalRegistry = new ProviderRegistry(adapters);
}

/**
 * 获取全局注册表
 */
export function getRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    throw new Error('Provider registry not initialized. Call initializeRegistry() first.');
  }
  return globalRegistry;
}
