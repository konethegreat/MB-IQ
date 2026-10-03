// Code written by Kone & Claude | The code does the following: " A no-AI smoke test for the v0.6
// deterministic generators: ER / org / gantt diagrams (Diagram Studio) and the risk radar + standup
// (agent intelligence). It runs them against the seeded database and asserts each produces sensible
// output (valid Mermaid header / non-empty result), exiting non-zero on any failure. Run with:
// npm run smoke:insights "

import { generateDiagram, type DiagramKind } from '../services/diagram';
import { assessRisk } from '../services/insights/risk';
import { buildStandup } from '../services/insights/standup';
import { prisma } from './prisma';

const MERMAID_HEADS = ['erDiagram', 'graph', 'flowchart', 'gantt'];

async function main() {
  const failures: string[] = [];
  console.log('\nMB IQ — v0.6 deterministic generator smoke test\n');

  for (const kind of ['er', 'org', 'gantt'] as DiagramKind[]) {
    const d = await generateDiagram(kind, {});
    const head = d.mermaid.split('\n')[0]?.trim() ?? '';
    const ok = d.mermaid.length > 20 && MERMAID_HEADS.some((h) => head.startsWith(h));
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${kind.padEnd(6)} "${d.title}" — ${d.mermaid.length} chars, header "${head}"`);
    if (!ok) failures.push(`diagram:${kind}`);
  }

  const risk = await assessRisk();
  const riskOk = risk.items.length > 0 && typeof risk.summary === 'string';
  console.log(`  ${riskOk ? 'PASS' : 'FAIL'}  risk    ${risk.items.length} projects — ${risk.summary}`);
  if (!riskOk) failures.push('risk');

  const standup = await buildStandup();
  const standupOk = standup.markdown.includes('## Standup');
  console.log(`  ${standupOk ? 'PASS' : 'FAIL'}  standup ${standup.markdown.length} chars (${standup.team})`);
  if (!standupOk) failures.push('standup');

  if (failures.length) {
    console.log(`\n❌ SMOKE FAILED: ${failures.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('\n✅ ALL GENERATORS OK — diagrams, risk radar and standup work with no API key.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
