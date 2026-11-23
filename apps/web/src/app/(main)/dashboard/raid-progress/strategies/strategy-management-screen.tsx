"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  bossStrategyCreateSchema,
  bossStrategyManagementListSchema,
  bossStrategyUpdateSchema,
  idSchema,
  raidProgressPlanListSchema,
  strategyMutationResultSchema,
  strategyStatusResultSchema,
} from "@ttz/contracts";
import { Archive, ArrowLeft, Check, CircleAlert, FilePlus2, Pencil, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/app-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

const versionCreatedSchema = z.object({ id: idSchema, versionNo: z.number().int() });
type ManagedStrategy = z.infer<typeof bossStrategyManagementListSchema>[number];
type Plan = z.infer<typeof raidProgressPlanListSchema>[number];
const statusLabel = { DRAFT: "草稿 / 待审核", PUBLISHED: "已发布", ARCHIVED: "版本已归档" } as const;

export function StrategyManagementScreen() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest("/auth/me", authUserSchema) });
  const plans = useQuery({
    queryKey: ["raid-progress", "plans"],
    queryFn: () => apiRequest("/raid-progress/plans", raidProgressPlanListSchema),
  });
  const strategies = useQuery({
    queryKey: ["raid-progress", "strategy-management"],
    queryFn: () => apiRequest("/raid-progress/strategies/manage", bossStrategyManagementListSchema),
    enabled: (me.data?.privilege ?? 0) >= 1,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["raid-progress", "strategy-management"] }),
      client.invalidateQueries({ queryKey: ["raid-progress", "plans"] }),
    ]);
  };
  const pending = me.isPending || plans.isPending || ((me.data?.privilege ?? 0) >= 1 && strategies.isPending);
  if (pending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  const error = me.error ?? plans.error ?? strategies.error;
  if (error)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>战术方案加载失败</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  if ((me.data?.privilege ?? 0) < 1)
    return (
      <Alert variant="destructive">
        <ShieldCheck />
        <AlertTitle>仅管理员可管理战术方案</AlertTitle>
        <AlertDescription>已发布战术仍可在活动与团本进度页面查看。</AlertDescription>
      </Alert>
    );
  const list = strategies.data ?? [];
  const grouped = new Map<string, ManagedStrategy[]>();
  for (const strategy of list)
    grouped.set(strategy.progressPlanId, [...(grouped.get(strategy.progressPlanId) ?? []), strategy]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-3">
            <Link href="/dashboard/raid-progress">
              <ArrowLeft data-icon="inline-start" />
              返回团本进度
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">模板 · 草稿 · 发布审核 · 版本归档</p>
          <h1 className="text-3xl font-semibold tracking-tight">战术方案管理</h1>
        </div>
        <CreateStrategyDialog plans={plans.data ?? []} onChanged={refresh} />
      </div>
      <Alert>
        <ShieldCheck />
        <AlertTitle>发布权限</AlertTitle>
        <AlertDescription>
          草稿和版本编辑仅管理员可操作；发布视为审核通过并生成不可变版本。归档保留历史快照，不会硬删除引用中的战术。
        </AlertDescription>
      </Alert>
      {list.length === 0 ? (
        <Empty className="min-h-64 border">
          <EmptyHeader>
            <EmptyTitle>还没有战术方案</EmptyTitle>
            <EmptyDescription>
              选择进度计划与 Boss 创建方案草稿；创建后可从这里继续管理，不会丢失入口。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {(plans.data ?? []).map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>
              {plan.raidName} · {plan.difficulty === "MYTHIC" ? "史诗" : "英雄"} · {plan.season}
            </CardDescription>
            <CardAction>
              <CreateStrategyDialog plans={[plan]} onChanged={refresh} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(grouped.get(plan.id) ?? []).map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} onChanged={refresh} />
            ))}
            {(grouped.get(plan.id) ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">此进度计划还没有方案。选择一个 Boss 创建草稿。</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StrategyCard({ strategy, onChanged }: { strategy: ManagedStrategy; onChanged: () => Promise<void> }) {
  const [error, setError] = useState<string>();
  const draft = strategy.versions.find((version) => version.status === "DRAFT");
  const createVersion = useMutation({
    mutationFn: () =>
      apiRequest(`/raid-progress/strategies/${strategy.id}/versions`, versionCreatedSchema, { method: "POST" }),
    onSuccess: async (version) => {
      await onChanged();
      window.location.assign(`/dashboard/raid-progress/strategies/${version.id}`);
    },
    onError: (reason) => setError(reason.message),
  });
  const action = useMutation({
    mutationFn: (kind: "archive" | "restore" | "default") =>
      apiRequest(`/raid-progress/strategies/${strategy.id}/${kind}`, strategyStatusResultSchema, { method: "POST" }),
    onSuccess: onChanged,
    onError: (reason) => setError(reason.message),
  });
  const setDefault = useMutation({
    mutationFn: () =>
      apiRequest(`/raid-progress/strategies/${strategy.id}/default`, z.object({ strategyId: idSchema }).passthrough(), {
        method: "POST",
      }),
    onSuccess: onChanged,
    onError: (reason) => setError(reason.message),
  });
  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {strategy.bossName} · {strategy.name}
            </h3>
            <Badge variant={strategy.status === "ACTIVE" ? "outline" : "secondary"}>
              {strategy.status === "ACTIVE" ? "启用" : "已归档"}
            </Badge>
            {strategy.isDefault ? (
              <Badge>
                <Check data-icon="inline-start" />
                默认方案
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{strategy.description || ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {strategy.difficulty === "MYTHIC" ? "史诗" : "英雄"} ·{" "}
            {strategy.planStatus === "ACTIVE" ? "当前进度计划" : "历史进度计划"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditStrategyDialog strategy={strategy} onChanged={onChanged} />
          {strategy.status === "ACTIVE" &&
          !strategy.isDefault &&
          strategy.versions.some((v) => v.status === "PUBLISHED") ? (
            <Button size="sm" variant="outline" disabled={setDefault.isPending} onClick={() => setDefault.mutate()}>
              <Check data-icon="inline-start" />
              设为默认
            </Button>
          ) : null}
          {strategy.status === "ACTIVE" ? (
            <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate("archive")}>
              <Archive data-icon="inline-start" />
              归档
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate("restore")}>
              <RotateCcw data-icon="inline-start" />
              恢复
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 rounded-md bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">版本记录 · {strategy.versions.length}</p>
          {strategy.status === "ACTIVE" && !draft ? (
            <Button
              size="sm"
              variant="outline"
              disabled={createVersion.isPending}
              onClick={() => createVersion.mutate()}
            >
              {createVersion.isPending ? <Spinner data-icon="inline-start" /> : <FilePlus2 data-icon="inline-start" />}
              从当前版本复制新草稿
            </Button>
          ) : null}
        </div>
        {strategy.versions.length ? (
          strategy.versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    version.status === "PUBLISHED" ? "default" : version.status === "DRAFT" ? "secondary" : "outline"
                  }
                >
                  v{version.versionNo} · {statusLabel[version.status]}
                </Badge>
                {version.changeSummary ? <span className="text-sm">{version.changeSummary}</span> : null}
                <span className="text-xs text-muted-foreground">
                  创建 {version.createdByName}
                  {version.publishedByName ? ` · 发布审核 ${version.publishedByName}` : ""}
                </span>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/raid-progress/strategies/${version.id}`}>
                  {version.status === "DRAFT" ? "继续编辑 / 审核发布" : "查看版本"}
                </Link>
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">尚无版本记录。</p>
        )}
      </div>
    </div>
  );
}

function CreateStrategyDialog({ plans, onChanged }: { plans: Plan[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [bossId, setBossId] = useState(plans[0]?.bosses[0]?.id ?? "");
  const [error, setError] = useState<string>();
  const client = useQueryClient();
  const currentPlan = plans.find((plan) => plan.id === planId) ?? plans[0];
  const create = useMutation({
    mutationFn: (body: z.infer<typeof bossStrategyCreateSchema>) =>
      apiRequest("/raid-progress/strategies", strategyMutationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setOpen(false);
      await onChanged();
      await client.invalidateQueries({ queryKey: ["raid-progress"] });
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const parsed = bossStrategyCreateSchema.safeParse({
      progressPlanId: planId,
      bossId,
      name: data.get("name"),
      description: data.get("description") || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    create.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus data-icon="inline-start" />
          新建战术草稿
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建战术方案草稿</DialogTitle>
          <DialogDescription>草稿会立即出现在本管理页，并可继续编辑和发布审核。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            {plans.length > 1 ? (
              <Field>
                <FieldLabel>进度计划</FieldLabel>
                <Select
                  value={planId}
                  onValueChange={(value) => {
                    setPlanId(value);
                    setBossId(plans.find((plan) => plan.id === value)?.bosses[0]?.id ?? "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择计划" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} · {plan.difficulty === "MYTHIC" ? "史诗" : "英雄"}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field>
              <FieldLabel>Boss</FieldLabel>
              <Select value={bossId} onValueChange={setBossId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择 Boss" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {currentPlan?.bosses.map((boss) => (
                      <SelectItem key={boss.id} value={boss.id}>
                        {boss.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="strategy-name">方案名称</FieldLabel>
              <Input
                id="strategy-name"
                name="name"
                required
                minLength={2}
                maxLength={128}
                placeholder="例如：稳健打法"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="strategy-description">说明</FieldLabel>
              <Textarea id="strategy-description" name="description" maxLength={500} />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}创建草稿
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStrategyDialog({ strategy, onChanged }: { strategy: ManagedStrategy; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const update = useMutation({
    mutationFn: (body: z.infer<typeof bossStrategyUpdateSchema>) =>
      apiRequest(`/raid-progress/strategies/${strategy.id}`, strategyMutationResultSchema, {
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
    const parsed = bossStrategyUpdateSchema.safeParse({
      name: data.get("name"),
      description: data.get("description") || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    update.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil data-icon="inline-start" />
          编辑信息
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑方案信息</DialogTitle>
          <DialogDescription>已发布战术版本不可变；这里仅修改方案名称和说明。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`name-${strategy.id}`}>方案名称</FieldLabel>
              <Input
                id={`name-${strategy.id}`}
                name="name"
                required
                minLength={2}
                maxLength={128}
                defaultValue={strategy.name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`description-${strategy.id}`}>说明</FieldLabel>
              <Textarea
                id={`description-${strategy.id}`}
                name="description"
                maxLength={500}
                defaultValue={strategy.description ?? ""}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Spinner data-icon="inline-start" /> : <Pencil data-icon="inline-start" />}保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
