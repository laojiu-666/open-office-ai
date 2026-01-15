# Open Office AI

> AI 驱动的 Office 文档编辑助手 - PowerPoint Add-in

## 项目愿景

Open Office AI 是一个 Microsoft Office 插件，旨在将 AI 能力无缝集成到 PowerPoint 中，帮助用户：
- 智能改写、润色、翻译文档内容
- 基于自然语言指令自动生成幻灯片
- 通过 AI 图片生成增强演示文稿视觉效果

## 架构总览

```
src/
├── taskpane/          # Office Add-in 入口
├── adapters/          # Office API 适配层
│   └── powerpoint/    # PowerPoint 专用适配器
├── core/              # 核心业务逻辑
│   ├── llm/           # LLM 提供商抽象
│   └── image/         # 图片生成服务
├── ui/                # React UI 组件
│   ├── components/    # 可复用组件
│   ├── hooks/         # 自定义 Hooks
│   ├── store/         # Zustand 状态管理
│   └── styles/        # 设计系统
└── types/             # TypeScript 类型定义
```

## 模块结构图

```mermaid
graph TD
    A["(根) open-office-ai"] --> B["src/taskpane"]
    A --> C["src/adapters"]
    A --> D["src/core"]
    A --> E["src/ui"]
    A --> F["src/types"]

    C --> C1["powerpoint"]
    D --> D1["llm"]
    D --> D2["image"]
    E --> E1["components"]
    E --> E2["hooks"]
    E --> E3["store"]
    E --> E4["styles"]

    E1 --> E1a["chat"]
    E1 --> E1b["common"]
    E1 --> E1c["layout"]
    E1 --> E1d["settings"]

    click B "./src/taskpane/CLAUDE.md" "查看 taskpane 模块文档"
    click C1 "./src/adapters/powerpoint/CLAUDE.md" "查看 PowerPoint 适配器文档"
    click D1 "./src/core/llm/CLAUDE.md" "查看 LLM 模块文档"
    click D2 "./src/core/image/CLAUDE.md" "查看图片生成模块文档"
    click E "./src/ui/CLAUDE.md" "查看 UI 模块文档"
    click F "./src/types/CLAUDE.md" "查看类型定义文档"
```

## 模块索引

| 模块路径 | 职责 | 入口文件 | 关键依赖 |
|---------|------|---------|---------|
| `src/taskpane` | Office Add-in 入口，初始化 React 应用 | `index.tsx` | React, Fluent UI, Office.js |
| `src/adapters/powerpoint` | PowerPoint API 封装，文档操作适配 | `index.ts` | Office.js |
| `src/core/llm` | LLM 提供商抽象，支持 OpenAI/Anthropic | `factory.ts` | - |
| `src/core/image` | AI 图片生成服务 | `provider.ts` | - |
| `src/ui` | React UI 组件库 | - | React, Fluent UI, Zustand |
| `src/types` | TypeScript 类型定义 | `index.ts` | - |

## 运行与开发

### 环境要求
- Node.js 18+
- Microsoft Office (PowerPoint) 桌面版或 Web 版

### 开发命令
```bash
# 安装依赖
npm install

# 启动开发服务器 (https://localhost:3001)
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 启动 Office Add-in 调试
npm run start

# 验证 manifest
npm run validate
```

### 首次运行
1. 运行 `npm run dev` 启动开发服务器
2. 在 PowerPoint 中加载 `manifest.xml`
3. 点击 "Home" 选项卡中的 "Open Office AI" 按钮

## 测试策略

当前项目暂无自动化测试。建议添加：
- 单元测试：LLM Provider、SlideSpec 解析器
- 集成测试：PowerPoint API 适配器
- E2E 测试：完整的幻灯片生成流程

## 编码规范

### TypeScript
- 严格模式 (`strict: true`)
- 使用路径别名：`@/`, `@core/`, `@adapters/`, `@ui/`, `@types/`
- 接口命名以 `I` 前缀（如 `ILLMProvider`）
- 类型命名使用 PascalCase

### React
- 函数组件 + Hooks
- 使用 Fluent UI React v9 组件库
- 样式使用 `makeStyles` (Griffel)
- 状态管理使用 Zustand

### 文件组织
- 组件文件使用 PascalCase
- Hook 文件使用 camelCase，以 `use` 前缀
- 每个模块目录可包含 `index.ts` 作为公共导出

## AI 使用指引

### 代码生成
- 生成 React 组件时使用 Fluent UI v9 组件
- 遵循现有的 `makeStyles` 样式模式
- 新增 LLM Provider 需实现 `ILLMProvider` 接口

### 上下文理解
- `SlideSpec` 是幻灯片生成的核心数据结构
- PowerPoint API 调用需在 `PowerPoint.run()` 上下文中执行
- 状态管理集中在 `appStore.ts`

### 常见任务
1. **添加新的 LLM 提供商**：在 `src/core/llm/` 创建新 Provider 类，实现 `ILLMProvider`
2. **添加新的 UI 组件**：在 `src/ui/components/` 对应目录创建
3. **扩展 SlideSpec**：修改 `src/types/slide-spec.ts`

## 变更记录 (Changelog)

### 2026-01-15
- 初始化项目架构文档
- 完成全仓扫描，覆盖率 100%
