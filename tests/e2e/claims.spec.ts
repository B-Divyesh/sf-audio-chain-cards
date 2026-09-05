import { expect, test, type Page } from '@playwright/test';

function wavBuffer(seconds = 2): Buffer {
  const sampleRate = 8_000;
  const dataSize = sampleRate * seconds * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function attachAudio(page: Page): Promise<void> {
  await page.locator('#audio-file').setInputFiles({
    name: 'sample-voice.wav',
    mimeType: 'audio/wav',
    buffer: wavBuffer()
  });
  await expect(page.locator('#audio-player')).toHaveAttribute('src', /^blob:/);
}

async function waitForWorkerControl(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active)),
    { timeout: 10_000 }
  ).toBe(true);
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 10_000 }).toBe(true);
}

async function readRealCards(page: Page): Promise<unknown> {
  return page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open('chain-cards-local', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('cards').objectStore('cards').getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { resolve(request.result); db.close(); };
    };
  }));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/demo', { waitUntil: 'networkidle' });
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
});

test('@claim:demo-isolation keeps sample changes out of real cards', async ({ page }) => {
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/cards$/);
  const before = await readRealCards(page);

  await page.getByRole('link', { name: 'Demo' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).first().click();
  await page.getByLabel('Time').fill('2:05');
  await page.getByLabel('What should be checked?').fill('End of the demo sentence');
  await page.getByRole('button', { name: 'Add review label' }).click();
  await expect(page.getByRole('button', { name: 'Jump to 2:05' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('1 of 3 complete')).toBeVisible();
  await expect(page.locator('.label-list li')).toHaveCount(3);
  await page.getByRole('link', { name: 'Start for real' }).click();

  expect(await readRealCards(page)).toEqual(before);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith('demo:')))).toEqual([]);
});

test('@claim:card-workflow creates, reorders, completes, duplicates, and deletes a card', async ({ page }) => {
  await page.getByRole('link', { name: 'Edit card' }).click();
  await page.getByRole('button', { name: 'Move step 2 up' }).click();
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.locator('.chain-step h2').first()).toHaveText('Cut low rumble');

  await page.getByRole('link', { name: 'New card' }).click();
  await page.getByLabel('Card title').fill('Claim test card');
  await page.getByLabel('Goal').fill('Check that one repeatable step remains clear.');
  await page.getByLabel('Step name').fill('Listen once');
  await page.getByLabel('Action', { exact: true }).fill('Play the copied file once.');
  await page.getByLabel('What should the listener check?').fill('Speech stays natural.');
  await page.getByRole('button', { name: 'Save card' }).click();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByText('1 of 1 complete')).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate card' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Claim test card — copy');
  await page.getByRole('button', { name: 'Delete card' }).click();
  await page.locator('dialog').getByRole('button', { name: 'Delete card' }).click();
  await expect(page.getByRole('link', { name: /Claim test card/i })).toHaveCount(1);
});

