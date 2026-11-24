"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ActivityTypeCode,
  createActivitySchema,
  idSchema,
  publishedRaidStrategySchema,
  raidCatalogSchema,
  raidProgressPlanListSchema,
} from "@ttz/contracts";
import { ArrowLeft, CalendarPlus, Info } from "lucide-react";
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
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [raidId, setRaidId] = useState("");
  const [selectedBosses, setSelectedBosses] = useState<string[]>([]);
  const [strategyByBoss, setStrategyByBoss] = useState<Record<string, string | null>>({});
  const plans = useQuery({
    queryKey: ["raid-progress", "plans"],
    queryFn: () => apiRequest("/raid-progress/plans", raidProgressPlanListSchema),
  });
  const catalog = useQuery({
    queryKey: ["raid-progress", "catalog"],
    queryFn: () => apiRequest("/raid-progress/catalog", raidCatalogSchema),
  });
  const strategies = useQuery({
    queryKey: ["raid-progress", "strategies", planId],
    queryFn: () => apiRequest(`/raid-progress/plans/${planId}/strategies`, publishedRaidStrategySchema),
    enabled: Boolean(planId),
  });
  const selectedPlan = plans.data?.find((plan) => plan.id === planId);
  const selectedRaidId = selectedPlan?.raidId ?? raidId;
  const selectedRaid = catalog.data?.find((raid) => raid.id === selectedRaidId);
  const availableBosses = selectedPlan?.bosses ?? selectedRaid?.bosses ?? [];
  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof createActivitySchema>) =>
      apiRequest("/activities", createdSchema, {
        method: "POST",
        body: JSON.stringify(input),
      }),
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
              raidId: selectedRaidId || undefined,
              progressPlanId: planId || undefined,
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
          <CardDescription>活动创建后将保存为草稿，发布后成员才可报名。</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              {activityType === "raid_progress" || activityType === "raid_farm" ? (
                <FieldSet>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>进度计划（可选）</FieldLabel>
                        <Select
                          value={planId || "none"}
                          onValueChange={(value) => {
                            setPlanId(value === "none" ? "" : value);
                            setSelectedBosses([]);
                            setStrategyByBoss({});
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="选择英雄或史诗计划" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">不使用进度计划</SelectItem>
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
                        <FieldLabel className="flex items-center gap-2">
                          指定团本（可选）
                          {selectedPlan ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger type="button" aria-label="团本已锁定" className="cursor-help">
                                  <Info className="size-4" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  选择进度计划后，团本由计划自动确定；清除计划后可手动选择。
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </FieldLabel>
                        <Select
                          value={selectedRaidId || "none"}
                          isDisabled={Boolean(selectedPlan)}
                          onValueChange={(value) => {
                            setRaidId(value === "none" ? "" : value);
                            setSelectedBosses([]);
                            setStrategyByBoss({});
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="选择团本" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">不指定团本</SelectItem>
                              {catalog.data?.map((raid) => (
                                <SelectItem key={raid.id} value={raid.id}>
                                  {raid.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    {selectedRaidId ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <FieldLabel>
                            {selectedPlan ? "计划目标 Boss 与战术快照" : "选择本次活动涉及的 Boss"}
                          </FieldLabel>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBosses(availableBosses.map((boss) => boss.id))}
                            >
                              全选
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedBosses([])}>
                              清空
                            </Button>
                          </div>
                        </div>
                        {availableBosses.map((boss) => {
                          const checked = selectedBosses.includes(boss.id);
                          const options = selectedPlan
                            ? (strategies.data?.filter((strategy) => strategy.bossId === boss.id) ?? [])
                            : [];
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
                              <FieldLabel htmlFor={`boss-${boss.id}`} className="w-1/2 cursor-pointer font-bold">
                                <span className="flex items-center gap-2 nowrap">
                                  <GameIcon src={boss.icon} className="size-10 shrink-0 rounded object-contain" />
                                  {boss.name}
                                </span>
                              </FieldLabel>
                              {checked && selectedPlan ? (
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
              </Field>

              <ActivityRosterGuidance />
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
