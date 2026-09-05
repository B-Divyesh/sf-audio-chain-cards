import './style.css';
import { activeCardDb, demoCardDb, isDemoPath, realCardDb } from './db';
import {
  blankCard,
  demoCard,
  duplicateCard,
  fileSlug,
  formatTime,
  makeFfmpegCommand,
  parseTime,
  starterCard,
  uid,
  validatePortableCard
} from './model';
import type { ChainCard, ChainStep, PortableCard, ToolKind, Verdict } from './types';
import heroNightMarket768 from './assets/hero-night-market-768.webp';
import heroNightMarket1280 from './assets/hero-night-market-1280.webp';
import heroNightMarketJpg from './assets/hero-night-market.jpg';

const PRODUCT_ORIGIN = 'https://audio-chain-cards.sociobot.in';
const BUILD_LABEL = '1.1.0';
const DEMO_SEED_KEY = 'demo:chain-cards-seeded';
const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('App mount was not found.');
const app: HTMLDivElement = mount;

let audioUrl: string | null = null;
let toastTimer = 0;
let hasRenderedRoute = false;

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const tools: ToolKind[] = ['Audacity / editor', 'FFmpeg', 'Other'];

function setMeta(title: string, description: string, path: string): void {
  document.title = title;
  const values: Record<string, string> = {
    'meta[name="description"]': description,
    'meta[property="og:title"]': title,
    'meta[property="og:description"]': description,
    'meta[property="og:url"]': `${PRODUCT_ORIGIN}${path}`,
    'meta[name="twitter:title"]': title,
    'meta[name="twitter:description"]': description
  };
  for (const [selector, value] of Object.entries(values)) {
    document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value);
  }
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `${PRODUCT_ORIGIN}${path}`);
}

function announce(message: string, kind: 'info' | 'error' = 'info'): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4200);
}

function pathFor(place: 'cards' | 'new' | 'card' | 'edit', id?: string, demo = isDemoPath()): string {
  const base = demo ? '/demo' : '/cards';
  if (place === 'cards') return demo ? '/demo/cards' : '/cards';
  if (place === 'new') return `${base}/new`;
  if (place === 'card') return `${base}/card/${encodeURIComponent(id ?? '')}`;
  return `${base}/card/${encodeURIComponent(id ?? '')}/edit`;
}

async function discardDemo(): Promise<void> {
  await demoCardDb.clear?.();
  sessionStorage.removeItem(DEMO_SEED_KEY);
}

