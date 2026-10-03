// Code written by Kone & Claude | The code does the following: " The GitHub MCP Host provider. It makes
// the backend an MCP CLIENT of the organisation's GitHub MCP server, exposing its repository / issue /
// PR tools to the agent. It is env-gated (GITHUB_MCP_URL + GITHUB_MCP_TOKEN): when unset it reports
// 'not configured' and contributes no tools, so the app runs safely without it. The MCP SDK is imported
// lazily (non-literal specifier) so the core build never depends on the package being installed. "

import { env } from '../../config/env';
import { type AgentTool, type AgentToolProvider, type ToolResult, looksDestructive } from './toolProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class GitHubMcpProvider implements AgentToolProvider {
  public readonly id = 'github';
  private client: any = null;

  isConfigured(): boolean { return env.githubMcpUrl.trim().length > 0; }

  // Code written by Kone & Claude | The code does the following: " Lazily connects to the GitHub MCP
  // server over Streamable HTTP, attaching the bearer token, and caches the client. "
  private async connect(): Promise<any> {
    if (this.client) return this.client;
    if (!this.isConfigured()) throw new Error('GitHub MCP server is not configured.');
    const clientModule = '@modelcontextprotocol/sdk/client/index.js';
    const httpModule = '@modelcontextprotocol/sdk/client/streamableHttp.js';
    const { Client } = (await import(clientModule)) as any;
    const { StreamableHTTPClientTransport } = (await import(httpModule)) as any;
    const headers: Record<string, string> = {};
    if (env.githubMcpToken) headers.Authorization = `Bearer ${env.githubMcpToken}`;
    const transport = new StreamableHTTPClientTransport(new URL(env.githubMcpUrl), { requestInit: { headers } });
    const client = new Client({ name: 'mb-iq-command-centre', version: '0.3.0' }, { capabilities: {} });
    await client.connect(transport);
    this.client = client;
    return client;
  }

  async listTools(): Promise<AgentTool[]> {
    if (!this.isConfigured()) return [];
    try {
      const client = await this.connect();
      const res = await client.listTools();
      const tools = (res?.tools ?? []) as Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
      return tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
        destructive: looksDestructive(t.name),
      }));
    } catch (e) {
      console.error('[github-mcp] listTools failed:', (e as Error).message);
      return [];
    }
  }

  async callTool(tool: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const client = await this.connect();
      const res = await client.callTool({ name: tool, arguments: args });
      const content = Array.isArray(res?.content)
        ? res.content.map((c: any) => (c?.type === 'text' ? c.text : JSON.stringify(c))).join('\n')
        : JSON.stringify(res ?? {});
      return { ok: !res?.isError, content, data: res };
    } catch (e) {
      return { ok: false, content: `GitHub MCP tool '${tool}' failed: ${(e as Error).message}` };
    }
  }
}
