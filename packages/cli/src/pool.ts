import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { Finding } from './run.js';

/**
 * Fan file lists out across worker threads. Parsing dominates lint time and is
 * CPU-bound, so wall-clock scales with cores. Small runs stay in-process.
 */
export async function lintFilesParallel(files: string[]): Promise<Finding[]> {
  const { lintFiles } = await import('./run.js');
  const { progress } = await import('./render.js');
  if (files.length < 64) return lintFiles(files);

  // X3: a long run should not look hung. TTY only — see render.progress.
  const bar = progress(files.length);

  const workers = Math.min(availableParallelism(), Math.ceil(files.length / 64));
  const chunks: string[][] = Array.from({ length: workers }, () => []);
  files.forEach((file, i) => chunks[i % workers]?.push(file));

  const workerUrl = new URL('./worker.js', import.meta.url);
  const results = await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise<Finding[]>((resolvePromise, reject) => {
          const worker = new Worker(workerUrl, { workerData: chunk });
          worker.once('message', (findings: Finding[]) => {
            bar.tick(chunk.length);
            resolvePromise(findings);
            void worker.terminate();
          });
          worker.once('error', reject);
        }),
    ),
  );
  bar.done();
  return results
    .flat()
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
}
