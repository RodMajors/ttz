"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ActivityDetail,
  type ActivitySignup,
  activityBulkConfirmResultSchema,
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
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  ListOrdered,
  Lock,
  LockOpen,
  MapPinned,
  NotebookPen,
  Pencil,
  Send,
  UserRoundPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/app-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserIdentity } from "@/components/user-identity";
import { apiRequest } from "@/lib/api-client";
import { ActivityRosterGuidance } from "../../_components/activity-roster-guidance";
import { ActivityScheduleFields } from "../../_components/activity-schedule-fields";
import { CharacterPicker, type CharacterPickerSelection } from "../../_components/character-picker";
import { ActivityTactics } from "./_components/activity-tactics";
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
const activityStatusLabels = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  FINISHED: "已结束",
  CANCELLED: "已取消",
} as const;
const roleLabels: Record<Role, string> = {
  TANK: "坦克",
  HEALER: "治疗",
  MELEE: "近战",
  RANGED: "远程",
};
const activityTypeLabels: Record<ActivityDetail["type"], string> = {
  raid_progress: "团本开荒",
  raid_farm: "团本 Farm",
  mythic_plus_push: "大秘境冲层",
  mythic_plus_vault: "大秘境低保",
  casual: "休闲活动",
};
type ActivityRaidTarget = NonNullable<NonNullable<ActivityDetail["raid"]>["targets"][number]>;
type RaidStrategyTabItem =
  | {
      key: string;
      label: string;
      kind: "block";
      blockId: string | undefined;
      orderIndex: number;
    }
  | {
      key: string;
      label: string;
      kind: "task";
      taskId: string;
      orderIndex: number;
    };

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
      <SignupPanel activity={activity} onChanged={refresh} />
      <ActivityDetailTabs activity={activity} onChanged={refresh} />
    </div>
  );
}

