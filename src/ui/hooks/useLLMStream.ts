import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { createLLMProvider } from '@core/llm/factory';
import { createImageGenerationProvider } from '@core/image/provider';
import {
  isSlideGenerationRequest,
  extractSlideSpec,
  getSlideSpecSystemPrompt,
} from '@core/llm/response-parser';
import type { LLMStreamController, ChatMessage, SlideSpec } from '@/types';
import { getToolRegistry } from '@core/tools/registry';
import { registerPPTTools } from '@core/tools/ppt-tools';
import { registerGenerationTools } from '@core/tools/generation-tools';

// 初始化工具注册表（只执行一次）
let toolsInitialized = false;
function initializeTools() {
  if (toolsInitialized) return;
  const registry = getToolRegistry();
  registerPPTTools(registry);
  registerGenerationTools(registry);
  toolsInitialized = true;
  console.log('[useLLMStream] Tools registered:', registry.list());
}

// 模型上下文窗口配置（tokens）
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16385,
  // Anthropic
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
};

// 默认上下文限制
const DEFAULT_CONTEXT_LIMIT = 16000;
// 上下文使用比例（预留空间给输出）
const CONTEXT_USAGE_RATIO = 0.7;
// 系统提示预留 tokens
const SYSTEM_PROMPT_RESERVE = 500;
// 文档上下文预留 tokens
const DOC_CONTEXT_RESERVE = 1500;

/**
 * 估算文本的 token 数量
 * 使用简单的字符数估算：中文约 1.5 字符/token，英文约 4 字符/token
 * 这里使用保守估算：平均 2 字符/token
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  // 简单估算：中英文混合场景，平均 2 字符约等于 1 token
  return Math.ceil(text.length / 2);
}

/**
 * 获取模型的上下文限制
 */
function getModelContextLimit(model: string): number {
  return MODEL_CONTEXT_LIMITS[model] || DEFAULT_CONTEXT_LIMIT;
}

/**
 * 简化工具结果，移除大型数据（如 base64 图片）
 * 用于发送给 LLM 的历史消息，避免 token 超限
 */
function simplifyToolResult(result: any): any {
  if (!result || !result.success || !result.data) {
    return result;
  }

  const data = result.data;

  // 如果是图片生成结果
  if (data.type === 'image' && data.content) {
    return {
      success: true,
      data: {
        type: 'image',
        content: '[图片数据已省略]',
        metadata: data.metadata,
      },
    };
  }

  // 如果是视频生成结果
  if (data.type === 'video' && data.content) {
    return {
      success: true,
      data: {
        type: 'video',
        content: '[视频数据已省略]',
        metadata: data.metadata,
      },
    };
  }

  // 其他类型直接返回
  return result;
}

/**
 * 构建带预算限制的历史消息
 * 从最新消息向前遍历，直到超出预算
 *
 * 注意：为了保证工具调用的完整性，如果包含了一个带 toolCalls 的 assistant 消息，
 * 必须同时包含后续所有对应的 tool 消息
 */
