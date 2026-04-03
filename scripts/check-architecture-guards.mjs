import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const requiredFiles = [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  'docs/ai-development-rules.md',
  'docs/dashboard-architecture-rules.md',
  'docs/frontend-platform-architecture.md',
  '.github/copilot-instructions.md',
  '.github/workflows/ci.yml',
  'src/components/Dashboard.tsx',
];

const markdownFiles = [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  '.github/copilot-instructions.md',
  'docs/ai-development-rules.md',
  'docs/dashboard-architecture-rules.md',
  'docs/frontend-platform-architecture.md',
];

const dashboardMaxLines = 2200;
const forbiddenDashboardImports = [
  '../features/dashboard/module-settings/use-selected-column-context',
  '../features/dashboard/module-settings/use-dashboard-inspector-panel-props',
  '../features/dashboard/module-settings/dashboard-inspector-panel-props-builder-config',
  '../features/dashboard/module-settings/use-dashboard-config-bridge-nodes',
  '../features/dashboard/dashboard-screen-router-props',
  '../features/dashboard/module-settings/dashboard-config-bridge-modals-builder-config',
  '../features/dashboard/module-settings/dashboard-config-bridge-wizard-config',
  '../features/dashboard/module-settings/dashboard-config-bridge-workspace-builder-config',
  '../features/dashboard/module-settings/dashboard-config-bridge-restriction-config',
  '../features/dashboard/module-settings/use-single-table-module-settings-save',
  '../features/dashboard/module-settings/use-dashboard-detail-decoration-state',
  '../features/dashboard/module-settings/use-dashboard-detail-resource-loader',
  '../features/dashboard/module-settings/use-dashboard-detail-tabs-bootstrap',
  '../features/dashboard/module-settings/use-dashboard-single-table-main-resources',
  '../features/dashboard/module-settings/use-dashboard-single-table-tree-resources',
];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function readLines(text) {
  return text.split(/\r?\n/);
}

async function main() {
  const failures = [];

  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!(await fileExists(absolutePath))) {
      failures.push(`缺少必需文件: ${relativePath}`);
    }
  }

  for (const relativePath of markdownFiles) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!(await fileExists(absolutePath))) {
      continue;
    }

    const content = await readFile(absolutePath, 'utf8');
    if (content.includes('/Users/')) {
      failures.push(`${relativePath} 包含本地绝对路径，请改成相对路径`);
    }
    if (/([A-Z]:\\\\|[A-Z]:\/Users\/)/i.test(content)) {
      failures.push(`${relativePath} 包含 Windows 本地绝对路径，请改成相对路径`);
    }
  }

  const dashboardPath = path.join(repoRoot, 'src/components/Dashboard.tsx');
  if (await fileExists(dashboardPath)) {
    const dashboardContent = await readFile(dashboardPath, 'utf8');
    const dashboardLineCount = readLines(dashboardContent).length;

    if (dashboardLineCount > dashboardMaxLines) {
      failures.push(
        `Dashboard.tsx 当前 ${dashboardLineCount} 行，超过架构上限 ${dashboardMaxLines} 行，请继续拆分后再提交`,
      );
    }

    for (const forbiddenImport of forbiddenDashboardImports) {
      if (dashboardContent.includes(forbiddenImport)) {
        failures.push(
          `Dashboard.tsx 不应再直接依赖低层实现: ${forbiddenImport}`,
        );
      }
    }
  }

  const ciPath = path.join(repoRoot, '.github/workflows/ci.yml');
  if (await fileExists(ciPath)) {
    const ciContent = await readFile(ciPath, 'utf8');
    if (!ciContent.includes('npm run guard:architecture')) {
      failures.push('CI 未执行 npm run guard:architecture');
    }
    if (!ciContent.includes('npm run verify')) {
      failures.push('CI 未执行 npm run verify');
    }
  }

  if (failures.length > 0) {
    console.error('架构守卫检查失败:');
    failures.forEach((item, index) => {
      console.error(`${index + 1}. ${item}`);
    });
    process.exit(1);
  }

  console.log('架构守卫检查通过');
}

await main();
