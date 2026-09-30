import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouter } from '@openrouter/sdk';
import type { Env } from '../../infra/config/env.schema.js';

const BATCH = 64;

/** Embeddings via OpenRouter. API key hanya di backend, tidak pernah ke browser. */
@Injectable()
export class OpenRouterClient {
  private readonly sdk?: OpenRouter;
  readonly model: string;
  readonly dims: number;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('OPENROUTER_API_KEY', { infer: true });
    this.model = config.get('EMBEDDING_MODEL', { infer: true });
    this.dims = config.get('EMBEDDING_DIMS', { infer: true });
    if (apiKey) {
      this.sdk = new OpenRouter({
        apiKey,
        httpReferer: config.get('PORTAL_URL', { infer: true }),
        appTitle: 'Pustaka',
      });
    }
  }

  get enabled() {
    return !!this.sdk;
  }

  /** Embed banyak teks (dipecah per batch), retry 2× dengan backoff. */
  async embed(texts: string[], timeoutMs = 15_000): Promise<number[][]> {
    if (!this.sdk) throw new Error('OPENROUTER_API_KEY belum diisi');
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const res = await this.sdk.embeddings.generate(
        {
          requestBody: {
            model: this.model,
            input: texts.slice(i, i + BATCH),
            dimensions: this.dims,
          },
        },
        {
          timeoutMs,
          retries: {
            strategy: 'backoff',
            backoff: {
              initialInterval: 300,
              maxInterval: 2_000,
              exponent: 2,
              maxElapsedTime: timeoutMs * 3,
            },
            retryConnectionErrors: true,
          },
        },
      );
      if (typeof res === 'string')
        throw new Error('Respons embeddings tidak terduga');
      const sorted = [...res.data].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      );
      for (const d of sorted) {
        if (typeof d.embedding === 'string')
          throw new Error('Format embedding base64 tidak didukung');
        out.push(d.embedding);
      }
    }
    return out;
  }
}
