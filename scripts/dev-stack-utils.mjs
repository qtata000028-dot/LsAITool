import { execFileSync } from 'node:child_process';

function listListeningPids(cwd, port) {
  try {
    const output = execFileSync(
      process.platform === 'win32' ? 'cmd.exe' : 'sh',
      process.platform === 'win32'
        ? ['/d', '/c', `netstat -ano -p tcp | findstr LISTENING | findstr ":${port}"`]
        : ['-lc', `lsof -ti tcp:${port}`],
      {
        cwd,
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

function readCommandLine(cwd, pid) {
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
    if (process.platform === 'win32') {
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
