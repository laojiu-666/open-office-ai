# TODO - PPT Function Calling 系统进阶任务

> 当前系统已实现核心功能，以下为后续优化和扩展方向

---

## ✅ 已完成任务（2026-01-18）

- ✅ 实现完整的多轮对话循环（P0）
- ✅ 增强参数校验错误反馈（P0）
- ✅ 添加工具调用历史记录基础设施（P2）

---

## 🔴 高优先级（影响核心体验）

### 4. 验证并优化 Fallback 逻辑（P1）
**当前状态**：需要审查 `applySlideSpec` 的 fallback 逻辑是否安全
**目标**：确认当前 Fallback 逻辑安全，或修复潜在问题

**实施步骤**：
- [ ] 验证 `applySlideSpec` 是否总是先创建新幻灯片
- [ ] 检查是否有其他路径可能污染当前幻灯片
- [ ] 审查 `slide-renderer.ts` 中的所有 fallback 逻辑
- [ ] 添加安全检查（如需要）
- [ ] 添加日志记录 fallback 触发情况
- [ ] 添加用户确认机制（可选）

**相关文件**：
- `src/adapters/powerpoint/slide-renderer.ts:61-85`
- `src/core/tools/ppt-tools.ts:100-108`

---

### 5. 能力路由系统与图片生成服务重构（P1）
**当前状态**：需要将图片生成服务迁移到新的能力路由架构
**目标**：统一 LLM 和图片生成服务的能力管理，支持多提供商动态路由

**实施步骤**：
- [ ] 修改图片生成服务使用适配器模式
  - 重构 `src/core/image/provider.ts` 使用统一的 Provider 接口
  - 支持多个图片生成提供商（OpenAI DALL-E、Stability AI 等）
  - 实现能力标签系统（如 `image-generation`, `text-to-image`）
- [ ] 在应用启动时初始化注册表
  - 在 `src/taskpane/index.tsx` 中初始化 CapabilityRouter
  - 注册所有可用的 LLM 和图片生成 Provider
  - 添加 Provider 健康检查和降级逻辑
- [ ] 增加能力标签展示
  - 在设置页面显示当前可用的 Provider 及其能力
  - 添加能力状态指示器（可用/不可用/降级）
  - 支持用户手动选择 Provider 或使用自动路由
- [ ] 测试文本和图片生成功能
  - 验证 LLM Provider 的能力路由正确性
  - 验证图片生成 Provider 的能力路由正确性
  - 测试多 Provider 场景下的自动降级

**相关文件**：
- `src/core/capability-router.ts`
- `src/core/providers/`
- `src/core/image/provider.ts`
- `src/taskpane/index.tsx`
- `src/ui/components/settings/SettingsView.tsx`

---

## 🟡 中优先级（提升用户体验）

### 6. 添加工具调用历史记录 UI（P2）
**当前状态**：后端已实现历史记录，缺少 UI 展示
**目标**：在开发者页面显示完整的工具调用历史

**实施步骤**：
- [ ] 创建 `src/ui/components/developer/sections/ToolHistorySection.tsx`
  - 显示表格: 时间 | 工具 | 参数 | 结果 | 耗时 | 状态
  - 支持筛选（成功/失败）和搜索
  - 支持导出为 JSON
- [ ] 在 `src/ui/components/developer/DeveloperPage.tsx` 中集成新 Section

**参考实现**：Gemini 已提供完整的 UI 原型（见 `.claude/plan/ppt-function-calling-enhancements.md`）

---

### 7. 支持流式工具调用（P2）
**当前状态**：使用 `provider.send()` 进行同步调用
**目标**：使用 `provider.stream()` 实现流式工具调用

**实施步骤**：
- [ ] 研究 OpenAI 流式 tool_calls 格式（delta 累积）
- [ ] 修改 `useLLMStream.ts` 使用 `stream()` 代替 `send()`
- [ ] 实现 tool_calls delta 累积和解析
- [ ] 在 UI 中实时显示工具调用进度
- [ ] 测试流式场景

**相关文件**：
- `src/ui/hooks/useLLMStream.ts`
- `src/core/llm/openai.ts`

---

### 8. 扩展 Anthropic 和 Gemini Provider（P2）
**当前状态**：仅 OpenAI Provider 支持 Function Calling
**目标**：适配 Anthropic Tool Use 和 Gemini Function Calling

**实施步骤**：
- [ ] **Anthropic Provider**：
  - 研究 Anthropic Tool Use API 格式
  - 实现 `tools` 参数转换
  - 实现 `tool_use` 响应解析
  - 实现 `tool_result` 消息构建
