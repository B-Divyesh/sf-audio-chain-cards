import type { ChainCard, ChainStep, PortableCard, ReviewLabel, ToolKind, Verdict } from './types';

export const uid = (): string => crypto.randomUUID();

export const starterCard = (): ChainCard => {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: 'starter-roomy-voice',
    title: 'Roomy voice: repair & review',
    goal: 'Reduce distracting room character, clear low rumble, then finish and review a spoken recording.',
    safetyNote: 'Work on a copy. Keep the original recording untouched and use a new output path for every processed file.',
    createdAt: now,
    updatedAt: now,
    steps: [
      {
        id: uid(),
        title: 'Ease the room sound',
        tool: 'Audacity / editor',
        action: 'Duplicate the track. Open a de-reverb or de-echo effect you already trust, if available. Begin with its lightest reduction and bypass it often.',
        settings: 'There is no universal setting. Record the tool and version here after a useful, natural-sounding pass.',
        listenFor: 'Speech should feel closer without watery tails, metallic edges, or clipped word endings.',
        complete: false
      },
      {
        id: uid(),
        title: 'Cut low rumble',
        tool: 'FFmpeg',
        action: 'Apply a gentle 80 Hz high-pass filter to the copied file.',
        settings: 'High-pass frequency: 80 Hz',
        listenFor: 'Compare low voices carefully. Rumble should ease while the voice still sounds full.',
        ffmpegFilter: 'highpass=f=80',
        complete: false
      },
      {
        id: uid(),
        title: 'Set a steady finish',
        tool: 'FFmpeg',
        action: 'Normalize spoken-program loudness, then audition the result instead of trusting the meter alone.',
        settings: 'Integrated -16 LUFS · True peak -1.5 dBTP · Loudness range 11 LU',
        listenFor: 'Level should feel steady without pumping, raised room tone, or harsh peaks.',
        ffmpegFilter: 'loudnorm=I=-16:TP=-1.5:LRA=11',
        complete: false
      }
    ],
    labels: [],
    history: [{ at: now, note: 'Starter card created' }]
  };
};

export const blankCard = (): ChainCard => {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: uid(),
    title: '',
    goal: '',
    safetyNote: 'Work on a copy. Keep the original recording untouched and use a new output path for every processed file.',
    createdAt: now,
    updatedAt: now,
    steps: [],
    labels: [],
    history: [{ at: now, note: 'Card created' }]
  };
};

