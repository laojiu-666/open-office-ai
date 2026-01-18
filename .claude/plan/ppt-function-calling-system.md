# PPT Function Calling 对话式生成系统 - 实施计划

> 基于 Codex（后端）和 Gemini（前端）交叉验证分析
> 生成时间：2026-01-18
> 计划版本：v2.0（直接使用原生 Function Calling）

---

## 📋 任务类型
- [x] 前端 (→ Gemini)
- [x] 后端 (→ Codex)
- [x] 全栈 (→ 并行)

---

## 🎯 技术方案概述

**一步到位：原生 Function Calling**

- 直接扩展 `ILLMProvider` 接口，支持 `tools` / `tool_calls`
- 优先适配 OpenAI Provider（支持 Function Calling）
- 后续补齐 Anthropic（Tool Use）和 Gemini（Function Calling）
- 引入参数校验（Zod）+ 错误自动降级
- **预计时间**：3-4 周

**核心优势**：
- 利用 LLM 原生能力，工具调用更精准
- 避免 XML 解析的脆弱性
- 支持流式工具调用（未来扩展）
- 符合 OpenAI / Anthropic 官方最佳实践

---

## 📐 实施步骤

### 第 1 步：扩展 LLM 类型定义
**负责模块**：后端（Codex）
**修改文件**：`src/types/index.ts`

扩展 LLM 接口以支持 Function Calling：

```typescript
// src/types/index.ts

// 工具定义（符合 OpenAI Function Calling 规范）
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

// 工具调用结果
export interface ToolCall {
  id: string;  // OpenAI 返回的 tool_call_id
  name: string;  // 工具名称
  arguments: Record<string, unknown>;  // 解析后的参数对象
}

// 扩展 LLMRequest
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];  // 新增：可用工具列表
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };  // 新增：工具选择策略
}

// 扩展 LLMResponse
export interface LLMResponse {
  id: string;
  content: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error';  // 扩展
  toolCalls?: ToolCall[];  // 新增：LLM 请求调用的工具列表
}

// 扩展 LLMMessage
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';  // 扩展：增加 tool 角色
  content: string;
  toolCalls?: ToolCall[];  // 用于 assistant 消息记录工具调用
  toolCallId?: string;  // 用于 tool 消息关联工具调用 ID
  name?: string;  // 用于 tool 消息标识工具名称
}
```

---

### 第 2 步：创建工具注册表
**负责模块**：后端（Codex）
**新建文件**：`src/core/tools/registry.ts`

实现工具注册与调度机制：

```typescript
import type { ToolDefinition } from '@/types';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolHandler {
  (args: Record<string, unknown>): Promise<ToolResult>;
}

export interface RegisteredTool extends ToolDefinition {
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  /**
   * 注册工具
   */
  register(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 执行工具
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`
      };
    }

    try {
      // 参数校验在 handler 内部进行
      return await tool.handler(args);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取所有工具的 Schema（用于传递给 LLM）
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(({ name, description, parameters }) => ({
      name,
      description,
      parameters
    }));
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取工具列表
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// 全局单例
let globalRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}
```

---

### 第 3 步：定义 PPT 工具集
**负责模块**：后端（Codex）
**新建文件**：`src/core/tools/ppt-tools.ts`

基于现有 PPT 核心功能，定义 6 个工具：

```typescript
import { ToolRegistry, type ToolResult } from './registry';
import { applySlideSpec, insertImageToCurrentSlide, setSlideBackground, replaceSelectionWithFormat, insertTextAtPosition } from '@adapters/powerpoint/slide-renderer';
import { getAIContext } from '@adapters/powerpoint/context';
import type { SlideSpec, TextStyle, Bounds } from '@/types';

/**
 * 注册所有 PPT 工具到注册表
 */
