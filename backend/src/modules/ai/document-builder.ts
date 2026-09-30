import { createHash } from 'node:crypto';

export interface BookDocInput {
  title: string;
  subtitle?: string | null;
  authors: string[];
  subjects: string[];
  synopsis?: string | null;
}

/**
 * Teks yang di-embed untuk satu judul (FR-L1) + hash konten.
 * Model ikut di-hash: ganti EMBEDDING_MODEL memicu re-embed penuh (FR-L6).
 */
export function buildBookDocument(b: BookDocInput, model: string) {
  const text = [
    `Judul: ${b.title}${b.subtitle ? `: ${b.subtitle}` : ''}`,
    b.authors.length ? `Pengarang: ${b.authors.join(', ')}` : null,
    b.subjects.length ? `Subjek: ${b.subjects.join(', ')}` : null,
    b.synopsis?.trim()
      ? `Sinopsis: ${b.synopsis.trim().replace(/\s+/g, ' ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
  const contentHash = createHash('sha256')
    .update(`${model}\n${text}`)
    .digest('hex');
  return { text, contentHash };
}
