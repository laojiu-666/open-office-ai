import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@ui/store/appStore';
import {
  getPresentationContext,
  getSlideContext,
  getSelectionContext,
  getAIContext,
} from '@adapters/powerpoint/context';
import type { SlideContext, SelectionContext, ThemeSpec } from '@/types';

interface UsePresentationContextReturn {
  // 基础上下文
  slideCount: number;
  currentSlideIndex: number;
  slideWidth: number;
  slideHeight: number;

  // 详细上下文
  slideContext: SlideContext | null;
  selectionContext: SelectionContext | null;

  // 操作
  refreshContext: () => Promise<void>;
  getFullAIContext: () => Promise<{
    presentationContext: ReturnType<typeof useAppStore.getState>['presentationContext'];
    slideContext: SlideContext | null;
    selectionContext: SelectionContext;
    slideText: string;
    theme: ThemeSpec | null;
  }>;

  // 状态
  isLoading: boolean;
}

export function usePresentationContext(): UsePresentationContextReturn {
  const presentationContext = useAppStore((state) => state.presentationContext);
  const updatePresentationContext = useAppStore((state) => state.updatePresentationContext);

  const slideContextRef = useRef<SlideContext | null>(null);
  const selectionContextRef = useRef<SelectionContext | null>(null);
  const isLoadingRef = useRef(false);

  // 刷新上下文
  const refreshContext = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const [presContext, slideCtx, selCtx] = await Promise.all([
        getPresentationContext(),
        getSlideContext(),
        getSelectionContext(),
      ]);

      updatePresentationContext(presContext);
      slideContextRef.current = slideCtx;
      selectionContextRef.current = selCtx;
    } catch (error) {
      console.error('Failed to refresh presentation context:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [updatePresentationContext]);

  // 获取完整 AI 上下文
  const getFullAIContext = useCallback(async () => {
    return getAIContext();
  }, []);

  // 初始化时获取上下文
  useEffect(() => {
    refreshContext();

    // 监听选区变化
    const handler = () => {
      refreshContext();
    };

    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      handler
    );

    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler }
      );
    };
  }, [refreshContext]);

  return {
    slideCount: presentationContext.slideCount,
    currentSlideIndex: presentationContext.currentSlideIndex,
    slideWidth: presentationContext.slideWidth,
    slideHeight: presentationContext.slideHeight,
    slideContext: slideContextRef.current,
    selectionContext: selectionContextRef.current,
    refreshContext,
    getFullAIContext,
    isLoading: isLoadingRef.current,
  };
}
