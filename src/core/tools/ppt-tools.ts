import type { ToolDefinition } from '@/types';
import type { ToolRegistry, ToolResult } from './registry';
import {
  applySlideSpec,
  insertImageToCurrentSlide,
  setSlideBackground,
  replaceSelectionWithFormat,
  insertTextAtPosition,
} from '@adapters/powerpoint/slide-renderer';
import { getAIContext } from '@adapters/powerpoint/context';
import type { SlideSpec, TextStyle, Bounds } from '@/types';
import { createImageGenerationProvider } from '@core/image/provider';
import { useAppStore } from '@ui/store/appStore';

/**
 * 注册所有 PPT 工具到注册表
 */
export function registerPPTTools(registry: ToolRegistry): void {
  // 工具 1: 创建幻灯片
  registry.register(
    {
      name: 'ppt_create_slide',
      description: 'Create a new slide with layout and content. Use when user asks to create/generate/add a slide.',
      parameters: {
        type: 'object',
        properties: {
          layout: {
            type: 'string',
            enum: ['title-content', 'title-image', 'title-only', 'blank'],
            description: 'Layout template',
          },
          title: {
            type: 'string',
            description: 'Slide title',
          },
          content: {
            type: 'array',
            items: { type: 'string' },
            description: 'Content bullet points',
          },
          includeImage: {
            type: 'boolean',
            description: 'Whether to include an image',
          },
          imagePrompt: {
            type: 'string',
            description: 'Image generation prompt (required if includeImage is true)',
          },
        },
        required: ['layout', 'title'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const spec: SlideSpec = {
          version: '1.0',
          layout: {
            template: args.layout as any,
            slots: [],
          },
          blocks: [
            {
              kind: 'text',
              slotId: 'title',
              content: args.title as string,
            },
          ],
          metadata: {
            requestId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        };

        if (args.content && Array.isArray(args.content)) {
          spec.blocks.push({
            kind: 'text',
            slotId: 'body',
            content: (args.content as string[]).map((item) => `• ${item}`).join('\n'),
          });
        }

        if (args.includeImage && args.imagePrompt) {
          const assetId = `img-${Date.now()}`;
          spec.blocks.push({
            kind: 'image',
            slotId: 'image',
            prompt: args.imagePrompt as string,
            assetId,
          });
          spec.assets = [
            {
              id: assetId,
              prompt: args.imagePrompt as string,
              width: 512,
              height: 512,
              format: 'png',
              status: 'pending',
            },
          ];
        }

        const result = await applySlideSpec(spec);
        return {
          success: result.success,
          data: {
            slideId: result.slideId,
            slideIndex: result.slideIndex,
          },
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create slide',
        };
      }
    }
  );

  // 工具 2: 插入图片
  registry.register(
    {
      name: 'ppt_insert_image',
      description: 'Insert an image into the current slide. Use when user wants to add/insert an image.',
      parameters: {
        type: 'object',
        properties: {
          imageData: {
            type: 'string',
            description: 'Base64-encoded image data',
          },
          x: {
            type: 'number',
            description: 'X coordinate (0-960)',
          },
          y: {
            type: 'number',
            description: 'Y coordinate (0-540)',
          },
          width: {
            type: 'number',
            description: 'Image width',
          },
          height: {
            type: 'number',
            description: 'Image height',
          },
        },
        required: ['imageData'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const bounds: Partial<Bounds> = {
          x: (args.x as number) || 50,
          y: (args.y as number) || 50,
          width: (args.width as number) || 400,
          height: (args.height as number) || 300,
        };

        const result = await insertImageToCurrentSlide(args.imageData as string, bounds);
        return {
          success: result.success,
          data: { shapeId: result.shapeId },
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to insert image',
        };
      }
    }
  );

  // 工具 3: 设置背景
  registry.register(
    {
      name: 'ppt_set_background',
      description: 'Set background image for the current slide.',
      parameters: {
        type: 'object',
        properties: {
          imageData: {
            type: 'string',
            description: 'Base64-encoded background image',
          },
          transparency: {
            type: 'number',
            description: 'Transparency (0-1)',
          },
        },
        required: ['imageData'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const result = await setSlideBackground(args.imageData as string, {
          transparency: args.transparency as number,
        });
        return {
          success: result.success,
          data: { method: result.method },
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set background',
        };
      }
    }
  );

  // 工具 4: 替换选中文本
  registry.register(
    {
      name: 'ppt_replace_selection',
      description: 'Replace selected text with new text and formatting.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'New text content',
          },
          fontFamily: {
            type: 'string',
            description: 'Font family',
          },
          fontSize: {
            type: 'number',
            description: 'Font size',
          },
          color: {
            type: 'string',
            description: 'Text color (hex)',
          },
          bold: {
            type: 'boolean',
            description: 'Bold',
          },
          italic: {
            type: 'boolean',
            description: 'Italic',
          },
        },
        required: ['text'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const style: Partial<TextStyle> = {};
        if (args.fontFamily) style.fontFamily = args.fontFamily as string;
        if (args.fontSize) style.fontSize = args.fontSize as number;
        if (args.color) style.color = args.color as any;
        if (args.bold !== undefined) style.bold = args.bold as boolean;
        if (args.italic !== undefined) style.italic = args.italic as boolean;

        const result = await replaceSelectionWithFormat(
          args.text as string,
          Object.keys(style).length > 0 ? (style as TextStyle) : undefined
        );
        return {
          success: result.success,
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to replace selection',
        };
      }
    }
  );

  // 工具 5: 插入文本框
  registry.register(
    {
      name: 'ppt_insert_text',
      description: 'Insert a text box at specified position.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text content',
          },
          x: {
            type: 'number',
            description: 'X coordinate (0-960)',
          },
          y: {
            type: 'number',
            description: 'Y coordinate (0-540)',
          },
          width: {
            type: 'number',
            description: 'Text box width',
          },
          height: {
            type: 'number',
            description: 'Text box height',
          },
          fontFamily: {
            type: 'string',
            description: 'Font family',
          },
          fontSize: {
            type: 'number',
            description: 'Font size',
          },
          color: {
            type: 'string',
            description: 'Text color (hex)',
          },
          bold: {
            type: 'boolean',
            description: 'Bold',
          },
        },
        required: ['text', 'x', 'y', 'width', 'height'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const bounds: Bounds = {
          x: args.x as number,
          y: args.y as number,
          width: args.width as number,
          height: args.height as number,
        };

        const style: Partial<TextStyle> = {};
        if (args.fontFamily) style.fontFamily = args.fontFamily as string;
        if (args.fontSize) style.fontSize = args.fontSize as number;
        if (args.color) style.color = args.color as any;
        if (args.bold !== undefined) style.bold = args.bold as boolean;

        const result = await insertTextAtPosition(
          args.text as string,
          bounds,
          Object.keys(style).length > 0 ? (style as TextStyle) : undefined
        );
        return {
          success: result.success,
          data: { shapeId: result.shapeId },
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to insert text',
        };
      }
    }
  );

  // 工具 6: 获取上下文
  registry.register(
    {
      name: 'ppt_get_context',
      description: 'Get current presentation context (slide count, theme, etc.).',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async (): Promise<ToolResult> => {
      try {
        const context = await getAIContext();
        return {
          success: true,
          data: context,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get context',
        };
      }
    }
  );

  // 工具 7: 生成并插入图片
  registry.register(
    {
      name: 'ppt_generate_and_insert_image',
      description: 'Generate an AI image and insert it into the current slide. Use when user wants to generate/create an image for the slide.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Image generation prompt describing what to create',
          },
          x: {
            type: 'number',
            description: 'X coordinate (0-960), default 50',
          },
          y: {
            type: 'number',
            description: 'Y coordinate (0-540), default 50',
          },
          width: {
            type: 'number',
            description: 'Image width, default 400',
          },
          height: {
            type: 'number',
            description: 'Image height, default 300',
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        // 获取当前状态
        const state = useAppStore.getState();
        const connection = state.getActiveConnection();
        const imageGenConfig = state.imageGenConfig;

        // 检查配置
        if (!connection) {
          return {
            success: false,
            error: '未配置 AI 连接，请在设置中配置',
          };
        }

        // 检查是否支持图片生成（兼容新旧配置）
        const hasImageCapability = !!(connection.capabilities?.image?.model || connection.imageModel);
        if (!hasImageCapability) {
          return {
            success: false,
            error: '当前连接未配置图片生成能力，请在设置中启用图片生成并添加图片模型（如 dall-e-3）',
          };
        }

        // 生成图片
        const imageProvider = createImageGenerationProvider(imageGenConfig, connection);
        const imageResult = await imageProvider.generate({ prompt: args.prompt as string });

        // 插入到幻灯片
        const bounds: Partial<Bounds> = {
          x: (args.x as number) || 50,
          y: (args.y as number) || 50,
          width: (args.width as number) || 400,
          height: (args.height as number) || 300,
        };

        const insertResult = await insertImageToCurrentSlide(imageResult.data, bounds);

        if (!insertResult.success) {
          return {
            success: false,
            error: insertResult.error || '插入图片失败',
          };
        }

        return {
          success: true,
          data: {
            prompt: args.prompt,
            shapeId: insertResult.shapeId,
            imageSize: `${imageResult.width}x${imageResult.height}`,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate and insert image',
        };
      }
    }
  );

  // 工具 8: 生成并设置背景
  registry.register(
    {
      name: 'ppt_generate_and_set_background',
      description: 'Generate an AI image and set it as the background of the current slide. Use when user wants to generate/create a background image.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Background image generation prompt',
          },
          transparency: {
            type: 'number',
            description: 'Background transparency (0-1), default 0',
          },
        },
        required: ['prompt'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        // 获取当前状态
        const state = useAppStore.getState();
        const connection = state.getActiveConnection();
        const imageGenConfig = state.imageGenConfig;

        // 检查配置
        if (!connection) {
          return {
            success: false,
            error: '未配置 AI 连接，请在设置中配置',
          };
        }

        // 检查是否支持图片生成（兼容新旧配置）
        const hasImageCapability = !!(connection.capabilities?.image?.model || connection.imageModel);
        if (!hasImageCapability) {
          return {
            success: false,
            error: '当前连接未配置图片生成能力，请在设置中启用图片生成并添加图片模型（如 dall-e-3）',
          };
        }

        // 生成图片
        const imageProvider = createImageGenerationProvider(imageGenConfig, connection);
        const imageResult = await imageProvider.generate({ prompt: args.prompt as string });

        // 设置为背景
        const bgResult = await setSlideBackground(imageResult.data, {
          transparency: (args.transparency as number) || 0,
        });

        if (!bgResult.success) {
          return {
            success: false,
            error: bgResult.error || '设置背景失败',
          };
        }

        return {
          success: true,
          data: {
            prompt: args.prompt,
            method: bgResult.method,
            imageSize: `${imageResult.width}x${imageResult.height}`,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate and set background',
        };
      }
    }
  );
}
