import { apiRequest } from "../../lib/api";

const typeValues = ["raid_progress", "raid_farm", "mythic_plus_push", "mythic_plus_vault", "casual"];
type RaidBoss = { id: string; name: string; icon: string | null; wclId: number; orderIndex: number };
type Raid = { id: string; name: string; bosses: RaidBoss[] };
type ProgressPlan = { id: string; raidId: string; name: string; difficulty: string; bosses: RaidBoss[] };

Page({
  data: {
    typeLabels: ["团本开荒", "团本 Farm", "大秘境冲层", "大秘境低保", "休闲活动"],
    selectedType: 0,
    raids: [] as Raid[],
    plans: [] as ProgressPlan[],
    raidOptions: ["请选择团本"],
    planOptions: ["不使用进度计划"],
    selectedRaidIndex: 0,
    selectedPlanIndex: 0,
    selectedRaidId: "",
    selectedPlanId: "",
    availableBosses: [] as RaidBoss[],
    selectedBosses: [] as string[],
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
  async onLoad() {
    try {
      const [raids, plans] = await Promise.all([
        apiRequest<Raid[]>("/raid-progress/catalog"),
        apiRequest<ProgressPlan[]>("/raid-progress/plans"),
      ]);
      this.setData({
        raids,
        plans,
        raidOptions: ["请选择团本", ...raids.map((raid) => raid.name)],
        planOptions: ["不使用进度计划", ...plans.map((plan) => plan.name)],
      });
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "团本目录加载失败" });
    }
  },
  selectType(event: WechatMiniprogram.PickerChange) {
    this.setData({
      selectedType: Number(event.detail.value),
      selectedRaidId: "",
      selectedPlanId: "",
      selectedBosses: [],
      availableBosses: [],
      selectedRaidIndex: 0,
      selectedPlanIndex: 0,
    });
  },
  selectPlan(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const plan = index > 0 ? this.data.plans[index - 1] : undefined;
    const raidIndex = plan ? this.data.raids.findIndex((raid) => raid.id === plan.raidId) : -1;
    const raid = raidIndex >= 0 ? this.data.raids[raidIndex] : undefined;
    this.setData({
      selectedPlanIndex: index,
      selectedPlanId: plan?.id ?? "",
      selectedRaidIndex: raid ? raidIndex + 1 : 0,
      selectedRaidId: raid?.id ?? "",
      availableBosses: plan?.bosses ?? [],
      selectedBosses: [],
    });
  },
  selectRaid(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const raid = index > 0 ? this.data.raids[index - 1] : undefined;
    this.setData({
      selectedRaidIndex: index,
      selectedRaidId: raid?.id ?? "",
      availableBosses: raid?.bosses ?? [],
      selectedBosses: [],
    });
  },
  selectBosses(event: WechatMiniprogram.CheckboxGroupChange) {
    this.setData({ selectedBosses: event.detail.value.map(String) });
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
          ...(this.data.selectedType < 2
            ? {
                raid: {
                  raidId: this.data.selectedRaidId || undefined,
                  progressPlanId: this.data.selectedPlanId || undefined,
                  targets: this.data.selectedBosses.map((bossId, orderIndex) => ({
                    bossId,
                    orderIndex,
                    strategyVersionId: null,
                  })),
                },
              }
            : {}),
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