export function duplicateCard(card: ChainCard): ChainCard {
  const now = new Date().toISOString();
  return {
    ...structuredClone(card),
    id: uid(),
    title: `${card.title} — copy`,
    createdAt: now,
    updatedAt: now,
    labels: [],
    steps: card.steps.map((step) => ({ ...step, id: uid(), complete: false })),
    history: [{ at: now, note: 'Copied from another card' }]
  };
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function makeFfmpegCommand(input: string, output: string, step: ChainStep): string {
  const cleanInput = input.trim();
  const cleanOutput = output.trim();
  if (!cleanInput || !cleanOutput) throw new Error('Add both an input and an output path.');
  if (cleanInput === cleanOutput) throw new Error('Choose a different output path so the source stays untouched.');
  if (!step.ffmpegFilter) throw new Error('This step does not include an FFmpeg filter.');
  return `ffmpeg -i ${shellQuote(cleanInput)} -af ${shellQuote(step.ffmpegFilter)} ${shellQuote(cleanOutput)}`;
}

export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`;
}

export function parseTime(value: string): number | null {
  const input = value.trim();
  if (!input) return null;

  const parts = input.split(':');
  if (parts.length !== 2 && parts.length !== 3) return null;
  const timePartsAreFormatted = parts.length === 2
    ? /^\d+$/.test(parts[0]) && /^\d{2}$/.test(parts[1])
    : /^\d+$/.test(parts[0]) && /^\d{2}$/.test(parts[1]) && /^\d{2}$/.test(parts[2]);
  if (!timePartsAreFormatted) return null;

  const values = parts.map(Number);
  if (values.some((part) => !Number.isSafeInteger(part) || part < 0)) return null;

  const seconds = values.at(-1)!;
  const minutes = values.length === 3 ? values[1] : values[0];
  if (seconds > 59 || (values.length === 3 && minutes > 59)) return null;

  const total = values.length === 3
    ? values[0] * 3600 + values[1] * 60 + seconds
    : minutes * 60 + seconds;
  return Number.isSafeInteger(total) ? total : null;
}

export type PortableCardValidation =
  | { valid: true; card: PortableCard }
  | { valid: false; error: string };

const toolKinds: readonly ToolKind[] = ['Audacity / editor', 'FFmpeg', 'Other'];
const verdicts: readonly Verdict[] = ['Review', 'Better', 'Same', 'Worse'];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isTimestamp = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
const invalid = (path: string, expectation: string): PortableCardValidation => ({
  valid: false,
  error: `Cannot import this card: ${path}${expectation ? ` ${expectation}` : ''}.`
});

function validateStep(value: unknown, index: number): string | null {
  const path = `card.steps[${index}]`;
  if (!isRecord(value)) return `${path} must be an object`;
  for (const field of ['id', 'title', 'action', 'listenFor'] as const) {
    if (!isNonEmptyString(value[field])) return `${path}.${field} must be a non-empty string`;
  }
  if (!toolKinds.includes(value.tool as ToolKind)) return `${path}.tool must be Audacity / editor, FFmpeg, or Other`;
  if (typeof value.settings !== 'string') return `${path}.settings must be a string`;
  if ('ffmpegFilter' in value && typeof value.ffmpegFilter !== 'string') return `${path}.ffmpegFilter must be a string when present`;
  if (typeof value.complete !== 'boolean') return `${path}.complete must be true or false`;
  return null;
}

function validateLabel(value: unknown, index: number): string | null {
  const path = `card.labels[${index}]`;
  if (!isRecord(value)) return `${path} must be an object`;
  if (!isNonEmptyString(value.id)) return `${path}.id must be a non-empty string`;
  if (typeof value.seconds !== 'number' || !Number.isSafeInteger(value.seconds) || value.seconds < 0) return `${path}.seconds must be a non-negative whole number`;
  if (!isNonEmptyString(value.note)) return `${path}.note must be a non-empty string`;
  if (!verdicts.includes(value.verdict as Verdict)) return `${path}.verdict must be Review, Better, Same, or Worse`;
  if (!isTimestamp(value.createdAt)) return `${path}.createdAt must be a valid timestamp`;
  return null;
}

function validateHistory(value: unknown, index: number): string | null {
  const path = `card.history[${index}]`;
  if (!isRecord(value)) return `${path} must be an object`;
  if (!isTimestamp(value.at)) return `${path}.at must be a valid timestamp`;
  if (!isNonEmptyString(value.note)) return `${path}.note must be a non-empty string`;
  return null;
}

/** Validate every persisted field before imported JSON can enter IndexedDB. */
export function validatePortableCard(value: unknown): PortableCardValidation {
  if (!isRecord(value)) return invalid('file', 'must contain a Chain Cards v1 object');
  if (value.format !== 'chain-cards') return invalid('format', 'must be "chain-cards"');
  if (value.version !== 1) return invalid('version', 'must be 1');
  if (!isTimestamp(value.exportedAt)) return invalid('exportedAt', 'must be a valid timestamp');
  if (!isRecord(value.card)) return invalid('card', 'must be an object');

  const card = value.card;
  if (card.schemaVersion !== 1) return invalid('card.schemaVersion', 'must be 1');
  for (const field of ['id', 'title', 'goal', 'safetyNote'] as const) {
    if (!isNonEmptyString(card[field])) return invalid(`card.${field}`, 'must be a non-empty string');
  }
  for (const field of ['createdAt', 'updatedAt'] as const) {
    if (!isTimestamp(card[field])) return invalid(`card.${field}`, 'must be a valid timestamp');
  }
  if (!Array.isArray(card.steps) || card.steps.length === 0) return invalid('card.steps', 'must contain at least one step');
  if (!Array.isArray(card.labels)) return invalid('card.labels', 'must be an array');
  if (!Array.isArray(card.history)) return invalid('card.history', 'must be an array');

  const stepIds = new Set<string>();
  for (const [index, step] of card.steps.entries()) {
    const problem = validateStep(step, index);
    if (problem) return invalid(problem, '');
    const id = (step as ChainStep).id;
    if (stepIds.has(id)) return invalid(`card.steps[${index}].id`, 'must be unique');
    stepIds.add(id);
  }
  const labelIds = new Set<string>();
  for (const [index, label] of card.labels.entries()) {
    const problem = validateLabel(label, index);
    if (problem) return invalid(problem, '');
    const id = (label as ReviewLabel).id;
    if (labelIds.has(id)) return invalid(`card.labels[${index}].id`, 'must be unique');
    labelIds.add(id);
  }
  for (const [index, history] of card.history.entries()) {
    const problem = validateHistory(history, index);
    if (problem) return invalid(problem, '');
  }

  return { valid: true, card: value as unknown as PortableCard };
}

export function isPortableCard(value: unknown): value is PortableCard {
  return validatePortableCard(value).valid;
}

export function fileSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52) || 'chain-card';
}
