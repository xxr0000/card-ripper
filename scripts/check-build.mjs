import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const limits = {
  totalBytes: 5 * 1024 * 1024,
  javascriptGzipBytes: 350 * 1024,
  cssGzipBytes: 80 * 1024,
};

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }))).flat();
}

const files = await filesIn(root);
let totalBytes = 0;
const violations = [];

for (const file of files) {
  const size = (await stat(file)).size;
  totalBytes += size;
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  const gzipBytes = gzipSync(await readFile(file)).byteLength;
  const limit = file.endsWith('.js') ? limits.javascriptGzipBytes : limits.cssGzipBytes;
  if (gzipBytes > limit) {
    violations.push(`${relative(root, file)} gzip ${(gzipBytes / 1024).toFixed(1)}KB > ${(limit / 1024).toFixed(0)}KB`);
  }
}

if (totalBytes > limits.totalBytes) {
  violations.push(`dist total ${(totalBytes / 1024 / 1024).toFixed(2)}MB > ${(limits.totalBytes / 1024 / 1024).toFixed(0)}MB`);
}

if (violations.length > 0) {
  console.error(`构建体积门禁未通过：\n${violations.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`构建体积门禁通过：dist ${(totalBytes / 1024 / 1024).toFixed(2)}MB`);
}
