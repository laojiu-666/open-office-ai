import type {
  SlideSpec,
  TextBlockSpec,
  ImageBlockSpec,
  ApplySlideSpecResult,
  TextStyle,
  ImageAsset,
  Bounds,
  BackgroundSpec,
} from '@/types';
import { composeTiledBackground, getImageDimensions } from './canvas-tiler';

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
  console.log('[applySlideSpec] Starting with layout:', spec.layout.template, 'blocks:', spec.blocks.length);

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

        // 应用背景（在添加内容之前）
        if (spec.background) {
          const slideSize = { width: 960, height: 540 }; // 默认尺寸
          const bgResult = await applyBackground(context, newSlide, spec, spec.assets, slideSize);
          console.log('[applySlideSpec] Background result:', bgResult);
        }

        // 获取布局配置
        const layoutConfig = DEFAULT_LAYOUTS[spec.layout.template] || DEFAULT_LAYOUTS['title-content'];
        // 始终使用默认布局的 slots（因为 AI 返回的 slots 可能是字符串数组或空数组）
        const slots = layoutConfig.slots;
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

    // 应用下划线
    if (style?.underline !== undefined) {
      font.underline = style.underline
        ? PowerPoint.ShapeFontUnderlineStyle.single
        : PowerPoint.ShapeFontUnderlineStyle.none;
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
 * 注意：PowerPoint JS API 没有直接的 addImage 方法
 * 优先使用 PowerPointApi 1.8+ 的 fill.setImage，降级使用 setSelectedDataAsync
 */
async function addImageShape(
  context: PowerPoint.RequestContext,
  slide: PowerPoint.Slide,
  asset: ImageAsset,
  bounds: Bounds
): Promise<string | null> {
  try {
    // 确保 base64 数据格式正确
    let imageData = asset.data!;
    let pureBase64 = imageData;

    // 如果数据包含 data URL 前缀，提取纯 base64
    if (imageData.startsWith('data:')) {
      const base64Index = imageData.indexOf('base64,');
      if (base64Index !== -1) {
        pureBase64 = imageData.substring(base64Index + 7);
      }
    }

    // 清理 base64 数据：移除所有空白字符
    pureBase64 = pureBase64.replace(/\s/g, '');

    // 验证 base64 数据
    if (!pureBase64 || pureBase64.length === 0) {
      console.error('[addImageShape] Image data is empty');
      return null;
    }

    // 验证 base64 格式
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(pureBase64)) {
      console.error('[addImageShape] Invalid base64 format');
      return null;
    }

    console.log('[addImageShape] Image data length:', pureBase64.length);

    // 方案 1: 使用 PowerPointApi 1.8+ 的 fill.setImage（推荐）
    if (Office.context.requirements.isSetSupported('PowerPointApi', '1.8')) {
      try {
        // 创建矩形形状
        const shape = slide.shapes.addGeometricShape(PowerPoint.GeometricShapeType.rectangle, {
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });

        // 加载 fill 属性
        shape.load(['id', 'fill']);
        await context.sync();

        // 先设置白色背景，避免透明问题
        shape.fill.setSolidColor('white');
        await context.sync();

        // 设置图片填充
        shape.fill.setImage(pureBase64);

        // 移除边框线条
        shape.lineFormat.visible = false;

        await context.sync();

        console.log('[addImageShape] Image inserted using fill.setImage (API 1.8+)');
        return shape.id;
      } catch (error) {
        console.warn('[addImageShape] fill.setImage failed, trying fallback:', error);
        // 继续尝试降级方案
      }
    }

    // 方案 2: 降级使用 setSelectedDataAsync（兼容低版本）
    console.log('[addImageShape] Using setSelectedDataAsync fallback for low version PowerPoint');

    // 确保数据是 data URL 格式
    let dataUrl = imageData;
    if (!dataUrl.startsWith('data:')) {
      dataUrl = `data:image/png;base64,${pureBase64}`;
    }

    // 使用 setSelectedDataAsync 插入图片
    return new Promise<string | null>((resolve) => {
      Office.context.document.setSelectedDataAsync(
        dataUrl,
        { coercionType: Office.CoercionType.Image },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('[addImageShape] Image inserted using setSelectedDataAsync (legacy)');
            // 注意：setSelectedDataAsync 不返回 shape ID
            resolve('legacy-image');
          } else {
            console.error('[addImageShape] setSelectedDataAsync failed:', result.error?.message);
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    console.error('[addImageShape] Failed to add image shape:', error);
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
 * 优先使用 PowerPointApi 1.8+ 的 fill.setImage，降级使用 setSelectedDataAsync
 */
export async function insertImageToCurrentSlide(
  imageData: string,
  bounds?: Partial<Bounds>
): Promise<{ success: boolean; shapeId?: string; error?: string }> {
  // 检测 API 支持情况
  const api18Supported = Office.context.requirements.isSetSupported('PowerPointApi', '1.8');

  console.log('[insertImageToCurrentSlide] API 1.8 Support:', api18Supported);
  console.log('[insertImageToCurrentSlide] Office host:', Office.context.host);
  console.log('[insertImageToCurrentSlide] Platform:', Office.context.platform);

  // 检查 API 1.8 支持
  if (!api18Supported) {
    const errorMsg = '当前 PowerPoint 版本不支持图片插入功能（需要 API 1.8+）。请升级到 PowerPoint 2016 或更高版本。';
    console.error('[insertImageToCurrentSlide]', errorMsg);
    return { success: false, error: errorMsg };
  }

  console.log('[insertImageToCurrentSlide] Using PowerPoint API 1.8+ (fill.setImage)');

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

        // 确保 base64 数据格式正确
        let processedImageData = imageData;
        if (processedImageData.startsWith('data:')) {
          const base64Index = processedImageData.indexOf('base64,');
          if (base64Index !== -1) {
            processedImageData = processedImageData.substring(base64Index + 7);
          }
        }

        // 清理 base64 数据：移除所有空白字符（空格、换行、制表符等）
        processedImageData = processedImageData.replace(/\s/g, '');

        // 验证 base64 数据
        if (!processedImageData || processedImageData.length === 0) {
          resolve({ success: false, error: '图片数据为空' });
          return;
        }

        // 验证 base64 格式（只包含合法字符）
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(processedImageData)) {
          resolve({ success: false, error: '图片数据格式无效' });
          return;
        }

        console.log('[insertImageToCurrentSlide] Base64 length:', processedImageData.length);
        console.log('[insertImageToCurrentSlide] Base64 preview:', processedImageData.substring(0, 50) + '...');

        // 创建矩形形状并设置图片填充
        const shape = slide.shapes.addGeometricShape(PowerPoint.GeometricShapeType.rectangle, {
          left: defaultBounds.x,
          top: defaultBounds.y,
          width: defaultBounds.width,
          height: defaultBounds.height,
        });

        // 加载 fill 属性
        shape.load(['id', 'fill']);
        await context.sync();

        console.log('[insertImageToCurrentSlide] Shape created, ID:', shape.id);

        // 设置图片填充
        try {
          console.log('[insertImageToCurrentSlide] Setting image fill...');
          shape.fill.setSolidColor('white'); // 先设置白色背景，避免透明问题
          await context.sync();

          shape.fill.setImage(processedImageData);
          await context.sync();

          console.log('[insertImageToCurrentSlide] Image fill set successfully');
        } catch (fillError) {
          console.error('[insertImageToCurrentSlide] fill.setImage error:', fillError);
          throw new Error(`设置图片填充失败: ${fillError instanceof Error ? fillError.message : '未知错误'}`);
        }

        // 移除边框线条
        shape.lineFormat.visible = false;

        await context.sync();

        console.log('[insertImageToCurrentSlide] Image inserted successfully, shape ID:', shape.id);
        resolve({ success: true, shapeId: shape.id });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '插入图片失败';
        console.error('[insertImageToCurrentSlide] Error:', error);
        resolve({
          success: false,
          error: errorMsg,
        });
      }
    }).catch((error) => {
      console.error('[insertImageToCurrentSlide] PowerPoint.run failed:', error);
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
                // 尝试获取选中的形状（需要较新版本的 PowerPointApi）
                const shapesAny = slide.shapes as any;
                if (typeof shapesAny.getSelectedShapes !== 'function') {
                  return; // API 不支持
                }
                const selectedShapes = shapesAny.getSelectedShapes();
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

/**
 * 背景应用结果
 */
export interface ApplyBackgroundResult {
  applied: boolean;
  method?: 'background-api' | 'shape-fallback';
  error?: string;
}

/**
 * 应用背景到幻灯片
 */
async function applyBackground(
  context: PowerPoint.RequestContext,
  slide: PowerPoint.Slide,
  spec: SlideSpec,
  assets: ImageAsset[] | undefined,
  slideSize: { width: number; height: number }
): Promise<ApplyBackgroundResult> {
  const bgSpec = spec.background;
  if (!bgSpec) {
    return { applied: false, error: 'no_background_spec' };
  }

  // 查找背景资源
  const asset = assets?.find((a) => a.id === bgSpec.assetId);
  if (!asset || !asset.data) {
    return { applied: false, error: 'background_asset_missing' };
  }

  // 处理 base64 数据
  let imageData = asset.data;
  if (imageData.startsWith('data:')) {
    const base64Index = imageData.indexOf('base64,');
    if (base64Index !== -1) {
      imageData = imageData.substring(base64Index + 7);
    }
  }

  // 清理 base64 数据：移除所有空白字符
  imageData = imageData.replace(/\s/g, '');

  // 验证 base64 数据
  if (!imageData || imageData.length === 0) {
    return { applied: false, error: 'background_data_empty' };
  }

  // 验证 base64 格式
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(imageData)) {
    return { applied: false, error: 'background_data_invalid' };
  }

  console.log('[applyBackground] Base64 length:', imageData.length);

  // 如果是平铺模式，先合成平铺图
  if (bgSpec.mode === 'tile' && bgSpec.tile) {
    const tileResult = await composeTiledBackground(imageData, {
      slideWidth: slideSize.width,
      slideHeight: slideSize.height,
      tileWidth: bgSpec.tile.width,
      tileHeight: bgSpec.tile.height,
      scale: bgSpec.tile.scale,
    });

    if (!tileResult.success || !tileResult.data) {
      // 平铺失败，尝试降级为拉伸模式
      if (bgSpec.allowFallback !== false) {
        console.warn('[applyBackground] Tile composition failed, falling back to stretch mode');
      } else {
        return { applied: false, error: `background_compose_failed: ${tileResult.error}` };
      }
    } else {
      imageData = tileResult.data;
    }
  }

  // 尝试使用原生背景 API（PowerPointApi 1.10+）
  const apiSupported = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');

  if (apiSupported) {
    try {
      const slideAny = slide as any;
      if (slideAny.background && slideAny.background.fill) {
        // 设置不跟随母版背景
        slideAny.background.isMasterBackgroundFollowed = false;
        await context.sync();

        // 设置背景图片
        const transparency = Math.max(0, Math.min(1, bgSpec.transparency ?? 0));
        slideAny.background.fill.setPictureOrTextureFill({
          imageBase64: imageData,
          transparency: transparency,
        });
        await context.sync();

        return { applied: true, method: 'background-api' };
      }
    } catch (error) {
      console.warn('[applyBackground] Native API failed:', error);
      // 降级到形状方式
    }
  }

  // 降级：使用全幅图片形状作为背景
  if (bgSpec.allowFallback !== false) {
    // 检查 fill.setImage API 支持（需要 1.8+）
    if (!Office.context.requirements.isSetSupported('PowerPointApi', '1.8')) {
      return { applied: false, error: 'background_api_unsupported_need_1.8' };
    }

    try {
      // 创建矩形形状并设置图片填充
      const shape = slide.shapes.addGeometricShape(PowerPoint.GeometricShapeType.rectangle, {
        left: 0,
        top: 0,
        width: slideSize.width,
        height: slideSize.height,
      });

      // 加载 fill 属性
      shape.load(['id', 'fill']);
      await context.sync();

      // 先设置白色背景，避免透明问题
      shape.fill.setSolidColor('white');
      await context.sync();

      // 设置图片填充
      shape.fill.setImage(imageData);

      // 移除边框线条
      shape.lineFormat.visible = false;

      await context.sync();

      // 尝试将形状移到最底层（如果 API 支持）
      try {
        const shapeAny = shape as any;
        if (shapeAny.zOrderPosition !== undefined) {
          shapeAny.zOrderPosition = 0;
          await context.sync();
        }
      } catch {
        // Z-order API 不支持，忽略
      }

      return { applied: true, method: 'shape-fallback' };
    } catch (error) {
      return {
        applied: false,
        error: `background_shape_failed: ${error instanceof Error ? error.message : 'unknown'}`,
      };
    }
  }

  return { applied: false, error: 'background_api_unsupported' };
}

/**
 * 设置当前幻灯片背景
 * 独立函数，用于测试页面直接调用
 * 注意：背景设置需要 PowerPointApi 1.8+ 支持 fill.setImage
 * 如果只需要插入图片（非背景），请使用 insertImageToCurrentSlide
 */
export async function setSlideBackground(
  imageData: string,
  options?: {
    transparency?: number;
  }
): Promise<{ success: boolean; method?: string; error?: string }> {
  // 检查 API 版本支持（背景设置至少需要 1.8+ 的 fill.setImage）
  if (!Office.context.requirements.isSetSupported('PowerPointApi', '1.8')) {
    return {
      success: false,
      error: '您的 PowerPoint 版本不支持背景设置功能（需要 PowerPointApi 1.8+）。如需插入图片，请使用图片插入功能。',
    };
  }

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

        // 处理 base64 数据
        let processedImageData = imageData;
        if (processedImageData.startsWith('data:')) {
          const base64Index = processedImageData.indexOf('base64,');
          if (base64Index !== -1) {
            processedImageData = processedImageData.substring(base64Index + 7);
          }
        }

        // 获取实际幻灯片尺寸
        let slideSize = { width: 960, height: 540 };
        try {
          if (Office.context.requirements.isSetSupported('PowerPointApi', '1.10')) {
            const presentation = context.presentation;
            const pageSetup = (presentation as any).pageSetup;
            if (pageSetup) {
              pageSetup.load(['slideWidth', 'slideHeight']);
              await context.sync();
              slideSize = {
                width: pageSetup.slideWidth ?? 960,
                height: pageSetup.slideHeight ?? 540,
              };
              console.log('[setSlideBackground] Slide size:', slideSize);
            }
          }
        } catch (error) {
          // 获取尺寸失败，使用默认值
          console.log('[setSlideBackground] Failed to get slide size, using default:', slideSize, error);
        }

        // 尝试原生背景 API（需要 1.10+）
        const bgApiSupported = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');
        console.log('[setSlideBackground] Background API supported:', bgApiSupported);

        if (bgApiSupported) {
          try {
            const slideAny = slide as any;
            if (slideAny.background && slideAny.background.fill) {
              console.log('[setSlideBackground] Using native background API');
              slideAny.background.isMasterBackgroundFollowed = false;
              await context.sync();

              // 注意：setPictureOrTextureFill 需要纯 base64 字符串（不带 data: 前缀）
              // 并且 transparency 参数在某些版本中可能不支持
              try {
                slideAny.background.fill.setPictureOrTextureFill({
                  imageBase64: processedImageData,
                });
                await context.sync();
                console.log('[setSlideBackground] setPictureOrTextureFill completed');

                resolve({ success: true, method: 'background-api' });
                return;
              } catch (fillError) {
                console.warn('[setSlideBackground] setPictureOrTextureFill failed, trying fallback:', fillError);
                // 继续尝试降级方案
              }
            }
          } catch (error) {
            console.warn('[setSlideBackground] Native API failed:', error);
          }
        }

        // 降级：使用全幅图片形状（需要 1.8+ 的 fill.setImage）
        const shape = slide.shapes.addGeometricShape(PowerPoint.GeometricShapeType.rectangle, {
          left: 0,
          top: 0,
          width: slideSize.width,
          height: slideSize.height,
        });

        // 加载 fill 属性
        shape.load(['id', 'fill']);
        await context.sync();

        // 设置图片填充
        shape.fill.setImage(processedImageData);

        // 移除边框线条
        shape.lineFormat.visible = false;

        await context.sync();

        resolve({ success: true, method: 'shape-fallback' });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '设置背景失败';
        console.error('[setSlideBackground] Error:', error);
        resolve({
          success: false,
          error: errorMsg,
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
 * 替换当前幻灯片的所有内容
 * 清空当前幻灯片的所有形状，然后应用新的 SlideSpec
 */
export async function replaceSlideContent(spec: SlideSpec): Promise<ApplySlideSpecResult> {
  console.log('[replaceSlideContent] Starting with layout:', spec.layout.template);

  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      try {
        // 获取当前选中的幻灯片
        const selectedSlides = context.presentation.getSelectedSlides();
        selectedSlides.load('items');
        await context.sync();

        if (selectedSlides.items.length === 0) {
          resolve({ success: false, error: '请先选择一个幻灯片' });
          return;
        }

        const currentSlide = selectedSlides.items[0];
        currentSlide.load('id');
        await context.sync();

        console.log('[replaceSlideContent] Current slide ID:', currentSlide.id);

        // 清空当前幻灯片的所有形状
        const shapes = currentSlide.shapes;
        shapes.load('items');
        await context.sync();

        console.log('[replaceSlideContent] Removing', shapes.items.length, 'existing shapes');
        for (const shape of shapes.items) {
          try {
            shape.delete();
          } catch (e) {
            console.warn('[replaceSlideContent] Failed to delete shape:', e);
          }
        }
        await context.sync();

        // 尝试重置背景（如果 API 支持）
        if (Office.context.requirements.isSetSupported('PowerPointApi', '1.10')) {
          try {
            const slideAny = currentSlide as any;
            if (slideAny.background) {
              slideAny.background.isMasterBackgroundFollowed = true; // 恢复跟随母版
              await context.sync();
            }
          } catch (e) {
            console.warn('[replaceSlideContent] Failed to reset background:', e);
          }
        }

        const createdShapeIds: string[] = [];

        // 应用背景（如果有）
        if (spec.background) {
          const slideSize = { width: 960, height: 540 };
          const bgResult = await applyBackground(context, currentSlide, spec, spec.assets, slideSize);
          console.log('[replaceSlideContent] Background result:', bgResult);
        }

        // 获取布局配置
        const layoutConfig = DEFAULT_LAYOUTS[spec.layout.template] || DEFAULT_LAYOUTS['title-content'];
        const slots = layoutConfig.slots;
        console.log('[replaceSlideContent] Using layout:', spec.layout.template, 'slots:', slots);

        // 处理每个内容块
        for (const block of spec.blocks) {
          console.log('[replaceSlideContent] Processing block:', block);
          const slot = slots.find((s) => s.id === block.slotId);
          if (!slot) {
            console.log('[replaceSlideContent] No slot found for slotId:', block.slotId);
            continue;
          }

          if (block.kind === 'text') {
            const shapeId = await addTextShape(context, currentSlide, block, slot.bounds, spec.theme);
            console.log('[replaceSlideContent] Added text shape:', shapeId);
            if (shapeId) createdShapeIds.push(shapeId);
          } else if (block.kind === 'image') {
            const asset = spec.assets?.find((a) => a.id === block.assetId);
            if (asset && asset.data) {
              const shapeId = await addImageShape(context, currentSlide, asset, slot.bounds);
              console.log('[replaceSlideContent] Added image shape:', shapeId);
              if (shapeId) createdShapeIds.push(shapeId);
            }
          }
        }

        // 获取当前幻灯片索引
        const presentation = context.presentation;
        const slides = presentation.slides;
        slides.load('items');
        await context.sync();

        let slideIndex = -1;
        for (let i = 0; i < slides.items.length; i++) {
          slides.items[i].load('id');
        }
        await context.sync();

        for (let i = 0; i < slides.items.length; i++) {
          if (slides.items[i].id === currentSlide.id) {
            slideIndex = i;
            break;
          }
        }

        console.log('[replaceSlideContent] Success! slideIndex:', slideIndex);
        resolve({
          success: true,
          slideId: currentSlide.id,
          slideIndex,
          createdShapeIds,
        });
      } catch (error) {
        console.error('[replaceSlideContent] Error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '替换幻灯片内容失败',
        });
      }
    }).catch((error) => {
      console.error('[replaceSlideContent] PowerPoint.run error:', error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'PowerPoint API 调用失败',
      });
    });
  });
}

