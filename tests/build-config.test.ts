import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

interface StaticConfig {
  routes: Array<{ route: string; rewrite?: string; headers?: Record<string, string> }>;
  responseOverrides: Record<string, { rewrite: string; statusCode: number }>;
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
}

async function deploymentConfig(): Promise<StaticConfig> {
  return JSON.parse(await readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8')) as StaticConfig;
}

describe('static deployment behavior', () => {
  it('keeps fingerprinted assets immutable while allowing the service worker to update', async () => {
    const config = await deploymentConfig();
    const assetRoute = config.routes.find((route) => route.route === '/assets/*');
    const serviceWorkerRoute = config.routes.find((route) => route.route === '/sw.js');
    expect(assetRoute?.headers?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(serviceWorkerRoute?.headers?.['Cache-Control']).toContain('no-cache');
  });

  it('maps app deep links while preserving a real 404 response for unknown paths', async () => {
    const config = await deploymentConfig();
    const rewrites = new Map(config.routes.filter((route) => route.rewrite).map((route) => [route.route, route.rewrite]));
    expect(rewrites).toEqual(new Map([
      ['/cards', '/index.html'],
      ['/cards/*', '/index.html'],
      ['/demo', '/index.html'],
      ['/demo/*', '/index.html']
    ]));
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
  });

  it('declares restrictive browser policies and the manifest content type', async () => {
    const config = await deploymentConfig();
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('microphone=()');
    expect(config.globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
  });
});
