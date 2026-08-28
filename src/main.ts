import './style.css';
import { cardDb } from './db';
import {
  blankCard,
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

const mount = document.querySelector<HTMLDivElement>('#app');
if (!mount) throw new Error('App mount was not found.');
const app: HTMLDivElement = mount;

let audioUrl: string | null = null;
let installPrompt: BeforeInstallPromptEvent | null = null;
let toastTimer = 0;
let hasRenderedRoute = false;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const tools: ToolKind[] = ['Audacity / editor', 'FFmpeg', 'Other'];

function announce(message: string, kind: 'info' | 'error' = 'info'): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4200);
}

function shell(content: string, route: 'cards' | 'new' | 'card' = 'cards'): void {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="#/cards" aria-label="Chain Cards home">
        <svg aria-hidden="true" viewBox="0 0 46 30"><rect x="1" y="2" width="19" height="14" rx="4"/><rect x="26" y="14" width="19" height="14" rx="4"/><path d="M20 9h4c6 0 2 12 8 12h-6"/></svg>
        <span>Chain Cards</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#/cards" ${route === 'cards' ? 'aria-current="page"' : ''}>My cards</a>
        <a class="nav-new" href="#/new" ${route === 'new' ? 'aria-current="page"' : ''}>New card</a>
      </nav>
      <span class="network-state" id="network-state"><span aria-hidden="true"></span>${navigator.onLine ? 'Online' : 'Offline ready'}</span>
    </header>
    <div class="offline-banner" id="offline-banner" ${navigator.onLine ? 'hidden' : ''}>You’re offline. Saved cards and the workbench still work here.</div>
    ${content}
    <footer class="site-footer">
      <div><strong>Chain Cards</strong><span>Local-first audio workflow notes. No audio uploads.</span></div>
      <nav aria-label="Legal and project links"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-audio-chain-cards">Source</a></nav>
      <small>Night-market artwork generated for this product; no brands or people depicted.</small>
    </footer>
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    <div class="update-toast" id="update-toast" hidden><span>A fresh version is ready.</span><button type="button" id="reload-app">Update now</button></div>
  `;
  // The skip link uses this landmark as its fragment target. tabindex=-1
  // permits deliberate focus without creating another normal tab stop.
  document.querySelector<HTMLElement>('#main')?.setAttribute('tabindex', '-1');
  bindNetworkState();
}

function bindNetworkState(): void {
  const update = () => {
    const state = document.querySelector<HTMLElement>('#network-state');
    const banner = document.querySelector<HTMLElement>('#offline-banner');
    if (state) state.innerHTML = `<span aria-hidden="true"></span>${navigator.onLine ? 'Online' : 'Offline ready'}`;
    if (banner) banner.hidden = navigator.onLine;
  };
  window.addEventListener('online', update, { once: true });
  window.addEventListener('offline', update, { once: true });
}

async function ensureStarter(): Promise<void> {
  const seeded = localStorage.getItem('chain-cards-seeded');
  if (!seeded) {
    await cardDb.put(starterCard());
    localStorage.setItem('chain-cards-seeded', '1');
  }
}

function cardPreview(card: ChainCard): string {
  const done = card.steps.filter((step) => step.complete).length;
  return `<article class="card-preview">
    <a href="#/card/${encodeURIComponent(card.id)}">
      <div class="card-ticket"><span>${card.steps.length} steps</span><span>${card.labels.length} labels</span></div>
      <h2>${escapeHtml(card.title || 'Untitled card')}</h2>
      <p>${escapeHtml(card.goal || 'No goal added yet.')}</p>
      <div class="mini-chain" aria-label="${done} of ${card.steps.length} steps completed">
        ${card.steps.map((step) => `<span class="${step.complete ? 'done' : ''}" title="${escapeHtml(step.title)}"></span>`).join('') || '<em>Empty chain</em>'}
      </div>
      <span class="open-label">Open workbench <span aria-hidden="true">→</span></span>
    </a>
  </article>`;
}

async function renderHome(): Promise<void> {
  const cards = (await cardDb.all()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  shell(`<main id="main" class="home-main">
    <section class="hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow"><span aria-hidden="true">◆</span> Repair recipes you can hear and share</p>
        <h1 id="home-title">A clear route through your next audio fix.</h1>
        <p class="lede">Keep the effect order, exact actions, and listening checkpoints together. Attach a recording locally, jump to labeled moments, then pass the card on as JSON.</p>
        <div class="hero-actions">
          <a class="button primary" href="#/new">Build a chain</a>
          ${cards.some((card) => card.id === 'starter-roomy-voice') ? '<a class="button secondary" href="#/card/starter-roomy-voice">Try the 3-step starter</a>' : '<button class="button secondary" type="button" id="restore-starter">Restore starter</button>'}
        </div>
        <p class="trust-line"><span aria-hidden="true">●</span> Your cards stay in this browser. Audio never leaves your device.</p>
      </div>
      <picture class="hero-art">
        <source type="image/webp" srcset="${heroNightMarket768} 768w, ${heroNightMarket1280} 1280w" sizes="(max-width: 800px) 100vw, 52vw" />
        <img src="${heroNightMarketJpg}" width="1280" height="853" alt="Three dark audio modules connected by a cyan cable at a night-market repair bench, ending beside headphones." fetchpriority="high" decoding="async" />
      </picture>
    </section>
    <section class="card-shelf" aria-labelledby="cards-title">
      <div class="section-heading">
        <div><p class="kicker">Local card box</p><h2 id="cards-title">Your repair chains</h2></div>
        <div class="shelf-actions">
          <button class="button quiet" id="import-button" type="button">Import JSON</button>
          <input id="import-file" class="visually-hidden" type="file" accept="application/json,.json" aria-label="Import Chain Cards JSON" />
          <a class="button primary compact" href="#/new">New card</a>
        </div>
      </div>
      <div class="card-grid">
        ${cards.length ? cards.map(cardPreview).join('') : `<div class="empty-state"><div class="empty-chain" aria-hidden="true"><i></i><i></i><i></i></div><h3>Your card box is empty</h3><p>Start from a blank card or restore the roomy-voice starter to see a complete example.</p><div><a class="button primary" href="#/new">Build a chain</a><button class="button secondary" id="restore-starter" type="button">Restore starter</button></div></div>`}
      </div>
    </section>
    <section class="how-it-works" aria-labelledby="how-title">
      <p class="kicker">The route</p><h2 id="how-title">Do less menu hunting</h2>
      <ol><li><span>01</span><h3>Order the work</h3><p>Name each action, setting, and tool in plain language.</p></li><li><span>02</span><h3>Listen on purpose</h3><p>Use checkpoints and timestamp labels to compare the moments that matter.</p></li><li><span>03</span><h3>Hand it over</h3><p>Export one open JSON card—no account, proprietary preset, or cloud render.</p></li></ol>
    </section>
  </main>`, 'cards');

  document.querySelector('#import-button')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#import-file')?.click());
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', importCard);
  document.querySelectorAll('#restore-starter').forEach((button) => button.addEventListener('click', async () => {
    await cardDb.put(starterCard());
    announce('Starter card restored.');
    await renderHome();
  }));
}

async function importCard(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error('That file is over 1 MB. Choose a Chain Cards JSON file.');
    const parsed: unknown = JSON.parse(await file.text());
    const validation = validatePortableCard(parsed);
    if (!validation.valid) throw new Error(validation.error);
    const imported = structuredClone(validation.card.card);
    if (await cardDb.get(imported.id)) imported.id = uid();
    imported.updatedAt = new Date().toISOString();
    imported.history = [...(imported.history ?? []), { at: imported.updatedAt, note: 'Imported from JSON' }];
    await cardDb.put(imported);
    location.hash = `#/card/${imported.id}`;
    announce('Card imported.');
  } catch (error) {
    announce(error instanceof Error ? error.message : 'The card could not be imported.', 'error');
  } finally {
    input.value = '';
  }
}

