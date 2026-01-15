import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { createLLMProvider } from '@core/llm/factory';
import {
  isSlideGenerationRequest,
  extractSlideSpec,
  getSlideSpecSystemPrompt,
} from '@core/llm/response-parser';
import type { LLMStreamController, ChatMessage, SlideSpec } from '@/types';

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
  const { activeProviderId, providers, messages: historyMessages, addMessage, updateMessage, setStreaming } = useAppStore();
  const controllerRef = useRef<LLMStreamController | null>(null);

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
      const config = providers[activeProviderId];
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
      const assistantMessage: ChatMessage = {
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
        // 普通对话系统提示
        systemPrompt = `你是一个专业的 Office 文档助手。帮助用户改写、生成、优化文档内容。
${context?.selectedText ? `\n用户当前选中的文本：\n"""${context.selectedText}"""` : ''}
${context?.slideText ? `\n当前幻灯片内容：\n"""${context.slideText}"""` : ''}
请直接输出结果，不要添加额外的解释。`;
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

      // 执行流式请求（支持重试）
      const executeStream = async (
        msgs: typeof messages,
        retryCount = 0
      ): Promise<void> => {
        try {
          controllerRef.current = await provider.stream(
            {
              model: config.model,
              messages: msgs,
              temperature: 0.7,
              maxTokens: 4096,
            },
            {
              onToken: (chunk) => {
                if (chunk.contentDelta) {
                  const delta = chunk.contentDelta;
                  fullResponse += delta;
                  useAppStore.setState((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...m, content: m.content + delta }
                        : m
                    ),
                  }));
                }
              },
              onError: async (error) => {
                // 检测上下文超限错误，尝试自动重试
                if (isContextLengthError(error.message) && retryCount < 2) {
                  // 进一步缩减历史消息（每次减半）
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
                  // 重置响应内容
                  fullResponse = '';
                  updateMessage(assistantMessage.id, { content: '' });
                  // 重试
                  await executeStream(reducedMessages, retryCount + 1);
                } else {
                  updateMessage(assistantMessage.id, {
                    status: 'error',
                    content: `错误: ${error.message}`,
                  });
                  setStreaming(false);
                }
              },
              onComplete: () => {
                // 尝试从响应中提取 SlideSpec
                let slideSpec: SlideSpec | null = null;
                if (isSlideRequest) {
                  slideSpec = extractSlideSpec(fullResponse);
                }

                // 更新消息状态
                updateMessage(assistantMessage.id, {
                  status: 'completed',
                  slideSpec: slideSpec || undefined,
                });
                setStreaming(false);
              },
            }
          );
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
    [activeProviderId, providers, historyMessages, addMessage, updateMessage, setStreaming]
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
