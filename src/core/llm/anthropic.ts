import type { ILLMProvider, LLMRequest, LLMResponse, LLMStreamHandlers, LLMStreamController, LLMModelInfo } from '@/types';

export class AnthropicProvider implements ILLMProvider {
  readonly id = 'anthropic' as const;
  readonly label = 'Anthropic Claude';
  readonly supportsStreaming = true;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.anthropic.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  listModels(): LLMModelInfo[] {
    return [
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', maxTokens: 8192 },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', maxTokens: 8192 },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', maxTokens: 4096 },
    ];
  }

  private convertMessages(messages: LLMRequest['messages']) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    return {
      system: systemMessage?.content,
      messages: otherMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
  }

  async send(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const { system, messages } = this.convertMessages(request.messages);

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        system,
        messages,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      content: data.content[0]?.text || '',
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
    };
  }

  async stream(
    request: LLMRequest,
    handlers: LLMStreamHandlers,
    signal?: AbortSignal
  ): Promise<LLMStreamController> {
    const abortController = new AbortController();
    const combinedSignal = signal
      ? AbortSignal.any([signal, abortController.signal])
      : abortController.signal;

    const { system, messages } = this.convertMessages(request.messages);

    const fetchStream = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: request.model,
            max_tokens: request.maxTokens || 4096,
            system,
            messages,
            stream: true,
          }),
          signal: combinedSignal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta') {
                  const delta = parsed.delta?.text || '';
                  if (delta) {
                    fullContent += delta;
                    handlers.onToken({ contentDelta: delta });
                  }
                } else if (parsed.type === 'message_stop') {
                  handlers.onComplete({
                    id: crypto.randomUUID(),
                    content: fullContent,
                    finishReason: 'stop',
                  });
                  return;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        handlers.onComplete({
          id: crypto.randomUUID(),
          content: fullContent,
          finishReason: 'stop',
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          handlers.onError({
            code: 'stream_aborted',
            message: '请求已取消',
            retryable: false,
          });
        } else {
          handlers.onError({
            code: 'network_error',
            message: error instanceof Error ? error.message : '网络错误',
            retryable: true,
          });
        }
      }
    };

    fetchStream();

    return {
      abort: () => abortController.abort(),
    };
  }
}