function stepMarkup(step: ChainStep, index: number): string {
  return `<li class="chain-step ${step.complete ? 'is-complete' : ''}" data-step-id="${escapeHtml(step.id)}">
    <div class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
    <div class="step-module">
      <div class="step-head"><div><span class="tool-badge">${escapeHtml(step.tool)}</span><h2>${escapeHtml(step.title)}</h2></div><button class="complete-step" type="button" aria-pressed="${step.complete}" data-complete="${escapeHtml(step.id)}">${step.complete ? 'Completed' : 'Mark complete'}</button></div>
      <div class="step-copy"><div><h3>Do this</h3><p>${escapeHtml(step.action)}</p></div><div><h3>Settings / note</h3><p>${escapeHtml(step.settings || 'No fixed setting recorded.')}</p></div></div>
      <div class="checkpoint"><span aria-hidden="true">◆</span><div><strong>Audition checkpoint</strong><p>${escapeHtml(step.listenFor)}</p></div></div>
      <div class="step-actions"><button type="button" class="text-button" data-copy-instructions="${escapeHtml(step.id)}">Copy instructions</button>${step.ffmpegFilter ? `<button type="button" class="text-button command-button" data-command="${escapeHtml(step.id)}">Make FFmpeg command</button>` : ''}</div>
      ${step.ffmpegFilter ? `<div class="command-output" id="command-${escapeHtml(step.id)}" hidden><code></code><button type="button" data-copy-command="${escapeHtml(step.id)}">Copy command</button></div>` : ''}
    </div>
  </li>`;
}

