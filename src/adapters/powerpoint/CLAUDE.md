[根目录](../../../CLAUDE.md) > [adapters](../) > **powerpoint**

# PowerPoint 适配器模块

> 封装 PowerPoint JavaScript API，提供文档操作和上下文读取能力

## 模块职责

- 封装 Office.js 和 PowerPoint JavaScript API
- 提供统一的文档操作接口（选区读写、文本替换）
- 读取演示文稿上下文（幻灯片信息、形状、主题）
- 渲染 SlideSpec 规格到实际幻灯片

## 入口与启动

### index.ts
导出 `PowerPointAdapter` 类和单例获取函数：
- `getPowerPointAdapter()`: 获取适配器单例

### context.ts
上下文读取模块，提供：
- `getPresentationContext()`: 获取演示文稿基本信息
- `getSlideContext()`: 获取当前幻灯片详细信息
- `getSelectionContext()`: 获取选区上下文（含文本样式）
- `getThemeSpec()`: 获取主题信息
- `getAIContext()`: 获取完整 AI 上下文（聚合以上所有）

### slide-renderer.ts
幻灯片渲染模块，提供：
- `applySlideSpec()`: 将 SlideSpec 渲染为新幻灯片
- `insertImageToCurrentSlide()`: 插入图片到当前幻灯片
- `replaceSelectionWithFormat()`: 替换选中文本并应用格式

## 对外接口

### IDocumentAdapter 接口实现

```typescript
interface PowerPointAdapter {
  readonly host: 'powerpoint';
  readonly capabilities: DocumentCapabilities;
  getSelection(): Promise<DocumentSelection>;
  replaceSelection(text: string, format?: TextFormat): Promise<void>;
  insertText(text: string, format?: TextFormat): Promise<void>;
  deleteSelection(): Promise<void>;
  onSelectionChange(callback: (selection: DocumentSelection) => void): () => void;
}
```

### 上下文函数

| 函数 | 返回类型 | 说明 |
|-----|---------|------|
| `getPresentationContext` | `PresentationContext` | 幻灯片数量、当前索引、尺寸 |
| `getSlideContext` | `SlideContext \| null` | 当前幻灯片的形状列表 |
| `getSelectionContext` | `SelectionContext` | 选中文本及样式 |
| `getAIContext` | 聚合对象 | 完整上下文，用于发送给 LLM |

## 关键依赖与配置

| 依赖 | 用途 |
|-----|------|
| `Office.js` | Office 通用 API |
| `PowerPoint.js` | PowerPoint 专用 API |
| `@/types` | 类型定义 |

## 数据模型

### PresentationContext
```typescript
interface PresentationContext {
  slideCount: number;
  currentSlideIndex: number;
  slideWidth: number;   // 默认 960pt
  slideHeight: number;  // 默认 540pt
}
```

### SlideContext
```typescript
interface SlideContext {
  slideId: string;
  slideIndex: number;
  width: number;
  height: number;
  shapes: ShapeInfo[];
}
```

### ShapeInfo
```typescript
interface ShapeInfo {
  id: string;
  type: 'text' | 'image' | 'shape' | 'group' | 'unknown';
  bounds: Bounds;
  hasText?: boolean;
  text?: string;
}
```

## 测试与质量

当前无测试覆盖。建议添加：
- 单元测试：SlideSpec 渲染逻辑（mock PowerPoint API）
- 集成测试：实际 PowerPoint 环境中的 API 调用

## 常见问题 (FAQ)

**Q: 为什么 getThemeSpec 返回固定值？**
A: PowerPoint JS API 对主题的支持有限，当前返回默认 Office 主题。未来可通过 OOXML 解析获取真实主题。

**Q: 如何处理 API 调用失败？**
A: 所有函数都有 try-catch 包裹，失败时返回默认值或 null，不会抛出异常。

**Q: 为什么使用单例模式？**
A: 避免重复创建适配器实例，确保事件监听器正确管理。

## 相关文件清单

| 文件 | 说明 |
|-----|------|
| `index.ts` | 适配器主类，选区操作 |
| `context.ts` | 上下文读取函数 |
| `slide-renderer.ts` | SlideSpec 渲染器 |

## 变更记录 (Changelog)

### 2026-01-15
- 初始化模块文档
