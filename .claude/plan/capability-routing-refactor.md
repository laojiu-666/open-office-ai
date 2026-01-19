# 能力路由系统与图片生成服务重构 - 实施计划

> 基于 Codex（后端）和 Gemini（前端）协作规划
> 生成时间：2026-01-19
> 计划版本：v1.0

---

## 📋 任务概述

**目标**：统一 LLM 和图片生成服务的能力管理，支持多提供商动态路由和降级

**选定方案**：
- **后端**：方案 A（统一执行层）
- **前端**：方案 B（专用能力行）

---

## 🎯 核心目标

1. 新建 `ProviderExecutor` 统一调度适配器
2. 重构 `ImageGenerationProvider` 使用执行层
3. 在应用启动时初始化注册表
4. 在设置页面展示能力标签

---

## 📐 架构设计

### 后端架构（Codex 设计）

```
┌─────────────────────────────────────────────────────────┐
│                   ProviderExecutor                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. 按能力选择连接（手动优先 → 自动候选）        │  │
│  │ 2. 查注册表获取适配器                            │  │
│  │ 3. 构建请求（buildTextRequest/buildImageRequest）│  │
│  │ 4. 执行 HTTP（应用代理/URL 规范化）              │  │
│  │ 5. 解析响应（parseTextResponse/parseImageResponse）│  │
│  │ 6. 错误映射与重试（仅对可重试错误触发）          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        │                                     │
┌───────▼────────┐                  ┌────────▼────────┐
│ ImageGeneration│                  │  LLM Text Gen   │
│    Provider    │                  │   (Tool Only)   │
└────────────────┘                  └─────────────────┘
```

### 前端 UI 设计（Gemini 设计）

```
┌─────────────────────────────────────────────────────┐
│ ConnectionCard                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ [✓] Connection Name              [Edit][Delete]│  │
│  │                                                 │  │
│  │ ┌─────────────────────────────────────────┐   │  │
│  │ │ 📝 Text: GPT-4   🎨 Image: DALL-E 3     │   │  │
│  │ └─────────────────────────────────────────┘   │  │
│  │                                                 │  │
│  │ [OpenAI] • gpt-4o                               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📂 文件清单

### 新建文件（1 个）
| 文件路径 | 说明 |
|---------|------|
| `src/core/providers/executor.ts` | 统一执行层，负责适配器调度、HTTP 请求、错误处理、降级策略 |

### 修改文件（6 个）
| 文件路径 | 修改内容 |
|---------|----------|
| `src/core/providers/index.ts` | 导出 `ProviderExecutor` |
| `src/core/image/provider.ts` | 重构为使用 `ProviderExecutor`，支持多连接、降级、图片数据规范化 |
| `src/core/tools/generation-tools.ts` | `generate_text` 和 `generate_image` 工具使用 `ProviderExecutor` |
| `src/taskpane/index.tsx` | 应用启动时初始化 `ProviderRegistry` |
| `src/core/providers/adapters/openai.ts` | 添加 `style` 参数支持 |
| `src/ui/components/settings/connections/ConnectionCard.tsx` | 添加能力 Pills 展示 |

---

## 🔧 实施步骤

### 阶段 1：后端核心（ProviderExecutor）

#### Step 1.1：创建 ProviderExecutor
**文件**：`src/core/providers/executor.ts`

**功能**：
- `executeText()` - 执行文本生成
- `executeImage()` - 执行图片生成
- `getCandidates()` - 按能力选择候选连接（手动优先）
- `executeOnce()` - 单次执行（构建请求 → HTTP → 解析响应）
- `sendHttpRequest()` - HTTP 请求（应用代理、错误处理）
- `applyProxyIfNeeded()` - 代理逻辑（开发环境 + 火山引擎 API）

**关键逻辑**：
```typescript
// 降级策略：仅对可重试错误触发
if (providerError.isRetryable() && index < maxAttempts - 1) {
  continue; // 尝试下一个候选
}
```

#### Step 1.2：导出 ProviderExecutor
**文件**：`src/core/providers/index.ts`

```typescript
export { ProviderExecutor } from './executor';
```

---

### 阶段 2：图片生成服务重构

#### Step 2.1：重构 ImageGenerationProvider
**文件**：`src/core/image/provider.ts`

**变更**：
- 构造函数接受 `connections[]` 和 `profile`（而非单个 `connection`）
- 使用 `ProviderExecutor.executeImage()` 替代直接 fetch
- 添加 `normalizeImageData()` 方法（URL → base64 转换）
- 添加 `getLastConnection()` 方法（返回最后使用的连接）
- 错误映射：`ProviderErrorClass` → `ImageGenerationError`

**关键代码**：
```typescript
const result = await this.executor.executeImage(
  connectionsWithKey,
  unifiedRequest,
  this.profile
);

