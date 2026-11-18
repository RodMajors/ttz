import { apiRequest, saveSession } from "./api";

export interface CurrentUser {
  id: string;
  name: string;
  wxNickname: string | null;
  guildNickname: string | null;
  avatar: string | null;
  privilege: 0 | 1 | 2;
  isApproved: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
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

export async function loginWithWechat(profile?: { wxNickname?: string; avatarPath?: string }) {
  const code = await new Promise<string>((resolve, reject) => {
    wx.login({
      success(result) {
        if (result.code) resolve(result.code);
        else reject(new Error("微信未返回登录凭证"));
      },
      fail: reject,
    });
  });
  const result = await apiRequest<LoginResult>("/auth/wechat/code-login", {
    method: "POST",
    data: { code, ...(profile?.wxNickname ? { wxNickname: profile.wxNickname } : {}) },
  });
  saveSession(result);
  let user = result.user;
  let authorizationError: string | undefined;
  if (profile?.wxNickname && !user.wxNickname) {
    try {
      user = await apiRequest<CurrentUser>("/auth/wechat-profile", {
        method: "PUT",
        data: { wxNickname: profile.wxNickname },
      });
    } catch (error) {
      authorizationError = error instanceof Error ? error.message : "微信名称保存失败，可稍后在个人资料中重试";
    }
  }
  if (profile?.avatarPath && !user.avatar) {
    try {
      user = await uploadAvatar(profile.avatarPath);
    } catch (error) {
      authorizationError ??= error instanceof Error ? error.message : "头像上传失败，可稍后在个人资料中重试";
    }
  }
  return { user, authorizationError };
}

export async function uploadAvatar(filePath: string) {
  const app = getApp<{ globalData: { apiBaseUrl: string } }>();
  const accessToken = wx.getStorageSync<string>("ttz.accessToken");
  return new Promise<CurrentUser>((resolve, reject) => {
    wx.uploadFile({
      url: `${app.globalData.apiBaseUrl}/auth/avatar`,
      filePath,
      name: "avatar",
      header: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error("头像上传失败，请稍后重试"));
          return;
        }
        const envelope = JSON.parse(response.data) as { data?: CurrentUser; error?: { message?: string } };
        if (!envelope.data) {
          reject(new Error(envelope.error?.message ?? "头像上传失败"));
          return;
        }
        resolve(envelope.data);
      },
      fail: reject,
    });
  });
}

export async function loginWithLocalDevAccount() {
  const app = getApp<{ globalData: { localDevAuthEnabled: boolean } }>();
  if (!app.globalData.localDevAuthEnabled) throw new Error("请使用本地开发构建启用测试登录");
  const result = await apiRequest<LoginResult>("/auth/local-dev-token", { method: "POST" });
  saveSession(result);
  return result.user;
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/auth/me");
}
