// LLM Provider Types
export type LLMProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'glm'
  | 'doubao'
  | 'kimi'
  | 'custom';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  content: string;
  finishReason?: 'stop' | 'length' | 'error';
}

export interface LLMStreamChunk {
  contentDelta?: string;
  finishReason?: string;
}

export type LLMErrorCode =
  | 'config_missing'
  | 'auth_failed'
  | 'rate_limited'
  | 'network_error'
  | 'invalid_request'
  | 'provider_error'
  | 'stream_aborted';

export interface LLMError {
  code: LLMErrorCode;
  message: string;
  retryable: boolean;
}

export interface LLMStreamHandlers {
  onToken: (chunk: LLMStreamChunk) => void;
  onError: (error: LLMError) => void;
  onComplete: (response: LLMResponse) => void;
}

export interface LLMStreamController {
  abort: () => void;
}

export interface LLMModelInfo {
  id: string;
  label: string;
  maxTokens?: number;
}

export interface ILLMProvider {
  readonly id: LLMProviderId;
  readonly label: string;
  supportsStreaming: boolean;
  listModels: () => LLMModelInfo[];
  send: (request: LLMRequest, signal?: AbortSignal) => Promise<LLMResponse>;
  stream: (
    request: LLMRequest,
    handlers: LLMStreamHandlers,
    signal?: AbortSignal
  ) => Promise<LLMStreamController>;
}

// Document Adapter Types
export type HostApp = 'powerpoint' | 'word' | 'excel';

export interface DocumentSelection {
  text: string;
  isEmpty: boolean;
  context: {
    slideId?: string;
    shapeId?: string;
  };
}

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string;
}

export interface DocumentCapabilities {
  selectionText: boolean;
  replaceText: boolean;
  insertText: boolean;
  deleteText: boolean;
}

export interface IDocumentAdapter {
  readonly host: HostApp;
  readonly capabilities: DocumentCapabilities;
  getSelection: () => Promise<DocumentSelection>;
  replaceSelection: (text: string, format?: TextFormat) => Promise<void>;
  insertText: (text: string, format?: TextFormat) => Promise<void>;
  deleteSelection: () => Promise<void>;
}

// Config Types (Legacy - 保留向后兼容)
export interface ProviderConfig {
  providerId: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AppSettings {
  activeProviderId: LLMProviderId;
  providers: Record<LLMProviderId, ProviderConfig>;
}

// ============================================
// 新版多密钥 + WebDAV 同步类型定义
// ============================================

/**
 * AI 连接配置（支持多密钥）
 */
export interface AIConnection {
  id: string;
  name: string;
  providerId: LLMProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;              // 文字生成模型
  imageModel?: string;        // 图片生成模型（可选）
  createdAt: number;
  lastUsedAt?: number;
  disabled?: boolean;
}

/**
 * 供应商预设配置
 */
export interface ProviderPreset {
  providerId: LLMProviderId;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  apiPathSuffix: string; // 如 '/v1' 或 ''
  isOpenAICompatible: boolean;
}

/**
 * WebDAV 配置
 */
export interface WebDavConfig {
  enabled: boolean;
  serverUrl: string;
  username: string;
  remotePath: string; // 远端文件路径，如 /open-office-ai/vault.json
  autoSync: boolean;
}

/**
 * 同步状态
 */
export type SyncStatus =
  | 'idle'
  | 'checking'
  | 'syncing'
  | 'success'
  | 'error'
  | 'offline'
  | 'conflict';

/**
 * 同步元数据
 */
export interface SyncMetadata {
  revision: number;
  updatedAt: number;
  lastSyncedAt?: number;
  remoteEtag?: string;
}

/**
 * 加密载荷
 */
export interface EncryptedPayload {
  cipherText: string;
  iv: string;
  salt: string;
  iterations: number;
  alg: 'AES-GCM';
}

/**
 * 同步快照（远端存储格式）
 */
export interface SyncSnapshot {
  vaultVersion: number;
  metadata: SyncMetadata;
  encryptedPayload: EncryptedPayload;
}

/**
 * Vault 明文载荷（解密后的数据）
 */
export interface VaultPayload {
  connections: AIConnection[];
  activeConnectionId: string | null;
  imageGenConfig?: import('../core/image/types').ImageGenConfig;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  context?: string;
  slideSpec?: import('./slide-spec').SlideSpec; // 幻灯片生成规格
}

// Re-export SlideSpec types
export * from './slide-spec';

// Re-export Image generation types (excluding duplicates from slide-spec)
export type {
  ImageSize,
  ImageFormat,
  ImageGenErrorCode,
  ImageGenError,
} from '../core/image/types';
