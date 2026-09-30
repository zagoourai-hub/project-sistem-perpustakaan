import { rrf } from './rrf.js';

describe('rrf', () => {
  it('dokumen yang muncul di kedua daftar naik ke atas', () => {
    const r = rrf({ fulltext: ['a', 'b', 'c'], semantic: ['c', 'd'] });
    expect(r[0].id).toBe('c');
    expect(r[0].sources).toEqual(['fulltext', 'semantic']);
  });

  it('skor = Σ 1/(k+rank)', () => {
    const [top] = rrf({ fulltext: ['a'], semantic: ['a'] }, 60);
    expect(top.score).toBeCloseTo(2 / 61);
  });

  it('satu sumber kosong = urutan sumber lain dipertahankan', () => {
    expect(
      rrf({ fulltext: ['x', 'y', 'z'], semantic: [] }).map((f) => f.id),
    ).toEqual(['x', 'y', 'z']);
  });
});
