import { BaseProviderAdapter } from '../adapter';
import type {
  UnifiedTextRequest,
  UnifiedTextResponse,
  UnifiedImageRequest,
  UnifiedImageResponse,
  HttpRequest,
  HttpResponse,
  VendorConfig,
  ProviderCapability,
} from '@/types';
import { getApiUrl } from '@core/llm/presets';

/**
 * 火山方舟/豆包适配器
 * 支持豆包 1.8 + Seedream 4.5
 */
export class DoubaoAdapter extends BaseProviderAdapter {
  readonly id = 'doubao';
  readonly displayName = '火山方舟/豆包';
  readonly capabilities: ProviderCapability[] = ['text', 'image'];

  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest {
    const url = getApiUrl(config.baseUrl, config.providerId, '/chat/completions');

    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      {
        role: 'user',
        content: input.images && input.images.length > 0
          ? [
              { type: 'text', text: input.prompt },
              ...input.images.map(img => ({
                type: 'image_url',
                image_url: {
                  url: img.type === 'url' ? img.data : `data:${img.mediaType || 'image/png'};base64,${img.data}`
                }
              }))
            ]
          : input.prompt
      }
    ];

    return {
      url,
      method: 'POST',
      headers: this.buildHeaders(config.apiKey),
      body: {
        model: config.capabilities?.text?.model || config.model,
        messages,
        temperature: input.options?.temperature,
        max_tokens: input.options?.maxTokens,
        top_p: input.options?.topP,
      },
    };
  }

  parseTextResponse(resp: HttpResponse): UnifiedTextResponse {
    const body = resp.body as any;
    return {
      text: body.choices?.[0]?.message?.content || '',
      usage: {
        inputTokens: body.usage?.prompt_tokens,
        outputTokens: body.usage?.completion_tokens,
      },
      raw: body,
    };
  }

  buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest {
    const url = getApiUrl(config.baseUrl, config.providerId, '/images/generations');

    return {
      url,
      method: 'POST',
      headers: this.buildHeaders(config.apiKey),
      body: {
        model: config.capabilities?.image?.model || config.imageModel || 'seedream-4.5',
        prompt: input.prompt,
        size: this.mapSize(input.size),
        n: 1,
        response_format: 'b64_json',
      },
    };
  }

  parseImageResponse(resp: HttpResponse): UnifiedImageResponse {
    const body = resp.body as any;
    const images = body.data?.map((item: any) => ({
      data: item.b64_json || item.url,
      format: 'png' as const,
      width: this.getSizeWidth(item.size || input.size),
      height: this.getSizeHeight(item.size || input.size),
    })) || [];

    return {
      images,
      raw: body,
    };
  }

  private mapSize(size?: string): string {
    // Seedream 4.5 支持最高 4K (4096x4096)
    switch (size) {
      case '512x512':
        return '512x512';
      case '1024x1024':
        return '1024x1024';
      case '2048x2048':
        return '2048x2048';
      default:
        return '1024x1024';
    }
  }

  private getSizeWidth(size?: string): number {
    return parseInt(size?.split('x')[0] || '1024');
  }

  private getSizeHeight(size?: string): number {
    return parseInt(size?.split('x')[1] || '1024');
  }
}
