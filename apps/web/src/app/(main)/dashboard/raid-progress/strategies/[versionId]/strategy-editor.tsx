"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type StrategyPresetSaveInput,
  strategyPresetSaveSchema,
  strategyTaskCatalogSchema,
  strategyVersionDtoSchema,
} from "@ttz/contracts";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Send, Trash2 } from "lucide-react";
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
import { type Requirement, RequirementFields, TaskChoice, taskOrder } from "../../../_components/strategy-task-fields";
import { TaskCatalogDialog } from "./task-catalog-dialog";

const labels = {
  POSITIONING: "站位",
  RAID_GROUPS: "团队分组",
  SEQUENCE: "顺序分配",
  TIMELINE: "时序分配",
  NOTES: "战术笔记",
} as const;
type Block = StrategyPresetSaveInput["blocks"][number];
type Local<T> = T & { key: string };
const blockTypes = Object.keys(labels) as Block["type"][];

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
  const [editedBlocks, setBlocks] = useState<Local<Block>[]>();
  const [editedTasks, setTasks] = useState<Local<Requirement>[]>();
  const [summary, setSummary] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (body: StrategyPresetSaveInput) =>
      apiRequest(path, strategyVersionDtoSchema, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      setBlocks(undefined);
      setTasks(undefined);
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
  const blocks =
    editedBlocks ??
    data.blocks.map(({ id, type, title, orderIndex, markdown }) => ({
      key: id,
      type: type as Block["type"],
      orderIndex,
      title,
      markdown,
    }));
  const tasks =
    editedTasks ??
    data.tasks.map(({ id, kind, label, orderIndex, notes, taskTypeId, playerSpellId, encounterSpellId }) => ({
      key: id,
      kind,
      label,
      orderIndex,
      notes,
      taskTypeId,
      playerSpellId,
      encounterSpellId,
    }));
  const dirty = editedBlocks !== undefined || editedTasks !== undefined || summary !== undefined;
  const pending = save.isPending || publish.isPending;
  const defaultType =
    catalog.data?.taskTypes.find((item) => item.code === "CUSTOM")?.id ?? catalog.data?.taskTypes[0]?.id;
  function submit() {
    setError(undefined);
    setSaved(false);
    const parsed = strategyPresetSaveSchema.safeParse({
      changeSummary: summary ?? data.changeSummary,
      blocks: blocks.map(({ key: _, ...block }, orderIndex) => ({ ...block, orderIndex })),
      tasks: taskOrder(tasks.map(({ key: _, ...task }) => task)),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查填写内容");
      return;
    }
    save.mutate(parsed.data, { onError: (reason) => setError(reason.message) });
  }
  function move(index: number, step: number) {
    const task = tasks[index];
    if (!task) return;
    const other =
      step === -1
        ? tasks.findLastIndex((entry, i) => i < index && entry.kind === task.kind)
        : tasks.findIndex((entry, i) => i > index && entry.kind === task.kind);
    if (other === -1) return;
    const next = [...tasks];
    const sibling = next[other];
    if (!sibling) return;
    next[other] = task;
    next[index] = sibling;
    setTasks(next);
  }
  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/raid-progress">
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
            预设只说明这场 Boss 战需要准备什么。人员、实际时间、分组和站位在活动里确定。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {legacy ? (
            <Alert>
              <AlertTitle>{editable ? "保存后转换为新版草稿" : "旧版预设"}</AlertTitle>
              <AlertDescription>
                {editable
                  ? "转换会保留说明、笔记和任务定义，移除虚拟参与者、预配置和旧时间点；不会改动已发布版本或既有活动。"
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending || blocks.length >= 50}
                onClick={() =>
                  setBlocks([
                    ...blocks,
                    {
                      key: crypto.randomUUID(),
                      type: "NOTES",
                      title: "战术笔记",
                      orderIndex: blocks.length,
                      markdown: "",
                    },
                  ])
                }
              >
                <Plus data-icon="inline-start" />
                添加区块
              </Button>
              {(["SEQUENCE", "TIMELINE"] as const).map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  variant="outline"
                  disabled={pending || defaultType === undefined || tasks.length >= 200}
                  onClick={() => {
                    if (defaultType !== undefined)
                      setTasks([
                        ...tasks,
                        { key: crypto.randomUUID(), kind, label: "", taskTypeId: defaultType, orderIndex: 0 },
                      ]);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  添加{kind === "SEQUENCE" ? "顺序任务" : "时序任务"}
                </Button>
              ))}
            </div>
          ) : null}
          {!blocks.length && !tasks.length ? <p className="text-sm text-muted-foreground">暂无战术需求。</p> : null}
          {blocks.map((block) => {
            const update = (patch: Partial<Block>) =>
              setBlocks(blocks.map((item) => (item.key === block.key ? { ...item, ...patch } : item)));
            return (
              <Card key={block.key}>
                <CardHeader>
                  <CardTitle>{block.title || "未命名区块"}</CardTitle>
                  <CardDescription>{labels[block.type] ?? "旧版区块"}</CardDescription>
                </CardHeader>
                <CardContent>
                  {editable ? (
                    <FieldGroup>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TaskChoice
                          label="区块类型"
                          value={block.type}
                          options={blockTypes.map((type) => ({ value: type, label: labels[type] }))}
                          onChange={(value) => update({ type: value as Block["type"] })}
                        />
                        <Field>
                          <FieldLabel htmlFor={`${block.key}-title`}>区块名称</FieldLabel>
                          <Input
                            id={`${block.key}-title`}
                            value={block.title}
                            maxLength={128}
                            onChange={(event) => update({ title: event.target.value })}
                          />
                        </Field>
                      </div>
                      <Field>
                        <FieldLabel htmlFor={`${block.key}-body`}>
                          {block.type === "NOTES" ? "战术笔记正文" : "区块说明（可选）"} · Markdown
                        </FieldLabel>
                        <Textarea
                          id={`${block.key}-body`}
                          value={block.markdown ?? ""}
                          maxLength={200000}
                          onChange={(event) => update({ markdown: event.target.value })}
                        />
                      </Field>
                      <Button
                        type="button"
                        className="w-fit"
                        variant="ghost"
                        onClick={() => setBlocks(blocks.filter((item) => item.key !== block.key))}
                      >
                        <Trash2 data-icon="inline-start" />
                        移除区块
                      </Button>
                    </FieldGroup>
                  ) : block.markdown ? (
                    <p className="whitespace-pre-wrap break-words text-sm">{block.markdown}</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {taskOrder(tasks).map((task, index) => (
            <Card key={task.key}>
              <CardHeader>
                <CardTitle>
                  {labels[task.kind]} {task.orderIndex + 1} · {task.label || "未命名任务"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {editable && catalog.data ? (
                  <>
                    <RequirementFields
                      id={task.key}
                      task={task}
                      catalog={catalog.data}
                      onChange={(patch) =>
                        setTasks(tasks.map((item) => (item.key === task.key ? { ...item, ...patch } : item)))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!tasks.slice(0, index).some((item) => item.kind === task.kind)}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp data-icon="inline-start" />
                        上移
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!tasks.slice(index + 1).some((item) => item.kind === task.kind)}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown data-icon="inline-start" />
                        下移
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setTasks(tasks.filter((item) => item.key !== task.key))}
                      >
                        <Trash2 data-icon="inline-start" />
                        移除任务
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {data.tasks.find((item) => item.id === task.key)?.taskTypeLabel}
                      {[
                        data.tasks.find((item) => item.id === task.key)?.encounterSpellName,
                        data.tasks.find((item) => item.id === task.key)?.playerSpellName,
                      ]
                        .filter(Boolean)
                        .map((name) => ` · ${name}`)
                        .join("")}
                    </p>
                    {task.notes ? <p className="whitespace-pre-wrap break-words text-sm">{task.notes}</p> : null}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
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
