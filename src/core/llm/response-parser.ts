import type { SlideSpec, TextBlockSpec, ImageBlockSpec, LayoutTemplate } from '@/types';

/**
 * 解析 LLM 响应中的 SlideSpec
 * 支持从 JSON 代码块或纯 JSON 中提取
 */

// 检测是否为幻灯片生成请求
export function isSlideGenerationRequest(content: string): boolean {
  const keywords = [
    '生成幻灯片',
    '生成一页',
    '创建幻灯片',
    '做一页',
    '新建幻灯片',
    'create slide',
    'generate slide',
    '生成PPT',
    '做PPT',
    '生成ppt',
    '做ppt',
    '一页PPT',
    '一页ppt',
    'PPT页',
    'ppt页',
    '幻灯片页',
    '生成一张',
    '做一张',
    '创建一页',
    '新建一页',
  ];

  const lowerContent = content.toLowerCase();
  return keywords.some((kw) => lowerContent.includes(kw.toLowerCase()));
}

// 从 LLM 响应中提取 SlideSpec JSON
export function extractSlideSpec(response: string): SlideSpec | null {
  console.log('[extractSlideSpec] Parsing response:', response.substring(0, 200));

  // 尝试从 JSON 代码块中提取
  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1].trim());
      console.log('[extractSlideSpec] Parsed from code block:', parsed);
      if (isValidSlideSpec(parsed)) {
        return normalizeSlideSpec(parsed);
      }
    } catch (e) {
      console.log('[extractSlideSpec] Failed to parse code block:', e);
      // 继续尝试其他方式
    }
  }

  // 尝试直接解析整个响应
  try {
    const parsed = JSON.parse(response.trim());
    console.log('[extractSlideSpec] Parsed directly:', parsed);
    if (isValidSlideSpec(parsed)) {
      return normalizeSlideSpec(parsed);
    }
  } catch {
    // 不是有效 JSON
  }

  // 尝试从响应中查找 JSON 对象（更宽松的匹配）
  const jsonMatch = response.match(/\{[\s\S]*"blocks"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[extractSlideSpec] Parsed from regex match:', parsed);
      if (isValidSlideSpec(parsed)) {
        return normalizeSlideSpec(parsed);
      }
    } catch (e) {
      console.log('[extractSlideSpec] Failed to parse regex match:', e);
      // 解析失败
    }
  }

  console.log('[extractSlideSpec] No valid SlideSpec found');
  return null;
}

// 验证是否为有效的 SlideSpec
function isValidSlideSpec(obj: unknown): obj is Partial<SlideSpec> {
  if (!obj || typeof obj !== 'object') return false;

  const spec = obj as Record<string, unknown>;

  // 必须有 blocks 数组
  if (!Array.isArray(spec.blocks)) return false;

  // 检查 blocks 中的元素
  for (const block of spec.blocks) {
    if (!block || typeof block !== 'object') return false;
    const b = block as Record<string, unknown>;
    if (!b.kind || !b.slotId) return false;
  }

  return true;
}

// 规范化 SlideSpec
function normalizeSlideSpec(partial: Partial<SlideSpec>): SlideSpec {
  const blocks = (partial.blocks || []).map((block) => {
    if (block.kind === 'text') {
      return {
        kind: 'text' as const,
        slotId: block.slotId,
        content: (block as TextBlockSpec).content || '',
        style: (block as TextBlockSpec).style,
      };
    } else if (block.kind === 'image') {
      return {
        kind: 'image' as const,
        slotId: block.slotId,
        prompt: (block as ImageBlockSpec).prompt || '',
        assetId: (block as ImageBlockSpec).assetId,
        style: (block as ImageBlockSpec).style,
      };
    }
    return block;
  });

  return {
    version: '1.0',
    layout: partial.layout || {
      template: 'title-content' as LayoutTemplate,
      slots: [],
    },
    blocks,
    theme: partial.theme,
    assets: partial.assets || [],
    speakerNotes: partial.speakerNotes,
    metadata: {
      requestId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...partial.metadata,
    },
  };
}

// 生成 SlideSpec 的 System Prompt
export function getSlideSpecSystemPrompt(context?: {
  slideText?: string;
  theme?: { fonts?: { heading?: string; body?: string }; colors?: Record<string, string> };
}): string {
  const contextInfo = context?.slideText
    ? `\n当前幻灯片内容：\n"""${context.slideText}"""\n`
    : '';

  const themeInfo = context?.theme
    ? `\n当前主题：
- 标题字体: ${context.theme.fonts?.heading || 'Calibri Light'}
- 正文字体: ${context.theme.fonts?.body || 'Calibri'}
- 主色调: ${context.theme.colors?.primary || '#0078D4'}\n`
    : '';

  return `你是一个专业的 PowerPoint 幻灯片设计助手。当用户请求生成幻灯片时，你需要返回一个 JSON 格式的 SlideSpec 规格。

${contextInfo}${themeInfo}

## SlideSpec 格式说明

当用户请求生成幻灯片时，请返回以下 JSON 格式：

\`\`\`json
{
  "version": "1.0",
  "layout": {
    "template": "title-content",
    "slots": []
  },
  "blocks": [
    {
      "kind": "text",
      "slotId": "title",
      "content": "幻灯片标题",
      "style": {
        "fontSize": 32,
        "bold": true
      }
    },
    {
      "kind": "text",
      "slotId": "body",
      "content": "• 要点一\\n• 要点二\\n• 要点三",
      "style": {
        "fontSize": 18
      }
    }
  ]
}
\`\`\`

## 布局模板选项
- "title-only": 仅标题
- "title-content": 标题 + 内容（默认）
- "title-two-content": 标题 + 双栏内容
- "title-image": 标题 + 内容 + 图片
- "image-caption": 大图 + 说明文字

## 槽位 ID
- "title": 标题
- "subtitle": 副标题
- "body": 正文内容
- "body-left": 左侧内容（双栏布局）
- "body-right": 右侧内容（双栏布局）
- "image": 图片
- "caption": 图片说明

## 图片块格式
如果需要生成图片，使用以下格式：
\`\`\`json
{
  "kind": "image",
  "slotId": "image",
  "prompt": "描述你想要的图片内容，例如：现代办公室场景，简约风格插画"
}
\`\`\`

## 设计原则
1. 内容层次分明，标题简洁有力
2. 要点控制在 3-5 个，每个要点一句话
3. 文字与图片比例约 6:4
4. 配色协调，使用主题色
5. 留白适当，避免拥挤

请根据用户的需求生成合适的幻灯片规格。如果用户只是普通对话，正常回复即可，不需要返回 JSON。`;
}
