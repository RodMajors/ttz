import { apiRequest } from "../../lib/api";

Page({
  data: { loginNo: "", submitting: false, completed: false, error: "" },
  onLoad(options: Record<string, string | undefined>) {
    this.setData({ loginNo: options.loginNo ? decodeURIComponent(options.loginNo) : "" });
  },
  confirm() {
    void this.submit("confirm");
  },
  cancel() {
    void this.submit("cancel");
  },
  async submit(action: "confirm" | "cancel") {
    if (!this.data.loginNo || this.data.submitting) return;
    this.setData({ submitting: true, error: "" });
    try {
      await apiRequest<{ status: "CONFIRMED" | "CANCELLED" }>(
        `/auth/qr-sessions/${encodeURIComponent(this.data.loginNo)}/${action}`,
        { method: "POST" },
      );
      this.setData({ submitting: false, completed: true });
      wx.showToast({ title: action === "confirm" ? "已确认登录" : "已取消", icon: "success" });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (error) {
      this.setData({ submitting: false, error: error instanceof Error ? error.message : "操作失败" });
    }
  },
});
