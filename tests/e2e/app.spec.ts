import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

/**
 * A worker activated after the initial navigation need not control that first
 * document. Waiting for activation, then navigating once, is deterministic on
 * both desktop Chromium and the Pixel 5 emulation and catches a preview that
 * was accidentally started without the built worker.
 */
async function controlPageWithBuiltServiceWorker(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active)),
    { timeout: 10_000 }
  ).toBe(true);
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 10_000 }
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('chain-cards-local');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
    localStorage.clear();
  });
  await page.reload();
});

test('uses the starter card end to end', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Build and share an audio repair sequence/i);
  await expect(page.getByRole('link', { name: /Roomy voice: repair & review/i })).toBeVisible();
  await page.getByRole('link', { name: /Try it with sample data/i }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Roomy voice/i);
  await page.getByRole('button', { name: 'Mark complete' }).first().click();
  await expect(page.getByText('2 of 3 complete')).toBeVisible();

  await page.getByLabel('Input path').fill('voice raw.wav');
  await page.getByLabel('New output path').fill('voice raw.wav');
  await page.getByRole('button', { name: 'Create FFmpeg command' }).first().click();
  await expect(page.getByRole('status')).toContainText(/different output path/i);

  await page.getByLabel('New output path').fill('voice cleaned.wav');
  await page.getByRole('button', { name: 'Create FFmpeg command' }).first().click();
  await expect(page.locator('.command-output code').first()).toContainText("ffmpeg -i 'voice raw.wav'");

  await page.getByLabel('Time').fill('1:24');
  await page.getByLabel('What should be checked?').fill('Tail after the second sentence');
  await page.getByRole('button', { name: 'Add review label' }).click();
  await expect(page.getByRole('button', { name: 'Jump to 1:24' })).toBeVisible();

  await page.reload();
  await expect(page.getByText('2 of 3 complete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump to 1:24' })).toBeVisible();
});

test('rejects invalid timestamp labels without rewriting the creator input', async ({ page }) => {
  await page.getByRole('link', { name: /Try it with sample data/i }).click();
  const time = page.getByLabel('Time');
  const note = page.getByLabel('What should be checked?');
  await time.fill('  ');
  await note.fill('Listen for a clipped ending');
  await page.getByRole('button', { name: 'Add review label' }).click();
  await expect(page.getByRole('status')).toContainText(/Enter a valid M:SS/i);
  await expect(time).toHaveValue('  ');
  await expect(page.getByRole('button', { name: /Jump to 0:00/ })).toHaveCount(0);

  await time.fill('1:60');
  await page.getByRole('button', { name: 'Add review label' }).click();
  await expect(page.getByRole('status')).toContainText(/00–59/);
  await expect(time).toHaveValue('1:60');
  await expect(page.getByRole('button', { name: /Jump to 2:00/ })).toHaveCount(0);
});

test('refuses malformed portable nested data before writing it locally', async ({ page }) => {
  const now = new Date().toISOString();
  const malformed = {
    format: 'chain-cards',
    version: 1,
    exportedAt: now,
    card: {
      schemaVersion: 1,
      id: 'malformed-nested-card',
      title: 'Malformed nested card',
      goal: 'This must never be imported.',
      safetyNote: 'Work on a copy.',
      createdAt: now,
      updatedAt: now,
      steps: [{ id: 'step-1', title: 'A complete step', tool: 'Other', action: 'Do this.', settings: '', listenFor: 'Listen.', complete: false }],
      labels: [{}],
      history: [{ at: now, note: 'Created' }]
    }
  };
  await page.locator('#import-file').setInputFiles({
    name: 'malformed.chain-card.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(malformed))
  });
  await expect(page.getByRole('status')).toContainText('card.labels[0].id must be a non-empty string');
  await expect(page.getByText('Malformed nested card', { exact: true })).toHaveCount(0);
});

