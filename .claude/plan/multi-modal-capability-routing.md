# 实施计划：多模态能力路由 + 统一 CORS 代理

## 📊 双模型分析综合

### Codex 后端视角（技术架构）
- **推荐方案A（自动切换）** + 用户级覆写
- **推荐统一代理服务**（单一入口，集中管理）
- 强调能力矩阵、优先级策略、失败回退
- 关注安全性（密钥托管、限流、审计）

### Gemini 前端视角（用户体验）
- **推荐混合"路由器"模式**（默认自动 + 高级手动）
- **推荐无状态边缘代理**（Cloudflare Worker/Vercel Function）
- 强调降低认知负担、保持配置简洁
- 关注部署灵活性和跨平台兼容性

### 🎯 核心共识

两个模型都认同：

1. **多模态管理**：采用"能力路由"而非简单的 A/B 二选一
   - 默认智能选择（低门槛）
   - 支持手动覆写（高灵活性）
   - 解耦"认证"与"模型选择"

2. **CORS 解决方案**：统一代理服务
   - 单一入口，避免碎片化
   - 服务端密钥托管，提升安全性
   - 支持所有供应商，无需逐个配置

---

## 技术方案

### 问题1：多模态供应商管理
**采用"能力路由器"模式**

**核心设计**：
1. **保持 `AIConnection` 纯粹性**：仅存储认证信息（id, name, providerId, baseUrl, apiKey）
2. **扩展能力字段**：
   ```typescript
   interface AIConnection {
     // ... 现有字段
     capabilities: {
       text?: { model: string };      // 文字生成
       image?: { model: string };     // 图片生成
       video?: { model: string };     // 视频生成（预留）
     };
   }
   ```
3. **引入"生成配置"层**：
   ```typescript
   interface GenerationProfile {
     mode: 'auto' | 'manual';
     textProvider?: string;    // Connection ID
     imageProvider?: string;   // Connection ID
     videoProvider?: string;   // Connection ID
   }
   ```

**用户体验**：
- **简单模式（默认）**：系统自动从已配置的连接中选择最佳模型
- **高级模式**：用户可在设置中为每种能力指定固定的连接

### 问题2：统一 CORS 代理
**采用"无状态边缘代理"模式**

**架构设计**：
```
前端 → /api/relay → 边缘代理 → 目标供应商 API
```

**代理服务实现**（Cloudflare Worker / Vercel Edge Function）：
```typescript
// 伪代码
async function handleRequest(request) {
  const { target, method, headers, body } = await request.json();

  // 1. 验证来源（Origin 白名单）
  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. 验证目标（供应商白名单）
  if (!isAllowedProvider(target)) {
    return new Response('Invalid target', { status: 400 });
  }

  // 3. 转发请求
  const response = await fetch(target, { method, headers, body });

  // 4. 添加 CORS 头并返回
  return new Response(response.body, {
    status: response.status,
    headers: {
      ...response.headers,
      'Access-Control-Allow-Origin': allowedOrigin,
    }
  });
}
```

**前端集成**：
```typescript
// 统一请求封装
async function proxyFetch(url: string, options: RequestInit) {
  const useProxy = shouldUseProxy(url);

  if (useProxy) {
    return fetch('/api/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: url,
        method: options.method,
        headers: options.headers,
        body: options.body,
      }),
    });
  }

  return fetch(url, options);
}
```

---

## 实施步骤

### 阶段1：类型定义与数据结构扩展
1. 扩展 `AIConnection` 接口，添加 `capabilities` 字段
2. 新增 `GenerationProfile` 类型定义
3. 更新 `appStore` 状态管理，添加 `generationProfile` 字段

**预期产物**：
- `src/types/index.ts` 更新
- `src/ui/store/appStore.ts` 更新

### 阶段2：能力路由器实现
1. 创建 `CapabilityRouter` 类，实现能力到连接的映射逻辑
2. 实现自动选择算法（优先级：用户指定 > 第一个可用连接）
3. 集成到现有的 `createLLMProvider` 和 `createImageGenerationProvider`

**预期产物**：
- `src/core/capability-router.ts`（新建）
- `src/core/llm/factory.ts` 更新
- `src/core/image/provider.ts` 更新

### 阶段3：统一代理服务
1. 创建边缘代理服务（Cloudflare Worker 或 Vercel Edge Function）
2. 实现供应商白名单验证
3. 实现来源验证（Origin 检查）
4. 添加错误处理与日志

**预期产物**：
- `proxy/relay.ts`（新建，部署到边缘）
- 部署配置文件

### 阶段4：前端请求层重构
1. 创建统一的 `proxyFetch` 封装
2. 更新所有 Provider 使用 `proxyFetch` 替代原生 `fetch`
3. 移除 webpack 中的临时代理配置
4. 添加代理开关配置（支持开发/生产环境切换）

**预期产物**：
- `src/core/http/proxy-fetch.ts`（新建）
- `src/core/llm/openai.ts` 更新
- `src/core/llm/anthropic.ts` 更新
- `src/core/llm/gemini.ts` 更新
- `src/core/image/provider.ts` 更新
- `webpack.config.js` 清理

### 阶段5：UI 配置界面
1. 更新"添加连接"对话框，支持配置 `capabilities`
2. 新增"生成配置"设置页面，支持切换自动/手动模式
3. 在手动模式下，显示能力到连接的映射选择器
4. 添加能力可用性指示器（显示哪些连接支持哪些能力）

**预期产物**：
- `src/ui/components/settings/connections/AddConnectionDialog.tsx` 更新
- `src/ui/components/settings/GenerationProfileSettings.tsx`（新建）
- `src/ui/components/settings/SettingsPage.tsx` 更新

### 阶段6：测试与文档
1. 添加能力路由器单元测试
2. 测试多供应商场景（文字用 OpenAI，图片用 Stability AI）
3. 测试代理服务的错误处理与降级
4. 更新项目文档（CLAUDE.md）

**预期产物**：
- 测试用例
- 更新的文档

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/index.ts` | 修改 | 扩展 AIConnection 和新增 GenerationProfile |
| `src/ui/store/appStore.ts` | 修改 | 添加 generationProfile 状态 |
| `src/core/capability-router.ts` | 新建 | 能力路由器核心逻辑 |
| `src/core/http/proxy-fetch.ts` | 新建 | 统一代理请求封装 |
| `src/core/llm/factory.ts` | 修改 | 集成能力路由器 |
| `src/core/image/provider.ts` | 修改 | 使用 proxyFetch |
| `proxy/relay.ts` | 新建 | 边缘代理服务 |
| `webpack.config.js` | 修改 | 移除临时代理配置 |
| `src/ui/components/settings/GenerationProfileSettings.tsx` | 新建 | 生成配置 UI |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 代理服务成为单点故障 | 1. 部署到边缘网络（多区域）<br>2. 添加降级逻辑（代理失败时尝试直连） |
| 能力路由逻辑复杂化 | 1. 保持默认模式简单（第一个可用）<br>2. 高级模式仅对需要的用户开放 |
| 向后兼容性 | 1. 保留旧的 `model` 和 `imageModel` 字段<br>2. 自动迁移到新的 `capabilities` 结构 |
| 代理服务成本 | 1. 使用免费额度的边缘服务（Cloudflare Workers 免费 10 万次/天）<br>2. 添加缓存层减少转发次数 |

---

## SESSION_ID（供 /ccg:execute 使用）
- **CODEX_SESSION**: `019bd088-b16a-7ff3-8f51-c7cd16339274`
- **GEMINI_SESSION**: `96e0b556-bc87-4761-92fc-7baea491eb51`
