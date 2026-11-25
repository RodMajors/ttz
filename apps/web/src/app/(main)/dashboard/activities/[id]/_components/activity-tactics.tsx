"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type ActivityDetail,
  type StrategyActivitySaveInput,
  strategyActivitySaveSchema,
  strategyTaskCatalogSchema,
} from "@ttz/contracts";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { RequirementFields, TaskChoice, taskOrder } from "../../../_components/strategy-task-fields";

type Target = NonNullable<ActivityDetail["raid"]>["targets"][number];
type Task = StrategyActivitySaveInput["tasks"][number];
type PersonRole = "executor" | "fallback" | "target";
type SignupField = `${PersonRole}SignupId`;
type Draft = {
  revision: number;
  tasks: (Task & { key: string })[];
  notes: (StrategyActivitySaveInput["notes"][number] & { key: string })[];
};
const peopleFields = [
  ["executorSignupId", "主执行者"],
  ["fallbackSignupId", "后备执行者"],
  ["targetSignupId", "目标"],
] as const;

export function ActivityTactics({
  activity,
  target,
  focusTaskId,
  focusNoteId,
  onChanged,
}: {
  activity: ActivityDetail;
  target: Target;
  focusTaskId?: string;
  focusNoteId?: string;
  onChanged: () => Promise<void>;
}) {
  const snapshot = target.snapshot;
  const locked = snapshot?.status === "LOCKED" || Boolean(activity.rosterLockedAt);
  const canEdit =
    activity.canManage &&
    !locked &&
    snapshot?.status === "EDITING" &&
    activity.status !== "FINISHED" &&
    activity.status !== "CANCELLED";
  const [draft, setDraft] = useState<Draft>();
  const [error, setError] = useState<string>();
  const catalog = useQuery({
    queryKey: ["raid-progress", "task-catalog"],
    queryFn: () => apiRequest("/raid-progress/task-catalog", strategyTaskCatalogSchema),
    enabled: Boolean(canEdit && draft),
  });
  const save = useMutation({
    mutationFn: (body: StrategyActivitySaveInput) =>
      apiRequest(
        `/raid-progress/activities/${activity.id}/snapshots/${snapshot?.id}/tactics`,
        z.object({ revision: z.number().int() }),
        { method: "PUT", body: JSON.stringify(body) },
      ),
    onSuccess: async () => {
      await onChanged();
      setDraft(undefined);
      setError(undefined);
    },
    onError: (reason) => setError(reason.message),
  });
  const notes = target.blocks.filter((block) => block.type === "NOTES" && (!focusNoteId || block.id === focusNoteId));
  const tasks = target.tasks.filter((task) => !focusTaskId || task.id === focusTaskId);
  const focusedTitle =
    target.tasks.find((task) => task.id === focusTaskId)?.label ??
    target.blocks.find((block) => block.id === focusNoteId)?.title;
  const confirmed = activity.signups.filter((signup) => signup.status === "CONFIRMED");
  const reserves = activity.signups.filter((signup) => signup.status === "BENCH");
  const defaultType =
    catalog.data?.taskTypes.find((type) => type.code === "CUSTOM")?.id ?? catalog.data?.taskTypes[0]?.id;
  function startEditing() {
    if (!snapshot) return;
    setError(undefined);
    setDraft({
      revision: snapshot.revision,
      tasks: target.tasks.map(
        ({
          id,
          kind,
          label,
          taskTypeId,
          orderIndex,
          notes,
          encounterSpellId,
          playerSpellId,
          executorSignupId,
          fallbackSignupId,
          targetSignupId,
          offsetMs,
          windowMs,
        }) => ({
          key: id,
          id,
          kind,
          label,
          taskTypeId,
          orderIndex,
          notes,
          encounterSpellId,
          playerSpellId,
          executorSignupId: executorSignupId ?? null,
          fallbackSignupId: fallbackSignupId ?? null,
          targetSignupId: targetSignupId ?? null,
          offsetMs,
          windowMs,
        }),
      ),
      notes: notes.map(({ id, title, markdown, orderIndex }) => ({
        key: id ?? `note-${orderIndex}`,
        id,
        title,
        markdown: markdown ?? "",
      })),
    });
  }
  function submit(value: Draft) {
    setError(undefined);
    const parsed = strategyActivitySaveSchema.safeParse({
      revision: value.revision,
      tasks: taskOrder(value.tasks.map(({ key: _, ...task }) => task)),
      notes: value.notes.map(({ key: _, ...note }) => note),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查任务和笔记");
      return;
    }
    save.mutate(parsed.data);
  }
  function describe(task: Target["tasks"][number], role: PersonRole) {
    if (locked) {
      const person = task.people?.[role];
      return person ? `${person.memberName} · ${person.characterName}` : "—";
    }
    const id = task[`${role}SignupId`];
    if (!id) return "未分配";
    const signup = (role === "fallback" ? [...confirmed, ...reserves] : confirmed).find((entry) => entry.id === id);
    return signup
      ? `${signup.memberName} · ${signup.character.name}${signup.status === "BENCH" ? "（替补）" : ""}`
      : "原分配已失效，请重新选择";
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{focusedTitle ?? "本场任务与笔记"}</CardTitle>
        <CardDescription>
          {focusedTitle
            ? "本场执行安排；人员分配仅影响当前活动。"
            : "顺序和时序任务直接分配给本场确认成员，替补可担任后备。修改只影响本场 Boss。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {canEdit && !draft ? (
          <Button type="button" variant="outline" className="w-fit" onClick={startEditing}>
            编辑本场任务和笔记
          </Button>
        ) : null}
        {!draft || !canEdit ? (
          <>
            {!tasks.length && !notes.length ? <p className="text-sm text-muted-foreground">暂无任务或笔记。</p> : null}
            {[...tasks]
              .sort(
                (a, b) =>
                  a.kind.localeCompare(b.kind) ||
                  (a.kind === "TIMELINE"
                    ? (a.offsetMs ?? Infinity) - (b.offsetMs ?? Infinity) || a.orderIndex - b.orderIndex
                    : a.orderIndex - b.orderIndex),
              )
              .map((task) => (
                <div key={task.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {task.kind === "SEQUENCE"
                        ? `顺序 ${task.orderIndex + 1}`
                        : task.offsetMs == null
                          ? "时序 · 待定时间"
                          : `开战后 ${task.offsetMs / 1000} 秒`}
                    </Badge>
                    <Badge variant="outline">{task.taskTypeLabel}</Badge>
                    <span className="font-medium">{task.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {task.encounterSpellName ? `机制：${task.encounterSpellName} · ` : ""}
                    {task.playerSpellName ? `技能：${task.playerSpellName} · ` : ""}
                    {task.windowMs != null ? `窗口：${task.windowMs / 1000} 秒` : ""}
                  </p>
                  <p className="text-sm">
                    主执行者：{describe(task, "executor")} · 后备：{describe(task, "fallback")} · 目标：
                    {describe(task, "target")}
                  </p>
                  {task.notes ? <p className="whitespace-pre-wrap break-words text-sm">{task.notes}</p> : null}
                </div>
              ))}
            {notes.map((note) => (
              <div key={note.id ?? `note-${note.orderIndex}`} className="rounded-lg border p-3">
                <p className="font-medium">{note.title}</p>
                <p className="whitespace-pre-wrap break-words text-sm">{note.markdown}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            {catalog.isError ? (
              <p role="alert" className="text-sm text-destructive">
                技能目录加载失败：{catalog.error.message}
              </p>
            ) : null}
            {catalog.isPending ? <p className="text-sm text-muted-foreground">正在加载任务目录…</p> : null}
            {snapshot && draft.revision !== snapshot.revision ? (
              <p role="alert" className="text-sm text-destructive">
                快照已有新修改，请放弃此草稿并重新打开编辑。
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {(["SEQUENCE", "TIMELINE"] as const).map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  variant="outline"
                  disabled={defaultType === undefined || save.isPending || draft.tasks.length >= 200}
                  onClick={() => {
                    if (defaultType !== undefined)
                      setDraft({
                        ...draft,
                        tasks: [
                          ...draft.tasks,
                          {
                            key: crypto.randomUUID(),
                            kind,
                            orderIndex: 0,
                            label: "",
                            taskTypeId: defaultType,
                            executorSignupId: null,
                            fallbackSignupId: null,
                            targetSignupId: null,
                          },
                        ],
                      });
                  }}
                >
                  <Plus data-icon="inline-start" />
                  添加{kind === "SEQUENCE" ? "顺序任务" : "时序任务"}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending || draft.notes.length >= 50}
                onClick={() =>
                  setDraft({
                    ...draft,
                    notes: [...draft.notes, { key: crypto.randomUUID(), title: "战术笔记", markdown: "" }],
                  })
                }
              >
                <Plus data-icon="inline-start" />
                添加笔记
              </Button>
            </div>
            {taskOrder(draft.tasks.filter((task) => !focusTaskId || task.key === focusTaskId)).map((task, index) => {
              const update = (patch: Partial<Task>) =>
                setDraft({
                  ...draft,
                  tasks: draft.tasks.map((entry) => (entry.key === task.key ? { ...entry, ...patch } : entry)),
                });
              const neighbor = (step: number) =>
                step < 0
                  ? draft.tasks.findLastIndex((entry, i) => i < index && entry.kind === task.kind)
                  : draft.tasks.findIndex((entry, i) => i > index && entry.kind === task.kind);
              const move = (step: number) => {
                const i = neighbor(step);
                const next = [...draft.tasks];
                const other = next[i];
                const current = next[index];
                if (!other || !current) return;
                next[i] = current;
                next[index] = other;
                setDraft({ ...draft, tasks: next });
              };
              const personOptions = (field: SignupField) => {
                const options = [
                  { value: "none", label: "未分配" },
                  ...(field === "fallbackSignupId" ? [...confirmed, ...reserves] : confirmed).map((signup) => ({
                    value: signup.id,
                    label: `${signup.memberName} · ${signup.character.name}${signup.status === "BENCH" ? "（替补）" : ""}`,
                  })),
                ];
                const selected = task[field];
                if (selected && !options.some((item) => item.value === selected))
                  options.push({ value: selected, label: "原分配已失效（请重新选择）" });
                return options;
              };
              return (
                <Card key={task.key}>
                  <CardHeader>
                    <CardTitle>
                      {task.kind === "SEQUENCE" ? `顺序 ${task.orderIndex + 1}` : "时序任务"} · {task.label || "未命名"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      {catalog.data ? (
                        <RequirementFields id={task.key} task={task} catalog={catalog.data} onChange={update} />
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-3">
                        {peopleFields.map(([field, label]) => (
                          <TaskChoice
                            key={field}
                            label={label}
                            value={task[field] ?? "none"}
                            options={personOptions(field)}
                            onChange={(id) => update({ [field]: id === "none" ? null : id })}
                          />
                        ))}
                      </div>
                      {task.kind === "TIMELINE" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(
                            [
                              ["offsetMs", "开战后秒数", 0],
                              ["windowMs", "执行窗口秒数（可选）", 0.001],
                            ] as const
                          ).map(([field, label, min]) => (
                            <Field key={field}>
                              <FieldLabel htmlFor={`${task.key}-${field}`}>{label}</FieldLabel>
                              <Input
                                id={`${task.key}-${field}`}
                                type="number"
                                min={min}
                                max={86400}
                                step={0.001}
                                value={task[field] == null ? "" : task[field] / 1000}
                                onChange={(event) =>
                                  update({
                                    [field]:
                                      event.target.value === "" ? null : Math.round(event.target.valueAsNumber * 1000),
                                  })
                                }
                              />
                            </Field>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={neighbor(-1) < 0} onClick={() => move(-1)}>
                          <ArrowUp data-icon="inline-start" />
                          上移
                        </Button>
                        <Button type="button" variant="outline" disabled={neighbor(1) < 0} onClick={() => move(1)}>
                          <ArrowDown data-icon="inline-start" />
                          下移
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setDraft({ ...draft, tasks: draft.tasks.filter((entry) => entry.key !== task.key) })
                          }
                        >
                          <Trash2 data-icon="inline-start" />
                          移除任务
                        </Button>
                      </div>
                    </FieldGroup>
                  </CardContent>
                </Card>
              );
            })}
            {draft.notes
              .filter((note) => !focusNoteId || note.key === focusNoteId)
              .map((note) => {
                const update = (patch: Partial<typeof note>) =>
                  setDraft({
                    ...draft,
                    notes: draft.notes.map((item) => (item.key === note.key ? { ...item, ...patch } : item)),
                  });
                return (
                  <Card key={note.key}>
                    <CardContent>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor={`${note.key}-title`}>笔记标题</FieldLabel>
                          <Input
                            id={`${note.key}-title`}
                            maxLength={128}
                            value={note.title}
                            onChange={(event) => update({ title: event.target.value })}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`${note.key}-body`}>战术笔记正文（Markdown）</FieldLabel>
                          <Textarea
                            id={`${note.key}-body`}
                            maxLength={200000}
                            value={note.markdown}
                            onChange={(event) => update({ markdown: event.target.value })}
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-fit"
                          onClick={() =>
                            setDraft({ ...draft, notes: draft.notes.filter((item) => item.key !== note.key) })
                          }
                        >
                          <Trash2 data-icon="inline-start" />
                          移除笔记
                        </Button>
                      </FieldGroup>
                    </CardContent>
                  </Card>
                );
              })}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => {
                  setDraft(undefined);
                  setError(undefined);
                }}
              >
                放弃修改
              </Button>
              <Button
                type="button"
                disabled={save.isPending || snapshot?.revision !== draft.revision}
                onClick={() => submit(draft)}
              >
                <Save data-icon="inline-start" />
                {save.isPending ? "保存中…" : "保存本场战术"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
