import { openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const serverUrl = 'http://127.0.0.1:3000';
const stdoutLog = path.join(projectRoot, 'vite.log');
const stderrLog = path.join(projectRoot, 'vite.err.log');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReady() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(serverUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

function startDevServer() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/c', 'npm run dev'] : ['run', 'dev'];
  const stdout = openSync(stdoutLog, 'a');
  const stderr = openSync(stderrLog, 'a');

  const child = spawn(command, args, {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', stdout, stderr],
  });

  child.unref();
}

async function main() {
  if (await isServerReady()) {
    console.log(`Dev server is already running at ${serverUrl}`);
    return;
  }

  console.log('Starting Vite dev server...');
  startDevServer();

  if (await waitForServer()) {
    console.log(`Dev server is ready at ${serverUrl}`);
    return;
  }

  console.error(`Dev server did not start within 60 seconds. Check ${stdoutLog} and ${stderrLog}.`);
  process.exit(1);
}

main();
