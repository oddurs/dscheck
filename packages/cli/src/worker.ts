import { parentPort, workerData } from 'node:worker_threads';
import { lintFiles } from './run.js';

const findings = await lintFiles(workerData as string[]);
parentPort?.postMessage(findings);