const data = await this.normalizeImageData(result.response.images[0].data);
this.lastConnection = result.connection;
```

#### Step 2.2：更新工厂函数
**文件**：`src/core/image/provider.ts`

```typescript
export function createImageGenerationProvider(
  config: ImageGenConfig,
  connectionOrConnections: AIConnection | AIConnection[] | null,
  generationProfile?: GenerationProfile
): ImageGenerationProvider {
  if (Array.isArray(connectionOrConnections)) {
    return new ImageGenerationProvider(config, connectionOrConnections, generationProfile);
  }
  const connections = connectionOrConnections ? [connectionOrConnections] : [];
  return new ImageGenerationProvider(config, connections, generationProfile);
}
```

---

### 阶段 3：工具集成

#### Step 3.1：更新 generate_text 工具
**文件**：`src/core/tools/generation-tools.ts`

**变更**：
- 移除 `CapabilityRouter` 和 `createLLMProvider`
- 使用 `ProviderExecutor.executeText()`
- 错误处理：`ProviderErrorClass.getUserMessage()`

#### Step 3.2：更新 generate_image 工具
**文件**：`src/core/tools/generation-tools.ts`

**变更**：
- 传递 `connections` 和 `generationProfile` 给 `createImageGenerationProvider`
- 使用 `imageProvider.getLastConnection()` 获取实际使用的连接

---

### 阶段 4：应用启动初始化

#### Step 4.1：初始化 ProviderRegistry
**文件**：`src/taskpane/index.tsx`

```typescript
import { createDefaultRegistry, initializeRegistry } from '@core/providers';

Office.onReady((info) => {
  if (info.host === Office.HostType.PowerPoint) {
    initializeRegistry(createDefaultRegistry()); // 初始化注册表
    // ... 渲染 React 应用
  }
});
```

---

### 阶段 5：前端 UI 增强

#### Step 5.1：更新 ConnectionCard
**文件**：`src/ui/components/settings/connections/ConnectionCard.tsx`

**变更**：
1. 导入图标：`TextDescription20Regular`, `Image20Regular`
2. 导入 `Tooltip` 组件
3. 添加样式类：`capabilities`（flex 容器）
4. 渲染能力 Pills：
   - **Text Badge**：始终显示，Tooltip 显示文本模型
   - **Image Badge**：条件显示（`preset.capabilities` 包含 `'image'`），Tooltip 显示图片模型

**示例代码**：
```tsx
<div className={styles.capabilities}>
  {/* Text Capability */}
  <Tooltip content={`Text Model: ${connection.model}`}>
    <Badge icon={<TextDescription20Regular />} appearance="tint">
      Text
    </Badge>
  </Tooltip>

  {/* Image Capability (Conditional) */}
  {preset.capabilities?.includes('image') && (
    <Tooltip content={`Image Model: ${connection.imageModel || 'Not configured'}`}>
      <Badge
        icon={<Image20Regular />}
        appearance={connection.imageModel ? "tint" : "outline"}
        style={{ opacity: connection.imageModel ? 1 : 0.6 }}
      >
        Image
      </Badge>
    </Tooltip>
  )}
</div>
```

---

### 阶段 6：适配器增强

#### Step 6.1：OpenAI 适配器添加 style 支持
**文件**：`src/core/providers/adapters/openai.ts`

```typescript
buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest {
  return {
    // ...
    body: {
      // ...
      ...(input.style ? { style: input.style } : {}),
    },
  };
}
```

---

## ⚠️ 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| **注册表未初始化** | 在 `taskpane/index.tsx` 中 `Office.onReady` 后立即初始化 |
| **图片 URL 响应** | `normalizeImageData()` 自动下载并转换为 base64 |
| **重试风暴** | 限制 `maxAttempts`，仅对 `isRetryable()` 错误重试 |
| **代理逻辑冲突** | 统一在 `ProviderExecutor.applyProxyIfNeeded()` 中处理 |
| **流式支持缺失** | 聊天界面继续使用旧 LLM Provider，仅工具使用 Executor |

---

## ✅ 验收标准

- [ ] 应用启动时成功初始化 `ProviderRegistry`
- [ ] 图片生成工具使用 `ProviderExecutor`，支持多提供商降级
- [ ] 文本生成工具使用 `ProviderExecutor`，支持多提供商降级
- [ ] 设置页面 `ConnectionCard` 显示能力 Pills（Text/Image）
- [ ] 图片生成支持 URL 响应自动转换为 base64
- [ ] 降级策略仅对可重试错误触发（rate_limited, timeout, provider_unavailable）
- [ ] TypeScript 类型检查通过
- [ ] 手动测试：文本生成、图片生成、降级场景

---

## 📊 会话 ID

- **Codex 会话**：`019bd444-c82e-72e2-ac83-fd2075b2c4d2`
- **Gemini 会话**：`af22ea53-2b44-4e96-94b5-09cb8d9e4c98`

---

## 📝 下一步行动

1. ✅ 完成详细规划
2. ⏳ 等待用户批准
3. ⏳ 执行实施（阶段 4：实施）
4. ⏳ 代码优化（阶段 5：优化）
5. ⏳ 质量审查（阶段 6：评审）

---

**报告生成时间**：2026-01-19
**执行者**：Claude Opus 4.5（多模型协作编排）
