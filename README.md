# Open Office AI

> AI 驱动的 Office 文档编辑助手 - PowerPoint Add-in

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 项目简介

Open Office AI 是一个 Microsoft Office 插件，旨在将 AI 能力无缝集成到 PowerPoint 中，帮助用户：

- 智能改写、润色、翻译文档内容
- 基于自然语言指令自动生成幻灯片
- 通过 AI 图片生成增强演示文稿视觉效果

## 功能特性

- **多 LLM 支持**：配置第三方 LLM API（OpenAI、Claude、自定义端点）
- **聊天式交互**：自然语言对话界面
- **上下文感知**：划词获取选中内容作为上下文
- **流式生成**：实时流式输出 AI 响应
- **一键操作**：快速插入或替换文档内容
- **AI 图片生成**：为幻灯片生成配图

## 技术栈

- **前端框架**：React 18 + TypeScript
- **UI 组件库**：Fluent UI React v9
- **状态管理**：Zustand
- **Office 集成**：Office.js
- **构建工具**：Webpack 5

## 项目结构

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

## 快速开始

### 环境要求

- Node.js 18+
- Microsoft Office (PowerPoint) 桌面版或 Web 版

### 安装

```bash
# 克隆仓库
git clone https://github.com/laojiu-666/open-office-ai.git
cd open-office-ai

# 安装依赖
npm install

# 安装开发证书（首次运行必需）
npx office-addin-dev-certs install
```

### 开发

```bash
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

## 在 PowerPoint 中加载

### 方式一：手动加载（推荐开发时使用）

1. 运行 `npm run dev` 启动开发服务器
2. 打开 PowerPoint
3. 点击 **插入** > **获取加载项** > **上传我的加载项**
4. 选择项目根目录下的 `manifest.xml` 文件
5. 点击 **Home** 选项卡中的 **Open Office AI** 按钮

### 方式二：使用调试命令

```bash
npm run start
```

此命令会自动启动开发服务器并在 PowerPoint 中加载插件。

## 配置 LLM

首次使用时，点击设置图标配置 LLM 提供商：

1. 选择提供商类型（OpenAI / Claude / 自定义）
2. 输入 API Key
3. （可选）配置自定义端点 URL
4. 保存设置

## 许可证

[MIT](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！

- 问题反馈：[GitHub Issues](https://github.com/laojiu-666/open-office-ai/issues)
- 项目主页：[GitHub](https://github.com/laojiu-666/open-office-ai)