async function navigate(path: string, options: { replace?: boolean; focus?: boolean } = {}): Promise<void> {
  if (isDemoPath() && !isDemoPath(path)) await discardDemo();
  if (options.replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  await route(options.focus ?? true);
}

type RouteKey = 'home' | 'cards' | 'new' | 'card' | 'demo';

function header(current: RouteKey): string {
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="Chain Cards home">
      <svg aria-hidden="true" viewBox="0 0 46 30"><rect x="1" y="2" width="19" height="14" rx="4"/><rect x="26" y="14" width="19" height="14" rx="4"/><path d="M20 9h4c6 0 2 12 8 12h-6"/></svg>
      <span>Chain Cards</span>
    </a>
    <nav aria-label="Primary navigation">
      <a href="/" ${current === 'home' ? 'aria-current="page"' : ''}>Home</a>
      <a href="/demo" ${current === 'demo' ? 'aria-current="page"' : ''}>Demo</a>
      <a class="nav-new" href="${isDemoPath() ? '/demo/new' : '/cards/new'}" ${current === 'new' ? 'aria-current="page"' : ''}>New card</a>
      <a href="/privacy/">Privacy</a>
    </nav>
    <span class="network-state" id="network-state"><span aria-hidden="true"></span>${navigator.onLine ? 'Online' : 'Offline ready'}</span>
  </header>`;
}

function footer(): string {
  return `<footer class="site-footer">
    <div><strong>Chain Cards</strong><span>Record and share audio repair steps.</span></div>
    <nav aria-label="Legal and project links"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-audio-chain-cards">Source (external)</a></nav>
    <small>Version ${BUILD_LABEL} · Built by Param Factory · Original generated artwork contains no people or brands.</small>
  </footer>`;
}

function shell(content: string, current: RouteKey): void {
  app.innerHTML = `${header(current)}
    <div class="offline-banner" id="offline-banner" ${navigator.onLine ? 'hidden' : ''}>You are offline. Saved cards and this workbench are available.</div>
    ${isDemoPath() ? `<aside class="demo-banner" aria-label="Demo status"><strong>Demo — sample data, nothing is saved</strong><span>Changes stay separate from your cards.</span><div><button type="button" id="reset-demo">Reset demo</button><a href="/cards" id="start-real">Start for real</a></div></aside>` : ''}
    ${content}
    ${footer()}
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    <div class="update-toast" id="update-toast" hidden><span>An update is ready.</span><button type="button" id="reload-app">Update now</button></div>`;
  document.querySelector<HTMLElement>('#main')?.setAttribute('tabindex', '-1');
  updateNetworkState();
  document.querySelector('#reset-demo')?.addEventListener('click', async () => {
    await discardDemo();
    await ensureDemo();
    await navigate('/demo', { replace: true });
    announce('The sample data was reset.');
  });
}

function updateNetworkState(): void {
  const state = document.querySelector<HTMLElement>('#network-state');
  const banner = document.querySelector<HTMLElement>('#offline-banner');
  if (state) state.innerHTML = `<span aria-hidden="true"></span>${navigator.onLine ? 'Online' : 'Offline ready'}`;
  if (banner) banner.hidden = navigator.onLine;
}

async function ensureRealStarter(): Promise<void> {
  if (!localStorage.getItem('chain-cards-seeded')) {
    await realCardDb.put(starterCard());
    localStorage.setItem('chain-cards-seeded', '1');
  }
}

async function ensureDemo(): Promise<void> {
  if (!sessionStorage.getItem(DEMO_SEED_KEY)) {
    await demoCardDb.clear?.();
    await demoCardDb.put(demoCard());
    sessionStorage.setItem(DEMO_SEED_KEY, '1');
  }
}

function cardPreview(card: ChainCard, demo: boolean): string {
  const done = card.steps.filter((step) => step.complete).length;
  return `<article class="card-preview">
    <a href="${pathFor('card', card.id, demo)}">
      <div class="card-ticket"><span>${card.steps.length} steps</span><span>${card.labels.length} labels</span></div>
      <h3>${escapeHtml(card.title || 'Untitled card')}</h3>
      <p>${escapeHtml(card.goal || 'No goal added yet.')}</p>
      <div class="mini-chain" aria-label="${done} of ${card.steps.length} steps completed">
        ${card.steps.map((step) => `<span class="${step.complete ? 'done' : ''}" title="${escapeHtml(step.title)}"></span>`).join('') || '<em>No steps</em>'}
      </div>
      <span class="open-label">Open card <span aria-hidden="true">→</span></span>
    </a>
  </article>`;
}

async function renderHome(demo = false): Promise<void> {
  const cards = (await activeCardDb().all()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  shell(`<main id="main" class="home-main">
    <section class="hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow">Audio sequence cards</p>
        <h1 id="home-title">Build and share an audio repair sequence</h1>
        <p class="lede">For beginning audio creators who need repeatable steps and review points without a full DAW template.</p>
        <div class="hero-actions">
          <a class="button primary" href="/demo">Try it with sample data</a>
          <a class="button secondary" href="${pathFor('new', undefined, demo)}">Build your own card</a>
        </div>
        <p class="action-note">The demo opens a three-step voice repair card with review points.</p>
        <ul class="plain-facts" aria-label="Product facts">
          <li>Free to use.</li>
          <li>Works offline after your first visit.</li>
          <li>Cards stay in your browser. No audio upload.</li>
        </ul>
      </div>
      <picture class="hero-art">
        <source type="image/webp" srcset="${heroNightMarket768} 768w, ${heroNightMarket1280} 1280w" sizes="(max-width: 800px) 100vw, 52vw" />
        <img src="${heroNightMarketJpg}" width="1280" height="853" alt="Three audio modules connected to headphones show the order of a repair sequence." fetchpriority="high" decoding="async" />
      </picture>
    </section>
    <section class="card-shelf" aria-labelledby="cards-title">
      <div class="section-heading">
        <div><p class="kicker">Saved in this browser</p><h2 id="cards-title">Your audio repair cards</h2></div>
        <div class="shelf-actions">
          <button class="button quiet" id="import-button" type="button">Import JSON</button>
          <input id="import-file" class="visually-hidden" type="file" accept="application/json,.json" aria-label="Import Chain Cards JSON" />
          <a class="button primary compact" href="${pathFor('new', undefined, demo)}">Create a card</a>
        </div>
      </div>
      <div class="card-grid">
        ${cards.length ? cards.map((card) => cardPreview(card, demo)).join('') : `<div class="empty-state"><div class="empty-chain" aria-hidden="true"><i></i><i></i><i></i></div><h3>No cards are saved</h3><p>Create a card or load the sample to see a complete sequence.</p><div><a class="button primary" href="${pathFor('new', undefined, demo)}">Create a card</a>${demo ? '<button class="button secondary" id="restore-starter" type="button">Reset demo</button>' : '<button class="button secondary" id="restore-starter" type="button">Restore starter card</button>'}</div></div>`}
      </div>
    </section>
    <section class="how-it-works" aria-labelledby="how-title">
      <p class="kicker">How it works</p><h2 id="how-title">Repeat the same repair steps</h2>
      <ol><li><span>01</span><h3>Write each action</h3><p>Record the tool, setting, and listening check.</p></li><li><span>02</span><h3>Review exact moments</h3><p>Add timestamp labels and open those moments in local audio.</p></li><li><span>03</span><h3>Share the card</h3><p>Export or import one checked JSON file.</p></li></ol>
    </section>
    <section class="limits" aria-labelledby="limits-title">
      <p class="kicker">Limits and privacy</p><h2 id="limits-title">You control the audio processing</h2>
      <p>Chain Cards records instructions and creates command text. It does not run effects or promise a better recording.</p>
      <p>Keep the original audio. Use a different output path and listen after every step.</p>
    </section>
  </main>`, demo ? 'demo' : (location.pathname === '/cards' ? 'cards' : 'home'));

  document.querySelector('#import-button')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#import-file')?.click());
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', importCard);
  document.querySelectorAll('#restore-starter').forEach((button) => button.addEventListener('click', async () => {
    if (demo) {
      await discardDemo();
      await ensureDemo();
      await navigate('/demo', { replace: true });
    } else {
      await realCardDb.put(starterCard());
      announce('The starter card was restored.');
      await renderHome();
    }
  }));
}

async function importCard(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error('That file is over 1 MB. Choose a smaller Chain Cards JSON file.');
    const parsed: unknown = JSON.parse(await file.text());
    const validation = validatePortableCard(parsed);
    if (!validation.valid) throw new Error(validation.error);
    const imported = structuredClone(validation.card.card);
    if (await activeCardDb().get(imported.id)) imported.id = uid();
    imported.updatedAt = new Date().toISOString();
    imported.history = [...(imported.history ?? []), { at: imported.updatedAt, note: 'Imported from JSON' }];
    await activeCardDb().put(imported);
    await navigate(pathFor('card', imported.id));
    announce('The JSON card was imported.');
  } catch (error) {
    announce(error instanceof Error ? error.message : 'The card could not be imported. Check the file and try again.', 'error');
  } finally {
    input.value = '';
  }
}

function stepMarkup(step: ChainStep, index: number): string {
  return `<li class="chain-step ${step.complete ? 'is-complete' : ''}" data-step-id="${escapeHtml(step.id)}">
    <div class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
    <div class="step-module">
      <div class="step-head"><div><span class="tool-badge">${escapeHtml(step.tool)}</span><h2>${escapeHtml(step.title)}</h2></div><button class="complete-step" type="button" aria-pressed="${step.complete}" data-complete="${escapeHtml(step.id)}">${step.complete ? 'Completed' : 'Mark complete'}</button></div>
      <div class="step-copy"><div><h3>Action</h3><p>${escapeHtml(step.action)}</p></div><div><h3>Setting or note</h3><p>${escapeHtml(step.settings || 'No setting recorded.')}</p></div></div>
      <div class="checkpoint"><span aria-hidden="true">◆</span><div><strong>Listening check</strong><p>${escapeHtml(step.listenFor)}</p></div></div>
      <div class="step-actions"><button type="button" class="text-button" data-copy-instructions="${escapeHtml(step.id)}">Copy instructions</button>${step.ffmpegFilter ? `<button type="button" class="text-button command-button" data-command="${escapeHtml(step.id)}">Create FFmpeg command</button>` : ''}</div>
      ${step.ffmpegFilter ? `<div class="command-output" id="command-${escapeHtml(step.id)}" hidden><code></code><button type="button" data-copy-command="${escapeHtml(step.id)}">Copy command</button></div>` : ''}
    </div>
  </li>`;
}

function labelsMarkup(card: ChainCard): string {
  const labels = [...card.labels].sort((a, b) => a.seconds - b.seconds);
  if (!labels.length) return '<div class="label-empty"><span aria-hidden="true">◇</span><p>No review labels yet. Type a time and add the first moment to check.</p></div>';
  return `<ul class="label-list">${labels.map((label) => `<li><button type="button" data-seek="${label.seconds}" aria-label="Jump to ${formatTime(label.seconds)}"><span class="label-time">${formatTime(label.seconds)}</span><span><strong>${escapeHtml(label.note)}</strong><small>${escapeHtml(label.verdict)}</small></span><span aria-hidden="true">▶</span></button><button class="remove-label" type="button" data-remove-label="${escapeHtml(label.id)}" aria-label="Remove label at ${formatTime(label.seconds)}">×</button></li>`).join('')}</ul>`;
}

async function renderCard(id: string, demo = isDemoPath()): Promise<void> {
  const card = await activeCardDb().get(id);
  if (!card) {
    shell(`<main id="main" class="not-found"><p class="eyebrow">Card not found</p><h1>This card is not in this browser</h1><p>It may have been deleted or saved on another device.</p><a class="button primary" href="${pathFor('cards', undefined, demo)}">Open my cards</a></main>`, demo ? 'demo' : 'card');
    setMeta('Card not found — Chain Cards', 'Return to your saved audio repair cards.', location.pathname);
    return;
  }
  const completed = card.steps.filter((step) => step.complete).length;
  shell(`<main id="main" class="workbench">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${pathFor('cards', undefined, demo)}">${demo ? 'Demo cards' : 'My cards'}</a><span aria-hidden="true">/</span><span>Repair sequence</span></nav>
    <section class="workbench-head">
      <div><p class="eyebrow">Audio repair sequence</p><h1>${escapeHtml(card.title)}</h1><p>${escapeHtml(card.goal)}</p></div>
      <div class="head-actions"><a class="button quiet" href="${pathFor('edit', card.id, demo)}">Edit card</a><button class="button quiet" id="duplicate-card" type="button">Duplicate card</button><button class="button primary compact" id="share-card" type="button">Export JSON</button><button class="more-button" id="delete-open" type="button">Delete card</button></div>
    </section>
    <div class="safety-note"><span aria-hidden="true">!</span><p><strong>Protect the source.</strong> ${escapeHtml(card.safetyNote)}</p></div>
    <section class="workbench-grid">
      <div class="chain-column">
        <div class="progress-head"><div><p class="kicker">Ordered steps</p><h2 class="visually-hidden">Effect steps</h2></div><p id="progress-label"><strong>${completed}</strong> of ${card.steps.length} complete</p></div>
        ${card.steps.length ? `<ol class="chain-list">${card.steps.map(stepMarkup).join('')}</ol>` : `<div class="empty-state small"><h2>No steps in this card</h2><p>Add an action before you start processing.</p><a class="button primary" href="${pathFor('edit', card.id, demo)}">Add a step</a></div>`}
      </div>
      <section class="review-rail" aria-label="Audio review tools">
        <section class="rail-panel audition-panel"><p class="kicker">Local audio</p><h2>Open audio in this tab</h2><p>The selected file is not uploaded or stored in the card.</p>
          <label class="file-drop" for="audio-file"><span aria-hidden="true">♪</span><strong id="audio-file-label">Choose an audio file</strong><small>Use a format your browser can play.</small></label>
          <input class="visually-hidden" id="audio-file" type="file" accept="audio/*" />
          <div id="audio-player-wrap" hidden><audio id="audio-player" controls preload="metadata"></audio><button class="text-button" type="button" id="remove-audio">Detach local audio</button></div>
        </section>
        <section class="rail-panel path-panel"><p class="kicker">Command text</p><h2>Use separate file paths</h2><p>These paths only create text for you to inspect and copy.</p>
          <label for="input-path">Input path</label><input id="input-path" autocomplete="off" placeholder="recording.wav" />
          <label for="output-path">New output path</label><input id="output-path" autocomplete="off" placeholder="recording-cleaned.wav" />
          <small>Input and output must be different.</small>
        </section>
        <section class="rail-panel labels-panel"><p class="kicker">Review points</p><h2>Timestamp labels</h2>
          <form id="label-form"><div class="time-row"><label for="label-time">Time</label><button class="text-button" type="button" id="use-playhead">Use playhead</button></div><input id="label-time" inputmode="numeric" placeholder="1:24" aria-describedby="time-help" required /><small id="time-help">Use M:SS or H:MM:SS.</small><label for="label-note">What should be checked?</label><input id="label-note" maxlength="100" placeholder="Tail after “room”" required /><label for="label-verdict">Verdict</label><select id="label-verdict"><option>Review</option><option>Better</option><option>Same</option><option>Worse</option></select><button class="button amber full" type="submit">Add review label</button></form>
          <div id="labels-list">${labelsMarkup(card)}</div>
        </section>
      </section>
    </section>
    <dialog id="delete-dialog" aria-labelledby="delete-title"><form method="dialog"><p class="kicker">Delete local card</p><h2 id="delete-title">Delete “${escapeHtml(card.title)}”?</h2><p>This removes this card and its review state. Export it first if you need a copy.</p><div><button class="button quiet" value="cancel">Keep card</button><button class="button danger" value="delete">Delete card</button></div></form></dialog>
  </main>`, demo ? 'demo' : 'card');
  setMeta(`${card.title} — Chain Cards`, 'Follow ordered audio repair steps and review exact moments.', location.pathname);
  bindCard(card, demo);
}

function copyText(value: string, success: string): void {
  navigator.clipboard.writeText(value).then(() => announce(success)).catch(() => announce('Clipboard access was blocked. Select the visible text and copy it.', 'error'));
}

function bindCard(card: ChainCard, demo: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach((button) => button.addEventListener('click', async () => {
    const step = card.steps.find((item) => item.id === button.dataset.complete);
    if (!step) return;
    step.complete = !step.complete;
    card.updatedAt = new Date().toISOString();
    card.history.push({ at: card.updatedAt, note: `${step.complete ? 'Completed' : 'Reopened'}: ${step.title}` });
    await activeCardDb().put(card);
    button.setAttribute('aria-pressed', String(step.complete));
    button.textContent = step.complete ? 'Completed' : 'Mark complete';
    button.closest('.chain-step')?.classList.toggle('is-complete', step.complete);
    const completed = card.steps.filter((item) => item.complete).length;
    const progress = document.querySelector('#progress-label');
    if (progress) progress.innerHTML = `<strong>${completed}</strong> of ${card.steps.length} complete`;
    announce(step.complete ? 'Step marked complete.' : 'Step reopened.');
  }));

  document.querySelectorAll<HTMLButtonElement>('[data-copy-instructions]').forEach((button) => button.addEventListener('click', () => {
    const step = card.steps.find((item) => item.id === button.dataset.copyInstructions);
    if (step) copyText(`${step.title}\nTool: ${step.tool}\nAction: ${step.action}\nSettings: ${step.settings}\nListen for: ${step.listenFor}`, 'Step instructions copied.');
  }));

  document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => button.addEventListener('click', () => {
    const step = card.steps.find((item) => item.id === button.dataset.command);
    const input = document.querySelector<HTMLInputElement>('#input-path')?.value ?? '';
    const output = document.querySelector<HTMLInputElement>('#output-path')?.value ?? '';
    try {
      if (!step) throw new Error('That step is no longer available. Reload the card.');
      const command = makeFfmpegCommand(input, output, step);
      const panel = document.querySelector<HTMLElement>(`#command-${CSS.escape(step.id)}`);
      const code = panel?.querySelector('code');
      if (panel && code) { code.textContent = command; panel.hidden = false; }
      announce('Command text created. Inspect it before using it.');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The command could not be created. Check both paths.', 'error');
    }
  }));

  document.querySelectorAll<HTMLButtonElement>('[data-copy-command]').forEach((button) => button.addEventListener('click', () => {
    const code = document.querySelector(`#command-${CSS.escape(button.dataset.copyCommand ?? '')} code`)?.textContent;
    if (code) copyText(code, 'FFmpeg command copied.');
  }));

  const audioInput = document.querySelector<HTMLInputElement>('#audio-file');
  const audio = document.querySelector<HTMLAudioElement>('#audio-player');
  const playerWrap = document.querySelector<HTMLElement>('#audio-player-wrap');
  audioInput?.addEventListener('change', () => {
    const file = audioInput.files?.[0];
    if (!file || !audio || !playerWrap) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(file);
    audio.src = audioUrl;
    playerWrap.hidden = false;
    const label = document.querySelector('#audio-file-label');
    if (label) label.textContent = file.name;
    announce('Audio attached in this tab.');
  });
  document.querySelector('#remove-audio')?.addEventListener('click', () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
    if (audio) { audio.removeAttribute('src'); audio.load(); }
    if (audioInput) audioInput.value = '';
    if (playerWrap) playerWrap.hidden = true;
    const label = document.querySelector('#audio-file-label');
    if (label) label.textContent = 'Choose an audio file';
    announce('Audio detached. The card did not change.');
  });
  document.querySelector('#use-playhead')?.addEventListener('click', () => {
    const time = document.querySelector<HTMLInputElement>('#label-time');
    if (!audio?.src || !time) return announce('Choose an audio file first, or type a timestamp.', 'error');
    time.value = formatTime(audio.currentTime);
    time.focus();
  });

  const refreshLabels = () => {
    const region = document.querySelector('#labels-list');
    if (region) region.innerHTML = labelsMarkup(card);
    bindLabelActions(card, refreshLabels, audio);
  };
  document.querySelector<HTMLFormElement>('#label-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const timeInput = document.querySelector<HTMLInputElement>('#label-time');
    const noteInput = document.querySelector<HTMLInputElement>('#label-note');
    const verdictInput = document.querySelector<HTMLSelectElement>('#label-verdict');
    const seconds = parseTime(timeInput?.value ?? '');
    if (seconds === null) {
      timeInput?.setAttribute('aria-invalid', 'true');
      return announce('Enter a valid M:SS or H:MM:SS time. Minutes and seconds must be 00–59.', 'error');
    }
    const note = noteInput?.value.trim() ?? '';
    if (!note) return announce('Add a short note about what to check.', 'error');
    const now = new Date().toISOString();
    card.labels.push({ id: uid(), seconds, note, verdict: (verdictInput?.value ?? 'Review') as Verdict, createdAt: now });
    card.updatedAt = now;
    card.history.push({ at: now, note: `Added label at ${formatTime(seconds)}` });
    await activeCardDb().put(card);
    if (timeInput) timeInput.value = '';
    if (noteInput) noteInput.value = '';
    refreshLabels();
    announce(`Label added at ${formatTime(seconds)}.`);
  });
  document.querySelector<HTMLInputElement>('#label-time')?.addEventListener('input', (event) => {
    (event.currentTarget as HTMLInputElement).removeAttribute('aria-invalid');
  });
  bindLabelActions(card, refreshLabels, audio);

  document.querySelector('#duplicate-card')?.addEventListener('click', async () => {
    const copy = duplicateCard(card);
    await activeCardDb().put(copy);
    await navigate(pathFor('card', copy.id, demo));
  });
  document.querySelector('#share-card')?.addEventListener('click', () => shareCard(card));
  const dialog = document.querySelector<HTMLDialogElement>('#delete-dialog');
  document.querySelector('#delete-open')?.addEventListener('click', () => dialog?.showModal());
  dialog?.addEventListener('close', async () => {
    if (dialog.returnValue === 'delete') {
      await activeCardDb().delete(card.id);
      await navigate(pathFor('cards', undefined, demo));
    }
  });
}

