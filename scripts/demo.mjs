// Code written by Kone & Claude | The code does the following: " Starts a loopback-only browser
// walkthrough with a temporary database, fresh credentials and no configured external providers. "
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startDemo, root } from './demo-runtime.mjs';

const check = process.argv.includes('--check');
const demo = await startDemo({ log: check ? console.log : () => {} });
let frontend;
let stopping = false;

// Code written by Kone & Claude | The code does the following: " Closes Vite and the API before
// removing this invocation's temporary database on Ctrl+C or termination. "
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  try { await closeFrontend(); }
  catch (error) { console.error(error.message); code = 1; }
  try { await demo.stop(); }
  catch (error) { console.error(error.message); code = 1; }
  process.exit(code);
}

// Code written by Kone & Claude | The code does the following: " Bounds frontend shutdown so
// an active browser connection cannot leave the disposable check running indefinitely. "
async function closeFrontend() {
  if (!frontend) return;
  let timer;
  try {
    await Promise.race([frontend.close(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Vite shutdown timed out.')), 10000);
    })]);
  } finally { clearTimeout(timer); }
}
process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
try {
  const requireFrontend = createRequire(join(root, 'frontend/package.json'));
  const { build, preview } = await import(pathToFileURL(requireFrontend.resolve('vite')).href);
  const { default: react } = await import(pathToFileURL(requireFrontend.resolve('@vitejs/plugin-react')).href);
  const outputDirectory = join(demo.directory, 'frontend');
  if (dirname(outputDirectory) !== demo.directory) throw new Error('Frontend output must remain in the demo temporary workspace.');
  const config = {
    root: join(root, 'frontend'), configFile: false, envFile: false, plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('') },
    build: { outDir: outputDirectory, emptyOutDir: true },
    preview: { host: '127.0.0.1', port: 4176, strictPort: true, proxy: { '/api': { target: demo.origin } } },
  };
  console.log('Building the synthetic frontend in its temporary workspace.');
  await build(config);
  frontend = await preview(config);
  if (check) {
    console.log('Loopback Vite ready; checking HTTP responses.');
    const page = await fetch('http://127.0.0.1:4176', { signal: AbortSignal.timeout(10000) });
    const health = await fetch('http://127.0.0.1:4176/api/health', { signal: AbortSignal.timeout(10000) });
    const html = await page.text();
    const healthData = await health.json();
    const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
    if (!scriptPath?.startsWith('/assets/')) throw new Error('The compiled frontend entry was not served.');
    const source = await fetch(`http://127.0.0.1:4176${scriptPath}`, { signal: AbortSignal.timeout(10000) });
    const compiled = await source.text();
    if (!page.ok || !html.includes('MB IQ') || !source.ok || compiled.length < 100 || !health.ok || healthData.aiConfigured || healthData.githubMcpReady) {
      throw new Error('Synthetic launcher check failed.');
    }
    console.log('Compiled frontend/proxy checks passed; closing Vite.');
    await closeFrontend();
    await demo.stop();
    console.log('Synthetic launcher check passed (loopback API, compiled frontend and temporary workspace cleanup).');
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
