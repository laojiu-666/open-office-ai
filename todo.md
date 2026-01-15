# Open Office AI - 待处理问题

## 高优先级

### 1. 无法自动获取整页 PPT 内容

**问题描述**：
PowerPoint JS API 对 `GeometricShape` 类型的形状（包括模板占位符如标题、副标题）不支持直接访问 `textFrame` 属性，导致无法自动读取 PPT 中的文本内容。

**当前状态**：
- 用户需要先选中文本，才能让 AI 理解 PPT 内容
- 如果没有选中文本，会显示提示信息

**影响范围**：
- `src/adapters/powerpoint/context.ts` - `getSlideTextContent()` 函数

**可能的解决方案**：
1. **UI 提示**：在界面上提示用户"选中文本后 AI 可以理解内容"
2. **OOXML 方案**：研究通过 `Office.context.document.getFileAsync()` 获取 OOXML 格式的文档内容，然后解析 XML 提取文本
3. **剪贴板方案**：尝试通过模拟 Ctrl+A 全选后获取内容（可能有权限限制）
4. **等待 API 更新**：关注微软 PowerPoint JS API 的更新，可能会增加对更多形状类型的支持

**相关日志**：
```
[getSlideTextContent] Slide 1, Shape 0: type=GeometricShape, name=Title 1
[getSlideTextContent] Slide 1, Shape 0: no text support
```

**参考文档**：
- [PowerPoint JavaScript API](https://learn.microsoft.com/en-us/javascript/api/powerpoint)
- [Shape.textFrame 属性](https://learn.microsoft.com/en-us/javascript/api/powerpoint/powerpoint.shape#powerpoint-powerpoint-shape-textframe-member)

---

## 中优先级

### 2. 移除调试日志

**问题描述**：
代码中添加了大量 `console.log` 调试日志，生产环境需要移除或改为可配置的日志级别。

**影响范围**：
- `src/adapters/powerpoint/context.ts`
- `src/adapters/powerpoint/slide-renderer.ts`
- `src/ui/hooks/useLLMStream.ts`
- `src/ui/components/chat/InputArea.tsx`
- `src/core/llm/response-parser.ts`

**建议**：
- 引入日志工具库或创建简单的日志封装
- 支持通过环境变量控制日志级别

---

## 低优先级

### 3. 上下文管理优化

**问题描述**：
当前的 Token 估算使用简单的字符数除以 2 的方式，可能不够精确。

**当前实现**：
- `src/ui/hooks/useLLMStream.ts` - `estimateTokens()` 函数

**可能的优化**：
- 引入 `tiktoken` 或类似库进行精确的 token 计算
- 针对中英文混合内容优化估算算法

---

## 已完成

- [x] 修复生成幻灯片时 `load` 报错
- [x] 生成幻灯片时移除默认的占位标题和副标题
- [x] 生成幻灯片按钮不显示的问题
- [x] 实现上下文管理（Token 预算 + 滑动窗口）
- [x] 修复 Griffel `borderColor` 简写属性警告
- [x] 修复 `@fluentui/react-icons` 图标导入错误