function bindLabelActions(card: ChainCard, refresh: () => void, audio: HTMLAudioElement | null): void {
  document.querySelectorAll<HTMLButtonElement>('[data-seek]').forEach((button) => button.addEventListener('click', () => {
    if (!audio?.src) return announce('Choose the matching audio file before opening this review point.', 'error');
    audio.currentTime = Number(button.dataset.seek);
    audio.play().catch(() => undefined);
    audio.focus();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-remove-label]').forEach((button) => button.addEventListener('click', async () => {
    const label = card.labels.find((item) => item.id === button.dataset.removeLabel);
    if (!label || !confirm(`Remove the review label at ${formatTime(label.seconds)}?`)) return;
    card.labels = card.labels.filter((item) => item.id !== button.dataset.removeLabel);
    card.updatedAt = new Date().toISOString();
    await activeCardDb().put(card);
    refresh();
    announce('Review label removed.');
  }));
}

function portable(card: ChainCard): PortableCard {
  return { format: 'chain-cards', version: 1, exportedAt: new Date().toISOString(), card };
}

function downloadCard(card: ChainCard): void {
  const blob = new Blob([JSON.stringify(portable(card), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileSlug(card.title)}.chain-card.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url));
  announce('JSON card exported.');
}

async function shareCard(card: ChainCard): Promise<void> {
  const file = new File([JSON.stringify(portable(card), null, 2)], `${fileSlug(card.title)}.chain-card.json`, { type: 'application/json' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: card.title, text: 'An audio repair sequence from Chain Cards', files: [file] });
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') downloadCard(card);
    }
  } else downloadCard(card);
}

