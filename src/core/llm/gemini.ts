/**
 * Google Gemini Provider 实现
 * 使用 Gemini API（非 OpenAI 兼容）
 */

import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamHandlers,
  LLMStreamController,
  LLMModelInfo,
} from '@/types';
import { normalizeBaseUrl } from './presets';

export class GeminiProvider implements ILLMProvider {
  readonly id = 'gemini' as const;
  readonly label = 'Google Gemini';
  readonly supportsStreaming = true;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://generativelanguage.googleapis.com') {
    this.apiKey = apiKey;
    this.baseUrl = normalizeBaseUrl(baseUrl, 'gemini');
  }

  listModels(): LLMModelInfo[] {
    return [
      { id: 'gemini-pro', label: 'Gemini Pro', maxTokens: 32768 },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', maxTokens: 1048576 },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', maxTokens: 1048576 },
    ];
  }

  /**
   * 将 OpenAI 格式的消息转换为 Gemini 格式
   */
  private convertMessages(messages: LLMRequest['messages']): {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    systemInstruction?: { parts: Array<{ text: string }> };
  } {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let systemInstruction: { parts: Array<{ text: string }> } | undefined;

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini 使用 systemInstruction 而不是 system role
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { contents, systemInstruction };
  }

  async send(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const { contents, systemInstruction } = this.convertMessages(request.messages);

    const url = `${this.baseUrl}/v1beta/models/${request.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const finishReason = data.candidates?.[0]?.finishReason;

    return {
      id: crypto.randomUUID(),
      content,
      finishReason: finishReason === 'STOP' ? 'stop' : 'length',
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
        const { contents, systemInstruction } = this.convertMessages(request.messages);

        const url = `${this.baseUrl}/v1beta/models/${request.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.maxTokens,
            },
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
              if (!data || data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  fullContent += text;
                  handlers.onToken({ contentDelta: text });
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
