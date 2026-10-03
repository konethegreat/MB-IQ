// Code written by Kone & Claude | The code does the following: " The embedded agent loop. It gives Claude
// the registry's tools and runs a bounded tool-use conversation: READ-ONLY tools execute immediately and
// their output is fed back to the model; DESTRUCTIVE tools are NOT executed - instead a PendingAction is
// persisted and the model is told it was queued for human approval. Returns the final reply plus any
// pending actions for the approval UI. Token usage is recorded under the 'agent' feature; the model and
// budget follow the current Max/Saver mode. "

import Anthropic from '@anthropic-ai/sdk';
import { env, isAiConfigured } from '../../config/env';
import { getMode, getResolvedModel, saverModel } from '../settings.service';
import { recordUsage } from '../usage.service';
import { listAllTools, callQualifiedTool } from './registry';
import { pendingActionRepo } from '../../db/repos';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AgentPending { id: string; provider: string; tool: string; summary: string; args: Record<string, unknown> }
export interface AgentResult { reply: string; pendingActions: AgentPending[]; toolsUsed: string[] }

const SAVER_MODEL = saverModel();

export async function runAgent(prompt: string, userId?: string): Promise<AgentResult> {
  if (!isAiConfigured()) {
    return { reply: 'The agent is offline: no ANTHROPIC_API_KEY is configured. Add it to backend/.env to enable the embedded agent.', pendingActions: [], toolsUsed: [] };
  }

  const tools = await listAllTools();
  const byName = new Map(tools.map((t) => [t.qualifiedName, t]));
  const anthropicTools = tools.map((t) => ({ name: t.qualifiedName, description: `${t.description}${t.destructive ? ' [DESTRUCTIVE — will be queued for human approval]' : ''}`, input_schema: t.inputSchema }));

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  const mode = await getMode();
  const model = mode === 'SAVER' ? SAVER_MODEL : await getResolvedModel();
  const maxTokens = mode === 'SAVER' ? 700 : 1500;
  const system = 'You are the MB IQ Command Centre agent for an internal IT division. Use the provided tools to answer with real data. Read-only tools run automatically. Destructive tools (create/update/close/merge/deploy) are QUEUED for human approval — when you call one, tell the user clearly that it is pending approval and must not be assumed done. When a tool returns a ```mermaid code block, include it verbatim in your reply so the user sees the diagram. Be concise and helpful.';

  const messages: any[] = [{ role: 'user', content: prompt }];
  const pendingActions: AgentPending[] = [];
  const toolsUsed: string[] = [];
  let reply = '';

  for (let step = 0; step < 4; step++) {
    const res: any = await client.messages.create({
      model, max_tokens: maxTokens, system,
      ...(anthropicTools.length ? { tools: anthropicTools } : {}),
      messages,
    } as any);
    await recordUsage({ feature: 'agent', model, mode, inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0, userId });

    const text = res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
    if (text) reply = text;

    const toolUses = res.content.filter((b: any) => b.type === 'tool_use');
    if (toolUses.length === 0) break;

    messages.push({ role: 'assistant', content: res.content });
    const toolResults: any[] = [];
    for (const tu of toolUses) {
      toolsUsed.push(tu.name);
      const meta = byName.get(tu.name);
      const input = (tu.input ?? {}) as Record<string, unknown>;
      if (meta?.destructive) {
        const summary = `${meta.provider} · ${meta.name.replace(/^.*__/, '')} ${JSON.stringify(input)}`;
        const row = await pendingActionRepo.create({ data: { provider: meta.provider, tool: tu.name, args: JSON.stringify(input), summary, proposedBy: userId ?? null } });
        pendingActions.push({ id: row.id, provider: meta.provider, tool: meta.name, summary, args: input });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: `Queued for human approval (pending action ${row.id}). It has NOT executed.` });
      } else {
        const r = await callQualifiedTool(tu.name, input);
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: r.content, is_error: !r.ok });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return { reply: reply || 'Done.', pendingActions, toolsUsed };
}