function labelsMarkup(card: ChainCard): string {
  const labels = [...card.labels].sort((a, b) => a.seconds - b.seconds);
  if (!labels.length) return '<div class="label-empty"><span aria-hidden="true">◇</span><p>No review labels yet. Attach audio or type a time, then mark the first moment worth checking.</p></div>';
  return `<ul class="label-list">${labels.map((label) => `<li><button type="button" data-seek="${label.seconds}" aria-label="Jump to ${formatTime(label.seconds)}"><span class="label-time">${formatTime(label.seconds)}</span><span><strong>${escapeHtml(label.note)}</strong><small>${escapeHtml(label.verdict)}</small></span><span aria-hidden="true">▶</span></button><button class="remove-label" type="button" data-remove-label="${escapeHtml(label.id)}" aria-label="Remove label at ${formatTime(label.seconds)}">×</button></li>`).join('')}</ul>`;
}

async function renderCard(id: string): Promise<void> {
  const card = await cardDb.get(id);
  if (!card) {
    shell(`<main id="main" class="not-found"><p class="eyebrow">Missing card</p><h1>That chain isn’t in this browser.</h1><p>It may have been deleted or saved on another device. Import its JSON file or return to your cards.</p><a class="button primary" href="#/cards">Back to my cards</a></main>`, 'card');
    return;
  }
  const completed = card.steps.filter((step) => step.complete).length;
  shell(`<main id="main" class="workbench">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/cards">My cards</a><span aria-hidden="true">/</span><span>Workbench</span></nav>
    <section class="workbench-head">
      <div><p class="eyebrow"><span aria-hidden="true">◆</span> Live repair route</p><h1>${escapeHtml(card.title)}</h1><p>${escapeHtml(card.goal)}</p></div>
      <div class="head-actions"><a class="button quiet" href="#/edit/${encodeURIComponent(card.id)}">Edit card</a><button class="button quiet" id="duplicate-card" type="button">Duplicate</button><button class="button primary compact" id="share-card" type="button">Share JSON</button><button class="more-button" id="delete-open" type="button" aria-label="Delete card">Delete</button></div>
    </section>
    <div class="safety-note"><span aria-hidden="true">!</span><p><strong>Protect the source</strong>${escapeHtml(card.safetyNote)}</p></div>
    <section class="workbench-grid">
      <div class="chain-column">
        <div class="progress-head"><div><p class="kicker">Signal chain</p><h2 class="visually-hidden">Effect steps</h2></div><p id="progress-label"><strong>${completed}</strong> of ${card.steps.length} complete</p></div>
        ${card.steps.length ? `<ol class="chain-list">${card.steps.map(stepMarkup).join('')}</ol>` : `<div class="empty-state small"><h2>No steps in this card</h2><p>Add the first action before you start processing.</p><a class="button primary" href="#/edit/${encodeURIComponent(card.id)}">Add steps</a></div>`}
      </div>
      <section class="review-rail" aria-label="Audition and review tools">
        <section class="rail-panel audition-panel"><p class="kicker">Local audition</p><h2>Listen beside the recipe</h2><p>Your file plays only in this tab and is never saved or uploaded.</p>
          <label class="file-drop" for="audio-file"><span aria-hidden="true">♪</span><strong id="audio-file-label">Choose an audio file</strong><small>WAV, MP3, M4A, OGG, or a format your browser supports</small></label>
          <input class="visually-hidden" id="audio-file" type="file" accept="audio/*" />
          <div id="audio-player-wrap" hidden><audio id="audio-player" controls preload="metadata"></audio><button class="text-button" type="button" id="remove-audio">Detach local audio</button></div>
        </section>
        <section class="rail-panel path-panel"><p class="kicker">Source-safe command</p><h2>Set explicit paths</h2><p>These paths are used only to build a copyable command. Chain Cards never runs it.</p>
          <label for="input-path">Input path</label><input id="input-path" autocomplete="off" placeholder="recording.wav" />
          <label for="output-path">New output path</label><input id="output-path" autocomplete="off" placeholder="recording-cleaned.wav" />
          <small>Input and output must be different.</small>
        </section>
        <section class="rail-panel labels-panel"><p class="kicker">Review anchors</p><h2>Timestamp labels</h2>
          <form id="label-form"><div class="time-row"><label for="label-time">Time</label><button class="text-button" type="button" id="use-playhead">Use playhead</button></div><input id="label-time" inputmode="numeric" placeholder="1:24" aria-describedby="time-help" required /><small id="time-help">Use M:SS or H:MM:SS</small><label for="label-note">What should be checked?</label><input id="label-note" maxlength="100" placeholder="Tail after “room”" required /><label for="label-verdict">Verdict</label><select id="label-verdict"><option>Review</option><option>Better</option><option>Same</option><option>Worse</option></select><button class="button amber full" type="submit">Add review label</button></form>
          <div id="labels-list">${labelsMarkup(card)}</div>
        </section>
      </section>
    </section>
    <dialog id="delete-dialog" aria-labelledby="delete-title"><form method="dialog"><p class="kicker">Remove local card</p><h2 id="delete-title">Delete “${escapeHtml(card.title)}”?</h2><p>This removes the card, its labels, and its completion state from this browser. Export first if you may need it.</p><div><button class="button quiet" value="cancel">Keep card</button><button class="button danger" value="delete">Delete card</button></div></form></dialog>
  </main>`, 'card');
  bindCard(card);
}

