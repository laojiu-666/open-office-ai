# 实施计划：Function Calling 智能路由

## 📊 双模型规划综合

### Gemini 前端规划（UI/UX）
- **配置界面**：Capability-Aware Connection Settings，使用 Toggle + 条件输入
- **聊天界面**：ToolExecutionCard 显示路由过程，MediaResultCard 显示结果
- **新增组件**：MediaResultCard（图片/视频展示）、CapabilityBadge（能力指示器）
- **实施顺序**：设置 UI → 逻辑集成 → 媒体组件 → 聊天路由 UI

### Codex 后端规划（技术架构）
- **工具定义**：generate_text/image/video，统一返回结构
- **Provider 扩展**：新增 VideoGenerationProvider
- **路由增强**：CapabilityRouter 错误处理与选择逻辑
- **实施顺序**：类型定义 → Provider 实现 → 工具注册 → Hook 改造

### 🎯 核心共识

两个模型都认同：
1. **配置策略**：显式能力配置（Toggle + 可选模型名）
2. **工具架构**：三个独立工具，内部使用 CapabilityRouter
3. **数据流**：用户输入 → LLM 判断 → 工具调用 → Provider → 结果展示
4. **错误处理**：配置校验 + 运行时校验 + 友好错误提示

---

## 技术方案

### 问题：如何实现 AI 智能选择生成类型

**采用 Function Calling 智能路由**

**核心设计**：
1. **定义三个生成工具**：
   ```typescript
   - generate_text({ prompt, ... })
   - generate_image({ prompt, size?, style?, ... })
   - generate_video({ prompt, duration?, resolution?, ... })
   ```

2. **工具内部路由**：
   ```typescript
   // 工具内部调用 CapabilityRouter
   const router = new CapabilityRouter(connections, generationProfile);
   const connection = router.getImageConnection();
   const provider = createImageGenerationProvider(config, connection);
   ```

3. **LLM 智能判断**：
   ```typescript
   // System Prompt 明确工具能力
   const systemPrompt = `你可以使用以下工具：
   - generate_text: 生成文本内容（回答问题、改写、翻译）
   - generate_image: 生成图片（插图、配图、视觉内容）
   - generate_video: 生成视频（动画、演示）

   根据用户需求自动选择合适的工具。`;
   ```

**用户体验**：
- **简单模式**：用户只需描述需求，AI 自动判断生成类型
- **配置模式**：用户在设置中配置每种能力的模型

---

## 实施步骤

### 阶段 1：类型定义与数据结构（1 小时）

**目标**：统一类型定义，为后续实施奠定基础

