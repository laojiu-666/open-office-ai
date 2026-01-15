import type {
  SlideSpec,
  TextBlockSpec,
  ImageBlockSpec,
  ApplySlideSpecResult,
  TextStyle,
  ImageAsset,
  Bounds,
} from '@/types';

/**
 * SlideSpec 渲染器
 * 将 SlideSpec 规格应用到 PowerPoint 幻灯片
 */

// 默认布局配置
const DEFAULT_LAYOUTS: Record<string, { slots: Array<{ id: string; bounds: Bounds }> }> = {
  'title-only': {
    slots: [
      { id: 'title', bounds: { x: 50, y: 200, width: 860, height: 100 } },
    ],
  },
  'title-content': {
    slots: [
      { id: 'title', bounds: { x: 50, y: 30, width: 860, height: 60 } },
      { id: 'body', bounds: { x: 50, y: 110, width: 860, height: 380 } },
    ],
  },
  'title-two-content': {
    slots: [
      { id: 'title', bounds: { x: 50, y: 30, width: 860, height: 60 } },
      { id: 'body-left', bounds: { x: 50, y: 110, width: 410, height: 380 } },
      { id: 'body-right', bounds: { x: 500, y: 110, width: 410, height: 380 } },
    ],
  },
  'title-image': {
    slots: [
      { id: 'title', bounds: { x: 50, y: 30, width: 860, height: 60 } },
      { id: 'body', bounds: { x: 50, y: 110, width: 500, height: 380 } },
      { id: 'image', bounds: { x: 570, y: 110, width: 340, height: 380 } },
    ],
  },
  'image-caption': {
    slots: [
      { id: 'image', bounds: { x: 50, y: 30, width: 860, height: 400 } },
      { id: 'caption', bounds: { x: 50, y: 450, width: 860, height: 60 } },
    ],
  },
  'blank': {
    slots: [],
  },
};

/**
 * 应用 SlideSpec 到 PowerPoint
 */
export async function applySlideSpec(spec: SlideSpec): Promise<ApplySlideSpecResult> {
  console.log('[applySlideSpec] Starting with spec:', JSON.stringify(spec, null, 2));

  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      try {
        console.log('[applySlideSpec] Inside PowerPoint.run');

        const presentation = context.presentation;
        const slides = presentation.slides;
        slides.load('items');
        await context.sync();
        console.log('[applySlideSpec] Current slide count:', slides.items.length);

        // 创建新幻灯片 - 使用空白布局
        slides.add();
        await context.sync();

        // 重新加载 slides 以获取新添加的幻灯片
        slides.load('items');
        await context.sync();

        // 获取新创建的幻灯片（最后一个）
        const newSlide = slides.items[slides.items.length - 1];
        if (!newSlide) {
          throw new Error('无法创建新幻灯片');
        }

        newSlide.load('id');
        await context.sync();
        console.log('[applySlideSpec] Created new slide with id:', newSlide.id);

        // 删除新幻灯片上的所有默认形状（占位符）
        const shapes = newSlide.shapes;
        shapes.load('items');
        await context.sync();

        console.log('[applySlideSpec] Removing', shapes.items.length, 'default shapes');
        for (const shape of shapes.items) {
          try {
            shape.delete();
          } catch (e) {
            // 忽略删除失败
          }
        }
        await context.sync();

        const createdShapeIds: string[] = [];

        // 获取布局配置
        const layoutConfig = DEFAULT_LAYOUTS[spec.layout.template] || DEFAULT_LAYOUTS['title-content'];
        const slots = spec.layout.slots.length > 0 ? spec.layout.slots : layoutConfig.slots;
        console.log('[applySlideSpec] Using layout:', spec.layout.template, 'slots:', slots);

        // 处理每个内容块
        for (const block of spec.blocks) {
          console.log('[applySlideSpec] Processing block:', block);
          const slot = slots.find((s) => s.id === block.slotId);
          if (!slot) {
            console.log('[applySlideSpec] No slot found for slotId:', block.slotId);
            continue;
          }

          if (block.kind === 'text') {
            const shapeId = await addTextShape(context, newSlide, block, slot.bounds, spec.theme);
            console.log('[applySlideSpec] Added text shape:', shapeId);
            if (shapeId) createdShapeIds.push(shapeId);
          } else if (block.kind === 'image') {
            const asset = spec.assets?.find((a) => a.id === block.assetId);
            if (asset && asset.data) {
              const shapeId = await addImageShape(context, newSlide, asset, slot.bounds);
              console.log('[applySlideSpec] Added image shape:', shapeId);
              if (shapeId) createdShapeIds.push(shapeId);
            }
          }
        }

        const slideIndex = slides.items.length - 1;

        console.log('[applySlideSpec] Success! slideIndex:', slideIndex);
        resolve({
          success: true,
          slideId: newSlide.id,
          slideIndex,
          createdShapeIds,
        });
      } catch (error) {
        console.error('[applySlideSpec] Error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '幻灯片生成失败',
        });
      }
    }).catch((error) => {
      console.error('[applySlideSpec] PowerPoint.run error:', error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'PowerPoint API 调用失败',
      });
    });
  });
}

/**
 * 添加文本形状
 */
