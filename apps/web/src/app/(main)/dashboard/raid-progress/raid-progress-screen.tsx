"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  idSchema,
  publishedRaidStrategySchema,
  raidBossAttemptListSchema,
  raidProgressPlanListSchema,
} from "@ttz/contracts";
import { CircleAlert, CloudDownload, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { z } from "zod";
import { EpicProgressTimeline } from "@/components/epic-progress-timeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api-client";

const queuedSchema = z.object({ jobId: z.string() });
const versionCreatedSchema = z.object({
  id: idSchema,
  versionNo: z.number().int(),
});
type Plan = z.infer<typeof raidProgressPlanListSchema>[number];

export function RaidProgressScreen() {
  const client = useQueryClient();
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
    onSuccess: () => client.invalidateQueries({ queryKey: ["raid-progress"] }),
  });
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
            <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
              {sync.isPending ? <Spinner data-icon="inline-start" /> : <CloudDownload data-icon="inline-start" />}
              同步 WCL
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-5">
          {plans.data?.length ? (
            plans.data.map((plan) => <PlanTable key={plan.id} plan={plan} canAdmin={canAdmin} />)
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

function PlanTable({ plan, canAdmin }: { plan: Plan; canAdmin: boolean }) {
  const difficulty = plan.difficulty === "MYTHIC" ? "史诗" : "英雄";
  return (
    <Card>
      <CardHeader className="relative isolate overflow-hidden">
        {plan.raidBackground ? (
          <img
            src={plan.raidBackground ?? undefined}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-64 object-cover opacity-10"
          />
        ) : null}
        <CardTitle className="flex items-center gap-2">
          {plan.raidIcon ? (
            <img
              src={plan.raidIcon ?? undefined}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
              className="size-9 object-contain"
            />
          ) : null}
          {difficulty}-{plan.raidName}
          <Badge variant="outline">{plan.season}</Badge>
        </CardTitle>
        <CardDescription>最近同步 {plan.lastSyncedAt ? formatDateTime(plan.lastSyncedAt) : "尚未同步"}</CardDescription>
        <CardAction>
          <StrategyDialog plan={plan} canAdmin={canAdmin} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>首领</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>最佳</TableHead>
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

function BossProgressRow({ planId, boss }: { planId: string; boss: Plan["bosses"][number] }) {
  const [open, setOpen] = useState(false);
  const attempts = useQuery({
    queryKey: ["raid-progress", "attempts", planId, boss.id],
    queryFn: () => apiRequest(`/raid-progress/plans/${planId}/bosses/${boss.id}/attempts`, raidBossAttemptListSchema),
    enabled: open,
  });
  return (
    <>
      <TableRow onClick={() => setOpen((value) => !value)} className="cursor-pointer">
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {boss.icon ? (
              <img
                src={boss.icon ?? undefined}
                alt=""
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
                className="w-20 object-contain"
                loading="lazy"
              />
            ) : null}
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
          {boss.status === "DEFEATED" ? "完成！" : boss.bestPercent == null ? "—" : `${boss.bestPercent.toFixed(2)}%`}
        </TableCell>
        <TableCell>{boss.attemptCount}</TableCell>
        <TableCell className="font-mono tabular-nums">
          {boss.firstKillAt ? formatDateTime(boss.firstKillAt) : "—"}
        </TableCell>
        <TableCell>{boss.defaultStrategy?.name ?? "未设置"}</TableCell>
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={6} className="p-4">
            {attempts.isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : attempts.error ? (
              <p className="text-sm text-destructive">{attempts.error.message}</p>
            ) : attempts.data?.length ? (
              <>
                <p className="mb-2 text-sm text-muted-foreground">每次 Pull 结束时 Boss 剩余血量；击杀记为 0%。</p>
                <ChartContainer
                  config={{
                    bossPercent: { label: "剩余血量", color: "var(--chart-1)" },
                  }}
                  className="h-56 w-full aspect-auto"
                >
                  <LineChart data={attempts.data} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
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
                          formatter={(value) => `${Number(value).toFixed(2)}%`}
                          labelFormatter={(value) => `Pull ${value}`}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="bossPercent"
                      connectNulls={false}
                      stroke="var(--color-bossPercent)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>暂无 WCL 拉次数据</EmptyTitle>
                  <EmptyDescription>同步完成后会显示 Boss 血量曲线。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function StrategyDialog({ plan, canAdmin }: { plan: Plan; canAdmin: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [bossId, setBossId] = useState(plan.bosses[0]?.id ?? "");
  const [error, setError] = useState<string>();
  const strategies = useQuery({
    queryKey: ["raid-progress", "strategies", plan.id],
    queryFn: () => apiRequest(`/raid-progress/plans/${plan.id}/strategies`, publishedRaidStrategySchema),
    enabled: open,
  });
  const create = useMutation({
    mutationFn: (body: unknown) =>
      apiRequest("/raid-progress/strategies", z.object({ id: idSchema, draftVersionId: idSchema.nullable() }), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (data) => {
      await client.invalidateQueries({
        queryKey: ["raid-progress", "strategies", plan.id],
      });
      if (data.draftVersionId) window.location.assign(`/dashboard/raid-progress/strategies/${data.draftVersionId}`);
    },
    onError: (reason) => setError(reason.message),
  });
  const createVersion = useMutation({
    mutationFn: (strategyId: string) =>
      apiRequest(`/raid-progress/strategies/${strategyId}/versions`, versionCreatedSchema, { method: "POST" }),
    onSuccess: (data) => window.location.assign(`/dashboard/raid-progress/strategies/${data.id}`),
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      progressPlanId: plan.id,
      bossId,
      name: data.get("name"),
      description: data.get("description") || null,
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{canAdmin ? "战术方案" : "查看战术"}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan.name} · 战术方案</DialogTitle>
          <DialogDescription>创建草稿并由管理员发布；活动只能引用已发布版本。</DialogDescription>
        </DialogHeader>
        {canAdmin ? (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Boss</FieldLabel>
                <Select value={bossId} onValueChange={setBossId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {plan.bosses.map((boss) => (
                        <SelectItem key={boss.id} value={boss.id}>
                          {boss.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="strategyName">方案名称</FieldLabel>
                <Input id="strategyName" name="name" placeholder="例如：稳健打法" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="strategyDescription">说明</FieldLabel>
                <Input id="strategyDescription" name="description" />
              </Field>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>创建失败</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button disabled={create.isPending}>
                {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                新建草稿
              </Button>
            </DialogFooter>
          </form>
        ) : null}
        <div className="flex flex-col gap-2">
          {strategies.data?.map((strategy) => (
            <div key={strategy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">
                  {strategy.bossName} · {strategy.name}
                </p>
                <p className="text-xs text-muted-foreground">已发布 {strategy.versions.length} 个版本</p>
              </div>
              <div className="flex items-center gap-2">
                {strategy.isDefault ? <Badge>默认</Badge> : null}
                {strategy.versions[0] ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={`/dashboard/raid-progress/strategies/${strategy.versions[0].id}`}>
                      查看 v{strategy.versions[0].versionNo}
                    </a>
                  </Button>
                ) : null}
                {canAdmin ? (
                  <Button
                    size="sm"
                    disabled={createVersion.isPending}
                    onClick={() => createVersion.mutate(strategy.id)}
                  >
                    {createVersion.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                    新建草稿
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
