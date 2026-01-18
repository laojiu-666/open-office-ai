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
 * OpenAI 适配器
 * 支持 GPT-4o + DALL-E 3
 */
export class OpenAIAdapter extends BaseProviderAdapter {
  readonly id = 'openai';
  readonly displayName = 'OpenAI';
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
        model: config.capabilities?.image?.model || config.imageModel || 'dall-e-3',
        prompt: input.prompt,
        size: input.size || '1024x1024',
        n: 1,
        response_format: 'b64_json',
      },
    };
  }

  parseImageResponse(resp: HttpResponse): UnifiedImageResponse {
    const body = resp.body as any;
    const images = body.data?.map((item: any) => ({
      data: item.b64_json,
      format: 'png' as const,
      width: parseInt(item.size?.split('x')[0] || '1024'),
      height: parseInt(item.size?.split('x')[1] || '1024'),
    })) || [];

    return {
      images,
      raw: body,
    };
  }
}
