import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';

function run(label, command) {
  const child = spawn(isWin ? 'cmd.exe' : 'sh', isWin ? ['/d', '/c', command] : ['-lc', command], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

const children = [
  run('api', 'npm run dev:api'),
  run('client', 'npm run dev:client'),
];

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
