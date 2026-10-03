// Code written by Kone & Claude | The code does the following: " Builds a Mermaid ER (database) diagram
// deterministically by parsing the Prisma schema file — entities with their scalar fields (id marked PK)
// and one-to-many relationships inferred from list relation fields. Pure + offline (no AI, no DB call);
// returns a sensible fallback if the schema file cannot be read. "

import { readFileSync } from 'fs';
import path from 'path';

const SCALARS = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);

function readSchema(): string {
  const candidates = [
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'backend', 'prisma', 'schema.prisma'),
  ];
  for (const c of candidates) {
    try { return readFileSync(c, 'utf8'); } catch { /* try the next candidate */ }
  }
  return '';
}

export function erDiagramFromSchema(): string {
  const schema = readSchema();
  if (!schema) {
    return 'erDiagram\n  USER ||--o{ PROJECT : "owns"\n  PROJECT ||--o{ TASK : "has"\n  PROJECT ||--o{ SPRINT : "has"\n  SPRINT ||--o{ TASK : "groups"';
  }

  const blocks: { name: string; body: string }[] = [];
  const modelNames = new Set<string>();
  const modelRe = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = modelRe.exec(schema))) { blocks.push({ name: m[1], body: m[2] }); modelNames.add(m[1]); }

  const entities: string[] = [];
  const relations: string[] = [];

  for (const b of blocks) {
    const fields: string[] = [];
    for (const raw of b.body.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
      const fm = /^(\w+)\s+([A-Za-z0-9_[\]?]+)/.exec(line);
      if (!fm) continue;
      const fname = fm[1];
      const typeRaw = fm[2];
      const base = typeRaw.replace(/[[\]?]/g, '');
      const isList = typeRaw.includes('[');
      if (SCALARS.has(base)) {
        fields.push(`    ${base.toLowerCase()} ${fname}${fname === 'id' ? ' PK' : ''}`);
      } else if (modelNames.has(base) && isList) {
        // The list side uniquely identifies a one-to-many relation, avoiding duplicate edges.
        relations.push(`  ${b.name.toUpperCase()} ||--o{ ${base.toUpperCase()} : "${fname}"`);
      }
    }
    entities.push(`  ${b.name.toUpperCase()} {\n${fields.join('\n')}\n  }`);
  }

  return ['erDiagram', ...entities, ...relations].join('\n');
}
