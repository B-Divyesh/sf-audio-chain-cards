import { describe, expect, it } from 'vitest';
import { fileSlug, formatTime, isPortableCard, makeFfmpegCommand, parseTime, shellQuote, starterCard, validatePortableCard } from '../src/model';

describe('time labels', () => {
  it('formats and parses useful review timestamps', () => {
    expect(formatTime(84.9)).toBe('1:24');
    expect(formatTime(3723)).toBe('1:02:03');
    expect(parseTime('1:24')).toBe(84);
    expect(parseTime('1:02:03')).toBe(3723);
    expect(parseTime('nope')).toBeNull();
    expect(parseTime('   ')).toBeNull();
    expect(parseTime('1:60')).toBeNull();
    expect(parseTime('1:60:00')).toBeNull();
    expect(parseTime('1:02:60')).toBeNull();
    expect(parseTime('84')).toBeNull();
    expect(parseTime('1:2')).toBeNull();
  });
});

describe('source-safe commands', () => {
  const ffmpegStep = starterCard().steps[1];

  it('quotes paths and builds a visible FFmpeg command', () => {
    expect(shellQuote("sam's take.wav")).toBe("'sam'\\''s take.wav'");
    expect(makeFfmpegCommand('raw take.wav', 'raw take-clean.wav', ffmpegStep))
      .toBe("ffmpeg -i 'raw take.wav' -af 'highpass=f=80' 'raw take-clean.wav'");
  });

  it('refuses to overwrite the named source', () => {
    expect(() => makeFfmpegCommand('take.wav', 'take.wav', ffmpegStep)).toThrow(/different output path/);
    expect(() => makeFfmpegCommand('', 'out.wav', ffmpegStep)).toThrow(/both an input/);
  });
});

describe('portable cards', () => {
  it('recognizes the open v1 envelope and produces safe filenames', () => {
    const card = starterCard();
    expect(isPortableCard({ format: 'chain-cards', version: 1, exportedAt: new Date().toISOString(), card })).toBe(true);
    expect(isPortableCard({ format: 'unknown', version: 1, card })).toBe(false);
    expect(fileSlug('Roomy voice: repair & review')).toBe('roomy-voice-repair-review');
  });

  it('rejects incomplete nested data before it can become a durable phantom label', () => {
    const card = starterCard();
    const malformed = { format: 'chain-cards', version: 1, exportedAt: new Date().toISOString(), card: { ...card, labels: [{}] } };
    const validation = validatePortableCard(malformed);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.error).toContain('card.labels[0].id must be a non-empty string');
    expect(isPortableCard(malformed)).toBe(false);
  });

  it('requires all portable v1 metadata and nested step fields', () => {
    const card = starterCard();
    const malformed = { format: 'chain-cards', version: 1, exportedAt: new Date().toISOString(), card: { ...card, steps: [{ id: 'only-id' }] } };
    const validation = validatePortableCard(malformed);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.error).toContain('card.steps[0].title must be a non-empty string');
  });
});
