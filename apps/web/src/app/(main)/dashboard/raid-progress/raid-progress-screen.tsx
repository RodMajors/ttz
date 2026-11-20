"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  idSchema,
  publishedRaidStrategySchema,
  raidCatalogSchema,
  raidGuildSettingsSchema,
  raidProgressPlanListSchema,
} from "@ttz/contracts";
import { CircleAlert, CloudDownload, Plus, Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
const createdSchema = z.object({ id: idSchema }).passthrough();
const versionCreatedSchema = z.object({ id: idSchema, versionNo: z.number().int() });
type Plan = z.infer<typeof raidProgressPlanListSchema>[number];

export function RaidProgressScreen() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest("/auth/me", authUserSchema) });
  const plans = useQuery({
    queryKey: ["raid-progress", "plans"],
    queryFn: () => apiRequest("/raid-progress/plans", raidProgressPlanListSchema),
  });
  const catalog = useQuery({
    queryKey: ["raid-progress", "catalog"],
    queryFn: () => apiRequest("/raid-progress/catalog", raidCatalogSchema),
  });
  const settings = useQuery({
    queryKey: ["raid-progress", "settings"],
    queryFn: () => apiRequest("/raid-progress/settings/guild", raidGuildSettingsSchema),
    enabled: (me.data?.privilege ?? 0) >= 1,
  });
  const sync = useMutation({
    mutationFn: () => apiRequest("/raid-progress/sync", queuedSchema, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["raid-progress"] }),
  });
  const pending = me.isPending || plans.isPending || catalog.isPending;
  if (pending) return <Skeleton className="h-[36rem] w-full" />;
  const error = me.error ?? plans.error ?? catalog.error;
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
        <p className="text-sm text-muted-foreground">WCL 公会进度与战术规划</p>
        <h1 className="text-3xl font-semibold tracking-tight">团本进度</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          英雄与史诗分别维护；活动创建时引用已发布版本并生成独立快照。
        </p>
      </div>
      {canAdmin && settings.data ? <GuildSettingsCard value={settings.data} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>进度计划</CardTitle>
          <CardDescription>WCL 只更新上游值，人工覆盖拥有更高优先级。</CardDescription>
          {canAdmin ? (
            <CardAction className="flex gap-2">
              <CreatePlanDialog catalog={catalog.data ?? []} season={settings.data?.season ?? "current"} />
              <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
                {sync.isPending ? <Spinner data-icon="inline-start" /> : <CloudDownload data-icon="inline-start" />}同步
                WCL
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {plans.data?.length ? (
            plans.data.map((plan) => <PlanTable key={plan.id} plan={plan} canAdmin={canAdmin} />)
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>还没有进度计划</EmptyTitle>
                <EmptyDescription>管理员先同步 WCL 团本目录，再创建英雄或史诗计划。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GuildSettingsCard({ value }: { value: z.infer<typeof raidGuildSettingsSchema> }) {
  const client = useQueryClient();
  const [error, setError] = useState<string>();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      apiRequest("/raid-progress/settings/guild", raidGuildSettingsSchema, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => client.setQueryData(["raid-progress", "settings"], data),
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save.mutate({
      guildId: Number(data.get("guildId")),
      guildName: String(data.get("guildName")),
      serverId: Number(data.get("serverId")),
      serverName: String(data.get("serverName")),
      serverSlug: String(data.get("serverSlug")),
      serverRegion: String(data.get("serverRegion")),
      zoneId: Number(data.get("zoneId")),
      season: String(data.get("season")),
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>WCL 公会配置</CardTitle>
        <CardDescription>Client 密钥仍只保存在后端环境变量；这里保存非敏感公会与当前团本信息。</CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["guildId", "Guild ID", value.guildId],
                ["guildName", "公会名称", value.guildName],
                ["serverId", "服务器 ID", value.serverId],
                ["serverName", "服务器名称", value.serverName],
                ["serverSlug", "服务器 Slug", value.serverSlug],
                ["serverRegion", "区域", value.serverRegion],
                ["zoneId", "Zone ID", value.zoneId],
                ["season", "赛季", value.season],
              ].map(([name, label, initial]) => (
                <Field key={String(name)}>
                  <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
                  <Input
                    id={String(name)}
                    name={String(name)}
                    type={String(name).endsWith("Id") ? "number" : "text"}
                    defaultValue={String(initial)}
                    required
                  />
                </Field>
              ))}
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>保存失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </CardContent>
        <div className="flex justify-end px-6 pb-6">
          <Button disabled={save.isPending}>
            {save.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CreatePlanDialog({ catalog, season }: { catalog: z.infer<typeof raidCatalogSchema>; season: string }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const create = useMutation({
    mutationFn: (body: unknown) =>
      apiRequest("/raid-progress/plans", createdSchema, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["raid-progress"] });
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      raidId: data.get("raidId"),
      difficulty: data.get("difficulty"),
      season: data.get("season"),
      name: data.get("name"),
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          新建计划
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建团本进度计划</DialogTitle>
          <DialogDescription>同一团本、难度和赛季只能有一个计划。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="raidId">团本</FieldLabel>
              <Select name="raidId" required>
                <SelectTrigger id="raidId">
                  <SelectValue placeholder="选择已同步团本" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {catalog.map((raid) => (
                      <SelectItem key={raid.id} value={raid.id}>
                        {raid.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="difficulty">难度</FieldLabel>
              <Select name="difficulty" defaultValue="MYTHIC">
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="HEROIC">英雄</SelectItem>
                    <SelectItem value="MYTHIC">史诗</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="season">赛季</FieldLabel>
              <Input id="season" name="season" defaultValue={season} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="name">计划名称</FieldLabel>
              <Input id="name" name="name" placeholder="例如：烈毒之渊史诗开荒" required />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>创建失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanTable({ plan, canAdmin }: { plan: Plan; canAdmin: boolean }) {
  const difficulty = plan.difficulty === "MYTHIC" ? "史诗" : "英雄";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {plan.name}
          <Badge variant="outline">{difficulty}</Badge>
        </CardTitle>
        <CardDescription>
          {plan.raidName} · {plan.season} · 最近同步{" "}
          {plan.lastSyncedAt ? new Date(plan.lastSyncedAt).toLocaleString("zh-CN", { hour12: false }) : "未完成"}
        </CardDescription>
        <CardAction>
          <StrategyDialog plan={plan} canAdmin={canAdmin} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boss</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>最佳</TableHead>
              <TableHead>默认战术</TableHead>
              <TableHead>首杀</TableHead>
              {canAdmin ? <TableHead className="text-right">操作</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.bosses.map((boss) => (
              <TableRow key={boss.id}>
                <TableCell>{boss.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={boss.status === "DEFEATED" ? "default" : "secondary"}>
                      {boss.status === "DEFEATED" ? "已击杀" : boss.status === "PROGRESSING" ? "开荒中" : "未开始"}
                    </Badge>
                    {boss.manuallyOverridden ? <Badge variant="outline">人工</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>{boss.bestPercent == null ? "—" : `${boss.bestPercent.toFixed(2)}%`}</TableCell>
                <TableCell>{boss.defaultStrategy?.name ?? "未设置"}</TableCell>
                <TableCell>
                  {boss.firstKillAt ? new Date(boss.firstKillAt).toLocaleString("zh-CN", { hour12: false }) : "—"}
                </TableCell>
                {canAdmin ? (
                  <TableCell className="text-right">
                    <OverrideDialog boss={boss} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OverrideDialog({ boss }: { boss: Plan["bosses"][number] }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      apiRequest(`/raid-progress/bosses/${boss.progressId}/manual-override`, z.unknown(), {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["raid-progress", "plans"] });
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = String(data.get("status"));
    save.mutate({
      status,
      bestPercent: status === "DEFEATED" ? 0 : optionalNumber(data.get("bestPercent")),
      firstKillAt: dateOrNull(data.get("firstKillAt")),
      lastKillAt: dateOrNull(data.get("lastKillAt")),
      reason: String(data.get("reason") || "") || null,
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          人工覆盖
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{boss.name} · 人工覆盖</DialogTitle>
          <DialogDescription>人工值优先于 WCL；清除后恢复显示 WCL 聚合值。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel>状态</FieldLabel>
              <Select name="status" defaultValue={boss.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="NOT_STARTED">未开始</SelectItem>
                    <SelectItem value="PROGRESSING">开荒中</SelectItem>
                    <SelectItem value="DEFEATED">已击杀</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="bestPercent">最佳剩余血量 %</FieldLabel>
              <Input
                id="bestPercent"
                name="bestPercent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={boss.bestPercent ?? ""}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstKillAt">首杀时间</FieldLabel>
                <Input id="firstKillAt" name="firstKillAt" type="datetime-local" />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastKillAt">最近击杀</FieldLabel>
                <Input id="lastKillAt" name="lastKillAt" type="datetime-local" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="reason">覆盖理由</FieldLabel>
              <Input id="reason" name="reason" />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>保存失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending || !boss.manuallyOverridden}
              onClick={() =>
                save.mutate({ status: null, bestPercent: null, firstKillAt: null, lastKillAt: null, reason: null })
              }
            >
              清除覆盖
            </Button>
            <Button disabled={save.isPending}>
              {save.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  return value == null || value === "" ? null : Number(value);
}
function dateOrNull(value: FormDataEntryValue | null) {
  return value ? new Date(String(value)).toISOString() : null;
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
      await client.invalidateQueries({ queryKey: ["raid-progress", "strategies", plan.id] });
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
                {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}新建草稿
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