function ActivityDetailTabs({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const [finalRosterOnly, setFinalRosterOnly] = useState(false);
  const targets = activity.raid?.targets ?? [];
  const bosses = targets.reduce<ActivityRaidTarget[]>((groups, target) => {
    if (!groups.some((entry) => entry.bossId === target.bossId)) groups.push(target);
    return groups;
  }, []);
  return (
    <Tabs defaultValue="roster" className="min-w-0">
      <div className="sticky top-0 z-40 -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-b bg-background/90 px-4 py-4 shadow-sm backdrop-blur-md md:-mx-6 md:w-[calc(100%+3rem)] md:px-6 [html[data-navbar-style=sticky]_&]:top-12">
        <TabsList className="mx-auto flex h-auto w-max min-w-full justify-center gap-2 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="roster"
            className="h-10 flex-none gap-2 rounded-lg border border-transparent px-4 text-sm shadow-none aria-selected:border-primary/30 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:shadow-sm"
          >
            <ClipboardList data-icon="inline-start w-20" />
            报名列表
          </TabsTrigger>
          {activity.raid ? (
            <TabsTrigger
              value="team-layout"
              className="h-10 flex-none gap-2 rounded-lg border border-transparent px-4 text-sm shadow-none aria-selected:border-primary/30 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:shadow-sm"
            >
              <UsersRound data-icon="inline-start w-20" />
              团队分组
            </TabsTrigger>
          ) : null}
          {bosses.map((boss) => (
            <TabsTrigger
              key={boss.bossId}
              value={`boss-${boss.bossId}`}
              className="h-10 flex-none gap-2 rounded-lg border border-transparent px-3 text-sm shadow-none aria-selected:border-primary/30 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:shadow-sm"
            >
              <GameIcon src={boss.bossIcon} className="w-20 rounded-sm object-cover" />
              <span>{boss.bossName}战术</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="roster" className="min-w-0">
        <SignupRoster
          activity={activity}
          onChanged={onChanged}
          finalRosterOnly={finalRosterOnly}
          onFinalRosterOnlyChange={setFinalRosterOnly}
        />
      </TabsContent>
      {activity.raid ? (
        <TabsContent value="team-layout" className="min-w-0">
          <StrategyTeamWorkspace activity={activity} onChanged={onChanged} />
        </TabsContent>
      ) : null}
      {bosses.map((boss) => {
        const bossTargets = targets.filter((target) => target.bossId === boss.bossId);
        const items = bossTargets.flatMap(raidStrategyTabItems);
        return (
          <TabsContent key={boss.bossId} value={`boss-${boss.bossId}`} className="min-w-0">
            {items.length ? (
              <BossStrategyTabs
                bossName={boss.bossName}
                items={items}
                renderContent={(item) => {
                  const target = bossTargets.find(
                    (entry) => item.key.startsWith(`block-${entry.id}-`) || item.key.startsWith(`task-${entry.id}-`),
                  );
                  return target ? (
                    <RaidStrategyItem activity={activity} target={target} item={item} onChanged={onChanged} />
                  ) : null;
                }}
              />
            ) : (
              <Empty className="min-h-48 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>{boss.bossName} 暂无战术内容</EmptyTitle>
                  <EmptyDescription>该 Boss 尚未关联已发布的战术预设内容。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function BossStrategyTabs({
  bossName,
  items,
  renderContent,
}: {
  bossName: string;
  items: RaidStrategyTabItem[];
  renderContent: (item: RaidStrategyTabItem) => ReactNode;
}) {
  const id = useId();
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? "");
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];
  if (!activeItem) return null;

  function selectItem(item: RaidStrategyTabItem, moveFocus = false) {
    setActiveKey(item.key);
    if (moveFocus) triggerRefs.current.get(item.key)?.focus();
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={`${bossName} 战术内容`}>
      <div className="flex flex-wrap items-end justify-between gap-2 pb-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Encounter playbook</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{`${bossName} 战术板`}</h2>
        </div>
        <Badge variant="secondary">{items.length} 项</Badge>
      </div>
      <div className="min-w-0 overflow-x-auto px-0.5 pt-0.5 pb-3">
        <div
          role="tablist"
          aria-label={`${bossName} 战术内容`}
          className="mx-auto flex w-max min-w-full justify-center gap-2"
        >
          {items.map((item, index) => {
            const selected = item.key === activeItem.key;
            const Icon = strategyItemIcon(item);
            const triggerId = `${id}-trigger-${index}`;
            return (
              <button
                key={item.key}
                ref={(element) => {
                  if (element) triggerRefs.current.set(item.key, element);
                  else triggerRefs.current.delete(item.key);
                }}
                id={triggerId}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectItem(item)}
                onKeyDown={(event) => {
                  const currentIndex = items.findIndex((entry) => entry.key === item.key);
                  const nextIndex =
                    event.key === "ArrowRight"
                      ? (currentIndex + 1) % items.length
                      : event.key === "ArrowLeft"
                        ? (currentIndex - 1 + items.length) % items.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? items.length - 1
                            : -1;
                  if (nextIndex >= 0) {
                    event.preventDefault();
                    const nextItem = items[nextIndex];
                    if (nextItem) selectItem(nextItem, true);
                  }
                }}
                className="group relative inline-flex h-15 min-w-40 shrink-0 items-center gap-3 overflow-hidden rounded border bg-card px-3 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:border-primary aria-selected:bg-primary/5 aria-selected:shadow-md"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-aria-selected:bg-primary group-aria-selected:text-primary-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                  <span className="text-xs text-muted-foreground group-aria-selected:text-primary">
                    {strategyItemKind(item)}
                  </span>
                </span>
                <span className="absolute inset-x-3 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform group-aria-selected:scale-x-100" />
              </button>
            );
          })}
        </div>
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-trigger-${items.findIndex((item) => item.key === activeItem.key)}`}
        tabIndex={-1}
        className="min-w-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {renderContent(activeItem)}
      </div>
    </section>
  );
}

function strategyItemIcon(item: RaidStrategyTabItem) {
  if (item.kind === "task") return ListOrdered;
  if (item.label.toLocaleLowerCase().includes("站位")) return MapPinned;
  if (item.label.toLocaleLowerCase().includes("笔记")) return NotebookPen;
  return FileText;
}

function strategyItemKind(item: RaidStrategyTabItem) {
  if (item.kind === "task") return "本场任务安排";
  if (item.label.toLocaleLowerCase().includes("站位")) return "站位预设";
  if (item.label.toLocaleLowerCase().includes("笔记")) return "战术笔记";
  return "战术预设内容";
}

function raidStrategyTabItems(target: ActivityRaidTarget): RaidStrategyTabItem[] {
  const blocks: RaidStrategyTabItem[] = target.blocks.map((block) => ({
    key: `block-${target.id}-${block.id ?? block.orderIndex}`,
    label: block.title,
    kind: "block",
    blockId: block.id,
    orderIndex: block.orderIndex,
  }));
  const tasks: RaidStrategyTabItem[] = target.tasks.map((task) => ({
    key: `task-${target.id}-${task.id}`,
    label: task.label,
    kind: "task",
    taskId: task.id,
    orderIndex: task.orderIndex,
  }));
  return [...blocks, ...tasks].sort((left, right) => left.orderIndex - right.orderIndex);
}

function RaidStrategyItem({
  activity,
  target,
  item,
  onChanged,
}: {
  activity: ActivityDetail;
  target: ActivityRaidTarget;
  item: RaidStrategyTabItem;
  onChanged: () => Promise<void>;
}) {
  if (item.kind === "task") {
    return target.snapshot?.assignmentMode === "DIRECT" ? (
      <ActivityTactics activity={activity} target={target} focusTaskId={item.taskId} onChanged={onChanged} />
    ) : (
      <ActivityTaskPlan activity={activity} target={target} taskId={item.taskId} />
    );
  }
  const block = target.blocks.find((entry) => entry.id === item.blockId);
  if (block?.type === "POSITIONING") {
    return (
      <PositioningBoardLoader
        activity={activity}
        target={target}
        blockId={block.id}
        title={block.title}
        onChanged={onChanged}
      />
    );
  }
  if (target.snapshot?.assignmentMode === "DIRECT" && block?.type === "NOTES") {
    return <ActivityTactics activity={activity} target={target} focusNoteId={block.id} onChanged={onChanged} />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.label}</CardTitle>
        <CardDescription>{target.bossName}</CardDescription>
      </CardHeader>
      <CardContent>
        {block?.markdown ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{block.markdown}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">暂无内容。</p>
        )}
      </CardContent>
    </Card>
  );
}
function ActivityTaskPlan({
  activity,
  target,
  taskId,
}: {
  activity: ActivityDetail;
  target: NonNullable<NonNullable<ActivityDetail["raid"]>["targets"][number]>;
  taskId?: string;
}) {
  const sequence = target.tasks
    .filter((task) => task.kind === "SEQUENCE" && (!taskId || task.id === taskId))
    .sort((left, right) => left.orderIndex - right.orderIndex);
  const timeline = target.tasks
    .filter((task) => task.kind === "TIMELINE" && (!taskId || task.id === taskId))
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
              顺序任务
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

function ActivityOverview({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const [error, setError] = useState<string>();
  const [copiedInvite, setCopiedInvite] = useState(false);
  const action = useMutation({
    mutationFn: async (path: string) =>
      apiRequest(`/activities/${activity.id}/${path}`, idResultSchema, {
        method: "POST",
      }),
    onSuccess: onChanged,
    onError: (reason) => setError(reason.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap gap-2 text-4xl">
          {activity.name}
          <Badge variant={activity.status === "PUBLISHED" ? "default" : "secondary"}>
            {activityStatusLabels[activity.status]}
          </Badge>
          {activity.rosterLockedAt ? <Badge variant="outline">名单已锁定</Badge> : null}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 ">
          {activity.typeName || activityTypeLabels[activity.type]} {"//"} 负责人{": "}
          <UserIdentity user={activity.creator} />
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Info label="集合时间" value={formatDate(activity.teamUpAt)} />
          <Info label="开始时间" value={formatDate(activity.beginAt)} />
          <Info label="报名截止" value={activity.signupDeadline ? formatDate(activity.signupDeadline) : "未设置"} />
          <Info label="建议人数" value={activity.maxPlayers == null ? "不限" : `${activity.maxPlayers} 人`} />
          {activity.raid ? <Info label="团本" value={activity.raid.raidName} /> : null}
        </div>
        {[
          ["坦克", activity.tankSlots],
          ["治疗", activity.healerSlots],
          ["近战", activity.meleeSlots],
          ["远程", activity.rangedSlots],
        ].some(([, count]) => count != null) ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">建议职责构成（仅展示）</span>
            {(
              [
                ["坦克", activity.tankSlots],
                ["治疗", activity.healerSlots],
                ["近战", activity.meleeSlots],
                ["远程", activity.rangedSlots],
              ] as const
            )
              .filter(([, count]) => count != null)
              .map(([label, count]) => (
                <Badge key={label} variant="outline">
                  {label} {count}
                </Badge>
              ))}
          </div>
        ) : null}
        {activity.description ? <p className="whitespace-pre-wrap text-sm leading-6">{activity.description}</p> : null}
        {activity.passphrase ? (
          <Alert>
            <AlertTitle>游戏内私信进组</AlertTitle>
            {activity.inviter ? (
              <>
                <AlertDescription>复制后可直接粘贴到游戏聊天框发送。</AlertDescription>
                <div className="flex flex-wrap items-center gap-2">
                  <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm">
                    <code>{`/w ${activity.inviter.name}-${activity.inviter.realm} ${activity.passphrase}`}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const message =
                        "/w " +
                        activity.inviter?.name +
                        "-" +
                        activity.inviter?.realm +
                        " 进组暗号：" +
                        activity.passphrase;
                      void navigator.clipboard
                        .writeText(message)
                        .then(() => setCopiedInvite(true))
                        .catch(() => setError("无法访问剪贴板，请手动选择并复制私信内容。"));
                    }}
                  >
                    {copiedInvite ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                    {copiedInvite ? "已复制" : "复制私信"}
                  </Button>
                </div>
              </>
            ) : (
              <AlertDescription>进组暗号：{activity.passphrase}。活动负责人尚未设置邀请角色。</AlertDescription>
            )}
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
  const [inviterId, setInviterId] = useState<string | null>(activity.inviter?.id ?? null);
  const [inviterSelection, setInviterSelection] = useState<CharacterPickerSelection | null>(
    activity.inviter ? { memberName: "发起邀请角色", character: activity.inviter } : null,
  );
  useEffect(() => {
    if (!open) return;
    setInviterId(activity.inviter?.id ?? null);
    setInviterSelection(activity.inviter ? { memberName: "发起邀请角色", character: activity.inviter } : null);
  }, [activity.inviter, open]);
  const durationMinutes = Math.round(
    (new Date(activity.endAt).getTime() - new Date(activity.beginAt).getTime()) / 60_000,
  );
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof updateActivitySchema>) =>
      apiRequest(`/activities/${activity.id}`, activityDetailSchema, {
        method: "PATCH",
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
    const beginAt = localDateTimeToIso(String(data.get("beginAt") ?? ""));
    const teamUpAt = String(data.get("teamUpAt") ?? "");
    const signupDeadline = localDateTimeToIso(String(data.get("signupDeadline") ?? ""));
    const hasRosterGuidance = data.get("rosterGuidanceEnabled") === "1";
    const parsed = updateActivitySchema.safeParse({
      version: activity.version,
      name: data.get("name"),
      description: data.get("description") || undefined,
      passphrase: data.get("passphrase") || null,
      inviterId,
      beginAt,
      teamUpAt: teamUpAt ? localDateTimeToIso(teamUpAt) : undefined,
      signupDeadline,
      durationMinutes: Number(data.get("durationMinutes")),
      maxPlayers: hasRosterGuidance ? optionalNumber(data.get("maxPlayers")) : null,
      tankSlots: hasRosterGuidance ? optionalNumber(data.get("tankSlots")) : null,
      healerSlots: hasRosterGuidance ? optionalNumber(data.get("healerSlots")) : null,
      meleeSlots: hasRosterGuidance ? optionalNumber(data.get("meleeSlots")) : null,
      rangedSlots: hasRosterGuidance ? optionalNumber(data.get("rangedSlots")) : null,
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
            <ActivityScheduleFields
              key={`${activity.id}-${activity.version}-${open}`}
              initialBeginAt={toLocal(activity.beginAt)}
              initialSignupDeadline={activity.signupDeadline ? toLocal(activity.signupDeadline) : ""}
              initialTeamUpAt={toLocal(activity.teamUpAt)}
              initialDurationMinutes={durationMinutes}
            />
            <ActivityRosterGuidance
              key={`${activity.id}-${activity.version}-${open}-guidance`}
              initialMaxPlayers={activity.maxPlayers}
              initialTankSlots={activity.tankSlots}
              initialHealerSlots={activity.healerSlots}
              initialMeleeSlots={activity.meleeSlots}
              initialRangedSlots={activity.rangedSlots}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-passphrase">进组暗号 / 语音频道</FieldLabel>
                <Input
                  id="edit-passphrase"
                  name="passphrase"
                  defaultValue={activity.passphrase ?? ""}
                  maxLength={255}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-inviter">发起邀请角色</FieldLabel>
                <CharacterPicker
                  id="edit-inviter"
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
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Pencil data-icon="inline-start" />}
              保存修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      apiRequest(`/activities/${activity.id}/signups`, idResultSchema, {
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
                        onValueChange={(value) =>
                          setChoiceSpecs((current) => ({
                            ...current,
                            [character.id]: value,
                          }))
                        }
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
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
              提交报名
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelSignup({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/activities/${activity.id}/signups/me`, cancelledSchema, {
        method: "DELETE",
      }),
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

function SignupRoster({
  activity,
  onChanged,
  finalRosterOnly,
  onFinalRosterOnlyChange,
}: {
  activity: ActivityDetail;
  onChanged: () => Promise<void>;
  finalRosterOnly: boolean;
  onFinalRosterOnlyChange: (value: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: (path: string) =>
      apiRequest(`/activities/${activity.id}/roster/${path}`, z.object({ rosterLockedAt: z.string().nullable() }), {
        method: "POST",
      }),
    onSuccess: onChanged,
  });
  const allRows = activity.signups
    .filter((signup) => signup.status !== "CANCELLED")
    .sort((left, right) => {
      const order = {
        PENDING: 0,
        CONFIRMED: 1,
        BENCH: 2,
        REJECTED: 3,
        CANCELLED: 4,
      } as const;
      return order[left.status] - order[right.status] || left.signedUpAt.localeCompare(right.signedUpAt);
    });
  const visible = finalRosterOnly ? allRows.filter((signup) => signup.status === "CONFIRMED") : allRows;
  const roleCounts = visible.reduce<Record<Role, number>>(
    (counts, signup) => {
      if (signup.preferredRole) counts[signup.preferredRole] += 1;
      return counts;
    },
    { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 },
  );
  return (
    <Card className="ring-0">
      <CardHeader>
        <CardTitle>报名列表</CardTitle>
        <CardDescription>按待确认、已确认、替补、已拒绝排序；最终名单仅显示已确认成员。</CardDescription>
        <CardAction className="flex flex-wrap gap-2">
          <Button
            variant={finalRosterOnly ? "default" : "outline"}
            onClick={() => onFinalRosterOnlyChange(!finalRosterOnly)}
            aria-pressed={finalRosterOnly}
          >
            {finalRosterOnly ? "显示全部报名" : "切换最终名单"}
          </Button>
          {activity.canManage && activity.status !== "FINISHED" && activity.status !== "CANCELLED" ? (
            <>
              {!finalRosterOnly ? <BulkConfirmDialog activity={activity} onChanged={onChanged} /> : null}
              <Button
                variant="outline"
                onClick={() => mutation.mutate(activity.rosterLockedAt ? "unlock" : "lock")}
                disabled={mutation.isPending}
              >
                {activity.rosterLockedAt ? <LockOpen data-icon="inline-start" /> : <Lock data-icon="inline-start" />}
                {activity.rosterLockedAt ? "解锁名单" : "锁定名单"}
              </Button>
            </>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
          <Badge variant="outline">总人数 {visible.length}</Badge>
          {(["TANK", "HEALER", "MELEE", "RANGED"] as const).map((role) => (
            <Badge key={role} variant="secondary">
              {roleLabels[role]} {roleCounts[role]}
            </Badge>
          ))}
        </div>
        {mutation.error ? (
          <Alert variant="destructive">
            <AlertTitle>名单操作失败</AlertTitle>
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
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
                <TableHead>成员</TableHead>
                <TableHead>报名角色</TableHead>
                <TableHead>职业 / 专精</TableHead>
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
                    <div className="flex items-center gap-2">
                      <UserIdentity user={signup.member} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GameIcon src={signup.character.classIconUrl} alt="" className="size-6 rounded" />
                      <ClassAccent color={signup.character.classColor}>
                        {signup.character.name} · {signup.character.realm}
                      </ClassAccent>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const spec = signup.character.availableSpecs.find((entry) => entry.id === signup.preferredSpecId);
                      return spec ? (
                        <div className="flex items-center gap-2">
                          <GameIcon src={spec.iconUrl} alt="" className="size-5 rounded" />
                          <span>{spec.name}</span>
                        </div>
                      ) : (
                        "未指定"
                      );
                    })()}
                  </TableCell>
                  <TableCell>{signup.preferredRole ? roleLabels[signup.preferredRole] : "未指定"}</TableCell>
                  <TableCell>
                    <Badge variant={signup.status === "CONFIRMED" ? "default" : "secondary"}>
                      {statusLabels[signup.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{signup.groupNo ? `${signup.groupNo} 组` : "—"}</TableCell>
                  <TableCell className="max-w-56">
                    {signup.note ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="block max-w-56 truncate text-left underline decoration-dotted"
                          >
                            {signup.note}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="max-w-sm whitespace-pre-wrap">{signup.note}</HoverCardContent>
                      </HoverCard>
                    ) : (
                      "—"
                    )}
                  </TableCell>
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

function BulkConfirmDialog({ activity, onChanged }: { activity: ActivityDetail; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const pending = activity.signups.filter((signup) => signup.status === "PENDING");
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/activities/${activity.id}/signups/confirm-pending`, activityBulkConfirmResultSchema, {
        method: "POST",
      }),
    onSuccess: async () => {
      setOpen(false);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={pending.length === 0}>
          一键确认
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>一键确认待确认报名</DialogTitle>
          <DialogDescription>将确认以下 {pending.length} 人。替补和已拒绝报名不会被一键确认。</DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto rounded-md border">
          {pending.map((signup) => (
            <div key={signup.id} className="border-b px-3 py-2 last:border-b-0">
              <p className="truncate font-medium">{signup.memberName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {signup.character.name} · {signup.character.realm}
              </p>
            </div>
          ))}
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>批量确认失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            返回
          </Button>
          <Button disabled={!pending.length || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
            确认 {pending.length} 人
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
              保存结果
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
    <div className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}
function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}
function localDateTimeToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
function toLocal(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
