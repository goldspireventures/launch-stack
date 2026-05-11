import { z } from 'zod';
import type { ToolDefinition } from './provider';

/**
 * Typed tool registry. Tools are functions that an LLM can call with
 * validated arguments. Each tool is paired with a Zod schema for parameters
 * and a typed handler.
 */
export interface RegisteredTool<TInput, TOutput> {
  definition: ToolDefinition;
  handler: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

export interface ToolContext {
  tenantId: string;
  userId: string;
  taskId?: string;
  sessionId?: string;
}

export function defineTool<TInput extends z.ZodObject<z.ZodRawShape>, TOutput>(opts: {
  name: string;
  description: string;
  parameters: TInput;
  handler: (input: z.infer<TInput>, ctx: ToolContext) => Promise<TOutput>;
}): RegisteredTool<z.infer<TInput>, TOutput> {
  return {
    definition: {
      name: opts.name,
      description: opts.description,
      parameters: opts.parameters,
    },
    handler: opts.handler,
  };
}

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool<unknown, unknown>>();

  register<I, O>(tool: RegisteredTool<I, O>) {
    this.tools.set(tool.definition.name, tool as unknown as RegisteredTool<unknown, unknown>);
    return this;
  }

  definitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async invoke(name: string, rawInput: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not registered: ${name}`);
    const input = tool.definition.parameters.parse(rawInput);
    return tool.handler(input as never, ctx);
  }
}

/** Example tools that ship with the agent runtime. Apps register their own. */
export const builtInTools = {
  echo: defineTool({
    name: 'echo',
    description: 'Returns the input unchanged. Useful for testing the agent runtime.',
    parameters: z.object({ message: z.string() }),
    handler: async ({ message }) => ({ message }),
  }),
  currentTime: defineTool({
    name: 'current_time',
    description: 'Returns the current ISO timestamp in UTC.',
    parameters: z.object({}),
    handler: async () => ({ now: new Date().toISOString() }),
  }),
};
