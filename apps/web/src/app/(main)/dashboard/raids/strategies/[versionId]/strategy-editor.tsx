"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type StrategyPresetItem,
  type StrategyPresetSaveInput,
  strategyPresetSaveSchema,
  strategyTaskCatalogSchema,
  strategyVersionDtoSchema,
} from "@ttz/contracts";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpenText, CircleDot, Clock3, Save, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { type Requirement, RequirementFields } from "../../../_components/strategy-task-fields";
import { TaskCatalogDialog } from "./task-catalog-dialog";

const labels = {
  POSITIONING: "站位",
  SEQUENCE: "顺序任务",
  TIMELINE: "时序任务",
  NOTES: "战术笔记",
} as const;
const icons = {
  POSITIONING: CircleDot,
  SEQUENCE: ArrowDown,
  TIMELINE: Clock3,
  NOTES: BookOpenText,
} as const;

type LocalItem = StrategyPresetItem & { key: string };
type TaskItem = Extract<StrategyPresetItem, { taskTypeId: number }>;
type TextItem = Exclude<StrategyPresetItem, TaskItem>;

function isTask(item: LocalItem): item is TaskItem & { key: string } {
  return "taskTypeId" in item;
}

function requirementFromItem(item: TaskItem): Requirement {
  return {
    kind: item.type,
    orderIndex: item.orderIndex,
    label: item.title,
    taskTypeId: item.taskTypeId,
    encounterSpellId: item.encounterSpellId ?? null,
    playerSpellId: item.playerSpellId ?? null,
    notes: item.markdown ?? null,
  };
}

