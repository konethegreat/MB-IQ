// Code written by Kone & Claude | The code does the following: " Enhanced agent tool registry. Aggregates
// every configured provider, qualifies tool names, routes calls, and reports detailed provider health
// (configured vs actually connected with tool count) for dashboards and the Agent console. "

import { InternalToolProvider } from './internalProvider';
import { GitHubMcpProvider } from './githubMcpProvider';
import type { AgentTool, AgentToolProvider, ToolResult } from './toolProvider';

const PROVIDERS: AgentToolProvider[] = [new InternalToolProvider(), new GitHubMcpProvider()];

export interface RegisteredTool extends AgentTool { provider: string; qualifiedName: string }

export interface ProviderHealth {
  id: string;
  configured: boolean;
  connected: boolean;
  toolCount: number;
  label: string;
}

function qualify(provider: string, name: string): string { return `${provider}__${name}`; }
function parse(qualified: string): { provider: string; tool: string } {
  const i = qualified.indexOf('__');
  return i < 0 ? { provider: 'internal', tool: qualified } : { provider: qualified.slice(0, i), tool: qualified.slice(i + 2) };
}

const PROVIDER_LABELS: Record<string, string> = {
  internal: 'Internal (MB IQ database)',
  github: 'GitHub MCP',
};

export async function listAllTools(): Promise<RegisteredTool[]> {
  const out: RegisteredTool[] = [];
  for (const p of PROVIDERS) {
    if (!p.isConfigured()) continue;
    try {
      for (const t of await p.listTools()) out.push({ ...t, provider: p.id, qualifiedName: qualify(p.id, t.name) });
    } catch (e) { console.error(`[agent] provider ${p.id} listTools failed:`, (e as Error).message); }
  }
  return out;
}

export async function callQualifiedTool(qualifiedName: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { provider, tool } = parse(qualifiedName);
  const p = PROVIDERS.find((x) => x.id === provider);
  if (!p) return { ok: false, content: `Unknown tool provider: ${provider}` };
  return p.callTool(tool, args);
}

export function providerStatus(): { id: string; configured: boolean }[] {
  return PROVIDERS.map((p) => ({ id: p.id, configured: p.isConfigured() }));
}

// Code written by Kone & Claude | The code does the following: " Probes each provider for live
// connectivity and tool availability — 'configured' means env is set; 'connected' means listTools
// succeeded with at least one tool (internal always passes; GitHub requires a reachable MCP server). "
export async function providerStatusDetailed(): Promise<ProviderHealth[]> {
  const results: ProviderHealth[] = [];
  for (const p of PROVIDERS) {
    const configured = p.isConfigured();
    let toolCount = 0;
    let connected = false;
    if (configured) {
      try {
        const tools = await p.listTools();
        toolCount = tools.length;
        connected = p.id === 'internal' ? true : toolCount > 0;
      } catch {
        connected = false;
      }
    }
    results.push({ id: p.id, configured, connected, toolCount, label: PROVIDER_LABELS[p.id] ?? p.id });
  }
  return results;
}