function copyText(text: string, success: string): void {
  navigator.clipboard.writeText(text).then(() => announce(success)).catch(() => announce('Clipboard access was blocked. Select and copy the visible text instead.', 'error'));
}

function bindCard(card: ChainCard): void {
  document.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach((button) => button.addEventListener('click', async () => {
    const step = card.steps.find((item) => item.id === button.dataset.complete);
    if (!step) return;
    step.complete = !step.complete;
    card.updatedAt = new Date().toISOString();
    card.history.push({ at: card.updatedAt, note: `${step.complete ? 'Completed' : 'Reopened'}: ${step.title}` });
    await cardDb.put(card);
    button.setAttribute('aria-pressed', String(step.complete));
    button.textContent = step.complete ? 'Completed' : 'Mark complete';
    button.closest('.chain-step')?.classList.toggle('is-complete', step.complete);
    const done = card.steps.filter((item) => item.complete).length;
    const progress = document.querySelector('#progress-label');
    if (progress) progress.innerHTML = `<strong>${done}</strong> of ${card.steps.length} complete`;
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
      if (!step) throw new Error('That step is no longer available.');
      const command = makeFfmpegCommand(input, output, step);
      const panel = document.querySelector<HTMLElement>(`#command-${CSS.escape(step.id)}`);
      const code = panel?.querySelector('code');
      if (panel && code) { code.textContent = command; panel.hidden = false; }
      announce('Command built. Review it before running.');
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not build the command.', 'error'); }
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
    announce('Audio attached locally.');
  });
  document.querySelector('#remove-audio')?.addEventListener('click', () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
    if (audio) { audio.removeAttribute('src'); audio.load(); }
    if (audioInput) audioInput.value = '';
    if (playerWrap) playerWrap.hidden = true;
    const label = document.querySelector('#audio-file-label');
    if (label) label.textContent = 'Choose an audio file';
    announce('Audio detached. The saved card was unchanged.');
  });
  document.querySelector('#use-playhead')?.addEventListener('click', () => {
    const time = document.querySelector<HTMLInputElement>('#label-time');
    if (!audio?.src || !time) return announce('Attach an audio file first, or type a timestamp.', 'error');
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
    if (seconds === null || seconds < 0) {
      timeInput?.setAttribute('aria-invalid', 'true');
      return announce('Enter a valid time as M:SS or H:MM:SS. Seconds and H:MM:SS minutes must be 00–59.', 'error');
    }
    const note = noteInput?.value.trim() ?? '';
    if (!note) return announce('Add a short note about what to check.', 'error');
    const now = new Date().toISOString();
    card.labels.push({ id: uid(), seconds, note, verdict: (verdictInput?.value ?? 'Review') as Verdict, createdAt: now });
    card.updatedAt = now;
    card.history.push({ at: now, note: `Added label at ${formatTime(seconds)}` });
    await cardDb.put(card);
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
    await cardDb.put(copy);
    location.hash = `#/card/${copy.id}`;
  });
  document.querySelector('#share-card')?.addEventListener('click', () => shareCard(card));
  const dialog = document.querySelector<HTMLDialogElement>('#delete-dialog');
  document.querySelector('#delete-open')?.addEventListener('click', () => dialog?.showModal());
  dialog?.addEventListener('close', async () => {
    if (dialog.returnValue === 'delete') {
      await cardDb.delete(card.id);
      location.hash = '#/cards';
    }
  });
}