function buildHistoryMessagesWithBudget(
  messages: ChatMessage[],
  tokenBudget: number
): Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCalls?: any; toolCallId?: string }> {
  // 过滤出已完成且有内容的消息
  const completedMessages = messages.filter(
    (m) => m.status === 'completed' && m.content
  );

  const result: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCalls?: any; toolCallId?: string }> = [];
  let usedTokens = 0;

  // 从最新消息向前遍历
  for (let i = completedMessages.length - 1; i >= 0; i--) {
    const msg = completedMessages[i];
    const msgTokens = estimateTokens(msg.content);

    // 检查是否超出预算
    if (usedTokens + msgTokens > tokenBudget) {
      break;
    }

    // 构建消息对象
    const messageObj: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCalls?: any; toolCallId?: string } = {
      role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
      content: msg.content,
    };

    // 如果是 assistant 消息且有 toolCalls，添加 toolCalls
    if (msg.role === 'assistant' && msg.metadata?.toolCalls) {
      messageObj.toolCalls = msg.metadata.toolCalls;
    }

    // 如果是 tool 消息，添加 toolCallId
    if (msg.role === 'tool' && msg.metadata?.toolCallId) {
      messageObj.toolCallId = msg.metadata.toolCallId;
    }

    // 添加到结果（插入到开头以保持顺序）
    result.unshift(messageObj);
    usedTokens += msgTokens;
  }

  // 验证消息完整性：如果有 assistant 消息带 toolCalls，确保后续有对应的 tool 消息
  // 如果不完整，移除这些不完整的消息
  const validatedResult: typeof result = [];
  let expectingToolMessages = false;
  let expectedToolCallIds: Set<string> = new Set();

  for (const msg of result) {
    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      // 开始期待 tool 消息
      expectingToolMessages = true;
      expectedToolCallIds = new Set(msg.toolCalls.map((tc: any) => tc.id));
      validatedResult.push(msg);
    } else if (msg.role === 'tool' && expectingToolMessages) {
      // 检查这个 tool 消息是否匹配预期的 toolCallId
      if (msg.toolCallId && expectedToolCallIds.has(msg.toolCallId)) {
        expectedToolCallIds.delete(msg.toolCallId);
        validatedResult.push(msg);

        // 如果所有预期的 tool 消息都收到了，结束期待
        if (expectedToolCallIds.size === 0) {
          expectingToolMessages = false;
        }
      }
    } else if (expectingToolMessages) {
      // 如果还在期待 tool 消息，但遇到了其他类型的消息，说明消息不完整
      // 移除之前添加的 assistant 消息和部分 tool 消息
      let lastAssistantIndex = -1;
      for (let i = validatedResult.length - 1; i >= 0; i--) {
        if (validatedResult[i].role === 'assistant' && validatedResult[i].toolCalls) {
          lastAssistantIndex = i;
          break;
        }
      }
      if (lastAssistantIndex !== -1) {
        validatedResult.splice(lastAssistantIndex);
      }
      expectingToolMessages = false;
      expectedToolCallIds.clear();

      // 添加当前消息
      validatedResult.push(msg);
    } else {
      // 正常消息
      validatedResult.push(msg);
    }
  }

  // 如果最后还在期待 tool 消息，说明消息不完整，移除最后的 assistant 消息
  if (expectingToolMessages) {
    let lastAssistantIndex = -1;
    for (let i = validatedResult.length - 1; i >= 0; i--) {
      if (validatedResult[i].role === 'assistant' && validatedResult[i].toolCalls) {
        lastAssistantIndex = i;
        break;
      }
    }
    if (lastAssistantIndex !== -1) {
      validatedResult.splice(lastAssistantIndex);
    }
  }

  return validatedResult;
}

