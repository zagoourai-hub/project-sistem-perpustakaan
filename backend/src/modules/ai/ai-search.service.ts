import { Injectable } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client.js';
import { type Neighbor, VectorRepository } from './vector.repository.js';

@Injectable()
export class AiSearchService {
  constructor(
    private readonly openrouter: OpenRouterClient,
    private readonly vectors: VectorRepository,
  ) {}

  get enabled() {
    return this.openrouter.enabled;
  }

  /** Embed query → cosine top-K kandidat + skor (FR-L2). */
  async search(query: string, k = 50, timeoutMs = 800): Promise<Neighbor[]> {
    const [embedding] = await this.openrouter.embed([query], timeoutMs);
    return this.vectors.nearest(embedding, k);
  }
}
