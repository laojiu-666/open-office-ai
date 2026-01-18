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
  data?: unknown;
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
  transparency?: number;
}

export type ShapeTestType = 'rectangle' | 'ellipse' | 'triangle' | 'line';

export interface ShapeTestOptions {
  shapeType: ShapeTestType;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  lineColor?: string;
  lineWeight?: number;
}

export interface TableTestOptions {
  rows: number;
  columns: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  values?: string[][];
}

export interface SelectedShapeInfo {
  id: string;
  type: string;
  hasText: boolean;
  text?: string;
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

          // 尝试清除背景（需要 API 1.10+）
          let backgroundCleared = false;
          const api110Supported = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');

          if (api110Supported) {
            try {
              const slideAny = slide as any;
              if (slideAny.background) {
                slideAny.background.isMasterBackgroundFollowed = true;
                await context.sync();
                backgroundCleared = true;
              }
            } catch (error) {
              // 背景清除失败，继续
              console.warn('清除背景失败:', error);
            }
          }

          resolve({
            success: true,
            method: `deleted ${deletedCount} shapes${backgroundCleared ? ', background cleared' : ''}`,
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

  /**
   * 添加幻灯片
   */
  async addSlide(): Promise<TestResult> {
    const timestamp = Date.now();

    return new Promise((resolve) => {
      PowerPoint.run(async (context) => {
        try {
          const slides = context.presentation.slides;
          slides.add();

          const countResult = slides.getCount();
          await context.sync();

          resolve({
            success: true,
            method: 'slides.add',
            data: {
              slideCount: countResult.value,
            },
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '添加幻灯片失败',
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
   * 删除当前幻灯片
   */
  async deleteSlide(requireConfirm = true): Promise<TestResult> {
    const timestamp = Date.now();

    if (requireConfirm) {
      return {
        success: false,
        error: '删除操作需要确认',
        timestamp,
      };
    }

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

          selectedSlides.items[0].delete();
          await context.sync();

          resolve({
            success: true,
            method: 'slide.delete',
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '删除幻灯片失败',
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
   * 跳转到指定幻灯片
   */
  async navigateToSlide(index: number): Promise<TestResult> {
    const timestamp = Date.now();

    if (!Number.isInteger(index) || index < 0) {
      return {
        success: false,
        error: '幻灯片索引必须是非负整数',
        timestamp,
      };
    }

    return new Promise((resolve) => {
      PowerPoint.run(async (context) => {
        try {
          const slides = context.presentation.slides;
          const targetSlide = slides.getItemAt(index);
          targetSlide.load('id');
          await context.sync();

          context.presentation.setSelectedSlides([targetSlide.id]);
          await context.sync();

          resolve({
            success: true,
            method: 'setSelectedSlides',
            data: {
              slideIndex: index,
              slideId: targetSlide.id,
            },
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '跳转幻灯片失败',
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
   * 获取幻灯片总数与当前位置
   */
  async getSlideCount(): Promise<TestResult> {
    const timestamp = Date.now();

    return new Promise((resolve) => {
      PowerPoint.run(async (context) => {
        try {
          const presentation = context.presentation;
          const slides = presentation.slides;
          slides.load('items/id');

          const selectedSlides = presentation.getSelectedSlides();
          selectedSlides.load('items/id');

          await context.sync();

          if (selectedSlides.items.length === 0) {
            resolve({ success: false, error: '请先选择一个幻灯片', timestamp });
            return;
          }

          const selectedId = selectedSlides.items[0].id;
          let currentIndex = -1;
          for (let i = 0; i < slides.items.length; i++) {
            if (slides.items[i].id === selectedId) {
              currentIndex = i;
              break;
            }
          }

          resolve({
            success: true,
            method: 'slides.getCount',
            data: {
              slideCount: slides.items.length,
              currentIndex,
            },
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '获取幻灯片信息失败',
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
   * 获取选中形状信息
   */
  async getSelectedShapes(): Promise<TestResult> {
    const timestamp = Date.now();

    return new Promise((resolve) => {
      PowerPoint.run(async (context) => {
        try {
          const selectedShapes = context.presentation.getSelectedShapes();
          selectedShapes.load('items/id,items/type');
          await context.sync();

          if (selectedShapes.items.length === 0) {
            resolve({
              success: true,
              data: [],
              timestamp,
            });
            return;
          }

          const shapesInfo: SelectedShapeInfo[] = [];

          for (const shape of selectedShapes.items) {
            const shapeInfo: SelectedShapeInfo = {
              id: shape.id,
              type: String(shape.type),
              hasText: false,
            };

            try {
              shape.textFrame.load('hasText,textRange/text');
              await context.sync();

              shapeInfo.hasText = shape.textFrame.hasText;
              if (shapeInfo.hasText) {
                shapeInfo.text = shape.textFrame.textRange.text;
              }
            } catch {
              shapeInfo.hasText = false;
            }

            shapesInfo.push(shapeInfo);
          }

          resolve({
            success: true,
            data: shapesInfo,
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '获取选中形状失败',
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
   * 获取当前幻灯片所有形状信息
   */
  async getAllShapes(): Promise<TestResult> {
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
          shapes.load('items/id,items/type');
          await context.sync();

          const shapesInfo: SelectedShapeInfo[] = [];

          for (const shape of shapes.items) {
            const shapeInfo: SelectedShapeInfo = {
              id: shape.id,
              type: String(shape.type),
              hasText: false,
            };

            try {
              shape.textFrame.load('hasText,textRange/text');
              await context.sync();

              shapeInfo.hasText = shape.textFrame.hasText;
              if (shapeInfo.hasText) {
                shapeInfo.text = shape.textFrame.textRange.text;
              }
            } catch {
              shapeInfo.hasText = false;
            }

            shapesInfo.push(shapeInfo);
          }

          // 尝试获取背景信息（需要 API 1.10+）
          let backgroundInfo: any = null;
          const api110Supported = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');

          if (api110Supported) {
            try {
              const slideAny = slide as any;
              if (slideAny.background) {
                slideAny.background.load('isMasterBackgroundFollowed');
                await context.sync();

                backgroundInfo = {
                  isMasterBackgroundFollowed: slideAny.background.isMasterBackgroundFollowed,
                  hasCustomBackground: !slideAny.background.isMasterBackgroundFollowed,
                };
              }
            } catch (error) {
              console.warn('获取背景信息失败:', error);
            }
          }

          resolve({
            success: true,
            data: {
              shapes: shapesInfo,
              background: backgroundInfo,
              shapeCount: shapesInfo.length,
            },
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '获取幻灯片形状失败',
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
   * 插入几何形状
   */
  async insertShape(options: ShapeTestOptions): Promise<TestResult> {
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
          const shapeOptions: PowerPoint.ShapeAddOptions = {
            left: options.x,
            top: options.y,
            width: options.width,
            height: options.height,
          };

          let shape: PowerPoint.Shape;
          if (options.shapeType === 'line') {
            shape = slide.shapes.addLine(PowerPoint.ConnectorType.straight, shapeOptions);
          } else {
            let geometricType: PowerPoint.GeometricShapeType;
            switch (options.shapeType) {
              case 'rectangle':
                geometricType = PowerPoint.GeometricShapeType.rectangle;
                break;
              case 'ellipse':
                geometricType = PowerPoint.GeometricShapeType.ellipse;
                break;
              case 'triangle':
                geometricType = PowerPoint.GeometricShapeType.triangle;
                break;
              default:
                resolve({
                  success: false,
                  error: '不支持的形状类型',
                  timestamp,
                });
                return;
            }
            shape = slide.shapes.addGeometricShape(geometricType, shapeOptions);
          }

          if (options.fillColor && options.shapeType !== 'line') {
            shape.fill.setSolidColor(options.fillColor);
          }
          if (options.lineColor) {
            shape.lineFormat.color = options.lineColor;
          }
          if (options.lineWeight !== undefined) {
            shape.lineFormat.weight = options.lineWeight;
          }

          shape.load('id');
          await context.sync();

          resolve({
            success: true,
            shapeId: shape.id,
            method: 'insertShape',
            data: {
              shapeType: options.shapeType,
            },
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '插入形状失败',
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
   * 插入表格
   */
  async insertTable(options: TableTestOptions): Promise<TestResult> {
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
          const tableOptions: PowerPoint.TableAddOptions = {};

          if (options.x !== undefined) tableOptions.left = options.x;
          if (options.y !== undefined) tableOptions.top = options.y;
          if (options.width !== undefined) tableOptions.width = options.width;
          if (options.height !== undefined) tableOptions.height = options.height;
          if (options.values) tableOptions.values = options.values;

          const tableShape = slide.shapes.addTable(options.rows, options.columns, tableOptions);
          tableShape.load('id');
          await context.sync();

          resolve({
            success: true,
            shapeId: tableShape.id,
            method: 'addTable',
            data: {
              rows: options.rows,
              columns: options.columns,
            },
            timestamp,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : '插入表格失败',
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
};

export default PowerPointTestRunner;
