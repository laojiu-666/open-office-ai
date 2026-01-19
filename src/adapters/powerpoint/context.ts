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
      const selectedSlides = presentation.getSelectedSlides();
      selectedSlides.load('items');
      await context.sync();

      let currentSlideIndex = 0;
      if (selectedSlides.items.length > 0) {
        const selectedSlide = selectedSlides.items[0];
        selectedSlide.load('id');
        await context.sync();

        // 查找选中幻灯片的索引
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

      resolve({
        slideCount,
        currentSlideIndex,
        slideWidth: 960,
        slideHeight: 540,
      });
    }).catch(() => {
      resolve({
        slideCount: 0,
        currentSlideIndex: 0,
        slideWidth: 960,
        slideHeight: 540,
      });
    });
  });
}

// 获取主题信息
export async function getThemeSpec(): Promise<ThemeSpec | null> {
  // PowerPoint JS API 对主题的支持有限，返回默认 Office 主题
  return {
    name: 'Office Theme',
    fonts: {
      heading: 'Calibri Light',
      body: 'Calibri',
    },
    colors: {
      primary: '#5B9BD5',
      text: '#000000',
      background: '#FFFFFF',
      accent: '#ED7D31',
    },
  };
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
      const shapeItems = slide.shapes;
      shapeItems.load('items');
      await context.sync();

      const shapes: ShapeInfo[] = [];

      for (const shape of shapeItems.items) {
        shape.load(['id', 'type', 'left', 'top', 'width', 'height', 'textFrame']);
        await context.sync();

        const shapeType = shape.type as string;
        let type: ShapeInfo['type'] = 'unknown';

        if (shapeType === 'GeometricShape') {
          type = 'shape';
        } else if (shapeType === 'Image') {
          type = 'image';
        } else if (shapeType === 'Group') {
          type = 'group';
        } else if (shape.textFrame && shape.textFrame.hasText) {
          type = 'text';
        }

        const bounds: Bounds = {
          x: shape.left,
          y: shape.top,
          width: shape.width,
          height: shape.height,
        };

        let hasText = false;
        let text = '';

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
          type,
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

        // 尝试获取选中的形状信息
        PowerPoint.run(async (context) => {
          const presentation = context.presentation;
          const selectedSlides = presentation.getSelectedSlides();
          selectedSlides.load('items');
          await context.sync();

          if (selectedSlides.items.length === 0) {
            resolve({ text });
            return;
          }

          const slide = selectedSlides.items[0];
          slide.load('id');
          await context.sync();

          resolve({
            slideId: slide.id,
            text,
          });
        }).catch(() => {
          resolve({ text });
        });
      }
    );
  });
}

// 辅助函数：从文本中提取标题（第一行或前50字符）
function extractTitle(text: string): string {
  if (!text) return '';
  const firstLine = text.split('\n')[0];
  return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
}

// 辅助函数：描述图片位置
function describeImageLocation(bounds: Bounds, slideWidth: number, slideHeight: number): string {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  const horizontal = centerX < slideWidth / 3 ? '左' : centerX > slideWidth * 2 / 3 ? '右' : '中';
  const vertical = centerY < slideHeight / 3 ? '上' : centerY > slideHeight * 2 / 3 ? '下' : '中';

  return `${vertical}${horizontal}`;
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

  console.log('[getSlideTextContent] No text found');
  return '';
}

// 方法 1: 通过选区获取文本
async function getTextViaSelection(): Promise<string> {
  return new Promise((resolve) => {
    Office.context.document.getSelectedDataAsync(
      Office.CoercionType.Text,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
          resolve(result.value as string);
        } else {
          resolve('');
        }
      }
    );
  });
}

// 方法 2: 通过遍历形状获取文本
async function getTextViaShapes(): Promise<string> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      const presentation = context.presentation;
      const selectedSlides = presentation.getSelectedSlides();
      selectedSlides.load('items');
      await context.sync();

      if (selectedSlides.items.length === 0) {
        resolve('');
        return;
      }

      const slide = selectedSlides.items[0];
      slide.load('shapes');
      await context.sync();

      const shapes = slide.shapes;
      shapes.load('items');
      await context.sync();

      const texts: string[] = [];

      for (const shape of shapes.items) {
        shape.load(['textFrame']);
        await context.sync();

        try {
          if (shape.textFrame && shape.textFrame.hasText) {
            shape.textFrame.textRange.load('text');
            await context.sync();
            if (shape.textFrame.textRange.text) {
              texts.push(shape.textFrame.textRange.text);
            }
          }
        } catch {
          // 忽略无法读取文本的形状
        }
      }

      resolve(texts.join('\n\n'));
    }).catch(() => {
      resolve('');
    });
  });
}

// 方法 3: 通过 SlideScope 获取当前幻灯片文本
async function getTextFromCurrentSlide(): Promise<string> {
  // 这个方法在 PowerPoint 中不可用，返回空字符串
  return '';
}

/**
 * 获取演示文稿大纲（结构化摘要）
 * 仅包含每页的标题和基本信息，用于 token 优化
 */
