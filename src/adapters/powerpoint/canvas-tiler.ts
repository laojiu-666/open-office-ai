/**
 * Canvas 平铺合成工具
 * 将小图片平铺合成为幻灯片尺寸的背景图
 */

export interface CanvasTileOptions {
  slideWidth: number;
  slideHeight: number;
  tileWidth: number;
  tileHeight: number;
  scale?: number;
  backgroundColor?: string;
}

export interface TileResult {
  success: boolean;
  data?: string; // base64 without prefix
  error?: string;
}

// 最大输出尺寸限制（5MB base64）
const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;

// 最大 Canvas 尺寸（避免内存溢出）
const MAX_CANVAS_DIMENSION = 4096;

/**
 * 将图片平铺合成为指定尺寸的背景图
 * @param imageBase64 原始图片 base64（可带或不带 data URL 前缀）
 * @param options 平铺选项
 * @returns 合成后的 base64 图片数据（不带前缀）
 */
export async function composeTiledBackground(
  imageBase64: string,
  options: CanvasTileOptions
): Promise<TileResult> {
  return new Promise((resolve) => {
    try {
      const { slideWidth, slideHeight, tileWidth, tileHeight, scale = 1, backgroundColor } = options;

      // 参数验证
      if (tileWidth <= 0 || tileHeight <= 0) {
        resolve({ success: false, error: 'invalid_tile_size' });
        return;
      }
      if (scale <= 0 || scale > 4) {
        resolve({ success: false, error: 'invalid_scale' });
        return;
      }
      if (slideWidth <= 0 || slideHeight <= 0) {
        resolve({ success: false, error: 'invalid_slide_size' });
        return;
      }

      // 计算 Canvas 尺寸（应用缩放，但限制最大尺寸）
      const canvasWidth = Math.min(slideWidth * scale, MAX_CANVAS_DIMENSION);
      const canvasHeight = Math.min(slideHeight * scale, MAX_CANVAS_DIMENSION);

      // 预检查像素数量，避免内存溢出
      const pixelCount = canvasWidth * canvasHeight;
      const MAX_PIXELS = 16 * 1024 * 1024; // 16M 像素
      if (pixelCount > MAX_PIXELS) {
        resolve({ success: false, error: 'canvas_too_large' });
        return;
      }

      // 计算实际缩放比例
      const actualScaleX = canvasWidth / slideWidth;
      const actualScaleY = canvasHeight / slideHeight;

      // 计算平铺尺寸
      const tilePxWidth = tileWidth * actualScaleX;
      const tilePxHeight = tileHeight * actualScaleY;

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ success: false, error: 'canvas_context_failed' });
        return;
      }

      // 填充背景色
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // 加载图片
      const img = new Image();

      img.onload = () => {
        try {
          // 计算需要平铺的次数
          const tilesX = Math.ceil(canvasWidth / tilePxWidth);
          const tilesY = Math.ceil(canvasHeight / tilePxHeight);

          // 绘制平铺图片
          for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
              ctx.drawImage(
                img,
                x * tilePxWidth,
                y * tilePxHeight,
                tilePxWidth,
                tilePxHeight
              );
            }
          }

          // 导出为 base64
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

          // 检查输出大小
          if (base64Data.length > MAX_OUTPUT_SIZE) {
            resolve({ success: false, error: 'output_size_exceeded' });
            return;
          }

          resolve({ success: true, data: base64Data });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'compose_failed',
          });
        }
      };

      img.onerror = () => {
        resolve({ success: false, error: 'image_load_failed' });
      };

      // 设置图片源
      let imageSrc = imageBase64;
      if (!imageSrc.startsWith('data:')) {
        imageSrc = `data:image/png;base64,${imageSrc}`;
      }
      img.src = imageSrc;
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  });
}

/**
 * 检测图片格式
 */
export function detectImageFormat(base64: string): 'png' | 'jpeg' | 'unknown' {
  // PNG 魔数: iVBORw0KGgo
  if (base64.startsWith('iVBORw0KGgo')) {
    return 'png';
  }
  // JPEG 魔数: /9j/
  if (base64.startsWith('/9j/')) {
    return 'jpeg';
  }
  return 'unknown';
}

/**
 * 获取图片尺寸
 */
export async function getImageDimensions(
  imageBase64: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      resolve(null);
    };

    let imageSrc = imageBase64;
    if (!imageSrc.startsWith('data:')) {
      imageSrc = `data:image/png;base64,${imageSrc}`;
    }
    img.src = imageSrc;
  });
}
