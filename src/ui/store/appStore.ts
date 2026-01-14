import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMProviderId, ProviderConfig, ChatMessage } from '@/types';

interface AppState {
  // View
  currentView: 'chat' | 'settings';
  switchView: (view: 'chat' | 'settings') => void;

  // Settings
  activeProviderId: LLMProviderId;
  providers: Record<LLMProviderId, ProviderConfig>;
  setActiveProvider: (id: LLMProviderId) => void;
  updateProviderConfig: (id: LLMProviderId, config: Partial<ProviderConfig>) => void;

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
    }),
    {
      name: 'open-office-ai-storage',
      partialize: (state) => ({
        activeProviderId: state.activeProviderId,
        // 不持久化 apiKey，仅保存其他配置
        providers: Object.fromEntries(
          Object.entries(state.providers).map(([id, cfg]) => [
            id,
            { ...cfg, apiKey: '' },
          ])
        ) as Record<LLMProviderId, ProviderConfig>,
      }),
    }
  )
);