function editorStep(step: ChainStep, index: number): string {
  return `<fieldset class="editor-step" data-editor-id="${escapeHtml(step.id)}"><legend>Step ${index + 1}</legend><div class="editor-step-actions"><button type="button" class="icon-button step-up" aria-label="Move step ${index + 1} up">↑</button><button type="button" class="icon-button step-down" aria-label="Move step ${index + 1} down">↓</button><button type="button" class="text-button coral remove-step">Remove</button></div>
    <label>Step name<input name="step-title" value="${escapeHtml(step.title)}" required maxlength="80" /></label>
    <label>Tool<select name="step-tool">${tools.map((tool) => `<option ${step.tool === tool ? 'selected' : ''}>${tool}</option>`).join('')}</select></label>
    <label>Action<textarea name="step-action" required rows="3" maxlength="500">${escapeHtml(step.action)}</textarea></label>
    <label>Setting or note<textarea name="step-settings" rows="2" maxlength="300">${escapeHtml(step.settings)}</textarea></label>
    <label>What should the listener check?<textarea name="step-listen" required rows="2" maxlength="300">${escapeHtml(step.listenFor)}</textarea></label>
    <label>FFmpeg audio filter <span>(optional; only add syntax you trust)</span><input name="step-filter" value="${escapeHtml(step.ffmpegFilter ?? '')}" placeholder="highpass=f=80" /></label>
  </fieldset>`;
}

