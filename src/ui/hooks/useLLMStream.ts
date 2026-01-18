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
 * 构建带预算限制的历史消息
 * 从最新消息向前遍历，直到超出预算
 */
function buildHistoryMessagesWithBudget(
  messages: ChatMessage[],
  tokenBudget: number
): Array<{ role: 'user' | 'assistant'; content: string }> {
  // 过滤出已完成且有内容的消息
  const completedMessages = messages.filter(
    (m) => m.status === 'completed' && m.content
  );

  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let usedTokens = 0;

  // 从最新消息向前遍历
  for (let i = completedMessages.length - 1; i >= 0; i--) {
    const msg = completedMessages[i];
    const msgTokens = estimateTokens(msg.content);

    // 检查是否超出预算
    if (usedTokens + msgTokens > tokenBudget) {
      break;
    }

    // 添加到结果（插入到开头以保持顺序）
    result.unshift({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
    usedTokens += msgTokens;
  }

  return result;
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

      // 计算历史消息的 token 预算
      const modelLimit = getModelContextLimit(config.model);
      const totalBudget = Math.floor(modelLimit * CONTEXT_USAGE_RATIO);
      const systemTokens = estimateTokens(systemPrompt);
      const userTokens = estimateTokens(userContent);
      const docContextTokens = Math.min(
        estimateTokens(context?.selectedText || '') + estimateTokens(context?.slideText || ''),
        DOC_CONTEXT_RESERVE
      );
      // 历史消息可用预算 = 总预算 - 系统提示 - 用户输入 - 文档上下文预留
      const historyBudget = Math.max(
        0,
        totalBudget - systemTokens - userTokens - docContextTokens - SYSTEM_PROMPT_RESERVE
      );

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

                // 更新工具消息为成功/失败
                updateMessage(toolMsgId, {
                  content: result.success ? JSON.stringify(result.data) : result.error || '执行失败',
                  status: result.success ? 'completed' : 'error',
                  metadata: {
                    toolName: toolCall.name,
                    toolCallId: toolCall.id,
                    toolResult: result,
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

                // 收集工具结果用于下一次 LLM 调用
                toolMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result),
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
