// Code written by Kone & Claude | The code does the following: " Loads, validates and exposes all
// environment configuration (port, JWT secret, database URL, Anthropic key, auth provider) so the
// rest of the app never touches process.env directly. Secrets only ever live in .env. "

import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Code written by Kone & Claude | The code does the following: " Resolves the JWT signing secret
// safely. In production a strong (>= 32 char) JWT_SECRET is MANDATORY — the process refuses to boot
// without one, and there is NO checked-in constant fallback that could be used to forge tokens. In
// development, when none is supplied, an ephemeral random secret is generated per process (sessions
// simply reset on restart) so the demo still runs zero-config without shipping a guessable secret. "
function resolveJwtSecret(): string {
  const value = process.env.JWT_SECRET;
  if (NODE_ENV === 'production') {
    if (!value || value.length < 32) {
      throw new Error('JWT_SECRET must be set to a strong value (>= 32 chars) in production.');
    }
    return value;
  }
  if (value) return value;
  console.warn('[env] JWT_SECRET not set — using an ephemeral random dev secret. Set JWT_SECRET in .env for stable sessions.');
  return crypto.randomBytes(48).toString('hex');
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: NODE_ENV,

  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',

  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),

  // Anthropic key may be empty until Kone supplies it; the AI service degrades gracefully.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',

  // ZAR conversion rate for dual-currency cost display (approximate; adjust to contracted rate).
  usdZarRate: Number(process.env.USD_ZAR_RATE ?? 18.5),

  // GitHub MCP server (the MCP Host connects to it when URL is set; otherwise it stays in a safe
  // 'not configured' mode). Supplied later via the untracked .env - never committed.
  githubMcpUrl: process.env.GITHUB_MCP_URL ?? '',
  githubMcpToken: process.env.GITHUB_MCP_TOKEN ?? '',

  // "local" today; "sso" once the organisation identity provider is wired in.
  authProvider: (process.env.AUTH_PROVIDER ?? 'local') as 'local' | 'sso',
};

// True when an Anthropic key is configured; the AI service uses this to decide live-call vs fallback.
export const isAiConfigured = (): boolean => env.anthropicApiKey.trim().length > 0;
