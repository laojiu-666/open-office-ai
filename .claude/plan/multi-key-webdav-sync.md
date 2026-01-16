# 多密钥管理 + WebDAV 云同步 实施计划

> 版本: 1.0 | 日期: 2026-01-16

## 需求概述

1. **多密钥支持**：每个供应商可配置多个 API Key
2. **WebDAV 云同步**：支持坚果云、NextCloud 等主流服务
3. **端到端加密**：PBKDF2 + AES-GCM，服务端无法解密
4. **离线优先**：本地缓存 + 联网同步
5. **供应商扩展**：Gemini、DeepSeek、智谱GLM、豆包、Kimi
6. **URL 简化**：用户只需输入 baseURL，系统自动处理 /v1 路径

---

## 架构设计

### 模块结构

```
src/
├── core/
│   ├── sync/                      # [新增] 同步模块
│   │   ├── types.ts               # 同步领域模型
│   │   ├── sync-engine.ts         # 同步引擎
│   │   ├── sync-state-machine.ts  # 状态机
│   │   ├── conflict-resolver.ts   # 冲突处理
│   │   ├── webdav-client.ts       # WebDAV 客户端
│   │   ├── webdav-store.ts        # 远端存储适配器
│   │   ├── local-cache.ts         # 本地缓存适配器
│   │   └── migrations/
│   │       └── v1-to-v2.ts        # 数据迁移
│   ├── crypto/                    # [新增] 加密模块
│   │   ├── types.ts               # 加密类型
│   │   ├── key-derivation.ts      # PBKDF2 派生
│   │   ├── cipher.ts              # AES-GCM 加解密
│   │   └── vault.ts               # 加密封装
│   └── llm/
│       ├── factory.ts             # [修改] 扩展供应商
│       └── url-normalizer.ts      # [新增] URL 规范化
├── ui/
│   ├── store/
│   │   └── appStore.ts            # [修改] 扩展状态
│   └── components/settings/
│       ├── SettingsView.tsx       # [修改] 布局调整
│       ├── connections/           # [新增] 连接管理
│       │   ├── ConnectionManager.tsx
│       │   ├── ConnectionCard.tsx
│       │   ├── AddConnectionDialog.tsx
│       │   └── ConnectionForm.tsx
│       └── sync/                  # [新增] 同步 UI
│           ├── CloudSyncCard.tsx
│           ├── WebDavConfigDialog.tsx
│           └── ConflictResolver.tsx
└── types/
    └── index.ts                   # [修改] 扩展类型
```

### 核心类型定义

```typescript
// LLM 供应商扩展
export type LLMProviderId =
  | 'openai' | 'anthropic' | 'custom'
  | 'gemini' | 'deepseek' | 'glm' | 'doubao' | 'kimi';

// 连接模型（替代原 ProviderConfig）
export interface AIConnection {
  id: string;
  name: string;
  providerId: LLMProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  createdAt: number;
}

// WebDAV 配置
export interface WebDavConfig {
  enabled: boolean;
  serverUrl: string;
  username: string;
  password?: string;
  autoSync: boolean;
}

// 同步状态
export type SyncStatus = 'idle' | 'checking' | 'syncing' | 'success' | 'error' | 'offline' | 'conflict';

// 加密载荷
export interface EncryptedPayload {
  cipherText: string;
  iv: string;
  salt: string;
  iterations: number;
  alg: 'AES-GCM';
}
```

### 供应商预设配置

| 供应商 | providerId | 默认 BaseURL | 默认模型 | 适配器 |
|--------|-----------|-------------|---------|--------|
| OpenAI | `openai` | `https://api.openai.com` | `gpt-4o-mini` | OpenAI |
| Anthropic | `anthropic` | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` | Anthropic |
| Gemini | `gemini` | `https://generativelanguage.googleapis.com` | `gemini-pro` | Gemini |
| DeepSeek | `deepseek` | `https://api.deepseek.com` | `deepseek-chat` | OpenAI |
| 智谱GLM | `glm` | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` | OpenAI |
| Kimi | `kimi` | `https://api.moonshot.cn` | `moonshot-v1-8k` | OpenAI |
| 豆包 | `doubao` | `https://ark.cn-beijing.volces.com/api/v3` | (用户输入) | OpenAI |
| 自定义 | `custom` | (用户输入) | (用户输入) | OpenAI |