function bindLabelActions(card: ChainCard, refresh: () => void, audio: HTMLAudioElement | null): void {
  document.querySelectorAll<HTMLButtonElement>('[data-seek]').forEach((button) => button.addEventListener('click', () => {
    if (!audio?.src) return announce('Attach the matching audio file to jump to this label.', 'error');
    audio.currentTime = Number(button.dataset.seek);
    audio.play().catch(() => undefined);
    audio.focus();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-remove-label]').forEach((button) => button.addEventListener('click', async () => {
    const label = card.labels.find((item) => item.id === button.dataset.removeLabel);
    if (!label || !confirm(`Remove the review label at ${formatTime(label.seconds)}?`)) return;
    card.labels = card.labels.filter((label) => label.id !== button.dataset.removeLabel);
    card.updatedAt = new Date().toISOString();
    await cardDb.put(card);
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
  URL.revokeObjectURL(url);
  announce('JSON card exported.');
}

async function shareCard(card: ChainCard): Promise<void> {
  const file = new File([JSON.stringify(portable(card), null, 2)], `${fileSlug(card.title)}.chain-card.json`, { type: 'application/json' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ title: card.title, text: 'A Chain Cards audio repair recipe', files: [file] }); }
    catch (error) { if ((error as DOMException).name !== 'AbortError') downloadCard(card); }
  } else downloadCard(card);
}

function editorStep(step: ChainStep, index: number): string {
  return `<fieldset class="editor-step" data-editor-id="${escapeHtml(step.id)}"><legend>Step ${index + 1}</legend><div class="editor-step-actions"><button type="button" class="icon-button step-up" aria-label="Move step ${index + 1} up">↑</button><button type="button" class="icon-button step-down" aria-label="Move step ${index + 1} down">↓</button><button type="button" class="text-button coral remove-step">Remove</button></div>
    <label>Step name<input name="step-title" value="${escapeHtml(step.title)}" required maxlength="80" /></label>
    <label>Tool<select name="step-tool">${tools.map((tool) => `<option ${step.tool === tool ? 'selected' : ''}>${tool}</option>`).join('')}</select></label>
    <label>Action<textarea name="step-action" required rows="3" maxlength="500">${escapeHtml(step.action)}</textarea></label>
    <label>Settings or note<textarea name="step-settings" rows="2" maxlength="300">${escapeHtml(step.settings)}</textarea></label>
    <label>What should the listener check?<textarea name="step-listen" required rows="2" maxlength="300">${escapeHtml(step.listenFor)}</textarea></label>
    <label>FFmpeg audio filter <span>(optional; only add syntax you trust)</span><input name="step-filter" value="${escapeHtml(step.ffmpegFilter ?? '')}" placeholder="highpass=f=80" /></label>
  </fieldset>`;
}

