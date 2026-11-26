"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  raidBossAttemptListSchema,
  raidBossBestPullGraphSchema,
  raidProgressPlanListSchema,
} from "@ttz/contracts";
import { CircleAlert, CloudDownload, ScrollText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  type DotItemDotProps,
  LabelList,
  type LabelProps,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { z } from "zod";
import { EpicProgressTimeline } from "@/components/epic-progress-timeline";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiRequest } from "@/lib/api-client";

const queuedSchema = z.object({
  jobId: z.string(),
  followUpJobIds: z.array(z.string()).default([]),
});
const syncStatusSchema = z.object({
  jobId: z.string(),
  state: z.string(),
  progress: z.unknown(),
  result: z.unknown(),
  failedReason: z.string().nullable(),
});
const syncProgressSchema = z.object({
  phase: z.enum(["preparing", "syncing"]),
  planName: z.string().optional(),
  planIndex: z.number().optional(),
  planCount: z.number().optional(),
  page: z.number().optional(),
  reportsRead: z.number().optional(),
  fightsRead: z.number().optional(),
});
const syncResultSchema = z.object({ followUpJobIds: z.array(z.string()).default([]) }).passthrough();
type Plan = z.infer<typeof raidProgressPlanListSchema>[number];
type BossAttempt = z.infer<typeof raidBossAttemptListSchema>[number];
type BestPullGraph = z.infer<typeof raidBossBestPullGraphSchema>;