export function useLLMStream() {
  const { getActiveConnection, activeProviderId, providers, messages: historyMessages, addMessage, updateMessage, setStreaming, imageGenConfig, maxToolCallDepth, addToolLog } = useAppStore();
  const controllerRef = useRef<LLMStreamController | null>(null);

  // 初始化工具
  useEffect(() => {
    initializeTools();
  }, []);

  // 组件卸载时清理流式请求
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (
      userContent: string,
      context?: {
        selectedText?: string;
        slideText?: string;
        theme?: { fonts?: { heading?: string; body?: string }; colors?: Record<string, string> };
        structuredPPT?: {
          outline: {
            totalSlides: number;
            slides: Array<{
              index: number;
              title: string;
              hasImages: boolean;
              textLength: number;
            }>;
          };
          currentSlide: {
            index: number;
            title: string;
            fullText: string;
            shapes: Array<{
              id: string;
              type: 'text' | 'image' | 'shape' | 'group' | 'unknown';
              bounds: any;
              text?: string;
              imageDescription?: string;
            }>;
          } | null;
          theme: any;
        };
      }
    ) => {
      // 优先使用新版连接系统
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
        // 显示友好提示而不是抛出错误
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

      // 取消之前的流式请求
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }

      const provider = createLLMProvider(config);

      // 检测是否为幻灯片生成请求
      const isSlideRequest = isSlideGenerationRequest(userContent);
      console.log('[useLLMStream] isSlideRequest:', isSlideRequest, 'userContent:', userContent);
      console.log('[useLLMStream] context:', context);

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userContent,
        timestamp: Date.now(),
        status: 'completed',
        context: context?.selectedText,
      };
      addMessage(userMessage);

      // Add assistant message placeholder
      let assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'streaming',
      };
      addMessage(assistantMessage);
      setStreaming(true);

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
        // 构建结构化的 PPT 上下文描述
        let pptContextDescription = '';

        if (context?.structuredPPT) {
          const { outline, currentSlide, theme } = context.structuredPPT;

          // PPT 大纲
          if (outline && outline.totalSlides > 0) {
            pptContextDescription += `\n## 演示文稿大纲\n总共 ${outline.totalSlides} 页幻灯片：\n`;
            outline.slides.forEach((slide) => {
              const imageIndicator = slide.hasImages ? ' 📷' : '';
              pptContextDescription += `- 第 ${slide.index + 1} 页: ${slide.title}${imageIndicator}\n`;
            });
          }

          // 当前幻灯片详情（结构化）
          if (currentSlide) {
            pptContextDescription += `\n## 当前幻灯片（第 ${currentSlide.index + 1} 页）\n`;
            pptContextDescription += `标题: ${currentSlide.title}\n\n`;

            // 展开所有可编辑元素（关键修复：让 LLM 看到每个文本框的索引）
            const textShapes = currentSlide.shapes.filter(s => s.type === 'text');
            if (textShapes.length > 0) {
              pptContextDescription += `### 可编辑文本元素（按从上到下顺序）：\n`;
              textShapes.forEach((shape, idx) => {
                const text = shape.text || '';
                const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
                pptContextDescription += `- [索引 ${idx}] ${preview}\n`;
              });
              pptContextDescription += `\n**重要说明**：\n`;
              pptContextDescription += `- 使用 ppt_update_slide_element 时，elementType='text' 配合 textIndex 参数来指定要修改的元素\n`;
              pptContextDescription += `- 如果用户要修改多个元素（如标题、分享人、日期），你必须多次调用此工具，每个元素一次\n`;
              pptContextDescription += `- 修改带标签的字段（如"分享人：张三"）时，必须输出完整字符串（如"分享人：李四"），否则标签会丢失\n\n`;
            }

            // 图片描述
            const images = currentSlide.shapes.filter(s => s.type === 'image');
            if (images.length > 0) {
              pptContextDescription += `### 图片信息：\n`;
              images.forEach((img, idx) => {
                pptContextDescription += `  ${idx + 1}. ${img.imageDescription || '图片'}\n`;
              });
            }
          }

          // 主题信息
          if (theme) {
            pptContextDescription += `\n## 主题\n`;
            pptContextDescription += `字体: 标题 ${theme.fonts?.heading || 'Calibri Light'}, 正文 ${theme.fonts?.body || 'Calibri'}\n`;
          }
        }

        systemPrompt = `你是一个专业的 Office 文档助手。

你可以使用以下工具来完成任务：

**文本和内容生成：**
- generate_text: 生成文本内容（回答问题、改写、翻译、总结等）
- generate_image: 生成图片（插图、配图、视觉内容）
- generate_video: 生成视频（动画、演示）

**幻灯片操作（重要 - 请仔细区分使用场景）：**

1. **创建新幻灯片** - 使用 ppt_create_slide
   - 用户说："创建一页新的"、"生成一张幻灯片"、"新建一页"
   - 这会在演示文稿中添加一张新幻灯片

2. **完全重做当前页面** - 使用 ppt_replace_slide_content
   - 用户说："重新设计这一页"、"美化当前页面"、"重做这一页"、"重新生成当前页"
   - ⚠️ 警告：这会清空当前页面的所有内容，然后重新生成
   - 只有在用户明确要求"重做整个页面"时才使用此工具

3. **部分修改当前页面** - 使用 ppt_update_slide_element
   - 用户说："把标题改成..."、"修改正文为..."、"更新标题"
   - 这只会修改指定的元素（标题/正文），保留其他内容
   - 这是最安全的选择，不会意外删除用户内容

4. **增量添加内容** - 使用 ppt_insert_image 或 ppt_generate_and_insert_image
   - 用户说："添加一张图片"、"插入一个图表"
   - 这会在现有内容基础上添加新元素，不影响现有内容

**决策原则（非常重要）：**
- 如果不确定用户意图，优先使用 ppt_update_slide_element（部分修改），避免使用 ppt_replace_slide_content
- 只有在用户明确说"重做"、"重新设计"、"美化整个页面"时，才使用 ppt_replace_slide_content
- 如果用户只是想修改某个元素，使用 ppt_update_slide_element
- 如果用户想添加新内容，使用插入工具

**工具调用完成后的行为：**
- 完成所有必要的工具调用后，你必须输出一条简短的确认消息告诉用户任务已完成
- 不要重复调用相同的工具
- 不要在没有新任务的情况下继续调用工具

**示例：**
- "帮我改写这段话" → generate_text
- "画一张日落的图" → generate_image
- "创建一个关于AI的幻灯片" → ppt_create_slide
- "重新设计当前页面，让它更专业" → ppt_replace_slide_content
- "把标题改成'产品介绍'" → ppt_update_slide_element (elementType: 'title')
- "在当前页添加一张图片" → ppt_generate_and_insert_image

${context?.selectedText ? `\n用户当前选中的文本：\n"""${context.selectedText}"""` : ''}
${pptContextDescription}

请根据用户意图选择最合适的工具完成任务，完成后输出简短的确认消息。`;
      }

      // 计算历史消息的 token 预算
      const modelLimit = getModelContextLimit(config.model);
      const totalBudget = Math.floor(modelLimit * CONTEXT_USAGE_RATIO);
      const systemTokens = estimateTokens(systemPrompt);
      const userTokens = estimateTokens(userContent);

      // 计算 PPT 上下文的实际 token 消耗
      let pptContextTokens = 0;
      if (context?.structuredPPT) {
        // 估算大纲 tokens（每页约 20 字符）
        const outlineTokens = context.structuredPPT.outline
          ? context.structuredPPT.outline.totalSlides * 10
          : 0;

        // 估算当前页详情 tokens
        const currentSlideTokens = context.structuredPPT.currentSlide
          ? estimateTokens(context.structuredPPT.currentSlide.fullText || '') + 100 // 100 为图片描述预留
          : 0;

        pptContextTokens = outlineTokens + currentSlideTokens;
      }

      const selectedTextTokens = estimateTokens(context?.selectedText || '');

      // 历史消息可用预算 = 总预算 - 系统提示 - 用户输入 - PPT上下文 - 选中文本 - 预留
      const historyBudget = Math.max(
        0,
        totalBudget - systemTokens - userTokens - pptContextTokens - selectedTextTokens - SYSTEM_PROMPT_RESERVE
      );

      console.log('[useLLMStream] Token budget:', {
        total: totalBudget,
        system: systemTokens,
        user: userTokens,
        pptContext: pptContextTokens,
        selectedText: selectedTextTokens,
        history: historyBudget,
      });

      // Build messages array with budget-limited history
      const history = buildHistoryMessagesWithBudget(historyMessages, historyBudget);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history,
        { role: 'user' as const, content: userContent },
      ];

      // 用于收集完整响应
      let fullResponse = '';

      // 检测是否为上下文超限错误
      const isContextLengthError = (errorMsg: string): boolean => {
        const patterns = [
          'context_length_exceeded',
          'maximum context length',
          'too many tokens',
          'token limit',
          'context window',
        ];
        const lowerMsg = errorMsg.toLowerCase();
        return patterns.some((p) => lowerMsg.includes(p));
      };

      // 获取工具注册表
      const toolRegistry = getToolRegistry();
      const tools = toolRegistry.getToolDefinitions();

      // 执行流式请求（支持重试和递归多轮对话）
      const executeStream = async (
        msgs: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCalls?: any; toolCallId?: string }>,
        retryCount = 0,
        depth = 0
      ): Promise<void> => {
        try {
          // 检查递归深度限制
          if (depth >= maxToolCallDepth) {
            const warningMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `已达到最大工具调用深度限制（${maxToolCallDepth}层）`,
              timestamp: Date.now(),
              status: 'error',
            };
            addMessage(warningMessage);
            setStreaming(false);
            return;
          }

          // LLM 调用：可能返回 tool_calls
          const response = await provider.send(
            {
              model: config.model,
              messages: msgs,
              temperature: 0.7,
              maxTokens: 4096,
              tools,
              toolChoice: 'auto',
            },
            undefined
          );

          fullResponse = response.content;

          // 情况 1：LLM 请求调用工具
          if (response.toolCalls && response.toolCalls.length > 0) {
            console.log('[useLLMStream] Tool calls detected:', response.toolCalls);

            // 更新助手消息
            updateMessage(assistantMessage.id, {
              status: 'completed',
              content: response.content || '正在执行操作...',
              metadata: { toolCalls: response.toolCalls },
            });

            // 执行所有工具调用
            const toolMessages: any[] = [];
            for (const toolCall of response.toolCalls) {
              // 添加工具执行消息（pending）
              const toolMsgId = crypto.randomUUID();
              const toolMessage: ChatMessage = {
                id: toolMsgId,
                role: 'tool',
                content: '执行中...',
                timestamp: Date.now(),
                status: 'pending',
                metadata: {
                  toolName: toolCall.name,
                  toolCallId: toolCall.id,
                  parsingError: toolCall.parsingError,
                },
              };
              addMessage(toolMessage);

              const startTime = Date.now();

              try {
                // 执行工具（传递 parsingError）
                const result = await toolRegistry.execute(
                  toolCall.name,
                  toolCall.arguments,
                  { parsingError: toolCall.parsingError }
                );

                const duration = Date.now() - startTime;

                // 为 LLM 准备简化的工具结果（移除大型数据）
                const simplifiedResult = simplifyToolResult(result);

                // 更新工具消息为成功/失败
                updateMessage(toolMsgId, {
                  content: result.success ? JSON.stringify(simplifiedResult) : result.error || '执行失败',
                  status: result.success ? 'completed' : 'error',
                  metadata: {
                    toolName: toolCall.name,
                    toolCallId: toolCall.id,
                    toolResult: result, // 完整结果存储在 metadata 中
                    parsingError: toolCall.parsingError,
                  },
                });

                // 记录工具调用历史
                addToolLog({
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  toolName: toolCall.name,
                  toolCallId: toolCall.id,
                  arguments: toolCall.arguments,
                  success: result.success,
                  durationMs: duration,
                  result: result.success ? result.data : undefined,
                  error: result.success ? undefined : result.error,
                  errorCode: result.errorCode,
                  errorDetails: result.errorDetails,
                  parsingError: toolCall.parsingError,
                });

                // 收集工具结果用于下一次 LLM 调用（使用简化版本）
                toolMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(simplifiedResult),
                });
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : '未知错误';
                const duration = Date.now() - startTime;

                updateMessage(toolMsgId, {
                  content: errorMsg,
                  status: 'error',
                  metadata: {
                    toolName: toolCall.name,
                    toolCallId: toolCall.id,
                    parsingError: toolCall.parsingError,
                  },
                });

                // 记录失败的工具调用
                addToolLog({
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  toolName: toolCall.name,
                  toolCallId: toolCall.id,
                  arguments: toolCall.arguments,
                  success: false,
                  durationMs: duration,
                  error: errorMsg,
                  errorCode: 'EXECUTION_ERROR',
                  parsingError: toolCall.parsingError,
                });

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ success: false, error: errorMsg }),
                });
              }
            }

            // 构建下一轮消息（包含工具结果）
            const nextMessages = [
              ...msgs,
              {
                role: 'assistant' as const,
                content: response.content || '',
                toolCalls: response.toolCalls,
              },
              ...toolMessages.map((tm) => ({
                role: 'tool' as const,
                content: tm.content,
                toolCallId: tm.tool_call_id,
              })),
            ];

            // 创建新的助手消息用于下一轮
            const nextAssistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              status: 'streaming',
            };
            addMessage(nextAssistantMessage);

            // 更新当前助手消息 ID 并递归调用
            assistantMessage = nextAssistantMessage;
            await executeStream(nextMessages, 0, depth + 1);
            return;
          }

          // 情况 2：普通文本响应（不需要工具）
          // 尝试从响应中提取 SlideSpec
          let slideSpec: SlideSpec | null = null;
          const looksLikeJson = fullResponse.includes('"blocks"') || fullResponse.includes('"kind"');

          if (isSlideRequest || looksLikeJson) {
            slideSpec = extractSlideSpec(fullResponse);
            console.log('[useLLMStream] extracted slideSpec:', slideSpec);
          }

          updateMessage(assistantMessage.id, {
            status: 'completed',
            content: fullResponse,
            slideSpec: slideSpec || undefined,
          });
          setStreaming(false);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          // 检测上下文超限错误，尝试自动重试
          if (isContextLengthError(errorMsg) && retryCount < 2) {
            const reducedBudget = Math.floor(historyBudget / Math.pow(2, retryCount + 1));
            const reducedHistory = buildHistoryMessagesWithBudget(
              historyMessages,
              reducedBudget
            );
            const reducedMessages = [
              { role: 'system' as const, content: systemPrompt },
              ...reducedHistory,
              { role: 'user' as const, content: userContent },
            ];
            fullResponse = '';
            updateMessage(assistantMessage.id, { content: '' });
            await executeStream(reducedMessages, retryCount + 1);
          } else {
            updateMessage(assistantMessage.id, {
              status: 'error',
              content: `错误: ${errorMsg}`,
            });
            setStreaming(false);
          }
        }
      };

      await executeStream(messages);
    },
    [getActiveConnection, activeProviderId, providers, historyMessages, addMessage, updateMessage, setStreaming, imageGenConfig]
  );

  const stopStream = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setStreaming(false);
  }, [setStreaming]);

  return {
    sendMessage,
    stopStream,
  };
}