async function renderEditor(id?: string): Promise<void> {
  const card = id ? await cardDb.get(id) : blankCard();
  if (!card) return renderCard(id ?? '');
  shell(`<main id="main" class="editor-main">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/cards">My cards</a><span aria-hidden="true">/</span><span>${id ? 'Edit card' : 'New card'}</span></nav>
    <div class="editor-heading"><div><p class="eyebrow"><span aria-hidden="true">◆</span> Card builder</p><h1>${id ? 'Tune this repair route' : 'Build a repair route'}</h1><p>Write for the next person at the desk: one action, one check, then the next.</p></div><div class="route-key"><span>Action</span><i></i><span>Listen</span><i></i><span>Continue</span></div></div>
    <form id="card-form" class="card-form">
      <section class="form-section"><div class="form-section-label"><span>01</span><div><h2>Name the job</h2><p>What problem does this card help someone work through?</p></div></div><div class="form-fields"><label for="card-title">Card title<input id="card-title" name="title" value="${escapeHtml(card.title)}" required maxlength="80" /></label><label for="card-goal">Goal<textarea id="card-goal" name="goal" required rows="3" maxlength="300">${escapeHtml(card.goal)}</textarea></label><label for="safety-note">Source-safety note<textarea id="safety-note" name="safety" required rows="2" maxlength="300">${escapeHtml(card.safetyNote)}</textarea></label></div></section>
      <section class="form-section"><div class="form-section-label"><span>02</span><div><h2>Lay out the chain</h2><p>Settings are notes, not guarantees. Include a listening check after every action.</p></div></div><div class="form-fields"><div id="editor-steps">${card.steps.map(editorStep).join('')}</div><button class="button secondary full" id="add-step" type="button">+ Add another step</button></div></section>
      <div class="form-submit"><a class="button quiet" href="${id ? `#/card/${encodeURIComponent(card.id)}` : '#/cards'}">Cancel</a><button class="button primary" type="submit">Save card</button></div>
      <div id="form-error" class="form-error" role="alert" hidden></div>
    </form>
  </main>`, id ? 'card' : 'new');
  bindEditor(card);
}

function renumberEditor(): void {
  document.querySelectorAll<HTMLElement>('.editor-step').forEach((field, index) => {
    const legend = field.querySelector('legend');
    if (legend) legend.textContent = `Step ${index + 1}`;
    field.querySelector<HTMLButtonElement>('.step-up')!.disabled = index === 0;
    field.querySelector<HTMLButtonElement>('.step-down')!.disabled = index === document.querySelectorAll('.editor-step').length - 1;
    field.querySelector<HTMLButtonElement>('.step-up')!.ariaLabel = `Move step ${index + 1} up`;
    field.querySelector<HTMLButtonElement>('.step-down')!.ariaLabel = `Move step ${index + 1} down`;
  });
}

function bindEditor(card: ChainCard): void {
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
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
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
    await cardDb.put(card);
    location.hash = `#/card/${card.id}`;
  });
}

async function route(): Promise<void> {
  // #main is a fragment target for the skip link, never an app route.
  if (location.hash === '#main') {
    document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
    return;
  }
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (parts[0] === 'card' && parts[1]) await renderCard(decodeURIComponent(parts[1]));
    else if (parts[0] === 'edit' && parts[1]) await renderEditor(decodeURIComponent(parts[1]));
    else if (parts[0] === 'new') await renderEditor();
    else await renderHome();
    // Preserve the browser's initial tab order so the skip link is first on a
    // fresh load. Subsequent hash-route changes move readers to new content.
    if (hasRenderedRoute) document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
    hasRenderedRoute = true;
  } catch (error) {
    shell(`<main id="main" class="not-found"><p class="eyebrow">Local storage error</p><h1>Your card box could not open.</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Reload the page and try again.')}</p><button class="button primary" type="button" onclick="location.reload()">Reload Chain Cards</button></main>`);
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
  }).catch(() => announce('Offline installation is unavailable in this browser.', 'error'));
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event as BeforeInstallPromptEvent;
});
window.addEventListener('hashchange', route);

await ensureStarter();
await route();
registerPwa();

void installPrompt;
