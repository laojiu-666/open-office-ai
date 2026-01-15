import type { ImageGenConfig, ImageGenRequest, ImageGenResponse } from '@/types';

/**
 * 图片生成服务
 * 支持 OpenAI DALL-E 兼容的 API
 */

export interface ImageGenerationError {
  code: 'config_missing' | 'auth_failed' | 'rate_limited' | 'network_error' | 'generation_failed';
  message: string;
  retryable: boolean;
}

export class ImageGenerationProvider {
  private config: ImageGenConfig;

  constructor(config: ImageGenConfig) {
    this.config = config;
  }

  /**
   * 生成图片
   */
  async generate(request: ImageGenRequest): Promise<ImageGenResponse> {
    if (!this.config.enabled) {
      throw this.createError('config_missing', '图片生成功能未启用');
    }

    if (!this.config.apiKey) {
      throw this.createError('config_missing', '请先配置图片生成 API Key');
    }

    const size = request.size || this.config.defaultSize;
    const [width, height] = size.split('x').map(Number);

    try {
      const response = await fetch(`${this.config.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
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
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // 发送一个简单的请求来验证 API Key
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
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
export function createImageGenerationProvider(config: ImageGenConfig): ImageGenerationProvider {
  return new ImageGenerationProvider(config);
}
