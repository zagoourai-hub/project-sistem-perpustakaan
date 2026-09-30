import { centroid, normalize } from './centroid.js';

const len = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

describe('centroid', () => {
  it('null untuk input kosong', () => {
    expect(centroid([])).toBeNull();
  });

  it('rata-rata arah vektor, hasil ternormalisasi', () => {
    const c = centroid([
      [1, 0],
      [0, 10], // panjang berbeda tidak mendominasi
    ])!;
    expect(c[0]).toBeCloseTo(Math.SQRT1_2);
    expect(c[1]).toBeCloseTo(Math.SQRT1_2);
    expect(len(c)).toBeCloseTo(1);
  });

  it('menolak dimensi berbeda', () => {
    expect(() => centroid([[1, 0], [1]])).toThrow();
  });

  it('normalize vektor nol tetap nol', () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
  });
});
