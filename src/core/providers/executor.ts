import type {
  AIConnection,
  GenerationProfile,
  UnifiedTextRequest,
  UnifiedTextResponse,
  UnifiedImageRequest,
  UnifiedImageResponse,
  HttpRequest,
  HttpResponse,
  HttpError,
} from '@/types';
import type { ProviderAdapter } from './adapter';
import { ProviderErrorClass } from './errors';
import { getRegistry, ProviderRegistry } from './registry';

type CapabilityType = 'text' | 'image';

export interface ProviderExecutorResult<T> {
  connection: AIConnection;
  adapterId: string;
  response: T;
  attempts: number;
}

export interface ProviderExecutorOptions {
  maxAttempts?: number;
  signal?: AbortSignal;
}

interface ProviderCandidate {
  connection: AIConnection;
  adapter: ProviderAdapter;
}

function shouldUseProxy(baseUrl: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isVolcesAPI = baseUrl.includes('volces.com') || baseUrl.includes('volcengine.com');
  return isDev && isVolcesAPI;
}

export class ProviderExecutor {
  private registry: ProviderRegistry;

  constructor(registry?: ProviderRegistry) {
    this.registry = registry ?? getRegistry();
  }

  async executeText(
    connections: AIConnection[],
    input: UnifiedTextRequest,
    profile?: GenerationProfile,
    options?: ProviderExecutorOptions
  ): Promise<ProviderExecutorResult<UnifiedTextResponse>> {
    return this.execute('text', connections, input, profile, options);
  }

  async executeImage(
    connections: AIConnection[],
    input: UnifiedImageRequest,
    profile?: GenerationProfile,
    options?: ProviderExecutorOptions
  ): Promise<ProviderExecutorResult<UnifiedImageResponse>> {
    return this.execute('image', connections, input, profile, options);
  }

