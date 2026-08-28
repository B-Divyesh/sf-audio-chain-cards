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
});
