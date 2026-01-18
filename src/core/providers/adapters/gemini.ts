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
 * Google Gemini 适配器
 * 支持 Gemini 1.5 Pro + Imagen 3
 */
export class GeminiAdapter extends BaseProviderAdapter {
  readonly id = 'gemini';
  readonly displayName = 'Google Gemini';
  readonly capabilities: ProviderCapability[] = ['text', 'image'];

  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest {
    const model = config.capabilities?.text?.model || config.model;
    const url = `${getApiUrl(config.baseUrl, config.providerId, '')}/models/${model}:generateContent?key=${config.apiKey}`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: input.prompt }
    ];

    if (input.images && input.images.length > 0) {
      input.images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mediaType || 'image/png',
            data: img.type === 'base64' ? img.data : img.data // Gemini 需要 base64
          }
        });
      });
    }

    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        contents: [{ parts }],
        generationConfig: {
          temperature: input.options?.temperature,
          maxOutputTokens: input.options?.maxTokens,
          topP: input.options?.topP,
        },
      },
    };
  }

  parseTextResponse(resp: HttpResponse): UnifiedTextResponse {
    const body = resp.body as any;
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text,
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount,
        outputTokens: body.usageMetadata?.candidatesTokenCount,
      },
      raw: body,
    };
  }

  buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest {
    const model = config.capabilities?.image?.model || config.imageModel || 'imagen-3';
    const url = `${getApiUrl(config.baseUrl, config.providerId, '')}/models/${model}:predict?key=${config.apiKey}`;

    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        instances: [
          {
            prompt: input.prompt,
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: this.mapSizeToAspectRatio(input.size),
        },
      },
    };
  }

  parseImageResponse(resp: HttpResponse): UnifiedImageResponse {
    const body = resp.body as any;
    const images = body.predictions?.map((pred: any) => ({
      data: pred.bytesBase64Encoded,
      format: 'png' as const,
      width: 1024,
      height: 1024,
    })) || [];

    return {
      images,
      raw: body,
    };
  }

  private mapSizeToAspectRatio(size?: string): string {
    switch (size) {
      case '512x512':
      case '1024x1024':
        return '1:1';
      case '2048x2048':
        return '1:1';
      default:
        return '1:1';
    }
  }
}