**文件清单**：
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/index.ts` | 修改 | 确认 AIConnection.capabilities 结构 |
| `src/types/index.ts` | 新增 | 定义 GenerationToolResult 类型 |

**具体修改**：

1. **确认 AIConnection 类型**（已存在，无需修改）：
```typescript
export interface AIConnection {
  id: string;
  name: string;
  providerId: LLMProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;              // 文字生成模型（向后兼容）
  imageModel?: string;        // 图片生成模型（向后兼容）
  capabilities?: {            // 新字段：多模态能力配置
    text?: { model: string };
    image?: { model: string };
    video?: { model: string };
  };
  createdAt: number;
  lastUsedAt?: number;
  disabled?: boolean;
}
```

2. **新增 GenerationToolResult 类型**：
```typescript
export interface GenerationToolResult {
  type: 'text' | 'image' | 'video';
  content: string;  // 文本内容或 base64 数据
  metadata?: {
    provider?: string;
    model?: string;
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}
```

---

### 阶段 2：配置界面改造（2-3 小时）

**目标**：支持用户配置多种能力模型

**文件清单**：
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/ui/components/settings/connections/AddConnectionDialog.tsx` | 修改 | 添加能力配置区域 |
| `src/ui/components/settings/SettingsView.tsx` | 修改 | 显示能力徽章 |

**具体修改**：

1. **AddConnectionDialog.tsx**（第 87-92 行附近）：

**新增状态**：
```typescript
const [capabilities, setCapabilities] = useState({
  text: true,
  image: false,
  video: false,
});
const [capabilityModels, setCapabilityModels] = useState({
  text: '',
  image: '',
  video: '',
});
```

**新增 UI（在第 239 行 imageModel 输入框后）**：
```typescript
{/* 能力配置区域 */}
<div className={styles.sectionTitle}>模型能力</div>

{/* 文本生成（默认启用） */}
<div className={styles.field}>
  <Label className={styles.label}>
    <TextDescription20Regular className={styles.icon} />
    文字生成
  </Label>
  <Input
    className={styles.input}
    value={capabilityModels.text || model}
    onChange={(_, data) => setCapabilityModels({ ...capabilityModels, text: data.value })}
    placeholder={currentPreset?.defaultModel}
  />
</div>

{/* 图片生成（可选） */}
<div className={styles.field}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Switch
      checked={capabilities.image}
      onChange={(_, data) => setCapabilities({ ...capabilities, image: data.checked })}
    />
    <Label className={styles.label}>
      <Image20Regular className={styles.icon} />
      图片生成（可选）
    </Label>
  </div>
  {capabilities.image && (
    <Input
      className={styles.input}
      value={capabilityModels.image}
      onChange={(_, data) => setCapabilityModels({ ...capabilityModels, image: data.value })}
      placeholder="dall-e-3"
    />
  )}
</div>

{/* 视频生成（可选） */}
<div className={styles.field}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Switch
      checked={capabilities.video}
      onChange={(_, data) => setCapabilities({ ...capabilities, video: data.checked })}
    />
    <Label className={styles.label}>
      <Video20Regular className={styles.icon} />
      视频生成（可选）
    </Label>
  </div>
  {capabilities.video && (
    <Input
      className={styles.input}
      value={capabilityModels.video}
      onChange={(_, data) => setCapabilityModels({ ...capabilityModels, video: data.value })}
      placeholder="sora-1.0"
    />
  )}
</div>
```

**修改保存逻辑**（第 128-139 行 handleSave 函数）：
```typescript
const handleSave = () => {
  const connection: Omit<AIConnection, 'id' | 'createdAt'> = {
    name: name || `${PROVIDER_PRESETS[providerId]?.label || providerId} 连接`,
    providerId,
    apiKey,
    baseUrl,
    model: capabilityModels.text || model,
    // 构建 capabilities 对象
    capabilities: {
      text: { model: capabilityModels.text || model },
      ...(capabilities.image && capabilityModels.image && {
        image: { model: capabilityModels.image }
      }),
      ...(capabilities.video && capabilityModels.video && {
        video: { model: capabilityModels.video }
      }),
    },
    // 向后兼容
    ...(capabilities.image && capabilityModels.image && { imageModel: capabilityModels.image }),
  };
  onSave(connection);
  onOpenChange(false);
};
```

2. **SettingsView.tsx**（连接列表显示）：

**添加能力徽章显示**：
```typescript
{/* 在连接名称下方显示能力徽章 */}
<div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
  {connection.capabilities?.text && (
    <Badge appearance="filled" color="brand">
      <TextDescription16Regular /> 文本
    </Badge>
  )}
  {connection.capabilities?.image && (
    <Badge appearance="filled" color="success">
      <Image16Regular /> 图片
    </Badge>
  )}
  {connection.capabilities?.video && (
    <Badge appearance="filled" color="important">
      <Video16Regular /> 视频
    </Badge>
  )}
</div>
```

---

### 阶段 3：工具定义与注册（3-4 小时）

**目标**：定义三个生成工具并注册到 ToolRegistry

**文件清单**：
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/core/tools/generation-tools.ts` | 新建 | 定义生成工具 |
| `src/ui/hooks/useLLMStream.ts` | 修改 | 注册工具并移除关键词匹配 |

**具体实现**：

1. **新建 generation-tools.ts**：

```typescript
import type { ToolDefinition } from '@/types';
import type { ToolRegistry, ToolResult } from './registry';
import { CapabilityRouter } from '@core/capability-router';
import { createLLMProvider } from '@core/llm/factory';
import { createImageGenerationProvider } from '@core/image/provider';
import { useAppStore } from '@ui/store/appStore';

/**
 * 注册所有生成工具到注册表
 */
export function registerGenerationTools(registry: ToolRegistry): void {
  // 工具 1：文本生成
  registry.register(
    {
      name: 'generate_text',
      description: '生成文本内容，用于回答问题、改写、翻译、总结等文本处理任务',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: '生成提示词，描述需要生成的文本内容',
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const state = useAppStore.getState();
        const connections = state.connections;
        const generationProfile = state.generationProfile;

        // 使用 CapabilityRouter 选择文本连接
        const router = new CapabilityRouter(connections, generationProfile);
        const connection = router.getTextConnection();

        if (!connection) {
          return {
            success: false,
            error: '未配置文本生成能力，请在设置中添加支持文本生成的 AI 连接',
            errorCode: 'CAPABILITY_NOT_CONFIGURED',
          };
        }

        // 创建 Provider 并生成
        const provider = createLLMProvider({
          providerId: connection.providerId,
          apiKey: connection.apiKey,
          baseUrl: connection.baseUrl,
          model: connection.capabilities?.text?.model || connection.model,
        });

        const response = await provider.send({
          model: connection.capabilities?.text?.model || connection.model,
          messages: [{ role: 'user', content: args.prompt as string }],
          temperature: 0.7,
          maxTokens: 4096,
        });

        return {
          success: true,
          data: {
            type: 'text',
            content: response.content,
            metadata: {
              provider: connection.providerId,
              model: connection.capabilities?.text?.model || connection.model,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '文本生成失败',
          errorCode: 'GENERATION_FAILED',
        };
      }
    }
  );

  // 工具 2：图片生成
  registry.register(
    {
      name: 'generate_image',
      description: '生成图片，用于创建插图、配图、视觉内容等',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: '图片描述，详细描述需要生成的图片内容、风格、场景等',
          },
          size: {
            type: 'string',
            description: '图片尺寸',
            enum: ['512x512', '1024x1024', '1792x1024', '1024x1792'],
          },
          style: {
            type: 'string',
            description: '图片风格',
            enum: ['vivid', 'natural'],
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const state = useAppStore.getState();
        const connections = state.connections;
        const generationProfile = state.generationProfile;
        const imageGenConfig = state.imageGenConfig;

        // 使用 CapabilityRouter 选择图片连接
        const router = new CapabilityRouter(connections, generationProfile);
        const connection = router.getImageConnection();

        if (!connection) {
          return {
            success: false,
            error: '未配置图片生成能力，请在设置中添加支持图片生成的 AI 连接',
            errorCode: 'CAPABILITY_NOT_CONFIGURED',
          };
        }

        // 创建 ImageProvider 并生成
        const imageProvider = createImageGenerationProvider(imageGenConfig, connection);
        const result = await imageProvider.generate({
          prompt: args.prompt as string,
          size: (args.size as string) || '1024x1024',
          style: args.style as 'vivid' | 'natural',
        });

        return {
          success: true,
          data: {
            type: 'image',
            content: result.data,
            metadata: {
              provider: connection.providerId,
              model: connection.capabilities?.image?.model || connection.imageModel,
              width: result.width,
              height: result.height,
              format: result.format,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '图片生成失败',
          errorCode: 'GENERATION_FAILED',
        };
      }
    }
  );

  // 工具 3：视频生成（预留）
  registry.register(
    {
      name: 'generate_video',
      description: '生成视频内容，用于创建动画、演示、视频素材等（需要配置支持视频生成的 AI 连接）',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: '视频描述，详细描述需要生成的视频内容、场景、动作等',
          },
          duration: {
            type: 'number',
            description: '视频时长（秒）',
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      return {
        success: false,
        error: '视频生成功能即将推出，敬请期待',
        errorCode: 'NOT_IMPLEMENTED',
      };
    }
  );
}
```

2. **修改 useLLMStream.ts**：

**注册生成工具**（第 14-22 行附近）：
```typescript
import { registerGenerationTools } from '@core/tools/generation-tools';

// 初始化工具（只执行一次）
let toolsInitialized = false;
function initializeTools() {
  if (toolsInitialized) return;
  const registry = getToolRegistry();
  registerPPTTools(registry);
  registerGenerationTools(registry);  // 新增：注册生成工具
  toolsInitialized = true;
  console.log('[useLLMStream] Tools registered:', registry.list());
}
```

**移除关键词匹配逻辑**（删除第 48-61 行和第 170-200 行）：
```typescript
// 删除 isImageGenerationRequest 函数
// 删除 handleImageGeneration 函数
// 删除 sendMessage 中的图片生成检测逻辑（第 170-200 行）
```

**增强 System Prompt**（第 238-251 行）：
```typescript
// 构建系统提示
let systemPrompt: string;
if (isSlideRequest) {
  // 使用幻灯片生成专用系统提示
  systemPrompt = getSlideSpecSystemPrompt({
    slideText: context?.slideText,
    theme: context?.theme,
  });
} else {
  // 普通对话系统提示 + 工具说明
  systemPrompt = `你是一个专业的 Office 文档助手。

你可以使用以下工具来完成任务：
- generate_text: 生成文本内容（回答问题、改写、翻译、总结等）
- generate_image: 生成图片（插图、配图、视觉内容）
- generate_video: 生成视频（动画、演示）
- create_slide: 创建幻灯片
- generate_and_insert_image: 生成图片并插入到当前幻灯片
- 其他 PowerPoint 操作工具

根据用户需求自动选择合适的工具。例如：
- "帮我改写这段话" → 使用 generate_text
- "画一张日落的图" → 使用 generate_image
- "做一个产品演示视频" → 使用 generate_video
- "创建一个关于AI的幻灯片，配上图片" → 使用 create_slide（包含图片）

${context?.selectedText ? `\n用户当前选中的文本：\n"""${context.selectedText}"""` : ''}
${context?.slideText ? `\n当前幻灯片内容：\n"""${context.slideText}"""` : ''}

请根据用户意图选择最合适的工具，直接输出结果，不要添加额外的解释。`;
}
```

---

### 阶段 4：消息展示增强（2-3 小时）

**目标**：支持展示不同类型的生成结果

**文件清单**：
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/ui/components/chat/cards/MediaResultCard.tsx` | 新建 | 媒体结果展示组件 |
| `src/ui/components/chat/MessageBubble.tsx` | 修改 | 集成 MediaResultCard |

**具体实现**：

1. **新建 MediaResultCard.tsx**：

```typescript
import React from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowDownload20Regular, DocumentAdd20Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    maxWidth: '500px',
  },
  mediaContainer: {
    position: 'relative',
    borderRadius: tokens.borderRadiusSmall,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  image: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  metadata: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

interface MediaResultCardProps {
  type: 'image' | 'video';
  content: string; // base64 data
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    provider?: string;
    model?: string;
  };
  onInsert?: () => void;
}

export function MediaResultCard({ type, content, metadata, onInsert }: MediaResultCardProps) {
  const styles = useStyles();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:${type}/${metadata?.format || 'png'};base64,${content}`;
    link.download = `generated-${type}-${Date.now()}.${metadata?.format || 'png'}`;
    link.click();
  };

  return (
    <div className={styles.card}>
      <div className={styles.mediaContainer}>
        {type === 'image' ? (
          <img
            src={`data:image/${metadata?.format || 'png'};base64,${content}`}
            alt="Generated image"
            className={styles.image}
          />
        ) : (
          <video
            src={`data:video/${metadata?.format || 'mp4'};base64,${content}`}
            controls
            className={styles.video}
          />
        )}
      </div>

      {metadata && (
        <div className={styles.metadata}>
          {metadata.width && metadata.height && `${metadata.width}×${metadata.height}`}
          {metadata.provider && ` · ${metadata.provider}`}
          {metadata.model && ` · ${metadata.model}`}
        </div>
      )}

      <div className={styles.actions}>
        <Button
          appearance="secondary"
          icon={<ArrowDownload20Regular />}
          onClick={handleDownload}
        >
          下载
        </Button>
        {onInsert && (
          <Button
            appearance="primary"
            icon={<DocumentAdd20Regular />}
            onClick={onInsert}
          >
            插入到幻灯片
          </Button>
        )}
      </div>
    </div>
  );
}
```

2. **修改 MessageBubble.tsx**：

**导入 MediaResultCard**：
```typescript
import { MediaResultCard } from './cards/MediaResultCard';
```

**在消息内容渲染中添加媒体结果处理**：
```typescript
{/* 工具执行结果展示 */}
{message.metadata?.toolResult && (
  <>
    {/* 如果是图片生成结果 */}
    {message.metadata.toolResult.data?.type === 'image' && (
      <MediaResultCard
        type="image"
        content={message.metadata.toolResult.data.content}
        metadata={message.metadata.toolResult.data.metadata}
        onInsert={() => {
          // TODO: 实现插入到幻灯片的逻辑
          console.log('Insert image to slide');
        }}
      />
    )}

    {/* 如果是视频生成结果 */}
    {message.metadata.toolResult.data?.type === 'video' && (
      <MediaResultCard
        type="video"
        content={message.metadata.toolResult.data.content}
        metadata={message.metadata.toolResult.data.metadata}
      />
    )}

    {/* 如果是文本生成结果，使用原有的文本展示 */}
    {message.metadata.toolResult.data?.type === 'text' && (
      <div>{message.metadata.toolResult.data.content}</div>
    )}
  </>
)}
```

---

### 阶段 5：视频生成支持（预留，8-12 小时）

**目标**：实现 VideoGenerationProvider

**文件清单**：
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/core/video/provider.ts` | 新建 | 视频生成 Provider |
| `src/core/video/types.ts` | 新建 | 视频生成类型定义 |

**说明**：
- 此阶段为预留功能，当前视频生成工具返回"即将推出"提示
- 实施时需要：
  1. 选择视频生成 API（Sora、Runway、Stability AI Video 等）
  2. 实现 VideoGenerationProvider 接口
  3. 更新 generation-tools.ts 中的 generate_video 工具
  4. 测试视频生成与展示流程

---

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/index.ts` | 修改 | 新增 GenerationToolResult 类型 |
| `src/ui/components/settings/connections/AddConnectionDialog.tsx` | 修改 | 添加能力配置 UI |
| `src/ui/components/settings/SettingsView.tsx` | 修改 | 显示能力徽章 |
| `src/core/tools/generation-tools.ts` | 新建 | 定义生成工具 |
| `src/ui/hooks/useLLMStream.ts` | 修改 | 注册工具、移除关键词匹配、增强 System Prompt |
| `src/ui/components/chat/cards/MediaResultCard.tsx` | 新建 | 媒体结果展示组件 |
| `src/ui/components/chat/MessageBubble.tsx` | 修改 | 集成 MediaResultCard |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| LLM 选择错误工具 | System Prompt 明确示例 + 工具描述优化 |
| 配置不一致 | 保存时校验 capabilities + 运行时二次校验 |
| 工具调用循环 | 控制 maxToolCallDepth（已有） |
| 视频 Provider 缺失 | 工具返回友好错误提示 |
| 图片生成失败 | 显示清晰错误信息 + 重试选项 |

---

## 测试计划

### 单元测试
- CapabilityRouter 选择逻辑
- 工具参数校验
- 配置保存与加载

### 集成测试
- 完整的生成流程（文本/图片）
- 工具调用与结果展示
- 错误处理与降级

### 用户测试
- 配置界面易用性
- 生成结果展示效果
- 错误提示清晰度

---

## 实施顺序总结

1. ✅ **阶段 1**：类型定义（1 小时）
2. ✅ **阶段 2**：配置界面（2-3 小时）
3. ✅ **阶段 3**：工具定义（3-4 小时）
4. ✅ **阶段 4**：消息展示（2-3 小时）
5. ⏸️ **阶段 5**：视频支持（预留）

**预计总工作量**：8-11 小时（不含视频支持）

---

## 会话 ID（用于后续阶段）

- **Gemini 前端**：`98bf22e3-822a-490b-8e98-e396c39edb35`
- **Codex 后端**：`019bd164-9c5a-73c0-8430-43ce1a8adea7`

---

**计划制定完成，等待用户批准后进入执行阶段。**
