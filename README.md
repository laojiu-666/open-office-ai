# Open Office AI

Office Add-in 插件，集成 AI 辅助文档编辑功能。

## 功能

- 配置第三方 LLM API（OpenAI、Claude、自定义）
- 聊天式交互界面
- 划词获取上下文
- 流式生成内容
- 一键插入/替换文档内容

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 在 PowerPoint 中加载

1. 运行 `npm run dev` 启动开发服务器
2. 打开 PowerPoint
3. 插入 > 获取加载项 > 上传我的加载项
4. 选择 `manifest.xml` 文件

## 技术栈

- React 18 + TypeScript
- Fluent UI React v9
- Office.js
- Zustand（状态管理）
