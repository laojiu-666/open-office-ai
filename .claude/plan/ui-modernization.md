# UI 现代化实施计划: "Luminous Productivity"

**目标**: 创建精致、专业的界面，带有微妙的现代 AI 特效，严格遵循 Fluent UI v9 模式。

---

## 1. 全局设计系统 & Token 配置

创建新文件 `src/ui/styles/designTokens.ts` 集中管理 "Luminous" 特定值：

### 渐变 (AI Magic)
- `aiGradientBorder`: `linear-gradient(135deg, #0078D4, #a855f7)` (蓝到紫)
- `aiGlowShadow`: `0 4px 12px rgba(97, 97, 255, 0.15)`

### 毛玻璃 (Header)
- `glassBackground`: `rgba(255, 255, 255, 0.85)`
- `glassFilter`: `blur(12px) saturate(180%)`

### 布局尺寸
- `headerHeight`: `48px` (紧凑)
- `inputFloatingBottom`: `16px`

---

## 2. 组件样式修改清单

### A. TaskPane.tsx / App.tsx
- 移除限制全宽背景的默认 padding
- 主容器设置 `position: relative`
- 背景使用 `tokens.colorNeutralBackground2`

### B. Header.tsx - "毛玻璃顶栏"
- 定位: `position: sticky, top: 0, zIndex: 100`
- 视觉: 应用 `glassBackground` 和 `glassFilter`
- 边框: 底部 `1px solid tokens.colorNeutralStroke2`
- 高度: 48px 紧凑设计

### C. MessageBubble.tsx - "结构化深度"
**用户消息:**
- 背景: `tokens.colorBrandBackground2`
- 圆角: `16px 16px 4px 16px`
- 对齐: 右侧

**AI 消息:**
- 背景: `tokens.colorNeutralBackground1`
- 效果: 左侧 4px 渐变边框条 或 `aiGlowShadow`
- 圆角: `16px 16px 16px 4px`
- 行高: 1.6
- 动画: fadeInUp 入场效果

### D. InputArea.tsx - "浮动命令中心"
- 布局: 从固定底部改为浮动卡片
- 定位: `position: fixed, bottom: 16px, left: 16px, right: 16px`
- 背景: `tokens.colorNeutralBackground1`
- 阴影: `tokens.shadow16`
- 圆角: `24px` (胶囊形状)
- 交互: 聚焦时品牌色发光环

### E. MessageList.tsx
- 底部 padding: `100px` (为浮动输入框留空间)
- 平滑滚动行为

### F. QuickActions.tsx
- 样式: 转换为药丸形 Chips
- 圆角: `100px`
- 背景: 透明
- Hover: `transform: translateY(-2px)`

### G. SettingsView.tsx
- 卡片式分组布局
- 更大的间距和圆角
- 输入框聚焦发光效果

### H. ContextIndicator.tsx
- 更紧凑的设计
- 选中状态使用品牌色高亮

---

## 3. 全局动画定义

```typescript
// 动画时长
animationDuration: {
  fast: '0.15s',
  medium: '0.3s'
}

// 缓动函数
animationTiming: {
  soft: 'cubic-bezier(0.33, 1, 0.68, 1)'
}

// 关键帧
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 4. 实施优先级

| 优先级 | 任务 | 文件 |
|--------|------|------|
| 1 | 创建设计 Token 文件 | `src/ui/styles/designTokens.ts` |
| 2 | 添加全局动画样式 | `src/taskpane/index.html` |
| 3 | 更新布局结构 | `TaskPane.tsx`, `ChatView.tsx` |
| 4 | 浮动输入框 | `InputArea.tsx` |
| 5 | 毛玻璃 Header | `Header.tsx` |
| 6 | 消息气泡现代化 | `MessageBubble.tsx`, `MessageList.tsx` |
| 7 | 快捷操作药丸化 | `QuickActions.tsx` |
| 8 | 设置页面优化 | `SettingsView.tsx` |
| 9 | 上下文指示器 | `ContextIndicator.tsx` |

---

## 5. 预期效果

- Header: 半透明毛玻璃，内容可在其下滚动
- 消息: AI 回复带有微妙的渐变边框发光
- 输入框: 浮动卡片式，聚焦时发光
- 整体: 流畅的入场动画，精致的微交互
