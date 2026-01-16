/**
 * Developer 测试页面类型定义
 */

export interface TestLogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: unknown;
}

export interface TestSectionProps {
  onAddLog: (type: TestLogEntry['type'], message: string, details?: unknown) => void;
  disabled?: boolean;
}

export interface TextTestConfig {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface ImageTestConfig {
  imageData: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackgroundTestConfig {
  imageData: string;
  mode: 'stretch' | 'tile';
  tileWidth: number;
  tileHeight: number;
  transparency: number;
}

// 默认测试配置
export const DEFAULT_TEXT_CONFIG: TextTestConfig = {
  text: 'Hello, PowerPoint!',
  x: 100,
  y: 100,
  width: 400,
  height: 60,
  fontSize: 24,
  fontFamily: 'Calibri',
  color: '#333333',
  bold: false,
  italic: false,
  underline: false,
};

export const DEFAULT_IMAGE_CONFIG: ImageTestConfig = {
  imageData: '',
  x: 100,
  y: 200,
  width: 300,
  height: 200,
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundTestConfig = {
  imageData: '',
  mode: 'stretch',
  tileWidth: 100,
  tileHeight: 100,
  transparency: 0,
};
