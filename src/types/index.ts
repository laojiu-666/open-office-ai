// LLM Provider Types
export type LLMProviderId =
  | 'openai'
  | 'gemini'
  | 'glm'
  | 'doubao'
  | 'deepseek-janus'
  | 'grok'
  | 'qianfan'
  | 'dashscope'
  | 'custom';

// Tool Definition (OpenAI Function Calling format)
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: unknown;
    }>;
    required?: string[];
  };
}

// Tool Call (LLM requests to execute a tool)
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  parsingError?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

export interface LLMResponse {
  id: string;
  content: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error';
  toolCalls?: ToolCall[];
}

export interface LLMStreamChunk {
  contentDelta?: string;
  toolCalls?: ToolCall[];
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
 * 供应商配置（支持多密钥）
 * 别名：VendorConfig（保持向后兼容）
 */
export interface AIConnection {
  id: string;
  name: string;
  providerId: LLMProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;              // 文字生成模型
  imageModel?: string;        // 图片生成模型（可选）
  capabilities?: {
    text?: { model: string };
    image?: { model: string };
  };
  createdAt: number;
  lastUsedAt?: number;
  disabled?: boolean;
}

/**
 * 供应商配置类型别名
 */
export type VendorConfig = AIConnection;

/**
 * 多模态生成配置
 */
export interface GenerationProfile {
  mode: 'auto' | 'manual';
  textProvider?: string;
  imageProvider?: string;
}

/**
 * 供应商预设配置
 */
export interface ProviderPreset {
  providerId: LLMProviderId;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  defaultImageModel?: string; // 默认图片生成模型
  apiPathSuffix: string; // 如 '/v1' 或 ''
  isOpenAICompatible: boolean;
  capabilities: ('text' | 'image')[]; // 支持的能力
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
  generationProfile?: GenerationProfile;
  imageGenConfig?: import('../core/image/types').ImageGenConfig;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  context?: string;
  slideSpec?: import('./slide-spec').SlideSpec; // 幻灯片生成规格
  metadata?: {
    toolName?: string;
    toolCallId?: string;
    toolCalls?: ToolCall[];
    toolResult?: unknown;
    parsingError?: string;
    fallbackWarning?: string;
  };
}

// Tool History Log
export interface ToolLog {
  id: string;
  timestamp: number;
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  result?: unknown;
  error?: string;
  errorCode?: string;
  errorDetails?: unknown;
  parsingError?: string;
}

// Generation Tool Result
export interface GenerationToolResult {
  type: 'text' | 'image';
  content: string;  // 文本内容或 base64 数据
  metadata?: {
    provider?: string;
    model?: string;
    width?: number;
    height?: number;
    format?: string;
  };
}

// ============================================
// 供应商适配器类型定义
// ============================================

/**
 * 供应商能力类型
 */
export type ProviderCapability = 'text' | 'image';

/**
 * 统一文本请求
 */
export interface UnifiedTextRequest {
  prompt: string;
  images?: UnifiedImageInput[];
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

/**
 * 统一图片请求
 */
export interface UnifiedImageRequest {
  prompt: string;
  size?: '512x512' | '1024x1024' | '2048x2048';
  style?: 'photorealistic' | 'illustration' | 'flat';
}

/**
 * 统一图片输入
 */
export interface UnifiedImageInput {
  type: 'url' | 'base64';
  data: string;
  mediaType?: string;
}

/**
 * 统一文本响应
 */
export interface UnifiedTextResponse {
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  raw?: unknown;
}

/**
 * 统一图片响应
 */
export interface UnifiedImageResponse {
  images: Array<{ data: string; format: 'png' | 'jpeg'; width: number; height: number }>;
  raw?: unknown;
}

/**
 * HTTP 请求
 */
export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * HTTP 响应
 */
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * HTTP 错误
 */
export interface HttpError {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * 供应商错误码
 */
export type ProviderErrorCode =
  | 'auth_invalid'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'input_invalid'
  | 'model_not_found'
  | 'provider_unavailable'
  | 'timeout'
  | 'unknown';

/**
 * 供应商错误
 */
export interface ProviderError {
  code: ProviderErrorCode;
  message: string;
  provider: string;
  raw?: unknown;
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