test('creates and edits a portable card', async ({ page }) => {
  await page.getByRole('link', { name: 'Build your own card' }).click();
  await page.getByLabel('Card title').fill('Warm interview cleanup');
  await page.getByLabel('Goal').fill('Remove low distractions and keep speech natural.');
  await page.getByLabel('Step name').fill('Check the room');
  await page.getByLabel('Action').fill('Duplicate the track and compare a light cleanup pass.');
  await page.getByLabel('What should the listener check?').fill('Word endings stay clear and uncut.');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Warm interview cleanup');
  await expect(page.getByText('Check the room', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Edit card' }).click();
  await page.getByRole('button', { name: 'Add another step' }).click();
  const secondStep = page.locator('.editor-step').nth(1);
  await secondStep.getByLabel('Step name').fill('Final listen');
  await secondStep.getByLabel('Action', { exact: true }).fill('Listen once at a comfortable level.');
  await secondStep.getByLabel('What should the listener check?').fill('No new clicks or harsh peaks.');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.locator('.chain-step')).toHaveCount(2);
});

test('has no accessibility violations or nested complementary landmarks on the workbench', async ({ page }) => {
  const homeResults = await new AxeBuilder({ page }).analyze();
  expect(homeResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.getByRole('link', { name: /Try it with sample data/i }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('the production-preview worker controls the saved workbench before its offline reload', async ({ page, context }) => {
  await page.getByRole('link', { name: /Try it with sample data/i }).click();
  await controlPageWithBuiltServiceWorker(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Roomy voice');
  const scriptPath = await page.locator('script[type="module"]').getAttribute('src');
  const stylePath = await page.locator('link[rel="stylesheet"]').getAttribute('href');
  expect(scriptPath).toMatch(/^\/assets\/[\w-]+\.js$/);
  expect(stylePath).toMatch(/^\/assets\/[\w-]+\.css$/);
  await expect.poll(() => page.evaluate(async (path) => Boolean(await caches.match(path!)), scriptPath)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Roomy voice');
  await expect(page.getByText(/You are offline/)).toBeVisible();
});

test('offers and activates a newly available service worker', async ({ page }) => {
  await controlPageWithBuiltServiceWorker(page);
  const workerPath = new URL('../../dist/sw.js', import.meta.url);
  const originalWorker = await readFile(workerPath, 'utf8');
  const updateVersion = `chain-cards-update-test-${Date.now()}`;
  const updatedWorker = originalWorker.replace(/const VERSION = 'chain-cards-[^']+';/, `const VERSION = '${updateVersion}';`);
  expect(updatedWorker).not.toBe(originalWorker);

  await writeFile(workerPath, updatedWorker);
  try {
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.locator('#update-toast')).toBeVisible({ timeout: 10_000 });
    const reloaded = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Update now' }).click();
    await reloaded;
    await expect.poll(() => page.evaluate(async (version) => (await caches.keys()).includes(`${version}-shell`), updateVersion), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active))).toBe(true);
  } finally {
    await writeFile(workerPath, originalWorker);
  }
});

test('fits a 390px-class screen without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const brandBox = await page.getByRole('link', { name: 'Chain Cards home' }).boundingBox();
  expect(brandBox?.width).toBeGreaterThanOrEqual(44);
  expect(brandBox?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('link', { name: /Try it with sample data/i }).click();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
});

test('keeps both first actions usable in a fresh phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 727 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build and share an audio repair sequence');
  await expect(page.getByText(/For beginning audio creators/)).toBeVisible();

  for (const name of ['Try it with sample data', 'Build your own card']) {
    const action = page.getByRole('link', { name });
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(727);
    const hitTarget = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return element?.closest('a')?.textContent?.trim();
    }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
    expect(hitTarget).toBe(name);
  }
});

test('uses real routes with route titles, announcements, history, and heading focus', async ({ page }) => {
  await page.getByRole('link', { name: 'Build your own card' }).click();
  await expect(page).toHaveURL(/\/cards\/new$/);
  await expect(page).toHaveTitle('New card — Chain Cards');
  const newHeading = page.getByRole('heading', { level: 1 });
  await expect(newHeading).toHaveText('Create an audio repair sequence');
  await expect(newHeading).toBeFocused();
  await expect(page.locator('#route-status')).toHaveText('Create an audio repair sequence page loaded');

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle('Chain Cards — Build audio repair sequences');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  await page.goto('/demo');
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page).toHaveTitle('Demo — Chain Cards');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
});

test('ships complete social metadata and a designed not-found document', async ({ page }) => {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://audio-chain-cards.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://audio-chain-cards.sociobot.in/social-card.jpg');
  const socialSize = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/social-card.jpg';
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(socialSize).toEqual({ width: 1200, height: 630 });

  await page.goto('/missing-browser-route');
  await expect(page).toHaveTitle('Page not found — Chain Cards');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist');

  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Chain Cards');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('keeps visible phone controls at least 44 pixels and removes motion when requested', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.hero-art').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  const homeTargets = await page.locator('a, button, input:not(.visually-hidden), select, textarea, label.file-drop').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
    })
    .map((element) => {
      const box = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label') || element.textContent?.trim(), width: box.width, height: box.height };
    }));
  expect(homeTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  const demoTargets = await page.locator('a, button, input:not(.visually-hidden), select, textarea, label.file-drop').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
    })
    .map((element) => {
      const box = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label') || element.textContent?.trim(), width: box.width, height: box.height };
    }));
  expect(demoTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);
});

test('keeps dialog focus contained and returns it after keyboard cancellation', async ({ page }) => {
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  const open = page.getByRole('button', { name: 'Delete card' });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep card' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roomy voice: repair & review');
});

test('keeps skip-link focus in the current main landmark instead of routing #main', async ({ page }) => {
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');

  // Wait for the hashchange handler before checking focus. A regression here
  // used to rerender Home and leave focus on body.
  await page.waitForFunction(() => document.activeElement?.id === 'main');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Build and share an audio repair sequence/i);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeFocused();
});

for (const legalPage of [
  { path: '/privacy/', title: 'Privacy', heading: 'How Chain Cards handles your data' },
  { path: '/terms/', title: 'Terms', heading: 'Use Chain Cards with a copy' }
]) {
  test(`loads the built ${legalPage.title} page without missing assets or console errors`, async ({ page }) => {
    const failedResponses: string[] = [];
    const consoleErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(legalPage.path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(legalPage.heading);
    await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', /^\/assets\/.+\.css$/);
    expect(await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor)).toBe('rgb(9, 13, 18)');
    await page.setViewportSize({ width: 390, height: 844 });
    const returnLink = await page.getByRole('link', { name: 'Return home' }).boundingBox();
    expect(returnLink?.width).toBeGreaterThanOrEqual(44);
    expect(returnLink?.height).toBeGreaterThanOrEqual(44);
    expect(failedResponses).toEqual([]);
    expect(consoleErrors).toEqual([]);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
}
