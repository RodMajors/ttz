import { apiRequest, saveSession } from "./api";

export interface CurrentUser {
  id: string;
  name: string;
  wxNickname: string | null;
  guildNickname: string | null;
  privilege: 0 | 1 | 2;
  isApproved: boolean;
  profileComplete: boolean;
  status: number;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: CurrentUser;
}

export async function loginWithWechat() {
  const code = await new Promise<string>((resolve, reject) => {
    wx.login({
      success(result) {
        if (result.code) resolve(result.code);
        else reject(new Error("微信未返回登录凭证"));
      },
      fail: reject,
    });
  });
  const result = await apiRequest<LoginResult>("/auth/wechat/code-login", { method: "POST", data: { code } });
  saveSession(result);
  return result.user;
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/auth/me");
}
