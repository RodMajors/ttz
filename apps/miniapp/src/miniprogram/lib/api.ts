type ApiEnvelope<T> = { data?: T; error?: { code?: string; message?: string }; requestId?: string };
type Session = { accessToken: string; refreshToken: string; accessExpiresAt: string; refreshExpiresAt: string };
type ApiRequestOptions = Omit<WechatMiniprogram.RequestOption, "url">;

const ACCESS_TOKEN_KEY = "ttz.accessToken";
const REFRESH_TOKEN_KEY = "ttz.refreshToken";
let refreshPromise: Promise<void> | undefined;

export class MiniappApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    if (!(error instanceof MiniappApiError) || error.statusCode !== 401 || path === "/auth/token/refresh") throw error;
    const refreshToken = wx.getStorageSync<string>(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw error;
    refreshPromise ??= refreshSession(refreshToken).finally(() => {
      refreshPromise = undefined;
    });
    await refreshPromise;
    return rawRequest<T>(path, options);
  }
}

export function hasSession() {
  return Boolean(wx.getStorageSync<string>(ACCESS_TOKEN_KEY));
}

export function saveSession(session: Session) {
  wx.setStorageSync(ACCESS_TOKEN_KEY, session.accessToken);
  wx.setStorageSync(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function clearSession() {
  wx.removeStorageSync(ACCESS_TOKEN_KEY);
  wx.removeStorageSync(REFRESH_TOKEN_KEY);
}

async function refreshSession(refreshToken: string) {
  try {
    const session = await rawRequest<Session>(
      "/auth/token/refresh",
      {
        method: "POST",
        data: { refreshToken },
      },
      false,
    );
    saveSession(session);
  } catch (error) {
    clearSession();
    throw error;
  }
}

function rawRequest<T>(path: string, options: ApiRequestOptions, authenticated = true): Promise<T> {
  const app = getApp<{ globalData: { apiBaseUrl: string; localDevAuthEnabled: boolean } }>();
  const accessToken = authenticated ? wx.getStorageSync<string>(ACCESS_TOKEN_KEY) : "";
  return new Promise((resolve, reject) => {
    wx.request<ApiEnvelope<T>>({
      ...options,
      url: `${app.globalData.apiBaseUrl}${path}`,
      header: {
        accept: "application/json",
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(options.header ?? {}),
      },
      success(response) {
        const payload = response.data;
        if (response.statusCode >= 200 && response.statusCode < 300 && payload.data !== undefined) {
          resolve(payload.data);
          return;
        }
        reject(
          new MiniappApiError(
            payload.error?.message ?? "请求失败",
            payload.error?.code ?? "REQUEST_FAILED",
            response.statusCode,
          ),
        );
      },
      fail(reason) {
        reject(new MiniappApiError(reason.errMsg || "网络请求失败", "NETWORK_ERROR", 0));
      },
    });
  });
}