export function registerPPTTools(registry: ToolRegistry): void {

  // 工具 1: 创建幻灯片（高层操作）
  registry.register({
    name: 'ppt_create_slide',
    description: 'Create a new slide with specific layout and content blocks. Use this when user asks to create/generate/add a slide.',
    parameters: {
      type: 'object',
      properties: {
        layout: {
          type: 'string',
          enum: ['title-content', 'title-image', 'title-only', 'blank'],
          description: 'Layout template: title-content (title + bullet points), title-image (title + text + image), title-only (only title), blank (empty slide)'
        },
        title: {
          type: 'string',
          description: 'Slide title text'
        },
        content: {
          type: 'array',
          items: { type: 'string' },
          description: 'Content bullet points (for title-content layout)'
        },
        includeImage: {
          type: 'boolean',
          description: 'Whether to generate and include an image'
        },
        imagePrompt: {
          type: 'string',
          description: 'Prompt for AI image generation (required if includeImage is true)'
        }
      },
      required: ['layout', 'title']
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        // 构造 SlideSpec
        const spec: SlideSpec = {
          version: '1.0',
          layout: {
            template: args.layout as any,
            slots: []  // 将使用默认布局
          },
          blocks: [
            {
              kind: 'text',
              slotId: 'title',
              content: args.title as string
            }
          ],
          metadata: {
            requestId: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          }
        };

        // 添加内容块
        if (args.content && Array.isArray(args.content)) {
          spec.blocks.push({
            kind: 'text',
            slotId: 'body',
            content: (args.content as string[]).map(item => `• ${item}`).join('\n')
          });
        }

        // 添加图片块（如果需要）
        if (args.includeImage && args.imagePrompt) {
          const assetId = `img-${Date.now()}`;
          spec.blocks.push({
            kind: 'image',
            slotId: 'image',
            prompt: args.imagePrompt as string,
            assetId
          });
          spec.assets = [{
            id: assetId,
            prompt: args.imagePrompt as string,
            width: 512,
            height: 512,
            format: 'png',
            status: 'pending'
          }];
        }

        const result = await applySlideSpec(spec);

        return {
          success: result.success,
          data: {
            slideId: result.slideId,
            slideIndex: result.slideIndex,
            createdShapes: result.createdShapeIds?.length || 0
          },
          error: result.error
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create slide'
        };
      }
    }
  });

  // 工具 2: 插入图片
  registry.register({
    name: 'ppt_insert_image',
    description: 'Insert an image into the current slide at specified position. Use when user wants to add/insert an image.',
    parameters: {
      type: 'object',
      properties: {
        imageData: {
          type: 'string',
          description: 'Base64-encoded image data (with or without data URL prefix)'
        },
        x: {
          type: 'number',
          description: 'X coordinate in points (0-960, default: 50)'
        },
        y: {
          type: 'number',
          description: 'Y coordinate in points (0-540, default: 50)'
        },
        width: {
          type: 'number',
          description: 'Image width in points (default: 400)'
        },
        height: {
          type: 'number',
          description: 'Image height in points (default: 300)'
        }
      },
      required: ['imageData']
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const bounds: Partial<Bounds> = {
          x: (args.x as number) || 50,
          y: (args.y as number) || 50,
          width: (args.width as number) || 400,
          height: (args.height as number) || 300
        };

        const result = await insertImageToCurrentSlide(args.imageData as string, bounds);

        return {
          success: result.success,
          data: { shapeId: result.shapeId },
          error: result.error
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to insert image'
        };
      }
    }
  });

  // 工具 3: 设置背景
  registry.register({
    name: 'ppt_set_background',
    description: 'Set the background image for the current slide. Use when user wants to change/set slide background.',
    parameters: {
      type: 'object',
      properties: {
        imageData: {
          type: 'string',
          description: 'Base64-encoded background image data'
        },
        transparency: {
          type: 'number',
          description: 'Background transparency (0-1, where 0 is opaque and 1 is fully transparent)'
        }
      },
      required: ['imageData']
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const result = await setSlideBackground(
          args.imageData as string,
          { transparency: args.transparency as number }
        );

        return {
          success: result.success,
          data: { method: result.method },
          error: result.error
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set background'
        };
      }
    }
  });

  // 工具 4: 替换选中文本
  registry.register({
    name: 'ppt_replace_selection',
    description: 'Replace the currently selected text with new text and optional formatting. Use when user wants to edit/modify selected text.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'New text content'
        },
        fontFamily: {
          type: 'string',
          description: 'Font family (e.g., "Arial", "Times New Roman")'
        },
        fontSize: {
          type: 'number',
          description: 'Font size in points'
        },
        color: {
          type: 'string',
          description: 'Text color in hex format (e.g., "#FF0000")'
        },
        bold: {
          type: 'boolean',
          description: 'Whether text should be bold'
        },
        italic: {
          type: 'boolean',
          description: 'Whether text should be italic'
        }
      },
      required: ['text']
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const style: TextStyle = {
          fontFamily: args.fontFamily as string,
          fontSize: args.fontSize as number,
          color: args.color as any,
          bold: args.bold as boolean,
          italic: args.italic as boolean
        };

        const result = await replaceSelectionWithFormat(args.text as string, style);

        return {
          success: result.success,
          error: result.error
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to replace selection'
        };
      }
    }
  });

  // 工具 5: 插入文本框
  registry.register({
    name: 'ppt_insert_text',
    description: 'Insert a text box at specified position on the current slide. Use when user wants to add text at a specific location.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text content'
        },
        x: {
          type: 'number',
          description: 'X coordinate in points (0-960)'
        },
        y: {
          type: 'number',
          description: 'Y coordinate in points (0-540)'
        },
        width: {
          type: 'number',
          description: 'Text box width in points'
        },
        height: {
          type: 'number',
          description: 'Text box height in points'
        },
        fontFamily: {
          type: 'string',
          description: 'Font family'
        },
        fontSize: {
          type: 'number',
          description: 'Font size in points'
        },
        color: {
          type: 'string',
          description: 'Text color in hex format'
        },
        bold: {
          type: 'boolean',
          description: 'Whether text should be bold'
        }
      },
      required: ['text', 'x', 'y', 'width', 'height']
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const bounds: Bounds = {
          x: args.x as number,
          y: args.y as number,
          width: args.width as number,
          height: args.height as number
        };

        const style: TextStyle = {
          fontFamily: args.fontFamily as string,
          fontSize: args.fontSize as number,
          color: args.color as any,
          bold: args.bold as boolean
        };

        const result = await insertTextAtPosition(args.text as string, bounds, style);

        return {
          success: result.success,
          data: { shapeId: result.shapeId },
          error: result.error
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to insert text'
        };
      }
    }
  });

  // 工具 6: 获取演示文稿上下文
  registry.register({
    name: 'ppt_get_context',
    description: 'Get current presentation context including slide count, current slide info, and theme. Use when you need information about the presentation before making changes.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async (): Promise<ToolResult> => {
      try {
        const context = await getAIContext();

        return {
          success: true,
          data: context
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get context'
        };
      }
    }
  });
}
```

---

### 第 4 步：升级 OpenAI Provider
**负责模块**：后端（Codex）
**修改文件**：`src/core/llm/openai.ts`

添加 Function Calling 支持：

```typescript
import type { ILLMProvider, LLMRequest, LLMResponse, LLMStreamHandlers, LLMStreamController, LLMModelInfo, ToolCall } from '@/types';

