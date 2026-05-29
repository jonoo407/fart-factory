import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportSave,
  exportSaveString,
  importSave,
  SAVE_FORMAT_VERSION,
} from '../../src/state/save-io';

beforeEach(() => {
  localStorage.clear();
});

describe('exportSave', () => {
  it('collects only fart_* keys, leaves others untouched', () => {
    localStorage.setItem('fart_gold', '42');
    localStorage.setItem('fart_pantry', JSON.stringify(['beans']));
    localStorage.setItem('not_us', 'leave-me');
    const blob = exportSave();
    expect(Object.keys(blob.keys).sort()).toEqual(['fart_gold', 'fart_pantry']);
    expect(blob.keys['fart_gold']).toBe('42');
  });

  it('records version + exportedAt', () => {
    const blob = exportSave();
    expect(blob.version).toBe(SAVE_FORMAT_VERSION);
    expect(typeof blob.exportedAt).toBe('string');
    expect(blob.exportedAt.length).toBeGreaterThan(0);
  });

  it('exportSaveString round-trips through JSON.parse', () => {
    localStorage.setItem('fart_gold', '15');
    const text = exportSaveString();
    const parsed = JSON.parse(text) as ReturnType<typeof exportSave>;
    expect(parsed.keys['fart_gold']).toBe('15');
  });
});

describe('importSave', () => {
  it('replaces existing fart_* keys with the blob', () => {
    localStorage.setItem('fart_gold', '0');
    localStorage.setItem('fart_dead_key', 'gone');
    const blob = {
      version: SAVE_FORMAT_VERSION,
      exportedAt: '2026-05-22T00:00:00Z',
      keys: { fart_gold: '99', fart_pantry: '["beans"]' },
    };
    const result = importSave(blob);
    expect(result.ok).toBe(true);
    expect(result.importedKeys).toBe(2);
    expect(localStorage.getItem('fart_gold')).toBe('99');
    expect(localStorage.getItem('fart_pantry')).toBe('["beans"]');
    // Deletion semantics: dead_key not in the import → removed.
    expect(localStorage.getItem('fart_dead_key')).toBeNull();
  });

  it('leaves non-fart_ keys untouched on import', () => {
    localStorage.setItem('not_us', 'keep-me');
    importSave({
      version: SAVE_FORMAT_VERSION,
      exportedAt: 'x',
      keys: { fart_gold: '1' },
    });
    expect(localStorage.getItem('not_us')).toBe('keep-me');
  });

  it('rejects invalid JSON string', () => {
    const result = importSave('{not json');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/JSON/);
  });

  it('rejects shape-invalid blob', () => {
    const result = importSave('{"version":1}');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/format/);
  });

  it('rejects mismatched version', () => {
    const result = importSave({
      version: 999,
      exportedAt: 'x',
      keys: {},
    } as unknown as Parameters<typeof importSave>[0]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/version/);
  });

  it('drops foreign keys silently (security: imported blob cannot inject non-namespaced state)', () => {
    importSave({
      version: SAVE_FORMAT_VERSION,
      exportedAt: 'x',
      keys: { fart_gold: '5', evil_key: 'pwn' },
    });
    expect(localStorage.getItem('fart_gold')).toBe('5');
    expect(localStorage.getItem('evil_key')).toBeNull();
  });

  it('round-trip: exportSaveString → importSave restores identical state', () => {
    localStorage.setItem('fart_gold', '50');
    localStorage.setItem('fart_pantry', JSON.stringify(['beans', 'cheese']));
    localStorage.setItem('fart_food_mastery_beans', '42');
    const exported = exportSaveString();
    localStorage.clear();
    const result = importSave(exported);
    expect(result.ok).toBe(true);
    expect(localStorage.getItem('fart_gold')).toBe('50');
    expect(JSON.parse(localStorage.getItem('fart_pantry')!)).toEqual(['beans', 'cheese']);
    expect(localStorage.getItem('fart_food_mastery_beans')).toBe('42');
  });
});