test('@claim:local-audio plays selected audio without uploading or saving it', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await attachAudio(page);
  await expect(page.getByText('sample-voice.wav')).toBeVisible();
  await page.locator('#audio-player').evaluate(async (audio: HTMLAudioElement) => {
    audio.muted = true;
    await audio.play();
  });
  await expect.poll(() => page.locator('#audio-player').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  expect(await page.evaluate(() => sessionStorage.getItem('demo:chain-cards'))).not.toContain('sample-voice.wav');
  await page.reload();
  await expect(page.getByText('Choose an audio file')).toBeVisible();
  await expect(page.locator('#audio-player-wrap')).toBeHidden();
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:timestamp-jump opens the labeled moment in selected audio', async ({ page }) => {
  await attachAudio(page);
  await page.getByLabel('Time').fill('0:01');
  await page.getByLabel('What should be checked?').fill('Start of the second second');
  await page.getByRole('button', { name: 'Add review label' }).click();
  await page.getByRole('button', { name: 'Jump to 0:01' }).click();
  await expect.poll(() => page.locator('#audio-player').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThanOrEqual(0.9);
  await expect(page.locator('#audio-player')).toBeFocused();
});

test('@claim:safe-command requires a new output path and only shows command text', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.getByLabel('Input path').fill("sam's; take.wav");
  await page.getByLabel('New output path').fill("sam's; take.wav");
  await page.getByRole('button', { name: 'Create FFmpeg command' }).first().click();
  await expect(page.getByRole('status')).toContainText('different output path');
  await expect(page.locator('.command-output:visible')).toHaveCount(0);

  await page.getByLabel('New output path').fill('clean take.wav');
  await page.getByRole('button', { name: 'Create FFmpeg command' }).first().click();
  await expect(page.locator('.command-output code').first()).toContainText("ffmpeg -i 'sam'\\''s; take.wav'");
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:json-roundtrip exports and imports a validated versioned card', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(exported.format).toBe('chain-cards');
  expect(exported.version).toBe(1);
  expect(exported.card.steps).toHaveLength(3);

  await page.goto('/demo/cards');
  await page.locator('#import-file').setInputFiles({ name: 'export.chain-card.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roomy voice: repair & review');
  await page.goto('/demo/cards');
  const count = await page.locator('.card-preview').count();
  exported.card.labels = [{}];
  await page.locator('#import-file').setInputFiles({ name: 'bad.chain-card.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await expect(page.getByRole('status')).toContainText('card.labels[0].id');
  await expect(page.locator('.card-preview')).toHaveCount(count);
});

test('@claim:persistence keeps real card changes after reload and tab close', async ({ page, context }) => {
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.getByRole('link', { name: /Roomy voice: repair & review/i }).click();
  await page.getByRole('button', { name: 'Mark complete' }).first().click();
  await expect(page.getByText('1 of 3 complete')).toBeVisible();
  const cardUrl = page.url();
  await page.reload();
  await expect(page.getByText('1 of 3 complete')).toBeVisible();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(cardUrl);
  await expect(reopened.getByText('1 of 3 complete')).toBeVisible();
});

test('@claim:offline-reload keeps the demo and a saved real card available offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForWorkerControl(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roomy voice: repair & review');
    await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
    await expect(page.getByText(/You are offline/)).toBeVisible();

    await context.setOffline(false);
    await page.getByRole('link', { name: 'Start for real' }).click();
    await page.getByRole('link', { name: /Roomy voice: repair & review/i }).click();
    await page.getByRole('button', { name: 'Mark complete' }).first().click();
    await expect(page.getByText('1 of 3 complete')).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roomy voice: repair & review');
    await expect(page.getByText('1 of 3 complete')).toBeVisible();
    await expect(page.getByText(/You are offline/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('@claim:private-runtime uses no accounts, trackers, or third-party runtime requests', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  try {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Mark complete' }).first().click();
    await attachAudio(page);
    await page.getByRole('button', { name: 'Reset demo' }).click();
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
    expect(await context.cookies()).toEqual([]);
    await expect(page.locator('input[type="password"], [href*="login"], script[src^="http"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('@claim:free-mit provides the complete tool without payment under the MIT license', async ({ page }) => {
  await page.getByRole('link', { name: 'Terms' }).click();
  await expect(page.getByText('Chain Cards is free to use and released under the MIT License.')).toBeVisible();
  const license = await page.evaluate(async () => (await fetch('/LICENSE.txt')).text());
  expect(license).toContain('MIT License');
  expect(license).toContain('Permission is hereby granted, free of charge');
  await expect(page.locator('[href*="checkout"], [href*="billing"]')).toHaveCount(0);
});

test('@claim:recipe-only leaves processing to the user and makes no repair guarantee', async ({ page }) => {
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await attachAudio(page);
  const source = await page.locator('#audio-player').getAttribute('src');
  await page.getByLabel('Input path').fill('source.wav');
  await page.getByLabel('New output path').fill('copy.wav');
  await page.getByRole('button', { name: 'Create FFmpeg command' }).first().click();
  await expect(page.locator('.command-output code').first()).toContainText('ffmpeg -i');
  await expect(page.locator('#audio-player')).toHaveAttribute('src', source!);
  expect(downloads).toEqual([]);
  await page.getByRole('link', { name: 'Terms' }).click();
  await expect(page.getByText('It does not run commands or process audio.')).toBeVisible();
  await expect(page.getByText('No card or setting guarantees that a recording will improve.')).toBeVisible();
});
