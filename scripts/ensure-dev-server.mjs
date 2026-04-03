import { existsSync, unlinkSync } from 'node:fs';
import {
  clientEnvWithSubapp,
  clientUrl,
  hostHealthUrl,
  isUrlReady,
  logs,
  pidFiles,
  sleep,
  startDetached,
  subappUrl,
  waitForUrl,
} from './dev-stack-utils.mjs';
import { cleanupDevPorts } from './dev-stack-utils.mjs';
import { ensureSimpleDesignerDependencies, simpleDesignerDevCommand } from './simple-designer-utils.mjs';

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

async function main() {
  const stoppedProcesses = cleanupDevPorts(process.cwd(), [3000, 3001, 5174]);
  if (stoppedProcesses.length > 0) {
    clearPidFile(pidFiles.client);
    clearPidFile(pidFiles.host);
    clearPidFile(pidFiles.subapp);
    await sleep(1000);
  }

  let [clientReady, hostReady, subappReady] = await Promise.all([
    isUrlReady(clientUrl),
    isUrlReady(hostHealthUrl),
    isUrlReady(subappUrl),
  ]);

  if (clientReady && hostReady && subappReady) {
    console.log(`Dev stack is already running at ${clientUrl}`);
    return;
  }

  if (!clientReady) {
    console.log('Starting Vite client dev server...');
    startDetached('npm run client', logs.clientStdout, logs.clientStderr, pidFiles.client, clientEnvWithSubapp);
  }

  if (!hostReady) {
    console.log('Starting host server...');
    startDetached('npm run host', logs.hostStdout, logs.hostStderr, pidFiles.host);
  }

  if (!subappReady) {
    ensureSimpleDesignerDependencies(process.cwd());
    console.log('Starting simple process designer subapp...');
    startDetached(simpleDesignerDevCommand, logs.subappStdout, logs.subappStderr, pidFiles.subapp);
  }

  const [clientStarted, hostStarted, subappStarted] = await Promise.all([
    waitForUrl(clientUrl),
    waitForUrl(hostHealthUrl),
    waitForUrl(subappUrl),
  ]);

  if (clientStarted && hostStarted && subappStarted) {
    console.log(`Dev stack is ready at ${clientUrl}`);
    return;
  }

  console.error(`Dev stack did not start within 60 seconds. Check ${logs.clientStdout}, ${logs.clientStderr}, ${logs.hostStdout}, ${logs.hostStderr}, ${logs.subappStdout}, and ${logs.subappStderr}.`);
  process.exit(1);
}

main();