export function StrategyEditor({ versionId }: { versionId: string }) {
  const client = useQueryClient();
  const path = `/raid-progress/strategy-versions/${encodeURIComponent(versionId)}`;
  const queryKey = ["strategy-version", versionId];
  const catalogKey = ["raid-progress", "task-catalog"];
  const version = useQuery({ queryKey, queryFn: () => apiRequest(path, strategyVersionDtoSchema) });
  const editable = version.data?.status === "DRAFT";
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: () => apiRequest("/raid-progress/task-catalog", strategyTaskCatalogSchema),
    enabled: editable,
  });
  const [editedItems, setItems] = useState<LocalItem[]>();
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (body: StrategyPresetSaveInput) =>
      apiRequest(path, strategyVersionDtoSchema, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      setItems(undefined);
      setSummary(undefined);
      setSaved(true);
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      apiRequest(`${path}/publish`, z.object({ status: z.string() }), {
        method: "POST",
        body: JSON.stringify({ makeDefault: true }),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: ["raid-progress"] }),
      ]);
    },
    onError: (reason) => setError(reason.message),
  });
  if (version.isPending) return <Skeleton className="h-72 w-full" />;
  if (version.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>战术版本不可用</AlertTitle>
        <AlertDescription>{version.error.message}</AlertDescription>
      </Alert>
    );

  const data = version.data;
  const legacy = data.contentMode === "LEGACY";
  const items =
    editedItems ??
    data.items.map((item, index) => ({
      ...item,
      key: `${item.type}-${index}-${"taskTypeId" in item ? item.title : item.title}`,
    }));
  const dirty = editedItems !== undefined || summary !== undefined;
  const pending = save.isPending || publish.isPending;
  const defaultType =
    catalog.data?.taskTypes.find((item) => item.code === "CUSTOM")?.id ?? catalog.data?.taskTypes[0]?.id;

  function updateItem(key: string, patch: Partial<LocalItem>) {
    setItems(items.map((item) => (item.key === key ? ({ ...item, ...patch } as LocalItem) : item)));
  }

  function updateTask(key: string, patch: Partial<Requirement>) {
    const item = items.find((entry) => entry.key === key);
    if (!item || !isTask(item)) return;
    updateItem(key, {
      title: patch.label ?? item.title,
      taskTypeId: patch.taskTypeId ?? item.taskTypeId,
      encounterSpellId: patch.encounterSpellId === undefined ? (item.encounterSpellId ?? null) : patch.encounterSpellId,
      playerSpellId: patch.playerSpellId === undefined ? (item.playerSpellId ?? null) : patch.playerSpellId,
      markdown: patch.notes === undefined ? (item.markdown ?? null) : patch.notes,
    });
  }

  function addText(type: TextItem["type"]) {
    if (items.length >= 250) return;
    setItems([
      ...items,
      { key: crypto.randomUUID(), type, title: labels[type], orderIndex: items.length, markdown: "" },
    ]);
  }

  function addTask(type: TaskItem["type"]) {
    if (defaultType === undefined || items.length >= 250) return;
    setItems([
      ...items,
      {
        key: crypto.randomUUID(),
        type,
        title: type === "SEQUENCE" ? "新顺序任务" : "新时序任务",
        orderIndex: items.length,
        taskTypeId: defaultType,
        encounterSpellId: null,
        playerSpellId: null,
        markdown: "",
      },
    ]);
  }

  function move(index: number, step: -1 | 1) {
    const other = index + step;
    if (other < 0 || other >= items.length) return;
    const next = [...items];
    [next[index], next[other]] = [next[other], next[index]];
    setItems(next);
  }

  function submit() {
    setError(undefined);
    setSaved(false);
    const parsed = strategyPresetSaveSchema.safeParse({
      changeSummary: summary ?? data.changeSummary,
      items: items.map(({ key: _, ...item }, orderIndex) => ({ ...item, orderIndex })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查填写内容");
      return;
    }
    save.mutate(parsed.data, { onError: (reason) => setError(reason.message) });
  }

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/raids">
          <ArrowLeft data-icon="inline-start" />
          返回团本进度
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {data.bossName} · {data.strategyName}
            <Badge variant="outline">
              v{data.versionNo} · {editable ? "草稿" : "已发布"}
            </Badge>
          </CardTitle>
          <CardDescription>
            预设只描述这个 Boss 需要哪些战术内容。人员、真实分组、站位、时间和执行者都在活动中确定。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {legacy ? (
            <Alert>
              <AlertTitle>{editable ? "保存后转换为新版草稿" : "旧版预设"}</AlertTitle>
              <AlertDescription>
                {editable
                  ? "新版使用一张统一的内容清单保存五种同级内容项。转换只保留需求说明，不会改动已发布版本或既有活动。"
                  : "原始版本和已创建活动不受本次改造影响。管理员可从方案管理复制新版草稿。"}
              </AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="preset-summary">版本说明</FieldLabel>
            <Input
              id="preset-summary"
              value={summary ?? data.changeSummary ?? ""}
              maxLength={500}
              disabled={!editable || pending}
              onChange={(event) => setSummary(event.target.value)}
            />
          </Field>
          {editable && catalog.data ? (
            <TaskCatalogDialog
              catalog={catalog.data}
              onChanged={() => client.invalidateQueries({ queryKey: catalogKey })}
            />
          ) : null}
          {catalog.error ? (
            <p role="alert" className="text-sm text-destructive">
              {catalog.error.message}
            </p>
          ) : null}
          {editable ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-dashed p-3">
              <span className="self-center text-sm text-muted-foreground">添加内容项：</span>
              {(["POSITIONING", "NOTES"] as const).map((type) => {
                const Icon = icons[type];
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    disabled={pending || items.length >= 250}
                    onClick={() => addText(type)}
                  >
                    <Icon data-icon="inline-start" />
                    {labels[type]}
                  </Button>
                );
              })}
              {(["SEQUENCE", "TIMELINE"] as const).map((type) => {
                const Icon = icons[type];
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    disabled={pending || defaultType === undefined || items.length >= 250}
                    onClick={() => addTask(type)}
                  >
                    <Icon data-icon="inline-start" />
                    {labels[type]}
                  </Button>
                );
              })}
            </div>
          ) : null}
          {!items.length ? <p className="text-sm text-muted-foreground">暂无战术内容项。</p> : null}
          <div className="flex flex-col gap-3">
            {items.map((item, index) => {
              const Icon = icons[item.type];
              const task = isTask(item) ? item : null;
              return (
                <Card key={item.key} className="border-muted-foreground/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{labels[item.type]}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{item.title || "未命名内容项"}</span>
                    </CardTitle>
                    <CardDescription>第 {index + 1} 项</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {editable ? (
                      task && catalog.data ? (
                        <>
                          <RequirementFields
                            id={item.key}
                            task={requirementFromItem(task)}
                            catalog={catalog.data}
                            onChange={(patch) => updateTask(item.key, patch)}
                          />
                          <FieldGroup>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                              >
                                <ArrowUp data-icon="inline-start" />
                                上移
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={index === items.length - 1}
                                onClick={() => move(index, 1)}
                              >
                                <ArrowDown data-icon="inline-start" />
                                下移
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setItems(items.filter((entry) => entry.key !== item.key))}
                              >
                                <Trash2 data-icon="inline-start" />
                                移除内容项
                              </Button>
                            </div>
                          </FieldGroup>
                        </>
                      ) : (
                        <FieldGroup>
                          <div className="flex flex-col gap-2">
                            <Field className="flex-1">
                              <FieldLabel htmlFor={`${item.key}-title`}>内容项名称</FieldLabel>
                              <Input
                                id={`${item.key}-title`}
                                value={item.title}
                                maxLength={128}
                                onChange={(event) => updateItem(item.key, { title: event.target.value })}
                              />
                            </Field>
                            <Field className="flex-1">
                              <FieldLabel htmlFor={`${item.key}-markdown`}>
                                {item.type === "NOTES" ? "战术笔记正文" : "需求说明"} · Markdown
                              </FieldLabel>
                              <Textarea
                                id={`${item.key}-markdown`}
                                value={item.markdown ?? ""}
                                maxLength={200000}
                                onChange={(event) => updateItem(item.key, { markdown: event.target.value })}
                              />
                            </Field>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={index === 0}
                              onClick={() => move(index, -1)}
                            >
                              <ArrowUp data-icon="inline-start" />
                              上移
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={index === items.length - 1}
                              onClick={() => move(index, 1)}
                            >
                              <ArrowDown data-icon="inline-start" />
                              下移
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setItems(items.filter((entry) => entry.key !== item.key))}
                            >
                              <Trash2 data-icon="inline-start" />
                              移除内容项
                            </Button>
                          </div>
                        </FieldGroup>
                      )
                    ) : task ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {data.tasks.find(
                            (entry) =>
                              entry.kind === item.type &&
                              entry.label === item.title &&
                              entry.orderIndex === item.orderIndex,
                          )?.taskTypeLabel ?? "任务类型"}
                          {[
                            data.tasks.find(
                              (entry) =>
                                entry.kind === item.type &&
                                entry.label === item.title &&
                                entry.orderIndex === item.orderIndex,
                            )?.encounterSpellName,
                            data.tasks.find(
                              (entry) =>
                                entry.kind === item.type &&
                                entry.label === item.title &&
                                entry.orderIndex === item.orderIndex,
                            )?.playerSpellName,
                          ]
                            .filter(Boolean)
                            .map((name) => ` · ${name}`)
                            .join("")}
                        </p>
                        {item.markdown ? (
                          <p className="whitespace-pre-wrap break-words text-sm">{item.markdown}</p>
                        ) : null}
                      </>
                    ) : item.markdown ? (
                      <p className="whitespace-pre-wrap break-words text-sm">{item.markdown}</p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {saved && !dirty ? (
            <p role="status" className="text-sm text-muted-foreground">
              草稿已保存。
            </p>
          ) : null}
          {editable ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending || (!dirty && !legacy)} onClick={submit}>
                <Save data-icon="inline-start" />
                {save.isPending ? "保存中…" : legacy ? "转换并保存草稿" : "保存草稿"}
              </Button>
              <Button
                type="button"
                disabled={pending || dirty || legacy}
                onClick={() => {
                  setError(undefined);
                  publish.mutate();
                }}
              >
                <Send data-icon="inline-start" />
                {publish.isPending ? "发布中…" : "发布并设为默认"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
