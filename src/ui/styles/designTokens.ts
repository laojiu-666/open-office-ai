import { tokens } from '@fluentui/react-components';

/**
 * Luminous Productivity Design Tokens
 * 现代化 UI 设计常量
 */

// AI 特效 - 渐变和发光
export const aiEffects = {
  // 渐变边框 (蓝到紫)
  gradientBorder: 'linear-gradient(135deg, #0078D4, #a855f7)',
  // AI 消息发光阴影
  glowShadow: '0 4px 16px rgba(99, 102, 241, 0.15)',
  // 品牌色发光
  brandGlow: '0 0 0 3px rgba(0, 120, 212, 0.15)',
  // 流式输出光标颜色
  streamingCursor: '#0078D4',
} as const;

// 毛玻璃效果
export const glassEffect = {
  background: 'rgba(255, 255, 255, 0.85)',
  backgroundDark: 'rgba(30, 30, 30, 0.85)',
  backdropFilter: 'blur(12px) saturate(180%)',
  border: `1px solid rgba(255, 255, 255, 0.3)`,
} as const;

// 布局尺寸
export const layoutDimensions = {
  headerHeight: '48px',
  inputAreaHeight: '64px',
  inputFloatingMargin: '12px',
  inputBorderRadius: '20px',
  messageBorderRadius: '16px',
  chipBorderRadius: '100px',
  cardBorderRadius: '12px',
} as const;

// 阴影层级
export const shadows = {
  // 浮动输入框阴影
  floating: '0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
  // 卡片阴影
  card: '0 2px 8px rgba(0, 0, 0, 0.04)',
  // 悬浮阴影
  hover: '0 8px 32px rgba(0, 0, 0, 0.12)',
} as const;

// 动画配置
export const animation = {
  duration: {
    fast: '0.15s',
    normal: '0.25s',
    slow: '0.4s',
  },
  easing: {
    // 标准缓出
    easeOut: 'cubic-bezier(0.33, 1, 0.68, 1)',
    // 弹性效果
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // 平滑
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// 间距系统
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

// 消息气泡样式
export const messageBubbleStyles = {
  user: {
    borderRadius: '16px 16px 4px 16px',
    background: tokens.colorBrandBackground,
  },
  assistant: {
    borderRadius: '16px 16px 16px 4px',
    background: tokens.colorNeutralBackground1,
  },
} as const;

// 组合样式工具函数
export const createTransition = (
  properties: string[],
  duration: keyof typeof animation.duration = 'normal',
  easing: keyof typeof animation.easing = 'easeOut'
) => {
  return properties
    .map((prop) => `${prop} ${animation.duration[duration]} ${animation.easing[easing]}`)
    .join(', ');
};

// 渐变边框伪元素样式
export const gradientBorderStyle = {
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    background: aiEffects.gradientBorder,
    borderRadius: '3px 0 0 3px',
  },
};
