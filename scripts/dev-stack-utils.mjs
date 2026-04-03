import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, openSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, '..');
export const clientPort = 3000;
export const hostPort = 3001;
export const subappPort = 5174;
export const clientUrl = `http://127.0.0.1:${clientPort}`;
export const hostHealthUrl = `http://127.0.0.1:${hostPort}/api/ai/health`;
export const subappUrl = `http://127.0.0.1:${subappPort}`;
export const isWin = process.platform === 'win32';
export const pidDirectory = path.join(os.tmpdir(), 'codex-dev-pids', path.basename(projectRoot).replace(/[^\w.-]+/g, '_'));

export const logs = {
  clientStdout: path.join(projectRoot, 'vite.log'),
  clientStderr: path.join(projectRoot, 'vite.err.log'),
  hostStdout: path.join(projectRoot, 'minimax-api.log'),
  hostStderr: path.join(projectRoot, 'minimax-api.err.log'),
  subappStdout: path.join(projectRoot, 'simple-process-designer.log'),
  subappStderr: path.join(projectRoot, 'simple-process-designer.err.log'),
};

export const pidFiles = {
  client: path.join(pidDirectory, 'vite-dev.pid'),
  host: path.join(pidDirectory, 'minimax-api.pid'),
  subapp: path.join(pidDirectory, 'simple-process-designer.pid'),
};

export const clientEnvWithSubapp = {
  ...process.env,
  VITE_SIMPLE_PROCESS_DESIGNER_URL: subappUrl,
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function isUrlReady(url) {
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

export async function waitForUrl(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isUrlReady(url)) {
      return true;
    }

    await sleep(1000);
  }

  return false;
}

export function runForeground(command, env = process.env) {
  const child = spawn(isWin ? 'cmd.exe' : 'sh', isWin ? ['/d', '/c', command] : ['-lc', command], {
    stdio: 'inherit',
    env,
    cwd: projectRoot,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

export function startDetached(command, stdoutPath, stderrPath, pidFilePath, env = process.env) {
  const stdout = openSync(stdoutPath, 'a');
  const stderr = openSync(stderrPath, 'a');

  const child = spawn(isWin ? 'cmd.exe' : 'sh', isWin ? ['/d', '/c', command] : ['-lc', command], {
    cwd: projectRoot,
    detached: true,
    env,
    stdio: ['ignore', stdout, stderr],
  });

  mkdirSync(pidDirectory, { recursive: true });
  writeFileSync(pidFilePath, String(child.pid));
  child.unref();
}

function listListeningPids(cwd, port) {
  try {
    const output = execFileSync(
      isWin ? 'cmd.exe' : 'sh',
      isWin
        ? ['/d', '/c', `netstat -ano -p tcp | findstr LISTENING | findstr ":${port}"`]
        : ['-lc', `lsof -ti tcp:${port}`],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

    const candidates = isWin
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

function readCommandLine(cwd, pid) {
  try {
    if (isWin) {
      return execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty CommandLine)`,
        ],
        {
          cwd,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ).trim();
    }

    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function stopProcessTree(cwd, pid) {
  try {
    if (isWin) {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        cwd,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      return;
    }

    process.kill(pid, 'SIGTERM');
  } catch {
    // Ignore already-exited processes.
  }
}

export function cleanupDevPorts(cwd, ports, logger = console.log) {
  const stopped = [];
  const seenPids = new Set();

  ports.forEach((port) => {
    listListeningPids(cwd, port).forEach((pid) => {
      if (seenPids.has(pid)) {
        return;
      }

      seenPids.add(pid);
      const commandLine = readCommandLine(cwd, pid);
      const preview = commandLine ? ` (${commandLine.slice(0, 160)})` : '';
      logger(`Stopping process on port ${port}: ${pid}${preview}`);
      stopProcessTree(cwd, pid);
      stopped.push({ commandLine, pid, port });
    });
  });

  return stopped;
}
