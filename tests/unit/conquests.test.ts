import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadConquests,
  recordConquest,
  isAudienceConquered,
} from '../../src/state/conquests';

beforeEach(() => {
  localStorage.clear();
});

describe('recordConquest', () => {
  it('adds a new row on first wow', () => {
    const c = recordConquest('granny-edna', 92);
    expect(c.audienceId).toBe('granny-edna');
    expect(c.bestPct).toBe(92);
    expect(c.timesWowed).toBe(1);
    expect(loadConquests().length).toBe(1);
  });

  it('does not duplicate rows on re-wow', () => {
    recordConquest('granny-edna', 88);
    recordConquest('granny-edna', 90);
    const list = loadConquests();
    expect(list.length).toBe(1);
    expect(list[0]!.timesWowed).toBe(2);
  });

  it('updates bestPct only when the new pct is higher', () => {
    recordConquest('granny-edna', 92);
    recordConquest('granny-edna', 85);
    expect(loadConquests()[0]!.bestPct).toBe(92);
    recordConquest('granny-edna', 99);
    expect(loadConquests()[0]!.bestPct).toBe(99);
  });

  it('isAudienceConquered reflects the list', () => {
    expect(isAudienceConquered('granny-edna')).toBe(false);
    recordConquest('granny-edna', 90);
    expect(isAudienceConquered('granny-edna')).toBe(true);
    expect(isAudienceConquered('royal-court')).toBe(false);
  });

  it('rounds match% before storing', () => {
    recordConquest('granny-edna', 92.7);
    expect(loadConquests()[0]!.bestPct).toBe(93);
  });
});

describe('loadConquests — corruption safety', () => {
  it('returns [] on garbage', () => {
    localStorage.setItem('fart_conquests', '{not json');
    expect(loadConquests()).toEqual([]);
  });

  it('filters invalid rows', () => {
    localStorage.setItem(
      'fart_conquests',
      JSON.stringify([
        { audienceId: 'granny-edna', wowedAt: '2026-05-29', bestPct: 90, timesWowed: 1 },
        { broken: true },
      ]),
    );
    const list = loadConquests();
    expect(list.length).toBe(1);
    expect(list[0]!.audienceId).toBe('granny-edna');
  });
});
