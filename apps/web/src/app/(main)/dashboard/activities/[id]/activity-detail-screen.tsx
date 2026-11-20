"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ActivityDetail,
  type ActivitySignup,
  activityDetailSchema,
  characterListSchema,
  type Role,
  signupDecisionSchema,
  signupSchema,
  updateActivitySchema,
} from "@ttz/contracts";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  ListOrdered,
  Lock,
  LockOpen,
  Pencil,
  Send,
  ShieldCheck,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { PositioningBoardLoader } from "./_components/positioning-board-loader";
import { StrategyTeamWorkspace } from "./_components/strategy-team-workspace";

const idResultSchema = z.object({ id: z.string() }).passthrough();
const cancelledSchema = z.object({ cancelled: z.boolean() });
const statusLabels = {
  PENDING: "待确认",
  CONFIRMED: "已确认",
  BENCH: "替补",
  CANCELLED: "已取消",
  REJECTED: "已拒绝",
} as const;
const activityStatusLabels = { DRAFT: "草稿", PUBLISHED: "已发布", FINISHED: "已结束", CANCELLED: "已取消" } as const;
const roleLabels: Record<Role, string> = { TANK: "坦克", HEALER: "治疗", MELEE: "近战", RANGED: "远程" };

export function ActivityDetailScreen({ activityId }: { activityId: string }) {
  const client = useQueryClient();
  const queryKey = ["activity", activityId];
  const query = useQuery({
    queryKey,
    queryFn: () => apiRequest(`/activities/${encodeURIComponent(activityId)}`, activityDetailSchema),
  });
  const refresh = async () => {
    await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ queryKey: ["activities"] })]);
  };
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>无法加载活动</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
      </Alert>
    );
  }
  const activity = query.data;
  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/activities">
          <ArrowLeft data-icon="inline-start" />
          返回活动列表
        </Link>
      </Button>
      <ActivityOverview activity={activity} onChanged={refresh} />
      {activity.raid ? <RaidStrategySnapshot activity={activity} onChanged={refresh} /> : null}
      <SignupPanel activity={activity} onChanged={refresh} />
      <SignupRoster activity={activity} onChanged={refresh} />
    </div>
  );
}

