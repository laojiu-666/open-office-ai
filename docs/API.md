# Open Office AI - API 文档

> 供应商适配器系统和 Function Calling API 参考

## 目录

- [供应商适配器系统](#供应商适配器系统)
- [Function Calling 系统](#function-calling-系统)
- [图片生成服务](#图片生成服务)
- [类型定义](#类型定义)

---

## 供应商适配器系统

### ProviderExecutor

统一执行层，负责适配器调度、HTTP 请求、错误处理和降级策略。

#### 构造函数

```typescript
constructor(registry?: ProviderRegistry)
```

**参数**：
- `registry` (可选) - 供应商注册表实例，默认使用全局注册表

#### executeText()

执行文本生成请求。

```typescript
async executeText(
  connections: AIConnection[],
  input: UnifiedTextRequest,
  profile?: GenerationProfile,
  options?: ProviderExecutorOptions
): Promise<ProviderExecutorResult<UnifiedTextResponse>>
```

**参数**：
- `connections` - AI 连接列表
- `input` - 统一文本请求
  - `prompt: string` - 提示词
  - `options?: { temperature?: number; maxTokens?: number }` - 生成选项
- `profile` (可选) - 生成配置
  - `mode: 'auto' | 'manual'` - 模式
  - `textProvider?: string` - 手动指定的文本提供商 ID
- `options` (可选) - 执行选项
  - `maxAttempts?: number` - 最大尝试次数
  - `signal?: AbortSignal` - 中止信号

**返回值**：
```typescript
{
  connection: AIConnection;  // 实际使用的连接
  adapterId: string;         // 适配器 ID
  response: UnifiedTextResponse;  // 响应
  attempts: number;          // 尝试次数
}
```

**示例**：
```typescript
import { ProviderExecutor } from '@core/providers';

const executor = new ProviderExecutor();
const result = await executor.executeText(
  connections,
  {
    prompt: '写一首关于春天的诗',
    options: { temperature: 0.7, maxTokens: 500 }
  },
  { mode: 'auto' }
);

console.log(result.response.text);
console.log(`使用了 ${result.connection.name}，尝试了 ${result.attempts} 次`);
```

#### executeImage()

执行图片生成请求。

```typescript
async executeImage(
  connections: AIConnection[],
  input: UnifiedImageRequest,
  profile?: GenerationProfile,
  options?: ProviderExecutorOptions
): Promise<ProviderExecutorResult<UnifiedImageResponse>>
```

**参数**：
- `connections` - AI 连接列表
- `input` - 统一图片请求
  - `prompt: string` - 图片描述
  - `size?: string` - 尺寸（如 '1024x1024'）
  - `style?: 'photorealistic' | 'illustration' | 'flat'` - 风格
- `profile` (可选) - 生成配置
- `options` (可选) - 执行选项

**返回值**：
```typescript
{
  connection: AIConnection;
  adapterId: string;
  response: UnifiedImageResponse;  // { images: Array<{ data: string; format: string; width: number; height: number }> }
  attempts: number;
}
```

**示例**：
```typescript
const result = await executor.executeImage(
  connections,
  {
    prompt: '一只可爱的橘猫',
    size: '1024x1024',
    style: 'photorealistic'
  }
);

const imageData = result.response.images[0].data;  // base64 数据
```

---

### ProviderRegistry

供应商注册表，管理所有可用的适配器。

#### getAdapter()

获取指定供应商的适配器。

```typescript
getAdapter(providerId: LLMProviderId): ProviderAdapter | null
```

#### supportsCapability()

检查供应商是否支持指定能力。

```typescript
supportsCapability(providerId: LLMProviderId, capability: 'text' | 'image'): boolean
```

#### getProvidersByCapability()

获取所有支持指定能力的供应商。

```typescript
getProvidersByCapability(capability: 'text' | 'image'): ProviderAdapter[]
```

**示例**：
```typescript
import { getRegistry } from '@core/providers';

const registry = getRegistry();
const imageProviders = registry.getProvidersByCapability('image');
console.log(`支持图片生成的供应商：${imageProviders.map(p => p.id).join(', ')}`);
```

---

### ProviderAdapter

供应商适配器接口，所有适配器必须实现此接口。

#### 接口定义

```typescript
interface ProviderAdapter {
  id: LLMProviderId;
  name: string;
  capabilities: Array<'text' | 'image'>;

  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest;
  parseTextResponse(resp: HttpResponse): UnifiedTextResponse;

  buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest;
  parseImageResponse(resp: HttpResponse): UnifiedImageResponse;

  mapError(error: HttpError): ProviderError;
}
```

#### 创建新适配器

```typescript
import { BaseProviderAdapter } from '@core/providers';

export class MyProviderAdapter extends BaseProviderAdapter {
  id = 'my-provider' as const;
  name = 'My Provider';
  capabilities = ['text', 'image'] as const;

  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest {
    return {
      url: `${config.baseUrl}/chat/completions`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      body: {
        model: config.model,
        messages: [{ role: 'user', content: input.prompt }],
        temperature: input.options?.temperature ?? 0.7,
      }
    };
  }

  parseTextResponse(resp: HttpResponse): UnifiedTextResponse {
    const body = resp.body as any;
    return {
      text: body.choices[0].message.content,
      raw: body
    };
  }

  // 实现其他方法...
}
```

---

## Function Calling 系统

### ToolRegistry

工具注册表，管理所有可用的工具。

#### register()

注册新工具。

```typescript
register(tool: RegisteredTool): void
```

**参数**：
```typescript
interface RegisteredTool extends ToolDefinition {
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}
```

**示例**：
```typescript
import { getToolRegistry } from '@core/tools/registry';

const registry = getToolRegistry();

registry.register({
  name: 'my_tool',
  description: '我的自定义工具',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: '输入文本'
      }
    },
    required: ['input']
  },
  handler: async (args) => {
    const result = await doSomething(args.input as string);
    return {
      success: true,
      data: result
    };
  }
});
```

#### execute()

执行工具。

```typescript
async execute(name: string, args: Record<string, unknown>): Promise<ToolResult>
```

**返回值**：
```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

#### getToolDefinitions()

获取所有工具的定义（用于传递给 LLM）。

```typescript
getToolDefinitions(): ToolDefinition[]
```

---

### 内置工具

#### ppt_create_slide

创建新幻灯片。

**参数**：
```typescript
{
  layout: 'title-content' | 'title-image' | 'title-only' | 'blank';
  title: string;
  content?: string[];  // 内容要点
  includeImage?: boolean;
  imagePrompt?: string;  // 图片描述（当 includeImage 为 true 时必需）
}
```

**示例**：
```typescript
await registry.execute('ppt_create_slide', {
  layout: 'title-content',
  title: '产品介绍',
  content: ['功能强大', '易于使用', '价格实惠']
});
```

#### ppt_insert_image

插入图片到当前幻灯片。

**参数**：
```typescript
{
  imageData: string;  // base64 编码的图片数据
  x?: number;  // X 坐标（0-960，默认 50）
  y?: number;  // Y 坐标（0-540，默认 50）
  width?: number;  // 宽度（默认 400）
  height?: number;  // 高度（默认 300）
}
```

#### ppt_set_background

设置当前幻灯片的背景图片。

**参数**：
```typescript
{
  imageData: string;  // base64 编码的背景图片
  transparency?: number;  // 透明度（0-1）
}
```

#### ppt_replace_selection

替换当前选中的文本。

**参数**：
```typescript
{
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;  // 十六进制颜色（如 "#FF0000"）
  bold?: boolean;
  italic?: boolean;
}
```

#### ppt_insert_text

在指定位置插入文本框。

**参数**：
```typescript
{
  text: string;
  x: number;  // X 坐标（0-960）
  y: number;  // Y 坐标（0-540）
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
}
```

#### ppt_get_context

获取当前演示文稿的上下文信息。

**参数**：无

**返回值**：
```typescript
{
  slideCount: number;
  currentSlideIndex: number;
  theme: {
    colorScheme: string[];
    fontScheme: { major: string; minor: string };
  };
}
```

#### generate_text

生成文本内容。

**参数**：
```typescript
{
  prompt: string;
}
```

**返回值**：
```typescript
{
  type: 'text';
  content: string;
  metadata: {
    provider: string;
    model: string;
  };
}
```

#### generate_image

生成图片。

**参数**：
```typescript
{
  prompt: string;
  size?: '512x512' | '1024x1024';
  style?: 'photorealistic' | 'illustration' | 'flat';
}
```

**返回值**：
```typescript
{
  type: 'image';
  content: string;  // base64 数据
  metadata: {
    provider: string;
    model: string;
    width: number;
    height: number;
    format: string;
  };
}
```

---

## 图片生成服务

### ImageGenerationProvider

图片生成服务，支持多提供商和降级。

#### 构造函数

```typescript
constructor(
  config: ImageGenConfig,
  connections: AIConnection[],
  profile?: GenerationProfile,
  executor?: ProviderExecutor
)
```

#### generate()

生成图片。

```typescript
async generate(request: ImageGenRequest): Promise<ImageGenResponse>
```

**参数**：
```typescript
interface ImageGenRequest {
  prompt: string;
  size?: ImageSize;  // '512x512' | '1024x1024'
  style?: ImageStyle;  // 'photorealistic' | 'illustration' | 'flat'
}
```

**返回值**：
```typescript
interface ImageGenResponse {
  id: string;
  data: string;  // base64 数据
  width: number;
  height: number;
  format: string;
}
```

**示例**：
```typescript
import { createImageGenerationProvider } from '@core/image/provider';

const provider = createImageGenerationProvider(
  config,
  connections,
  generationProfile
);

const result = await provider.generate({
  prompt: '一只可爱的小狗',
  size: '1024x1024',
  style: 'photorealistic'
});

console.log(`生成的图片：${result.width}x${result.height}`);
```

#### getLastConnection()

获取最后使用的连接。

```typescript
getLastConnection(): AIConnection | null
```

---

## 类型定义

### AIConnection

AI 连接配置。

```typescript
interface AIConnection {
  id: string;
  name: string;
  providerId: LLMProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;              // 文本生成模型
  imageModel?: string;        // 图片生成模型
  capabilities?: {
    text?: { model: string };
    image?: { model: string };
  };
  createdAt: number;
  lastUsedAt?: number;
  disabled?: boolean;
}
```

### GenerationProfile

生成配置。

```typescript
interface GenerationProfile {
  mode: 'auto' | 'manual';
  textProvider?: string;   // 手动模式下的文本提供商 ID
  imageProvider?: string;  // 手动模式下的图片提供商 ID
}
```

### LLMProviderId

支持的供应商 ID。

```typescript
type LLMProviderId =
  | 'openai'
  | 'gemini'
  | 'glm'
  | 'doubao'
  | 'deepseek-janus'
  | 'grok'
  | 'qianfan'
  | 'dashscope'
  | 'custom';
```

### UnifiedTextRequest

统一文本请求。

```typescript
interface UnifiedTextRequest {
  prompt: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}
```

### UnifiedTextResponse

统一文本响应。

```typescript
interface UnifiedTextResponse {
  text: string;
  raw: unknown;
}
```

### UnifiedImageRequest

统一图片请求。

```typescript
interface UnifiedImageRequest {
  prompt: string;
  size?: string;
  style?: 'photorealistic' | 'illustration' | 'flat';
}
```

### UnifiedImageResponse

统一图片响应。

```typescript
interface UnifiedImageResponse {
  images: Array<{
    data: string;      // base64 或 URL
    format: string;    // 'png' | 'jpeg' | 'webp'
    width: number;
    height: number;
  }>;
  raw: unknown;
}
```

### ProviderError

供应商错误。

```typescript
interface ProviderError {
  code: 'auth_invalid' | 'rate_limited' | 'timeout' | 'provider_unavailable'
      | 'model_not_found' | 'quota_exceeded' | 'input_invalid' | 'unknown';
  message: string;
  details?: unknown;
  retryable: boolean;
}
```

---

## 错误处理

### 可重试错误

以下错误会触发自动降级到下一个候选提供商：

- `rate_limited` - 速率限制
- `timeout` - 请求超时
- `provider_unavailable` - 提供商不可用

### 不可重试错误

以下错误会立即失败，不会尝试其他提供商：

- `auth_invalid` - 认证失败
- `model_not_found` - 模型不存在
- `quota_exceeded` - 配额耗尽
- `input_invalid` - 输入无效

### 错误处理示例

```typescript
try {
  const result = await executor.executeImage(connections, input);
  console.log('成功生成图片');
} catch (error) {
  if (error instanceof ProviderErrorClass) {
    console.error(`错误代码: ${error.code}`);
    console.error(`错误信息: ${error.getUserMessage()}`);
    console.error(`是否可重试: ${error.isRetryable()}`);
  }
}
```

---

## 最佳实践

### 1. 初始化注册表

在应用启动时初始化供应商注册表：

```typescript
// src/taskpane/index.tsx
import { createDefaultRegistry, initializeRegistry } from '@core/providers';

Office.onReady(() => {
  initializeRegistry(createDefaultRegistry());
  // 渲染应用...
});
```

### 2. 使用降级策略

配置多个连接以实现自动降级：

```typescript
const connections = [
  { id: '1', providerId: 'openai', apiKey: 'key1', ... },
  { id: '2', providerId: 'gemini', apiKey: 'key2', ... },
  { id: '3', providerId: 'glm', apiKey: 'key3', ... },
];

// 如果 OpenAI 失败，会自动尝试 Gemini，再失败会尝试 GLM
const result = await executor.executeImage(connections, input);
```

### 3. 手动指定提供商

使用 `GenerationProfile` 手动指定提供商：

```typescript
const profile: GenerationProfile = {
  mode: 'manual',
  textProvider: 'connection-id-1',
  imageProvider: 'connection-id-2'
};

const result = await executor.executeText(connections, input, profile);
```

### 4. 超时控制

使用 `AbortSignal` 控制请求超时：

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000);  // 30秒超时

try {
  const result = await executor.executeText(
    connections,
    input,
    undefined,
    { signal: controller.signal }
  );
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('请求超时');
  }
}
```

### 5. 图片数据验证

图片生成服务会自动验证 base64 数据：

```typescript
const result = await provider.generate({ prompt: '...' });
// result.data 已经过验证，确保是有效的 base64 数据
```

---

## 版本历史

### v1.0.0 (2026-01-20)
- 初始版本
- 实现供应商适配器系统
- 实现 Function Calling 系统
- 支持 8 个供应商
- 实现多提供商降级策略