export async function getPresentationOutline(): Promise<{
  totalSlides: number;
  slides: Array<{
    index: number;
    title: string;
    hasImages: boolean;
    textLength: number;
  }>;
}> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      const presentation = context.presentation;
      const slides = presentation.slides;
      slides.load('items');
      await context.sync();

      const slideInfos: Array<{
        index: number;
        title: string;
        hasImages: boolean;
        textLength: number;
      }> = [];

      for (let i = 0; i < slides.items.length; i++) {
        const slide = slides.items[i];
        slide.load('shapes');
        await context.sync();

        const shapes = slide.shapes;
        shapes.load('items');
        await context.sync();

        let title = '';
        let hasImages = false;
        let textLength = 0;

        for (const shape of shapes.items) {
          shape.load(['type', 'textFrame']);
          await context.sync();

          // 检测图片
          if (shape.type === 'Image') {
            hasImages = true;
          }

          // 提取文本
          try {
            if (shape.textFrame && shape.textFrame.hasText) {
              shape.textFrame.textRange.load('text');
              await context.sync();
              const text = shape.textFrame.textRange.text;
              textLength += text.length;

              // 第一个文本框作为标题
              if (!title && text) {
                title = extractTitle(text);
              }
            }
          } catch {
            // 忽略
          }
        }

        slideInfos.push({
          index: i,
          title: title || `幻灯片 ${i + 1}`,
          hasImages,
          textLength,
        });
      }

      resolve({
        totalSlides: slides.items.length,
        slides: slideInfos,
      });
    }).catch(() => {
      resolve({
        totalSlides: 0,
        slides: [],
      });
    });
  });
}

/**
 * 获取当前幻灯片的详细信息（结构化）
 * 包含完整文本和图片描述
 */
export async function getCurrentSlideDetail(): Promise<{
  index: number;
  title: string;
  fullText: string;
  shapes: Array<{
    id: string;
    type: 'text' | 'image' | 'shape' | 'group' | 'unknown';
    bounds: Bounds;
    text?: string;
    imageDescription?: string;
  }>;
} | null> {
  return new Promise((resolve) => {
    PowerPoint.run(async (context) => {
      const presentation = context.presentation;
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

      // 获取索引
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

      // 获取形状
      const shapeItems = slide.shapes;
      shapeItems.load('items');
      await context.sync();

      const shapes: Array<{
        id: string;
        type: 'text' | 'image' | 'shape' | 'group' | 'unknown';
        bounds: Bounds;
        text?: string;
        imageDescription?: string;
      }> = [];

      let title = '';
      const textParts: string[] = [];

      for (const shape of shapeItems.items) {
        shape.load(['id', 'type', 'left', 'top', 'width', 'height', 'textFrame']);
        await context.sync();

        const shapeType = shape.type as string;
        let type: 'text' | 'image' | 'shape' | 'group' | 'unknown' = 'unknown';

        const bounds: Bounds = {
          x: shape.left,
          y: shape.top,
          width: shape.width,
          height: shape.height,
        };

        if (shapeType === 'Image') {
          type = 'image';
          const location = describeImageLocation(bounds, 960, 540);
          shapes.push({
            id: shape.id,
            type,
            bounds,
            imageDescription: `图片位于${location}，尺寸 ${Math.round(bounds.width)}×${Math.round(bounds.height)} pt`,
          });
        } else {
          if (shapeType === 'GeometricShape') {
            type = 'shape';
          } else if (shapeType === 'Group') {
            type = 'group';
          }

          try {
            if (shape.textFrame && shape.textFrame.hasText) {
              type = 'text';
              shape.textFrame.textRange.load('text');
              await context.sync();
              const text = shape.textFrame.textRange.text;

              if (!title && text) {
                title = extractTitle(text);
              }

              textParts.push(text);

              shapes.push({
                id: shape.id,
                type,
                bounds,
                text,
              });
            } else {
              shapes.push({
                id: shape.id,
                type,
                bounds,
              });
            }
          } catch {
            shapes.push({
              id: shape.id,
              type,
              bounds,
            });
          }
        }
      }

      resolve({
        index: slideIndex,
        title: title || `幻灯片 ${slideIndex + 1}`,
        fullText: textParts.join('\n\n'),
        shapes,
      });
    }).catch(() => {
      resolve(null);
    });
  });
}

/**
 * 获取结构化的 AI 上下文（优化版）
 * 使用分层结构减少 token 消耗
 */
export async function getStructuredAIContext(): Promise<{
  outline: {
    totalSlides: number;
    slides: Array<{
      index: number;
      title: string;
      hasImages: boolean;
      textLength: number;
    }>;
  };
  currentSlide: {
    index: number;
    title: string;
    fullText: string;
    shapes: Array<{
      id: string;
      type: 'text' | 'image' | 'shape' | 'group' | 'unknown';
      bounds: Bounds;
      text?: string;
      imageDescription?: string;
    }>;
  } | null;
  theme: ThemeSpec | null;
}> {
  const [outline, currentSlide, theme] = await Promise.all([
    getPresentationOutline(),
    getCurrentSlideDetail(),
    getThemeSpec(),
  ]);

  return {
    outline,
    currentSlide,
    theme,
  };
}

// 获取完整的 AI 上下文（用于发送给 LLM）- 保留向后兼容
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