export class OpenAIProvider implements ILLMProvider {
  // ... 现有代码 ...

  async send(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const body: any = {
      model: request.model,
      messages: this.convertMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: false,
    };

    // 如果提供了 tools，添加到请求
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      if (request.toolChoice) {
        body.tool_choice = request.toolChoice;
      }
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // 解析 tool_calls
    const toolCalls: ToolCall[] = data.choices[0]?.message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    })) || [];

    return {
      id: data.id,
      content: data.choices[0]?.message?.content || '',
      finishReason: data.choices[0]?.finish_reason === 'tool_calls' ? 'tool_calls' :
                    data.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }

  /**
   * 转换消息格式以支持 tool 角色
   */
  private convertMessages(messages: LLMRequest['messages']): any[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        // OpenAI 的 tool 消息格式
        return {
          role: 'tool',
          tool_call_id: msg.toolCallId,
          content: msg.content
        };
      } else if (msg.role === 'assistant' && msg.toolCalls) {
        // assistant 消息包含 tool_calls
        return {
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        };
      } else {
        // 普通消息
        return {
          role: msg.role,
          content: msg.content
        };
      }
    });
  }

  // TODO: stream() 方法也需要类似的升级（流式工具调用）
}
```

---

### 第 5 步：参数校验层（Zod）
**负责模块**：后端（Codex）
**新建文件**：`src/core/tools/validator.ts`

使用 Zod 进行运行时参数校验：

```typescript
import { z } from 'zod';

