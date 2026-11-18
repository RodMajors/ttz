"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  characterListSchema,
  characterSummarySchema,
  type createCharacterSchema,
  memberProfileSchema,
  wclAuthorizeSchema,
  wclCharacterCandidateSchema,
  wclCharacterSearchSchema,
  wclLinkStatusSchema,
  wclServerListSchema,
} from "@ttz/contracts";
import {
  BadgeCheck,
  Check,
  CircleAlert,
  CircleUserRound,
  Crown,
  Link2,
  Plus,
  RefreshCw,
  Search,
  SquareArrowUpRightExit,
  UserGroup,
  UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/api-client";
import { NotificationPreferences } from "../_components/notification-preferences";

const actionResultSchema = z.unknown();

export function ProfileScreen() {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest("/auth/me", authUserSchema),
  });
  const characters = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiRequest("/characters", characterListSchema),
  });
  const [error, setError] = useState<string>();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("wcl");
    if (!result) return;
    if (result === "success") {
      const synced = params.get("synced") ?? "0";
      const conflicts = params.get("conflicts") ?? "0";
      setError(undefined);
      client.invalidateQueries({ queryKey: ["wcl-link"] });
      client.invalidateQueries({ queryKey: ["characters"] });
      window.history.replaceState({}, "", window.location.pathname);
      toast.success("WCL 已绑定", {
        description: `自动同步 ${synced} 个认领角色${conflicts !== "0" ? `，另有 ${conflicts} 个角色与其他成员冲突` : ""}。`,
      });
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
    if (result === "cancelled") toast.info("已取消 WCL 授权");
    else
      toast.error("WCL 授权或角色同步失败", {
        description: "请稍后重试。",
      });
  }, [client]);
  const profile = useMutation({
    mutationFn: (body: z.infer<typeof memberProfileSchema>) =>
      apiRequest("/auth/profile", authUserSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (user) => {
      client.setQueryData(["auth", "me"], user);
      toast.success("成员资料已保存");
    },
    onError: (reason) => setError(reason.message),
  });
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = memberProfileSchema.safeParse({
      name: data.get("name") || null,
      guildNickname: data.get("guildNickname"),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查资料");
    setError(undefined);
    profile.mutate(parsed.data);
  }
  if (me.isPending || characters.isPending)
    return (
      <div className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  if (me.isError || characters.isError)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>个人资料加载失败</AlertTitle>
        <AlertDescription>{me.error?.message ?? characters.error?.message}</AlertDescription>
      </Alert>
    );
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">个人中心</p>
        <h1 className="text-3xl font-semibold tracking-tight">{me.data.name}</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircleUserRound size={18} />
              <CardTitle>成员资料</CardTitle>
            </div>
            <CardDescription>微信名和群昵称用于审核与活动识别。</CardDescription>
          </CardHeader>
          <form onSubmit={submitProfile}>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">站内显示名</FieldLabel>
                  <Input id="name" name="name" defaultValue={me.data.name === "TTZ 成员" ? "" : me.data.name} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="guildNickname">TTZ 群昵称</FieldLabel>
                  <Input id="guildNickname" name="guildNickname" defaultValue={me.data.guildNickname ?? ""} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="wxNickname">微信名</FieldLabel>
                  <Input id="wxNickname" value={me.data.wxNickname ?? "未获取"} disabled readOnly />
                </Field>
                {error ? (
                  <Alert variant="destructive">
                    <AlertTitle>无法保存</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
              </FieldGroup>
            </CardContent>
            <div className="flex justify-end px-4 pt-4">
              <Button type="submit" disabled={profile.isPending}>
                {profile.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                保存资料
              </Button>
            </div>
          </form>
        </Card>
        <NotificationPreferences />
      </div>
      <CharacterCard characters={characters.data} />
    </div>
  );
}

function CharacterCard({ characters }: { characters: z.infer<typeof characterListSchema> }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [serverSlug, setServerSlug] = useState("");
  const serverRegion = "cn";
  const [candidate, setCandidate] = useState<z.infer<typeof wclCharacterCandidateSchema>>();
  const [searchOpen, setSearchOpen] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: ["characters"] });
  const linkStatus = useQuery({
    queryKey: ["wcl-link"],
    queryFn: () => apiRequest("/auth/wcl/status", wclLinkStatusSchema),
  });
  const servers = useQuery({
    queryKey: ["wcl-servers", serverSearch],
    queryFn: () => apiRequest(`/wcl/servers?${new URLSearchParams({ search: serverSearch })}`, wclServerListSchema),
    enabled: serverSearch.trim().length > 0,
  });
  const authorize = useMutation({
    mutationFn: () =>
      apiRequest("/auth/wcl/authorize", wclAuthorizeSchema, {
        method: "POST",
      }),
    onSuccess: (result) => window.location.assign(result.authorizationUrl),
    onError: (reason) => toast.error("无法发起 WCL 授权", { description: reason.message }),
  });
  const search = useMutation({
    mutationFn: () => {
      const parsed = wclCharacterSearchSchema.parse({
        name,
        serverSlug,
        serverRegion,
      });
      const params = new URLSearchParams({
        name: parsed.name,
        serverSlug: parsed.serverSlug,
        serverRegion: parsed.serverRegion,
      });
      return apiRequest(`/wcl/characters?${params}`, wclCharacterCandidateSchema);
    },
    onSuccess: (result) => {
      setCandidate(result);
    },
    onError: (reason) => toast.error("WCL 角色查询失败", { description: reason.message }),
  });
  const create = useMutation({
    mutationFn: (body: z.infer<typeof createCharacterSchema>) =>
      apiRequest("/characters", characterSummarySchema, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setCandidate(undefined);
      setName("");
      setServerSearch("");
      setServerSlug("");
      setSearchOpen(false);
      toast.success("角色已提交审核", {
        description: "未验证角色仍可报名。",
      });
      await refresh();
    },
    onError: (reason) => toast.error("角色提交失败", { description: reason.message }),
  });
  const action = useMutation({
    mutationFn: ({ id, path }: { id: string; path: "set-main" | "retire" | "activate" }) =>
      apiRequest(`/characters/${id}/${path}`, actionResultSchema, {
        method: "POST",
      }),
    onSuccess: async (_result, variables) => {
      const message = {
        "set-main": "主角色已更新",
        retire: "角色已退役",
        activate: "角色已重新激活",
      }[variables.path];
      toast.success(message);
      await refresh();
    },
    onError: (reason) => toast.error("角色操作失败", { description: reason.message }),
  });
  const sync = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/characters/${id}/sync-wcl`, characterSummarySchema, {
        method: "POST",
      }),
    onSuccess: async () => {
      toast.success("已从 WCL 同步角色资料", {
        description: "WCL 是否已向暴雪刷新取决于 WCL 自身。",
      });
      await refresh();
    },
    onError: (reason) => toast.error("WCL 同步失败", { description: reason.message }),
  });
  const link = linkStatus.data;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserGroup size={18} />
          <CardTitle className="flex items-center gap-4">
            角色列表
            {link?.linked ? (
              <p className="text-xs text-muted-foreground">
                {link.wclUsername} · {link.lastVerifiedAt ? new Date(link.lastVerifiedAt).toLocaleString() : "—"}
              </p>
            ) : null}
          </CardTitle>
        </div>

        <CardDescription className="text-xs text-muted-foreground">
          通过 WCL 验证绑定，或搜索已公开的 WCL 角色并提交管理员审核验证。
        </CardDescription>
        <CardAction className="flex flex-wrap gap-2">
          <Button onClick={() => authorize.mutate()} disabled={authorize.isPending || linkStatus.isPending}>
            {authorize.isPending ? <Spinner data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
            {link?.linked ? `重新绑定 WCL` : "绑定 WCL"}
          </Button>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Search data-icon="inline-start" />
                搜索角色
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>搜索 WCL 角色</DialogTitle>
                <DialogDescription>按中文服务器名选择服务器，再查询公开的 WCL 角色并提交管理员审核。</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="wcl-character-name">角色名</FieldLabel>
                    <Input id="wcl-character-name" value={name} onChange={(event) => setName(event.target.value)} />
                  </Field>
                  <Field className="relative">
                    <FieldLabel htmlFor="wcl-server-name">服务器</FieldLabel>
                    <Input
                      id="wcl-server-name"
                      value={serverSearch}
                      onChange={(event) => {
                        setServerSearch(event.target.value);
                        setServerSlug("");
                        setCandidate(undefined);
                      }}
                      placeholder="输入中文服务器名，如安苏"
                    />
                    {servers.data?.length && !serverSlug ? (
                      <div className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
                        {servers.data.map((server) => (
                          <button
                            type="button"
                            key={server.id}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setServerSearch(server.name);
                              setServerSlug(server.slug);
                              setCandidate(undefined);
                            }}
                          >
                            <span>{server.name}</span>
                            <span className="text-xs text-muted-foreground">{server.slug}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </Field>
                </div>
                <Button
                  variant="outline"
                  onClick={() => search.mutate()}
                  disabled={search.isPending || !name.trim() || !serverSlug}
                >
                  {search.isPending ? <Spinner data-icon="inline-start" /> : <Search data-icon="inline-start" />}
                  查询 WCL
                </Button>
                {candidate ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {candidate.name} · {candidate.realm}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <GameIcon
                          src={candidate.classIconUrl}
                          alt=""
                          className="mr-1 inline-block size-4 rounded align-[-3px]"
                        />
                        <ClassAccent color={candidate.classColor}>{candidate.className}</ClassAccent>
                        {candidate.raceName ? ` · ${candidate.raceName}` : ""}
                        {candidate.activeSpecName ? ` · 当前${candidate.activeSpecName}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        公会：
                        {candidate.guildName ?? (candidate.guildNames.join(", ") || "未显示")}
                        {candidate.itemLevel ? ` · ${candidate.itemLevel} 装等` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        create.mutate({
                          name: candidate.name,
                          serverSlug: candidate.serverSlug,
                          serverRegion: candidate.serverRegion,
                          isMain: characters.length === 0,
                        })
                      }
                      disabled={create.isPending}
                    >
                      {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                      提交审核
                    </Button>
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {linkStatus.isError ? (
          <Alert variant="destructive">
            <AlertTitle>WCL 关联状态暂时不可用</AlertTitle>
            <AlertDescription>{linkStatus.error.message}</AlertDescription>
          </Alert>
        ) : null}
        {characters.length ? (
          characters.map((character) => (
            <div key={character.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <GameIcon
                  src={character.classIconUrl}
                  alt=""
                  className="mr-1 inline-block size-8 rounded align-[-3px]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <ClassAccent color={character.classColor}>
                      <p className="font-medium">{character.name}</p>
                    </ClassAccent>
                    {character.isMain ? (
                      <Badge variant="secondary">
                        <Crown data-icon="inline-start" />
                        主角色
                      </Badge>
                    ) : null}
                    <Badge variant="secondary">
                      {character.verificationStatus === "VERIFIED" ? <BadgeCheck data-icon="inline-start" /> : "未验证"}
                      {verificationLabel[character.verificationStatus]}
                    </Badge>
                    {character.isRetired ? <Badge variant="destructive">已退役</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {character.realm}
                    {` · `}
                    <ClassAccent color={character.classColor}>{character.className}</ClassAccent>
                    {character.raceName ? ` · ${character.raceName}` : ""}
                    {character.activeSpecName ? ` · ${character.activeSpecName}` : ""}
                    {character.itemLevel ? ` · ${character.itemLevel} 装等` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!character.isMain && !character.isRetired ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({
                        id: character.id,
                        path: "set-main",
                      })
                    }
                  >
                    {action.isPending &&
                    action.variables?.id === character.id &&
                    action.variables.path === "set-main" ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    设为主角色
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sync.mutate(character.id)}
                  disabled={sync.isPending}
                  title="从 WCL 公开 API 重新读取角色资料"
                >
                  {sync.isPending && sync.variables === character.id ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCw data-icon="inline-start" />
                  )}
                  同步
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sync.isPending}
                  title="打开此角色的 WCL 页面"
                  onClick={() =>
                    window.open(
                      `https://cn.warcraftlogs.com/character/id/${character.wclId}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <SquareArrowUpRightExit data-icon="inline-start" />
                  WCL
                </Button>
                {!character.isRetired ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({
                        id: character.id,
                        path: "retire",
                      })
                    }
                  >
                    {action.isPending && action.variables?.id === character.id && action.variables.path === "retire" ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    退役
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({
                        id: character.id,
                        path: "activate",
                      })
                    }
                  >
                    {action.isPending &&
                    action.variables?.id === character.id &&
                    action.variables.path === "activate" ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    激活
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <Empty className="min-h-44 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserRound />
              </EmptyMedia>
              <EmptyTitle>还没有角色</EmptyTitle>
              <EmptyDescription>添加角色后即可报名活动。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

const verificationLabel = {
  UNVERIFIED: "未验证",
  PENDING: "待审核",
  VERIFIED: "已验证",
  REJECTED: "未通过",
} as const;
