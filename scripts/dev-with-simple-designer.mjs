import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanupDevPorts } from './dev-stack-utils.mjs';
import { ensureSimpleDesignerDependencies, simpleDesignerDevCommand } from './simple-designer-utils.mjs';

const isWin = process.platform === 'win32';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function run(command) {
  const child = spawn(isWin ? 'cmd.exe' : 'sh', isWin ? ['/d', '/c', command] : ['-lc', command], {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

cleanupDevPorts(projectRoot, [3000, 3001, 5174]);
ensureSimpleDesignerDependencies(projectRoot);

const children = [
  run('npm run dev:api'),
  run('npm run dev:client'),
  run(simpleDesignerDevCommand),
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
