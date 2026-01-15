// SlideSpec 数据结构 - 结构化规格驱动的幻灯片生成

export type SlideSpecVersion = '1.0';

// 颜色值：十六进制或主题占位符
export type ColorValue = `#${string}` | 'theme:primary' | 'theme:text' | 'theme:accent' | 'theme:background';

// 文本对齐
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

// 图片适配策略
export type ImageFit = 'contain' | 'cover' | 'fill';

// 布局模板类型
export type LayoutTemplate =
  | 'title-only'
  | 'title-content'
  | 'title-two-content'
  | 'title-image'
  | 'image-caption'
  | 'blank';

// 几何边界（单位：pt）
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 内边距
export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// 布局槽位定义
export interface LayoutSlot {
  id: string;
  type: 'title' | 'subtitle' | 'body' | 'image' | 'caption' | 'footer';
  bounds: Bounds;
  zIndex?: number;
  padding?: Padding;
}

// 主题样式
export interface ThemeSpec {
  name?: string;
  fonts?: {
    heading: string;
    body: string;
  };
  colors?: {
    primary: ColorValue;
    text: ColorValue;
    background: ColorValue;
    accent?: ColorValue;
  };
}

// 文本样式
export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: ColorValue;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlign;
  lineHeight?: number;
}

// 图片样式
export interface ImageStyle {
  fit: ImageFit;
  opacity?: number;
  cornerRadius?: number;
}

// 文本块规格
export interface TextBlockSpec {
  kind: 'text';
  slotId: string;
  content: string;
  style?: TextStyle;
}

// 图片块规格
export interface ImageBlockSpec {
  kind: 'image';
  slotId: string;
  prompt: string;
  assetId?: string;
  style?: ImageStyle;
}

export type SlideBlockSpec = TextBlockSpec | ImageBlockSpec;

// 图片资源
export interface ImageAsset {
  id: string;
  prompt: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  data?: string; // base64
  url?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

// SlideSpec 主体
export interface SlideSpec {
  version: SlideSpecVersion;
  layout: {
    template: LayoutTemplate;
    slots: LayoutSlot[];
  };
  blocks: SlideBlockSpec[];
  theme?: ThemeSpec;
  assets?: ImageAsset[];
  speakerNotes?: string;
  metadata?: {
    requestId?: string;
    createdAt?: string;
  };
}

// 幻灯片生成请求
export interface SlideGenerationRequest {
  prompt: string;
  context?: PresentationContext;
  options?: {
    includeImage?: boolean;
    imageStyle?: 'photorealistic' | 'illustration' | 'flat';
    layoutPreference?: LayoutTemplate;
  };
}

// 演示文稿上下文
export interface PresentationContext {
  slideCount: number;
  currentSlideIndex: number;
  slideWidth: number;
  slideHeight: number;
  theme?: ThemeSpec;
}

// 幻灯片上下文（详细）
export interface SlideContext {
  slideId: string;
  slideIndex: number;
  width: number;
  height: number;
  shapes: ShapeInfo[];
  theme?: ThemeSpec;
}

// 形状信息
export interface ShapeInfo {
  id: string;
  type: 'text' | 'image' | 'shape' | 'group' | 'unknown';
  bounds: Bounds;
  hasText?: boolean;
  text?: string;
}

// 选区上下文
export interface SelectionContext {
  slideId?: string;
  shapeId?: string;
  text?: string;
  textStyle?: TextStyle;
}

// SlideSpec 应用结果
export interface ApplySlideSpecResult {
  success: boolean;
  slideId?: string;
  slideIndex?: number;
  createdShapeIds?: string[];
  error?: string;
}

// 图片生成配置
export interface ImageGenConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultSize: '512x512' | '1024x1024';
}

// 图片生成请求
export interface ImageGenRequest {
  prompt: string;
  size?: '512x512' | '1024x1024';
  style?: 'photorealistic' | 'illustration' | 'flat';
}

// 图片生成响应
export interface ImageGenResponse {
  id: string;
  data: string; // base64
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}
