import type { ILLMProvider, LLMRequest, LLMResponse, LLMStreamHandlers, LLMStreamController, LLMModelInfo } from '@/types';

export class OpenAIProvider implements ILLMProvider {
  readonly id = 'openai' as const;
  readonly label = 'OpenAI';
  readonly supportsStreaming = true;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  listModels(): LLMModelInfo[] {
    return [
      { id: 'gpt-4o', label: 'GPT-4o', maxTokens: 128000 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', maxTokens: 128000 },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', maxTokens: 16385 },
    ];
  }

  async send(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false,
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
      content: data.choices[0]?.message?.content || '',
      finishReason: data.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
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

    const fetchStream = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
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
              if (data === '[DONE]') {
                handlers.onComplete({
                  id: crypto.randomUUID(),
                  content: fullContent,
                  finishReason: 'stop',
                });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta?.content || '';
                if (delta) {
                  fullContent += delta;
                  handlers.onToken({ contentDelta: delta });
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
