import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/clear route/i);
  await expect(page.getByRole('link', { name: /Roomy voice: repair & review/i })).toBeVisible();
  await page.getByRole('link', { name: /Try the 3-step starter/i }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Roomy voice/i);
  await page.getByRole('button', { name: 'Mark complete' }).first().click();
  await expect(page.getByText('1 of 3 complete')).toBeVisible();

  await page.getByLabel('Input path').fill('voice raw.wav');
  await page.getByLabel('New output path').fill('voice raw.wav');
  await page.getByRole('button', { name: 'Make FFmpeg command' }).first().click();
  await expect(page.getByRole('status')).toContainText(/different output path/i);

  await page.getByLabel('New output path').fill('voice cleaned.wav');
  await page.getByRole('button', { name: 'Make FFmpeg command' }).first().click();
  await expect(page.locator('.command-output code').first()).toContainText("ffmpeg -i 'voice raw.wav'");

  await page.getByLabel('Time').fill('1:24');
  await page.getByLabel('What should be checked?').fill('Tail after the second sentence');
  await page.getByRole('button', { name: 'Add review label' }).click();
  await expect(page.getByRole('button', { name: 'Jump to 1:24' })).toBeVisible();

  await page.reload();
  await expect(page.getByText('1 of 3 complete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump to 1:24' })).toBeVisible();
});

test('creates and edits a portable card', async ({ page }) => {
  await page.getByRole('link', { name: 'Build a chain' }).click();
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

test('has no serious accessibility violations on the workbench', async ({ page }) => {
  const homeResults = await new AxeBuilder({ page }).analyze();
  expect(homeResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.getByRole('link', { name: /Try the 3-step starter/i }).click();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious).toEqual([]);
});

test('loads the saved workbench offline', async ({ page, context }) => {
  await page.getByRole('link', { name: /Try the 3-step starter/i }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/assets/app.js')))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Roomy voice');
  await expect(page.getByText(/You’re offline/)).toBeVisible();
});

test('fits a 390px-class screen without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: /Try the 3-step starter/i }).click();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
});
