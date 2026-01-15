[根目录](../../CLAUDE.md) > **types**

# 类型定义模块

> TypeScript 类型定义，为整个项目提供类型安全

## 模块职责

- 定义 LLM Provider 相关类型
- 定义文档适配器接口
- 定义 SlideSpec 幻灯片规格
- 定义应用配置和状态类型

## 入口与启动

### index.ts
主入口，导出所有通用类型，并 re-export `slide-spec.ts` 中的类型。

### slide-spec.ts
SlideSpec 相关类型定义，用于结构化幻灯片生成。

## 类型分类

### LLM Provider 类型

```typescript
// Provider ID
type LLMProviderId = 'openai' | 'anthropic' | 'custom';

// 消息格式
interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 请求/响应
interface LLMRequest { ... }
interface LLMResponse { ... }
interface LLMStreamChunk { ... }

// 错误处理
type LLMErrorCode = 'config_missing' | 'auth_failed' | 'rate_limited' | ...;
interface LLMError { ... }

// Provider 接口
interface ILLMProvider { ... }
```

### 文档适配器类型

```typescript
// 宿主应用
type HostApp = 'powerpoint' | 'word' | 'excel';

// 选区
interface DocumentSelection {
  text: string;
  isEmpty: boolean;
  context: { slideId?: string; shapeId?: string };
}

// 能力声明
interface DocumentCapabilities {
  selectionText: boolean;
  replaceText: boolean;
  insertText: boolean;
  deleteText: boolean;
}

// 适配器接口
interface IDocumentAdapter { ... }
```

### SlideSpec 类型

```typescript
// 布局模板
type LayoutTemplate = 'title-only' | 'title-content' | 'title-two-content' | ...;

// 几何边界
interface Bounds { x, y, width, height }

// 主题
interface ThemeSpec { name, fonts, colors }

// 文本/图片块
interface TextBlockSpec { kind: 'text', slotId, content, style }
interface ImageBlockSpec { kind: 'image', slotId, prompt, assetId, style }

// 主规格
interface SlideSpec {
  version: '1.0';
  layout: { template, slots };
  blocks: SlideBlockSpec[];
  theme?: ThemeSpec;
  assets?: ImageAsset[];
  speakerNotes?: string;
}
```

### 配置类型

```typescript
interface ProviderConfig {
  providerId: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ImageGenConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultSize: '512x512' | '1024x1024';
}
```

### 聊天类型

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  context?: string;
  slideSpec?: SlideSpec;
}
```

### 上下文类型

```typescript
interface PresentationContext {
  slideCount: number;
  currentSlideIndex: number;
  slideWidth: number;
  slideHeight: number;
}

interface SlideContext {
  slideId: string;
  slideIndex: number;
  width: number;
  height: number;
  shapes: ShapeInfo[];
}

interface SelectionContext {
  slideId?: string;
  shapeId?: string;
  text?: string;
  textStyle?: TextStyle;
}
```

## 关键依赖与配置

无外部依赖，纯类型定义。

## 测试与质量

类型定义通过 TypeScript 编译器检查，无需运行时测试。

## 常见问题 (FAQ)

**Q: 如何扩展 LLMProviderId？**
A: 在 `index.ts` 中修改 `LLMProviderId` 类型定义，并在 `appStore.ts` 的 `defaultProviders` 中添加对应配置。

**Q: SlideSpec 版本如何升级？**
A: 修改 `SlideSpecVersion` 类型，并在 `response-parser.ts` 中添加版本兼容逻辑。

**Q: 为什么 ColorValue 支持 theme: 前缀？**
A: 允许在 SlideSpec 中引用主题颜色，渲染时动态解析为实际颜色值。

## 相关文件清单

| 文件 | 说明 |
|-----|------|
| `index.ts` | 通用类型定义 |
| `slide-spec.ts` | SlideSpec 类型定义 |

## 变更记录 (Changelog)

### 2026-01-15
- 初始化模块文档