  private async execute<T>(
    capability: CapabilityType,
    connections: AIConnection[],
    input: UnifiedTextRequest | UnifiedImageRequest,
    profile?: GenerationProfile,
    options?: ProviderExecutorOptions
  ): Promise<ProviderExecutorResult<T>> {
    const candidates = this.getCandidates(connections, capability, profile);
    if (candidates.length === 0) {
      throw new Error(`No available provider for ${capability} capability`);
    }

    const maxAttempts = Math.min(options?.maxAttempts ?? candidates.length, candidates.length);
    let lastError: unknown = null;

    for (let index = 0; index < maxAttempts; index += 1) {
      const candidate = candidates[index];
      try {
        const response = await this.executeOnce<T>(
          candidate,
          capability,
          input,
          options?.signal
        );

        return {
          connection: candidate.connection,
          adapterId: candidate.adapter.id,
          response,
          attempts: index + 1,
        };
      } catch (error) {
        const providerError = error instanceof ProviderErrorClass
          ? error
          : this.toProviderError(candidate.adapter, {
              message: error instanceof Error ? error.message : 'Unknown error',
              details: error,
            });

        lastError = providerError;

        if (providerError.isRetryable() && index < maxAttempts - 1) {
          continue;
        }

        throw providerError;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error(`Provider execution failed for ${capability}`);
  }

  private getCandidates(
    connections: AIConnection[],
    capability: CapabilityType,
    profile?: GenerationProfile
  ): ProviderCandidate[] {
    const enabledConnections = connections.filter((connection) => !connection.disabled);
    const withApiKey = enabledConnections.filter((connection) => Boolean(connection.apiKey));
    const withCapability = withApiKey.filter((connection) => this.supportsCapability(connection, capability));

    const candidates = withCapability.flatMap((connection) => {
      const adapter = this.registry.getAdapter(connection.providerId);
      if (!adapter || !adapter.capabilities.includes(capability)) {
        return [];
      }
      return [{ connection, adapter }];
    });

    const manualId = this.getManualProviderId(profile, capability);
    if (!manualId) {
      return candidates;
    }

    const manual = candidates.find((candidate) => candidate.connection.id === manualId);
    if (!manual) {
      return candidates;
    }

    return [
      manual,
      ...candidates.filter((candidate) => candidate.connection.id !== manualId),
    ];
  }

  private supportsCapability(connection: AIConnection, capability: CapabilityType): boolean {
    if (capability === 'text') {
      return Boolean(connection.capabilities?.text?.model || connection.model);
    }
    if (capability === 'image') {
      return Boolean(connection.capabilities?.image?.model || connection.imageModel);
    }
    return false;
  }

  private getManualProviderId(profile: GenerationProfile | undefined, capability: CapabilityType): string | undefined {
    if (!profile || profile.mode !== 'manual') {
      return undefined;
    }
    return capability === 'text' ? profile.textProvider : profile.imageProvider;
  }

  private async executeOnce<T>(
    candidate: ProviderCandidate,
    capability: CapabilityType,
    input: UnifiedTextRequest | UnifiedImageRequest,
    signal?: AbortSignal
  ): Promise<T> {
    const request = capability === 'text'
      ? candidate.adapter.buildTextRequest(input as UnifiedTextRequest, candidate.connection)
      : candidate.adapter.buildImageRequest(input as UnifiedImageRequest, candidate.connection);

    const response = await this.sendHttpRequest(
      request,
      candidate.connection.baseUrl,
      candidate.adapter,
      signal
    );

    if (response.status < 200 || response.status >= 300) {
      const message = this.getErrorMessage(response.body, response.status);
      throw this.toProviderError(candidate.adapter, {
        status: response.status,
        message,
        details: response.body,
      });
    }

    return (capability === 'text'
      ? candidate.adapter.parseTextResponse(response)
      : candidate.adapter.parseImageResponse(response)) as T;
  }

  private async sendHttpRequest(
    request: HttpRequest,
    baseUrl: string,
    adapter: ProviderAdapter,
    signal?: AbortSignal
  ): Promise<HttpResponse> {
    const finalRequest = this.applyProxyIfNeeded(request, baseUrl);

    try {
      const response = await fetch(finalRequest.url, {
        method: finalRequest.method,
        headers: finalRequest.headers,
        body: finalRequest.body ? JSON.stringify(finalRequest.body) : undefined,
        signal,
      });

      const body = await this.readResponseBody(response);

      return {
        status: response.status,
        headers: this.headersToRecord(response.headers),
        body,
      };
    } catch (error) {
      const isAbortError = typeof DOMException !== 'undefined'
        && error instanceof DOMException
        && error.name === 'AbortError';
      const httpError: HttpError = {
        status: isAbortError ? undefined : 503,
        message: error instanceof Error ? error.message : 'Network error',
        code: isAbortError ? 'ETIMEDOUT' : undefined,
        details: error,
      };

      throw this.toProviderError(adapter, httpError);
    }
  }

  private applyProxyIfNeeded(request: HttpRequest, baseUrl: string): HttpRequest {
    if (!shouldUseProxy(baseUrl)) {
      return request;
    }

    try {
      const url = new URL(request.url);
      return {
        ...request,
        url: `/api-proxy${url.pathname}${url.search}`,
      };
    } catch {
      return request;
    }
  }

  private headersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async readResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';

    // 为响应读取添加超时保护（60秒）
    const timeoutMs = 60000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Response body read timeout')), timeoutMs);
    });

    try {
      if (contentType.includes('application/json')) {
        // 使用 Promise.race 添加超时保护
        const jsonPromise = response.json().catch((error) => {
          console.error('[readResponseBody] JSON parse error:', error);
          // 如果 JSON 解析失败，尝试读取为文本
          return response.text().then(text => {
            console.warn('[readResponseBody] Failed to parse JSON, got text:', text.substring(0, 200));
            return null;
          }).catch(() => null);
        });

        return await Promise.race([jsonPromise, timeoutPromise]);
      }

      // 对于非 JSON 响应，也添加超时保护
      const textPromise = response.text().catch((error) => {
        console.error('[readResponseBody] Text read error:', error);
        return '';
      });

      return await Promise.race([textPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Response body read timeout') {
        console.error('[readResponseBody] Timeout reading response body');
        throw new Error('读取响应超时，可能是图片数据过大或网络不稳定');
      }
      throw error;
    }
  }

  private getErrorMessage(body: unknown, status: number): string {
    if (body && typeof body === 'object') {
      const errorMessage = (body as { error?: { message?: string }; message?: string }).error?.message
        ?? (body as { message?: string }).message;
      if (errorMessage) {
        return errorMessage;
      }
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return `HTTP ${status}`;
  }

  private toProviderError(adapter: ProviderAdapter, error: HttpError): ProviderErrorClass {
    return new ProviderErrorClass(adapter.mapError(error));
  }
}
