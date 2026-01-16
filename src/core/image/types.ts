/**
 * 图片生成模块类型定义
 */

/** 图片尺寸 */
export type ImageSize = '512x512' | '1024x1024';

/** 图片风格 */
export type ImageStyle = 'photorealistic' | 'illustration' | 'flat';

/** 图片格式 */
export type ImageFormat = 'png' | 'jpeg';

/** 图片生成配置（复用 AI 连接的 API Key 和 baseUrl） */
export interface ImageGenConfig {
  enabled: boolean;
  model: string;           // 图片生成模型，如 'dall-e-3'
  defaultSize: ImageSize;
}

/** 图片生成请求 */
export interface ImageGenRequest {
  prompt: string;
  size?: ImageSize;
  style?: ImageStyle;
}

/** 图片生成响应 */
export interface ImageGenResponse {
  id: string;
  data: string;    // base64 编码
  width: number;
  height: number;
  format: ImageFormat;
}

/** 图片生成错误码 */
export type ImageGenErrorCode =
  | 'config_missing'
  | 'auth_failed'
  | 'rate_limited'
  | 'network_error'
  | 'generation_failed';

/** 图片生成错误 */
export interface ImageGenError {
  code: ImageGenErrorCode;
  message: string;
  retryable: boolean;
}