// PPT 工具的 Zod Schema
export const CreateSlideSchema = z.object({
  layout: z.enum(['title-content', 'title-image', 'title-only', 'blank']),
  title: z.string().min(1, 'Title is required'),
  content: z.array(z.string()).optional(),
  includeImage: z.boolean().optional(),
  imagePrompt: z.string().optional()
}).refine(
  (data) => !data.includeImage || (data.includeImage && data.imagePrompt),
  { message: 'imagePrompt is required when includeImage is true' }
);

export const InsertImageSchema = z.object({
  imageData: z.string().min(1, 'imageData is required'),
  x: z.number().min(0).max(960).optional(),
  y: z.number().min(0).max(540).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional()
});

export const SetBackgroundSchema = z.object({
  imageData: z.string().min(1, 'imageData is required'),
  transparency: z.number().min(0).max(1).optional()
});

export const ReplaceSelectionSchema = z.object({
  text: z.string().min(1, 'text is required'),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional()
});

export const InsertTextSchema = z.object({
  text: z.string().min(1, 'text is required'),
  x: z.number().min(0).max(960),
  y: z.number().min(0).max(540),
  width: z.number().positive(),
  height: z.number().positive(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bold: z.boolean().optional()
});

/**
 * 验证工具参数
 */
export function validateToolArguments(
  toolName: string,
  args: unknown
): { valid: boolean; error?: string; data?: unknown } {
  try {
    let schema: z.ZodSchema;

    switch (toolName) {
      case 'ppt_create_slide':
        schema = CreateSlideSchema;
        break;
      case 'ppt_insert_image':
        schema = InsertImageSchema;
        break;
      case 'ppt_set_background':
        schema = SetBackgroundSchema;
        break;
      case 'ppt_replace_selection':
        schema = ReplaceSelectionSchema;
        break;
      case 'ppt_insert_text':
        schema = InsertTextSchema;
        break;
      case 'ppt_get_context':
        return { valid: true, data: {} };  // 无参数
      default:
        return { valid: false, error: `Unknown tool: ${toolName}` };
    }

    const data = schema.parse(args);
    return { valid: true, data };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errorMessages = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      return { valid: false, error: errorMessages };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
```

**修改 `registry.ts` 集成校验**：

```typescript
// 在 execute 方法中添加校验
import { validateToolArguments } from './validator';

async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tool = this.tools.get(name);
  if (!tool) {
    return { success: false, error: `Tool '${name}' not found` };
  }

  // 参数校验
  const validation = validateToolArguments(name, args);
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid arguments: ${validation.error}`
    };
  }

  try {
    return await tool.handler(validation.data as Record<string, unknown>);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

---

### 第 6 步：前端集成 - 多轮对话流程
**负责模块**：前端（Gemini）
**修改文件**：`src/ui/hooks/useLLMStream.ts`

实现 Function Calling 多轮对话：

```typescript
import { useCallback, useRef } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { createLLMProvider } from '@core/llm/factory';
import { getToolRegistry } from '@core/tools/registry';
import { registerPPTTools } from '@core/tools/ppt-tools';
import type { ChatMessage } from '@/types';

// 初始化工具注册表（只执行一次）
const toolRegistry = getToolRegistry();
registerPPTTools(toolRegistry);

export function useLLMStream() {
  const { messages, addMessage, providers, activeProviderId, getActiveConnection } = useAppStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessageWithTools = useCallback(
    async (userContent: string) => {
      // 获取配置
      const activeConnection = getActiveConnection();
      const config = activeConnection
        ? {
            providerId: activeConnection.providerId,
            apiKey: activeConnection.apiKey,
            baseUrl: activeConnection.baseUrl,
            model: activeConnection.model,
          }
        : providers[activeProviderId];

      if (!config.apiKey) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '请先在设置中配置 API Key',
          timestamp: Date.now(),
          status: 'error',
        };
        addMessage(errorMessage);
        return;
      }

      // 创建 Provider
      const provider = createLLMProvider(config);

      // 用户消息
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userContent,
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      // 准备消息历史
      const conversationMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.metadata?.toolCalls,
        toolCallId: msg.metadata?.toolCallId,
        name: msg.metadata?.toolName
      }));

      // 获取工具定义
      const tools = toolRegistry.getToolDefinitions();

      try {
        abortControllerRef.current = new AbortController();

        // 第 1 次 LLM 调用：可能返回 tool_calls
        const response1 = await provider.send(
          {
            model: config.model,
            messages: conversationMessages,
            temperature: 0.7,
            maxTokens: 4096,
            tools,
            toolChoice: 'auto'
          },
          abortControllerRef.current.signal
        );

        // 情况 1：LLM 请求调用工具
        if (response1.toolCalls && response1.toolCalls.length > 0) {
          // 记录 assistant 的工具调用请求
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response1.content || '正在调用工具...',
            timestamp: Date.now(),
            metadata: { toolCalls: response1.toolCalls }
          };
          addMessage(assistantMessage);

          // 执行所有工具调用
          const toolResults = await Promise.all(
            response1.toolCalls.map(async (call) => {
              console.log(`[Function Calling] Executing ${call.name}:`, call.arguments);

              const result = await toolRegistry.execute(call.name, call.arguments);

              // 显示工具执行结果
              const toolMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'tool' as any,
                content: result.success
                  ? `✅ ${call.name} 执行成功`
                  : `❌ ${call.name} 执行失败: ${result.error}`,
                timestamp: Date.now(),
                status: result.success ? 'success' : 'error',
                metadata: {
                  toolCallId: call.id,
                  toolName: call.name,
                  toolResult: result
                }
              };
              addMessage(toolMessage);

              return {
                role: 'tool',
                toolCallId: call.id,
                name: call.name,
                content: JSON.stringify(result)
              };
            })
          );

          // 第 2 次 LLM 调用：将工具结果回传
          const response2 = await provider.send(
            {
              model: config.model,
              messages: [
                ...conversationMessages,
                {
                  role: 'assistant',
                  content: response1.content || '',
                  toolCalls: response1.toolCalls
                },
                ...toolResults
              ],
              temperature: 0.7,
              maxTokens: 4096
            },
            abortControllerRef.current.signal
          );

          // 显示 LLM 的最终总结
          const finalMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response2.content,
            timestamp: Date.now(),
          };
          addMessage(finalMessage);
        }
        // 情况 2：普通文本响应（不需要工具）
        else {
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response1.content,
            timestamp: Date.now(),
          };
          addMessage(assistantMessage);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return; // 用户主动取消
        }

        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `错误：${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now(),
          status: 'error',
        };
        addMessage(errorMessage);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [messages, addMessage, providers, activeProviderId, getActiveConnection]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    sendMessage: sendMessageWithTools,
    abort
  };
}
```

