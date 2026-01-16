import type { ImageGenConfig, ImageGenRequest, ImageGenResponse } from './types';
import type { AIConnection } from '@/types';
import { normalizeBaseUrl } from '@core/llm/presets';

/**
 * 图片生成服务
 * 支持 OpenAI DALL-E 兼容的 API
 * 复用 AI 连接的 API Key 和 baseUrl
 */

export interface ImageGenerationError {
  code: 'config_missing' | 'auth_failed' | 'rate_limited' | 'network_error' | 'generation_failed';
  message: string;
  retryable: boolean;
}

export class ImageGenerationProvider {
  private config: ImageGenConfig;
  private connection: AIConnection | null;

  constructor(config: ImageGenConfig, connection: AIConnection | null) {
    this.config = config;
    this.connection = connection;
  }

  /**
   * 生成图片
   */
  async generate(request: ImageGenRequest): Promise<ImageGenResponse> {
    if (!this.connection) {
      throw this.createError('config_missing', '请先配置并激活一个 AI 连接');
    }

    if (!this.connection.apiKey) {
      throw this.createError('config_missing', '当前连接未配置 API Key');
    }

    // 使用连接配置的图片模型，如果没有则使用默认配置
    const imageModel = this.connection.imageModel || this.config.model;
    if (!imageModel) {
      throw this.createError('config_missing', '当前连接未配置图片生成模型');
    }

    const size = request.size || this.config.defaultSize;
    const [width, height] = size.split('x').map(Number);

    // 构建 API URL，使用连接的 baseUrl
    const baseUrl = normalizeBaseUrl(this.connection.baseUrl, this.connection.providerId);
    const apiUrl = `${baseUrl}/images/generations`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.connection.apiKey}`,
        },
        body: JSON.stringify({
          model: imageModel,
          prompt: request.prompt,
          n: 1,
          size: size,
          response_format: 'b64_json',
          ...(request.style && { style: request.style }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw this.createError('auth_failed', 'API Key 无效或已过期');
        }
        if (response.status === 429) {
          throw this.createError('rate_limited', '请求过于频繁，请稍后重试', true);
        }

        throw this.createError(
          'generation_failed',
          errorData.error?.message || `图片生成失败: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        throw this.createError('generation_failed', '未返回图片数据');
      }

      const imageData = data.data[0];

      return {
        id: data.created?.toString() || crypto.randomUUID(),
        data: imageData.b64_json || '',
        width,
        height,
        format: 'png',
      };
    } catch (error) {
      if ((error as ImageGenerationError).code) {
        throw error;
      }

      throw this.createError(
        'network_error',
        error instanceof Error ? error.message : '网络请求失败',
        true
      );
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.connection?.apiKey) {
      return false;
    }

    try {
      const baseUrl = normalizeBaseUrl(this.connection.baseUrl, this.connection.providerId);
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.connection.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private createError(
    code: ImageGenerationError['code'],
    message: string,
    retryable = false
  ): ImageGenerationError {
    return { code, message, retryable };
  }
}

/**
 * 创建图片生成 Provider 实例
 */
export function createImageGenerationProvider(
  config: ImageGenConfig,
  connection: AIConnection | null
): ImageGenerationProvider {
  return new ImageGenerationProvider(config, connection);
}
