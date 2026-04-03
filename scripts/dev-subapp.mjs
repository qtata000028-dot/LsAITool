import { ensureSimpleDesignerDependencies, simpleDesignerDevCommand } from './simple-designer-utils.mjs';
import { cleanupDevPorts, runForeground, subappPort } from './dev-stack-utils.mjs';

cleanupDevPorts(process.cwd(), [subappPort]);
ensureSimpleDesignerDependencies(process.cwd());

runForeground(simpleDesignerDevCommand);
