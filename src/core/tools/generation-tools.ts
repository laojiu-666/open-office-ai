import type { ToolDefinition, GenerationToolResult } from '@/types';
import type { ToolRegistry, ToolResult } from './registry';
import type { ImageSize, ImageStyle } from '@core/image/types';
import { CapabilityRouter } from '@core/capability-router';
import { createLLMProvider } from '@core/llm/factory';
import { createImageGenerationProvider } from '@core/image/provider';
import { useAppStore } from '@ui/store/appStore';

/**
 * 注册所有生成工具到注册表
 */
export function registerGenerationTools(registry: ToolRegistry): void {
  // 工具 1：文本生成
  registry.register(
    {
      name: 'generate_text',
      description: '生成文本内容，用于回答问题、改写、翻译、总结等文本处理任务',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: '生成提示词，描述需要生成的文本内容',
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const state = useAppStore.getState();
        const connections = state.connections;
        const generationProfile = state.generationProfile;

        // 使用 CapabilityRouter 选择文本连接
        const router = new CapabilityRouter(connections, generationProfile);
        const connection = router.getTextConnection();

        if (!connection) {
          return {
            success: false,
            error: '未配置文本生成能力，请在设置中添加支持文本生成的 AI 连接',
            errorCode: 'CAPABILITY_NOT_CONFIGURED',
          };
        }

        // 创建 Provider 并生成
        const provider = createLLMProvider({
          providerId: connection.providerId,
          apiKey: connection.apiKey,
          baseUrl: connection.baseUrl,
          model: connection.capabilities?.text?.model || connection.model,
        });

        const response = await provider.send({
          model: connection.capabilities?.text?.model || connection.model,
          messages: [{ role: 'user', content: args.prompt as string }],
          temperature: 0.7,
          maxTokens: 4096,
        });

        const result: GenerationToolResult = {
          type: 'text',
          content: response.content,
          metadata: {
            provider: connection.providerId,
            model: connection.capabilities?.text?.model || connection.model,
          },
        };

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '文本生成失败',
          errorCode: 'GENERATION_FAILED',
        };
      }
    }
  );

  // 工具 2：图片生成
  registry.register(
    {
      name: 'generate_image',
      description: '生成图片，用于创建插图、配图、视觉内容等',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: '图片描述，详细描述需要生成的图片内容、风格、场景等',
          },
          size: {
            type: 'string',
            description: '图片尺寸',
            enum: ['512x512', '1024x1024', '1792x1024', '1024x1792'],
          },
          style: {
            type: 'string',
            description: '图片风格',
            enum: ['vivid', 'natural'],
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const state = useAppStore.getState();
        const connections = state.connections;
        const generationProfile = state.generationProfile;
        const imageGenConfig = state.imageGenConfig;

        console.log('[generate_image] Connections:', connections.length);
        console.log('[generate_image] Generation profile:', generationProfile);

        // 使用 CapabilityRouter 选择图片连接
        const router = new CapabilityRouter(connections, generationProfile);
        const connection = router.getImageConnection();

        console.log('[generate_image] Selected connection:', connection?.name, connection?.id);
        console.log('[generate_image] Connection capabilities:', connection?.capabilities);
        console.log('[generate_image] Connection imageModel:', connection?.imageModel);

        if (!connection) {
          return {
            success: false,
            error: '未配置图片生成能力，请在设置中添加支持图片生成的 AI 连接',
            errorCode: 'CAPABILITY_NOT_CONFIGURED',
          };
        }

        // 创建 ImageProvider 并生成
        console.log('[generate_image] Creating image provider...');
        const imageProvider = createImageGenerationProvider(imageGenConfig, connection);

        console.log('[generate_image] Generating image with prompt:', args.prompt);
        const imageResult = await imageProvider.generate({
          prompt: args.prompt as string,
          size: (args.size as ImageSize) || '1024x1024',
          style: args.style as ImageStyle,
        });

        console.log('[generate_image] Image generated successfully:', imageResult.width, 'x', imageResult.height);

        const result: GenerationToolResult = {
          type: 'image',
          content: imageResult.data,
          metadata: {
            provider: connection.providerId,
            model: connection.capabilities?.image?.model || connection.imageModel,
            width: imageResult.width,
            height: imageResult.height,
            format: imageResult.format,
          },
        };

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('[generate_image] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '图片生成失败',
          errorCode: 'GENERATION_FAILED',
        };
      }
    }
  );

  // 工具 3：视频生成（预留）
  registry.register(
    {
      name: 'generate_video',
      description: '生成视频内容，用于创建动画、演示、视频素材等（需要配置支持视频生成的 AI 连接）',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: '视频描述，详细描述需要生成的视频内容、场景、动作等',
          },
          duration: {
            type: 'number',
            description: '视频时长（秒）',
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      return {
        success: false,
        error: '视频生成功能即将推出，敬请期待',
        errorCode: 'NOT_IMPLEMENTED',
      };
    }
  );
}