---

### 第 7 步：UI 组件 - 工具执行卡片
**负责模块**：前端（Gemini）
**新建文件**：`src/ui/components/chat/ToolExecutionCard.tsx`

```tsx
import React from 'react';
import { Card, CardHeader, Text, Spinner, tokens } from '@fluentui/react-components';
import { CheckmarkCircle20Regular, ErrorCircle20Regular } from '@fluentui/react-icons';
import { makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    marginBottom: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalS,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1,
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
});

interface ToolExecutionCardProps {
  toolName: string;
  status: 'pending' | 'success' | 'error';
  result?: string;
  error?: string;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolName,
  status,
  result,
  error
}) => {
  const styles = useStyles();

  return (
    <Card className={styles.card} size="small">
      <CardHeader
        className={styles.header}
        image={
          status === 'pending' ? (
            <Spinner size="tiny" />
          ) : status === 'success' ? (
            <CheckmarkCircle20Regular className={styles.successIcon} />
          ) : (
            <ErrorCircle20Regular className={styles.errorIcon} />
          )
        }
        header={<Text weight="semibold">{toolName}</Text>}
      />
      {status === 'success' && result && <Text>{result}</Text>}
      {status === 'error' && error && <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</Text>}
    </Card>
  );
};
```

**修改文件**：`src/ui/components/chat/MessageBubble.tsx`