/**
 * 更新当前幻灯片的特定元素
 * 支持更新标题、正文或添加图片，不影响其他内容
 */
export async function updateSlideElement(
  elementType: 'title' | 'body' | 'text' | 'image',
  content: string,
  options?: {
    action?: 'replace' | 'append';
    bounds?: Bounds;
    style?: TextStyle;
    textIndex?: number;
  }
): Promise<{ success: boolean; shapeId?: string; error?: string }> {
  console.log('[updateSlideElement] Type:', elementType, 'TextIndex:', options?.textIndex, 'Action:', options?.action || 'replace');

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

        if (elementType === 'image') {
          // 添加图片（增量操作）
          const defaultBounds: Bounds = options?.bounds || {
            x: 50,
            y: 110,
            width: 400,
            height: 300,
          };

          const shape = slide.shapes.addGeometricShape(PowerPoint.GeometricShapeType.rectangle, {
            left: defaultBounds.x,
            top: defaultBounds.y,
            width: defaultBounds.width,
            height: defaultBounds.height,
          });

          shape.load(['id', 'fill']);
          await context.sync();

          // 处理 base64 数据
          let imageData = content;
          if (imageData.startsWith('data:')) {
            const base64Index = imageData.indexOf('base64,');
            if (base64Index !== -1) {
              imageData = imageData.substring(base64Index + 7);
            }
          }
          imageData = imageData.replace(/\s/g, '');

          shape.fill.setSolidColor('white');
          await context.sync();

          shape.fill.setImage(imageData);
          shape.lineFormat.visible = false;
          await context.sync();

          resolve({ success: true, shapeId: shape.id });
          return;
        }

        // 处理文本元素（标题或正文）
        const shapes = slide.shapes;
        shapes.load('items');
        await context.sync();

        console.log('[updateSlideElement] Total shapes:', shapes.items.length);

        // 批量加载所有形状的基本信息
        for (const shape of shapes.items) {
          shape.load(['id', 'type', 'top', 'left', 'width', 'height']);
        }
        await context.sync();

        // 调试：输出所有形状信息
        for (const shape of shapes.items) {
          console.log('[updateSlideElement] Shape:', {
            id: shape.id,
            type: shape.type,
            top: shape.top,
            left: shape.left,
          });
        }

        // 筛选出所有文本形状并按 top 位置排序
        // 注意：需要单独检查每个形状是否有 textFrame
        const textShapes: PowerPoint.Shape[] = [];
        for (const shape of shapes.items) {
          try {
            shape.load('textFrame');
            await context.sync();
            if (shape.textFrame) {
              textShapes.push(shape);
            }
          } catch (e) {
            // 某些形状可能没有 textFrame，忽略错误
            console.log('[updateSlideElement] Shape has no textFrame:', shape.id);
          }
        }

        // 按 top 位置排序
        textShapes.sort((a, b) => a.top - b.top);

        console.log('[updateSlideElement] Text shapes count:', textShapes.length);

        // 查找目标形状
        let targetShape: PowerPoint.Shape | null = null;
        let targetBounds: Bounds;

        if (elementType === 'title') {
          // 标题：选择最上面的文本形状
          if (textShapes.length > 0) {
            targetShape = textShapes[0];
            console.log('[updateSlideElement] Found title shape (topmost):', {
              id: targetShape.id,
              top: targetShape.top,
            });
          } else {
            console.warn('[updateSlideElement] No text shapes found for title');
          }
          targetBounds = { x: 50, y: 30, width: 860, height: 60 };
        } else if (elementType === 'body') {
          // body: 选择第二个文本形状（如果只有一个，则创建新的）
          if (textShapes.length > 1) {
            targetShape = textShapes[1];
            console.log('[updateSlideElement] Found body shape (second):', {
              id: targetShape.id,
              top: targetShape.top,
            });
          } else {
            console.warn('[updateSlideElement] No second text shape found for body');
          }
          targetBounds = { x: 50, y: 110, width: 860, height: 380 };
        } else if (elementType === 'text') {
          // text: 按 textIndex 选择
          const index = options?.textIndex ?? 0;
          if (textShapes.length > index) {
            targetShape = textShapes[index];
            console.log('[updateSlideElement] Found text shape by index:', {
              index,
              id: targetShape.id,
              top: targetShape.top,
            });
          } else {
            console.warn('[updateSlideElement] No text shape found at index:', index);
          }
          targetBounds = { x: 50, y: 110, width: 860, height: 380 };
        }

        if (targetShape) {
          // 更新现有形状
          console.log('[updateSlideElement] Found existing shape:', targetShape.id);

          // 加载 textFrame
          targetShape.load('textFrame');
          await context.sync();

          // 检查是否有 textFrame
          if (!targetShape.textFrame) {
            console.warn('[updateSlideElement] Shape has no textFrame, creating new shape');
            targetShape = null; // 标记为 null，后面会创建新形状
          } else {
            targetShape.textFrame.load('textRange');
            await context.sync();

            const textRange = targetShape.textFrame.textRange;

            // 保留原有格式：先读取当前字体样式
            let preservedStyle: any = null;
            try {
              textRange.load(['text', 'font']);
              await context.sync();

              const originalFont = textRange.font;
              originalFont.load(['name', 'size', 'bold', 'italic', 'color']);
              await context.sync();

              // 保存原有样式
              preservedStyle = {
                fontFamily: originalFont.name,
                fontSize: originalFont.size,
                bold: originalFont.bold,
                italic: originalFont.italic,
                color: originalFont.color,
              };

              console.log('[updateSlideElement] Preserved style:', preservedStyle);
            } catch (styleError) {
              console.warn('[updateSlideElement] Failed to read original style:', styleError);
              // 继续执行，不保留样式
            }

            // 更新文本内容
            if (options?.action === 'append') {
              textRange.text = textRange.text + '\n' + content;
            } else {
              textRange.text = content;
            }

            await context.sync();

            // 重新应用原有样式（因为修改文本后可能丢失格式）
            if (preservedStyle) {
              try {
                textRange.load('font');
                await context.sync();
                const font = textRange.font;

                // 优先使用传入的样式，否则使用原有样式
                if (options?.style) {
                  if (options.style.fontFamily) font.name = options.style.fontFamily;
                  else font.name = preservedStyle.fontFamily;

                  if (options.style.fontSize) font.size = options.style.fontSize;
                  else font.size = preservedStyle.fontSize;

                  if (options.style.bold !== undefined) font.bold = options.style.bold;
                  else font.bold = preservedStyle.bold;

                  if (options.style.italic !== undefined) font.italic = options.style.italic;
                  else font.italic = preservedStyle.italic;

                  if (options.style.color) {
                    const color = options.style.color.startsWith('#')
                      ? options.style.color.slice(1)
                      : options.style.color;
                    font.color = color;
                  } else {
                    font.color = preservedStyle.color;
                  }
                } else {
                  // 没有传入样式，完全使用原有样式
                  font.name = preservedStyle.fontFamily;
                  font.size = preservedStyle.fontSize;
                  font.bold = preservedStyle.bold;
                  font.italic = preservedStyle.italic;
                  font.color = preservedStyle.color;
                }

                await context.sync();
              } catch (applyStyleError) {
                console.warn('[updateSlideElement] Failed to apply style:', applyStyleError);
                // 继续执行，样式可能不完整
              }
            }

            resolve({ success: true, shapeId: targetShape.id });
            return;
          }
        }

        // 如果没有找到合适的形状，或形状没有 textFrame，创建新形状
        console.log('[updateSlideElement] Creating new text box');
        const newShape = slide.shapes.addTextBox(content, {
          left: targetBounds.x,
          top: targetBounds.y,
          width: targetBounds.width,
          height: targetBounds.height,
        });

        newShape.load(['id', 'textFrame']);
        await context.sync();

        // 应用样式
        if (options?.style) {
          newShape.textFrame.load('textRange');
          await context.sync();
          const textRange = newShape.textFrame.textRange;
          textRange.load('font');
          await context.sync();
          const font = textRange.font;

          if (options.style.fontFamily) font.name = options.style.fontFamily;
          if (options.style.fontSize) font.size = options.style.fontSize;
          if (options.style.bold !== undefined) font.bold = options.style.bold;
          if (options.style.italic !== undefined) font.italic = options.style.italic;
          if (options.style.color) {
            const color = options.style.color.startsWith('#') ? options.style.color.slice(1) : options.style.color;
            font.color = color;
          }
        }

        await context.sync();
        resolve({ success: true, shapeId: newShape.id });
      } catch (error) {
        console.error('[updateSlideElement] Error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '更新元素失败',
        });
      }
    }).catch((error) => {
      console.error('[updateSlideElement] PowerPoint.run error:', error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'PowerPoint API 调用失败',
      });
    });
  });
}

/**
 * 在指定位置插入文本框
 * 独立函数，用于测试页面直接调用
 */
export async function insertTextAtPosition(
  text: string,
  bounds: Bounds,
  style?: TextStyle
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

        const shape = slide.shapes.addTextBox(text, {
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });

        shape.load(['id', 'textFrame']);
        await context.sync();

        // 应用样式
        if (style) {
          await applyTextStyle(context, shape, style);
        }

        resolve({ success: true, shapeId: shape.id });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '插入文本失败',
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
