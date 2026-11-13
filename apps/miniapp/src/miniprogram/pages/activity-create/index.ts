import { apiRequest } from "../../lib/api";

const typeValues = ["raid_progress", "raid_farm", "mythic_plus_push", "mythic_plus_vault", "casual"];

Page({
  data: {
    typeLabels: ["团本开荒", "团本 Farm", "大秘境冲层", "大秘境低保", "休闲活动"],
    selectedType: 0,
    beginDate: dateOffset(1),
    beginTime: "21:00",
    deadlineDate: dateOffset(1),
    deadlineTime: "19:00",
    attendanceEnabled: true,
    submitting: false,
    error: "",
  },
  selectType(event: WechatMiniprogram.PickerChange) {
    this.setData({ selectedType: Number(event.detail.value) });
  },
  selectBeginDate(event: WechatMiniprogram.PickerChange) {
    this.setData({ beginDate: String(event.detail.value) });
  },
  selectBeginTime(event: WechatMiniprogram.PickerChange) {
    this.setData({ beginTime: String(event.detail.value) });
  },
  selectDeadlineDate(event: WechatMiniprogram.PickerChange) {
    this.setData({ deadlineDate: String(event.detail.value) });
  },
  selectDeadlineTime(event: WechatMiniprogram.PickerChange) {
    this.setData({ deadlineTime: String(event.detail.value) });
  },
  toggleAttendance(event: WechatMiniprogram.SwitchChange) {
    this.setData({ attendanceEnabled: event.detail.value });
  },
  async submit(event: WechatMiniprogram.CustomEvent) {
    const value = event.detail.value as {
      name: string;
      maxPlayers: string;
      durationMinutes: string;
      description: string;
      passphrase: string;
    };
    this.setData({ submitting: true, error: "" });
    try {
      const activity = await apiRequest<{ id: string }>("/activities", {
        method: "POST",
        data: {
          name: value.name,
          type: typeValues[this.data.selectedType],
          description: value.description || undefined,
          passphrase: value.passphrase || null,
          beginAt: localDateTime(this.data.beginDate, this.data.beginTime),
          signupDeadline: localDateTime(this.data.deadlineDate, this.data.deadlineTime),
          durationMinutes: Number(value.durationMinutes),
          maxPlayers: Number(value.maxPlayers),
          attendanceEnabled: this.data.attendanceEnabled,
        },
      });
      wx.showToast({ title: "草稿已创建", icon: "success" });
      setTimeout(() => wx.redirectTo({ url: `/pages/activity-detail/index?id=${activity.id}` }), 600);
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "创建活动失败" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

function dateOffset(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function localDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
