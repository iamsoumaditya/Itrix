export class GeminiPoolExhaustedError extends Error {
  constructor(message?: string) {
    super(message || "All Gemini API keys in the pool are rate-limited or exhausted.");
    this.name = "GeminiPoolExhaustedError";
  }
}

export type KeyStatus = "available" | "rate_limited" | "failed";

export interface KeyState {
  key: string;
  status: KeyStatus;
  retryAfter: number; // timestamp in ms
  lastUsed: number;   // timestamp in ms
  errorCount: number;
  consecutiveSuccesses: number;
}

export class GeminiClientPool {
  private keyStates: KeyState[] = [];

  constructor() {
    this.initKeys();
  }

  /**
   * Initializes keys from GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY.
   */
  public initKeys(customKeys?: string[]) {
    let keys: string[] = [];
    if (customKeys && customKeys.length > 0) {
      keys = customKeys;
    } else {
      const multiKeys = process.env.GEMINI_API_KEYS;
      const singleKey = process.env.GEMINI_API_KEY;

      if (multiKeys) {
        keys = multiKeys.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
      }
      if (keys.length === 0 && singleKey && singleKey.trim().length > 0) {
        keys = [singleKey.trim()];
      }
    }

    const uniqueKeys = Array.from(new Set(keys));
    this.keyStates = uniqueKeys.map((key) => ({
      key,
      status: "available",
      retryAfter: 0,
      lastUsed: 0,
      errorCount: 0,
      consecutiveSuccesses: 0,
    }));
  }

  /**
   * Selects an optimal key using least-recently-used & cooldown status checks.
   */
  private async getAvailableKey(): Promise<KeyState | null> {
    const now = Date.now();

    // 1. Recover rate-limited keys whose cooldown has expired
    for (const kState of this.keyStates) {
      if (kState.status === "rate_limited" && now >= kState.retryAfter) {
        kState.status = "available";
        kState.retryAfter = 0;
      }
    }

    // 2. Filter available keys
    const available = this.keyStates.filter((k) => k.status === "available");
    if (available.length > 0) {
      // Pick least-recently-used key
      available.sort((a, b) => a.lastUsed - b.lastUsed);
      const chosen = available[0];
      chosen.lastUsed = now;
      return chosen;
    }

    // 3. If all keys are rate-limited, check if we can wait for the soonest cooldown
    const rateLimited = this.keyStates.filter((k) => k.status === "rate_limited");
    if (rateLimited.length > 0) {
      rateLimited.sort((a, b) => a.retryAfter - b.retryAfter);
      const soonest = rateLimited[0];
      const waitTime = soonest.retryAfter - now;

      // Max wait cap of 10 seconds for serverless execution safety
      if (waitTime > 0 && waitTime <= 10_000) {
        if (process.env.DEBUG || process.env.DEBUG_MODE) {
          console.log(`[GeminiClientPool] All keys rate-limited. Waiting ${Math.round(waitTime / 1000)}s for cooldown...`);
        }
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        soonest.status = "available";
        soonest.retryAfter = 0;
        soonest.lastUsed = Date.now();
        return soonest;
      }
    }

    return null;
  }

