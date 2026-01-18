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
 * 阿里云百炼适配器
 * 支持通义千问 + 通义万相
 */
export class DashScopeAdapter extends BaseProviderAdapter {
  readonly id = 'dashscope';
  readonly displayName = '阿里云百炼';
  readonly capabilities: ProviderCapability[] = ['text', 'image'];

  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest {
    const model = config.capabilities?.text?.model || config.model;
    const url = `${getApiUrl(config.baseUrl, config.providerId, '')}/services/aigc/text-generation/generation`;

    const messages: Array<{ role: string; content: Array<{ text?: string; image?: string }> }> = [
      {
        role: 'user',
        content: input.images && input.images.length > 0
          ? [
              { text: input.prompt },
              ...input.images.map(img => ({
                image: img.type === 'url' ? img.data : `data:${img.mediaType || 'image/png'};base64,${img.data}`
              }))
            ]
          : [{ text: input.prompt }]
      }
    ];

    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: {
        model,
        input: {
          messages,
        },
        parameters: {
          temperature: input.options?.temperature,
          max_tokens: input.options?.maxTokens,
          top_p: input.options?.topP,
        },
      },
    };
  }

  parseTextResponse(resp: HttpResponse): UnifiedTextResponse {
    const body = resp.body as any;
    return {
      text: body.output?.text || '',
      usage: {
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens,
      },
      raw: body,
    };
  }

  buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest {
    const model = config.capabilities?.image?.model || config.imageModel || 'wanx-v1';
    const url = `${getApiUrl(config.baseUrl, config.providerId, '')}/services/aigc/text2image/image-synthesis`;

    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: {
        model,
        input: {
          prompt: input.prompt,
        },
        parameters: {
          size: this.mapSize(input.size),
          n: 1,
        },
      },
    };
  }

  parseImageResponse(resp: HttpResponse): UnifiedImageResponse {
    const body = resp.body as any;
    const images = body.output?.results?.map((item: any) => ({
      data: item.url,
      format: 'png' as const,
      width: 1024,
      height: 1024,
    })) || [];

    return {
      images,
      raw: body,
    };
  }

  private mapSize(size?: string): string {
    switch (size) {
      case '512x512':
        return '512*512';
      case '1024x1024':
        return '1024*1024';
      case '2048x2048':
        return '2048*2048';
      default:
        return '1024*1024';
    }
  }
}
