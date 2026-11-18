import { apiRequest, hasSession } from "../../lib/api";
import { type CurrentUser, getCurrentUser, loginWithLocalDevAccount, loginWithWechat } from "../../lib/auth";

Page({
  data: {
    loading: true,
    user: null as CurrentUser | null,
    error: "",
    localDevAuthEnabled: false,
    profileStepOpen: false,
    wxNickname: "",
    avatarPath: "",
  },
  onShow() {
    const app = getApp<{ globalData: { localDevAuthEnabled: boolean } }>();
    this.setData({ localDevAuthEnabled: app.globalData.localDevAuthEnabled });
    void this.loadSession();
  },
  async loadSession() {
    if (!hasSession()) {
      this.setData({ loading: false, user: null, error: "" });
      return;
    }
    try {
      this.setData({ user: await getCurrentUser(), loading: false, error: "" });
    } catch (error) {
      this.setData({ user: null, loading: false, error: error instanceof Error ? error.message : "登录已失效" });
    }
  },
  openProfileStep() {
    this.setData({ profileStepOpen: true, error: "" });
  },
  skipProfileAndLogin() {
    this.setData({ profileStepOpen: false, wxNickname: "", avatarPath: "" }, () => void this.login());
  },
  onNicknameInput(event: WechatMiniprogram.Input) {
    this.setData({ wxNickname: event.detail.value });
  },
  onChooseAvatar(event: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>) {
    this.setData({ avatarPath: event.detail.avatarUrl });
  },
  async login() {
    this.setData({ loading: true, error: "" });
    try {
      const profile = this.data.profileStepOpen
        ? { wxNickname: this.data.wxNickname.trim() || undefined, avatarPath: this.data.avatarPath || undefined }
        : undefined;
      const result = await loginWithWechat(profile);
      this.setData({
        user: result.user,
        loading: false,
        profileStepOpen: false,
        error: result.authorizationError ?? "",
      });
      wx.showToast({ title: result.authorizationError ? "登录成功，资料待补充" : "登录成功", icon: "none" });
    } catch (error) {
      this.setData({
        loading: false,
        profileStepOpen: true,
        error: error instanceof Error ? error.message : "微信登录失败",
      });
    }
  },
  async localDevLogin() {
    this.setData({ loading: true, error: "" });
    try {
      const user = await loginWithLocalDevAccount();
      this.setData({ user, loading: false });
      wx.showToast({ title: "本地管理员登录成功", icon: "success" });
    } catch (error) {
      this.setData({ loading: false, error: error instanceof Error ? error.message : "本地开发登录失败" });
    }
  },
  scanLogin() {
    if (!this.data.user) {
      wx.showToast({ title: "请先完成微信登录", icon: "none" });
      return;
    }
    wx.scanCode({
      scanType: ["qrCode"],
      success: (result) => void this.handleQr(result.result),
      fail: (reason) => {
        if (!reason.errMsg.includes("cancel")) wx.showToast({ title: "二维码识别失败", icon: "none" });
      },
    });
  },
  async handleQr(value: string) {
    const proof = parseLoginQr(value);
    if (!proof) {
      wx.showToast({ title: "不是有效的 TTZ 登录二维码", icon: "none" });
      return;
    }
    wx.showLoading({ title: "正在验证" });
    try {
      await apiRequest<{ status: "SCANNED" }>(`/auth/qr-sessions/${encodeURIComponent(proof.loginNo)}/scan`, {
        method: "POST",
        data: { nonce: proof.nonce },
      });
      wx.hideLoading();
      wx.navigateTo({ url: `/pages/login-confirm/index?loginNo=${encodeURIComponent(proof.loginNo)}` });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error instanceof Error ? error.message : "登录二维码无效", icon: "none" });
    }
  },
});

function parseLoginQr(value: string) {
  const prefix = "ttz-miniapp://login?";
  if (!value.startsWith(prefix)) return undefined;
  const rawQuery = value.slice(prefix.length);
  if (!rawQuery) return undefined;
  const query = Object.fromEntries(
    rawQuery.split("&").map((pair) => {
      const [key, raw = ""] = pair.split("=", 2);
      return [key, decodeURIComponent(raw)];
    }),
  );
  return query.loginNo && query.nonce ? { loginNo: query.loginNo, nonce: query.nonce } : undefined;
}
