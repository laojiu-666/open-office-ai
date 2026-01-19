import { z } from 'zod';

export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Zod schemas for PPT tools
const CreateSlideSchema = z.object({
  layout: z.enum(['title-content', 'title-image', 'title-only', 'blank']),
  title: z.string().min(1),
  content: z.array(z.string()).optional(),
  includeImage: z.boolean().optional(),
  imagePrompt: z.string().optional(),
}).refine(
  (data) => !data.includeImage || data.imagePrompt,
  { message: 'imagePrompt is required when includeImage is true' }
);

const InsertImageSchema = z.object({
  imageData: z.string().min(1),
  x: z.number().min(0).max(960).optional(),
  y: z.number().min(0).max(540).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

const SetBackgroundSchema = z.object({
  imageData: z.string().min(1),
  transparency: z.number().min(0).max(1).optional(),
});

const ReplaceSelectionSchema = z.object({
  text: z.string().min(1),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

const InsertTextSchema = z.object({
  text: z.string().min(1),
  x: z.number().min(0).max(960),
  y: z.number().min(0).max(540),
  width: z.number().positive(),
  height: z.number().positive(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bold: z.boolean().optional(),
});

const GetContextSchema = z.object({});

const GenerateAndInsertImageSchema = z.object({
  prompt: z.string().min(1),
  x: z.number().min(0).max(960).optional(),
  y: z.number().min(0).max(540).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

const GenerateAndSetBackgroundSchema = z.object({
  prompt: z.string().min(1),
  transparency: z.number().min(0).max(1).optional(),
});

const toolSchemas: Record<string, z.ZodSchema> = {
  ppt_create_slide: CreateSlideSchema,
  ppt_insert_image: InsertImageSchema,
  ppt_set_background: SetBackgroundSchema,
  ppt_replace_selection: ReplaceSelectionSchema,
  ppt_insert_text: InsertTextSchema,
  ppt_get_context: GetContextSchema,
  ppt_generate_and_insert_image: GenerateAndInsertImageSchema,
  ppt_generate_and_set_background: GenerateAndSetBackgroundSchema,
};

export function validateToolArguments(toolName: string, args: unknown): ValidationResult {
  const schema = toolSchemas[toolName];
  if (!schema) {
    return { success: true, data: (args || {}) as Record<string, unknown> };
  }

  const result = schema.safeParse(args);
  if (!result.success) {
    const errorMessages = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    return { success: false, error: errorMessages };
  }

  return { success: true, data: result.data as Record<string, unknown> };
}
