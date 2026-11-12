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
} from "@ttz/contracts";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleAlert,
  Lock,
  LockOpen,
  Send,
  ShieldCheck,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiRequest } from "@/lib/api-client";

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
      <SignupPanel activity={activity} onChanged={refresh} />
      <SignupRoster activity={activity} onChanged={refresh} />
    </div>
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
  const [role, setRole] = useState<Role | undefined>(activity.mySignup?.preferredRole ?? undefined);
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
    const parsed = signupSchema.safeParse({
      characterId: data.get("characterId"),
      preferredRole: role ?? null,
      note: data.get("note") || null,
      choices: [],
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查报名信息");
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
          <DialogDescription>选择本次出战角色和首选职责。报名确认后普通成员无法再修改。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="characterId">出战角色</FieldLabel>
              <NativeSelect
                id="characterId"
                name="characterId"
                required
                defaultValue={activity.mySignup?.character.id ?? ""}
              >
                <NativeSelectOption value="" disabled>
                  {characters.isPending ? "正在加载角色…" : "请选择角色"}
                </NativeSelectOption>
                {characters.data
                  ?.filter((character) => !character.isRetired)
                  .map((character) => (
                    <NativeSelectOption key={character.id} value={character.id}>
                      {character.name} · {character.realm}
                      {character.isMain ? "（主角色）" : ""}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <FieldDescription>没有可选角色时，请先在个人中心添加角色。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>首选职责</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={role}
                onValueChange={(value) => setRole((value as Role) || undefined)}
                className="flex-wrap"
              >
                {(Object.keys(roleLabels) as Role[]).map((item) => (
                  <ToggleGroupItem key={item} value={item}>
                    {roleLabels[item]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
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
            <Button type="submit" disabled={mutation.isPending || !characters.data?.length}>
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
              <NativeSelect
                id={`status-${signup.id}`}
                name="status"
                defaultValue={signup.status === "CANCELLED" ? "PENDING" : signup.status}
              >
                <NativeSelectOption value="PENDING">待确认</NativeSelectOption>
                <NativeSelectOption value="CONFIRMED">确认</NativeSelectOption>
                <NativeSelectOption value="BENCH">替补</NativeSelectOption>
                <NativeSelectOption value="REJECTED">拒绝</NativeSelectOption>
              </NativeSelect>
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
