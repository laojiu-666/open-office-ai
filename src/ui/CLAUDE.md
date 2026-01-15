[根目录](../../CLAUDE.md) > **ui**

# UI 模块

> React UI 组件库，包含聊天界面、设置页面、布局组件和自定义 Hooks

## 模块职责

- 提供完整的用户界面组件
- 管理应用状态（Zustand）
- 封装业务逻辑 Hooks
- 定义设计系统 tokens

## 目录结构

```
ui/
├── components/
│   ├── chat/           # 聊天相关组件
│   │   ├── ChatView.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── InputArea.tsx
│   │   ├── QuickActions.tsx
│   │   └── cards/
│   │       └── SlideGenerationCard.tsx
│   ├── common/         # 通用组件
│   │   ├── ContextIndicator.tsx
│   │   └── ProcessStepIndicator.tsx
│   ├── layout/         # 布局组件
│   │   ├── TaskPane.tsx
│   │   └── Header.tsx
│   └── settings/       # 设置组件
│       └── SettingsView.tsx
├── hooks/              # 自定义 Hooks
│   ├── useLLMStream.ts
│   ├── useOfficeSelection.ts
│   ├── usePresentationContext.ts
│   ├── useSlideGenerator.ts
│   └── useImageGeneration.ts
├── store/              # 状态管理
│   └── appStore.ts
└── styles/             # 设计系统
    └── designTokens.ts
```

## 核心组件

### ChatView
聊天主视图，组合以下子组件：
- `ContextIndicator`: 显示当前选区/幻灯片信息
- `MessageList`: 消息列表
- `QuickActions`: 快捷操作按钮
- `InputArea`: 输入框

### MessageBubble
消息气泡组件，支持：
- 用户/助手消息样式区分
- 流式输出动画
- 操作按钮（复制、替换、插入）
- SlideSpec 生成卡片

### SettingsView
设置页面，配置：
- LLM 服务商选择
- API Key / 端点 / 模型
- 图片生成开关及配置

## 核心 Hooks

### useLLMStream
LLM 流式请求 Hook：
```typescript
const { sendMessage, stopStream } = useLLMStream();
await sendMessage(content, context);
```

### useOfficeSelection
Office 选区监听 Hook：
```typescript
const { currentSelection, hasSelection, refreshSelection } = useOfficeSelection();
```

### usePresentationContext
演示文稿上下文 Hook：
```typescript
const { slideCount, currentSlideIndex, getFullAIContext } = usePresentationContext();
```

### useSlideGenerator
幻灯片生成 Hook：
```typescript
const { generateSlide, currentStep, progress, error } = useSlideGenerator();
await generateSlide(slideSpec);
```

### useImageGeneration
图片生成 Hook：
```typescript
const { generateImage, isGenerating, error } = useImageGeneration();
const result = await generateImage({ prompt: '...' });
```

## 状态管理 (appStore)

### 状态结构
```typescript
interface AppState {
  // 视图
  currentView: 'chat' | 'settings';

  // LLM 配置
  activeProviderId: LLMProviderId;
  providers: Record<LLMProviderId, ProviderConfig>;

  // 图片生成配置
  imageGenConfig: ImageGenConfig;

  // 演示文稿上下文
  presentationContext: PresentationContext;

  // 聊天
  messages: ChatMessage[];
  isStreaming: boolean;

  // 选区
  currentSelection: string;

  // 幻灯片生成
  isGeneratingSlide: boolean;
}
```

### 持久化
使用 `zustand/middleware/persist`，持久化以下字段：
- `activeProviderId`
- `providers`
- `imageGenConfig`

## 设计系统 (designTokens)

### AI 特效
```typescript
aiEffects.gradientBorder  // 蓝紫渐变
aiEffects.glowShadow      // 发光阴影
aiEffects.brandGlow       // 品牌色发光
```

### 布局尺寸
```typescript
layoutDimensions.headerHeight       // 48px
layoutDimensions.inputBorderRadius  // 20px
layoutDimensions.messageBorderRadius // 16px
```

### 阴影
```typescript
shadows.floating  // 浮动元素阴影
shadows.card      // 卡片阴影
shadows.hover     // 悬浮阴影
```

### 动画
```typescript
animation.duration.fast   // 0.15s
animation.duration.normal // 0.25s
animation.easing.easeOut  // cubic-bezier(0.33, 1, 0.68, 1)
```

## 关键依赖

| 依赖 | 用途 |
|-----|------|
| `@fluentui/react-components` | UI 组件库 |
| `@fluentui/react-icons` | 图标库 |
| `zustand` | 状态管理 |
| `react` | React 核心 |

## 测试与质量

当前无测试覆盖。建议添加：
- 单元测试：Hooks 逻辑
- 组件测试：关键组件渲染
- 快照测试：UI 回归

## 常见问题 (FAQ)

**Q: 为什么使用 Zustand 而不是 Redux？**
A: Zustand 更轻量，API 简洁，适合中小型应用。

**Q: 如何添加新的快捷操作？**
A: 修改 `QuickActions.tsx` 中的 `quickPrompts` 数组。

**Q: 如何自定义消息气泡样式？**
A: 修改 `MessageBubble.tsx` 中的 `useStyles`，或扩展 `designTokens.ts`。

## 相关文件清单

| 目录/文件 | 说明 |
|----------|------|
| `components/chat/` | 聊天组件 |
| `components/common/` | 通用组件 |
| `components/layout/` | 布局组件 |
| `components/settings/` | 设置组件 |
| `hooks/` | 自定义 Hooks |
| `store/appStore.ts` | 全局状态 |
| `styles/designTokens.ts` | 设计 tokens |

## 变更记录 (Changelog)

### 2026-01-15
- 初始化模块文档
