/** Normalisasi L2; vektor nol dikembalikan apa adanya. */
export function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

/** Rata-rata vektor (profil selera anggota, FR-L4) lalu dinormalisasi. */
export function centroid(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dims = vectors[0].length;
  const sum: number[] = Array.from({ length: dims }, () => 0);
  for (const v of vectors) {
    if (v.length !== dims) throw new Error('Dimensi vektor tidak sama');
    const n = normalize(v);
    for (let i = 0; i < dims; i++) sum[i] += n[i];
  }
  return normalize(sum.map((x) => x / vectors.length));
}
