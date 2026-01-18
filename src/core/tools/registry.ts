import type { ToolDefinition } from '@/types';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errorCode?: string;
  errorDetails?: unknown;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    metadata?: { parsingError?: string }
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found. Available: ${this.list().join(', ')}`,
        errorCode: 'TOOL_NOT_FOUND',
      };
    }

    // Check for parsing errors
    if (metadata?.parsingError) {
      return {
        success: false,
        error: `Parameter parsing failed: ${metadata.parsingError}`,
        errorCode: 'PARSE_ERROR',
        errorDetails: { originalError: metadata.parsingError, args },
      };
    }

    try {
      return await tool.handler(args);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }
}

let globalRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}
