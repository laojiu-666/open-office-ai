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
  ProviderError,
  HttpError,
} from '@/types';
import { getApiUrl } from '@core/llm/presets';

/**
 * 百度千帆适配器
 * 支持 ERNIE 4.5 + 文心一格
 */
export class QianfanAdapter extends BaseProviderAdapter {
  readonly id = 'qianfan';
  readonly displayName = '百度千帆';
  readonly capabilities: ProviderCapability[] = ['text', 'image'];

  buildTextRequest(input: UnifiedTextRequest, config: VendorConfig): HttpRequest {
    const model = config.capabilities?.text?.model || config.model;
    const url = `${getApiUrl(config.baseUrl, config.providerId, '')}/v1/wenxinworkshop/chat/${model}?access_token=${config.apiKey}`;

    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: input.prompt
      }
    ];

    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        messages,
        temperature: input.options?.temperature,
        max_output_tokens: input.options?.maxTokens,
        top_p: input.options?.topP,
      },
    };
  }

  parseTextResponse(resp: HttpResponse): UnifiedTextResponse {
    const body = resp.body as any;
    return {
      text: body.result || '',
      usage: {
        inputTokens: body.usage?.prompt_tokens,
        outputTokens: body.usage?.completion_tokens,
      },
      raw: body,
    };
  }

  buildImageRequest(input: UnifiedImageRequest, config: VendorConfig): HttpRequest {
    const url = `${getApiUrl(config.baseUrl, config.providerId, '')}/v1/wenxinworkshop/text2image/sd_xl?access_token=${config.apiKey}`;

    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        prompt: input.prompt,
        size: this.mapSize(input.size),
        n: 1,
      },
    };
  }

  parseImageResponse(resp: HttpResponse): UnifiedImageResponse {
    const body = resp.body as any;
    const images = body.data?.map((item: any) => ({
      data: item.b64_image,
      format: 'png' as const,
      width: 1024,
      height: 1024,
    })) || [];

    return {
      images,
      raw: body,
    };
  }

  mapError(error: HttpError): ProviderError {
    const body = error.details as any;
    let code: ProviderError['code'] = 'unknown';

    if (body?.error_code === 110) {
      code = 'auth_invalid';
    } else if (body?.error_code === 18) {
      code = 'quota_exceeded';
    } else if (body?.error_code === 4) {
      code = 'rate_limited';
    } else if (body?.error_code === 1) {
      code = 'input_invalid';
    }

    return {
      code,
      message: body?.error_msg || error.message,
      provider: this.id,
      raw: error.details,
    };
  }

  private mapSize(size?: string): string {
    switch (size) {
      case '512x512':
        return '512x512';
      case '1024x1024':
        return '1024x1024';
      default:
        return '1024x1024';
    }
  }
}
