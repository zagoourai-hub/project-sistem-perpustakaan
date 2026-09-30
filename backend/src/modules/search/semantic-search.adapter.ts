import { Injectable, Logger } from '@nestjs/common';
import { AiSearchService } from '../ai/ai-search.service.js';

const TIMEOUT_MS = 800;
// kandidat dengan kemiripan terlalu rendah hanya menambah noise
const MIN_SCORE = 0.2;

/** Semantik dengan batas waktu 800 ms; gagal/timeout → null (fallback full-text). */
@Injectable()
export class SemanticSearchAdapter {
  private readonly logger = new Logger(SemanticSearchAdapter.name);

  constructor(private readonly ai: AiSearchService) {}

  get enabled() {
    return this.ai.enabled;
  }

  async search(q: string, k = 50): Promise<string[] | null> {
    if (!this.ai.enabled) return null;
    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race([
        this.ai.search(q, k, TIMEOUT_MS),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('timeout')),
            TIMEOUT_MS + 200,
          );
        }),
      ]);
      return result.filter((r) => r.score >= MIN_SCORE).map((r) => r.bookId);
    } catch (e) {
      this.logger.warn(`Semantic search fallback: ${(e as Error).message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
