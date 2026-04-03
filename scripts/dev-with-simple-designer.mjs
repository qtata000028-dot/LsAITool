import {
  cleanupDevPorts,
  clientEnvWithSubapp,
  clientPort,
  hostPort,
  runForeground,
  subappPort,
} from './dev-stack-utils.mjs';
import { ensureSimpleDesignerDependencies, simpleDesignerDevCommand } from './simple-designer-utils.mjs';

cleanupDevPorts(process.cwd(), [clientPort, hostPort, subappPort]);
ensureSimpleDesignerDependencies(process.cwd());

const children = [
  runForeground('npm run host'),
  runForeground('npm run client', clientEnvWithSubapp),
  runForeground(simpleDesignerDevCommand),
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
