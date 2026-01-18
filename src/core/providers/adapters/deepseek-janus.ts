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
 * DeepSeek Janus 适配器
 * 支持 DeepSeek-LLM + Janus-Pro-7B
 */
export class DeepSeekJanusAdapter extends BaseProviderAdapter {
  readonly id = 'deepseek-janus';
  readonly displayName = 'DeepSeek Janus';
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
    const url = getApiUrl(config.baseUrl, config.providerId, '/inference');

    return {
      url,
      method: 'POST',
      headers: this.buildHeaders(config.apiKey),
      body: {
        model: config.capabilities?.image?.model || config.imageModel || 'deepseek-ai/Janus-Pro-7B',
        input: {
          prompt: input.prompt,
          image_size: input.size || '1024x1024',
        },
      },
    };
  }

  parseImageResponse(resp: HttpResponse): UnifiedImageResponse {
    const body = resp.body as any;
    const images = body.results?.map((item: any) => ({
      data: item.image,
      format: 'png' as const,
      width: parseInt(item.width || '1024'),
      height: parseInt(item.height || '1024'),
    })) || [];

    return {
      images,
      raw: body,
    };
  }
}
