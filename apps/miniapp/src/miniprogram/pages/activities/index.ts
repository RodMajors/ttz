import { apiRequest, hasSession } from "../../lib/api";

interface ActivitySummary {
  id: string;
  name: string;
  type: string;
  status: "DRAFT" | "PUBLISHED" | "FINISHED" | "CANCELLED";
  beginAt: string;
  signupDeadline: string | null;
  signupCount: number;
  confirmedCount: number;
  creatorName: string;
}

Page({
  data: {
    loading: true,
    activities: [] as Array<ActivitySummary & { beginAtLabel: string; statusLabel: string }>,
    error: "",
  },
  onShow() {
    void this.load();
  },
  async load() {
    if (!hasSession()) {
      this.setData({ loading: false, activities: [], error: "请先从首页完成微信登录" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const result = await apiRequest<{ items: ActivitySummary[] }>("/activities?page=1&pageSize=30");
      this.setData({
        loading: false,
        activities: result.items.map((activity) => ({
          ...activity,
          beginAtLabel: formatDate(activity.beginAt),
          statusLabel: statusLabels[activity.status],
        })),
      });
    } catch (error) {
      this.setData({ loading: false, error: error instanceof Error ? error.message : "活动加载失败" });
    }
  },
  openActivity(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id ?? "");
    if (id) wx.navigateTo({ url: `/pages/activity-detail/index?id=${encodeURIComponent(id)}` });
  },
  createActivity() {
    wx.navigateTo({ url: "/pages/activity-create/index" });
  },
});

const statusLabels = { DRAFT: "草稿", PUBLISHED: "报名中", FINISHED: "已结束", CANCELLED: "已取消" } as const;

function formatDate(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
