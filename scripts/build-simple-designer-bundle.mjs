import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const subappRoot = path.resolve(projectRoot, 'subapps', 'simple-process-designer');
const subappDist = path.resolve(subappRoot, 'dist');
const publishTarget = path.resolve(projectRoot, 'public', 'simple-process-designer');
function log(message) {
  process.stdout.write(`${message}\n`);
}

function runBuild() {
  log('Building simple-process-designer child app...');
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/d', '/c', 'npm run build'], {
      cwd: subappRoot,
      stdio: 'inherit',
    });
    return;
  }

  execFileSync('npm', ['run', 'build'], {
    cwd: subappRoot,
    stdio: 'inherit',
  });
}

function syncDist() {
  if (!existsSync(subappDist)) {
    throw new Error(`Child dist not found: ${subappDist}`);
  }

  rmSync(publishTarget, { force: true, recursive: true });
  mkdirSync(path.dirname(publishTarget), { recursive: true });
  cpSync(subappDist, publishTarget, { recursive: true });
  log(`Synced child app bundle to ${publishTarget}`);
}

runBuild();
syncDist();
