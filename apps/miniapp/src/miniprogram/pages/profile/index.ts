import { apiRequest, clearSession, hasSession } from "../../lib/api";
import { type CurrentUser, getCurrentUser, uploadAvatar } from "../../lib/auth";

Page({
  data: { loading: true, uploadingAvatar: false, user: null as CurrentUser | null, error: "" },
  onShow() {
    void this.load();
  },
  async load() {
    if (!hasSession()) {
      this.setData({ loading: false, user: null });
      return;
    }
    try {
      this.setData({ user: await getCurrentUser(), loading: false, error: "" });
    } catch (error) {
      this.setData({ loading: false, error: error instanceof Error ? error.message : "加载失败" });
    }
  },
  async save(event: WechatMiniprogram.CustomEvent) {
    const value = event.detail.value as { name?: string; guildNickname?: string; wxNickname?: string };
    try {
      if (!this.data.user?.wxNickname && value.wxNickname?.trim()) {
        await apiRequest<CurrentUser>("/auth/wechat-profile", {
          method: "PUT",
          data: { wxNickname: value.wxNickname.trim() },
        });
      }
      const user = await apiRequest<CurrentUser>("/auth/profile", {
        method: "PUT",
        data: { name: value.name || null, guildNickname: value.guildNickname },
      });
      this.setData({ user, error: "" });
      wx.showToast({ title: "资料已保存", icon: "success" });
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "保存失败" });
    }
  },
  async onChooseAvatar(event: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>) {
    if (this.data.uploadingAvatar) return;
    this.setData({ uploadingAvatar: true, error: "" });
    try {
      const user = await uploadAvatar(event.detail.avatarUrl);
      this.setData({ user, error: "" });
      wx.showToast({ title: "头像已更新", icon: "success" });
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "头像上传失败" });
    } finally {
      this.setData({ uploadingAvatar: false });
    }
  },
  async logout() {
    try {
      await apiRequest<{ loggedOut: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      this.setData({ user: null });
      wx.switchTab({ url: "/pages/index/index" });
    }
  },
});
