import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientUrl = 'http://127.0.0.1:3000';
const clientStdoutLog = path.join(projectRoot, 'vite.log');
const clientStderrLog = path.join(projectRoot, 'vite.err.log');
const pidDirectory = path.join(os.tmpdir(), 'codex-dev-pids', path.basename(projectRoot).replace(/[^\w.-]+/g, '_'));
const clientPidFile = path.join(pidDirectory, 'vite-dev.pid');
const normalizedProjectRoot = projectRoot.replace(/\\/g, '/').toLowerCase();

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

async function waitForClient(timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isUrlReady(clientUrl)) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

function readPidFile(pidFilePath) {
  if (!existsSync(pidFilePath)) {
    return null;
  }

  const value = Number.parseInt(readFileSync(pidFilePath, 'utf8').trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function clearPidFile(pidFilePath) {
  if (!existsSync(pidFilePath)) {
    return;
  }

  try {
    unlinkSync(pidFilePath);
  } catch {
    // Ignore pid file cleanup failures.
  }
}

function getListeningPids(port) {
  try {
    const output = execFileSync(
      process.platform === 'win32' ? 'cmd.exe' : 'sh',
      process.platform === 'win32'
        ? ['/d', '/c', `netstat -ano -p tcp | findstr LISTENING | findstr ":${port}"`]
        : ['-lc', `lsof -ti tcp:${port}`],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

    const candidates = process.platform === 'win32'
      ? output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => Number.parseInt(line.split(/\s+/).at(-1) || '', 10))
      : output
          .split(/\r?\n/)
          .map((line) => Number.parseInt(line.trim(), 10));

    return [...new Set(candidates.filter((pid) => Number.isFinite(pid) && pid > 0))];
  } catch {
    return [];
  }
}

function getProcessCommandLine(pid) {
  try {
    if (process.platform === 'win32') {
      return execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty CommandLine)`,
        ],
        {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ).trim();
    }

    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function isManagedProcess(pid) {
  const commandLine = getProcessCommandLine(pid).replace(/\\/g, '/').toLowerCase();
  return commandLine.includes(normalizedProjectRoot);
}

function stopProcessTree(pid) {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        cwd: projectRoot,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      return;
    }

    process.kill(pid, 'SIGTERM');
  } catch {
    // Ignore already-exited processes.
  }
}

function recycleUnhealthyManagedClient(port, pidFilePath) {
  const pids = new Set(getListeningPids(port));
  const pidFromFile = readPidFile(pidFilePath);

  if (pidFromFile) {
    pids.add(pidFromFile);
  }

  const managedPids = [...pids].filter(isManagedProcess);

  if (managedPids.length === 0) {
    return false;
  }

  console.log(`Stopping stale Vite dev server process(es): ${managedPids.join(', ')}`);
  managedPids.forEach(stopProcessTree);
  clearPidFile(pidFilePath);
  return true;
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
  let clientReady = await isUrlReady(clientUrl);

  if (clientReady) {
    console.log(`Vite dev server is already running at ${clientUrl}`);
    return;
  }

  const recycled = recycleUnhealthyManagedClient(3000, clientPidFile);
  if (recycled) {
    await sleep(1000);
    clientReady = await isUrlReady(clientUrl);
  }

  if (!clientReady) {
    console.log('Starting Vite dev server...');
    startDetached('npm run dev:client', clientStdoutLog, clientStderrLog, clientPidFile);
  }

  if (await waitForClient()) {
    console.log(`Vite dev server is ready at ${clientUrl}`);
    return;
  }

  console.error(`Vite dev server did not start within 60 seconds. Check ${clientStdoutLog} and ${clientStderrLog}.`);
  process.exit(1);
}

main();
