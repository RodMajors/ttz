import { apiRequest } from "../../lib/api";

const typeValues = ["raid_progress", "raid_farm", "mythic_plus_push", "mythic_plus_vault", "casual"];

Page({
  data: {
    typeLabels: ["团本开荒", "团本 Farm", "大秘境冲层", "大秘境低保", "休闲活动"],
    selectedType: 0,
    beginDate: dateOffset(1),
    beginTime: "21:00",
    deadlineDate: dateOffset(1),
    deadlineTime: "20:00",
    teamUpDate: dateOffset(1),
    teamUpTime: "20:40",
    followsBeginDeadline: true,
    followsBeginTeamUp: true,
    hasRosterGuidance: false,
    attendanceEnabled: true,
    submitting: false,
    error: "",
  },
  selectType(event: WechatMiniprogram.PickerChange) {
    this.setData({ selectedType: Number(event.detail.value) });
  },
  selectBeginDate(event: WechatMiniprogram.PickerChange) {
    const beginDate = String(event.detail.value);
    const changes: Record<string, string> = { beginDate };
    if (this.data.followsBeginDeadline) {
      const deadline = shiftLocalDateTime(beginDate, this.data.beginTime, -60);
      changes.deadlineDate = deadline.date;
      changes.deadlineTime = deadline.time;
    }
    if (this.data.followsBeginTeamUp) {
      const teamUp = shiftLocalDateTime(beginDate, this.data.beginTime, -20);
      changes.teamUpDate = teamUp.date;
      changes.teamUpTime = teamUp.time;
    }
    this.setData(changes);
  },
  selectBeginTime(event: WechatMiniprogram.PickerChange) {
    const beginTime = String(event.detail.value);
    const changes: Record<string, string> = { beginTime };
    if (this.data.followsBeginDeadline) {
      const deadline = shiftLocalDateTime(this.data.beginDate, beginTime, -60);
      changes.deadlineDate = deadline.date;
      changes.deadlineTime = deadline.time;
    }
    if (this.data.followsBeginTeamUp) {
      const teamUp = shiftLocalDateTime(this.data.beginDate, beginTime, -20);
      changes.teamUpDate = teamUp.date;
      changes.teamUpTime = teamUp.time;
    }
    this.setData(changes);
  },
  selectDeadlineDate(event: WechatMiniprogram.PickerChange) {
    this.setData({ deadlineDate: String(event.detail.value), followsBeginDeadline: false });
  },
  selectDeadlineTime(event: WechatMiniprogram.PickerChange) {
    this.setData({ deadlineTime: String(event.detail.value), followsBeginDeadline: false });
  },
  selectTeamUpDate(event: WechatMiniprogram.PickerChange) {
    this.setData({ teamUpDate: String(event.detail.value), followsBeginTeamUp: false });
  },
  selectTeamUpTime(event: WechatMiniprogram.PickerChange) {
    this.setData({ teamUpTime: String(event.detail.value), followsBeginTeamUp: false });
  },
  toggleAttendance(event: WechatMiniprogram.SwitchChange) {
    this.setData({ attendanceEnabled: event.detail.value });
  },
  toggleRosterGuidance(event: WechatMiniprogram.SwitchChange) {
    this.setData({ hasRosterGuidance: event.detail.value });
  },
  async submit(event: WechatMiniprogram.CustomEvent) {
    const value = event.detail.value as {
      name: string;
      maxPlayers: string;
      tankSlots: string;
      healerSlots: string;
      meleeSlots: string;
      rangedSlots: string;
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
          teamUpAt: localDateTime(this.data.teamUpDate, this.data.teamUpTime),
          durationMinutes: Number(value.durationMinutes),
          maxPlayers: this.data.hasRosterGuidance && value.maxPlayers !== "" ? Number(value.maxPlayers) : null,
          tankSlots: this.data.hasRosterGuidance ? optionalNumber(value.tankSlots) : null,
          healerSlots: this.data.hasRosterGuidance ? optionalNumber(value.healerSlots) : null,
          meleeSlots: this.data.hasRosterGuidance ? optionalNumber(value.meleeSlots) : null,
          rangedSlots: this.data.hasRosterGuidance ? optionalNumber(value.rangedSlots) : null,
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
function shiftLocalDateTime(date: string, time: string, minutes: number) {
  const value = new Date(`${date}T${time}:00`);
  value.setMinutes(value.getMinutes() + minutes);
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}
function optionalNumber(value: string | undefined) {
  return value == null || value === "" ? null : Number(value);
}