export function RaidProgressScreen() {
  const client = useQueryClient();
  const [syncJobIds, setSyncJobIds] = useState<string[]>([]);
  const [syncError, setSyncError] = useState<string>();
  const [syncCompleted, setSyncCompleted] = useState(false);
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest("/auth/me", authUserSchema),
  });
  const plans = useQuery({
    queryKey: ["raid-progress", "plans"],
    queryFn: () => apiRequest("/raid-progress/plans", raidProgressPlanListSchema),
    refetchInterval: 30_000,
  });
  const sync = useMutation({
    mutationFn: () => apiRequest("/raid-progress/sync", queuedSchema, { method: "POST" }),
    onSuccess: ({ jobId, followUpJobIds }) => {
      setSyncError(undefined);
      setSyncCompleted(false);
      setSyncJobIds([jobId, ...followUpJobIds]);
    },
    onError: (error) => setSyncError(error.message),
  });
  const activeSyncJobId = syncJobIds[0];
  const syncStatus = useQuery({
    queryKey: ["raid-progress", "sync-status", activeSyncJobId],
    queryFn: () => {
      if (!activeSyncJobId) throw new Error("缺少 WCL 同步任务 ID");
      return apiRequest(`/raid-progress/sync/${encodeURIComponent(activeSyncJobId)}`, syncStatusSchema);
    },
    enabled: Boolean(activeSyncJobId),
    refetchInterval: (query) =>
      ["waiting", "active", "delayed", "prioritized", "waiting-children"].includes(query.state.data?.state ?? "")
        ? 1500
        : false,
  });
  useEffect(() => {
    const status = syncStatus.data;
    if (!activeSyncJobId || !status || !["completed", "failed", "missing"].includes(status.state)) return;

    if (status.state === "failed" || status.state === "missing") {
      setSyncError(
        status.failedReason ??
          (status.state === "missing" ? "WCL 同步任务状态已过期，请重新发起同步。" : "WCL 同步失败。"),
      );
      setSyncJobIds((current) => (current[0] === activeSyncJobId ? current.slice(1) : current));
      return;
    }

    const result = syncResultSchema.safeParse(status.result);
    const followUpJobIds = result.success ? result.data.followUpJobIds : [];
    const remainingJobIds = syncJobIds[0] === activeSyncJobId ? syncJobIds.slice(1) : syncJobIds;
    const nextJobIds = [...remainingJobIds, ...followUpJobIds];
    setSyncJobIds(nextJobIds);
    if (!nextJobIds.length) {
      setSyncCompleted(true);
      void client.invalidateQueries({ queryKey: ["raid-progress"] });
    }
  }, [activeSyncJobId, client, syncJobIds, syncStatus.data]);
  const progress = syncProgressSchema.safeParse(syncStatus.data?.progress);
  const visibleSyncError = syncError ?? (syncStatus.isError ? syncStatus.error.message : undefined);
  const isSyncWorking =
    sync.isPending ||
    Boolean(
      activeSyncJobId &&
        (syncStatus.isPending ||
          ["waiting", "active", "delayed", "prioritized", "waiting-children"].includes(syncStatus.data?.state ?? "")),
    );
  useEffect(() => {
    const toastId = "raid-progress-wcl-sync";
    if (isSyncWorking) {
      const description =
        progress.success && progress.data.phase === "syncing"
          ? `团本进度：${progress.data.planName ?? "WCL"}，已读取第 ${progress.data.page ?? 0} 页、${progress.data.reportsRead ?? 0} 份报告、${progress.data.fightsRead ?? 0} 场战斗` +
            (progress.data.planIndex && progress.data.planCount
              ? ` · 团本 ${progress.data.planIndex}/${progress.data.planCount}`
              : "") +
            (syncJobIds.length > 1 ? ` · 队列任务 1/${syncJobIds.length}` : "")
          : `同步任务已排队，正在准备读取 WCL 报告${syncJobIds.length > 1 ? ` · 队列任务 1/${syncJobIds.length}` : ""}。`;
      toast.loading("正在同步 WCL 公会报告", { id: toastId, description });
    } else if (visibleSyncError) {
      toast.error("WCL 同步未完成", {
        id: toastId,
        description: visibleSyncError,
      });
    } else if (syncCompleted) {
      toast.success("WCL 同步完成", { id: toastId });
    }
  }, [isSyncWorking, progress, syncCompleted, syncJobIds.length, visibleSyncError]);
  const pending = me.isPending || plans.isPending;
  if (pending) return <Skeleton className="h-[36rem] w-full" />;
  const error = me.error ?? plans.error;
  if (error)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>团本进度不可用</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  const canAdmin = (me.data?.privilege ?? 0) >= 1;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">The Twilight Zone</p>
        <h1 className="text-3xl font-semibold tracking-tight">团本进度</h1>
      </div>
      <EpicProgressTimeline
        plan={plans.data?.find((plan) => plan.difficulty === "MYTHIC" && plan.status === "ACTIVE") ?? null}
      />
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">进度计划</h2>
            <p className="text-sm text-muted-foreground">团本和首领信息由 WCL 同步维护。</p>
          </div>
          {canAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/raids">
                  <ScrollText data-icon="inline-start" />
                  团本战术
                </Link>
              </Button>
              <Button variant="outline" disabled={isSyncWorking} onClick={() => sync.mutate()}>
                {isSyncWorking ? <Spinner data-icon="inline-start" /> : <CloudDownload data-icon="inline-start" />}
                {isSyncWorking ? "WCL 同步中" : "同步 WCL"}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-5">
          {plans.data?.length ? (
            plans.data.map((plan) => <PlanTable key={plan.id} plan={plan} />)
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>还没有进度计划</EmptyTitle>
                <EmptyDescription>首次 WCL 同步时会自动建立赛季进度。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}/${get("month")}/${get("day")} - ${get("hour")}:${get("minute")}:${get("second")}`;
}

function PlanTable({ plan }: { plan: Plan }) {
  const difficulty = plan.difficulty === "MYTHIC" ? "史诗" : "英雄";
  return (
    <Card>
      <CardHeader className="relative isolate overflow-hidden">
        <CardTitle className="flex items-center gap-2 justify-center">
          {plan.raidIcon ? (
            <img
              src={plan.raidIcon ?? undefined}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
              className="size-12 object-contain"
            />
          ) : null}
          <div>
            <div className="flex items-center gap-2">
              {difficulty}-{plan.raidName}
              <Badge variant="outline">{plan.season}</Badge>
            </div>
            <CardDescription>
              最近同步 {plan.lastSyncedAt ? formatDateTime(plan.lastSyncedAt) : "尚未同步"}
            </CardDescription>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PlanPullSummary plan={plan} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>首领</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>最佳阶段 / 血量</TableHead>
              <TableHead>尝试次数</TableHead>
              <TableHead>首杀</TableHead>
              <TableHead>默认战术</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.bosses.map((boss) => (
              <BossProgressRow key={boss.id} planId={plan.id} boss={boss} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const pullChartColors = [
  "var(--color-blue-500)",
  "var(--color-orange-500)",
  "var(--color-emerald-500)",
  "var(--color-purple-500)",
  "var(--color-rose-500)",
];

function PlanPullSummary({ plan }: { plan: Plan }) {
  let cumulativePull = 0;
  const segments: Array<{
    key: string;
    start: number;
    end: number;
    y: number;
    name: string;
    color: string;
    label: string | null;
    pullCount: number;
  }> = [];
  const legend: Array<{ key: string; label: string; color: string }> = [];

  for (const [bossIndex, boss] of plan.bosses.entries()) {
    const pullCount = boss.attemptCount;
    if (pullCount <= 0) continue;
    let runStart = 0;
    let runStyle: { key: string; label: string | null; color: string } | null = null;
    const flush = (runEnd: number) => {
      if (!runStyle || runEnd <= runStart) return;
      const key = `segment-${segments.length}`;
      segments.push({
        key,
        start: cumulativePull + runStart,
        end: cumulativePull + runEnd,
        y: bossIndex + 0.5,
        name: `${boss.name}${runStyle.label ? ` · ${runStyle.label}` : ""}`,
        color: runStyle.color,
        label: runStyle.label,
        pullCount: runEnd - runStart,
      });
      legend.push({
        key,
        label: `${boss.name} · ${runStyle.label ? `${runStyle.label} · ` : ""}${runEnd - runStart} pulls`,
        color: runStyle.color,
      });
    };
    for (let pullIndex = 0; pullIndex < pullCount; pullIndex += 1) {
      const phase = boss.pullPhases[pullIndex];
      const style = phase?.phaseNumber
        ? phase.isIntermission
          ? {
              key: `intermission-${phase.phaseId ?? "unknown"}`,
              label: "转场",
              color: "var(--muted-foreground)",
            }
          : {
              key: `phase-${phase.phaseNumber}`,
              label: `P${phase.phaseNumber}`,
              color: pullChartColors[(phase.phaseNumber - 1) % pullChartColors.length] ?? "var(--color-blue-500)",
            }
        : {
            key: `boss-${boss.id}`,
            label: null,
            color: pullChartColors[bossIndex % pullChartColors.length] ?? "var(--color-blue-500)",
          };
      if (runStyle && runStyle.key !== style.key) {
        flush(pullIndex);
        runStart = pullIndex;
      }
      runStyle = style;
    }
    flush(pullCount);
    cumulativePull += pullCount;
  }

  if (cumulativePull === 0) {
    return <p className="mb-4 rounded-lg border px-3 py-2 text-sm text-muted-foreground">还没有可汇总的 Pull 数据。</p>;
  }

  const chartData = Array.from({ length: cumulativePull + 1 }, (_, pull) => {
    const row: Record<string, number | null> = { pull };
    for (const segment of segments) {
      row[segment.key] = pull >= segment.start && pull <= segment.end ? segment.y : null;
    }
    return row;
  });
  const chartConfig = Object.fromEntries(
    segments.map((segment) => [segment.key, { label: segment.name, color: segment.color }]),
  );

  return (
    <section className="mb-5 p-3">
      <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
        <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            type="number"
            dataKey="pull"
            domain={[0, cumulativePull]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            type="number"
            domain={[0, plan.bosses.length]}
            ticks={plan.bosses.map((_, index) => index + 0.5)}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => plan.bosses[Math.floor(value)]?.name ?? ""}
            width={92}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `累计 Pull ${value}`}
                formatter={(_value, name) => String(name)}
              />
            }
          />
          {segments.map((segment) => (
            <Line
              key={segment.key}
              type="linear"
              dataKey={segment.key}
              name={segment.name}
              stroke={segment.color}
              strokeWidth={7}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={segment.key}
                content={(props: LabelProps) => {
                  const labelIndex = Math.round((segment.start + segment.end) / 2);
                  if (props.index !== labelIndex || props.x == null || props.y == null || props.value == null)
                    return null;
                  return (
                    <text
                      x={props.x}
                      y={Number(props.y) - 8}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--foreground)"
                      stroke="var(--background)"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {segment.label ? `${segment.label} · ${segment.pullCount} pulls` : `${segment.pullCount} pulls`}
                    </text>
                  );
                }}
              />
            </Line>
          ))}
        </LineChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {legend.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function formatFightTime(timeMs: number) {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function BestPullMetricsChart({ graph }: { graph: BestPullGraph }) {
  const selectionLabel = graph.selection === "FIRST_KILL" ? "首次击杀" : "最低剩余血量";
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Pull {graph.pull} · {selectionLabel}
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`https://cn.warcraftlogs.com/reports/${graph.reportCode}#fight=${graph.fightId}`}
            target="_blank"
            rel="noreferrer"
          >
            打开 WCL 报告
          </a>
        </Button>
      </div>
      {graph.points.length ? (
        <ChartContainer
          config={{
            dps: { label: "DPS", color: "var(--color-blue-500)" },
            hps: { label: "HPS", color: "var(--color-emerald-500)" },
            dtps: { label: "DTPS（承伤）", color: "var(--color-rose-500)" },
          }}
          className="h-64 w-full aspect-auto"
        >
          <LineChart data={graph.points} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              type="number"
              dataKey="timeMs"
              domain={[0, graph.durationMs]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatFightTime}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => Math.round(value).toLocaleString()}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [`${Math.round(Number(value)).toLocaleString()} /秒`, name]}
                  labelFormatter={(value) => formatFightTime(Number(value))}
                />
              }
            />
            <Line type="monotone" dataKey="dps" name="DPS" stroke="var(--color-dps)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="hps" name="HPS" stroke="var(--color-hps)" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="dtps"
              name="DTPS（承伤）"
              stroke="var(--color-dtps)"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>WCL 没有返回这场战斗的曲线点</EmptyTitle>
            <EmptyDescription>仍可通过报告链接查看原始战斗数据。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function BossProgressRow({ planId, boss }: { planId: string; boss: Plan["bosses"][number] }) {
  const [open, setOpen] = useState(false);
  const [chartMode, setChartMode] = useState<"progress" | "best-pull">("progress");
  const attempts = useQuery({
    queryKey: ["raid-progress", "attempts", planId, boss.id],
    queryFn: () => apiRequest(`/raid-progress/plans/${planId}/bosses/${boss.id}/attempts`, raidBossAttemptListSchema),
    enabled: open,
  });
  const bestPullGraph = useQuery({
    queryKey: ["raid-progress", "best-pull-graph", planId, boss.id],
    queryFn: () =>
      apiRequest(
        `/raid-progress/plans/${planId}/bosses/${boss.id}/best-attempt-metrics`,
        raidBossBestPullGraphSchema.nullable(),
      ),
    enabled: open && chartMode === "best-pull",
    staleTime: 30 * 60_000,
  });
  let furthestPhaseId = 0;
  let furthestPhaseLabel: string | null = null;
  const chartAttempts = attempts.data?.map((attempt) => {
    for (const transition of attempt.phaseData?.transitions ?? []) {
      if (transition.phaseId > furthestPhaseId) {
        furthestPhaseId = transition.phaseId;
        furthestPhaseLabel = attemptProgressPhase(attempt.phaseData, furthestPhaseId);
      }
    }
    furthestPhaseLabel ??= attemptProgressPhase(attempt.phaseData, furthestPhaseId);
    return { ...attempt, phaseLabel: furthestPhaseLabel };
  });
  return (
    <>
      <TableRow onClick={() => setOpen((value) => !value)} className="cursor-pointer">
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <GameIcon
              src={boss.icon}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
              className="w-20 object-contain"
            />
            <span>{boss.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge
            variant={boss.status === "NOT_STARTED" ? "secondary" : "outline"}
            className={
              boss.status === "DEFEATED"
                ? "border-green-600 bg-green-600 text-white dark:border-green-700 dark:bg-green-700"
                : boss.status === "PROGRESSING"
                  ? "border-foreground bg-transparent text-foreground"
                  : undefined
            }
          >
            {boss.status === "DEFEATED" ? "已击杀" : boss.status === "PROGRESSING" ? "开荒中" : "未开始"}
          </Badge>
        </TableCell>
        <TableCell>
          {boss.status === "DEFEATED" ? (
            "完成！"
          ) : boss.bestPercent == null ? (
            "—"
          ) : (
            <span className="flex items-center gap-2 tabular-nums">
              {boss.bestPhaseNumber ? (
                <Badge variant="outline">
                  P{boss.bestPhaseNumber}
                  {boss.bestPhaseIsIntermission ? " 转场" : ""}
                </Badge>
              ) : null}
              {boss.bestPercent.toFixed(2)}%
            </span>
          )}
        </TableCell>
        <TableCell>{boss.attemptCount === 0 ? "—" : boss.attemptCount}</TableCell>
        <TableCell className="font-mono tabular-nums">
          {boss.firstKillAt ? formatDateTime(boss.firstKillAt) : "—"}
        </TableCell>
        <TableCell>{boss.defaultStrategy?.name ?? "未设置"}</TableCell>
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={6} className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {chartMode === "progress"
                  ? "灰线为 WCL 当前 Boss 剩余血量，橙线为整体战斗进度；悬停可查看累计到达阶段。"
                  : "展示首次击杀；若尚未击杀，则展示 Boss 剩余血量最低的一 Pull。"}
              </p>
              <ToggleGroup
                type="single"
                value={chartMode}
                onValueChange={(value) => {
                  if (value === "progress" || value === "best-pull") setChartMode(value);
                }}
                size="sm"
                variant="outline"
                aria-label="选择 Boss 拉次图表"
              >
                <ToggleGroupItem value="progress">进度</ToggleGroupItem>
                <ToggleGroupItem value="best-pull">最佳 Pull 数据</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {chartMode === "progress" ? (
              attempts.isPending ? (
                <Skeleton className="h-48 w-full" />
              ) : attempts.error ? (
                <p className="text-sm text-destructive">{attempts.error.message}</p>
              ) : chartAttempts?.length ? (
                <ChartContainer
                  config={{
                    bossPercent: {
                      label: "Boss 剩余血量",
                      color: "var(--muted-foreground)",
                    },
                    fightPercent: {
                      label: "整体战斗进度",
                      color: "var(--color-orange-500)",
                    },
                  }}
                  className="h-56 w-full aspect-auto"
                >
                  <LineChart data={chartAttempts} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="pull" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
                          labelFormatter={(value, payload) => {
                            const point = payload[0]?.payload as
                              | (BossAttempt & { phaseLabel: string | null })
                              | undefined;
                            return [`Pull ${value}`, point?.phaseLabel].filter(Boolean).join(" · ");
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="bossPercent"
                      name="Boss 剩余血量"
                      connectNulls={false}
                      stroke="var(--color-bossPercent)"
                      strokeWidth={2}
                      dot={createAttemptDot("var(--muted-foreground)")}
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fightPercent"
                      name="整体战斗进度"
                      connectNulls={false}
                      stroke="var(--color-fightPercent)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={createAttemptDot("var(--color-orange-500)")}
                      activeDot={false}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>暂无 WCL 拉次数据</EmptyTitle>
                    <EmptyDescription>同步完成后会显示 Boss 剩余血量、整体战斗进度和阶段信息。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            ) : bestPullGraph.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : bestPullGraph.error ? (
              <p className="text-sm text-destructive">{bestPullGraph.error.message}</p>
            ) : bestPullGraph.data ? (
              <BestPullMetricsChart graph={bestPullGraph.data} />
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>暂无可用的最佳 Pull 数据</EmptyTitle>
                  <EmptyDescription>请先同步 WCL 拉次记录，或检查该 Pull 是否有公开报告。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function createAttemptDot(color: string) {
  return (props: DotItemDotProps) => {
    const point = props.payload as BossAttempt | undefined;
    const reportUrl =
      point?.reportCode && point.fightId
        ? `https://cn.warcraftlogs.com/reports/${point.reportCode}#fight=${point.fightId}`
        : undefined;
    const circle = <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke="var(--background)" strokeWidth={2} />;
    if (!reportUrl) return circle;
    return (
      <a
        href={reportUrl}
        target="_blank"
        rel="noreferrer"
        className="cursor-pointer"
        aria-label={`在 WCL 打开 Pull ${point?.pull ?? ""} 报告`}
      >
        <circle cx={props.cx} cy={props.cy} r={12} fill="transparent" pointerEvents="all" />
        <circle
          cx={props.cx}
          cy={props.cy}
          r={4}
          fill={color}
          stroke="var(--background)"
          strokeWidth={2}
          pointerEvents="none"
        />
      </a>
    );
  };
}

function attemptProgressPhase(phaseData: BossAttempt["phaseData"], phaseId: number) {
  const phase = phaseData?.phases.find((item) => item.id === phaseId);
  if (!phase) return null;
  return phase.isIntermission ? `转场 · ${phase.name}` : `阶段 ${phaseId} · ${phase.name}`;
}
