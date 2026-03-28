import { mkdirSync, openSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import { cleanupDevPorts } from './dev-stack-utils.mjs';
import { ensureSimpleDesignerDependencies, simpleDesignerDevCommand } from './simple-designer-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientUrl = 'http://127.0.0.1:3000';
const apiUrl = 'http://127.0.0.1:3001/api/ai/health';
const simpleDesignerUrl = 'http://127.0.0.1:5174';
const clientStdoutLog = path.join(projectRoot, 'vite.log');
const clientStderrLog = path.join(projectRoot, 'vite.err.log');
const apiStdoutLog = path.join(projectRoot, 'minimax-api.log');
const apiStderrLog = path.join(projectRoot, 'minimax-api.err.log');
const simpleDesignerStdoutLog = path.join(projectRoot, 'simple-process-designer.log');
const simpleDesignerStderrLog = path.join(projectRoot, 'simple-process-designer.err.log');
const pidDirectory = path.join(os.tmpdir(), 'codex-dev-pids', path.basename(projectRoot).replace(/[^\w.-]+/g, '_'));
const clientPidFile = path.join(pidDirectory, 'vite-dev.pid');
const apiPidFile = path.join(pidDirectory, 'minimax-api.pid');
const simpleDesignerPidFile = path.join(pidDirectory, 'simple-process-designer.pid');

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

async function waitForUrl(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isUrlReady(url)) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

function startDetached(scriptCommand, stdoutPath, stderrPath, pidFilePath) {
  const stdout = openSync(stdoutPath, 'a');
  const stderr = openSync(stderrPath, 'a');

  const child = spawn(process.platform === 'win32' ? 'cmd.exe' : 'sh', process.platform === 'win32' ? ['/d', '/c', scriptCommand] : ['-lc', scriptCommand], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', stdout, stderr],
  });

  mkdirSync(pidDirectory, { recursive: true });
  writeFileSync(pidFilePath, String(child.pid));
  child.unref();
}

async function main() {
  console.log('Restarting front-end dev server on port 3000...');
  cleanupDevPorts(projectRoot, [3000]);
  await sleep(1000);

  const apiReady = await isUrlReady(apiUrl);
  if (!apiReady) {
    console.log('Local API proxy on port 3001 is not ready. Starting it now...');
    startDetached('npm run dev:api', apiStdoutLog, apiStderrLog, apiPidFile);
  } else {
    console.log('Local API proxy on port 3001 is already running.');
  }

  const simpleDesignerReady = await isUrlReady(simpleDesignerUrl);
  if (!simpleDesignerReady) {
    ensureSimpleDesignerDependencies(projectRoot);
    console.log('Simple process designer on port 5174 is not ready. Starting it now...');
    startDetached(simpleDesignerDevCommand, simpleDesignerStdoutLog, simpleDesignerStderrLog, simpleDesignerPidFile);
  } else {
    console.log('Simple process designer on port 5174 is already running.');
  }

  startDetached('npm run dev:client', clientStdoutLog, clientStderrLog, clientPidFile);

  const clientReady = await waitForUrl(clientUrl);
  if (!clientReady) {
    console.error(`Front-end dev server did not start within 60 seconds. Check ${clientStdoutLog} and ${clientStderrLog}.`);
    process.exit(1);
  }

  if (!apiReady) {
    const apiStarted = await waitForUrl(apiUrl);
    if (!apiStarted) {
      console.error(`Local API proxy did not start within 60 seconds. Check ${apiStdoutLog} and ${apiStderrLog}.`);
      process.exit(1);
    }
  }

  if (!simpleDesignerReady) {
    const simpleDesignerStarted = await waitForUrl(simpleDesignerUrl);
    if (!simpleDesignerStarted) {
      console.error(`Simple process designer did not start within 60 seconds. Check ${simpleDesignerStdoutLog} and ${simpleDesignerStderrLog}.`);
      process.exit(1);
    }
  }

  console.log(`VS Code daily dev is ready at ${clientUrl}`);
}

main();
