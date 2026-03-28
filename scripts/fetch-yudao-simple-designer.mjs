import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = path.resolve(
  repoRoot,
  'subapps',
  'simple-process-designer',
  'vendor',
  'yudao-ui-admin-vue3',
);
const tempRoot = path.resolve(repoRoot, '.codex_tmp', 'yudao-ui-admin-vue3-sync');

const SPARSE_PATHS = [
  'src/views/bpm/simple',
  'src/components/SimpleProcessDesignerV2',
];

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
}

async function cleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function copySparsePaths() {
  const copiedPaths = [];

  for (const sparsePath of SPARSE_PATHS) {
    const sourcePath = path.join(tempRoot, sparsePath);
    const targetPath = path.join(targetRoot, sparsePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.cp(sourcePath, targetPath, { recursive: true });
    copiedPaths.push(sparsePath);
  }

  return copiedPaths;
}

async function main() {
  await cleanDir(tempRoot);
  await cleanDir(targetRoot);

  run('git', [
    'clone',
    '--depth',
    '1',
    '--filter=blob:none',
    '--sparse',
    'https://github.com/yudaocode/yudao-ui-admin-vue3.git',
    tempRoot,
  ]);

  run('git', ['sparse-checkout', 'set', ...SPARSE_PATHS], tempRoot);

  const copiedPaths = await copySparsePaths();

  await fs.writeFile(
    path.join(targetRoot, 'SYNC_MANIFEST.json'),
    JSON.stringify(
      {
        copiedAt: new Date().toISOString(),
        sourceRepo: 'https://github.com/yudaocode/yudao-ui-admin-vue3.git',
        sourceBranch: 'master',
        paths: copiedPaths,
      },
      null,
      2,
    ),
    'utf8',
  );

  if (existsSync(path.join(tempRoot, '.git'))) {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  console.log(`Synced ${copiedPaths.length} path groups into ${targetRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
