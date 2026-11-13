import { apiRequest } from "../../lib/api";

interface Character {
  id: string;
  name: string;
  realm: string;
  isMain: boolean;
  isRetired: boolean;
}
interface Signup {
  id: string;
  status: string;
  character: Character;
  preferredRole: string | null;
  note: string | null;
}
interface ActivityDetail {
  id: string;
  name: string;
  description: string | null;
  beginAt: string;
  teamUpAt: string;
  signupDeadline: string | null;
  status: string;
  maxPlayers: number;
  canSignup: boolean;
  canChangeMySignup: boolean;
  mySignup: Signup | null;
}

const roleValues = ["", "TANK", "HEALER", "MELEE", "RANGED"];

Page({
  data: {
    id: "",
    loading: true,
    activity: null as (ActivityDetail & { beginAtLabel: string; teamUpAtLabel: string; deadlineLabel: string }) | null,
    characters: [] as Character[],
    characterLabels: [] as string[],
    selectedCharacterIndex: 0,
    roleLabels: ["不指定", "坦克", "治疗", "近战", "远程"],
    selectedRoleIndex: 0,
    error: "",
    submitting: false,
  },
  onLoad(options: Record<string, string | undefined>) {
    this.setData({ id: options.id ? decodeURIComponent(options.id) : "" });
    void this.load();
  },
  async load() {
    if (!this.data.id) return;
    this.setData({ loading: true, error: "" });
    try {
      const [activity, characters] = await Promise.all([
        apiRequest<ActivityDetail>(`/activities/${encodeURIComponent(this.data.id)}`),
        apiRequest<Character[]>("/characters"),
      ]);
      const activeCharacters = characters.filter((character) => !character.isRetired);
      const currentIndex = Math.max(
        0,
        activeCharacters.findIndex((character) => character.id === activity.mySignup?.character.id),
      );
      const roleIndex = Math.max(0, roleValues.indexOf(activity.mySignup?.preferredRole ?? ""));
      this.setData({
        loading: false,
        activity: {
          ...activity,
          beginAtLabel: formatDate(activity.beginAt),
          teamUpAtLabel: formatDate(activity.teamUpAt),
          deadlineLabel: activity.signupDeadline ? formatDate(activity.signupDeadline) : "未设置",
        },
        characters: activeCharacters,
        characterLabels: activeCharacters.map(
          (character) => `${character.name} · ${character.realm}${character.isMain ? "（主角色）" : ""}`,
        ),
        selectedCharacterIndex: currentIndex,
        selectedRoleIndex: roleIndex,
      });
    } catch (error) {
      this.setData({ loading: false, error: error instanceof Error ? error.message : "活动加载失败" });
    }
  },
  selectCharacter(event: WechatMiniprogram.PickerChange) {
    this.setData({ selectedCharacterIndex: Number(event.detail.value) });
  },
  selectRole(event: WechatMiniprogram.PickerChange) {
    this.setData({ selectedRoleIndex: Number(event.detail.value) });
  },
  async signup(event: WechatMiniprogram.CustomEvent) {
    const character = this.data.characters[this.data.selectedCharacterIndex];
    if (!character) {
      wx.showToast({ title: "请先添加有效角色", icon: "none" });
      return;
    }
    this.setData({ submitting: true, error: "" });
    try {
      await apiRequest(`/activities/${this.data.id}/signups`, {
        method: "POST",
        data: {
          characterId: character.id,
          preferredRole: roleValues[this.data.selectedRoleIndex] || null,
          note: event.detail.value.note || null,
          choices: [],
        },
      });
      wx.showToast({ title: "报名已提交", icon: "success" });
      await this.load();
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "报名失败" });
    } finally {
      this.setData({ submitting: false });
    }
  },
  cancelSignup() {
    wx.showModal({
      title: "取消报名",
      content: "只有截止前且尚未确认的报名可以取消。",
      success: (result) => {
        if (result.confirm) void this.cancelConfirmed();
      },
    });
  },
  async cancelConfirmed() {
    this.setData({ submitting: true, error: "" });
    try {
      await apiRequest(`/activities/${this.data.id}/signups/me`, { method: "DELETE" });
      wx.showToast({ title: "报名已取消", icon: "success" });
      await this.load();
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : "取消失败" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

function formatDate(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
