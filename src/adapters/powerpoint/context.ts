import type {
  SlideContext,
  SelectionContext,
  TextStyle,
  ThemeSpec,
  ShapeInfo,
  Bounds,
  PresentationContext,
} from '@/types';

/**
 * PowerPoint 上下文读取模块
 * 使用 PowerPoint JavaScript API 读取幻灯片、形状、主题信息
 */

// 获取演示文稿基本上下文
export async function getPresentationContext(): Promise<PresentationContext> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      const presentation = context.presentation;
      const slides = presentation.slides;
      slides.load('items');

      await context.sync();

      const slideCount = slides.items.length;

      // 获取当前选中的幻灯片索引
      let currentSlideIndex = 0;
      try {
        const selectedSlides = presentation.getSelectedSlides();
        selectedSlides.load('items');
        await context.sync();
        if (selectedSlides.items.length > 0) {
          const selectedSlide = selectedSlides.items[0];
          selectedSlide.load('id');
          await context.sync();
          // 查找索引
          for (let i = 0; i < slides.items.length; i++) {
            slides.items[i].load('id');
          }
          await context.sync();
          for (let i = 0; i < slides.items.length; i++) {
            if (slides.items[i].id === selectedSlide.id) {
              currentSlideIndex = i;
              break;
            }
          }
        }
      } catch {
        // 如果无法获取选中幻灯片，使用默认值
      }

      // 默认幻灯片尺寸（标准 16:9）
      const slideWidth = 960;
      const slideHeight = 540;

      resolve({
        slideCount,
        currentSlideIndex,
        slideWidth,
        slideHeight,
      });
    }).catch(() => {
      // 降级返回默认值
      resolve({
        slideCount: 0,
        currentSlideIndex: 0,
        slideWidth: 960,
        slideHeight: 540,
      });
    });
  });
}

// 获取当前幻灯片详细上下文
export async function getSlideContext(): Promise<SlideContext | null> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      const presentation = context.presentation;

      // 获取选中的幻灯片
      const selectedSlides = presentation.getSelectedSlides();
      selectedSlides.load('items');
      await context.sync();

      if (selectedSlides.items.length === 0) {
        resolve(null);
        return;
      }

      const slide = selectedSlides.items[0];
      slide.load(['id', 'shapes']);
      await context.sync();

      // 获取幻灯片索引
      const slides = presentation.slides;
      slides.load('items');
      await context.sync();

      let slideIndex = 0;
      for (let i = 0; i < slides.items.length; i++) {
        slides.items[i].load('id');
      }
      await context.sync();
      for (let i = 0; i < slides.items.length; i++) {
        if (slides.items[i].id === slide.id) {
          slideIndex = i;
          break;
        }
      }

      // 获取形状信息
      const shapes: ShapeInfo[] = [];
      const slideShapes = slide.shapes;
      slideShapes.load(['items']);
      await context.sync();

      for (const shape of slideShapes.items) {
        shape.load(['id', 'type', 'left', 'top', 'width', 'height']);
        try {
          if (shape.textFrame) {
            shape.textFrame.load(['hasText', 'textRange']);
          }
        } catch {
          // 某些形状可能没有 textFrame
        }
      }
      await context.sync();

      for (const shape of slideShapes.items) {
        const bounds: Bounds = {
          x: shape.left,
          y: shape.top,
          width: shape.width,
          height: shape.height,
        };

        let shapeType: ShapeInfo['type'] = 'unknown';
        let hasText = false;
        let text: string | undefined;

        // 映射形状类型
        const typeStr = String(shape.type).toLowerCase();
        if (typeStr.includes('text') || typeStr.includes('placeholder')) {
          shapeType = 'text';
        } else if (typeStr.includes('image') || typeStr.includes('picture')) {
          shapeType = 'image';
        } else if (typeStr.includes('group')) {
          shapeType = 'group';
        } else {
          shapeType = 'shape';
        }

        try {
          if (shape.textFrame && shape.textFrame.hasText) {
            hasText = true;
            shape.textFrame.textRange.load('text');
            await context.sync();
            text = shape.textFrame.textRange.text;
          }
        } catch {
          // 忽略无法读取文本的形状
        }

        shapes.push({
          id: shape.id,
          type: shapeType,
          bounds,
          hasText,
          text,
        });
      }

      resolve({
        slideId: slide.id,
        slideIndex,
        width: 960,
        height: 540,
        shapes,
      });
    }).catch(() => {
      resolve(null);
    });
  });
}

