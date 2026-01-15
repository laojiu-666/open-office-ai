import { useCallback, useState } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { useImageGeneration } from './useImageGeneration';
import { applySlideSpec, insertImageToCurrentSlide } from '@adapters/powerpoint/slide-renderer';
import type { SlideSpec, ApplySlideSpecResult, ImageAsset } from '@/types';

// 生成步骤
export type GenerationStep =
  | 'idle'
  | 'analyzing'
  | 'generating_content'
  | 'generating_image'
  | 'rendering_slide'
  | 'completed'
  | 'error';

interface UseSlideGeneratorReturn {
  // 状态
  currentStep: GenerationStep;
  progress: number; // 0-100
  error: string | null;
  lastResult: ApplySlideSpecResult | null;

  // 操作
  generateSlide: (spec: SlideSpec) => Promise<ApplySlideSpecResult | null>;
  insertImage: (imageData: string) => Promise<boolean>;
  reset: () => void;
}

export function useSlideGenerator(): UseSlideGeneratorReturn {
  const setGeneratingSlide = useAppStore((state) => state.setGeneratingSlide);
  const { generateImage, isEnabled: imageGenEnabled } = useImageGeneration();

  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ApplySlideSpecResult | null>(null);

  const generateSlide = useCallback(
    async (spec: SlideSpec): Promise<ApplySlideSpecResult | null> => {
      setGeneratingSlide(true);
      setError(null);
      setCurrentStep('analyzing');
      setProgress(10);

      try {
        // 步骤 1: 分析规格
        setCurrentStep('generating_content');
        setProgress(20);

        // 步骤 2: 处理图片生成（如果有）
        const imageBlocks = spec.blocks.filter((b) => b.kind === 'image');
        const updatedAssets: ImageAsset[] = [...(spec.assets || [])];

        if (imageBlocks.length > 0 && imageGenEnabled) {
          setCurrentStep('generating_image');
          setProgress(40);

          for (let i = 0; i < imageBlocks.length; i++) {
            const block = imageBlocks[i];
            if (block.kind !== 'image') continue;

            // 检查是否已有资源
            const existingAsset = updatedAssets.find((a) => a.id === block.assetId);
            if (existingAsset?.data) continue;

            // 生成图片
            const result = await generateImage({ prompt: block.prompt });
            if (result) {
              const assetId = block.assetId || `asset_${i}`;
              const existingIndex = updatedAssets.findIndex((a) => a.id === assetId);

              const newAsset: ImageAsset = {
                id: assetId,
                prompt: block.prompt,
                width: result.width,
                height: result.height,
                format: result.format,
                data: result.data,
                status: 'completed',
              };

              if (existingIndex >= 0) {
                updatedAssets[existingIndex] = newAsset;
              } else {
                updatedAssets.push(newAsset);
              }

              // 更新 block 的 assetId
              (block as any).assetId = assetId;
            }

            setProgress(40 + ((i + 1) / imageBlocks.length) * 30);
          }
        }

        // 步骤 3: 渲染幻灯片
        setCurrentStep('rendering_slide');
        setProgress(80);

        const updatedSpec: SlideSpec = {
          ...spec,
          assets: updatedAssets,
        };

        const result = await applySlideSpec(updatedSpec);
        setLastResult(result);

        if (result.success) {
          setCurrentStep('completed');
          setProgress(100);
        } else {
          setCurrentStep('error');
          setError(result.error || '幻灯片生成失败');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setError(errorMessage);
        setCurrentStep('error');
        return null;
      } finally {
        setGeneratingSlide(false);
      }
    },
    [setGeneratingSlide, generateImage, imageGenEnabled]
  );

  const insertImage = useCallback(async (imageData: string): Promise<boolean> => {
    const result = await insertImageToCurrentSlide(imageData);
    if (!result.success) {
      setError(result.error || '插入图片失败');
    }
    return result.success;
  }, []);

  const reset = useCallback(() => {
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    currentStep,
    progress,
    error,
    lastResult,
    generateSlide,
    insertImage,
    reset,
  };
}
