"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  characterVerificationDecisionSchema,
  guildGroupInputSchema,
  guildGroupListSchema,
  guildGroupSchema,
  memberApprovalSchema,
  memberListSchema,
  pendingCharacterVerificationSchema,
  pendingMemberListSchema,
} from "@ttz/contracts";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Plus, ShieldCheck, UserCheck, Users, X } from "lucide-react";
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
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { MemberTable } from "../../_components/member-table";

const changedSchema = z.unknown();

export function MembersScreen() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest("/auth/me", authUserSchema),
  });
  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => apiRequest("/members?page=1&pageSize=100", memberListSchema),
  });
  const groups = useQuery({
    queryKey: ["guild-groups"],
    queryFn: () => apiRequest("/guild-groups", guildGroupListSchema),
  });
  const pending = useQuery({
    queryKey: ["members", "pending"],
    queryFn: () => apiRequest("/members/pending?page=1&pageSize=50", pendingMemberListSchema),
    enabled: (me.data?.privilege ?? 0) >= 1,
  });
  const pendingCharacters = useQuery({
    queryKey: ["characters", "pending-verification"],
    queryFn: () => apiRequest("/characters/pending-verification", pendingCharacterVerificationSchema),
    enabled: (me.data?.privilege ?? 0) >= 1,
  });
  const [error, setError] = useState<string>();
  const visibleMembers =
    members.data?.items.filter((member) => {
      const keyword = search.trim().toLocaleLowerCase("zh-CN");
      const matchesSearch =
        !keyword ||
        [member.name, member.guildNickname, member.wxNickname, ...member.characters.map((character) => character.name)]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase("zh-CN").includes(keyword));
      const matchesGroup = !groupId || member.groups.some((group) => group.id === groupId);
      return matchesSearch && matchesGroup;
    }) ?? [];
  const memberPageSize = 10;
  const memberPageCount = Math.max(1, Math.ceil(visibleMembers.length / memberPageSize));
  const pagedMembers = visibleMembers.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize);
  const mutate = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: "POST" | "PATCH" | "DELETE"; body?: unknown }) =>
      apiRequest(path, changedSchema, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: async () => {
      setError(undefined);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["members"] }),
        client.invalidateQueries({ queryKey: ["guild-groups"] }),
        client.invalidateQueries({
          queryKey: ["characters", "pending-verification"],
        }),
        client.invalidateQueries({ queryKey: ["characters"] }),
      ]);
    },
    onError: (reason) => setError(reason.message),
  });
  if (me.isPending || members.isPending || groups.isPending) return <Skeleton className="h-96 w-full" />;
  if (me.isError || members.isError || groups.isError)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>成员数据暂时不可用</AlertTitle>
        <AlertDescription>{me.error?.message ?? members.error?.message ?? groups.error?.message}</AlertDescription>
      </Alert>
    );
  return (
    <div className="flex flex-col gap-5">
      {me.data.privilege >= 1 ? <PendingMembers query={pending} mutate={mutate} /> : null}
      {me.data.privilege >= 1 ? <PendingCharacters query={pendingCharacters} mutate={mutate} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>成员列表</CardTitle>
          <CardDescription>身份组只用于展示和统计，权限由审核状态与管理员决定。</CardDescription>
          <CardAction className="flex gap-2">
            <Input
              className="w-52"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setMemberPage(1);
              }}
              placeholder="搜索成员或角色"
              aria-label="搜索成员或角色"
            />
            <Select
              value={groupId || "all"}
              onValueChange={(value) => {
                setGroupId(value === "all" ? "" : value);
                setMemberPage(1);
              }}
            >
              <SelectTrigger aria-label="按身份组筛选">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部身份组</SelectItem>
                  {groups.data.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          {visibleMembers.length === 0 ? (
            <Empty className="min-h-52 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>暂无已审核成员</EmptyTitle>
                <EmptyDescription>成员完成微信登录和管理员审核后会出现在这里。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <MemberTable
              members={pagedMembers}
              renderActions={
                me.data.privilege >= 1
                  ? (member) => (
                      <MemberManagement
                        member={member}
                        groups={groups.data}
                        currentPrivilege={me.data.privilege}
                        mutate={mutate}
                      />
                    )
                  : undefined
              }
            />
          )}
          {visibleMembers.length > memberPageSize ? (
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <p className="text-sm text-muted-foreground">共 {visibleMembers.length} 位成员</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="上一页"
                  disabled={memberPage <= 1}
                  onClick={() => setMemberPage((page) => page - 1)}
                >
                  <ChevronLeft />
                </Button>
                <span className="text-sm tabular-nums">
                  {memberPage} / {memberPageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="下一页"
                  disabled={memberPage >= memberPageCount}
                  onClick={() => setMemberPage((page) => page + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>成员操作失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      {me.data.privilege >= 1 ? <GroupManagement groups={groups.data} /> : null}
    </div>
  );
}

function PendingCharacters({
  query,
  mutate,
}: {
  query: ReturnType<typeof useQuery<z.infer<typeof pendingCharacterVerificationSchema>>>;
  mutate: ReturnType<
    typeof useMutation<
      unknown,
      Error,
      {
        path: string;
        method: "POST" | "PATCH" | "DELETE";
        body?: unknown;
      }
    >
  >;
}) {
  const characters = query.data ?? [];
  if (!characters.length && !query.isPending) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>待审核角色</CardTitle>
        <CardDescription>WCL 搜索确认的角色需由管理员审核归属；WCL 认领结果会自动验证。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isPending ? <Skeleton className="h-20 w-full" /> : null}
        {characters.map((character) => (
          <div key={character.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">
                <GameIcon
                  src={character.classIconUrl}
                  alt=""
                  className="mr-1 inline-block size-4 rounded align-[-3px]"
                />
                {character.name} · {character.realm} ·{" "}
                <ClassAccent color={character.classColor}>{character.className}</ClassAccent>
              </p>
              <p className="text-xs text-muted-foreground">申请人：{character.memberName}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  mutate.mutate({
                    path: `/characters/${character.id}/verification-decision`,
                    method: "POST",
                    body: characterVerificationDecisionSchema.parse({ approved: true }),
                  })
                }
              >
                通过
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  mutate.mutate({
                    path: `/characters/${character.id}/verification-decision`,
                    method: "POST",
                    body: characterVerificationDecisionSchema.parse({
                      approved: false,
                      note: "请联系管理员确认角色归属",
                    }),
                  })
                }
              >
                拒绝
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PendingMembers({
  query,
  mutate,
}: {
  query: ReturnType<typeof useQuery<z.infer<typeof pendingMemberListSchema>>>;
  mutate: ReturnType<
    typeof useMutation<
      unknown,
      Error,
      {
        path: string;
        method: "POST" | "PATCH" | "DELETE";
        body?: unknown;
      }
    >
  >;
}) {
  const items = query.data?.items ?? [];
  if (!items.length && !query.isPending) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>待审核成员</CardTitle>
        <CardDescription>所有首次微信登录用户都需要管理员审核。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          items.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">{member.name ?? member.guildNickname ?? "待审核成员"}</p>
                <p className="text-xs text-muted-foreground">
                  微信：{member.wxNickname ?? "未填写"} · 群昵称：{member.guildNickname ?? "未填写"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    mutate.mutate({
                      path: `/members/${member.id}/approval`,
                      method: "POST",
                      body: memberApprovalSchema.parse({
                        approved: true,
                      }),
                    })
                  }
                >
                  <Check data-icon="inline-start" />
                  通过
                </Button>
                <RejectMember memberId={member.id} mutate={mutate} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RejectMember({
  memberId,
  mutate,
}: {
  memberId: string;
  mutate: ReturnType<
    typeof useMutation<
      unknown,
      Error,
      {
        path: string;
        method: "POST" | "PATCH" | "DELETE";
        body?: unknown;
      }
    >
  >;
}) {
  const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = memberApprovalSchema.safeParse({
      approved: false,
      reason: data.get("reason"),
    });
    if (parsed.success) {
      mutate.mutate({
        path: `/members/${memberId}/approval`,
        method: "POST",
        body: parsed.data,
      });
      setOpen(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <X data-icon="inline-start" />
          拒绝
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>拒绝成员申请</DialogTitle>
          <DialogDescription>拒绝时必须填写原因，成员可在状态页看到审核未通过。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`reason-${memberId}`}>拒绝原因</FieldLabel>
              <Textarea id={`reason-${memberId}`} name="reason" required minLength={2} maxLength={255} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button variant="destructive" type="submit">
              确认拒绝
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberManagement({
  member,
  groups,
  currentPrivilege,
  mutate,
}: {
  member: z.infer<typeof memberListSchema>["items"][number];
  groups: z.infer<typeof guildGroupListSchema>;
  currentPrivilege: number;
  mutate: ReturnType<
    typeof useMutation<
      unknown,
      Error,
      {
        path: string;
        method: "POST" | "PATCH" | "DELETE";
        body?: unknown;
      }
    >
  >;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="xs" variant="ghost">
          管理
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>管理 {member.name ?? member.guildNickname ?? "成员"}</DialogTitle>
          <DialogDescription>身份组是当前标签，不保留历史，也不授予接口权限。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>身份组</FieldLabel>
              <div className="flex flex-col gap-2">
                {groups.map((group) => {
                  const checked = member.groups.some((item) => item.id === group.id);
                  return (
                    <div key={group.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span>{group.name}</span>
                      <Switch
                        id={`group-${member.id}-${group.id}`}
                        aria-label={`${checked ? "移除" : "添加"}${group.name}身份组`}
                        checked={checked}
                        onCheckedChange={(next) =>
                          mutate.mutate({
                            path: `/guild-groups/${group.id}/members${next ? "" : `/${member.id}`}`,
                            method: next ? "POST" : "DELETE",
                            body: next
                              ? {
                                  userId: member.id,
                                }
                              : undefined,
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </Field>
            {currentPrivilege >= 2 ? (
              <Field>
                <FieldLabel htmlFor={`privilege-${member.id}`}>Privilege</FieldLabel>
                <Select
                  value={String(member.privilege)}
                  onValueChange={(value) =>
                    mutate.mutate({
                      path: `/members/${member.id}/privilege`,
                      method: "PATCH",
                      body: { privilege: Number(value) },
                    })
                  }
                >
                  <SelectTrigger id={`privilege-${member.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="0">普通成员</SelectItem>
                      <SelectItem value="1">管理员</SelectItem>
                      <SelectItem value="2">超级管理员</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </FieldGroup>
          <Button
            variant="destructive"
            onClick={() =>
              mutate.mutate({
                path: `/members/${member.id}/status`,
                method: "PATCH",
                body: { status: "DISABLED" },
              })
            }
          >
            <ShieldCheck data-icon="inline-start" />
            停用账号并撤销会话
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupManagement({ groups }: { groups: z.infer<typeof guildGroupListSchema> }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const create = useMutation({
    mutationFn: (body: z.infer<typeof guildGroupInputSchema>) =>
      apiRequest("/guild-groups", guildGroupSchema, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["guild-groups"] });
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = guildGroupInputSchema.safeParse({
      name: data.get("name"),
      code: data.get("code"),
      description: data.get("description") || null,
      isActive: true,
      sort: Number(data.get("sort")),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查身份组");
    setError(undefined);
    create.mutate(parsed.data);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>身份组</CardTitle>
        <CardDescription>当前标签用于活动筛选和出勤统计，不保存活动时快照。</CardDescription>
        <CardAction>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus data-icon="inline-start" />
                新增身份组
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新增身份组</DialogTitle>
                <DialogDescription>code 创建后建议保持稳定，例如 progression。</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="group-name">名称</FieldLabel>
                    <Input id="group-name" name="name" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="group-code">Code</FieldLabel>
                    <Input id="group-code" name="code" required pattern="[a-z0-9_-]{2,32}" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="group-description">说明</FieldLabel>
                    <Input id="group-description" name="description" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="group-sort">排序</FieldLabel>
                    <Input id="group-sort" name="sort" type="number" defaultValue={groups.length} />
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
                    {create.isPending ? <Spinner data-icon="inline-start" /> : <UserCheck data-icon="inline-start" />}
                    创建
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <Badge key={group.id} variant="secondary">
            {group.name} · {group.code}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
