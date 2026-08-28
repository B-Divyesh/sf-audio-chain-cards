import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static deployment cache policy', () => {
  it('keeps fingerprinted assets immutable while allowing the service worker to update', async () => {
    const config = JSON.parse(await readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8')) as {
      routes: Array<{ route: string; headers: Record<string, string> }>;
    };
    const assetRoute = config.routes.find((route) => route.route === '/assets/*');
    const serviceWorkerRoute = config.routes.find((route) => route.route === '/sw.js');
    expect(assetRoute?.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(serviceWorkerRoute?.headers['Cache-Control']).toContain('no-cache');
  });

  it('does not precache hosting-only configuration that Azure does not expose as a response', async () => {
    const generator = await readFile(new URL('../scripts/build-sw.mjs', import.meta.url), 'utf8');
    expect(generator).toContain("file !== '/staticwebapp.config.json'");
  });

  it('builds legal pages as Vite entries so they use fingerprinted CSS', async () => {
    const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
    const privacy = await readFile(new URL('../privacy/index.html', import.meta.url), 'utf8');
    const terms = await readFile(new URL('../terms/index.html', import.meta.url), 'utf8');
    expect(config).toContain("privacy: 'privacy/index.html'");
    expect(config).toContain("terms: 'terms/index.html'");
    expect(privacy).toContain('/src/style.css');
    expect(terms).toContain('/src/style.css');
    expect(privacy).not.toContain('/assets/style.css');
    expect(terms).not.toContain('/assets/style.css');
  });
});
