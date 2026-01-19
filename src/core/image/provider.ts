import type { ImageGenConfig, ImageGenRequest, ImageGenResponse } from './types';
import type { AIConnection, GenerationProfile, UnifiedImageRequest } from '@/types';
import { normalizeBaseUrl } from '@core/llm/presets';
import { ProviderErrorClass, ProviderExecutor } from '@core/providers';

export interface ImageGenerationError {
  code: 'config_missing' | 'auth_failed' | 'rate_limited' | 'network_error' | 'generation_failed';
  message: string;
  retryable: boolean;
}

export class ImageGenerationProvider {
  private config: ImageGenConfig;
  private connections: AIConnection[];
  private profile?: GenerationProfile;
  private executor: ProviderExecutor;
  private lastConnection: AIConnection | null = null;

  constructor(
    config: ImageGenConfig,
    connections: AIConnection[],
    profile?: GenerationProfile,
    executor?: ProviderExecutor
  ) {
    this.config = config;
    this.connections = connections;
    this.profile = profile;
    this.executor = executor ?? new ProviderExecutor();
  }

  getLastConnection(): AIConnection | null {
    return this.lastConnection;
  }

  /**
   * 生成图片
   */
  async generate(request: ImageGenRequest): Promise<ImageGenResponse> {
    const preparedConnections = this.prepareConnections(this.connections)
      .filter((connection) => !connection.disabled);

    if (preparedConnections.length === 0) {
      throw this.createError('config_missing', '请先配置并激活一个 AI 连接');
    }

    const connectionsWithKey = preparedConnections.filter((connection) => connection.apiKey);
    if (connectionsWithKey.length === 0) {
      throw this.createError('config_missing', '当前连接未配置 API Key');
    }

    const size = request.size || this.config.defaultSize;
    const unifiedRequest: UnifiedImageRequest = {
      prompt: request.prompt,
      size,
      ...(request.style ? { style: request.style as UnifiedImageRequest['style'] } : {}),
    };

    try {
      const result = await this.executor.executeImage(
        connectionsWithKey,
        unifiedRequest,
        this.profile
      );

      const image = result.response.images[0];
      if (!image) {
        throw this.createError('generation_failed', '未返回图片数据');
      }

      const data = await this.normalizeImageData(image.data);

      this.lastConnection = result.connection;

      return {
        id: crypto.randomUUID(),
        data,
        width: image.width,
        height: image.height,
        format: image.format,
      };
    } catch (error) {
      if (error instanceof ProviderErrorClass) {
        throw this.mapProviderError(error);
      }

      if (error instanceof Error && error.message.includes('No available provider')) {
        throw this.createError(
          'config_missing',
          '未配置图片生成能力，请在设置中添加支持图片生成的 AI 连接'
        );
      }

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
    const connection = this.connections.find((item) => !item.disabled);
    if (!connection?.apiKey) {
      return false;
    }

    try {
      const baseUrl = normalizeBaseUrl(connection.baseUrl, connection.providerId);
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${connection.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private prepareConnections(connections: AIConnection[]): AIConnection[] {
    return connections.map((connection) => {
      const hasImageModel = Boolean(connection.capabilities?.image?.model || connection.imageModel);
      if (hasImageModel || !this.config.model) {
        return connection;
      }

      return {
        ...connection,
        imageModel: this.config.model,
      };
    });
  }

  private async normalizeImageData(data: string): Promise<string> {
    if (!data) {
      throw this.createError('generation_failed', '图片数据为空');
    }

    // 如果是 data URL 格式
    if (data.startsWith('data:')) {
      const base64Data = data.split(',')[1] || '';
      if (!base64Data) {
        throw this.createError('generation_failed', '图片数据格式错误：缺少 base64 内容');
      }
      return this.validateBase64(base64Data);
    }

    // 如果是 URL
    if (data.startsWith('http://') || data.startsWith('https://')) {
      try {
        const response = await fetch(data);
        if (!response.ok) {
          throw this.createError('generation_failed', `图片下载失败: ${response.status}`);
        }

        const blob = await response.blob();
        return this.blobToBase64(blob);
      } catch (error) {
        if ((error as ImageGenerationError).code) {
          throw error;
        }
        throw this.createError('generation_failed', `图片下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 假设是纯 base64
    return this.validateBase64(data);
  }

  /**
   * 验证 base64 数据的完整性
   */
  private validateBase64(base64: string): string {
    // 移除空白字符
    const cleaned = base64.replace(/\s/g, '');

    // 检查是否为空
    if (!cleaned) {
      throw this.createError('generation_failed', 'Base64 数据为空');
    }

    // 检查是否包含非法字符
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleaned)) {
      throw this.createError('generation_failed', 'Base64 数据格式无效：包含非法字符');
    }

    // 检查长度是否合理（至少应该有几百字节）
    if (cleaned.length < 100) {
      throw this.createError('generation_failed', `Base64 数据过短（${cleaned.length} 字符），可能未完整返回`);
    }

    // 检查是否是 4 的倍数（base64 特性）
    const paddingLength = (cleaned.match(/=/g) || []).length;
    const dataLength = cleaned.length - paddingLength;
    if (dataLength % 4 !== 0 && paddingLength === 0) {
      console.warn('[validateBase64] Base64 length not multiple of 4, may be incomplete');
      throw this.createError('generation_failed', 'Base64 数据可能不完整（长度不符合规范）');
    }

    console.log('[validateBase64] Base64 validation passed, length:', cleaned.length);
    return cleaned;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read image data'));
      };
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  private mapProviderError(error: ProviderErrorClass): ImageGenerationError {
    switch (error.code) {
      case 'auth_invalid':
        return this.createError('auth_failed', error.getUserMessage());
      case 'rate_limited':
        return this.createError('rate_limited', error.getUserMessage(), true);
      case 'provider_unavailable':
      case 'timeout':
        return this.createError('network_error', error.getUserMessage(), true);
      case 'model_not_found':
        return this.createError('generation_failed', error.getUserMessage());
      case 'quota_exceeded':
      case 'input_invalid':
      case 'unknown':
      default:
        return this.createError('generation_failed', error.getUserMessage());
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
): ImageGenerationProvider;
export function createImageGenerationProvider(
  config: ImageGenConfig,
  connections: AIConnection[],
  generationProfile?: GenerationProfile
): ImageGenerationProvider;
export function createImageGenerationProvider(
  config: ImageGenConfig,
  connectionOrConnections: AIConnection | AIConnection[] | null,
  generationProfile?: GenerationProfile
): ImageGenerationProvider {
  if (Array.isArray(connectionOrConnections)) {
    return new ImageGenerationProvider(config, connectionOrConnections, generationProfile);
  }
  const connections = connectionOrConnections ? [connectionOrConnections] : [];
  return new ImageGenerationProvider(config, connections, generationProfile);
}