function RaidStrategySnapshot({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const raid = activity.raid;
  if (!raid) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>本场战术快照</CardTitle>
        <CardDescription>
          {raid.raidName} · {raid.difficulty === "MYTHIC" ? "史诗" : "英雄"} ·{" "}
          {raid.mode === "PROGRESSION" ? "开荒" : "Farm"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {raid.targets.map((target) => (
          <Card key={target.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {target.bossName}
                <Badge variant="outline">{target.strategyName}</Badge>
                {target.strategyVersionNo ? <Badge variant="secondary">v{target.strategyVersionNo}</Badge> : null}
              </CardTitle>
              <CardDescription>
                {target.blocks.length ? `包含 ${target.blocks.length} 个战术区块` : "空白战术快照"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <StrategyTeamWorkspace activity={activity} target={target} onChanged={onChanged} />
              <ActivityTaskPlan activity={activity} target={target} />
              <PositioningBoardLoader activity={activity} target={target} onChanged={onChanged} />
            </CardContent>
            {target.blocks.length ? (
              <CardContent className="flex flex-col gap-3">
                {target.blocks.map((block) => (
                  <div key={block.type + block.orderIndex} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{strategyBlockLabel(block.type)}</Badge>
                      <p className="font-medium">{block.title}</p>
                    </div>
                    {block.markdown ? (
                      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6">{block.markdown}</pre>
                    ) : null}
                    {!block.markdown && block.config && Object.keys(block.config).length ? (
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                        {JSON.stringify(block.config, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityTaskPlan({
  activity,
  target,
}: {
  activity: ActivityDetail;
  target: NonNullable<NonNullable<ActivityDetail["raid"]>["targets"][number]>;
}) {
  const sequence = target.tasks
    .filter((task) => task.kind === "SEQUENCE")
    .sort((left, right) => left.orderIndex - right.orderIndex);
  const timeline = target.tasks
    .filter((task) => task.kind === "TIMELINE")
    .sort((left, right) => (left.offsetMs ?? 0) - (right.offsetMs ?? 0));
  if (!sequence.length && !timeline.length) return null;
  const slots = target.snapshot?.slots ?? [];
  const renderPerson = (slotKey: string | null) => {
    if (!slotKey) return null;
    const slot = slots.find((entry) => entry.slotKey === slotKey);
    if (!slot) return slotKey;
    const signup = slot.signupId ? activity.signups.find((entry) => entry.id === slot.signupId) : undefined;
    const name = signup?.memberName ?? slot.userName;
    const character = signup?.character.name ?? slot.characterName;
    return (
      <span>
        {slot.label}：{name ?? "未分配"}
        {character ? ` · ${character}` : ""}
      </span>
    );
  };
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {sequence.length ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="size-4" />
              顺序分配
            </CardTitle>
            <CardDescription>按步骤编号执行；槽位绑定跟随本场快照名单。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {sequence.map((task) => (
              <div key={task.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{task.orderIndex + 1}</Badge>
                  <Badge variant="outline">{task.taskTypeLabel}</Badge>
                  <span className="font-medium">{task.label}</span>
                </div>
                {task.playerSpellName ? (
                  <p className="mt-1 text-sm text-muted-foreground">执行技能：{task.playerSpellName}</p>
                ) : null}
                <p className="mt-1 text-sm">主执行者：{renderPerson(task.executorSlotKey)}</p>
                {task.fallbackSlotKey ? (
                  <p className="mt-1 text-sm text-muted-foreground">后备：{renderPerson(task.fallbackSlotKey)}</p>
                ) : null}
                {task.targetSlotKey ? (
                  <p className="mt-1 text-sm text-muted-foreground">目标：{renderPerson(task.targetSlotKey)}</p>
                ) : null}
                {task.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.notes}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {timeline.length ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-4" />
              战斗时间轴
            </CardTitle>
            <CardDescription>固定相对战斗开始时间；重叠任务会在保存模板时由服务端检查。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {timeline.map((task) => (
              <div key={task.id} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-md border p-3">
                <Badge className="h-fit justify-center">{formatTaskOffset(task.offsetMs ?? 0)}</Badge>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{task.phaseLabel || task.taskTypeLabel}</Badge>
                    <span className="font-medium">{task.label}</span>
                    {task.occurrence ? (
                      <span className="text-xs text-muted-foreground">第 {task.occurrence} 次</span>
                    ) : null}
                  </div>
                  {task.encounterSpellName ? (
                    <p className="mt-1 text-sm text-muted-foreground">机制：{task.encounterSpellName}</p>
                  ) : null}
                  {task.playerSpellName ? (
                    <p className="mt-1 text-sm text-muted-foreground">技能：{task.playerSpellName}</p>
                  ) : null}
                  <p className="mt-1 text-sm">执行者：{renderPerson(task.executorSlotKey)}</p>
                  {task.fallbackSlotKey ? (
                    <p className="mt-1 text-sm text-muted-foreground">后备：{renderPerson(task.fallbackSlotKey)}</p>
                  ) : null}
                  {task.notes ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.notes}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function formatTaskOffset(offsetMs: number) {
  const seconds = Math.floor(offsetMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function strategyBlockLabel(type: string) {
  return (
    { POSITIONING: "站位", RAID_GROUPS: "团队分组", SEQUENCE: "顺序分配", TIMELINE: "时序分配", NOTES: "战术笔记" }[
      type
    ] ?? type
  );
}

function ActivityOverview({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const [error, setError] = useState<string>();
  const action = useMutation({
    mutationFn: async (path: string) =>
      apiRequest(`/activities/${activity.id}/${path}`, idResultSchema, { method: "POST" }),
    onSuccess: onChanged,
    onError: (reason) => setError(reason.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {activity.name}
          <Badge variant={activity.status === "PUBLISHED" ? "default" : "secondary"}>
            {activityStatusLabels[activity.status]}
          </Badge>
          {activity.rosterLockedAt ? <Badge variant="outline">名单已锁定</Badge> : null}
        </CardTitle>
        <CardDescription>
          {activity.type} · 负责人 {activity.creator.name}
        </CardDescription>
        {activity.canManage ? (
          <CardAction className="flex flex-wrap justify-end gap-2">
            {activity.status === "DRAFT" || activity.status === "PUBLISHED" ? (
              <ActivityEditDialog activity={activity} onChanged={onChanged} />
            ) : null}
            {activity.status === "DRAFT" ? (
              <ActionButton
                label="发布活动"
                icon="send"
                onClick={() => action.mutate("publish")}
                pending={action.isPending}
              />
            ) : null}
            {activity.status === "PUBLISHED" ? (
              <ActionButton label="关闭报名" onClick={() => action.mutate("close-signup")} pending={action.isPending} />
            ) : null}
            {activity.status === "PUBLISHED" ? (
              <ActionButton label="结束活动" onClick={() => action.mutate("finish")} pending={action.isPending} />
            ) : null}
            {activity.status === "DRAFT" || activity.status === "PUBLISHED" ? (
              <ActionButton
                label="取消活动"
                destructive
                onClick={() => action.mutate("cancel")}
                pending={action.isPending}
              />
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="集合时间" value={formatDate(activity.teamUpAt)} />
          <Info label="开始时间" value={formatDate(activity.beginAt)} />
          <Info label="报名截止" value={activity.signupDeadline ? formatDate(activity.signupDeadline) : "未设置"} />
          <Info label="人数上限" value={`${activity.maxPlayers} 人`} />
        </div>
        {activity.description ? <p className="whitespace-pre-wrap text-sm leading-6">{activity.description}</p> : null}
        {activity.passphrase ? (
          <Alert>
            <ShieldCheck />
            <AlertTitle>进组信息</AlertTitle>
            <AlertDescription>{activity.passphrase}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActivityEditDialog({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const durationMinutes = Math.round(
    (new Date(activity.endAt).getTime() - new Date(activity.beginAt).getTime()) / 60_000,
  );
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof updateActivitySchema>) =>
      apiRequest(`/activities/${activity.id}`, activityDetailSchema, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setOpen(false);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = updateActivitySchema.safeParse({
      version: activity.version,
      name: data.get("name"),
      description: data.get("description") || undefined,
      passphrase: data.get("passphrase") || null,
      beginAt: new Date(String(data.get("beginAt"))).toISOString(),
      teamUpAt: data.get("teamUpAt") ? new Date(String(data.get("teamUpAt"))).toISOString() : undefined,
      signupDeadline: new Date(String(data.get("signupDeadline"))).toISOString(),
      durationMinutes: Number(data.get("durationMinutes")),
      maxPlayers: Number(data.get("maxPlayers")),
      tankSlots: optionalNumber(data.get("tankSlots")),
      healerSlots: optionalNumber(data.get("healerSlots")),
      meleeSlots: optionalNumber(data.get("meleeSlots")),
      rangedSlots: optionalNumber(data.get("rangedSlots")),
      attendanceEnabled: data.get("attendanceEnabled") === "on",
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查活动信息");
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil data-icon="inline-start" />
          编辑
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑活动</DialogTitle>
          <DialogDescription>保存时会校验当前版本；若其他负责人已修改，请刷新后重试。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-name">活动名称</FieldLabel>
              <Input id="edit-name" name="name" defaultValue={activity.name} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-begin">开始时间</FieldLabel>
                <Input
                  id="edit-begin"
                  name="beginAt"
                  type="datetime-local"
                  defaultValue={toLocal(activity.beginAt)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-team-up">集合时间</FieldLabel>
                <Input
                  id="edit-team-up"
                  name="teamUpAt"
                  type="datetime-local"
                  defaultValue={toLocal(activity.teamUpAt)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="edit-deadline">报名截止</FieldLabel>
                <Input
                  id="edit-deadline"
                  name="signupDeadline"
                  type="datetime-local"
                  defaultValue={activity.signupDeadline ? toLocal(activity.signupDeadline) : ""}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-duration">持续分钟</FieldLabel>
                <Input
                  id="edit-duration"
                  name="durationMinutes"
                  type="number"
                  min={30}
                  max={1440}
                  step={30}
                  defaultValue={durationMinutes}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-max">人数上限</FieldLabel>
                <Input
                  id="edit-max"
                  name="maxPlayers"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={activity.maxPlayers}
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <SlotField id="tankSlots" label="坦克" value={activity.tankSlots} />
              <SlotField id="healerSlots" label="治疗" value={activity.healerSlots} />
              <SlotField id="meleeSlots" label="近战" value={activity.meleeSlots} />
              <SlotField id="rangedSlots" label="远程" value={activity.rangedSlots} />
            </div>
            <Field>
              <FieldLabel htmlFor="edit-passphrase">进组暗号 / 语音频道</FieldLabel>
              <Input id="edit-passphrase" name="passphrase" defaultValue={activity.passphrase ?? ""} maxLength={255} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-description">说明</FieldLabel>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={activity.description ?? ""}
                maxLength={10_000}
              />
              <FieldDescription>站位和团本准备事项由后续模板功能承载。</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="edit-attendance" name="attendanceEnabled" defaultChecked={activity.attendanceEnabled} />
              <FieldLabel htmlFor="edit-attendance">计入团本开荒出勤</FieldLabel>
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>无法保存活动</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Pencil data-icon="inline-start" />}保存修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SlotField({ id, label, value }: { id: string; label: string; value: number | null }) {
  return (
    <Field>
      <FieldLabel htmlFor={`edit-${id}`}>{label}</FieldLabel>
      <Input id={`edit-${id}`} name={id} type="number" min={0} max={100} defaultValue={value ?? ""} />
    </Field>
  );
}

function SignupPanel({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const signup = activity.mySignup;
  const active = signup && !["CANCELLED", "REJECTED"].includes(signup.status);
  if (!activity.canSignup && !activity.canChangeMySignup && !active) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{active ? "我的报名" : "参与活动"}</CardTitle>
        <CardDescription>普通成员仅可在截止前且尚未确认时修改或取消报名。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {active ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">
                {signup.character.name} · {signup.character.realm}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusLabels[signup.status]}
                {signup.preferredRole ? ` · ${roleLabels[signup.preferredRole]}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {activity.canChangeMySignup ? (
                <SignupDialog activity={activity} onChanged={onChanged} triggerLabel="修改报名" />
              ) : null}
              {activity.canChangeMySignup ? (
                <CancelSignup activity={activity} onChanged={onChanged} />
              ) : (
                <Badge variant="outline">已确认，需联系负责人调整</Badge>
              )}
            </div>
          </div>
        ) : activity.canSignup ? (
          <SignupDialog activity={activity} onChanged={onChanged} triggerLabel="立即报名" />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SignupDialog({
  activity,
  onChanged,
  triggerLabel,
}: {
  activity: ActivityDetail;
  onChanged: () => Promise<void>;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(activity.mySignup?.character.id ?? "");
  const [preferredSpecId, setPreferredSpecId] = useState<string>(
    activity.mySignup?.preferredSpecId ? String(activity.mySignup.preferredSpecId) : "",
  );
  const [choiceSpecs, setChoiceSpecs] = useState<Record<string, string>>(() =>
    Object.fromEntries(activity.mySignup?.choices.map((choice) => [choice.character.id, String(choice.specId)]) ?? []),
  );
  const [error, setError] = useState<string>();
  const characters = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiRequest("/characters", characterListSchema),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof signupSchema>) =>
      apiRequest(`/activities/${activity.id}/signups`, idResultSchema, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setOpen(false);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const characterId = String(data.get("characterId") ?? "");
    const character = characters.data?.find((item) => item.id === characterId);
    const parsed = signupSchema.safeParse({
      characterId,
      preferredSpecId: preferredSpecId ? Number(preferredSpecId) : null,
      note: data.get("note") || null,
      choices: Object.entries(choiceSpecs)
        .filter(([id, specId]) => id !== characterId && Boolean(specId) && specId !== "none")
        .map(([id, specId]) => ({ characterId: id, specId: Number(specId) })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查报名信息");
    if (!character?.availableSpecs.some((spec) => spec.id === parsed.data.preferredSpecId)) {
      return setError("所选专精不属于当前出战角色职业");
    }
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserRoundPlus data-icon="inline-start" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription>角色职业固定，专精按本次活动选择。未验证角色仍可报名。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="characterId">出战角色</FieldLabel>
              <Select
                name="characterId"
                required
                value={selectedCharacterId}
                onValueChange={(value) => {
                  setSelectedCharacterId(value);
                  setPreferredSpecId("");
                }}
              >
                <SelectTrigger id="characterId">
                  <SelectValue placeholder={characters.isPending ? "正在加载角色…" : "请选择角色"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {characters.data
                      ?.filter((character) => !character.isRetired)
                      .map((character) => (
                        <SelectItem key={character.id} value={character.id}>
                          <GameIcon
                            src={character.classIconUrl}
                            alt=""
                            className="mr-1 inline-block size-4 rounded align-[-3px]"
                          />
                          {character.name} · {character.realm} ·{" "}
                          <ClassAccent color={character.classColor}>{character.className}</ClassAccent>
                          {character.verificationStatus !== "VERIFIED" ? "（未验证）" : ""}
                          {character.isMain ? "（主角色）" : ""}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>角色需先通过 WCL 认领或 WCL 搜索后提交审核。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="preferredSpecId">本次出战专精</FieldLabel>
              <Select name="preferredSpecId" value={preferredSpecId} onValueChange={setPreferredSpecId} required>
                <SelectTrigger id="preferredSpecId">
                  <SelectValue placeholder="请选择本次专精" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {characters.data
                      ?.find((character) => character.id === selectedCharacterId)
                      ?.availableSpecs.map((spec) => (
                        <SelectItem key={spec.id} value={String(spec.id)}>
                          {spec.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>请先选择出战角色，再选择该职业本次使用的专精。</FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">备选角色 / 专精</FieldLegend>
              <FieldDescription>每个备选角色的专精按本次活动选择。</FieldDescription>
              <FieldGroup data-slot="checkbox-group">
                {characters.data
                  ?.filter((character) => !character.isRetired && character.id !== activity.mySignup?.character.id)
                  .map((character) => (
                    <Field key={character.id}>
                      <FieldLabel htmlFor={`choice-${activity.id}-${character.id}`}>
                        <GameIcon
                          src={character.classIconUrl}
                          alt=""
                          className="mr-1 inline-block size-4 rounded align-[-3px]"
                        />
                        {character.name} · {character.realm} ·{" "}
                        <ClassAccent color={character.classColor}>{character.className}</ClassAccent>
                      </FieldLabel>
                      <Select
                        value={choiceSpecs[character.id] ?? "none"}
                        onValueChange={(value) => setChoiceSpecs((current) => ({ ...current, [character.id]: value }))}
                      >
                        <SelectTrigger id={`choice-${activity.id}-${character.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">不作为备选</SelectItem>
                            {character.availableSpecs.map((spec) => (
                              <SelectItem key={spec.id} value={String(spec.id)}>
                                <GameIcon
                                  src={spec.iconUrl}
                                  alt=""
                                  className="mr-1 inline-block size-4 rounded align-[-3px]"
                                />
                                {spec.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  ))}
              </FieldGroup>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="note">报名备注</FieldLabel>
              <Textarea id="note" name="note" maxLength={255} defaultValue={activity.mySignup?.note ?? ""} />
            </Field>
            {characters.isError ? (
              <Alert variant="destructive">
                <AlertTitle>角色加载失败</AlertTitle>
                <AlertDescription>{characters.error.message}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>报名失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={mutation.isPending || !characters.data?.length || !preferredSpecId}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}提交报名
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelSignup({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const mutation = useMutation({
    mutationFn: () => apiRequest(`/activities/${activity.id}/signups/me`, cancelledSchema, { method: "DELETE" }),
    onSuccess: onChanged,
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">取消报名</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认取消报名？</AlertDialogTitle>
          <AlertDialogDescription>
            取消后仍可在截止前重新报名；如果负责人已经确认，服务端会拒绝本次操作。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>返回</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => mutation.mutate()}>
            确认取消
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SignupRoster({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const mutation = useMutation({
    mutationFn: (path: string) =>
      apiRequest(`/activities/${activity.id}/roster/${path}`, idResultSchema, { method: "POST" }),
    onSuccess: onChanged,
  });
  const visible = activity.signups.filter((signup) => !["CANCELLED", "REJECTED"].includes(signup.status));
  return (
    <Card>
      <CardHeader>
        <CardTitle>报名与最终名单</CardTitle>
        <CardDescription>确认和替补组成名单；本期不记录名单变更历史。</CardDescription>
        {activity.canManage && activity.status !== "FINISHED" && activity.status !== "CANCELLED" ? (
          <CardAction>
            <Button
              variant="outline"
              onClick={() => mutation.mutate(activity.rosterLockedAt ? "unlock" : "lock")}
              disabled={mutation.isPending}
            >
              {activity.rosterLockedAt ? <LockOpen data-icon="inline-start" /> : <Lock data-icon="inline-start" />}
              {activity.rosterLockedAt ? "解锁名单" : "锁定名单"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>还没有有效报名</EmptyTitle>
              <EmptyDescription>成员报名后会在这里显示。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成员 / 角色</TableHead>
                <TableHead>职责</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>备注</TableHead>
                {activity.canManage ? <TableHead className="text-right">处理</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell>
                    <p className="font-medium">{signup.memberName}</p>
                    <p className="text-xs text-muted-foreground">
                      <GameIcon
                        src={signup.character.classIconUrl}
                        alt=""
                        className="mr-1 inline-block size-4 rounded align-[-3px]"
                      />
                      {signup.character.name} · {signup.character.realm}
                    </p>
                  </TableCell>
                  <TableCell>{signup.preferredRole ? roleLabels[signup.preferredRole] : "未指定"}</TableCell>
                  <TableCell>
                    <Badge variant={signup.status === "CONFIRMED" ? "default" : "secondary"}>
                      {statusLabels[signup.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{signup.groupNo ? `${signup.groupNo} 组` : "—"}</TableCell>
                  <TableCell className="max-w-56 truncate">{signup.note ?? "—"}</TableCell>
                  {activity.canManage ? (
                    <TableCell className="text-right">
                      <DecisionDialog activity={activity} signup={signup} onChanged={onChanged} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DecisionDialog({
  activity,
  signup,
  onChanged,
}: {
  activity: ActivityDetail;
  signup: ActivitySignup;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof signupDecisionSchema>) =>
      apiRequest(`/activities/${activity.id}/signups/${signup.id}/decision`, idResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setOpen(false);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = signupDecisionSchema.safeParse({
      status: data.get("status"),
      groupNo: data.get("groupNo") ? Number(data.get("groupNo")) : null,
      orderIndex: Number(data.get("orderIndex")),
      officerNote: data.get("officerNote") || null,
      reason: data.get("reason") || null,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查处理信息");
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          处理
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>处理 {signup.memberName} 的报名</DialogTitle>
          <DialogDescription>确认后普通成员不能自行修改或取消；负责人仍可调整。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`status-${signup.id}`}>处理结果</FieldLabel>
              <Select name="status" defaultValue={signup.status === "CANCELLED" ? "PENDING" : signup.status}>
                <SelectTrigger id={`status-${signup.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="PENDING">待确认</SelectItem>
                    <SelectItem value="CONFIRMED">确认</SelectItem>
                    <SelectItem value="BENCH">替补</SelectItem>
                    <SelectItem value="REJECTED">拒绝</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`group-${signup.id}`}>分组</FieldLabel>
                <Input
                  id={`group-${signup.id}`}
                  name="groupNo"
                  type="number"
                  min={1}
                  max={8}
                  defaultValue={signup.groupNo ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`order-${signup.id}`}>排序</FieldLabel>
                <Input
                  id={`order-${signup.id}`}
                  name="orderIndex"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={signup.orderIndex}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`officer-${signup.id}`}>管理备注</FieldLabel>
              <Textarea
                id={`officer-${signup.id}`}
                name="officerNote"
                maxLength={255}
                defaultValue={signup.officerNote ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`reason-${signup.id}`}>决定说明</FieldLabel>
              <Textarea
                id={`reason-${signup.id}`}
                name="reason"
                maxLength={255}
                defaultValue={signup.decisionReason ?? ""}
              />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>处理失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}保存结果
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  label,
  icon,
  destructive,
  pending,
  onClick,
}: {
  label: string;
  icon?: "send";
  destructive?: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant={destructive ? "destructive" : "outline"} disabled={pending} onClick={onClick}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : icon === "send" ? (
        <Send data-icon="inline-start" />
      ) : destructive ? (
        <X data-icon="inline-start" />
      ) : (
        <CalendarClock data-icon="inline-start" />
      )}
      {label}
    </Button>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(
    new Date(value),
  );
}
function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}
function toLocal(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
