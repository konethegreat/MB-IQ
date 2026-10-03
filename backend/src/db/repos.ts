// Code written by Kone & Claude | The code does the following: " Typed repository bridge for the v0.3
// models (AppSettings, AiUsage). Until `prisma generate` regenerates the client with these models,
// this exposes their delegates through an explicitly-typed accessor so the whole API stays type-safe
// and COMPILES before the migration is run. After `npm run db:setup`, the real generated delegates
// satisfy these same shapes unchanged - no call-site changes needed. "

import { prisma } from './prisma';

export type AiMode = 'MAX' | 'SAVER';

export interface AppSettingsRow {
  id: string;
  mode: AiMode;
  aiModel: string;
  currency: 'USD' | 'ZAR';
  monthlyBudgetUsd: number;
  monthlyBudgetZar: number;
  updatedBy: string | null;
  updatedAt: Date;
}
export interface AiUsageRow {
  id: string; feature: string; model: string; mode: string;
  inputTokens: number; outputTokens: number; costUsd: number; userId: string | null; createdAt: Date;
}
export interface ClassificationRow {
  id: string; itemType: string; itemId: string; category: string; tags: string; severity: string; createdAt: Date;
}
export interface PendingActionRow {
  id: string; provider: string; tool: string; args: string; summary: string; status: string;
  result: string | null; proposedBy: string | null; decidedBy: string | null; createdAt: Date; decidedAt: Date | null;
}

// Minimal delegate surface we actually use. Arg objects are loosely typed (Prisma's real arg types
// are complex); return rows are strongly typed so call sites stay safe.
interface Delegate<Row> {
  findMany(args?: Record<string, unknown>): Promise<Row[]>;
  findUnique(args: Record<string, unknown>): Promise<Row | null>;
  findFirst(args?: Record<string, unknown>): Promise<Row | null>;
  create(args: Record<string, unknown>): Promise<Row>;
  update(args: Record<string, unknown>): Promise<Row>;
  upsert(args: Record<string, unknown>): Promise<Row>;
  count(args?: Record<string, unknown>): Promise<number>;
}

const bridge = prisma as unknown as {
  appSettings: Delegate<AppSettingsRow>;
  aiUsage: Delegate<AiUsageRow>;
  classification: Delegate<ClassificationRow>;
  pendingAction: Delegate<PendingActionRow>;
};

export const appSettingsRepo = bridge.appSettings;
export const aiUsageRepo = bridge.aiUsage;
export const classificationRepo = bridge.classification;
export const pendingActionRepo = bridge.pendingAction;
