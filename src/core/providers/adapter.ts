import type {
  ProviderCapability,
  UnifiedTextRequest,
  UnifiedTextResponse,
  UnifiedImageRequest,
  UnifiedImageResponse,
  HttpRequest,
  HttpResponse,
  HttpError,
  ProviderError,
  VendorConfig,
} from '@/types';

/**
 * 供应商适配器接口
 * 统一处理不同供应商的请求/响应格式差异
 */
export interface ProviderAdapter {
  /** 供应商 ID */
  readonly id: string;

  /** 显示名称 */
  readonly displayName: string;

  /** 支持的能力 */
  readonly capabilities: ProviderCapability[];

  /**
   * 构建文本生成请求
   */
  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest;

  /**
   * 解析文本生成响应
   */
  parseTextResponse(resp: HttpResponse): UnifiedTextResponse;

  /**
   * 构建图片生成请求
   */
  buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest;

  /**
   * 解析图片生成响应
   */
  parseImageResponse(resp: HttpResponse): UnifiedImageResponse;

  /**
   * 映射错误码
   */
  mapError(error: HttpError): ProviderError;
}

/**
 * 抽象基类，提供通用实现
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapability[];

  abstract buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest;
  abstract parseTextResponse(resp: HttpResponse): UnifiedTextResponse;
  abstract buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest;
  abstract parseImageResponse(resp: HttpResponse): UnifiedImageResponse;

  /**
   * 默认错误映射实现
   */
  mapError(error: HttpError): ProviderError {
    const status = error.status;
    let code: ProviderError['code'] = 'unknown';

    if (status === 401 || status === 403) {
      code = 'auth_invalid';
    } else if (status === 429) {
      code = 'rate_limited';
    } else if (status === 400) {
      code = 'input_invalid';
    } else if (status === 404) {
      code = 'model_not_found';
    } else if (status === 503 || status === 502) {
      code = 'provider_unavailable';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      code = 'timeout';
    }

    return {
      code,
      message: error.message,
      provider: this.id,
      raw: error.details,
    };
  }

  /**
   * 构建通用请求头
   */
  protected buildHeaders(apiKey: string, additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...additionalHeaders,
    };
  }
}
