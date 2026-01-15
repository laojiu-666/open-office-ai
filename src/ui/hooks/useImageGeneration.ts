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

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<ImageGenerationError | null>(null);
  const [lastResult, setLastResult] = useState<ImageGenResponse | null>(null);

  const isEnabled = imageGenConfig.enabled;
  const isConfigured = Boolean(imageGenConfig.apiKey && imageGenConfig.baseUrl);

  const generateImage = useCallback(
    async (request: ImageGenRequest): Promise<ImageGenResponse | null> => {
      if (!isEnabled) {
        setError({
          code: 'config_missing',
          message: '图片生成功能未启用，请在设置中开启',
          retryable: false,
        });
        return null;
      }

      if (!isConfigured) {
        setError({
          code: 'config_missing',
          message: '请先配置图片生成 API',
          retryable: false,
        });
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const provider = createImageGenerationProvider(imageGenConfig);
        const result = await provider.generate(request);
        setLastResult(result);
        return result;
      } catch (err) {
        const imageError = err as ImageGenerationError;
        setError(imageError);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [imageGenConfig, isEnabled, isConfigured]
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
