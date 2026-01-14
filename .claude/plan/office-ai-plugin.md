# Office AI 插件开发计划

## 项目概述

开发一款内嵌在 Office（PPT 优先）的 AI 辅助插件，通过聊天交互实现文档内容的改写、生成、删除等操作。

### 技术决策

| 项目 | 决策 |
|------|------|
| 目标平台 | Office Add-in（Office.js） |
| API 架构 | 前端+可选网关（默认直连，支持代理配置） |
| 技术栈 | React + TypeScript + Fluent UI |
| UI 形态 | Task Pane 侧边栏（300-350px） |
| 流式策略 | 先预览后应用 |
| 扩展性 | 预留 Word/Excel 适配器接口 |

---

## 架构设计

### 分层架构

```
User
  -> Task Pane UI (React + Fluent UI)
    -> Chat Orchestrator
      -> ILLMProvider (send/stream)
        -> StreamTransport
          -> StreamBuffer (节流)
            -> Preview Panel
              -> Apply Action
                -> IDocumentAdapter
                  -> Office.js Host (PPT/Word/Excel)
```

### 目录结构

```
src/
  taskpane/                  # Task Pane 入口
    index.tsx
    App.tsx
  core/
    llm/                     # LLM Provider 抽象与实现
      types.ts               # ILLMProvider 接口定义
      openai.ts              # OpenAI 适配器
      anthropic.ts           # Claude 适配器
      factory.ts             # Provider 工厂
    stream/                  # 流式处理
      transport.ts           # SSE/Fetch Streams 解析
      buffer.ts              # 缓冲节流
    config/                  # 配置管理
      store.ts               # 配置存储
      validator.ts           # 配置校验
    document/                # 文档抽象接口
      types.ts               # IDocumentAdapter 接口
      factory.ts             # Adapter 工厂
  adapters/
    powerpoint/              # PPT 适配器
      index.ts
      selection.ts           # 选区获取
      operations.ts          # 文本操作
    word/                    # Word 适配器（预留）
    excel/                   # Excel 适配器（预留）
  ui/
    components/
      layout/
        TaskPane.tsx         # 主容器
        Header.tsx           # 导航头
      chat/
        MessageList.tsx      # 消息列表
        MessageBubble.tsx    # 消息气泡（支持流式）
        InputArea.tsx        # 输入区
        QuickActions.tsx     # 快捷操作
        ActionToolbar.tsx    # 应用操作（Insert/Replace/Copy）
      settings/
        ConfigPanel.tsx      # API 配置面板
        ProviderSelector.tsx # Provider 选择
      common/
        MarkdownRenderer.tsx # Markdown 渲染
        ContextIndicator.tsx # 上下文指示器
    hooks/
      useOfficeSelection.ts  # Office 选区监听
      useLLMStream.ts        # LLM 流式处理
      useConfig.ts           # 配置管理
    store/
      appStore.ts            # 全局状态（Zustand）
  types/                     # 全局类型定义
    index.ts
  utils/                     # 通用工具
manifest.xml                 # Office Add-in 清单
```

---

## 核心接口定义

### ILLMProvider（LLM 提供者接口）

```typescript
export type LLMProviderId = "openai" | "anthropic" | "custom";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
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
  finishReason?: "stop" | "length" | "error";
}

export interface LLMStreamChunk {
  contentDelta?: string;
  finishReason?: string;
}

export interface LLMStreamHandlers {
  onToken: (chunk: LLMStreamChunk) => void;
  onError: (error: Error) => void;
  onComplete: (response: LLMResponse) => void;
}

export interface ILLMProvider {
  readonly id: LLMProviderId;
  readonly label: string;
  supportsStreaming: boolean;
  send: (request: LLMRequest) => Promise<LLMResponse>;
  stream?: (request: LLMRequest, handlers: LLMStreamHandlers) => Promise<{ abort: () => void }>;
}
```

### IDocumentAdapter（文档适配器接口）

```typescript
export type HostApp = "powerpoint" | "word" | "excel";

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

export interface IDocumentAdapter {
  readonly host: HostApp;
  getSelection: () => Promise<DocumentSelection>;
  replaceSelection: (text: string, format?: TextFormat) => Promise<void>;
  insertText: (text: string) => Promise<void>;
  deleteSelection: () => Promise<void>;
}
```

---

## UI 组件设计

### 布局结构

```
+-----------------------------------+
| [Icon] Open Office AI    [Gear]   | <- Header
+-----------------------------------+
| (i) 已选中: 标题文本框             | <- ContextIndicator
+-----------------------------------+
|                                   |
| [用户]                            |
| 让这段话更专业                     |
|                                   |
| [AI]                              |
| 以下是专业版本：                   | <- MessageList
|                                   |
| "Q4 财务概览..."                  |
|                                   |
| [ 插入 ] [ 替换 ] [ 复制 ]        | <- ActionToolbar
|                                   |
+-----------------------------------+
| [总结] [翻译] [润色]              | <- QuickActions
+-----------------------------------+
| [ 输入消息...                   ] | <- InputArea
| [ > 发送 ]                        |
+-----------------------------------+
```

### 状态管理

```typescript
// 全局状态（Zustand）
interface AppState {
  // 配置
  settings: {
    provider: LLMProviderId;
    apiKey: string;
    baseUrl?: string;
    model: string;
  };
  // 视图
  currentView: 'chat' | 'settings';
  // 方法
  updateSettings: (partial: Partial<AppState['settings']>) => void;
  switchView: (view: 'chat' | 'settings') => void;
}

// 聊天状态（局部）
interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentSelection: DocumentSelection | null;
}
```

---

## 实施计划

### Phase 1: 项目初始化
- [ ] 使用 Yeoman 生成 Office Add-in 项目骨架
- [ ] 配置 React + TypeScript + Fluent UI
- [ ] 创建目录结构
- [ ] 配置 manifest.xml（PPT Task Pane）

### Phase 2: 核心模块
- [ ] 实现 ILLMProvider 接口和 OpenAI 适配器
- [ ] 实现流式处理模块（SSE 解析、缓冲节流）
- [ ] 实现配置管理模块（localStorage 存储）
- [ ] 实现 IDocumentAdapter 接口和 PPT 适配器

### Phase 3: UI 开发
- [ ] 实现 TaskPane 布局组件
- [ ] 实现聊天界面（MessageList、InputArea）
- [ ] 实现流式消息渲染（打字机效果）
- [ ] 实现 ActionToolbar（Insert/Replace/Copy）
- [ ] 实现配置面板（API Key、Model 选择）
- [ ] 实现 ContextIndicator（选区状态显示）

### Phase 4: 集成测试
- [ ] Office.js 选区获取测试
- [ ] LLM API 调用测试
- [ ] 流式生成 + 文档写入测试
- [ ] 端到端功能验证

---

## 风险与对策

| 风险 | 级别 | 对策 |
|------|------|------|
| CORS 限制 | 高 | 支持代理配置；提供连通性测试 |
| API Key 安全 | 高 | 风险提示；支持企业代理模式 |
| PPT API 能力受限 | 中 | 明确能力边界；复杂格式降级处理 |
| 流式写入性能 | 中 | 缓冲节流（200-500ms）；批量 sync |

---

## 验收标准

1. 能够配置 OpenAI/Claude API 并保存
2. 能够在 PPT 中划词选择文本
3. 能够通过聊天发送 prompt 并流式显示响应
4. 能够将 AI 生成内容插入/替换到 PPT 文档
5. UI 符合 Fluent UI 设计规范
