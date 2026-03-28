import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const simpleDesignerDirectory = path.join('subapps', 'simple-process-designer');
export const simpleDesignerDevCommand = `cd ${simpleDesignerDirectory} && npm run dev`;

function runShell(command, cwd, stdio = 'inherit') {
  execFileSync(process.platform === 'win32' ? 'cmd.exe' : 'sh', process.platform === 'win32' ? ['/d', '/c', command] : ['-lc', command], {
    cwd,
    env: process.env,
    stdio,
  });
}

export function ensureSimpleDesignerDependencies(projectRoot, logger = console.log) {
  const simpleDesignerRoot = path.join(projectRoot, simpleDesignerDirectory);
  const viteEntry = path.join(simpleDesignerRoot, 'node_modules', 'vite', 'bin', 'vite.js');

  if (existsSync(viteEntry)) {
    return;
  }

  logger('Simple process designer dependencies are missing. Running npm install in subapps/simple-process-designer...');
  runShell('npm install --no-fund --no-audit', simpleDesignerRoot);

  if (!existsSync(viteEntry)) {
    throw new Error('Simple process designer dependencies are still incomplete after npm install.');
  }
}
