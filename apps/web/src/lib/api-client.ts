import type { ZodType } from "zod";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export function isLocalDevelopmentApi() {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const hostname = new URL(API_BASE_URL).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "::1" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError("无法连接 TTZ API，请检查服务是否启动", "NETWORK_ERROR");
  }
  let payload: {
    data?: unknown;
    error?: { code?: string; message?: string };
    requestId?: string;
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new ApiError("TTZ API 返回了无法解析的响应", "INVALID_RESPONSE");
  }
  if (!response.ok)
    throw new ApiError(
      payload.error?.message ?? "请求失败",
      payload.error?.code ?? "REQUEST_FAILED",
      payload.requestId,
    );
  return schema.parse(payload.data);
}
