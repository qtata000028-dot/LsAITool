import { openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientUrl = 'http://127.0.0.1:3000';
const apiUrl = 'http://127.0.0.1:3001/api/ai/health';
const clientStdoutLog = path.join(projectRoot, 'vite.log');
const clientStderrLog = path.join(projectRoot, 'vite.err.log');
const apiStdoutLog = path.join(projectRoot, 'minimax-api.log');
const apiStderrLog = path.join(projectRoot, 'minimax-api.err.log');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isUrlReady(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServices(timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const [clientReady, apiReady] = await Promise.all([
      isUrlReady(clientUrl),
      isUrlReady(apiUrl),
    ]);

    if (clientReady && apiReady) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

function startDetached(scriptCommand, stdoutPath, stderrPath) {
  const stdout = openSync(stdoutPath, 'a');
  const stderr = openSync(stderrPath, 'a');

  const child = spawn(process.platform === 'win32' ? 'cmd.exe' : 'sh', process.platform === 'win32' ? ['/d', '/c', scriptCommand] : ['-lc', scriptCommand], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', stdout, stderr],
  });

  child.unref();
}

async function main() {
  const [clientReady, apiReady] = await Promise.all([
    isUrlReady(clientUrl),
    isUrlReady(apiUrl),
  ]);

  if (clientReady && apiReady) {
    console.log(`Dev stack is already running at ${clientUrl}`);
    return;
  }

  if (!clientReady) {
    console.log('Starting Vite dev server...');
    startDetached('npm run dev:client', clientStdoutLog, clientStderrLog);
  }

  if (!apiReady) {
    console.log('Starting MiniMax API server...');
    startDetached('npm run dev:api', apiStdoutLog, apiStderrLog);
  }

  if (await waitForServices()) {
    console.log(`Dev stack is ready at ${clientUrl}`);
    return;
  }

  console.error(`Dev stack did not start within 60 seconds. Check ${clientStdoutLog}, ${clientStderrLog}, ${apiStdoutLog}, and ${apiStderrLog}.`);
  process.exit(1);
}

main();
