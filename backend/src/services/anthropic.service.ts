// Code written by Kone & Claude | The code does the following: " Wraps the Anthropic API and exposes the
// division's AI capabilities (summarisation, meeting structuring, task extraction, AI Coach, report
// drafting, classification and document generation). It is MODE-AWARE: in MAX mode it uses the
// high-context model and full token budget; in SAVER mode it switches to a lightweight model, compresses
// the prompt and caps output to minimise token burn. Every live call records token usage + cost. When no
// ANTHROPIC_API_KEY is configured, each method returns a clearly-labelled deterministic fallback. "

import Anthropic from '@anthropic-ai/sdk';
import { env, isAiConfigured } from '../config/env';
import { getMode, getResolvedModel, saverModel } from './settings.service';
import { recordUsage } from './usage.service';

// Lightweight profile used in SAVER mode to minimise cost.
const SAVER_MODEL = saverModel();

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!isAiConfigured()) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

interface PromptOpts { feature: string; userId?: string | null; maxTokens?: number }

// Code written by Kone & Claude | The code does the following: " Core call: resolves the execution
// strategy from the current mode, sends the prompt to the chosen Claude model, records token usage +
// cost, and returns the plain-text response. Throws if AI is not configured so callers can fall back. "
async function runPrompt(system: string, user: string, opts: PromptOpts): Promise<string> {
  const ai = getClient();
  if (!ai) throw new Error('AI_NOT_CONFIGURED');

  const mode = await getMode();
  const model = mode === 'SAVER' ? SAVER_MODEL : await getResolvedModel();
  const cap = opts.maxTokens ?? 1500;
  const maxTokens = mode === 'SAVER' ? Math.min(700, cap) : cap;
  const sys = mode === 'SAVER' ? `${system}\n\n[SAVER MODE] Be maximally concise. No preamble or restating the question.` : system;
  // In SAVER mode, compress very long inputs to protect the token budget.
  const usr = mode === 'SAVER' && user.length > 6000 ? `${user.slice(0, 6000)}\n…[input truncated in SAVER mode]` : user;

  const message = await ai.messages.create({ model, max_tokens: maxTokens, system: sys, messages: [{ role: 'user', content: usr }] });
  await recordUsage({
    feature: opts.feature, model, mode,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
    userId: opts.userId ?? null,
  });
  return message.content.map((b) => ('text' in b ? b.text : '')).join('\n').trim();
}

export interface ThreadMessage { author: string; body: string; createdAt?: string }
export interface CoachInput { user: string; tasks: { title: string; status: string; priority: string; dueDate?: string | null }[] }
export interface Classification { category: string; tags: string[]; severity: 'Low' | 'Medium' | 'High' | 'Critical' }