```tsx
// 在 MessageBubble 组件中检测工具调用并渲染卡片
import { ToolExecutionCard } from './ToolExecutionCard';

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const styles = useStyles();

  // 渲染工具调用
  if (message.role === 'tool' && message.metadata?.toolName) {
    return (
      <div className={styles.toolMessage}>
        <ToolExecutionCard
          toolName={message.metadata.toolName}
          status={message.status === 'error' ? 'error' : 'success'}
          result={message.status === 'success' ? message.content : undefined}
          error={message.status === 'error' ? message.content : undefined}
        />
      </div>
    );
  }

  // ... 原有的普通消息渲染逻辑
};
```

---

### 第 8 步：错误处理与降级
**负责模块**：后端（Codex）
**修改文件**：`src/core/tools/ppt-tools.ts`

在工具 handler 中添加错误自动降级：

```typescript
// 示例：ppt_create_slide 失败时降级到细粒度操作
registry.register({
  name: 'ppt_create_slide',
  // ... 其他配置 ...
  handler: async (args): Promise<ToolResult> => {
    try {
      const spec: SlideSpec = { /* ... */ };
      const result = await applySlideSpec(spec);

      if (!result.success) {
        // 尝试降级：分解为细粒度操作
        console.log('[Fallback] applySlideSpec failed, trying granular approach');

        // TODO: 实现降级逻辑
        // 1. 使用 insertTextAtPosition 插入标题
        // 2. 使用 insertTextAtPosition 插入内容
        // 3. 如果有图片，使用 insertImageToCurrentSlide

        return {
          success: false,
          error: `Primary method failed: ${result.error}. Fallback not yet implemented.`
        };
      }

      return { success: true, data: { slideId: result.slideId } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
```

---

### 第 9 步：初始化与集成
**负责模块**：全栈（Claude）
**修改文件**：`src/taskpane/index.tsx`

在应用启动时初始化工具注册表：

```typescript
import { getToolRegistry } from '@core/tools/registry';
import { registerPPTTools } from '@core/tools/ppt-tools';

// 在 Office.onReady() 之后初始化工具
Office.onReady(() => {
  console.log('Office Add-in initialized');

  // 初始化 PPT 工具
  const toolRegistry = getToolRegistry();
  registerPPTTools(toolRegistry);
  console.log(`Registered ${toolRegistry.list().length} PPT tools:`, toolRegistry.list());

  // 渲染 React 应用
  render(<App />, document.getElementById('container'));
});
```

---

## 📂 关键文件清单

| 文件路径 | 操作 | 说明 |
|---------|------|------|
| `src/types/index.ts` | 修改 | 扩展 `LLMRequest` / `LLMResponse` / `LLMMessage`，新增 `ToolDefinition` / `ToolCall` |
| `src/core/tools/registry.ts` | 新建 | 工具注册表与调度器 |
| `src/core/tools/ppt-tools.ts` | 新建 | PPT 工具定义（6 个工具） |
| `src/core/tools/validator.ts` | 新建 | Zod 参数校验 |
| `src/core/llm/openai.ts` | 修改 | 支持 `tools` 参数和 `tool_calls` 响应（send 方法） |
| `src/core/llm/anthropic.ts` | 修改（后续） | 适配 Anthropic 的 Tool Use 格式 |
| `src/core/llm/gemini.ts` | 修改（后续） | 适配 Gemini 的 Function Calling 格式 |
| `src/ui/hooks/useLLMStream.ts` | 修改 | 集成多轮对话工具调用流程 |
| `src/ui/components/chat/ToolExecutionCard.tsx` | 新建 | 工具执行状态 UI 组件 |
| `src/ui/components/chat/MessageBubble.tsx` | 修改 | 渲染工具调用卡片 |
| `src/taskpane/index.tsx` | 修改 | 应用启动时初始化工具注册表 |
| `package.json` | 修改 | 添加 `zod` 依赖 |

