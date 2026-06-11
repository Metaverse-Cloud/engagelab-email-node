export const DEFAULT_BASE_URL = "https://email.api.engagelab.cc";
export const TURKEY_BASE_URL = "https://emailapi-tr.engagelab.com";

export interface EngageLabEmailErrorOptions {
  status?: number;
  code?: string | number;
  response?: unknown;
}

export class EngageLabEmailError extends Error {
  status?: number;
  code?: string | number;
  response?: unknown;

  constructor(message: string, options: EngageLabEmailErrorOptions = {}) {
    super(message);
    this.name = "EngageLabEmailError";
    this.status = options.status;
    this.code = options.code;
    this.response = options.response;
  }
}

export interface EngageLabEmailClientOptions {
  apiUser?: string;
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface EngageLabEmailPayload {
  body: Record<string, unknown>;
  [key: string]: unknown;
}

interface EngageLabErrorResponse {
  code?: string | number;
  message?: string;
}

export class EngageLabEmailClient {
  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: EngageLabEmailClientOptions = {}) {
    const {
      apiUser = process.env.ENGAGELAB_API_USER,
      apiKey = process.env.ENGAGELAB_API_KEY,
      baseUrl = DEFAULT_BASE_URL,
      fetchImpl = globalThis.fetch,
      timeoutMs = 30000
    } = options;

    if (!apiUser) {
      throw new TypeError("apiUser is required");
    }
    if (!apiKey) {
      throw new TypeError("apiKey is required");
    }
    if (typeof fetchImpl !== "function") {
      throw new TypeError("fetch is not available; use Node.js 18+ or pass fetchImpl");
    }

    this.apiUser = apiUser;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  send<TResponse = unknown>(payload: EngageLabEmailPayload): Promise<TResponse> {
    return this.request<TResponse>("/v1/mail/send", payload);
  }

  sendTemplate<TResponse = unknown>(payload: EngageLabEmailPayload): Promise<TResponse> {
    return this.request<TResponse>("/v1/mail/sendtemplate", payload);
  }

  sendCalendar<TResponse = unknown>(payload: EngageLabEmailPayload): Promise<TResponse> {
    return this.request<TResponse>("/v1/mail/sendcalendar", payload);
  }

  sendMime<TResponse = unknown>(payload: EngageLabEmailPayload): Promise<TResponse> {
    return this.request<TResponse>("/v1/mail/send_mime", payload);
  }

  async request<TResponse = unknown>(path: string, payload: EngageLabEmailPayload): Promise<TResponse> {
    validatePayload(payload);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Authorization": this.authorizationHeader(),
          "Content-Type": "application/json; charset=utf-8",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await parseResponse(response);
      if (!response.ok) {
        const errorResponse = isObject(data) ? data as EngageLabErrorResponse : undefined;
        throw new EngageLabEmailError(
          errorResponse?.message || response.statusText || "EngageLab Email request failed",
          {
            status: response.status,
            code: errorResponse?.code,
            response: data
          }
        );
      }

      return data as TResponse;
    } catch (error) {
      if (isAbortError(error)) {
        throw new EngageLabEmailError(`EngageLab Email request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  authorizationHeader(): string {
    const token = Buffer.from(`${this.apiUser}:${this.apiKey}`, "utf8").toString("base64");
    return `Basic ${token}`;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function validatePayload(payload: EngageLabEmailPayload): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("payload must be an object");
  }
  if (!isObject(payload.body)) {
    throw new TypeError("payload.body must be an object");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
