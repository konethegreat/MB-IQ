// Code written by Kone & Claude | The code does the following: " The agent tool-provider seam. A
// provider exposes a set of tools to the embedded agent; the registry aggregates one or more providers.
// 'destructive' tools are never executed during planning - they are queued for Human-in-the-Loop
// approval. This mirrors the project's AuthProvider pattern: implementations drop in without touching
// the agent loop. "

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON schema for the tool arguments
  destructive: boolean; // true => requires human approval before execution
}

export interface ToolResult { ok: boolean; content: string; data?: unknown }

export interface AgentToolProvider {
  readonly id: string; // 'internal' | 'github'
  isConfigured(): boolean;
  listTools(): Promise<AgentTool[]>;
  callTool(tool: string, args: Record<string, unknown>): Promise<ToolResult>;
}

// Heuristic used to flag tools that change state and therefore require approval.
export function looksDestructive(name: string): boolean {
  return /(create|update|delete|remove|close|merge|push|write|deploy|comment|edit|rerun|dispatch|cancel|approve)/i.test(name);
}
