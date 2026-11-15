"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authUserSchema,
  characterListSchema,
  characterSummarySchema,
  createCharacterSchema,
  memberProfileSchema,
  updateCharacterSchema,
} from "@ttz/contracts";
import { Check, CircleAlert, Pencil, Plus, Star, UserRound } from "lucide-react";
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/api-client";
import { NotificationPreferences } from "../_components/notification-preferences";

const mainResultSchema = z.unknown();
const retiredSchema = z.object({ retired: z.boolean() });

export function ProfileScreen() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest("/auth/me", authUserSchema) });
  const characters = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiRequest("/characters", characterListSchema),
  });
  const [error, setError] = useState<string>();
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
      wxNickname: data.get("wxNickname"),
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
                  <FieldLabel htmlFor="wxNickname">微信名</FieldLabel>
                  <Input id="wxNickname" name="wxNickname" defaultValue={me.data.wxNickname ?? ""} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="guildNickname">TTZ 群昵称</FieldLabel>
                  <Input id="guildNickname" name="guildNickname" defaultValue={me.data.guildNickname ?? ""} required />
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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const refresh = () => client.invalidateQueries({ queryKey: ["characters"] });
  const create = useMutation({
    mutationFn: (body: z.infer<typeof createCharacterSchema>) =>
      apiRequest("/characters", characterSummarySchema, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setOpen(false);
      await refresh();
    },
    onError: (reason) => setError(reason.message),
  });
  const action = useMutation({
    mutationFn: ({ id, path }: { id: string; path: "set-main" | "retire" }) =>
      apiRequest(`/characters/${id}/${path}`, path === "retire" ? retiredSchema : mainResultSchema, { method: "POST" }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: z.infer<typeof updateCharacterSchema> }) =>
      apiRequest(`/characters/${id}`, characterSummarySchema, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: refresh,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = createCharacterSchema.safeParse({
      name: data.get("name"),
      realm: data.get("realm"),
      faction: Number(data.get("faction")),
      specId: data.get("specId") ? Number(data.get("specId")) : null,
      itemLevel: data.get("itemLevel") ? Number(data.get("itemLevel")) : null,
      isMain: data.get("isMain") === "on",
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查角色信息");
    setError(undefined);
    create.mutate(parsed.data);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>我的角色</CardTitle>
        <CardDescription>可先手工添加角色，WCL 映射稍后完成。</CardDescription>
        <CardAction>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus data-icon="inline-start" />
                添加角色
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加游戏角色</DialogTitle>
                <DialogDescription>同一时间只能有一个主角色。</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="characterName">角色名</FieldLabel>
                    <Input id="characterName" name="name" required maxLength={64} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="realm">服务器</FieldLabel>
                    <Input id="realm" name="realm" required maxLength={64} defaultValue="伊森利恩" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="faction">阵营</FieldLabel>
                      <Select name="faction" defaultValue="1">
                        <SelectTrigger id="faction">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="1">部落</SelectItem>
                            <SelectItem value="0">联盟</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="itemLevel">装等</FieldLabel>
                      <Input id="itemLevel" name="itemLevel" type="number" min={1} max={999} />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="specId">专精 ID（可选）</FieldLabel>
                    <Input id="specId" name="specId" type="number" min={1} />
                  </Field>
                  <Field orientation="horizontal">
                    <Switch id="isMain" name="isMain" />
                    <FieldLabel htmlFor="isMain">设为主角色</FieldLabel>
                  </Field>
                  {error ? (
                    <Alert variant="destructive">
                      <AlertTitle>无法添加角色</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                </FieldGroup>
                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}添加
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {characters.length ? (
          characters.map((character) => (
            <div key={character.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{character.name}</p>
                  {character.isMain ? (
                    <Badge>
                      <Star data-icon="inline-start" />
                      主角色
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {character.realm}
                  {character.itemLevel ? ` · ${character.itemLevel} 装等` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <CharacterEditDialog character={character} update={update} />
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
        {action.isError || update.isError ? (
          <Alert variant="destructive">
            <AlertTitle>角色操作失败</AlertTitle>
            <AlertDescription>{action.error?.message ?? update.error?.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CharacterEditDialog({
  character,
  update,
}: {
  character: z.infer<typeof characterSummarySchema>;
  update: ReturnType<typeof useMutation<unknown, Error, { id: string; body: z.infer<typeof updateCharacterSchema> }>>;
}) {
  const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = updateCharacterSchema.safeParse({
      name: data.get("name"),
      realm: data.get("realm"),
      faction: Number(data.get("faction")),
      specId: data.get("specId") ? Number(data.get("specId")) : null,
      itemLevel: data.get("itemLevel") ? Number(data.get("itemLevel")) : null,
    });
    if (parsed.success) {
      update.mutate({ id: character.id, body: parsed.data });
      setOpen(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil data-icon="inline-start" />
          编辑
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑角色</DialogTitle>
          <DialogDescription>更新角色名、服务器、专精和装等。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-character-name-${character.id}`}>角色名</FieldLabel>
              <Input id={`edit-character-name-${character.id}`} name="name" defaultValue={character.name} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-realm-${character.id}`}>服务器</FieldLabel>
              <Input id={`edit-realm-${character.id}`} name="realm" defaultValue={character.realm} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`edit-faction-${character.id}`}>阵营</FieldLabel>
                <Select name="faction" defaultValue={String(character.faction ?? 1)}>
                  <SelectTrigger id={`edit-faction-${character.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">部落</SelectItem>
                      <SelectItem value="0">联盟</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-item-level-${character.id}`}>装等</FieldLabel>
                <Input
                  id={`edit-item-level-${character.id}`}
                  name="itemLevel"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={character.itemLevel ?? ""}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`edit-spec-${character.id}`}>专精 ID</FieldLabel>
              <Input
                id={`edit-spec-${character.id}`}
                name="specId"
                type="number"
                min={1}
                defaultValue={character.specId ?? ""}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={update.isPending}>
              <Pencil data-icon="inline-start" />
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
