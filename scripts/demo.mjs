// Code written by Kone & Claude | The code does the following: " Starts a loopback-only browser
// walkthrough with a temporary database, fresh credentials and no configured external providers. "
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startDemo, root } from './demo-runtime.mjs';

const demo = await startDemo();
let frontend;
let stopping = false;

// Code written by Kone & Claude | The code does the following: " Closes Vite and the API before
// removing this invocation's temporary database on Ctrl+C or termination. "
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  try { await frontend?.close(); await demo.stop(); }
  catch (error) { console.error(error.message); code = 1; }
  process.exit(code);
}
process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
try {
  const requireFrontend = createRequire(join(root, 'frontend/package.json'));
  const { createServer } = await import(pathToFileURL(requireFrontend.resolve('vite')).href);
  const { default: react } = await import(pathToFileURL(requireFrontend.resolve('@vitejs/plugin-react')).href);
  frontend = await createServer({
    root: join(root, 'frontend'), configFile: false, envFile: false, plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('') },
    server: { host: '127.0.0.1', port: 4176, strictPort: true, proxy: { '/api': { target: demo.origin } } },
  });
  await frontend.listen();
  if (process.argv.includes('--check')) {
    const page = await fetch('http://127.0.0.1:4176', { signal: AbortSignal.timeout(10000) });
    const health = await fetch('http://127.0.0.1:4176/api/health', { signal: AbortSignal.timeout(10000) });
    const source = await fetch('http://127.0.0.1:4176/src/main.tsx', { signal: AbortSignal.timeout(10000) });
    if (!page.ok || !(await page.text()).includes('MB IQ') || !source.ok || !health.ok || (await health.json()).aiConfigured) {
      throw new Error('Synthetic launcher check failed.');
    }
    await frontend.close();
    await demo.stop();
    console.log('Synthetic launcher check passed (loopback API, Vite source transform and temporary database cleanup).');
    process.exit(0);
  }
  console.log('MB IQ synthetic walkthrough: http://127.0.0.1:4176');
  console.log(`Temporary workspace: ${demo.directory}`);
  console.log(`Generated demo password (all example.test accounts): ${demo.password}`);
  console.log('Local auth only. Anthropic and GitHub MCP disabled. Ctrl+C stops both servers and removes the temporary database.');
} catch (error) {
  console.error(error.message);
  await shutdown(1);
}
