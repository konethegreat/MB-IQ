// Code written by Kone & Claude | The code does the following: " AI triage service. It runs the
// classifier over an incoming item's text and upserts a Classification (category, tags, severity) so
// items are automatically organised on arrival. Lookups return classifications keyed by item id so list
// endpoints can attach them. All operations are best-effort and never break the host request. "

import { classificationRepo, type ClassificationRow } from '../db/repos';
import { aiService, type Classification } from './anthropic.service';

export async function classifyItem(itemType: 'note' | 'task', itemId: string, text: string, userId?: string): Promise<ClassificationRow | null> {
  try {
    const c: Classification = await aiService.classify(text, userId);
    const data = { category: c.category, tags: c.tags.join(','), severity: c.severity };
    return await classificationRepo.upsert({
      where: { itemType_itemId: { itemType, itemId } },
      create: { itemType, itemId, ...data },
      update: data,
    });
  } catch {
    return null;
  }
}

export async function classificationsFor(itemType: 'note' | 'task', ids: string[]): Promise<Record<string, ClassificationRow>> {
  if (ids.length === 0) return {};
  try {
    const rows = await classificationRepo.findMany({ where: { itemType, itemId: { in: ids } } });
    const map: Record<string, ClassificationRow> = {};
    for (const r of rows) map[r.itemId] = r;
    return map;
  } catch { return {}; }
}
