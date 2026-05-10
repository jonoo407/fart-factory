import { describe, it, expect, beforeEach } from 'vitest';
import { loadHall, addToHall, renderHall } from '../../src/state/hall';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="hallList"></div>';
});

describe('loadHall — corruption recovery', () => {
  it('returns [] when storage is empty', () => {
    expect(loadHall()).toEqual([]);
  });

  it('returns [] when storage contains malformed JSON', () => {
    localStorage.setItem('fart_hall', '{not json');
    expect(loadHall()).toEqual([]);
  });

  it('returns [] when storage contains a non-array (e.g. {"x":"bad"})', () => {
    localStorage.setItem('fart_hall', JSON.stringify({ x: 'bad' }));
    expect(loadHall()).toEqual([]);
  });

  it('returns [] when storage contains a primitive', () => {
    localStorage.setItem('fart_hall', '"just a string"');
    expect(loadHall()).toEqual([]);
  });
});

describe('addToHall — top-5 sorted descending', () => {
  it('keeps only the 5 highest scores, sorted desc', () => {
    addToHall(10, 'F-');
    addToHall(50, 'A+');
    addToHall(30, 'B');
    addToHall(60, 'S+');
    addToHall(20, 'D');
    addToHall(40, 'B+');
    addToHall(15, 'D');
    const hall = loadHall();
    expect(hall).toHaveLength(5);
    const scores = hall.map((h) => h.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores[0]).toBe(60);
    expect(scores[4]).toBe(20);
  });

  it('survives loading after corrupt JSON without throwing', () => {
    localStorage.setItem('fart_hall', '{not json');
    expect(() => addToHall(42, 'A')).not.toThrow();
    expect(loadHall()).toHaveLength(1);
    expect(loadHall()[0].score).toBe(42);
  });
});

describe('renderHall — DOM output', () => {
  it('renders empty placeholder when hall is empty', () => {
    renderHall();
    const el = document.getElementById('hallList');
    expect(el?.textContent).toMatch(/legendary farts/i);
  });

  it('does not throw when #hallList element is missing', () => {
    document.body.innerHTML = '';
    expect(() => renderHall()).not.toThrow();
  });

  it('escapes HTML in grade strings (defensive)', () => {
    addToHall(50, '<img src=x onerror=alert(1)>');
    renderHall();
    const el = document.getElementById('hallList');
    expect(el?.innerHTML).not.toContain('<img');
    expect(el?.innerHTML).toContain('&lt;img');
  });
});
