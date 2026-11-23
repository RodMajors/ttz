"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ActivityTypeCode,
  createActivitySchema,
  idSchema,
  publishedRaidStrategySchema,
  raidProgressPlanListSchema,
} from "@ttz/contracts";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { ActivityRosterGuidance } from "../../_components/activity-roster-guidance";
import { ActivityScheduleFields } from "../../_components/activity-schedule-fields";
import { CharacterPicker, type CharacterPickerSelection } from "../../_components/character-picker";

const createdSchema = z.object({ id: idSchema }).passthrough();
export function ActivityCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const [inviterId, setInviterId] = useState<string | null>(null);
  const [inviterSelection, setInviterSelection] = useState<CharacterPickerSelection | null>(null);
  const [activityType, setActivityType] = useState<ActivityTypeCode>("raid_progress");
  const [planId, setPlanId] = useState("");
  const [mode, setMode] = useState<"PROGRESSION" | "FARM">("PROGRESSION");
  const [selectedBosses, setSelectedBosses] = useState<string[]>([]);
  const [strategyByBoss, setStrategyByBoss] = useState<Record<string, string | null>>({});
  const plans = useQuery({
    queryKey: ["raid-progress", "plans"],
    queryFn: () => apiRequest("/raid-progress/plans", raidProgressPlanListSchema),
  });
  const strategies = useQuery({
    queryKey: ["raid-progress", "strategies", planId],
    queryFn: () => apiRequest(`/raid-progress/plans/${planId}/strategies`, publishedRaidStrategySchema),
    enabled: Boolean(planId),
  });
  const selectedPlan = plans.data?.find((plan) => plan.id === planId);
  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof createActivitySchema>) =>
      apiRequest("/activities", createdSchema, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activities"] });
      router.push("/dashboard/activities");
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const beginAt = localDateTimeToIso(String(form.get("beginAt") ?? ""));
    const signupDeadline = localDateTimeToIso(String(form.get("signupDeadline") ?? ""));
    const teamUpAtValue = String(form.get("teamUpAt") ?? "");
    const hasRosterGuidance = form.get("rosterGuidanceEnabled") === "1";
    const parsed = createActivitySchema.safeParse({
      name: form.get("name"),
      type: form.get("type") as ActivityTypeCode,
      description: form.get("description"),
      passphrase: form.get("passphrase") || "123",
      inviterId: inviterId || null,
      beginAt,
      teamUpAt: teamUpAtValue ? localDateTimeToIso(teamUpAtValue) : undefined,
      signupDeadline,
      durationMinutes: Number(form.get("durationMinutes")),
      maxPlayers: hasRosterGuidance ? optionalNumber(form.get("maxPlayers")) : null,
      tankSlots: hasRosterGuidance ? optionalNumber(form.get("tankSlots")) : null,
      healerSlots: hasRosterGuidance ? optionalNumber(form.get("healerSlots")) : null,
      meleeSlots: hasRosterGuidance ? optionalNumber(form.get("meleeSlots")) : null,
      rangedSlots: hasRosterGuidance ? optionalNumber(form.get("rangedSlots")) : null,
      attendanceEnabled: form.get("attendanceEnabled") === "on",
      ...(activityType === "raid_progress" || activityType === "raid_farm"
        ? {
            raid: {
              progressPlanId: planId,
              mode,
              targets: selectedBosses.map((bossId, orderIndex) => ({
                bossId,
                orderIndex,
                targetCount: null,
                strategyVersionId: strategyByBoss[bossId] ?? null,
              })),
            },
          }
        : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查活动信息");
      return;
    }
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/activities">
          <ArrowLeft data-icon="inline-start" />
          返回活动
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>创建活动</CardTitle>
          <CardDescription>活动先保存为草稿，发布后成员才可报名。集合时间默认比开始时间提前 20 分钟。</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">活动名称</FieldLabel>
                <Input id="name" name="name" required maxLength={64} placeholder="例如：M 团本开荒" />
              </Field>
              <Field>
                <FieldLabel htmlFor="type">活动类型</FieldLabel>
                <Select
                  name="type"
                  value={activityType}
                  onValueChange={(value) => setActivityType(value as ActivityTypeCode)}
                >
                  <SelectTrigger id="type" className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="raid_progress">团本开荒</SelectItem>
                      <SelectItem value="raid_farm">团本 Farm</SelectItem>
                      <SelectItem value="mythic_plus_push">大秘境冲层</SelectItem>
                      <SelectItem value="mythic_plus_vault">大秘境低保</SelectItem>
                      <SelectItem value="casual">休闲活动</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {activityType === "raid_progress" || activityType === "raid_farm" ? (
                <FieldSet>
                  <FieldLegend>团本进度与战术快照</FieldLegend>
                  <FieldDescription>选择长期进度计划和本场目标 Boss。未选择战术版本时会生成空白快照。</FieldDescription>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>进度计划</FieldLabel>
                        <Select
                          value={planId}
                          onValueChange={(value) => {
                            setPlanId(value);
                            setSelectedBosses([]);
                            setStrategyByBoss({});
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="选择英雄或史诗计划" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {plans.data?.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} · {plan.difficulty === "MYTHIC" ? "史诗" : "英雄"}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>活动模式</FieldLabel>
                        <Select value={mode} onValueChange={(value) => setMode(value as "PROGRESSION" | "FARM")}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="PROGRESSION">开荒</SelectItem>
                              <SelectItem value="FARM">Farm</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    {selectedPlan ? (
                      <div className="flex flex-col gap-3">
                        {selectedPlan.bosses.map((boss) => {
                          const checked = selectedBosses.includes(boss.id);
                          const options = strategies.data?.filter((strategy) => strategy.bossId === boss.id) ?? [];
                          return (
                            <Field key={boss.id} orientation="horizontal">
                              <Checkbox
                                id={`boss-${boss.id}`}
                                className="cursor-pointer"
                                checked={checked}
                                onCheckedChange={(value) => {
                                  setSelectedBosses(
                                    value === true
                                      ? [...selectedBosses, boss.id]
                                      : selectedBosses.filter((id) => id !== boss.id),
                                  );
                                }}
                              />
                              <FieldLabel htmlFor={`boss-${boss.id}`} className="min-w-40 cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <GameIcon src={boss.icon} className="size-7 shrink-0 rounded object-contain" />
                                  {boss.name}
                                </span>
                              </FieldLabel>
                              {checked ? (
                                <Select
                                  value={strategyByBoss[boss.id] ?? "blank"}
                                  onValueChange={(value) =>
                                    setStrategyByBoss({
                                      ...strategyByBoss,
                                      [boss.id]: value === "blank" ? null : value,
                                    })
                                  }
                                  className="justify-end flex"
                                >
                                  <SelectTrigger className="max-w-sm cursor-pointer">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectItem value="blank">空白战术快照</SelectItem>
                                      {options.flatMap((strategy) =>
                                        strategy.versions.map((version) => (
                                          <SelectItem key={version.id} value={version.id}>
                                            {strategy.name} v{version.versionNo}
                                            {strategy.isDefault ? "（默认）" : ""}
                                          </SelectItem>
                                        )),
                                      )}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </Field>
                          );
                        })}
                      </div>
                    ) : null}
                  </FieldGroup>
                </FieldSet>
              ) : null}
              <ActivityScheduleFields />
              <ActivityRosterGuidance />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="passphrase">进组暗号 / 语音频道</FieldLabel>
                  <Input id="passphrase" name="passphrase" maxLength={255} defaultValue="123" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="inviter">发起邀请角色</FieldLabel>
                  <CharacterPicker
                    id="inviter"
                    value={inviterId}
                    initialSelection={inviterSelection}
                    onChange={(selection) => {
                      setInviterSelection(selection);
                      setInviterId(selection?.character.id ?? null);
                    }}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="description">说明</FieldLabel>
                <Textarea id="description" name="description" maxLength={10000} placeholder="活动要求、集合说明等" />
                <FieldDescription>站位和团本准备事项不在本期活动模型中，后续由模板功能承载。</FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="attendanceEnabled" name="attendanceEnabled" defaultChecked className="cursor-pointer" />
                <FieldLabel htmlFor="attendanceEnabled">计入团本开荒出勤统计</FieldLabel>
              </Field>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>无法创建活动</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-5 justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <CalendarPlus data-icon="inline-start" />}
              保存草稿
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}

function localDateTimeToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
