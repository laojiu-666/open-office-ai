import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LLMProviderId,
  ProviderConfig,
  ChatMessage,
  ImageGenConfig,
  PresentationContext,
  AIConnection,
  GenerationProfile,
  WebDavConfig,
  SyncStatus,
  ToolLog,
} from '@/types';

// ============================================
// 默认配置
// ============================================

const defaultImageGenConfig: ImageGenConfig = {
  enabled: false,
  model: 'dall-e-3',
  defaultSize: '1024x1024',
};

const defaultGenerationProfile: GenerationProfile = {
  mode: 'auto',
};

const defaultPresentationContext: PresentationContext = {
  slideCount: 0,
  currentSlideIndex: 0,
  slideWidth: 960,
  slideHeight: 540,
};

const defaultWebDavConfig: WebDavConfig = {
  enabled: false,
  serverUrl: '',
  username: '',
  remotePath: '/open-office-ai/vault.json',
  autoSync: true,
};

// 旧版默认配置（用于迁移）
const legacyDefaultProviders: Record<string, ProviderConfig> = {
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

// ============================================
// 状态接口
// ============================================

interface AppState {
  // View
  currentView: 'chat' | 'settings';
  switchView: (view: 'chat' | 'settings') => void;

  // Settings 子页面导航
  settingsPage: 'main' | 'connections' | 'sync' | 'developer' | 'profile';
  setSettingsPage: (page: 'main' | 'connections' | 'sync' | 'developer' | 'profile') => void;

  // ============================================
  // 新版多连接管理
  // ============================================
  connections: AIConnection[];
  activeConnectionId: string | null;
  addConnection: (connection: Omit<AIConnection, 'id' | 'createdAt'>) => string;
  updateConnection: (id: string, updates: Partial<AIConnection>) => void;
  removeConnection: (id: string) => void;
  activateConnection: (id: string) => void;
  getActiveConnection: () => AIConnection | null;

  // ============================================
  // 生成配置（多模态能力路由）
  // ============================================
  generationProfile: GenerationProfile;
  updateGenerationProfile: (profile: Partial<GenerationProfile>) => void;

  // ============================================
  // 旧版配置（向后兼容，将逐步废弃）
  // ============================================
  activeProviderId: LLMProviderId;
  providers: Record<LLMProviderId, ProviderConfig>;
  setActiveProvider: (id: LLMProviderId) => void;
  updateProviderConfig: (id: LLMProviderId, config: Partial<ProviderConfig>) => void;

  // ============================================
  // WebDAV 同步
  // ============================================
  webDavConfig: WebDavConfig;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  updateWebDavConfig: (config: Partial<WebDavConfig>) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncTime: (time: number | null) => void;

  // ============================================
  // 图片生成配置
  // ============================================
  imageGenConfig: ImageGenConfig;
  updateImageGenConfig: (config: Partial<ImageGenConfig>) => void;

  // ============================================
  // 高级设置 & 工具历史
  // ============================================
  maxToolCallDepth: number;
  setMaxToolCallDepth: (depth: number) => void;
  toolHistory: ToolLog[];
  addToolLog: (log: ToolLog) => void;
  clearToolHistory: () => void;

  // ============================================
  // 演示文稿上下文
  // ============================================
  presentationContext: PresentationContext;
  updatePresentationContext: (context: Partial<PresentationContext>) => void;

  // ============================================
  // 聊天
  // ============================================
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;

  // ============================================
  // 选区
  // ============================================
  currentSelection: string;
  setCurrentSelection: (text: string) => void;

  // ============================================
  // 幻灯片生成
  // ============================================
  isGeneratingSlide: boolean;
  setGeneratingSlide: (generating: boolean) => void;

  // ============================================
  // 数据迁移
  // ============================================
  _migrated: boolean;
  _migrateFromLegacy: () => void;
}

// ============================================
// 工具函数
// ============================================

function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Store 实现
// ============================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // View
      currentView: 'chat',
      switchView: (view) => set({ currentView: view, settingsPage: 'main' }),

      // Settings 子页面导航
      settingsPage: 'main',
      setSettingsPage: (page) => set({ settingsPage: page }),

      // ============================================
      // 新版多连接管理
      // ============================================
      connections: [],
      activeConnectionId: null,

      addConnection: (connection) => {
        const id = generateId();
        const newConnection: AIConnection = {
          ...connection,
          id,
          createdAt: Date.now(),
        };
        set((state) => ({
          connections: [...state.connections, newConnection],
        }));
        return id;
      },

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updates } : conn
          ),
        })),

      removeConnection: (id) =>
        set((state) => {
          const newConnections = state.connections.filter((conn) => conn.id !== id);
          // 如果删除的是当前激活的连接，清除激活状态
          const newActiveId = state.activeConnectionId === id ? null : state.activeConnectionId;
          return {
            connections: newConnections,
            activeConnectionId: newActiveId,
          };
        }),

      activateConnection: (id) =>
        set((state) => {
          const connection = state.connections.find((conn) => conn.id === id);
          if (connection) {
            // 更新 lastUsedAt
            return {
              activeConnectionId: id,
              connections: state.connections.map((conn) =>
                conn.id === id ? { ...conn, lastUsedAt: Date.now() } : conn
              ),
            };
          }
          return state;
        }),

      getActiveConnection: () => {
        const state = get();
        if (!state.activeConnectionId) return null;
        return state.connections.find((conn) => conn.id === state.activeConnectionId) || null;
      },

      // ============================================
      // 生成配置（多模态能力路由）
      // ============================================
      generationProfile: defaultGenerationProfile,
      updateGenerationProfile: (profile) =>
        set((state) => ({
          generationProfile: { ...state.generationProfile, ...profile },
        })),

      // ============================================
      // 旧版配置（向后兼容）
      // ============================================
      activeProviderId: 'openai',
      providers: legacyDefaultProviders as Record<LLMProviderId, ProviderConfig>,
      setActiveProvider: (id) => set({ activeProviderId: id }),
      updateProviderConfig: (id, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], ...config },
          },
        })),

      // ============================================
      // WebDAV 同步
      // ============================================
      webDavConfig: defaultWebDavConfig,
      syncStatus: 'idle',
      lastSyncTime: null,

      updateWebDavConfig: (config) =>
        set((state) => ({
          webDavConfig: { ...state.webDavConfig, ...config },
        })),

      setSyncStatus: (status) => set({ syncStatus: status }),

      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // ============================================
      // 图片生成配置
      // ============================================
      imageGenConfig: defaultImageGenConfig,
      updateImageGenConfig: (config) =>
        set((state) => ({
          imageGenConfig: { ...state.imageGenConfig, ...config },
        })),

      // ============================================
      // 高级设置 & 工具历史
      // ============================================
      maxToolCallDepth: 5,
      setMaxToolCallDepth: (depth) => set({ maxToolCallDepth: depth }),
      toolHistory: [],
      addToolLog: (log) =>
        set((state) => ({
          toolHistory: [log, ...state.toolHistory].slice(0, 100),
        })),
      clearToolHistory: () => set({ toolHistory: [] }),

      // ============================================
      // 演示文稿上下文
      // ============================================
      presentationContext: defaultPresentationContext,
      updatePresentationContext: (context) =>
        set((state) => ({
          presentationContext: { ...state.presentationContext, ...context },
        })),

      // ============================================
      // 聊天
      // ============================================
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

      // ============================================
      // 选区
      // ============================================
      currentSelection: '',
      setCurrentSelection: (text) => set({ currentSelection: text }),

      // ============================================
      // 幻灯片生成
      // ============================================
      isGeneratingSlide: false,
      setGeneratingSlide: (generating) => set({ isGeneratingSlide: generating }),

      // ============================================
      // 数据迁移
      // ============================================
      _migrated: false,

      _migrateFromLegacy: () => {
        const state = get();

        // 如果已经迁移过，跳过
        if (state._migrated) {
          return;
        }

        // 支持的供应商列表（仅保留支持文字+图片的供应商）
        const supportedProviders: LLMProviderId[] = [
          'openai',
          'gemini',
          'glm',
          'doubao',
          'deepseek-janus',
          'grok',
          'qianfan',
          'dashscope',
          'custom',
        ];

        // 清理现有连接，移除不支持的供应商
        const cleanedConnections = state.connections
          .filter((conn) => supportedProviders.includes(conn.providerId))
          .map((conn) => {
            // 移除 video 能力
            const capabilities = conn.capabilities ? { ...conn.capabilities } : undefined;
            if (capabilities && 'video' in capabilities) {
              delete (capabilities as any).video;
            }

            // 补齐 text/image 能力字段
            if (!capabilities || !capabilities.text) {
              return {
                ...conn,
                capabilities: {
                  text: { model: conn.model },
                  ...(conn.imageModel && { image: { model: conn.imageModel } }),
                },
              };
            }

            return {
              ...conn,
              capabilities,
            };
          });

        // 从旧版 providers 迁移到新版 connections（如果还没有连接）
        if (cleanedConnections.length === 0) {
          Object.entries(state.providers).forEach(([providerId, config]) => {
            // 只迁移支持的供应商且有 API Key 的配置
            if (config.apiKey && supportedProviders.includes(providerId as LLMProviderId)) {
              const connection: AIConnection = {
                id: generateId(),
                name: `${providerId} (迁移)`,
                providerId: providerId as LLMProviderId,
                baseUrl: config.baseUrl.replace(/\/v1\/?$/, ''), // 移除 /v1 后缀
                apiKey: config.apiKey,
                model: config.model,
                capabilities: {
                  text: { model: config.model },
                },
                createdAt: Date.now(),
              };
              cleanedConnections.push(connection);
            }
          });
        }

        // 清理 generationProfile，移除 videoProvider
        const cleanedProfile = { ...state.generationProfile };
        if ('videoProvider' in cleanedProfile) {
          delete (cleanedProfile as any).videoProvider;
        }

        // 设置激活的连接
        let activeConnectionId: string | null = state.activeConnectionId;
        if (cleanedConnections.length > 0 && !activeConnectionId) {
          // 优先选择与当前 activeProviderId 匹配的连接
          const matchingConnection = cleanedConnections.find(
            (conn) => conn.providerId === state.activeProviderId
          );
          activeConnectionId = matchingConnection?.id || cleanedConnections[0].id;
        }

        set({
          connections: cleanedConnections,
          activeConnectionId,
          generationProfile: cleanedProfile,
          _migrated: true,
        });

        console.log(`Migrated ${cleanedConnections.length} connections, removed unsupported providers and video capability`);
      },
    }),
    {
      name: 'open-office-ai-storage',
      version: 3, // 版本号，用于迁移
      partialize: (state) => ({
        // 新版配置
        connections: state.connections,
        activeConnectionId: state.activeConnectionId,
        generationProfile: state.generationProfile,
        webDavConfig: state.webDavConfig,
        lastSyncTime: state.lastSyncTime,
        _migrated: state._migrated,

        // 旧版配置（保留用于迁移）
        activeProviderId: state.activeProviderId,
        providers: state.providers,

        // 图片生成配置
        imageGenConfig: state.imageGenConfig,

        // 高级设置
        maxToolCallDepth: state.maxToolCallDepth,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AppState>;
        let nextState = state;

        // 版本 1 -> 2：添加新字段
        if (version < 2) {
          nextState = {
            ...nextState,
            connections: nextState.connections || [],
            activeConnectionId: nextState.activeConnectionId || null,
            webDavConfig: nextState.webDavConfig || defaultWebDavConfig,
            lastSyncTime: nextState.lastSyncTime || null,
            _migrated: nextState._migrated || false,
            maxToolCallDepth: nextState.maxToolCallDepth || 5,
            toolHistory: [],
          };
        }

        // 版本 2 -> 3：添加生成配置
        if (version < 3) {
          nextState = {
            ...nextState,
            generationProfile: nextState.generationProfile || defaultGenerationProfile,
          };
        }

        return nextState;
      },
    }
  )
);

// ============================================
// 辅助 Hooks
// ============================================

/**
 * 获取当前激活的连接配置
 * 兼容新旧两种配置方式
 */
export function useActiveConfig(): ProviderConfig | null {
  const { getActiveConnection, activeProviderId, providers, connections } = useAppStore();

  // 优先使用新版连接
  const activeConnection = getActiveConnection();
  if (activeConnection) {
    return {
      providerId: activeConnection.providerId,
      apiKey: activeConnection.apiKey,
      baseUrl: activeConnection.baseUrl,
      model: activeConnection.model,
    };
  }

  // 回退到旧版配置
  if (connections.length === 0) {
    return providers[activeProviderId] || null;
  }

  return null;
}

/**
 * 初始化 Store（执行迁移等）
 */
export function initializeStore(): void {
  const store = useAppStore.getState();
  store._migrateFromLegacy();
}
