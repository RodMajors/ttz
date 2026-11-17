import { apiRequest, clearSession, hasSession } from "../../lib/api";
import { type CurrentUser, getCurrentUser } from "../../lib/auth";

Page({
  data: { loading: true, user: null as CurrentUser | null, error: "" },
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
    const value = event.detail.value as { name?: string; guildNickname?: string };
    try {
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