---

## ⚠️ 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| **LLM 返回无效工具调用** | Zod 参数校验 + 友好错误提示 + 让 LLM 重试 |
| **工具执行失败** | 错误自动降级（高层 → 细粒度）+ 详细错误日志 |
| **Office API 版本不兼容** | 功能前置检查（`Office.context.requirements.isSetSupported`）+ 降级方案 |
| **多轮调用成本高** | 优化 System Prompt，减少不必要的工具调用 + 缓存上下文 |
| **工具描述过长超过 Token 限制** | 动态工具加载（只注入当前上下文相关的工具） |
| **Anthropic/Gemini 不支持 Function Calling** | 暂时仅支持 OpenAI，后续添加 Provider 特定适配 |

---

## 🧪 测试策略

### 单元测试
- 工具注册表的 `execute()` / `getToolDefinitions()` 方法
- Zod 参数校验器（各种边界情况、缺失参数、类型错误）
- OpenAI Provider 的消息转换逻辑（`convertMessages`）

### 集成测试
- 模拟 LLM 返回 `tool_calls`，验证端到端执行
- 模拟工具执行失败，验证错误处理和降级
- 测试多轮对话流程（工具调用 → 结果回传 → LLM 总结）

### E2E 测试
- **场景 1**：用户输入 "创建一页产品介绍 PPT"，验证幻灯片成功创建
- **场景 2**：用户输入 "插入一张猫的图片"，验证图片插入（需图片生成 API）
- **场景 3**：用户输入 "把背景换成星空"，验证背景设置
- **场景 4**：参数缺失测试，如 "创建幻灯片"（缺少 title），验证 LLM 能识别并补充

---

## 🔗 SESSION_ID（供 /ccg:execute 使用）

- **CODEX_SESSION**: `019bcfca-98f4-74b2-b47c-c41567e6eb5f`
- **GEMINI_SESSION**: `0236d894-a0b8-41a4-9b00-5cc427e37e82`

---

## 📝 实施建议

1. **优先级排序**：
   - Week 1: 类型定义 + 工具注册表 + PPT 工具定义
   - Week 2: OpenAI Provider 升级 + 参数校验
   - Week 3: 前端集成（多轮对话流程 + UI 组件）
   - Week 4: 测试 + 错误处理完善 + Anthropic/Gemini 适配（可选）

2. **增量交付**：每完成一个步骤，立即编写单元测试并集成测试

3. **文档同步**：在 `src/core/tools/README.md` 维护工具列表和使用示例

4. **调试工具**：在 Developer 测试页面增加 "Function Calling 日志" 面板，显示工具调用详情

5. **依赖安装**：
   ```bash
   npm install zod
   ```

---

## ✅ 验收标准

- [ ] 用户输入 "创建一页关于产品介绍的 PPT，包含标题和 3 个要点"，系统自动调用 `ppt_create_slide` 并成功生成幻灯片
- [ ] UI 显示工具执行状态（✅ 成功 / ❌ 失败）
- [ ] 工具执行失败时，错误信息清晰，LLM 能够理解并重试或提示用户
- [ ] 所有工具调用都经过 Zod 参数校验，无效参数被拒绝并返回友好错误
- [ ] 支持多轮对话（工具结果回传 → LLM 总结响应）
- [ ] OpenAI Provider 支持 Function Calling（测试通过 gpt-4o）
- [ ] 单元测试覆盖率 > 80%
- [ ] 至少 3 个 E2E 测试场景通过

---

## 📌 后续扩展（可选）

1. **流式工具调用**：升级 `stream()` 方法支持流式返回 tool_calls
2. **Anthropic Tool Use**：适配 Anthropic 的 Tool Use 格式
3. **Gemini Function Calling**：适配 Gemini 的 Function Calling 格式
4. **工具组合**：支持一次调用多个工具的复杂场景
5. **工具权限管理**：敏感操作（如删除）需要用户确认
6. **工具调用历史**：记录所有工具调用，方便调试和审计