async function renderEditor(id?: string, demo = isDemoPath()): Promise<void> {
  const card = id ? await activeCardDb().get(id) : blankCard();
  if (!card) return renderCard(id ?? '', demo);
  shell(`<main id="main" class="editor-main">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${pathFor('cards', undefined, demo)}">${demo ? 'Demo cards' : 'My cards'}</a><span aria-hidden="true">/</span><span>${id ? 'Edit card' : 'New card'}</span></nav>
    <div class="editor-heading"><div><p class="eyebrow">Card editor</p><h1>${id ? 'Edit this audio repair sequence' : 'Create an audio repair sequence'}</h1><p>Write one action and one listening check for each step.</p></div></div>
    <form id="card-form" class="card-form">
      <section class="form-section"><div class="form-section-label"><span>01</span><div><h2>Name the task</h2><p>Describe the recording problem this card covers.</p></div></div><div class="form-fields"><label for="card-title">Card title<input id="card-title" name="title" value="${escapeHtml(card.title)}" required maxlength="80" /></label><label for="card-goal">Goal<textarea id="card-goal" name="goal" required rows="3" maxlength="300">${escapeHtml(card.goal)}</textarea></label><label for="safety-note">Source-safety note<textarea id="safety-note" name="safety" required rows="2" maxlength="300">${escapeHtml(card.safetyNote)}</textarea></label></div></section>
      <section class="form-section"><div class="form-section-label"><span>02</span><div><h2>Add the ordered steps</h2><p>Settings are notes, not guarantees. Add a listening check after each action.</p></div></div><div class="form-fields"><div id="editor-steps">${card.steps.map(editorStep).join('')}</div><button class="button secondary full" id="add-step" type="button">Add another step</button></div></section>
      <div class="form-submit"><a class="button quiet" href="${id ? pathFor('card', card.id, demo) : pathFor('cards', undefined, demo)}">Cancel</a><button class="button primary" type="submit">Save card</button></div>
      <div id="form-error" class="form-error" role="alert" tabindex="-1" hidden></div>
    </form>
  </main>`, demo ? 'demo' : (id ? 'card' : 'new'));
  setMeta(`${id ? 'Edit card' : 'New card'} — Chain Cards`, 'Write ordered audio repair steps and listening checks.', location.pathname);
  bindEditor(card, demo);
}

