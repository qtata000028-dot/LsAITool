import {
  cleanupDevPorts,
  clientPort,
  hostPort,
  runForeground,
} from './dev-stack-utils.mjs';

cleanupDevPorts(process.cwd(), [clientPort, hostPort]);

const children = [
  runForeground('npm run host'),
  runForeground('npm run client'),
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
