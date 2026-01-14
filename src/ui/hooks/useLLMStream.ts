import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@ui/store/appStore';
import { createLLMProvider } from '@core/llm/factory';
import type { LLMStreamController, ChatMessage } from '@/types';

export function useLLMStream() {
  const { activeProviderId, providers, addMessage, updateMessage, setStreaming } = useAppStore();
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
    async (userContent: string, context?: string) => {
      const config = providers[activeProviderId];
      if (!config.apiKey) {
        throw new Error('请先配置 API Key');
      }

      // 取消之前的流式请求
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }

      const provider = createLLMProvider(config);

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userContent,
        timestamp: Date.now(),
        status: 'completed',
        context,
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

      // Build messages array
      const messages = [
        {
          role: 'system' as const,
          content: `你是一个专业的 Office 文档助手。帮助用户改写、生成、优化文档内容。
${context ? `\n用户当前选中的文本：\n"""${context}"""` : ''}
请直接输出结果，不要添加额外的解释。`,
        },
        { role: 'user' as const, content: userContent },
      ];

      try {
        controllerRef.current = await provider.stream(
          {
            model: config.model,
            messages,
            temperature: 0.7,
            maxTokens: 4096,
          },
          {
            onToken: (chunk) => {
              if (chunk.contentDelta) {
                const delta = chunk.contentDelta;
                useAppStore.setState((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: m.content + delta }
                      : m
                  ),
                }));
              }
            },
            onError: (error) => {
              updateMessage(assistantMessage.id, {
                status: 'error',
                content: `错误: ${error.message}`,
              });
              setStreaming(false);
            },
            onComplete: () => {
              updateMessage(assistantMessage.id, { status: 'completed' });
              setStreaming(false);
            },
          }
        );
      } catch (error) {
        updateMessage(assistantMessage.id, {
          status: 'error',
          content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        });
        setStreaming(false);
      }
    },
    [activeProviderId, providers, addMessage, updateMessage, setStreaming]
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
