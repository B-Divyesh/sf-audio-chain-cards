import type { ChainCard, ChainStep, PortableCard } from './types';

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
  const parts = value.trim().split(':').map(Number);
  if (parts.length < 1 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(seconds) ? seconds : null;
}

export function isPortableCard(value: unknown): value is PortableCard {
  if (!value || typeof value !== 'object') return false;
  const portable = value as Partial<PortableCard>;
  const card = portable.card as Partial<ChainCard> | undefined;
  return portable.format === 'chain-cards'
    && portable.version === 1
    && card?.schemaVersion === 1
    && typeof card.id === 'string'
    && typeof card.title === 'string'
    && typeof card.goal === 'string'
    && Array.isArray(card.steps)
    && card.steps.every((step) => Boolean(step)
      && typeof step.id === 'string'
      && typeof step.title === 'string'
      && typeof step.action === 'string'
      && typeof step.listenFor === 'string')
    && Array.isArray(card.labels);
}

export function fileSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52) || 'chain-card';
}
