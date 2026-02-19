/**
 * OpenAI Client — lightweight wrapper for OpenAI's API.
 * Zero external dependencies. Uses native fetch.
 */

// ── Types ────────────────────────────────────────

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  /** Max tokens for the response (default: 4096) */
  maxTokens?: number;
  /** Temperature (default: 0.7) */
  temperature?: number;
  /** Response format — use 'json_object' for structured output */
  responseFormat?: 'text' | 'json_object';
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIResponse {
  id: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
  model: string;
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ── Constants ────────────────────────────────────

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const DEFAULT_RETRY_DELAYS = [2000, 5000, 15000]; // ms

// ── Client ───────────────────────────────────────

export class OpenAIClient {
  private config: Required<OpenAIConfig>;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: OpenAIConfig) {
    if (!config.apiKey) {
      throw new Error('OPENAI_API_KEY is required.');
    }

    const isReasoning =
      (config.model || 'gpt-4o').startsWith('o1-') ||
      (config.model || 'gpt-4o').startsWith('o3-') ||
      (config.model || 'gpt-4o').startsWith('gpt-5-');
    const defaultMaxTokens = isReasoning ? 60000 : 4096;

    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4o',
      maxTokens: config.maxTokens ?? defaultMaxTokens,
      temperature: config.temperature ?? 0.7,
      responseFormat: config.responseFormat ?? 'json_object',
    };
  }

  /**
   * Send a chat completion request to OpenAI.
   * Automatically handles rate limiting with exponential backoff.
   */
  async chat(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
    return this.withRetry(async () => {
      await this.throttle();

      const isReasoningModel =
        this.config.model.startsWith('o1-') ||
        this.config.model.startsWith('o3-') ||
        this.config.model.startsWith('gpt-5-');

      // Adapter for reasoning models: convert 'system' to 'user'
      let finalMessages = messages;
      if (isReasoningModel) {
        finalMessages = messages.map((m) =>
          m.role === 'system' ? { ...m, role: 'user' } : m
        );
      }

      const body: Record<string, unknown> = {
        model: this.config.model,
        messages: finalMessages,
        stream: false,
      };

      if (isReasoningModel) {
        body.max_completion_tokens = this.config.maxTokens;
        // strict temperature rules for reasoning models (usually fixed at 1)
      } else {
        body.max_tokens = this.config.maxTokens;
        body.temperature = this.config.temperature;
      }

      if (this.config.responseFormat === 'json_object' && !isReasoningModel) {
        body.response_format = { type: 'json_object' };
      }

      if (isReasoningModel) {
        console.log(
          `   🧠 Reasoning model (${this.config.model}) is thinking... this may take 1-2 minutes.`
        );
      }

      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      this.requestCount++;
      this.lastRequestTime = Date.now();

      if (!response.ok) {
        const errorBody = (await response
          .json()
          .catch(() => ({}))) as OpenAIError;
        const msg = errorBody?.error?.message || response.statusText;

        if (response.status === 429) {
          throw new RateLimitError(msg);
        }
        if (response.status >= 500) {
          throw new ServerError(msg);
        }

        throw new Error(`OpenAI API error (${response.status}): ${msg}`);
      }

      return (await response.json()) as OpenAIResponse;
    });
  }

  /**
   * Send a chat request and parse the JSON response content.
   */
  async chatJSON<T = unknown>(
    messages: OpenAIMessage[]
  ): Promise<{
    data: T;
    usage: OpenAIUsage;
    model: string;
  }> {
    const response = await this.chat(messages);
    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error(
        '❌ RAW OPENAI RESPONSE:',
        JSON.stringify(response, null, 2)
      );
      throw new Error('Empty response from OpenAI (see logs)');
    }

    try {
      const data = JSON.parse(content) as T;
      return {
        data,
        usage: response.usage,
        model: response.model,
      };
    } catch {
      throw new Error(
        `Failed to parse JSON response from OpenAI. Content starts with: ${content.slice(0, 200)}`
      );
    }
  }

  /** Number of API calls made so far */
  get stats() {
    return { requestCount: this.requestCount };
  }

  // ── Rate limiting ────────────────────────────

  /**
   * Simple throttle to allow some spacing between requests if needed.
   */
  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    const minDelay = 500; // ms
    if (elapsed < minDelay) {
      await sleep(minDelay - elapsed);
    }
  }

  /**
   * Retry with exponential backoff.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= DEFAULT_RETRY_DELAYS.length; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isRetryable =
          error instanceof RateLimitError || error instanceof ServerError;

        if (!isRetryable || attempt === DEFAULT_RETRY_DELAYS.length) {
          throw error;
        }

        const delay = DEFAULT_RETRY_DELAYS[attempt];
        console.warn(
          `⏳ Rate limited / server error. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${DEFAULT_RETRY_DELAYS.length})`
        );
        await sleep(delay);
      }
    }

    throw new Error('Retry exhausted');
  }
}

// ── Error classes ────────────────────────────────

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

// ── Helpers ──────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
