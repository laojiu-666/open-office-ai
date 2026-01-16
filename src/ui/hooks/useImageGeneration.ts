import { useCallback, useState } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { createImageGenerationProvider, ImageGenerationError } from '@core/image/provider';
import type { ImageGenRequest, ImageGenResponse } from '@/types';

interface UseImageGenerationReturn {
  // 状态
  isGenerating: boolean;
  error: ImageGenerationError | null;
  lastResult: ImageGenResponse | null;

  // 操作
  generateImage: (request: ImageGenRequest) => Promise<ImageGenResponse | null>;
  clearError: () => void;

  // 配置状态
  isEnabled: boolean;
  isConfigured: boolean;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const imageGenConfig = useAppStore((state) => state.imageGenConfig);
  const getActiveConnection = useAppStore((state) => state.getActiveConnection);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<ImageGenerationError | null>(null);
  const [lastResult, setLastResult] = useState<ImageGenResponse | null>(null);

  const activeConnection = getActiveConnection();
  // 如果连接配置了图片模型，则自动启用图片生成
  const isEnabled = imageGenConfig.enabled || Boolean(activeConnection?.imageModel);
  const isConfigured = Boolean(activeConnection?.apiKey && activeConnection?.imageModel);

  const generateImage = useCallback(
    async (request: ImageGenRequest): Promise<ImageGenResponse | null> => {
      const connection = getActiveConnection();

      if (!connection) {
        setError({
          code: 'config_missing',
          message: '请先配置并激活一个 AI 连接',
          retryable: false,
        });
        return null;
      }

      if (!connection.imageModel) {
        setError({
          code: 'config_missing',
          message: '当前连接未配置图片生成模型，请在连接设置中添加图片模型（如 dall-e-3）',
          retryable: false,
        });
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        console.log('[useImageGeneration] Creating provider with config:', imageGenConfig, 'connection:', connection.name);
        const provider = createImageGenerationProvider(imageGenConfig, connection);
        const result = await provider.generate(request);
        console.log('[useImageGeneration] Image generated successfully');
        setLastResult(result);
        return result;
      } catch (err) {
        console.error('[useImageGeneration] Image generation error:', err);
        const imageError = err as ImageGenerationError;
        setError(imageError);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [imageGenConfig, getActiveConnection]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    error,
    lastResult,
    generateImage,
    clearError,
    isEnabled,
    isConfigured,
  };
}