async function addTextShape(
  context: PowerPoint.RequestContext,
  slide: PowerPoint.Slide,
  block: TextBlockSpec,
  bounds: Bounds,
  theme?: SlideSpec['theme']
): Promise<string | null> {
  try {
    // 确保 shapes 集合已加载
    slide.shapes.load('items');
    await context.sync();

    const shape = slide.shapes.addTextBox(block.content, {
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });

    shape.load(['id', 'textFrame']);
    await context.sync();

    // 应用文本样式
    if (block.style || theme) {
      await applyTextStyle(context, shape, block.style, theme);
    }

    return shape.id;
  } catch (error) {
    console.error('Failed to add text shape:', error);
    return null;
  }
}

/**
 * 应用文本样式
 */
async function applyTextStyle(
  context: PowerPoint.RequestContext,
  shape: PowerPoint.Shape,
  style?: TextStyle,
  theme?: SlideSpec['theme']
): Promise<void> {
  try {
    // 确保 textFrame 已加载
    shape.load('textFrame');
    await context.sync();

    if (!shape.textFrame) {
      return;
    }

    shape.textFrame.load('textRange');
    await context.sync();

    const textRange = shape.textFrame.textRange;
    textRange.load('font');
    await context.sync();

    const font = textRange.font;

    // 应用字体
    if (style?.fontFamily) {
      font.name = style.fontFamily;
    } else if (theme?.fonts?.body) {
      font.name = theme.fonts.body;
    }

    // 应用字号
    if (style?.fontSize) {
      font.size = style.fontSize;
    }

    // 应用粗体
    if (style?.bold !== undefined) {
      font.bold = style.bold;
    }

    // 应用斜体
    if (style?.italic !== undefined) {
      font.italic = style.italic;
    }

    // 应用颜色
    if (style?.color) {
      const color = resolveColor(style.color, theme);
      if (color) {
        font.color = color;
      }
    }

    await context.sync();
  } catch (error) {
    console.error('Failed to apply text style:', error);
  }
}

/**
 * 添加图片形状
 */
async function addImageShape(
  context: PowerPoint.RequestContext,
  slide: PowerPoint.Slide,
  asset: ImageAsset,
  bounds: Bounds
): Promise<string | null> {
  try {
    // 使用 base64 数据添加图片
    const shape = slide.shapes.addImage(asset.data!, {
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });

    shape.load('id');
    await context.sync();

    return shape.id;
  } catch (error) {
    console.error('Failed to add image shape:', error);
    return null;
  }
}

/**
 * 解析颜色值
 */
function resolveColor(color: string, theme?: SlideSpec['theme']): string | null {
  if (color.startsWith('#')) {
    // 移除 # 前缀
    return color.slice(1);
  }

  if (color.startsWith('theme:') && theme?.colors) {
    const colorKey = color.replace('theme:', '') as keyof typeof theme.colors;
    const themeColor = theme.colors[colorKey];
    if (themeColor && themeColor.startsWith('#')) {
      return themeColor.slice(1);
    }
  }

  return null;
}

/**
 * 插入图片到当前幻灯片
 */
export async function insertImageToCurrentSlide(
  imageData: string,
  bounds?: Partial<Bounds>
): Promise<{ success: boolean; shapeId?: string; error?: string }> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      try {
        const selectedSlides = context.presentation.getSelectedSlides();
        selectedSlides.load('items');
        await context.sync();

        if (selectedSlides.items.length === 0) {
          resolve({ success: false, error: '请先选择一个幻灯片' });
          return;
        }

        const slide = selectedSlides.items[0];

        // 默认位置和大小
        const defaultBounds: Bounds = {
          x: bounds?.x ?? 100,
          y: bounds?.y ?? 100,
          width: bounds?.width ?? 400,
          height: bounds?.height ?? 300,
        };

        const shape = slide.shapes.addImage(imageData, {
          left: defaultBounds.x,
          top: defaultBounds.y,
          width: defaultBounds.width,
          height: defaultBounds.height,
        });

        shape.load('id');
        await context.sync();

        resolve({ success: true, shapeId: shape.id });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '插入图片失败',
        });
      }
    }).catch((error) => {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'PowerPoint API 调用失败',
      });
    });
  });
}

/**
 * 替换选中文本并应用格式
 */
export async function replaceSelectionWithFormat(
  text: string,
  style?: TextStyle
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // 首先替换文本
    Office.context.document.setSelectedDataAsync(
      text,
      { coercionType: Office.CoercionType.Text },
      async (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          resolve({ success: false, error: result.error?.message || '替换文本失败' });
          return;
        }

        // 如果有样式，尝试应用
        if (style) {
          try {
            await PowerPoint.run(async (context) => {
              const selectedSlides = context.presentation.getSelectedSlides();
              selectedSlides.load('items');
              await context.sync();

              if (selectedSlides.items.length > 0) {
                const slide = selectedSlides.items[0];
                const selectedShapes = slide.shapes.getSelectedShapes();
                selectedShapes.load('items');
                await context.sync();

                if (selectedShapes.items.length > 0) {
                  const shape = selectedShapes.items[0];
                  await applyTextStyle(context, shape, style);
                }
              }
            });
          } catch {
            // 样式应用失败不影响主流程
          }
        }

        resolve({ success: true });
      }
    );
  });
}
