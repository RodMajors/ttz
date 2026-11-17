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
import { Check, CircleAlert, Link2, Plus, RefreshCw, Search, Star, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/api-client";
import { NotificationPreferences } from "../_components/notification-preferences";

const actionResultSchema = z.unknown();

export function ProfileScreen() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest("/auth/me", authUserSchema) });
  const characters = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiRequest("/characters", characterListSchema),
  });
  const [error, setError] = useState<string>();
  const [wclMessage, setWclMessage] = useState<string>();
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
      setWclMessage(
        `WCL 已绑定：自动同步 ${synced} 个认领角色${conflicts !== "0" ? `，另有 ${conflicts} 个角色与其他成员冲突` : ""}。`,
      );
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
    setWclMessage(result === "cancelled" ? "已取消 WCL 授权。" : "WCL 授权或角色同步失败，请稍后重试。");
  }, [client]);
  const profile = useMutation({
    mutationFn: (body: z.infer<typeof memberProfileSchema>) =>
      apiRequest("/auth/profile", authUserSchema, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (user) => client.setQueryData(["auth", "me"], user),
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
      {wclMessage ? (
        <Alert>
          <AlertTitle>WCL 绑定结果</AlertTitle>
          <AlertDescription>{wclMessage}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>成员资料</CardTitle>
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
            <div className="flex justify-end px-4 pb-4">
              <Button type="submit" disabled={profile.isPending}>
                {profile.isPending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}保存资料
              </Button>
            </div>
          </form>
        </Card>
        <CharacterCard characters={characters.data} />
      </div>
      <NotificationPreferences />
    </div>
  );
}

function CharacterCard({ characters }: { characters: z.infer<typeof characterListSchema> }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [serverSlug, setServerSlug] = useState("");
  const [serverRegion, setServerRegion] = useState("cn");
  const [candidate, setCandidate] = useState<z.infer<typeof wclCharacterCandidateSchema>>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
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
    mutationFn: () => apiRequest("/auth/wcl/authorize", wclAuthorizeSchema, { method: "POST" }),
    onSuccess: (result) => window.location.assign(result.authorizationUrl),
    onError: (reason) => setError(reason.message),
  });
  const search = useMutation({
    mutationFn: () => {
      const parsed = wclCharacterSearchSchema.parse({ name, serverSlug, serverRegion });
      const params = new URLSearchParams({
        name: parsed.name,
        serverSlug: parsed.serverSlug,
        serverRegion: parsed.serverRegion,
      });
      return apiRequest(`/wcl/characters?${params}`, wclCharacterCandidateSchema);
    },
    onSuccess: (result) => {
      setCandidate(result);
      setError(undefined);
      setNotice(undefined);
    },
    onError: (reason) => setError(reason.message),
  });
  const create = useMutation({
    mutationFn: (body: z.infer<typeof createCharacterSchema>) =>
      apiRequest("/characters", characterSummarySchema, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setCandidate(undefined);
      setName("");
      setNotice("角色已添加，等待管理员审核。未验证角色仍可报名。");
      await refresh();
    },
    onError: (reason) => setError(reason.message),
  });
  const action = useMutation({
    mutationFn: ({ id, path }: { id: string; path: "set-main" | "retire" }) =>
      apiRequest(`/characters/${id}/${path}`, actionResultSchema, { method: "POST" }),
    onSuccess: refresh,
  });
  const sync = useMutation({
    mutationFn: (id: string) => apiRequest(`/characters/${id}/sync-wcl`, characterSummarySchema, { method: "POST" }),
    onSuccess: async () => {
      setError(undefined);
      setNotice("已从 WCL 读取最新角色资料。WCL 是否已向暴雪刷新取决于 WCL 自身。");
      await refresh();
    },
    onError: (reason) => setError(reason.message),
  });
  const link = linkStatus.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>我的角色</CardTitle>
        <CardDescription>通过 WCL 认领同步，或搜索已公开的 WCL 角色并提交管理员审核。</CardDescription>
        <CardAction>
          <Button onClick={() => authorize.mutate()} disabled={authorize.isPending || linkStatus.isPending}>
            {authorize.isPending ? <Spinner data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
            {link?.linked ? `重新验证 WCL（${link.wclUsername}）` : "绑定 WCL 账号"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="wcl-character-name">角色名</FieldLabel>
            <Input id="wcl-character-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field className="relative flex-1">
            <FieldLabel htmlFor="wcl-server-name">服务器</FieldLabel>
            <Input
              id="wcl-server-name"
              value={serverSearch}
              onChange={(event) => {
                setServerSearch(event.target.value);
                setServerSlug("");
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
                    }}
                  >
                    <span>{server.name}</span>
                    <span className="text-xs text-muted-foreground">{server.slug}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Field>
          <Button
            variant="outline"
            onClick={() => search.mutate()}
            disabled={search.isPending || !name.trim() || !serverSlug}
          >
            {search.isPending ? <Spinner data-icon="inline-start" /> : <Search data-icon="inline-start" />}查询 WCL
          </Button>
        </div>
        {candidate ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="min-w-0">
              <p className="font-medium">
                {candidate.name} · {candidate.realm}
              </p>
              <p className="text-xs text-muted-foreground">
                {candidate.className}
                {candidate.raceName ? ` · ${candidate.raceName}` : ""}
                {candidate.activeSpecName ? ` · 当前${candidate.activeSpecName}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                公会：{candidate.guildName ?? (candidate.guildNames.join(", ") || "未显示")}
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
              {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}提交审核
            </Button>
          </div>
        ) : null}
        {link?.linked ? (
          <p className="text-xs text-muted-foreground">
            WCL：{link.wclUsername} · 最近验证{" "}
            {link.lastVerifiedAt ? new Date(link.lastVerifiedAt).toLocaleString() : "—"}
          </p>
        ) : null}
        {notice ? (
          <Alert>
            <AlertTitle>角色状态已更新</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>角色操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {characters.length ? (
          characters.map((character) => (
            <div key={character.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{character.name}</p>
                  <Badge variant={character.verificationStatus === "VERIFIED" ? "default" : "secondary"}>
                    {verificationLabel[character.verificationStatus]}
                  </Badge>
                  {character.isMain ? (
                    <Badge>
                      <Star data-icon="inline-start" />
                      主角色
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {character.realm}
                  {` · ${character.className}`}
                  {character.raceName ? ` · ${character.raceName}` : ""}
                  {character.activeSpecName ? ` · 当前${character.activeSpecName}` : ""}
                  {character.itemLevel ? ` · ${character.itemLevel} 装等` : ""}
                </p>
                {character.guildName ? (
                  <p className="text-xs text-muted-foreground">
                    公会：{character.guildName}
                    {character.guildServerName ? ` · ${character.guildServerName}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sync.mutate(character.id)}
                  disabled={sync.isPending}
                  title="从 WCL 公开 API 重新读取角色资料；不会直接调用 WCL 网站内部的强制刷新页面"
                >
                  <RefreshCw
                    data-icon="inline-start"
                    className={sync.isPending && sync.variables === character.id ? "animate-spin" : undefined}
                  />
                  从 WCL 同步
                </Button>
                {!character.isMain ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => action.mutate({ id: character.id, path: "set-main" })}
                  >
                    设为主角色
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => action.mutate({ id: character.id, path: "retire" })}>
                  退役
                </Button>
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
        {action.isError || sync.isError || search.isError || linkStatus.isError ? (
          <Alert variant="destructive">
            <AlertTitle>角色操作失败</AlertTitle>
            <AlertDescription>
              {action.error?.message ?? sync.error?.message ?? search.error?.message ?? linkStatus.error?.message}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

const verificationLabel = { UNVERIFIED: "未验证", PENDING: "待审核", VERIFIED: "已验证", REJECTED: "未通过" } as const;
