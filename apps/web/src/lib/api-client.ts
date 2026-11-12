import type { ZodType } from "zod";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (init?.body) headers.set("content-type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  const payload = (await response.json()) as {
    data?: unknown;
    error?: { code?: string; message?: string };
    requestId?: string;
  };
  if (!response.ok)
    throw new ApiError(
      payload.error?.message ?? "请求失败",
      payload.error?.code ?? "REQUEST_FAILED",
      payload.requestId,
    );
  return schema.parse(payload.data);
}