export const aiService = {
  isLive(): boolean { return isAiConfigured(); },

  // Code written by Kone & Claude | The code does the following: " Summarises a message/meeting thread. "
  async summarizeThread(messages: ThreadMessage[], userId?: string): Promise<string> {
    const transcript = messages.map((m) => `${m.author}: ${m.body}`).join('\n');
    try {
      return await runPrompt(
        'You are the MB IQ assistant for an internal IT division. Summarise the thread crisply in GitHub-flavoured Markdown with `##` headings: Summary, Key Decisions, Open Questions.',
        `Summarise this thread:\n\n${transcript}`, { feature: 'summary', userId },
      );
    } catch {
      const lines = messages.slice(-5).map((m) => `- **${m.author}:** ${m.body}`).join('\n');
      return `_[AI fallback — no API key configured]_\n\n## Summary\n\nLast ${Math.min(messages.length, 5)} messages:\n\n${lines}\n\n## Open Questions\n\n- Confirm owners and deadlines.`;
    }
  },

  // Code written by Kone & Claude | The code does the following: " Structures a meeting transcript. "
  async structureMeeting(title: string, type: string, transcript: string, userId?: string): Promise<string> {
    try {
      return await runPrompt(
        'You are the MB IQ meeting assistant. Produce the meeting pack in GitHub-flavoured Markdown with `##` headings: Meeting Purpose, Key Discussion Points, Decisions, Recommended Action Plan (a numbered list), Items Needing Management Attention, Next Steps.',
        `Meeting: ${title} (${type})\n\nTranscript:\n${transcript}`, { feature: 'meeting', userId },
      );
    } catch {
      const actionWords = ['must', 'need to', 'will', 'should', 'action', 'follow up', 'build', 'fix', 'review', 'prepare', 'test', 'deploy', 'document'];
      const actions = transcript.split(/\n|\. /).map((l) => l.trim()).filter((l) => actionWords.some((w) => l.toLowerCase().includes(w))).slice(0, 10);
      return `_[AI fallback — no API key configured]_\n\n## Meeting Purpose\n\n${title} (${type}).\n\n## Recommended Action Plan\n\n${(actions.length ? actions : ['Confirm next sprint priorities.', 'Assign owners and deadlines.']).map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
    }
  },

  // Code written by Kone & Claude | The code does the following: " Extracts assignable tasks from notes. "
  async extractTasks(text: string, userId?: string): Promise<{ title: string; priority: string }[]> {
    try {
      const raw = await runPrompt(
        'Extract actionable tasks from the notes. Reply ONLY as a JSON array of {"title","priority"} where priority is High, Medium or Low.',
        text, { feature: 'extract', userId, maxTokens: 800 },
      );
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      throw new Error('bad shape');
    } catch {
      return text.split(/\n|\. /).map((l) => l.trim()).filter((l) => l.length > 6).slice(0, 8).map((l) => ({ title: l, priority: 'Medium' }));
    }
  },

  // Code written by Kone & Claude | The code does the following: " AI Coach workload prioritisation. "
  async coachWorkload(input: CoachInput, userId?: string): Promise<string> {
    try {
      return await runPrompt(
        'You are the MB IQ AI Coach. Given a person and their tasks, advise: what to do first, what to defer, what to escalate, and a brief rationale. Be concrete and supportive.',
        JSON.stringify(input, null, 2), { feature: 'coach', userId },
      );
    } catch {
      const blocked = input.tasks.filter((t) => t.status === 'Blocked');
      const high = input.tasks.filter((t) => t.priority === 'High' || t.priority === 'Critical');
      return `[AI fallback — no API key configured]\nAI Coach advice for ${input.user}:\n- Do first: ${high[0]?.title ?? 'highest-priority open task'}.\n- Escalate: ${blocked.length} blocked task(s).\n- Defer: lower-priority items until blockers clear.`;
    }
  },

  // Code written by Kone & Claude | The code does the following: " Drafts a status report body. "
  async draftReport(context: string, userId?: string): Promise<string> {
    try {
      return await runPrompt(
        'You are the MB IQ reporting assistant. Write a clear executive status report in GitHub-flavoured Markdown. Use `##` section headings: Overview, Progress, Risks & Blockers, Recommendations. Use bullet lists where useful and a table where it aids clarity. Do NOT include a top-level `#` title — the document already has one.',
        context, { feature: 'report', userId },
      );
    } catch {
      return `_[AI fallback — no API key configured.]_\n\n## Overview\n\n${context}\n\n## Recommendations\n\n1. Review blocked tasks and assign escalation owners.\n2. Confirm sprint demo output for each team.\n3. Ensure every completed task has matching documentation.`;
    }
  },

  // Code written by Kone & Claude | The code does the following: " Auto-classifies an incoming item
  // (issue/alert/note/log) into a category, tags and a severity for triage. Returns a safe heuristic
  // classification when AI is unavailable or the model reply is malformed. "
  async classify(text: string, userId?: string): Promise<Classification> {
    try {
      const raw = await runPrompt(
        'Classify the IT item. Reply ONLY as JSON: {"category": one of ["Bug","Incident","Request","Question","Improvement","Security","Other"], "tags": up to 5 short lowercase tags, "severity": one of ["Low","Medium","High","Critical"]}.',
        text, { feature: 'classify', userId, maxTokens: 300 },
      );
      const p = JSON.parse(raw) as Partial<Classification>;
      return {
        category: p.category ?? 'Other',
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 5).map(String) : [],
        severity: (['Low', 'Medium', 'High', 'Critical'] as const).includes(p.severity as 'Low') ? (p.severity as Classification['severity']) : 'Medium',
      };
    } catch {
      return heuristicClassify(text);
    }
  },

  // Code written by Kone & Claude | The code does the following: " Generates a documentation artifact
  // (spec, post-mortem, user guide, API schema) from a template kind plus system/codebase context. "
  async generateDocument(kind: string, title: string, context: string, userId?: string): Promise<string> {
    const guides: Record<string, string> = {
      'Technical Specification': 'Write a technical specification: Overview, Goals & Non-Goals, Architecture, Data Model, API, Risks, Rollout.',
      'System Post-mortem': 'Write a blameless post-mortem: Summary, Impact, Timeline, Root Cause, What Went Well, What Went Wrong, Action Items.',
      'User Guide': 'Write a user guide: Introduction, Prerequisites, Step-by-step Usage, Tips, FAQ, Troubleshooting.',
      'API Schema': 'Produce an API schema/reference: Resources, Endpoints (method, path, params), Request/Response examples, Errors, Auth.',
    };
    const system = `You are the MB IQ documentation engine. ${guides[kind] ?? 'Write clear, well-structured technical documentation in Markdown.'} Output Markdown only.`;
    try {
      return await runPrompt(system, `Title: ${title}\n\nContext / source material:\n${context}`, { feature: 'docgen', userId, maxTokens: 2200 });
    } catch {
      return `# ${title}\n\n_[AI fallback — no API key configured. This is a structured template; connect the API key to auto-fill it.]_\n\n## Overview\n${context.slice(0, 600)}\n\n## Details\n- To be completed.\n\n## Next Steps\n- Review and expand each section.`;
    }
  },

  // Code written by Kone & Claude | The code does the following: " Generates Mermaid diagram source for a
  // given kind from a context/prompt. The reply is sanitised (fences stripped, header validated) so a bad
  // model reply never yields an unrenderable diagram. Used by the Diagram Studio + agent diagram tools. "
  async generateMermaid(kind: string, context: string, userId?: string | null): Promise<string> {
    try {
      const raw = await runPrompt(
        `You are a diagramming assistant. Output ONLY valid Mermaid code for a ${kind} — no Markdown fences, no commentary. Begin with a valid Mermaid header (e.g. "flowchart TD", "graph TD", "sequenceDiagram", "erDiagram"). Keep node labels short and avoid characters that break Mermaid.`,
        context, { feature: 'docgen', userId, maxTokens: 900 },
      );
      return sanitizeMermaid(raw);
    } catch {
      return 'flowchart TD\n  A["AI not configured"] --> B["Add ANTHROPIC_API_KEY to enable AI diagrams"]';
    }
  },

  // Code written by Kone & Claude | The code does the following: " Formats a firm member's note into a
  // concise subject line so Tier 5 users see their note organised by AI before IT triages it. "
  async formatNote(body: string, userId?: string): Promise<string> {
    try {
      const raw = await runPrompt(
        'You organise notes for an IT helpdesk. Reply with ONE short subject line (max 80 chars) summarising the note. No quotes, no preamble.',
        body, { feature: 'noteformat', userId, maxTokens: 80 },
      );
      return raw.replace(/^["']|["']$/g, '').slice(0, 120);
    } catch {
      const first = body.split(/\n/)[0]?.trim() ?? body.trim();
      return first.length > 80 ? `${first.slice(0, 77)}…` : first;
    }
  },
};

// Code written by Kone & Claude | The code does the following: " Cleans an AI Mermaid reply: strips code
// fences and ensures it starts with a recognised Mermaid header, otherwise wraps a safe fallback diagram. "
function sanitizeMermaid(raw: string): string {
  const s = (raw || '').trim().replace(/^```(?:mermaid)?\s*/i, '').replace(/```$/i, '').trim();
  const heads = ['graph', 'flowchart', 'sequenceDiagram', 'erDiagram', 'classDiagram', 'stateDiagram', 'gantt', 'journey', 'pie', 'mindmap', 'timeline'];
  if (!heads.some((h) => s.startsWith(h))) {
    const snippet = s.slice(0, 40).replace(/["\n]/g, ' ').trim();
    return `flowchart TD\n  A["Diagram"] --> B["${snippet || 'content'}"]`;
  }
  return s;
}

// Code written by Kone & Claude | The code does the following: " Deterministic keyword-based fallback
// classifier so triage still works with no API key. "
function heuristicClassify(text: string): Classification {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const category = has('breach', 'vulnerab', 'exploit', 'cve') ? 'Security'
    : has('down', 'outage', 'failed', 'crash', 'incident') ? 'Incident'
    : has('bug', 'error', 'broken', 'exception') ? 'Bug'
    : has('please', 'request', 'can we', 'need') ? 'Request'
    : has('how', 'what', 'why', '?') ? 'Question' : 'Improvement';
  const severity = has('critical', 'urgent', 'down', 'breach', 'data loss') ? 'Critical'
    : has('blocker', 'high', 'failing') ? 'High'
    : has('minor', 'typo', 'nit') ? 'Low' : 'Medium';
  const tags = ['frontend', 'backend', 'database', 'auth', 'deploy', 'api', 'ui', 'performance', 'security'].filter((k) => t.includes(k)).slice(0, 5);
  return { category, tags, severity };
}
