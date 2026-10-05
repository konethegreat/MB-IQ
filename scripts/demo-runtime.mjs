// Code written by Kone & Claude | The code does the following: " Runs the actual API against a
// disposable synthetic SQLite database with fresh credentials and all external providers disabled. "
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');

// Code written by Kone & Claude | The code does the following: " Executes only repository-owned
// setup commands using Node directly, without shell interpolation; reserved settings override .env. "
function run(args, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Demo setup timed out: ${args.join(' ')}`)); }, 30000);
    child.on('exit', code => {
      clearTimeout(timer);
      code === 0 ? resolveRun(output) : reject(new Error(`Demo setup exited ${code}: ${output}`));
    });
  });
}

// Code written by Kone & Claude | The code does the following: " Allocates an available loopback
// port so simultaneous test runs do not share an API or database. "
async function freePort() {
  const socket = createServer();
  await new Promise((resolvePort, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolvePort); });
  const port = socket.address().port;
  await new Promise(resolveClose => socket.close(resolveClose));
  return port;
}

// Code written by Kone & Claude | The code does the following: " Stops the owned server before
// deleting only the exact temporary directory created by this invocation. "
async function stop(child, directory) {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise(resolveExit => child.once('exit', resolveExit));
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timer);
  }
  const path = relative(tmpdir(), directory);
  if (!path || isAbsolute(path) || path.startsWith('..') || dirname(path) !== '.' || !path.startsWith('mbiq-synthetic-')) {
    throw new Error('Refusing to remove a directory outside this demo temporary workspace.');
  }
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

// Code written by Kone & Claude | The code does the following: " Seeds and verifies the ten
// fictional accounts, starts the real HTTP server, and refuses an AI-enabled or MCP-enabled instance. "
export async function startDemo({ log = () => {} } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'mbiq-synthetic-'));
  const password = randomBytes(24).toString('base64url');
  const port = await freePort();
  const env = {
    ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: String(port), AUTH_PROVIDER: 'local',
    DATABASE_URL: `file:${join(directory, 'demo.db').replaceAll('\\', '/')}`,
    JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: '1h',
    ALLOW_DEMO_SEED: 'true', SEED_PASSWORD: password,
    ANTHROPIC_API_KEY: '', GITHUB_MCP_URL: '', GITHUB_MCP_TOKEN: '',
  };
  let child;
  try {
    await writeFile(join(directory, 'demo.db'), '');
    log('Preparing disposable schema.');
    await run(['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], env);
    log('Seeding fictional accounts and work.');
    await run(['--import', 'tsx', 'src/db/seed.ts'], env);
    log('Verifying accounts and deterministic insights.');
    const verification = await run(['--import', 'tsx', 'src/db/verify.ts'], env);
    const insights = await run(['--import', 'tsx', 'src/db/smoke-insights.ts'], env);
    child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    let startupError;
    child.on('error', error => { startupError = error; });
    const origin = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 30000;
    while (true) {
      if (startupError) throw startupError;
      if (child.exitCode !== null) throw new Error(`Demo API exited: ${output}`);
      try {
        const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) });
        const health = await response.json();
        if (response.ok && health.service === 'MB IQ Command Centre API') {
          if (health.aiConfigured || health.githubMcpReady) throw new Error('External providers must be disabled.');
          break;
        }
      } catch (error) {
        if (error.message === 'External providers must be disabled.') throw error;
      }
      if (Date.now() >= deadline) throw new Error(`Demo API did not start: ${output}`);
      await new Promise(resolveWait => setTimeout(resolveWait, 200));
    }
    log('Loopback API ready with external providers disabled.');
    return { origin, password, directory, verification, insights, stop: () => stop(child, directory) };
  } catch (error) {
    await stop(child, directory);
    throw error;
  }
}
