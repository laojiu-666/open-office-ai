import type { ProviderError, ProviderErrorCode } from '@/types';

/**
 * 供应商错误类
 */
export class ProviderErrorClass extends Error {
  public readonly code: ProviderErrorCode;
  public readonly provider: string;
  public readonly raw?: unknown;

  constructor(error: ProviderError) {
    super(error.message);
    this.name = 'ProviderError';
    this.code = error.code;
    this.provider = error.provider;
    this.raw = error.raw;
  }

  /**
   * 判断错误是否可重试
   */
  isRetryable(): boolean {
    return this.code === 'rate_limited' || this.code === 'timeout' || this.code === 'provider_unavailable';
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'auth_invalid':
        return `${this.provider} 认证失败，请检查 API Key 是否正确`;
      case 'quota_exceeded':
        return `${this.provider} 配额不足，请充值或升级套餐`;
      case 'rate_limited':
        return `${this.provider} 请求过于频繁，请稍后重试`;
      case 'input_invalid':
        return `请求参数无效，请检查输入内容`;
      case 'model_not_found':
        return `模型不可用，请检查模型名称是否正确`;
      case 'provider_unavailable':
        return `${this.provider} 服务暂时不可用，请稍后重试`;
      case 'timeout':
        return `请求超时，请检查网络连接`;
      default:
        return `发生未知错误：${this.message}`;
    }
  }
}

/**
 * 创建供应商错误
 */
export function createProviderError(
  code: ProviderErrorCode,
  message: string,
  provider: string,
  raw?: unknown
): ProviderErrorClass {
  return new ProviderErrorClass({ code, message, provider, raw });
}