function renumberEditor(): void {
  const fields = document.querySelectorAll<HTMLElement>('.editor-step');
  fields.forEach((field, index) => {
    const legend = field.querySelector('legend');
    if (legend) legend.textContent = `Step ${index + 1}`;
    field.querySelector<HTMLButtonElement>('.step-up')!.disabled = index === 0;
    field.querySelector<HTMLButtonElement>('.step-down')!.disabled = index === fields.length - 1;
    field.querySelector<HTMLButtonElement>('.step-up')!.ariaLabel = `Move step ${index + 1} up`;
    field.querySelector<HTMLButtonElement>('.step-down')!.ariaLabel = `Move step ${index + 1} down`;
  });
}

function bindEditor(card: ChainCard, demo: boolean): void {
  const steps = document.querySelector('#editor-steps');
  const add = () => {
    const step: ChainStep = { id: uid(), title: '', tool: 'Audacity / editor', action: '', settings: '', listenFor: '', complete: false };
    steps?.insertAdjacentHTML('beforeend', editorStep(step, steps.children.length));
    renumberEditor();
    steps?.querySelector<HTMLElement>('.editor-step:last-child input')?.focus();
  };
  document.querySelector('#add-step')?.addEventListener('click', add);
  if (!card.steps.length) add();
  steps?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const field = target.closest<HTMLElement>('.editor-step');
    if (!field) return;
    if (target.closest('.step-up')) field.previousElementSibling?.before(field);
    if (target.closest('.step-down')) field.nextElementSibling?.after(field);
    if (target.closest('.remove-step') && confirm(`Remove ${field.querySelector<HTMLInputElement>('[name="step-title"]')?.value || 'this step'} from the card?`)) field.remove();
    renumberEditor();
  });
  renumberEditor();
  document.querySelector<HTMLFormElement>('#card-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const fields = [...document.querySelectorAll<HTMLElement>('.editor-step')];
    const error = document.querySelector<HTMLElement>('#form-error');
    if (!fields.length) {
      if (error) { error.textContent = 'Add at least one step before saving this card.'; error.hidden = false; error.focus(); }
      return;
    }
    const now = new Date().toISOString();
    card.title = String(data.get('title') ?? '').trim();
    card.goal = String(data.get('goal') ?? '').trim();
    card.safetyNote = String(data.get('safety') ?? '').trim();
    card.steps = fields.map((field) => {
      const value = (name: string) => field.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)?.value.trim() ?? '';
      const existing = card.steps.find((step) => step.id === field.dataset.editorId);
      const filter = value('step-filter');
      return { id: field.dataset.editorId ?? uid(), title: value('step-title'), tool: value('step-tool') as ToolKind, action: value('step-action'), settings: value('step-settings'), listenFor: value('step-listen'), ...(filter ? { ffmpegFilter: filter } : {}), complete: existing?.complete ?? false };
    });
    card.updatedAt = now;
    card.history = [...(card.history ?? []), { at: now, note: 'Card edited' }].slice(-80);
    await activeCardDb().put(card);
    await navigate(pathFor('card', card.id, demo));
  });
}

