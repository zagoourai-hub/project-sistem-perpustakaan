export interface Fused<S extends string> {
  id: string;
  score: number;
  sources: S[];
}

/**
 * Reciprocal Rank Fusion: skor = Σ 1 / (k + rank), rank mulai 1.
 * Tidak butuh normalisasi skor antar sistem yang skalanya berbeda.
 */
export function rrf<S extends string>(
  lists: Record<S, string[]>,
  k = 60,
): Fused<S>[] {
  const acc = new Map<string, Fused<S>>();
  for (const source of Object.keys(lists) as S[]) {
    lists[source].forEach((id, i) => {
      const entry = acc.get(id) ?? { id, score: 0, sources: [] };
      entry.score += 1 / (k + i + 1);
      entry.sources.push(source);
      acc.set(id, entry);
    });
  }
  return [...acc.values()].sort((a, b) => b.score - a.score);
}
