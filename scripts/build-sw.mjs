import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const outputDir = new URL('../dist/', import.meta.url);

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return files.flat();
}

const outputPath = outputDir.pathname;
const generatedFiles = (await filesIn(outputPath))
  .map((file) => `/${relative(outputPath, file).replaceAll('\\', '/')}`)
  .filter((file) => file !== '/sw.js' && !file.endsWith('.map'))
  .sort();
const appShell = [...new Set(['/', '/privacy/', '/terms/', ...generatedFiles])];
const hash = createHash('sha256');
for (const file of generatedFiles) hash.update(await readFile(join(outputPath, file)));
const version = hash.digest('hex').slice(0, 12);
const swPath = join(outputPath, 'sw.js');
const template = await readFile(swPath, 'utf8');
const output = template
  .replace('chain-cards-__CACHE_VERSION__', `chain-cards-${version}`)
  .replace('/*__APP_SHELL__*/ []', `/* generated at build time */ ${JSON.stringify(appShell, null, 2)}`);

if (output.includes('__CACHE_VERSION__') || output.includes('/*__APP_SHELL__*/ []')) {
  throw new Error('Service worker build placeholders were not replaced.');
}
await writeFile(swPath, output);
