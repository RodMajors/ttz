"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AnnouncementInput,
  announcementInputSchema,
  announcementListSchema,
  announcementSchema,
  authUserSchema,
  guildGroupListSchema,
} from "@ttz/contracts";
import { CircleAlert, Megaphone, Pencil, Pin, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

type Announcement = Awaited<ReturnType<typeof loadAnnouncements>>[number];
const statusLabels = { DRAFT: "草稿", ACTIVE: "启用", ARCHIVED: "已归档" } as const;

export function AnnouncementsScreen() {
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest("/auth/me", authUserSchema) });
  const announcements = useQuery({ queryKey: ["announcements"], queryFn: loadAnnouncements });
  const groups = useQuery({
    queryKey: ["guild-groups"],
    queryFn: () => apiRequest("/guild-groups", guildGroupListSchema),
  });
  if (announcements.isPending || me.isPending || groups.isPending) return <Skeleton className="h-96 w-full" />;
  if (announcements.isError || me.isError || groups.isError)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>公告暂时不可用</AlertTitle>
        <AlertDescription>
          {announcements.error?.message ?? me.error?.message ?? groups.error?.message}
        </AlertDescription>
      </Alert>
    );
  const canManage = me.data.privilege >= 1;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">公会通知</p>
          <h1 className="text-3xl font-semibold tracking-tight">公告</h1>
          <p className="mt-2 text-sm text-muted-foreground">按成员当前身份组投放；定时发布和过期由服务端判定。</p>
        </div>
        {canManage ? <AnnouncementDialog groups={groups.data} /> : null}
      </div>
      {announcements.data.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {announcements.data.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {announcement.isPinned ? <Pin /> : null}
                  {announcement.title}
                  <Badge variant={announcement.status === "ACTIVE" ? "default" : "secondary"}>
                    {statusLabels[announcement.status]}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {formatDate(announcement.publishAt)} ·{" "}
                  {announcement.audienceType === "ALL" ? "全体成员" : `${announcement.groupIds.length} 个身份组`}
                </CardDescription>
                {announcement.canManage ? (
                  <CardAction>
                    <AnnouncementDialog groups={groups.data} announcement={announcement} />
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-6">{announcement.content}</p>
                {announcement.expireAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">到期：{formatDate(announcement.expireAt)}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty className="min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Megaphone />
            </EmptyMedia>
            <EmptyTitle>暂无可见公告</EmptyTitle>
            <EmptyDescription>
              {canManage ? "创建第一条公告，或检查定时发布时间。" : "管理员发布公告后会显示在这里。"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function AnnouncementDialog({
  groups,
  announcement,
}: {
  groups: Awaited<ReturnType<typeof loadGroups>>;
  announcement?: Announcement;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<"ALL" | "GROUPS">(announcement?.audienceType ?? "ALL");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(announcement?.groupIds ?? []);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (body: AnnouncementInput) =>
      apiRequest(announcement ? `/announcements/${announcement.id}` : "/announcements", announcementSchema, {
        method: announcement ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = announcementInputSchema.safeParse({
      title: data.get("title"),
      content: data.get("content"),
      status: data.get("status"),
      audienceType: audience,
      groupIds: selectedGroups,
      isPinned: data.get("isPinned") === "on",
      publishAt: localToIso(data.get("publishAt")),
      expireAt: data.get("expireAt") ? localToIso(data.get("expireAt")) : null,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查公告内容");
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={announcement ? "outline" : "default"} size={announcement ? "sm" : "default"}>
          {announcement ? <Pencil data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          {announcement ? "编辑" : "创建公告"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{announcement ? "编辑公告" : "创建公告"}</DialogTitle>
          <DialogDescription>归档用于下线公告；不执行物理删除。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`title-${announcement?.id ?? "new"}`}>标题</FieldLabel>
              <Input
                id={`title-${announcement?.id ?? "new"}`}
                name="title"
                defaultValue={announcement?.title ?? ""}
                required
                maxLength={128}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`content-${announcement?.id ?? "new"}`}>正文</FieldLabel>
              <Textarea
                id={`content-${announcement?.id ?? "new"}`}
                name="content"
                className="min-h-32"
                defaultValue={announcement?.content ?? ""}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`status-${announcement?.id ?? "new"}`}>状态</FieldLabel>
                <Select name="status" defaultValue={announcement?.status ?? "DRAFT"}>
                  <SelectTrigger id={`status-${announcement?.id ?? "new"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="DRAFT">草稿</SelectItem>
                      <SelectItem value="ACTIVE">启用</SelectItem>
                      <SelectItem value="ARCHIVED">归档</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`audience-${announcement?.id ?? "new"}`}>投放范围</FieldLabel>
                <Select value={audience} onValueChange={(value) => setAudience(value as "ALL" | "GROUPS")}>
                  <SelectTrigger id={`audience-${announcement?.id ?? "new"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ALL">全体成员</SelectItem>
                      <SelectItem value="GROUPS">指定身份组</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {audience === "GROUPS" ? (
              <Field>
                <FieldLabel>身份组</FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {groups.map((group) => (
                    <label
                      htmlFor={`announcement-group-${announcement?.id ?? "new"}-${group.id}`}
                      key={group.id}
                      className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                    >
                      <Checkbox
                        id={`announcement-group-${announcement?.id ?? "new"}-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) =>
                          setSelectedGroups((current) =>
                            checked === true ? [...current, group.id] : current.filter((id) => id !== group.id),
                          )
                        }
                      />
                      {group.name}
                    </label>
                  ))}
                </div>
                <FieldDescription>公告按成员当前身份组实时过滤。</FieldDescription>
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`publish-${announcement?.id ?? "new"}`}>发布时间</FieldLabel>
                <Input
                  id={`publish-${announcement?.id ?? "new"}`}
                  name="publishAt"
                  type="datetime-local"
                  defaultValue={toLocal(announcement?.publishAt ?? new Date().toISOString())}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`expire-${announcement?.id ?? "new"}`}>到期时间（可选）</FieldLabel>
                <Input
                  id={`expire-${announcement?.id ?? "new"}`}
                  name="expireAt"
                  type="datetime-local"
                  defaultValue={announcement?.expireAt ? toLocal(announcement.expireAt) : ""}
                />
              </Field>
            </div>
            <Field orientation="horizontal">
              <Switch
                id={`pinned-${announcement?.id ?? "new"}`}
                name="isPinned"
                defaultChecked={announcement?.isPinned}
              />
              <FieldLabel htmlFor={`pinned-${announcement?.id ?? "new"}`}>置顶公告</FieldLabel>
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>无法保存公告</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Megaphone data-icon="inline-start" />}
              保存公告
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function loadAnnouncements() {
  return apiRequest("/announcements", announcementListSchema);
}
function loadGroups() {
  return apiRequest("/guild-groups", guildGroupListSchema);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(
    new Date(value),
  );
}
function toLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function localToIso(value: FormDataEntryValue | null) {
  return new Date(String(value)).toISOString();
}