- [ ] **Gemini Provider**：
  - 研究 Gemini Function Calling API 格式
  - 实现 `tools` 参数转换
  - 实现 `functionCall` 响应解析
  - 实现 `functionResponse` 消息构建
- [ ] 统一接口，确保三个 Provider 的工具调用接口一致
- [ ] 在 `factory.ts` 中添加 Provider 能力检测

**参考实现**：Codex 已提供完整的 Unified Diff（见 `.claude/plan/ppt-function-calling-enhancements.md`）

**相关文件**：
- `src/core/llm/anthropic.ts`
- `src/core/llm/gemini.ts`
- `src/core/llm/factory.ts`

---

## 🟢 低优先级（锦上添花）

### 9. 添加工具权限管理
**目标**：敏感操作需要用户确认

**实施步骤**：
- [ ] 定义敏感工具列表（如删除、修改等）
- [ ] 在工具执行前添加确认对话框
- [ ] 记录用户授权历史

---

### 10. 实现工具组合调用
**目标**：支持一次调用多个工具

**实施步骤**：
- [ ] 设计工具组合 DSL
- [ ] 实现并行工具执行
- [ ] 处理工具间依赖关系

---

### 11. 优化大参数传输
**问题**：base64 图片数据可能导致请求过大

**实施步骤**：
- [ ] 实现图片压缩
- [ ] 支持图片 URL 引用
- [ ] 添加参数大小限制

---

### 12. 添加单元测试和集成测试
**当前状态**：无测试覆盖

**实施步骤**：
- [ ] **单元测试**：
  - `parseToolCalls` 的错误处理逻辑
  - `executeStream` 的递归逻辑
  - 工具历史记录的存储和检索
- [ ] **集成测试**：
  - 完整的多轮对话流程
  - 工具调用失败后的错误处理
  - 跨 Provider 的工具调用一致性
- [ ] **E2E 测试**：
  - 用户发起工具调用请求
  - 工具执行成功/失败场景
  - 递归工具调用场景

---

## 📝 文档和维护

### 13. 完善工具文档
- [ ] 在 `src/core/tools/README.md` 维护工具列表
- [ ] 为每个工具添加使用示例
- [ ] 记录工具调用最佳实践

---

### 14. 性能优化
- [ ] 分析 bundle 大小（当前 24.2 MiB）
- [ ] 实现代码分割
- [ ] 懒加载非关键组件
- [ ] 优化图片资源加载

---

### 15. 错误监控
- [ ] 集成错误追踪服务（如 Sentry）
- [ ] 记录工具调用失败率
- [ ] 监控 LLM API 调用性能

---

### 16. 添加设置页面配置项
- [ ] 在 `SettingsView.tsx` 中添加 `maxToolCallDepth` 配置项
- [ ] 添加工具调用超时配置
- [ ] 添加工具调用重试策略配置

---

## 📊 实施进度

| 任务 | 优先级 | 状态 | 完成时间 |
|------|--------|------|----------|
| 1. 多轮对话循环 | P0 | ✅ 已完成 | 2026-01-18 |
| 2. 参数校验错误反馈 | P0 | ✅ 已完成 | 2026-01-18 |
| 3. 工具历史记录（基础） | P2 | ✅ 已完成 | 2026-01-18 |
| 4. Fallback 逻辑验证 | P1 | ⏳ 待实施 | - |
| 5. 能力路由系统与图片生成服务重构 | P1 | ⏳ 待实施 | - |
| 6. 工具历史记录 UI | P2 | ⏳ 待实施 | - |
| 7. 流式工具调用 | P2 | ⏳ 待实施 | - |
| 8. Provider 扩展 | P2 | ⏳ 待实施 | - |
| 9-16. 其他任务 | P3 | ⏳ 待实施 | - |

---

## 🎯 下一步建议

1. **优先完成任务 5**：能力路由系统重构是架构升级的关键，支持多提供商动态路由和降级
2. **考虑任务 6**：工具历史记录 UI 对调试非常有用，且 Gemini 已提供完整原型
3. **任务 7 可提升体验**：流式工具调用可显著提升用户体验
4. **任务 8 可延后**：Anthropic 和 Gemini Provider 扩展优先级较低，除非有明确需求

---

**最后更新**：2026-01-18
**当前版本**：v1.2.0 (核心功能已实现，能力路由系统规划中)
**TypeScript 类型检查**：✅ 通过
