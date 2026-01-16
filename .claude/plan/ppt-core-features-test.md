# PPT 核心功能测试页面 - 实施计划

## 概述

实现 PowerPoint Add-in 的核心功能模块，包括文字插入、图片插入、背景设置（含平铺），并创建独立的 Developer 测试页面验证功能。

## 架构设计

### 后端架构（Codex 规划）

#### 1. 类型扩展 - `src/types/slide-spec.ts`

```typescript
export type BackgroundMode = 'stretch' | 'tile';

export interface BackgroundTileSpec {
  width: number;
  height: number;
  scale?: number;
}

export interface BackgroundSpec {
  assetId: string;
  mode?: BackgroundMode;
  transparency?: number; // 0..1
  tile?: BackgroundTileSpec;
  allowFallback?: boolean;
}

// SlideSpec 新增 background 字段
export interface SlideSpec {
  // ... existing fields
  background?: BackgroundSpec;
}
```

#### 2. Canvas 平铺工具 - `src/adapters/powerpoint/canvas-tiler.ts`（新建）

```typescript
export interface CanvasTileOptions {
  slideWidth: number;
  slideHeight: number;
  tileWidth: number;
  tileHeight: number;
  scale?: number;
  backgroundColor?: string;
}

export async function composeTiledBackground(
  imageBase64: string,
  options: CanvasTileOptions
): Promise<string>;
```

#### 3. 背景渲染 - `src/adapters/powerpoint/slide-renderer.ts`

```typescript
async function applyBackground(
  context: PowerPoint.RequestContext,
  slide: PowerPoint.Slide,
  spec: SlideSpec,
  assets: ImageAsset[] | undefined,
  slideSize: { width: number; height: number }
): Promise<{ applied: boolean; method?: 'background-api' | 'shape-fallback'; error?: string }>;
```

#### 4. 幻灯片尺寸 - `src/adapters/powerpoint/context.ts`

- 使用 `pageSetup.slideWidth/slideHeight` 获取实际尺寸
- 回退到 960x540

### 前端架构（Gemini 规划）

#### 1. 目录结构

```
src/ui/components/developer/
├── DeveloperPage.tsx           # 主容器
├── TestLogConsole.tsx          # 日志控制台
├── useTestConsole.ts           # 日志 Hook
├── types.ts                    # 类型定义
└── sections/
    ├── TestSectionCard.tsx     # 通用卡片包装
    ├── TextTestSection.tsx     # 文字测试
    ├── ImageTestSection.tsx    # 图片测试
    └── BackgroundTestSection.tsx # 背景测试
```

#### 2. 测试运行器 - `src/adapters/powerpoint/test-runner.ts`（新建）

```typescript
export const PowerPointTestRunner = {
  insertText: async (text: string, options: TextOptions) => Promise<Result>,
  insertImage: async (base64: string, options: ImageOptions) => Promise<Result>,
  setSlideBackground: async (type: 'solid' | 'image', value: string, mode?: 'stretch' | 'tile') => Promise<Result>,
  resetSlide: async () => Promise<void>
};
```

#### 3. 状态管理

- `appStore.ts`: 添加 `'developer'` 到 `settingsPage` 类型
- `useTestConsole.ts`: 本地日志状态管理

## 文件修改清单

### 新建文件

| 文件路径 | 职责 |
|---------|------|
| `src/adapters/powerpoint/canvas-tiler.ts` | Canvas 平铺合成工具 |
| `src/adapters/powerpoint/test-runner.ts` | 测试运行器封装 |
| `src/ui/components/developer/DeveloperPage.tsx` | 测试页面主容器 |
| `src/ui/components/developer/TestLogConsole.tsx` | 日志控制台组件 |
| `src/ui/components/developer/useTestConsole.ts` | 日志状态 Hook |
| `src/ui/components/developer/types.ts` | 类型定义 |
| `src/ui/components/developer/sections/TestSectionCard.tsx` | 通用卡片组件 |
| `src/ui/components/developer/sections/TextTestSection.tsx` | 文字测试区块 |
| `src/ui/components/developer/sections/ImageTestSection.tsx` | 图片测试区块 |
| `src/ui/components/developer/sections/BackgroundTestSection.tsx` | 背景测试区块 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/types/slide-spec.ts` | 添加 BackgroundSpec 类型和 background 字段 |
| `src/adapters/powerpoint/slide-renderer.ts` | 添加 applyBackground 函数 |
| `src/adapters/powerpoint/context.ts` | 动态获取幻灯片尺寸 |
| `src/ui/store/appStore.ts` | settingsPage 添加 'developer' |
| `src/ui/components/settings/SettingsView.tsx` | 添加 developer 路由 |
| `src/ui/components/settings/SettingsMain.tsx` | 添加 Developer Tools 入口 |

## 实施步骤

### Phase 1: 类型和工具层
1. 扩展 `slide-spec.ts` 类型定义
2. 创建 `canvas-tiler.ts` 平铺工具
3. 更新 `context.ts` 获取幻灯片尺寸

### Phase 2: 适配器层
4. 扩展 `slide-renderer.ts` 添加 applyBackground
5. 创建 `test-runner.ts` 测试运行器

### Phase 3: UI 层
6. 创建 developer 组件目录和类型
7. 实现 useTestConsole Hook
8. 实现 TestLogConsole 组件
9. 实现 TestSectionCard 通用组件
10. 实现 TextTestSection
11. 实现 ImageTestSection
12. 实现 BackgroundTestSection
13. 实现 DeveloperPage 主容器

### Phase 4: 集成
14. 更新 appStore 状态类型
15. 更新 SettingsView 路由
16. 更新 SettingsMain 添加入口

## 技术要点

### API 版本检测
```typescript
Office.context.requirements.isSetSupported('PowerPointApi', '1.10')
```

### 错误处理
- `background_asset_missing`: 资源未找到
- `background_api_unsupported`: API 不支持
- `background_compose_failed`: Canvas 合成失败
- `background_data_invalid`: 数据无效

### 降级策略
- 背景 API 不支持时，使用全幅图片形状作为背景
- 幻灯片尺寸获取失败时，回退到 960x540