// 获取选区上下文（包含文本样式）
export async function getSelectionContext(): Promise<SelectionContext> {
  return new Promise((resolve) => {
    // 首先尝试获取选中的文本
    Office.context.document.getSelectedDataAsync(
      Office.CoercionType.Text,
      async (result) => {
        const text = result.status === Office.AsyncResultStatus.Succeeded
          ? (result.value as string)
          : '';

        // 尝试获取更多上下文
        let slideId: string | undefined;
        let shapeId: string | undefined;
        let textStyle: TextStyle | undefined;

        try {
          await PowerPoint.run(async (context) => {
            const selectedSlides = context.presentation.getSelectedSlides();
            selectedSlides.load('items');
            await context.sync();

            if (selectedSlides.items.length > 0) {
              const slide = selectedSlides.items[0];
              slide.load('id');
              await context.sync();
              slideId = slide.id;

              // 尝试获取选中的形状
              const selectedShapes = slide.shapes.getSelectedShapes();
              selectedShapes.load('items');
              await context.sync();

              if (selectedShapes.items.length > 0) {
                const shape = selectedShapes.items[0];
                shape.load('id');
                await context.sync();
                shapeId = shape.id;

                // 尝试获取文本样式
                try {
                  if (shape.textFrame && shape.textFrame.textRange) {
                    const font = shape.textFrame.textRange.font;
                    font.load(['name', 'size', 'color', 'bold', 'italic', 'underline']);
                    await context.sync();

                    textStyle = {
                      fontFamily: font.name,
                      fontSize: font.size,
                      bold: font.bold,
                      italic: font.italic,
                      underline: font.underline ? true : false,
                    };

                    // 颜色处理
                    if (font.color) {
                      textStyle.color = `#${font.color}`;
                    }
                  }
                } catch {
                  // 无法获取文本样式
                }
              }
            }
          });
        } catch {
          // PowerPoint API 不可用，使用基础信息
        }

        resolve({
          slideId,
          shapeId,
          text: text || undefined,
          textStyle,
        });
      }
    );
  });
}

// 获取主题信息（尽可能读取）
export async function getThemeSpec(): Promise<ThemeSpec | null> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      // PowerPoint JS API 对主题的支持有限
      // 这里返回一个基于常见 Office 主题的默认值
      // 实际项目中可能需要通过其他方式获取主题信息

      resolve({
        name: 'Office Default',
        fonts: {
          heading: 'Calibri Light',
          body: 'Calibri',
        },
        colors: {
          primary: '#0078D4',
          text: '#333333',
          background: '#FFFFFF',
          accent: '#A855F7',
        },
      });
    }).catch(() => {
      resolve(null);
    });
  });
}

// 从选区获取文本样式
export async function getTextStyleFromSelection(): Promise<TextStyle | null> {
  const selectionContext = await getSelectionContext();
  return selectionContext.textStyle || null;
}

// 获取幻灯片的所有文本内容（用于 AI 上下文理解）
export async function getSlideTextContent(): Promise<string> {
  // 尝试多种方法获取 PPT 文本内容

  // 方法 1: 尝试通过选中所有内容获取文本（如果用户已选中文本）
  const textFromSelection = await getTextViaSelection();
  if (textFromSelection) {
    console.log('[getSlideTextContent] Got text via selection method');
    return textFromSelection;
  }

  // 方法 2: 尝试通过 PowerPoint API 遍历形状
  const textFromShapes = await getTextViaShapes();
  if (textFromShapes) {
    console.log('[getSlideTextContent] Got text via shapes method');
    return textFromShapes;
  }

  // 方法 3: 尝试获取当前幻灯片的文本（通过 SlideScope）
  const textFromCurrentSlide = await getTextFromCurrentSlide();
  if (textFromCurrentSlide) {
    console.log('[getSlideTextContent] Got text via current slide method');
    return textFromCurrentSlide;
  }

  console.log('[getSlideTextContent] All methods failed, returning fallback message');
  return `[当前演示文稿包含 ${await getSlideCount()} 页幻灯片，但无法读取文本内容。请选中文本后重试。]`;
}

// 获取幻灯片数量
async function getSlideCount(): Promise<number> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      const slides = context.presentation.slides;
      slides.load('items');
      await context.sync();
      resolve(slides.items.length);
    }).catch(() => resolve(0));
  });
}

// 方法 1: 通过选中内容获取文本
async function getTextViaSelection(): Promise<string> {
  return new Promise((resolve) => {
    // 尝试获取当前选中的文本
    Office.context.document.getSelectedDataAsync(
      Office.CoercionType.Text,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
          const text = String(result.value).trim();
          if (text) {
            console.log('[getTextViaSelection] Got selected text:', text.substring(0, 100));
            resolve(text);
            return;
          }
        }
        resolve('');
      }
    );
  });
}