  /**
   * Executes a Gemini API generateContent request with key rotation, differentiated retries, and backoff.
   */
  public async generateContent(
    models: string[],
    prompt: string,
    options?: { responseMimeType?: string }
  ): Promise<{ text: string; raw: unknown; model: string }> {
    if (this.keyStates.length === 0) {
      this.initKeys();
    }

    if (this.keyStates.length === 0) {
      throw new GeminiPoolExhaustedError("No Gemini API keys configured in GEMINI_API_KEY or GEMINI_API_KEYS.");
    }

    const attemptedKeyIndices = new Set<number>();

    while (attemptedKeyIndices.size < this.keyStates.length) {
      const keyState = await this.getAvailableKey();
      if (!keyState) {
        break;
      }

      const keyIndex = this.keyStates.indexOf(keyState);
      attemptedKeyIndices.add(keyIndex);

      for (const m of models) {
        let backoffDelay = 1000;
        const maxServiceRetries = 3;

        for (let attempt = 1; attempt <= maxServiceRetries; attempt++) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${keyState.key}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: options?.responseMimeType
                    ? { responseMimeType: options.responseMimeType }
                    : undefined,
                }),
              }
            );

            if (res.ok) {
              const data = await res.json();
              keyState.errorCount = 0;
              keyState.consecutiveSuccesses++;
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
              return { text, raw: data, model: m };
            }

            const status = res.status;
            const errBody = await res.text();

            // 429 Rate Limit Exceeded
            if (status === 429) {
              const retryAfterHeader = res.headers.get("retry-after");
              let cooldownMs = 60_000;
              if (retryAfterHeader) {
                const parsedSec = parseInt(retryAfterHeader, 10);
                if (!isNaN(parsedSec)) cooldownMs = parsedSec * 1000;
              }
              keyState.status = "rate_limited";
              keyState.retryAfter = Date.now() + cooldownMs;
              console.warn(
                `[GeminiClientPool WARN] Key ending in ...${keyState.key.slice(-4)} rate-limited (429). Cooling down for ${Math.round(cooldownMs / 1000)}s.`
              );
              // Break model loop to immediately try another key in pool
              break;
            }

            // 400 / 401 / 403 Invalid or Revoked API Key
            const isInvalidKey =
              status === 401 ||
              status === 403 ||
              (status === 400 && (errBody.includes("API_KEY_INVALID") || errBody.includes("API key not valid")));

            if (isInvalidKey) {
              keyState.status = "failed";
              console.error(
                `[GeminiClientPool CRITICAL ALERT] Key ending in ...${keyState.key.slice(-4)} permanently failed (HTTP ${status}). Excluding from pool.`
              );
              // Break model loop to immediately try another key in pool
              break;
            }

            // 404 Model Not Found / Deprecated
            if (status === 404) {
              console.warn(
                `[GeminiClientPool WARN] Model ${m} returned 404 Not Found (deprecated or unavailable). Skipping model ${m}.`
              );
              // Break out of attempt loop to try next candidate model
              break;
            }

            // 503 / 500 / 502 / 504 Service Overload / Infrastructure Error
            if (status === 503 || status >= 500) {
              console.warn(
                `[GeminiClientPool WARN] Model ${m} returned HTTP ${status} (Attempt ${attempt}/${maxServiceRetries}). Retrying key in ${backoffDelay}ms...`
              );
              if (attempt < maxServiceRetries) {
                await new Promise((r) => setTimeout(r, backoffDelay));
                backoffDelay *= 2;
                continue;
              }
            }

            console.warn(`[GeminiClientPool WARN] Model ${m} returned status ${status}: ${errBody}`);
            break;
          } catch (err) {
            console.warn(`[GeminiClientPool ERROR] Exception fetching model ${m}:`, err);
            if (attempt < maxServiceRetries) {
              await new Promise((r) => setTimeout(r, backoffDelay));
              backoffDelay *= 2;
              continue;
            }
          }
        }
      }
    }

    throw new GeminiPoolExhaustedError("All Gemini API keys in the pool are rate-limited or exhausted.");
  }

  /**
   * Generates a 768-dimensional embedding vector with key rotation and resilience.
   */
  public async embedContent(
    models: string[],
    textToEmbed: string
  ): Promise<{ embedding: number[]; model: string }> {
    if (this.keyStates.length === 0) {
      this.initKeys();
    }

    if (this.keyStates.length === 0) {
      throw new GeminiPoolExhaustedError("No Gemini API keys configured in GEMINI_API_KEY or GEMINI_API_KEYS.");
    }

    const attemptedKeyIndices = new Set<number>();

    while (attemptedKeyIndices.size < this.keyStates.length) {
      const keyState = await this.getAvailableKey();
      if (!keyState) {
        break;
      }

      const keyIndex = this.keyStates.indexOf(keyState);
      attemptedKeyIndices.add(keyIndex);

      for (const m of models) {
        let backoffDelay = 1000;
        const maxServiceRetries = 3;

        for (let attempt = 1; attempt <= maxServiceRetries; attempt++) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:embedContent?key=${keyState.key}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: { parts: [{ text: textToEmbed }] },
                  outputDimensionality: 768,
                }),
              }
            );

            if (res.ok) {
              const data = await res.json();
              if (data.embedding?.values && Array.isArray(data.embedding.values)) {
                keyState.errorCount = 0;
                keyState.consecutiveSuccesses++;
                return { embedding: data.embedding.values, model: m };
              }
            }

            const status = res.status;
            const errBody = await res.text();

            if (status === 429) {
              const retryAfterHeader = res.headers.get("retry-after");
              let cooldownMs = 60_000;
              if (retryAfterHeader) {
                const parsedSec = parseInt(retryAfterHeader, 10);
                if (!isNaN(parsedSec)) cooldownMs = parsedSec * 1000;
              }
              keyState.status = "rate_limited";
              keyState.retryAfter = Date.now() + cooldownMs;
              console.warn(
                `[GeminiClientPool WARN] Embedding Key ending in ...${keyState.key.slice(-4)} rate-limited (429). Cooldown: ${Math.round(cooldownMs / 1000)}s.`
              );
              break;
            }

            const isInvalidKey =
              status === 401 ||
              status === 403 ||
              (status === 400 && (errBody.includes("API_KEY_INVALID") || errBody.includes("API key not valid")));

            if (isInvalidKey) {
              keyState.status = "failed";
              console.error(
                `[GeminiClientPool CRITICAL ALERT] Embedding Key ending in ...${keyState.key.slice(-4)} permanently failed (HTTP ${status}). Excluding from pool.`
              );
              break;
            }

            if (status === 404) {
              console.warn(
                `[GeminiClientPool WARN] Embedding Model ${m} returned 404 Not Found (deprecated or unavailable). Skipping model ${m}.`
              );
              break;
            }

            if (status === 503 || status >= 500) {
              if (attempt < maxServiceRetries) {
                await new Promise((r) => setTimeout(r, backoffDelay));
                backoffDelay *= 2;
                continue;
              }
            }

            break;
          } catch {
            if (attempt < maxServiceRetries) {
              await new Promise((r) => setTimeout(r, backoffDelay));
              backoffDelay *= 2;
              continue;
            }
          }
        }
      }
    }

    throw new GeminiPoolExhaustedError("All Gemini API keys in the pool are rate-limited or exhausted.");
  }

  /**
   * Returns diagnostic stats for pool monitoring.
   */
  public getPoolStats() {
    return {
      totalKeys: this.keyStates.length,
      availableKeys: this.keyStates.filter((k) => k.status === "available").length,
      rateLimitedKeys: this.keyStates.filter((k) => k.status === "rate_limited").length,
      failedKeys: this.keyStates.filter((k) => k.status === "failed").length,
      states: this.keyStates.map((k) => ({
        keyEnding: k.key.length >= 4 ? `...${k.key.slice(-4)}` : "...",
        status: k.status,
        retryAfterSecRemaining: Math.max(0, Math.round((k.retryAfter - Date.now()) / 1000)),
        lastUsedAgeSec: Math.round((Date.now() - k.lastUsed) / 1000),
      })),
    };
  }
}

export const geminiPool = new GeminiClientPool();
