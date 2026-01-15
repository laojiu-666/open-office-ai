[根目录](../../CLAUDE.md) > **taskpane**

# Taskpane 模块

> Office Add-in 入口模块，负责初始化 React 应用并挂载到 Office 任务窗格

## 模块职责

- 监听 Office.onReady 事件，确保 Office.js API 可用
- 初始化 FluentProvider 主题
- 挂载 React 应用根组件

## 入口与启动

### index.tsx
应用入口文件，执行以下流程：
1. 等待 `Office.onReady()` 回调
2. 检查宿主类型是否为 PowerPoint
3. 创建 React root 并渲染 App 组件
4. 包裹 FluentProvider 提供 Fluent UI 主题

### App.tsx
根组件，负责：
- 根据 `currentView` 状态切换 ChatView / SettingsView
- 提供 TaskPane 布局容器

## 对外接口

本模块不对外暴露接口，仅作为应用入口。

## 关键依赖与配置

| 依赖 | 用途 |
|-----|------|
| `react-dom/client` | React 18 createRoot API |
| `@fluentui/react-components` | FluentProvider, webLightTheme |
| `@ui/store/appStore` | 全局状态管理 |
| `@ui/components/layout/TaskPane` | 布局容器 |
| `@ui/components/chat/ChatView` | 聊天视图 |
| `@ui/components/settings/SettingsView` | 设置视图 |

## 数据模型

无独立数据模型，依赖 `appStore` 中的 `currentView` 状态。

## 测试与质量

当前无测试覆盖。建议添加：
- 单元测试：App 组件视图切换逻辑
- 集成测试：Office.onReady 初始化流程

## 常见问题 (FAQ)

**Q: 为什么使用 webLightTheme？**
A: Office Add-in 默认使用浅色主题，与 Office 界面保持一致。

**Q: 如何支持深色模式？**
A: 可监听 Office 主题变化事件，动态切换 FluentProvider 的 theme prop。

## 相关文件清单

| 文件 | 说明 |
|-----|------|
| `index.tsx` | 应用入口 |
| `index.html` | HTML 模板 |
| `App.tsx` | 根组件 |

## 变更记录 (Changelog)

### 2026-01-15
- 初始化模块文档