function renderSite404(): void {
  shell(`<main id="main" class="not-found site-not-found"><p class="eyebrow">Page not found</p><h1>This page does not exist</h1><p>Check the address or return to your saved audio repair cards.</p><a class="button primary" href="/">Return home</a></main>`, 'home');
  setMeta('Page not found — Chain Cards', 'Return to Chain Cards and your saved audio repair cards.', location.pathname);
}

async function route(moveFocus = false): Promise<void> {
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  const path = location.pathname.replace(/\/$/, '') || '/';
  try {
    if (isDemoPath(path)) await ensureDemo();
    else await ensureRealStarter();

    if (path === '/' || path === '/cards') {
      await renderHome(false);
      setMeta(path === '/' ? 'Chain Cards — Build audio repair sequences' : 'My cards — Chain Cards', 'Record, review, and share ordered audio repair steps without uploading a recording.', path);
    } else if (path === '/demo') {
      await renderCard('demo-roomy-voice', true);
      setMeta('Demo — Chain Cards', 'Try a three-step audio repair card with sample review points.', '/demo');
    } else if (path === '/demo/cards') {
      await renderHome(true);
      setMeta('Demo cards — Chain Cards', 'Use sample audio repair cards without changing your saved cards.', '/demo/cards');
    } else if (path === '/cards/new' || path === '/demo/new') {
      await renderEditor(undefined, isDemoPath(path));
    } else {
      const match = path.match(/^\/(cards|demo)\/card\/([^/]+)(\/edit)?$/);
      if (match) {
        const id = decodeURIComponent(match[2]);
        if (match[3]) await renderEditor(id, match[1] === 'demo');
        else await renderCard(id, match[1] === 'demo');
      } else renderSite404();
    }

    const heading = document.querySelector<HTMLElement>('h1');
    const routeStatus = document.querySelector<HTMLElement>('#route-status');
    if (routeStatus && heading) routeStatus.textContent = `${heading.textContent?.trim()} page loaded`;
    if ((moveFocus || hasRenderedRoute) && heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    hasRenderedRoute = true;
  } catch (error) {
    shell(`<main id="main" class="not-found"><p class="eyebrow">Storage error</p><h1>Your cards could not open</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Reload the page and try again.')}</p><button class="button primary" type="button" id="reload-page">Reload Chain Cards</button></main>`, 'cards');
    document.querySelector('#reload-page')?.addEventListener('click', () => location.reload());
  }
}

function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    const offerUpdate = () => {
      const update = document.querySelector<HTMLElement>('#update-toast');
      if (update) update.hidden = false;
    };
    if (registration.waiting) offerUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate();
      });
    });
    document.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).id === 'reload-app') registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !refreshing) { refreshing = true; location.reload(); }
    });
  }).catch(() => announce('Offline installation is unavailable. Reload while online and try again.', 'error'));
}

document.addEventListener('click', (event) => {
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (anchor.classList.contains('skip-link')) {
    event.preventDefault();
    const main = document.querySelector<HTMLElement>('#main');
    main?.focus();
    main?.scrollIntoView();
    return;
  }
  const url = new URL(anchor.href, location.href);
  const spaPath = url.origin === location.origin && (url.pathname === '/' || url.pathname === '/cards' || url.pathname.startsWith('/cards/') || url.pathname === '/demo' || url.pathname.startsWith('/demo/'));
  if (!spaPath) {
    if (isDemoPath() && url.origin === location.origin && !isDemoPath(url.pathname)) {
      sessionStorage.removeItem('demo:chain-cards');
      sessionStorage.removeItem(DEMO_SEED_KEY);
    }
    return;
  }
  event.preventDefault();
  void navigate(`${url.pathname}${url.search}${url.hash}`);
});

window.addEventListener('popstate', () => { void route(true); });
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);

await route();
registerPwa();
