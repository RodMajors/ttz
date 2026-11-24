"use client";

import { useMutation } from "@tanstack/react-query";
import {
  gameSpellInputSchema,
  gameSpellSchema,
  gameSpellStatusSchema,
  type strategyTaskCatalogSchema,
  strategyTaskTypeInputSchema,
  strategyTaskTypeSchema,
} from "@ttz/contracts";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { z } from "zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/api-client";

type TaskCatalog = z.infer<typeof strategyTaskCatalogSchema>;

function EditGameSpellDialog({
  spell,
  onChanged,
}: {
  spell: TaskCatalog["spells"][number];
  onChanged: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const update = useMutation({
    mutationFn: (body: z.infer<typeof gameSpellInputSchema>) =>
      apiRequest(`/raid-progress/game-spells/${spell.id}`, gameSpellSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setOpen(false);
      setError(undefined);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = gameSpellInputSchema.safeParse({
      name: data.get("name"),
      spellId: data.get("spellId") ? Number(data.get("spellId")) : null,
      sourceType: data.get("sourceType"),
      classId: data.get("classId") ? Number(data.get("classId")) : null,
      specId: data.get("specId") ? Number(data.get("specId")) : null,
      icon: data.get("icon") || null,
      dataSource: data.get("dataSource") || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "技能信息无效");
      return;
    }
    update.mutate(parsed.data);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" aria-label={`编辑技能 ${spell.name}`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑技能目录项</DialogTitle>
          <DialogDescription>更新技能名称、来源和可选职业/专精限制。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel>技能来源</FieldLabel>
              <Select name="sourceType" defaultValue={spell.sourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="PLAYER">玩家技能</SelectItem>
                    <SelectItem value="ENCOUNTER">Boss 机制</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`spell-name-${spell.id}`}>名称</FieldLabel>
              <Input id={`spell-name-${spell.id}`} name="name" required defaultValue={spell.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`spell-id-${spell.id}`}>游戏技能 ID</FieldLabel>
              <Input
                id={`spell-id-${spell.id}`}
                name="spellId"
                type="number"
                min="1"
                defaultValue={spell.spellId ?? ""}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={`spell-class-${spell.id}`}>职业 ID</FieldLabel>
                <Input
                  id={`spell-class-${spell.id}`}
                  name="classId"
                  type="number"
                  min="1"
                  defaultValue={spell.classId ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`spell-spec-${spell.id}`}>专精 ID</FieldLabel>
                <Input
                  id={`spell-spec-${spell.id}`}
                  name="specId"
                  type="number"
                  min="1"
                  defaultValue={spell.specId ?? ""}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`spell-icon-${spell.id}`}>图标地址</FieldLabel>
              <Input id={`spell-icon-${spell.id}`} name="icon" defaultValue={spell.icon ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`spell-source-${spell.id}`}>数据来源</FieldLabel>
              <Input id={`spell-source-${spell.id}`} name="dataSource" defaultValue={spell.dataSource ?? ""} />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存技能信息
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskCatalogDialog({ catalog, onChanged }: { catalog: TaskCatalog; onChanged: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const addSpell = useMutation({
    mutationFn: (body: z.infer<typeof gameSpellInputSchema>) =>
      apiRequest("/raid-progress/game-spells", gameSpellSchema, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setError(undefined);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  const addType = useMutation({
    mutationFn: (body: z.infer<typeof strategyTaskTypeInputSchema>) =>
      apiRequest("/raid-progress/task-types", strategyTaskTypeSchema, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setError(undefined);
      await onChanged();
    },
    onError: (reason) => setError(reason.message),
  });
  const archiveSpell = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/raid-progress/game-spells/${id}/status`, gameSpellStatusSchema, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      }),
    onSuccess: onChanged,
    onError: (reason) => setError(reason.message),
  });
  function submitSpell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = gameSpellInputSchema.safeParse({
      name: data.get("spellName"),
      spellId: data.get("spellId") ? Number(data.get("spellId")) : null,
      sourceType: data.get("sourceType"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "技能输入无效");
      return;
    }
    addSpell.mutate(parsed.data);
    event.currentTarget.reset();
  }
  function submitType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = strategyTaskTypeInputSchema.safeParse({
      code: String(data.get("code") ?? "")
        .toUpperCase()
        .replaceAll(" ", "_"),
      label: data.get("label"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "类型输入无效");
      return;
    }
    addType.mutate(parsed.data);
    event.currentTarget.reset();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-fit">
          <Pencil data-icon="inline-start" />
          维护技能与任务类型目录
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>技能与任务类型目录</DialogTitle>
          <DialogDescription>
            目录可以逐步录入常用机制技能与团队技能；技能名称也可直接写在任务标题中。
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>目录操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">添加技能</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitSpell}>
                <FieldGroup>
                  <Field>
                    <FieldLabel>来源</FieldLabel>
                    <Select name="sourceType" defaultValue="PLAYER">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="PLAYER">玩家技能</SelectItem>
                          <SelectItem value="ENCOUNTER">Boss 机制</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="spellName">名称</FieldLabel>
                    <Input id="spellName" name="spellName" required maxLength={128} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="spellId">游戏技能 ID（可选）</FieldLabel>
                    <Input id="spellId" name="spellId" type="number" min="1" />
                  </Field>
                </FieldGroup>
                <Button className="mt-3" disabled={addSpell.isPending}>
                  {addSpell.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                  添加技能
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">添加任务类型</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitType}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="taskTypeCode">编码</FieldLabel>
                    <Input id="taskTypeCode" name="code" required maxLength={32} placeholder="EXTERNAL_DEFENSIVE" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="taskTypeLabel">显示名称</FieldLabel>
                    <Input id="taskTypeLabel" name="label" required maxLength={64} placeholder="外部减伤" />
                  </Field>
                </FieldGroup>
                <Button className="mt-3" disabled={addType.isPending}>
                  {addType.isPending ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}添加类型
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(["ENCOUNTER", "PLAYER"] as const).map((sourceType) => (
            <Card key={sourceType}>
              <CardHeader>
                <CardTitle className="text-base">{sourceType === "ENCOUNTER" ? "Boss 机制技能" : "玩家技能"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {catalog.spells
                  .filter((spell) => spell.sourceType === sourceType)
                  .map((spell) => (
                    <div
                      key={spell.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        {spell.name}
                        {spell.spellId ? (
                          <span className="ml-1 text-xs text-muted-foreground">#{spell.spellId}</span>
                        ) : null}
                      </span>
                      <div className="flex gap-1">
                        <EditGameSpellDialog spell={spell} onChanged={onChanged} />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={archiveSpell.isPending}
                          onClick={() => archiveSpell.mutate(spell.id)}
                        >
                          <Trash2 data-icon="inline-start" />
                          停用
                        </Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">任务类型</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {catalog.taskTypes.map((type) => (
              <Badge key={type.id} variant={type.isBuiltIn ? "secondary" : "outline"}>
                {type.label}
                {type.isBuiltIn ? " · 内置" : " · 公会"}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
