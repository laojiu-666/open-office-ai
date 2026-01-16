/**
 * PowerPoint 测试运行器
 * 封装 Office.js API 调用，供测试页面使用
 */

import type { Bounds, TextStyle } from '@/types';
import {
  insertTextAtPosition,
  insertImageToCurrentSlide,
  setSlideBackground,
} from './slide-renderer';

export interface TestResult {
  success: boolean;
  shapeId?: string;
  method?: string;
  error?: string;
  timestamp: number;
}

export interface TextTestOptions {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ImageTestOptions {
  imageData: string; // base64 或 data URL
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackgroundTestOptions {
  imageData: string;
  mode: 'stretch' | 'tile';
  tileWidth?: number;
  tileHeight?: number;
  transparency?: number;
}

/**
 * PowerPoint 测试运行器
 */
export const PowerPointTestRunner = {
  /**
   * 插入文本测试
   */
  async insertText(options: TextTestOptions): Promise<TestResult> {
    const timestamp = Date.now();

    const bounds: Bounds = {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    };

    const style: TextStyle = {};
    if (options.fontSize) style.fontSize = options.fontSize;
    if (options.fontFamily) style.fontFamily = options.fontFamily;
    if (options.color) style.color = options.color as any;
    if (options.bold !== undefined) style.bold = options.bold;
    if (options.italic !== undefined) style.italic = options.italic;
    if (options.underline !== undefined) style.underline = options.underline;

    const result = await insertTextAtPosition(options.text, bounds, style);

    return {
      success: result.success,
      shapeId: result.shapeId,
      error: result.error,
      timestamp,
    };
  },

  /**
   * 插入图片测试
   */
  async insertImage(options: ImageTestOptions): Promise<TestResult> {
    const timestamp = Date.now();

    const bounds: Partial<Bounds> = {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    };

    const result = await insertImageToCurrentSlide(options.imageData, bounds);

    return {
      success: result.success,
      shapeId: result.shapeId,
      error: result.error,
      timestamp,
    };
  },

  /**
   * 设置背景测试
   */
  async setBackground(options: BackgroundTestOptions): Promise<TestResult> {
    const timestamp = Date.now();

    const result = await setSlideBackground(options.imageData, {
      mode: options.mode,
      tileWidth: options.tileWidth,
      tileHeight: options.tileHeight,
      transparency: options.transparency,
    });

    return {
      success: result.success,
      method: result.method,
      error: result.error,
      timestamp,
    };
  },

  /**
   * 清除当前幻灯片所有形状
   */
  async clearSlide(): Promise<TestResult> {
    const timestamp = Date.now();

    return new Promise((resolve) => {
      PowerPoint.run(async (context) => {
        try {
          const selectedSlides = context.presentation.getSelectedSlides();
          selectedSlides.load('items');
          await context.sync();

          if (selectedSlides.items.length === 0) {
            resolve({ success: false, error: '请先选择一个幻灯片', timestamp });
            return;
          }

          const slide = selectedSlides.items[0];
          const shapes = slide.shapes;
          shapes.load('items');
          await context.sync();

          let deletedCount = 0;
          for (const shape of shapes.items) {
            try {
              shape.delete();
              deletedCount++;
            } catch {
              // 忽略删除失败
            }
          }
          await context.sync();

          resolve({
            success: true,
            method: `deleted ${deletedCount} shapes`,
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '清除失败',
            timestamp,
          });
        }
      }).catch((error) => {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'PowerPoint API 调用失败',
          timestamp,
        });
      });
    });
  },

  /**
   * 获取当前幻灯片信息
   */
  async getSlideInfo(): Promise<{
    success: boolean;
    slideIndex?: number;
    shapeCount?: number;
    error?: string;
  }> {
    return new Promise((resolve) => {
      PowerPoint.run(async (context) => {
        try {
          const presentation = context.presentation;
          const slides = presentation.slides;
          slides.load('items');

          const selectedSlides = presentation.getSelectedSlides();
          selectedSlides.load('items');
          await context.sync();

          if (selectedSlides.items.length === 0) {
            resolve({ success: false, error: '请先选择一个幻灯片' });
            return;
          }

          const selectedSlide = selectedSlides.items[0];
          selectedSlide.load('id');
          const shapes = selectedSlide.shapes;
          shapes.load('items');
          await context.sync();

          // 查找索引
          let slideIndex = 0;
          for (let i = 0; i < slides.items.length; i++) {
            slides.items[i].load('id');
          }
          await context.sync();

          for (let i = 0; i < slides.items.length; i++) {
            if (slides.items[i].id === selectedSlide.id) {
              slideIndex = i;
              break;
            }
          }

          resolve({
            success: true,
            slideIndex,
            shapeCount: shapes.items.length,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '获取信息失败',
          });
        }
      }).catch((error) => {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'PowerPoint API 调用失败',
        });
      });
    });
  },
};

export default PowerPointTestRunner;
