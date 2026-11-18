import { apiRequest } from "../../lib/api";

interface Character {
  id: string;
  name: string;
  realm: string;
  className: string;
  classIconUrl: string | null;
  activeSpecName: string | null;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  availableSpecs: Array<{ id: number; name: string; iconUrl: string | null; role: string | null }>;
  isMain: boolean;
  isRetired: boolean;
}
interface Signup {
  id: string;
  status: string;
  character: Character;
  preferredSpecId: number | null;
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

Page({
  data: {
    id: "",
    loading: true,
    activity: null as (ActivityDetail & { beginAtLabel: string; teamUpAtLabel: string; deadlineLabel: string }) | null,
    characters: [] as Character[],
    characterLabels: [] as string[],
    selectedCharacterIndex: 0,
    specLabels: [] as string[],
    specValues: [] as number[],
    selectedSpecIndex: 0,
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
      const selectedSpec = activeCharacters[currentIndex]?.availableSpecs ?? [];
      const specIndex = Math.max(
        0,
        selectedSpec.findIndex((spec) => spec.id === activity.mySignup?.preferredSpecId),
      );
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
          (character) =>
            `${character.name} · ${character.realm} · ${character.className}${character.activeSpecName ? ` · 当前${character.activeSpecName}` : ""}${character.isMain ? "（主角色）" : ""}${character.verificationStatus === "VERIFIED" ? "" : " · 未验证"}`,
        ),
        selectedCharacterIndex: currentIndex,
        specLabels: selectedSpec.map((spec) => spec.name),
        specValues: selectedSpec.map((spec) => spec.id),
        selectedSpecIndex: specIndex,
      });
    } catch (error) {
      this.setData({ loading: false, error: error instanceof Error ? error.message : "活动加载失败" });
    }
  },
  selectCharacter(event: WechatMiniprogram.PickerChange) {
    const selectedCharacterIndex = Number(event.detail.value);
    const specs = this.data.characters[selectedCharacterIndex]?.availableSpecs ?? [];
    this.setData({
      selectedCharacterIndex,
      specLabels: specs.map((spec) => spec.name),
      specValues: specs.map((spec) => spec.id),
      selectedSpecIndex: 0,
    });
  },
  selectSpec(event: WechatMiniprogram.PickerChange) {
    this.setData({ selectedSpecIndex: Number(event.detail.value) });
  },
  async signup(event: WechatMiniprogram.CustomEvent) {
    const character = this.data.characters[this.data.selectedCharacterIndex];
    if (!character) {
      wx.showToast({ title: "请先通过 WCL 添加角色", icon: "none" });
      return;
    }
    const preferredSpecId = this.data.specValues[this.data.selectedSpecIndex];
    if (!preferredSpecId) {
      wx.showToast({ title: "请选择本次活动专精", icon: "none" });
      return;
    }
    this.setData({ submitting: true, error: "" });
    try {
      await apiRequest(`/activities/${this.data.id}/signups`, {
        method: "POST",
        data: {
          characterId: character.id,
          preferredSpecId,
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