// 方法 2: 通过遍历形状获取文本
async function getTextViaShapes(): Promise<string> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      try {
        const presentation = context.presentation;
        const slides = presentation.slides;
        slides.load('items');
        await context.sync();

        console.log('[getTextViaShapes] Total slides:', slides.items.length);

        if (slides.items.length === 0) {
          resolve('');
          return;
        }

        const textParts: string[] = [];

        for (let slideIdx = 0; slideIdx < slides.items.length; slideIdx++) {
          try {
            const slide = slides.items[slideIdx];
            const shapes = slide.shapes;
            shapes.load('items');
            await context.sync();

            const slideTexts: string[] = [];

            for (let shapeIdx = 0; shapeIdx < shapes.items.length; shapeIdx++) {
              const shape = shapes.items[shapeIdx];
              try {
                shape.load(['type', 'name']);
                await context.sync();

                // 尝试多种方式获取文本
                const text = await tryGetShapeText(context, shape);
                if (text) {
                  console.log(`[getTextViaShapes] Slide ${slideIdx + 1}, Shape ${shapeIdx} (${shape.name}): "${text.substring(0, 30)}..."`);
                  slideTexts.push(text);
                }
              } catch (e) {
                // 忽略单个形状的错误
              }
            }

            if (slideTexts.length > 0) {
              textParts.push(`[幻灯片 ${slideIdx + 1}]\n${slideTexts.join('\n')}`);
            }
          } catch (e) {
            console.error(`[getTextViaShapes] Slide ${slideIdx + 1} error:`, e);
          }
        }

        resolve(textParts.join('\n\n'));
      } catch (error) {
        console.error('[getTextViaShapes] Error:', error);
        resolve('');
      }
    }).catch((error) => {
      console.error('[getTextViaShapes] PowerPoint.run error:', error);
      resolve('');
    });
  });
}

// 方法 3: 获取当前幻灯片的文本
async function getTextFromCurrentSlide(): Promise<string> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      try {
        // 获取当前选中的幻灯片
        const selectedSlides = context.presentation.getSelectedSlides();
        selectedSlides.load('items');
        await context.sync();

        if (selectedSlides.items.length === 0) {
          resolve('');
          return;
        }

        const slideTexts: string[] = [];

        for (const slide of selectedSlides.items) {
          const shapes = slide.shapes;
          shapes.load('items');
          await context.sync();

          for (const shape of shapes.items) {
            try {
              const text = await tryGetShapeText(context, shape);
              if (text) {
                slideTexts.push(text);
              }
            } catch {
              // 忽略
            }
          }
        }

        resolve(slideTexts.join('\n\n'));
      } catch (error) {
        console.error('[getTextFromCurrentSlide] Error:', error);
        resolve('');
      }
    }).catch(() => resolve(''));
  });
}

// 尝试获取形状的文本内容
async function tryGetShapeText(
  context: PowerPoint.RequestContext,
  shape: PowerPoint.Shape
): Promise<string> {
  // 尝试方法 1: 直接访问 textFrame.textRange.text
  try {
    const textRange = shape.textFrame.textRange;
    textRange.load('text');
    await context.sync();
    const text = textRange.text?.trim();
    if (text) return text;
  } catch {
    // 方法 1 失败
  }

  // 尝试方法 2: 先加载 textFrame
  try {
    shape.load('textFrame');
    await context.sync();

    if (shape.textFrame) {
      shape.textFrame.load('textRange');
      await context.sync();

      if (shape.textFrame.textRange) {
        shape.textFrame.textRange.load('text');
        await context.sync();
        const text = shape.textFrame.textRange.text?.trim();
        if (text) return text;
      }
    }
  } catch {
    // 方法 2 失败
  }

  return '';
}

// 获取完整的 AI 上下文（用于发送给 LLM）
export async function getAIContext(): Promise<{
  presentationContext: PresentationContext;
  slideContext: SlideContext | null;
  selectionContext: SelectionContext;
  slideText: string;
  theme: ThemeSpec | null;
}> {
  const [presentationContext, slideContext, selectionContext, slideText, theme] = await Promise.all([
    getPresentationContext(),
    getSlideContext(),
    getSelectionContext(),
    getSlideTextContent(),
    getThemeSpec(),
  ]);

  return {
    presentationContext,
    slideContext,
    selectionContext,
    slideText,
    theme,
  };
}
