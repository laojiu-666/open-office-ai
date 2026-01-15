// LLM Provider Types
export type LLMProviderId = 'openai' | 'anthropic' | 'custom';

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

// Config Types
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

// Re-export Image generation types
export * from '../core/image/types';
