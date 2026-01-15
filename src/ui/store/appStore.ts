import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMProviderId, ProviderConfig, ChatMessage, ImageGenConfig, PresentationContext } from '@/types';

// 默认图片生成配置
const defaultImageGenConfig: ImageGenConfig = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'dall-e-3',
  defaultSize: '1024x1024',
};

// 默认演示文稿上下文
const defaultPresentationContext: PresentationContext = {
  slideCount: 0,
  currentSlideIndex: 0,
  slideWidth: 960,
  slideHeight: 540,
};

interface AppState {
  // View
  currentView: 'chat' | 'settings';
  switchView: (view: 'chat' | 'settings') => void;

  // Settings
  activeProviderId: LLMProviderId;
  providers: Record<LLMProviderId, ProviderConfig>;
  setActiveProvider: (id: LLMProviderId) => void;
  updateProviderConfig: (id: LLMProviderId, config: Partial<ProviderConfig>) => void;

  // Image Generation Config
  imageGenConfig: ImageGenConfig;
  updateImageGenConfig: (config: Partial<ImageGenConfig>) => void;

  // Presentation Context
  presentationContext: PresentationContext;
  updatePresentationContext: (context: Partial<PresentationContext>) => void;

  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;

  // Selection
  currentSelection: string;
  setCurrentSelection: (text: string) => void;

  // Slide Generation
  isGeneratingSlide: boolean;
  setGeneratingSlide: (generating: boolean) => void;
}

const defaultProviders: Record<LLMProviderId, ProviderConfig> = {
  openai: {
    providerId: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    providerId: 'anthropic',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-20241022',
  },
  custom: {
    providerId: 'custom',
    apiKey: '',
    baseUrl: '',
    model: '',
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // View
      currentView: 'chat',
      switchView: (view) => set({ currentView: view }),

      // Settings
      activeProviderId: 'openai',
      providers: defaultProviders,
      setActiveProvider: (id) => set({ activeProviderId: id }),
      updateProviderConfig: (id, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], ...config },
          },
        })),

      // Image Generation Config
      imageGenConfig: defaultImageGenConfig,
      updateImageGenConfig: (config) =>
        set((state) => ({
          imageGenConfig: { ...state.imageGenConfig, ...config },
        })),

      // Presentation Context
      presentationContext: defaultPresentationContext,
      updatePresentationContext: (context) =>
        set((state) => ({
          presentationContext: { ...state.presentationContext, ...context },
        })),

      // Chat
      messages: [],
      isStreaming: false,
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      clearMessages: () => set({ messages: [] }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),

      // Selection
      currentSelection: '',
      setCurrentSelection: (text) => set({ currentSelection: text }),

      // Slide Generation
      isGeneratingSlide: false,
      setGeneratingSlide: (generating) => set({ isGeneratingSlide: generating }),
    }),
    {
      name: 'open-office-ai-storage',
      partialize: (state) => ({
        activeProviderId: state.activeProviderId,
        providers: state.providers,
        imageGenConfig: state.imageGenConfig,
      }),
    }
  )
);
