# 实施计划：PowerPoint API 测试功能扩展

## 任务类型
- [x] 前端 (Gemini)
- [x] 后端 (Codex)
- [x] 全栈 (并行)

---

## 技术方案

### 背景分析

根据 Codex 和 Gemini 的多模型协作分析，现有开发者工具页面已实现：
- 文字插入测试 (TextTestSection)
- 图片插入测试 (ImageTestSection)
- 背景测试 (BackgroundTestSection)
- 快捷操作：清除幻灯片、获取信息

需要扩展以下常用 PowerPoint API 测试功能：

| API 类别 | 版本要求 | 优先级 | 风险等级 |
|---------|---------|--------|----------|
| 幻灯片操作 | 1.2/1.3/1.6 | P0 | 中（删除需确认）|
| 选区操作 | 1.6 | P0 | 低（只读）|
| 几何形状 | 1.4/1.8 | P1 | 低 |
| 表格操作 | 1.8 | P2 | 低 |

### 架构设计

```
src/ui/components/developer/
├── DeveloperPage.tsx          # 主容器（需修改：添加新区块）
├── sections/
│   ├── SlideTestSection.tsx   # 新增：幻灯片操作
│   ├── SelectionTestSection.tsx # 新增：选区检查
│   ├── ShapeTestSection.tsx   # 新增：几何形状
│   ├── TableTestSection.tsx   # 新增：表格操作
│   ├── GeometryInputs.tsx     # 新增：复用的位置/尺寸输入组件
│   └── ...existing...
└── types.ts                   # 需修改：添加新配置类型

src/adapters/powerpoint/
├── test-runner.ts             # 需修改：添加新测试方法
└── ...existing...
```

---

## 实施步骤

### 阶段一：基础设施（估计改动量：小）

#### Step 1.1：扩展 API 版本检测

修改 `DeveloperPage.tsx` 的 `checkApiSupport()` 函数，添加更多版本检测：

```typescript
function checkApiSupport() {
  return {
    api12: Office.context.requirements.isSetSupported('PowerPointApi', '1.2'),
    api13: Office.context.requirements.isSetSupported('PowerPointApi', '1.3'),
    api14: Office.context.requirements.isSetSupported('PowerPointApi', '1.4'),
    api16: Office.context.requirements.isSetSupported('PowerPointApi', '1.6'),
    api18: Office.context.requirements.isSetSupported('PowerPointApi', '1.8'),
    api110: Office.context.requirements.isSetSupported('PowerPointApi', '1.10'),
  };
}
```

#### Step 1.2：创建复用组件 GeometryInputs

提取 X/Y/Width/Height 输入组件，供多个测试区块复用：

```typescript
// src/ui/components/developer/sections/GeometryInputs.tsx
interface GeometryInputsProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onChange: (field: 'x' | 'y' | 'width' | 'height', value: number) => void;
  maxX?: number;  // 默认 960
  maxY?: number;  // 默认 540
}
```

---

### 阶段二：幻灯片操作测试（P0）

#### Step 2.1：扩展 test-runner.ts

添加幻灯片操作方法：

```typescript
// PowerPointTestRunner 新增方法
export const PowerPointTestRunner = {
  // ...existing...

  // 幻灯片操作
  async addSlide(): Promise<TestResult> { ... },
  async deleteSlide(requireConfirm?: boolean): Promise<TestResult> { ... },
  async navigateToSlide(index: number): Promise<TestResult> { ... },
  async getSlideCount(): Promise<{ count: number; current: number }> { ... },
};
```

API 调用示例：
```typescript
// 添加幻灯片
context.presentation.slides.add();

// 删除幻灯片（0-based index）
const slide = context.presentation.slides.getItemAt(index);
slide.delete();

// 导航到幻灯片
context.presentation.setSelectedSlides([slideId]);
```

#### Step 2.2：创建 SlideTestSection.tsx

UI 布局：
```
+------------------------------------------+
| 幻灯片操作                    [添加幻灯片] |
+------------------------------------------+
| 当前位置: 第 3 页 / 共 10 页              |
|                                          |
| [<] [>]  跳转到: [SpinButton]  [跳转]    |
|                                          |
| [删除当前幻灯片] (需二次确认)              |
+------------------------------------------+
```

---

### 阶段三：选区操作测试（P0）

#### Step 3.1：扩展 test-runner.ts

```typescript
async getSelectedShapes(): Promise<{
  success: boolean;
  shapes?: Array<{
    id: string;
    type: string;
    hasText: boolean;
    text?: string;
  }>;
  error?: string;
}> { ... },

async getSelectedText(): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> { ... },
```

API 调用示例：
```typescript
// 获取选中的形状
const selectedShapes = slide.shapes.getSelectedShapes();
selectedShapes.load(['id', 'type', 'textFrame']);

// 获取选中文本（使用 Common API）
Office.context.document.getSelectedDataAsync(Office.CoercionType.Text);
```

#### Step 3.2：创建 SelectionTestSection.tsx

UI 布局：
```
+------------------------------------------+
| 选区检查                      [读取选区]   |
+------------------------------------------+
| 选区类型: [Badge: 2 个形状]               |
|                                          |
| ┌────────────────────────────────────┐   |
| │ Shape 1: TextBox                   │   |
| │   ID: abc123                       │   |
| │   Text: "Hello World"              │   |
| │                                    │   |
| │ Shape 2: Rectangle                 │   |
| │   ID: def456                       │   |
| └────────────────────────────────────┘   |
+------------------------------------------+
```

---

### 阶段四：几何形状测试（P1）