---

## 实施阶段

### Phase 1: 类型与数据层 (基础)

**任务清单**：
- [ ] 1.1 扩展 `LLMProviderId` 类型，添加新供应商
- [ ] 1.2 定义 `AIConnection` 接口替代 `ProviderConfig`
- [ ] 1.3 定义 `WebDavConfig` 和 `SyncStatus` 类型
- [ ] 1.4 定义 `EncryptedPayload` 加密载荷类型
- [ ] 1.5 创建供应商预设配置常量 `PROVIDER_PRESETS`

### Phase 2: 加密模块 (核心)

**任务清单**：
- [ ] 2.1 实现 `key-derivation.ts` - PBKDF2 密钥派生
- [ ] 2.2 实现 `cipher.ts` - AES-GCM 加解密
- [ ] 2.3 实现 `vault.ts` - 配置加密/解密封装

### Phase 3: WebDAV 同步模块 (核心)

**任务清单**：
- [ ] 3.1 实现 `webdav-client.ts` - PROPFIND/GET/PUT 操作
- [ ] 3.2 实现 `local-cache.ts` - localStorage 缓存适配器
- [ ] 3.3 实现 `webdav-store.ts` - 远端存储适配器
- [ ] 3.4 实现 `sync-state-machine.ts` - 同步状态机
- [ ] 3.5 实现 `sync-engine.ts` - 同步调度引擎
- [ ] 3.6 实现 `conflict-resolver.ts` - 冲突处理策略

### Phase 4: 状态管理重构 (Store)

**任务清单**：
- [ ] 4.1 重构 `appStore.ts` - 替换 providers 为 connections 数组
- [ ] 4.2 添加 WebDAV 配置状态
- [ ] 4.3 添加同步状态与操作方法
- [ ] 4.4 实现数据迁移逻辑 (v1 -> v2)

### Phase 5: LLM Provider 扩展 (后端)

**任务清单**：
- [ ] 5.1 创建 `url-normalizer.ts` - URL 规范化函数
- [ ] 5.2 实现 `GeminiProvider` (非 OpenAI 兼容)
- [ ] 5.3 更新 `factory.ts` - 添加新供应商分支
- [ ] 5.4 修改 OpenAI/Anthropic Provider 使用规范化 URL

### Phase 6: 连接管理 UI (前端)

**任务清单**：
- [ ] 6.1 创建 `ConnectionCard.tsx` - 连接卡片组件
- [ ] 6.2 创建 `ConnectionManager.tsx` - Accordion 分组列表
- [ ] 6.3 创建 `ConnectionForm.tsx` - 表单逻辑
- [ ] 6.4 创建 `AddConnectionDialog.tsx` - 添加连接对话框

### Phase 7: 同步 UI (前端)

**任务清单**：
- [ ] 7.1 创建 `CloudSyncCard.tsx` - 同步状态卡片
- [ ] 7.2 创建 `WebDavConfigDialog.tsx` - WebDAV 配置对话框
- [ ] 7.3 创建 `ConflictResolver.tsx` - 冲突解决对话框
- [ ] 7.4 更新 `SettingsView.tsx` - 整合新组件

### Phase 8: 集成与测试

**任务清单**：
- [ ] 8.1 集成同步服务到 Store
- [ ] 8.2 实现自动同步逻辑
- [ ] 8.3 端到端测试（本地 → 加密 → WebDAV → 解密）
- [ ] 8.4 错误处理与用户提示完善

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| CORS 限制 | WebDAV 服务可能不支持浏览器跨域 | 提供配置文档；推荐支持 CORS 的服务 |
| 主密码丢失 | 端到端加密无法恢复 | 明确 UI 提示；建议用户备份密码 |
| 冲突处理复杂 | 多设备并发编辑 | 简化为 LWW + 用户确认 |
| 网络不稳定 | 同步失败 | 离线优先；重试机制；指数退避 |

---

## 验收标准

1. 用户可添加/编辑/删除多个 API Key
2. 用户可配置 WebDAV 服务器并测试连接
3. 配置数据端到端加密后同步到 WebDAV
4. 离线时可正常使用，联网后自动同步
5. 冲突时提示用户选择保留版本
6. 支持所有预设供应商（Gemini、DeepSeek、GLM、豆包、Kimi）
7. URL 输入自动处理 /v1 路径
