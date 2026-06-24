import type { AppConfig } from '../config.js';

export interface ModelResponse<T> {
  data: T;
  provider: string;
  costUsd: number;
}

export interface AiProvider {
  generate<T>(task: string, payload: unknown): Promise<ModelResponse<T>>;
}

export class CompatibleAiProvider implements AiProvider {
  constructor(private readonly config: AppConfig) {}

  async generate<T>(task: string, payload: unknown): Promise<ModelResponse<T>> {
    const response = await fetch(this.config.AI_API_URL!, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.AI_MODEL,
        task,
        input: payload,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const body = await response.json() as { output?: T; data?: T; usage?: { estimated_cost_usd?: number } };
    const data = body.output ?? body.data;
    if (!data) throw new Error('AI provider returned no structured output');
    return { data, provider: 'compatible', costUsd: body.usage?.estimated_cost_usd ?? 0 };
  }
}

export class LocalAiProvider implements AiProvider {
  async generate<T>(): Promise<ModelResponse<T>> {
    throw new Error('Local provider delegates to deterministic agent fallback');
  }
}
