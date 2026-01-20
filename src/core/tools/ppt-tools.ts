import type { ToolDefinition } from '@/types';
import type { ToolRegistry, ToolResult } from './registry';
import {
  applySlideSpec,
  insertImageToCurrentSlide,
  setSlideBackground,
  replaceSelectionWithFormat,
  insertTextAtPosition,
  replaceSlideContent,
  updateSlideElement,
} from '@adapters/powerpoint/slide-renderer';
import { getAIContext, getPresentationOutline, getCurrentSlideDetail } from '@adapters/powerpoint/context';
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

  // 工具 3: 设置背景 - 已禁用（使用形状插入图片替代）
  /*
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
  */

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
      description: 'Generate an AI image and insert it into the current slide WITHOUT removing existing content. Use when user wants to ADD/INSERT/APPEND an image (e.g., "add a decorative image", "insert an icon", "add an illustration"). This is NON-DESTRUCTIVE - it preserves all existing content.',
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

  // 工具 6: 生成并设置背景 - 已禁用（使用形状插入图片替代）
  /*
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
  */

  // 工具 7: 获取演示文稿大纲
  registry.register(
    {
      name: 'ppt_get_outline',
      description: 'Get presentation outline with all slide titles. Use when user asks about the overall structure or wants to know what slides exist.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async (): Promise<ToolResult> => {
      try {
        const outline = await getPresentationOutline();

        return {
          success: true,
          data: {
            totalSlides: outline.totalSlides,
            slides: outline.slides.map((slide) => ({
              index: slide.index + 1, // 1-based for user display
              title: slide.title,
              hasImages: slide.hasImages,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get presentation outline',
        };
      }
    }
  );

  // 工具 8: 获取特定幻灯片的详细信息
  registry.register(
    {
      name: 'ppt_get_slide_detail',
      description: 'Get detailed information about the current slide including title, full text, text shapes, and images. Use this tool in two scenarios: 1) When user asks about a specific slide content, 2) BEFORE modifying a slide (e.g., before calling ppt_update_slide_element) to understand the current content, format, and structure so you can preserve them when making changes.',
      parameters: {
        type: 'object',
        properties: {
          slideIndex: {
            type: 'number',
            description: 'Slide index (1-based, e.g., 1 for first slide)',
          },
        },
        required: ['slideIndex'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const slideIndex = (args.slideIndex as number) - 1; // Convert to 0-based

        // 注意：PowerPoint API 限制，我们只能获取当前选中的幻灯片详情
        // 这个工具实际上会返回当前幻灯片的详情
        // 在未来可以扩展为切换到指定幻灯片后再获取详情
        const detail = await getCurrentSlideDetail();

        if (!detail) {
          return {
            success: false,
            error: '无法获取幻灯片详情，请确保已选中幻灯片',
          };
        }

        // 如果请求的不是当前幻灯片，返回提示
        if (detail.index !== slideIndex) {
          return {
            success: false,
            error: `当前只能获取已选中幻灯片的详情。当前选中第 ${detail.index + 1} 页，但请求的是第 ${slideIndex + 1} 页。请用户切换到该页后再试。`,
          };
        }

        return {
          success: true,
          data: {
            index: detail.index + 1, // 1-based
            title: detail.title,
            fullText: detail.fullText,
            images: detail.shapes
              .filter((s) => s.type === 'image')
              .map((img) => ({
                id: img.id,
                description: img.imageDescription,
              })),
            textShapes: detail.shapes
              .filter((s) => s.type === 'text')
              .map((txt, idx) => ({
                index: idx, // 0-based index for use with ppt_update_slide_element
                id: txt.id,
                text: txt.text,
              })),
            note: 'Each textShape has an index (0-based). Use this index with ppt_update_slide_element when elementType is "text".',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get slide detail',
        };
      }
    }
  );

  // 工具 9: 替换当前幻灯片的所有内容
  registry.register(
    {
      name: 'ppt_replace_slide_content',
      description: 'Replace ALL content on the current slide with new content. DESTRUCTIVE: This will DELETE all existing shapes and rebuild from scratch. Use ONLY when user explicitly asks to REDESIGN/REDO/RECREATE/BEAUTIFY the ENTIRE current slide. DO NOT use for adding/inserting new elements - use ppt_generate_and_insert_image or ppt_update_slide_element instead.',
      parameters: {
        type: 'object',
        properties: {
          layout: {
            type: 'string',
            enum: ['title-content', 'title-image', 'title-only', 'blank'],
            description: 'Layout template for the new content',
          },
          title: {
            type: 'string',
            description: 'New slide title',
          },
          content: {
            type: 'array',
            items: { type: 'string' },
            description: 'New content bullet points',
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
        // 如果包含图片，强制使用支持图片的布局
        let layout = args.layout as string;
        if (args.includeImage && args.imagePrompt) {
          if (layout === 'title-content' || layout === 'title-only') {
            layout = 'title-image'; // 自动切换到支持图片的布局
            console.log('[ppt_replace_slide_content] Auto-switched layout to title-image for image support');
          }
        }

        const spec: SlideSpec = {
          version: '1.0',
          layout: {
            template: layout as any,
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

        const result = await replaceSlideContent(spec);
        return {
          success: result.success,
          data: {
            slideId: result.slideId,
            slideIndex: result.slideIndex,
            message: '已替换当前幻灯片的所有内容',
          },
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to replace slide content',
        };
      }
    }
  );

  // 工具 10: 更新当前幻灯片的特定元素
  registry.register(
    {
      name: 'ppt_update_slide_element',
      description: 'Update ONE specific text element or add image on the current slide. CRITICAL RULES: 1) This tool updates ONLY ONE text box per call - if user wants to modify multiple elements (e.g., title AND speaker AND date), you MUST call this tool MULTIPLE TIMES, once for each element. 2) When updating text with labels/prefixes (e.g., "Speaker: John"), you MUST output the COMPLETE string including the label (e.g., "Speaker: Mike"), otherwise the label will be lost. 3) Use the textIndex from the context to target specific text boxes. Example: User says "Change title to X, speaker to Y, date to Z" → You must make 3 separate calls with textIndex 0, 1, 2.',
      parameters: {
        type: 'object',
        properties: {
          elementType: {
            type: 'string',
            enum: ['title', 'body', 'text', 'image'],
            description: 'Type of element to update: "title" for the topmost text (usually slide title), "body" for the second text element (usually main content), "text" for any text element by index (use with textIndex parameter), "image" to add an image',
          },
          textIndex: {
            type: 'number',
            description: 'Index of the text element to update (0-based, where 0 is the topmost text). Only used when elementType is "text". Use this when you need to update a specific text element that is not the title or body (e.g., subtitle, date, author name).',
          },
          content: {
            type: 'string',
            description: 'New content for the element. For text elements, this is the new text. For images, this should be base64-encoded image data.',
          },
          action: {
            type: 'string',
            enum: ['replace', 'append'],
            description: 'Action to perform: "replace" to replace existing content (default), "append" to add to existing content. Only applies to text elements.',
          },
          x: {
            type: 'number',
            description: 'X coordinate for image placement (0-960), only used when elementType is "image"',
          },
          y: {
            type: 'number',
            description: 'Y coordinate for image placement (0-540), only used when elementType is "image"',
          },
          width: {
            type: 'number',
            description: 'Width for image, only used when elementType is "image"',
          },
          height: {
            type: 'number',
            description: 'Height for image, only used when elementType is "image"',
          },
        },
        required: ['elementType', 'content'],
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const options: any = {
          action: (args.action as string) || 'replace',
        };

        // 处理 textIndex 参数
        if (args.elementType === 'text' && args.textIndex !== undefined) {
          options.textIndex = args.textIndex as number;
        }

        if (args.elementType === 'image' && (args.x || args.y || args.width || args.height)) {
          options.bounds = {
            x: (args.x as number) || 50,
            y: (args.y as number) || 110,
            width: (args.width as number) || 400,
            height: (args.height as number) || 300,
          };
        }

        const result = await updateSlideElement(
          args.elementType as 'title' | 'body' | 'text' | 'image',
          args.content as string,
          options
        );

        return {
          success: result.success,
          data: {
            shapeId: result.shapeId,
            elementType: args.elementType,
            textIndex: args.textIndex,
            action: options.action,
            message: `已${options.action === 'append' ? '追加' : '更新'}${args.elementType === 'title' ? '标题' : args.elementType === 'body' ? '正文' : args.elementType === 'text' ? `文本框${args.textIndex}` : '图片'}`,
          },
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update slide element',
        };
      }
    }
  );
}
