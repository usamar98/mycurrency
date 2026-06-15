export class UpstreamRequestError extends Error {
  status?: number;
  body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "UpstreamRequestError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJsonWithTimeout<T>(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = 12_000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    const body = await response.text();

    if (!response.ok) {
      throw new UpstreamRequestError(
        `Upstream request failed with HTTP ${response.status}.`,
        response.status,
        body
      );
    }

    if (!body) {
      throw new UpstreamRequestError("Upstream returned an empty response.");
    }

    return JSON.parse(body) as T;
  } catch (error) {
    if (error instanceof UpstreamRequestError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new UpstreamRequestError("Upstream returned invalid JSON.");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamRequestError("Upstream request timed out.");
    }

    throw new UpstreamRequestError(
      error instanceof Error ? error.message : "Upstream request failed."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
