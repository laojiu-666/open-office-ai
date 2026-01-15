# PPT AI 助手功能扩展实施计划

## 概述

基于「结构化规格驱动」方案，为 Office PowerPoint AI 助手实现 4 个核心功能：
1. PPT 上下文理解
2. AI 图片生成
3. 文字格式适配
4. 单页 PPT 生成

## 架构设计

### 核心理念：智能与渲染分离

```
用户输入 → LLM 生成 SlideSpec (JSON) → 前端解析执行 → PowerPoint API 渲染
```

### SlideSpec 数据结构

```typescript
interface SlideSpec {
  version: '1.0';
  title?: TextBlockSpec;
  blocks: SlideBlockSpec[];
  layout: {
    templateId: string;
    slots: LayoutSlot[];
  };
  theme?: ThemeSpec;
  assets?: ImageAssetSpec[];
}
```

---

## 实施计划

### Phase 1: 基础设施（类型与配置）

#### 1.1 扩展类型定义
- [ ] `src/types/slide-spec.ts` - SlideSpec 相关类型
- [ ] `src/types/index.ts` - 导出新类型

#### 1.2 状态管理扩展
- [ ] `src/ui/store/appStore.ts` - 添加 imageGenConfig、presentationContext

#### 1.3 设置页面扩展
- [ ] `src/ui/components/settings/SettingsView.tsx` - 图片 API 配置区域

### Phase 2: PPT 上下文读取

#### 2.1 PowerPointAdapter 扩展
- [ ] `src/adapters/powerpoint/context.ts` - 上下文读取模块
  - `getSlideContext()` - 获取幻灯片信息
  - `getSelectionContext()` - 获取选区上下文
  - `getTextStyleFromSelection()` - 获取文本样式

#### 2.2 上下文 Hook
- [ ] `src/ui/hooks/usePresentationContext.ts` - 演示文稿上下文 Hook

### Phase 3: 图片生成服务

#### 3.1 图片生成 Provider
- [ ] `src/core/image/types.ts` - 图片生成类型定义
- [ ] `src/core/image/provider.ts` - OpenAI 兼容图片生成

#### 3.2 图片生成 Hook
- [ ] `src/ui/hooks/useImageGeneration.ts` - 图片生成 Hook

### Phase 4: 幻灯片生成

#### 4.1 SlideSpec 执行器
- [ ] `src/adapters/powerpoint/slide-renderer.ts` - SlideSpec 渲染器
  - `applySlideSpec()` - 应用规格到 PPT
  - `insertImageByAsset()` - 插入图片资源

#### 4.2 幻灯片生成 Hook
- [ ] `src/ui/hooks/useSlideGenerator.ts` - 幻灯片生成编排

### Phase 5: UI 组件

#### 5.1 进度指示器
- [ ] `src/ui/components/common/ProcessStepIndicator.tsx`

#### 5.2 幻灯片生成卡片
- [ ] `src/ui/components/chat/cards/SlideGenerationCard.tsx`

#### 5.3 上下文可视化增强
- [ ] `src/ui/components/common/ContextIndicator.tsx` - 增强显示

### Phase 6: LLM 集成

#### 6.1 System Prompt 扩展
- [ ] `src/ui/hooks/useLLMStream.ts` - 扩展 system prompt，支持 SlideSpec 输出

#### 6.2 响应解析
- [ ] `src/core/llm/response-parser.ts` - 解析 LLM 返回的 SlideSpec

---

## 关键接口定义

### ImageGenConfig（图片生成配置）

```typescript
interface ImageGenConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultSize: '512x512' | '1024x1024';
}
```

### PresentationContext（演示文稿上下文）

```typescript
interface PresentationContext {
  slideCount: number;
  currentSlideIndex: number;
  slideWidth: number;
  slideHeight: number;
  themeColors: string[];
  themeFonts: { heading: string; body: string };
}
```

### PowerPointAdapter 扩展方法

```typescript
interface PowerPointAdapterExtended {
  // 上下文读取
  getSlideContext(): Promise<SlideContext>;
  getSelectionContext(): Promise<SelectionContext>;
  getTextStyleFromSelection(): Promise<TextStyle | null>;

  // 规格应用
  applySlideSpec(spec: SlideSpec): Promise<ApplySlideSpecResult>;
  insertImageByAsset(slotId: string, asset: ImageAssetSpec): Promise<string>;
}
```

---

## 用户交互流程

### 场景：生成关于 Q4 销售的幻灯片

1. **用户输入**：「生成一页关于 Q4 销售业绩的幻灯片，包含图表」
2. **上下文读取**：自动获取当前 PPT 主题、字体、颜色
3. **LLM 生成**：返回 SlideSpec JSON
4. **进度显示**：ProcessStepIndicator 显示步骤
   - ✅ 分析上下文
   - ✅ 生成内容
   - 🔄 生成图片...
   - ⏳ 应用布局
5. **图片生成**：调用配置的图片 API
6. **渲染执行**：创建幻灯片、插入内容、应用格式
7. **完成反馈**：显示「幻灯片 5 已创建」+ 撤销按钮

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| Office.js API 版本差异 | 能力探测 + 降级策略 |
| 图片生成延迟 | 进度可视化 + 流式反馈 |
| 格式继承不准确 | 优先继承选区样式，回退到主题默认 |
| 布局破坏用户内容 | 默认创建新幻灯片，不覆盖现有内容 |

---

## 验收标准

1. ✅ 能够读取当前幻灯片的文本、布局、主题信息
2. ✅ 能够配置并调用图片生成 API
3. ✅ 生成的文字自动继承 PPT 格式
4. ✅ 能够一键生成包含文字和图片的完整幻灯片
5. ✅ 生成过程有清晰的进度反馈
