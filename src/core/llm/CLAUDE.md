[根目录](../../../CLAUDE.md) > [core](../) > **llm**

# LLM 模块

> 大语言模型提供商抽象层，支持 OpenAI、Anthropic 及自定义 OpenAI 兼容 API

## 模块职责

- 定义统一的 LLM Provider 接口
- 实现 OpenAI 和 Anthropic 提供商
- 支持流式响应（SSE）
- 解析 LLM 响应中的 SlideSpec

## 入口与启动

### factory.ts
工厂函数，根据配置创建对应的 Provider 实例：
```typescript
function createLLMProvider(config: ProviderConfig): ILLMProvider
```

### openai.ts
OpenAI Provider 实现，支持：
- GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- 流式和非流式请求
- 自定义 baseUrl（兼容第三方 API）

### anthropic.ts
Anthropic Provider 实现，支持：
- Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- 流式和非流式请求
- 浏览器直连模式（`anthropic-dangerous-direct-browser-access`）

### response-parser.ts
响应解析器，提供：
- `isSlideGenerationRequest()`: 检测是否为幻灯片生成请求
- `extractSlideSpec()`: 从 LLM 响应中提取 SlideSpec JSON
- `getSlideSpecSystemPrompt()`: 生成幻灯片专用系统提示

## 对外接口

### ILLMProvider 接口

```typescript
interface ILLMProvider {
  readonly id: LLMProviderId;
  readonly label: string;
  supportsStreaming: boolean;
  listModels(): LLMModelInfo[];
  send(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;
  stream(
    request: LLMRequest,
    handlers: LLMStreamHandlers,
    signal?: AbortSignal
  ): Promise<LLMStreamController>;
}
```

### LLMStreamHandlers

```typescript
interface LLMStreamHandlers {
  onToken: (chunk: LLMStreamChunk) => void;
  onError: (error: LLMError) => void;
  onComplete: (response: LLMResponse) => void;
}
```

## 关键依赖与配置

| 依赖 | 用途 |
|-----|------|
| `fetch` | HTTP 请求 |
| `@/types` | 类型定义 |

### 配置项

| 配置 | 说明 |
|-----|------|
| `apiKey` | API 密钥 |
| `baseUrl` | API 端点 |
| `model` | 模型 ID |

## 数据模型

### LLMRequest
```typescript
interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
```

### LLMResponse
```typescript
interface LLMResponse {
  id: string;
  content: string;
  finishReason?: 'stop' | 'length' | 'error';
}
```

### LLMError
```typescript
interface LLMError {
  code: LLMErrorCode;
  message: string;
  retryable: boolean;
}
```

## 测试与质量

当前无测试覆盖。建议添加：
- 单元测试：response-parser 的 SlideSpec 提取逻辑
- 单元测试：Provider 的请求构建逻辑（mock fetch）
- 集成测试：实际 API 调用（需 API Key）

## 常见问题 (FAQ)

**Q: 如何添加新的 LLM 提供商？**
A:
1. 创建新文件实现 `ILLMProvider` 接口
2. 在 `factory.ts` 中添加 case 分支
3. 在 `@/types/index.ts` 中扩展 `LLMProviderId` 类型

**Q: 为什么 Anthropic 使用 `anthropic-dangerous-direct-browser-access`？**
A: Office Add-in 运行在浏览器环境，需要直接从前端调用 API。生产环境建议通过后端代理。

**Q: 如何处理流式请求中断？**
A: `stream()` 返回的 `LLMStreamController` 提供 `abort()` 方法，调用后会触发 `onError` 回调。

## 相关文件清单

| 文件 | 说明 |
|-----|------|
| `factory.ts` | Provider 工厂函数 |
| `openai.ts` | OpenAI Provider |
| `anthropic.ts` | Anthropic Provider |
| `response-parser.ts` | 响应解析器 |

## 变更记录 (Changelog)

### 2026-01-15
- 初始化模块文档
