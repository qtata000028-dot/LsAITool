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

async function main() {
  console.log('Restarting client on port 3000...');
  cleanupDevPorts(process.cwd(), [3000]);
  await sleep(1000);

  const hostReady = await isUrlReady(hostHealthUrl);
  if (!hostReady) {
    console.log('Host server on port 3001 is not ready. Starting it now...');
    startDetached('npm run host', logs.hostStdout, logs.hostStderr, pidFiles.host);
  } else {
    console.log('Host server on port 3001 is already running.');
  }

  const subappReady = await isUrlReady(subappUrl);
  if (!subappReady) {
    ensureSimpleDesignerDependencies(process.cwd());
    console.log('Simple process designer on port 5174 is not ready. Starting it now...');
    startDetached(simpleDesignerDevCommand, logs.subappStdout, logs.subappStderr, pidFiles.subapp);
  } else {
    console.log('Simple process designer on port 5174 is already running.');
  }

  startDetached('npm run client', logs.clientStdout, logs.clientStderr, pidFiles.client, clientEnvWithSubapp);

  const clientReady = await waitForUrl(clientUrl);
  if (!clientReady) {
    console.error(`Client dev server did not start within 60 seconds. Check ${logs.clientStdout} and ${logs.clientStderr}.`);
    process.exit(1);
  }

  if (!hostReady) {
    const hostStarted = await waitForUrl(hostHealthUrl);
    if (!hostStarted) {
      console.error(`Host server did not start within 60 seconds. Check ${logs.hostStdout} and ${logs.hostStderr}.`);
      process.exit(1);
    }
  }

  if (!subappReady) {
    const subappStarted = await waitForUrl(subappUrl);
    if (!subappStarted) {
      console.error(`Simple process designer did not start within 60 seconds. Check ${logs.subappStdout} and ${logs.subappStderr}.`);
      process.exit(1);
    }
  }

  console.log(`VS Code daily dev is ready at ${clientUrl}`);
}

main();
