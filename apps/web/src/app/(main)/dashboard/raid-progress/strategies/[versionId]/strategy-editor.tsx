"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StrategyTaskInput } from "@ttz/contracts";
import {
  gameSpellInputSchema,
  gameSpellSchema,
  gameSpellStatusSchema,
  strategyTaskCatalogSchema,
  strategyTaskTypeInputSchema,
  strategyTaskTypeSchema,
  strategyVersionDtoSchema,
} from "@ttz/contracts";
import { ArrowLeft, Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

const blockTypes = ["POSITIONING", "RAID_GROUPS", "SEQUENCE", "TIMELINE", "NOTES"] as const;
type BlockType = (typeof blockTypes)[number];
type EditableBlock = {
  key: string;
  type: BlockType;
  title: string;
  configText: string;
  markdown: string;
};
type EditableTask = StrategyTaskInput & {
  key: string;
  taskTypeLabel?: string;
  playerSpellName?: string | null;
  encounterSpellName?: string | null;
};
type TaskCatalog = z.infer<typeof strategyTaskCatalogSchema>;

const savedSchema = strategyVersionDtoSchema;
const publishedSchema = z.object({ id: z.string(), versionNo: z.number(), status: z.string() });

export function StrategyEditor({ versionId }: { versionId: string }) {
  const client = useQueryClient();
  const [blocks, setBlocks] = useState<EditableBlock[]>();
  const [slotsText, setSlotsText] = useState<string>();
  const [tasks, setTasks] = useState<EditableTask[]>();
  const [error, setError] = useState<string>();
  const [changeSummary, setChangeSummary] = useState("");
  const query = useQuery({
    queryKey: ["strategy-version", versionId],
    queryFn: () =>
      apiRequest(`/raid-progress/strategy-versions/${encodeURIComponent(versionId)}`, strategyVersionDtoSchema),
  });
  const currentBlocks =
    blocks ??
    query.data?.blocks.map((block) => ({
      key: block.id,
      type: block.type as BlockType,
      title: block.title,
      configText: block.config ? JSON.stringify(block.config, null, 2) : "{}",
      markdown: block.markdown ?? "",
    })) ??
    [];
  const currentSlotsText =
    slotsText ??
    query.data?.slots
      .map((slot) => [slot.slotKey, slot.label, slot.isRequired ? "true" : "false"].join(" | "))
      .join("\n") ??
    "";
  const currentTasks =
    tasks ??
    query.data?.tasks.map((task) => ({
      key: task.id,
      taskTypeId: task.taskTypeId,
      kind: task.kind,
      orderIndex: task.orderIndex,
      label: task.label,
      encounterSpellId: task.encounterSpellId,
      playerSpellId: task.playerSpellId,
      executorSlotKey: task.executorSlotKey,
      targetSlotKey: task.targetSlotKey,
      fallbackSlotKey: task.fallbackSlotKey,
      notes: task.notes,
      repeatRule: task.repeatRule,
      offsetMs: task.offsetMs,
      windowMs: task.windowMs,
      phaseLabel: task.phaseLabel,
      occurrence: task.occurrence,
      reminderMs: task.reminderMs,
    })) ??
    [];
  const taskCatalog = useQuery({
    queryKey: ["raid-progress", "task-catalog"],
    queryFn: () => apiRequest("/raid-progress/task-catalog", strategyTaskCatalogSchema),
    enabled: query.data?.status === "DRAFT",
  });
  const save = useMutation({
    mutationFn: (body: unknown) =>
      apiRequest(`/raid-progress/strategy-versions/${encodeURIComponent(versionId)}`, savedSchema, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: async (data) => {
      setBlocks(undefined);
      setTasks(undefined);
      setChangeSummary(data.changeSummary ?? "");
      await client.invalidateQueries({ queryKey: ["strategy-version", versionId] });
    },
    onError: (reason) => setError(reason.message),
  });
  const publish = useMutation({
    mutationFn: () =>
      apiRequest(`/raid-progress/strategy-versions/${encodeURIComponent(versionId)}/publish`, publishedSchema, {
        method: "POST",
        body: JSON.stringify({ makeDefault: true }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["strategy-version", versionId] }),
    onError: (reason) => setError(reason.message),
  });
  if (query.isPending) return <Skeleton className="h-[36rem] w-full" />;
  if (query.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>战术版本不可用</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
      </Alert>
    );
  const version = query.data;
  const editable = version.status === "DRAFT";
  function update(key: string, patch: Partial<EditableBlock>) {
    setBlocks(currentBlocks.map((block) => (block.key === key ? { ...block, ...patch } : block)));
  }
  function submit() {
    try {
      const body = {
        changeSummary: changeSummary || null,
        slots: parseSlots(currentSlotsText),
        tasks: normalizeTaskOrder(currentTasks),
        blocks: currentBlocks.map((block, orderIndex) => ({
          type: block.type,
          title: block.title,
          orderIndex,
          config: block.type === "NOTES" ? {} : JSON.parse(block.configText || "{}"),
          markdown: block.type === "NOTES" ? block.markdown : null,
        })),
      };
      setError(undefined);
      save.mutate(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "结构化 JSON 格式错误");
    }
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
          <CardTitle className="flex items-center gap-2">
            {version.bossName} · {version.strategyName}
            <Badge variant={editable ? "secondary" : "default"}>
              v{version.versionNo} {editable ? "草稿" : "已发布"}
            </Badge>
          </CardTitle>
          <CardDescription>管理抽象槽位、机制/玩家技能、顺序任务与固定时间轴；发布后版本不可变。</CardDescription>
          {editable ? (
            <CardAction className="flex gap-2">
              <Button variant="outline" disabled={save.isPending} onClick={submit}>
                {save.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存
              </Button>
              <Button disabled={publish.isPending} onClick={() => publish.mutate()}>
                {publish.isPending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
                发布并设为默认
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="changeSummary">版本说明</FieldLabel>
            <Input
              id="changeSummary"
              value={changeSummary || version.changeSummary || ""}
              disabled={!editable}
              onChange={(event) => setChangeSummary(event.target.value)}
            />
          </Field>
          {editable && taskCatalog.data ? (
            <TaskCatalogDialog
              catalog={taskCatalog.data}
              onChanged={() => client.invalidateQueries({ queryKey: ["raid-progress", "task-catalog"] })}
            />
          ) : null}
          {editable && taskCatalog.error ? (
            <Alert variant="destructive">
              <AlertTitle>任务目录不可用</AlertTitle>
              <AlertDescription>{taskCatalog.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="participantSlots">版本参与者槽位</FieldLabel>
            <Textarea
              id="participantSlots"
              value={currentSlotsText}
              disabled={!editable}
              onChange={(event) => setSlotsText(event.target.value)}
              placeholder="每行：slot_key | 显示名 | 是否必填(true/false)"
            />
          </Field>
          {editable ? (
            <TaskListEditor
              tasks={currentTasks}
              taskTypes={taskCatalog.data?.taskTypes ?? []}
              spells={taskCatalog.data?.spells ?? []}
              slotOptions={parseSlotOptions(currentSlotsText)}
              onChange={setTasks}
            />
          ) : currentTasks.length ? (
            <TaskListView
              tasks={currentTasks}
              taskTypes={taskCatalog.data?.taskTypes ?? []}
              spells={taskCatalog.data?.spells ?? []}
            />
          ) : null}
          {editable ? (
            <Button
              variant="outline"
              className="w-fit"
              onClick={() =>
                setBlocks([
                  ...currentBlocks,
                  {
                    key: crypto.randomUUID(),
                    type: "NOTES",
                    title: "战术笔记",
                    configText: "{}",
                    markdown: "",
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              添加区块
            </Button>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {currentBlocks.length ? (
            currentBlocks.map((block) => (
              <BlockEditor
                key={block.key}
                block={block}
                editable={editable}
                onChange={(patch) => update(block.key, patch)}
                onRemove={() => setBlocks(currentBlocks.filter((item) => item.key !== block.key))}
              />
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>还没有战术区块</EmptyTitle>
                <EmptyDescription>添加一个战术笔记或结构化区块开始编写。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeTaskOrder(tasks: EditableTask[]): StrategyTaskInput[] {
  const counters = new Map<"SEQUENCE" | "TIMELINE", number>();
  return tasks.map(
    ({
      key: _key,
      taskTypeLabel: _taskTypeLabel,
      playerSpellName: _playerSpellName,
      encounterSpellName: _encounterSpellName,
      ...task
    }) => {
      const orderIndex = counters.get(task.kind) ?? 0;
      counters.set(task.kind, orderIndex + 1);
      return { ...task, orderIndex };
    },
  );
}

function parseSlotOptions(text: string) {
  return text.split("\n").flatMap((line) => {
    const [slotKey, label] = line.split("|").map((part) => part?.trim());
    return slotKey && label ? [{ slotKey, label }] : [];
  });
}

function TaskListEditor({
  tasks,
  taskTypes,
  spells,
  slotOptions,
  onChange,
}: {
  tasks: EditableTask[];
  taskTypes: TaskCatalog["taskTypes"];
  spells: TaskCatalog["spells"];
  slotOptions: Array<{ slotKey: string; label: string }>;
  onChange: (tasks: EditableTask[]) => void;
}) {
  const spellOptions = (sourceType: "ENCOUNTER" | "PLAYER") =>
    spells.filter((spell) => spell.sourceType === sourceType);
  const update = (key: string, patch: Partial<EditableTask>) =>
    onChange(tasks.map((task) => (task.key === key ? { ...task, ...patch } : task)));
  const add = (kind: "SEQUENCE" | "TIMELINE") => {
    const taskTypeId = taskTypes.find((taskType) => taskType.code === "CUSTOM")?.id ?? taskTypes[0]?.id ?? 0;
    onChange([
      ...tasks,
      {
        key: crypto.randomUUID(),
        taskTypeId,
        kind,
        orderIndex: tasks.filter((task) => task.kind === kind).length,
        label: "",
        encounterSpellId: null,
        playerSpellId: null,
        executorSlotKey: slotOptions[0]?.slotKey ?? "",
        targetSlotKey: null,
        fallbackSlotKey: null,
        notes: null,
        repeatRule: null,
        offsetMs: kind === "TIMELINE" ? 0 : null,
        windowMs: 5_000,
        phaseLabel: null,
        occurrence: null,
        reminderMs: 5_000,
      },
    ]);
  };
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">顺序分配与时间轴</CardTitle>
        <CardDescription>主执行者、后备执行者和目标都引用本版本抽象槽位；时间轴冲突由服务端保存校验。</CardDescription>
        <CardAction className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => add("SEQUENCE")}>
            <Plus data-icon="inline-start" />
            顺序任务
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("TIMELINE")}>
            <Plus data-icon="inline-start" />
            时间轴任务
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!taskTypes.length ? (
          <p className="text-sm text-muted-foreground">任务类型目录为空，请打开技能目录管理并创建类型。</p>
        ) : null}
        {tasks.map((task) => (
          <div key={task.key} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="secondary">{task.kind === "SEQUENCE" ? "顺序分配" : "时间轴"}</Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange(tasks.filter((entry) => entry.key !== task.key))}
              >
                <Trash2 data-icon="inline-start" />
                移除
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field>
                <FieldLabel>任务类型</FieldLabel>
                <Select
                  value={String(task.taskTypeId || "")}
                  onValueChange={(value) => update(task.key, { taskTypeId: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>任务 / 机制名称</FieldLabel>
                <Input
                  value={task.label}
                  onChange={(event) => update(task.key, { label: event.target.value })}
                  placeholder="例如：第一轮打断"
                />
              </Field>
              <Field>
                <FieldLabel>机制技能</FieldLabel>
                <Select
                  value={task.encounterSpellId == null ? "__none__" : String(task.encounterSpellId)}
                  onValueChange={(value) =>
                    update(task.key, { encounterSpellId: value === "__none__" ? null : Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="自定义名称" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__none__">不指定</SelectItem>
                      {spellOptions("ENCOUNTER").map((spell) => (
                        <SelectItem key={spell.id} value={String(spell.id)}>
                          {spell.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>执行者玩家技能</FieldLabel>
                <Select
                  value={task.playerSpellId == null ? "__none__" : String(task.playerSpellId)}
                  onValueChange={(value) =>
                    update(task.key, { playerSpellId: value === "__none__" ? null : Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="自定义技能" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__none__">不指定</SelectItem>
                      {spellOptions("PLAYER").map((spell) => (
                        <SelectItem key={spell.id} value={String(spell.id)}>
                          {spell.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <SlotSelect
                label="执行者槽位"
                value={task.executorSlotKey}
                slots={slotOptions}
                onChange={(value) => update(task.key, { executorSlotKey: value })}
                required
              />
              <SlotSelect
                label="后备执行者"
                value={task.fallbackSlotKey ?? "__none__"}
                slots={slotOptions}
                onChange={(value) => update(task.key, { fallbackSlotKey: value === "__none__" ? null : value })}
                optional
              />
              <SlotSelect
                label="目标槽位"
                value={task.targetSlotKey ?? "__none__"}
                slots={slotOptions}
                onChange={(value) => update(task.key, { targetSlotKey: value === "__none__" ? null : value })}
                optional
              />
              {task.kind === "TIMELINE" ? (
                <>
                  <Field>
                    <FieldLabel>时间偏移（秒）</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={(task.offsetMs ?? 0) / 1000}
                      onChange={(event) =>
                        update(task.key, { offsetMs: Math.max(0, Math.round(Number(event.target.value) * 1000)) })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>时间窗口（秒）</FieldLabel>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={(task.windowMs ?? 5000) / 1000}
                      onChange={(event) =>
                        update(task.key, { windowMs: Math.max(500, Math.round(Number(event.target.value) * 1000)) })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>阶段</FieldLabel>
                    <Input
                      value={task.phaseLabel ?? ""}
                      onChange={(event) => update(task.key, { phaseLabel: event.target.value || null })}
                      placeholder="例如 P2"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>施法轮次</FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      value={task.occurrence ?? ""}
                      onChange={(event) =>
                        update(task.key, { occurrence: event.target.value ? Number(event.target.value) : null })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>提前提醒（秒）</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      value={(task.reminderMs ?? 0) / 1000}
                      onChange={(event) =>
                        update(task.key, { reminderMs: Math.max(0, Math.round(Number(event.target.value) * 1000)) })
                      }
                    />
                  </Field>
                </>
              ) : null}
              <Field className="md:col-span-2">
                <FieldLabel>说明 / 重复描述</FieldLabel>
                <Textarea
                  value={task.notes ?? ""}
                  onChange={(event) => update(task.key, { notes: event.target.value || null })}
                  placeholder="执行说明；重复规则暂以文本记录"
                />
              </Field>
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未配置任务。按顺序分配或固定时间轴添加执行步骤。</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SlotSelect({
  label,
  value,
  slots,
  onChange,
  required,
  optional,
}: {
  label: string;
  value: string;
  slots: Array<{ slotKey: string; label: string }>;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value || (optional ? "__none__" : "")} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={required ? "请选择槽位" : "不指定"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {optional ? <SelectItem value="__none__">不指定</SelectItem> : null}
            {slots.map((slot) => (
              <SelectItem key={slot.slotKey} value={slot.slotKey}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function TaskListView({
  tasks,
  taskTypes,
  spells,
}: {
  tasks: EditableTask[];
  taskTypes: TaskCatalog["taskTypes"];
  spells: TaskCatalog["spells"];
}) {
  const getSpellName = (id: number | null | undefined) => spells.find((spell) => spell.id === id)?.name;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">顺序任务与时间轴</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div key={task.key} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                {task.kind === "SEQUENCE" ? `顺序 ${task.orderIndex + 1}` : formatTimeline(task.offsetMs ?? 0)}
              </Badge>
              <Badge variant="secondary">
                {taskTypes.find((type) => type.id === task.taskTypeId)?.label ?? task.taskTypeLabel ?? "任务"}
              </Badge>
              <span className="font-medium">{task.label}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              执行：{task.executorSlotKey}
              {task.fallbackSlotKey ? ` · 后备：${task.fallbackSlotKey}` : ""}
              {(getSpellName(task.playerSpellId) ?? task.playerSpellName)
                ? ` · ${getSpellName(task.playerSpellId) ?? task.playerSpellName}`
                : ""}
              {task.phaseLabel ? ` · ${task.phaseLabel}` : ""}
            </p>
            {task.notes ? <p className="mt-1 whitespace-pre-wrap text-sm">{task.notes}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatTimeline(offsetMs: number) {
  const totalSeconds = Math.floor(offsetMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

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

function TaskCatalogDialog({ catalog, onChanged }: { catalog: TaskCatalog; onChanged: () => Promise<unknown> }) {
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

function BlockEditor({
  block,
  editable,
  onChange,
  onRemove,
}: {
  block: EditableBlock;
  editable: boolean;
  onChange: (patch: Partial<EditableBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{block.title || "未命名区块"}</CardTitle>
        <CardDescription>{block.type}</CardDescription>
        {editable ? (
          <CardAction>
            <Button variant="ghost" size="icon" aria-label="删除区块" onClick={onRemove}>
              <Trash2 />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>区块类型</FieldLabel>
              <Select
                value={block.type}
                isDisabled={!editable}
                onValueChange={(value) => onChange({ type: value as BlockType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {blockTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>标题</FieldLabel>
              <Input
                value={block.title}
                disabled={!editable}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </Field>
          </div>
          {block.type === "NOTES" ? (
            <Field>
              <FieldLabel>Markdown 战术笔记</FieldLabel>
              <Textarea
                className="min-h-64 font-mono"
                value={block.markdown}
                disabled={!editable}
                onChange={(event) => onChange({ markdown: event.target.value })}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel>结构化 JSON</FieldLabel>
              <Textarea
                className="min-h-64 font-mono"
                value={block.configText}
                disabled={!editable}
                onChange={(event) => onChange({ configText: event.target.value })}
              />
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function parseSlots(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, orderIndex) => {
      const [slotKey, label, required] = line.split("|").map((part) => part.trim());
      if (!slotKey || !label) throw new Error("槽位格式应为：slot_key | 显示名 | true/false");
      return { slotKey, label, roleConstraint: null, isRequired: required === "true", orderIndex };
    });
}
