[根目录](../../../CLAUDE.md) > [core](../) > **image**

# 图片生成模块

> AI 图片生成服务，支持 OpenAI DALL-E 兼容 API

## 模块职责

- 封装图片生成 API 调用
- 支持 DALL-E 3 及兼容 API
- 返回 base64 格式图片数据

## 入口与启动

### provider.ts
图片生成 Provider 实现：
- `ImageGenerationProvider` 类
- `createImageGenerationProvider()` 工厂函数

## 对外接口

### ImageGenerationProvider

```typescript
class ImageGenerationProvider {
  constructor(config: ImageGenConfig);
  generate(request: ImageGenRequest): Promise<ImageGenResponse>;
  testConnection(): Promise<boolean>;
}
```

### 工厂函数

```typescript
function createImageGenerationProvider(config: ImageGenConfig): ImageGenerationProvider
```

## 关键依赖与配置

| 依赖 | 用途 |
|-----|------|
| `fetch` | HTTP 请求 |
| `@/types` | 类型定义 |

### ImageGenConfig

```typescript
interface ImageGenConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;           // 如 'dall-e-3'
  defaultSize: '512x512' | '1024x1024';
}
```

## 数据模型

### ImageGenRequest
```typescript
interface ImageGenRequest {
  prompt: string;
  size?: '512x512' | '1024x1024';
  style?: 'photorealistic' | 'illustration' | 'flat';
}
```

### ImageGenResponse
```typescript
interface ImageGenResponse {
  id: string;
  data: string;    // base64 编码
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}
```

### ImageGenerationError
```typescript
interface ImageGenerationError {
  code: 'config_missing' | 'auth_failed' | 'rate_limited' | 'network_error' | 'generation_failed';
  message: string;
  retryable: boolean;
}
```

## 测试与质量

当前无测试覆盖。建议添加：
- 单元测试：错误处理逻辑
- 集成测试：实际 API 调用（需 API Key）

## 常见问题 (FAQ)

**Q: 为什么使用 base64 而不是 URL？**
A: base64 数据可直接插入 PowerPoint，无需额外的图片下载步骤，且避免跨域问题。

**Q: 如何支持其他图片生成服务？**
A: 只要 API 兼容 OpenAI 的 `/images/generations` 端点格式，修改 `baseUrl` 即可。

**Q: 图片生成失败如何处理？**
A: 返回的 `ImageGenerationError` 包含 `retryable` 字段，UI 层可据此决定是否显示重试按钮。

## 相关文件清单

| 文件 | 说明 |
|-----|------|
| `provider.ts` | 图片生成 Provider |

## 变更记录 (Changelog)

### 2026-01-15
- 初始化模块文档