#### Step 4.1：扩展 test-runner.ts

```typescript
async insertShape(options: {
  type: 'rectangle' | 'ellipse' | 'triangle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  lineColor?: string;
  lineWeight?: number;
}): Promise<TestResult> { ... },
```

API 调用示例：
```typescript
// 添加几何形状
const shape = slide.shapes.addGeometricShape(
  PowerPoint.GeometricShapeType.rectangle,
  { left: x, top: y, width, height }
);

// 设置填充颜色
shape.fill.setSolidColor(fillColor);

// 设置线条
shape.lineFormat.color = lineColor;
shape.lineFormat.weight = lineWeight;
```

#### Step 4.2：创建 ShapeTestSection.tsx

UI 布局：
```
+------------------------------------------+
| 形状插入测试                  [插入形状]   |
+------------------------------------------+
| 形状类型: [Dropdown: 矩形 v]              |
|                                          |
| X: [100] Y: [100] 宽: [200] 高: [100]    |
|                                          |
| 填充色: [#4F6BED]  边框色: [#000000]      |
| 边框宽度: [1.5]                           |
+------------------------------------------+
```

---

### 阶段五：表格测试（P2）

#### Step 5.1：扩展 test-runner.ts

```typescript
async insertTable(options: {
  rows: number;
  columns: number;
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<TestResult> { ... },
```

API 调用示例：
```typescript
// 添加表格（需要 API 1.8+）
const table = slide.shapes.addTable(rows, columns);
table.left = x;
table.top = y;
```

#### Step 5.2：创建 TableTestSection.tsx

UI 布局：
```
+------------------------------------------+
| 表格插入测试                  [插入表格]   |
+------------------------------------------+
| 行数: [3]  列数: [4]                      |
|                                          |
| X: [50] Y: [100] 宽: [800] 高: [200]     |
+------------------------------------------+
```

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/ui/components/developer/DeveloperPage.tsx` | 修改 | 添加新测试区块、扩展 API 检测 |
| `src/ui/components/developer/types.ts` | 修改 | 添加新配置类型定义 |
| `src/adapters/powerpoint/test-runner.ts` | 修改 | 添加新测试方法 |
| `src/ui/components/developer/sections/GeometryInputs.tsx` | 新增 | 复用的位置/尺寸输入组件 |
| `src/ui/components/developer/sections/SlideTestSection.tsx` | 新增 | 幻灯片操作测试区块 |
| `src/ui/components/developer/sections/SelectionTestSection.tsx` | 新增 | 选区检查测试区块 |
| `src/ui/components/developer/sections/ShapeTestSection.tsx` | 新增 | 几何形状测试区块 |
| `src/ui/components/developer/sections/TableTestSection.tsx` | 新增 | 表格测试区块 |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 删除幻灯片误操作 | 添加二次确认对话框 |
| API 版本不支持 | 检测后禁用按钮 + 提示升级 |
| 选区为空时调用失败 | 预检查选区状态，显示友好提示 |
| 表格 API 仅 1.8+ | 显示版本要求 Badge |

---

## 类型定义（types.ts 扩展）

```typescript
// 新增配置类型
export interface SlideTestConfig {
  targetIndex: number;
}

export interface SelectionTestConfig {
  includeText: boolean;
}

export interface ShapeTestConfig {
  type: 'rectangle' | 'ellipse' | 'triangle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  lineColor: string;
  lineWeight: number;
}

export interface TableTestConfig {
  rows: number;
  columns: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 默认配置
export const DEFAULT_SHAPE_CONFIG: ShapeTestConfig = {
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  fillColor: '#4F6BED',
  lineColor: '#000000',
  lineWeight: 1,
};

export const DEFAULT_TABLE_CONFIG: TableTestConfig = {
  rows: 3,
  columns: 4,
  x: 50,
  y: 100,
  width: 800,
  height: 200,
};
```

---

## Office.js API 参考

### 常用 PowerPoint API 速查

| API | 版本 | 用途 |
|-----|------|------|
| `slides.add()` | 1.2 | 添加幻灯片 |
| `slide.delete()` | 1.3 | 删除幻灯片 |
| `getSelectedSlides()` | 1.6 | 获取选中幻灯片 |
| `setSelectedSlides()` | 1.6 | 导航到幻灯片 |
| `shapes.addGeometricShape()` | 1.4 | 添加几何形状 |
| `shapes.addTextBox()` | 1.4 | 添加文本框 |
| `shapes.addTable()` | 1.8 | 添加表格 |
| `fill.setImage()` | 1.8 | 图片填充 |
| `shapes.getSelectedShapes()` | 1.6+ | 获取选中形状 |

### 参考文档
- [PowerPoint API 要求集](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/powerpoint/powerpoint-api-requirement-sets)
- [PowerPoint API 1.8 要求集](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/powerpoint/powerpoint-api-1-8-requirement-set)

---

## SESSION_ID（供 /ccg:execute 使用）

- CODEX_SESSION: `019bcf4a-b5da-7ee0-9429-1ff952812c36`
- GEMINI_SESSION: `5fd8413b-daa1-4991-bbe0-7e7b257d2243`

---

## 执行顺序建议

1. **阶段一**：基础设施（GeometryInputs + API 检测扩展）
2. **阶段二**：幻灯片操作（高频使用）
3. **阶段三**：选区操作（配合幻灯片使用）
4. **阶段四**：几何形状（扩展内容创建能力）
5. **阶段五**：表格操作（高级功能）

每阶段完成后进行功能测试，确保日志输出正确、API 调用稳定。
