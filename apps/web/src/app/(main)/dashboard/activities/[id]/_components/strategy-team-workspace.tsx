"use client";

import { useMutation } from "@tanstack/react-query";
import type { ActivityDetail } from "@ttz/contracts";
import { activityStrategyAssignmentsSchema } from "@ttz/contracts";
import { cn } from "cn";
import { Check, GripVertical, Lock, RotateCcw, Save, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";

const saveResponseSchema = z.object({ snapshotId: z.string(), revision: z.number().int(), updated: z.boolean() });
type RaidTarget = NonNullable<ActivityDetail["raid"]>["targets"][number];
type Assignment = { groupNo: number; positionNo: number; signupId: string };
type Binding = { slotKey: string; signupId: string };

export function StrategyTeamWorkspace({
  activity,
  target,
  onChanged,
}: {
  activity: ActivityDetail;
  target: RaidTarget;
  onChanged: () => Promise<void>;
}) {
  const snapshot = target.snapshot;
  const eligible = useMemo(
    () => activity.signups.filter((signup) => signup.status === "CONFIRMED" || signup.status === "BENCH"),
    [activity.signups],
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!snapshot) return;
    setAssignments(
      snapshot.slots.flatMap((slot) =>
        slot.groupNo && slot.positionNo && slot.signupId
          ? [{ groupNo: slot.groupNo, positionNo: slot.positionNo, signupId: slot.signupId }]
          : [],
      ),
    );
    setBindings(
      snapshot.slots.flatMap((slot) =>
        !slot.groupNo && !slot.positionNo && slot.signupId ? [{ slotKey: slot.slotKey, signupId: slot.signupId }] : [],
      ),
    );
    setSelectedId(null);
    setSaved(false);
  }, [snapshot]);

  const save = useMutation({
    mutationFn: async () => {
      if (!snapshot) throw new Error("快照不存在");
      const body = activityStrategyAssignmentsSchema.parse({
        revision: snapshot.revision,
        teamAssignments: assignments,
        slotBindings: bindings,
      });
      return apiRequest(
        `/raid-progress/activities/${activity.id}/snapshots/${snapshot.id}/assignments`,
        saveResponseSchema,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: async () => {
      setError(undefined);
      setSaved(true);
      await onChanged();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "保存团队分配失败"),
  });

  if (!snapshot) return <p className="text-sm text-muted-foreground">这个 Boss 没有可编辑的战术快照。</p>;
  const canEdit =
    activity.canManage &&
    activity.status !== "FINISHED" &&
    activity.status !== "CANCELLED" &&
    !activity.rosterLockedAt &&
    snapshot.status === "EDITING";
  const assignedIds = new Set(assignments.map(({ signupId }) => signupId));
  const unassigned = eligible.filter((signup) => !assignedIds.has(signup.id));
  const tacticalSlots = snapshot.slots.filter((slot) => !slot.groupNo && !slot.positionNo);
  const currentAssignment = (groupNo: number, positionNo: number) =>
    assignments.find((entry) => entry.groupNo === groupNo && entry.positionNo === positionNo);

  const place = (groupNo: number, positionNo: number, signupId: string) => {
    setSaved(false);
    setAssignments((current) => [
      ...current.filter(
        (entry) => entry.signupId !== signupId && !(entry.groupNo === groupNo && entry.positionNo === positionNo),
      ),
      { groupNo, positionNo, signupId },
    ]);
    setSelectedId(null);
  };
  const remove = (groupNo: number, positionNo: number) => {
    setSaved(false);
    setAssignments((current) =>
      current.filter((entry) => !(entry.groupNo === groupNo && entry.positionNo === positionNo)),
    );
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          团队分组与报名绑定
          <Badge variant={snapshot.status === "LOCKED" ? "default" : "outline"}>
            {snapshot.status === "LOCKED" ? "快照已锁定" : "可编辑"}
          </Badge>
          <Badge variant="secondary">修订 {snapshot.revision}</Badge>
        </CardTitle>
        <CardDescription>
          {canEdit
            ? "每个 Boss 独立维护 8×5 框架。可拖动或先点击成员、再点击席位；触屏也可点击操作。"
            : "当前为只读模式；锁定快照使用锁定时保存的人员信息。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">团队分配已保存。</p>
        ) : null}
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">未分配池</p>
              <p className="text-xs text-muted-foreground">{unassigned.length} 名确认/替补成员未占团队席位</p>
            </div>
            {selectedId ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <X data-icon="inline-start" />
                取消选择
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {unassigned.length ? (
              unassigned.map((signup) => (
                <button
                  key={signup.id}
                  type="button"
                  draggable={canEdit}
                  disabled={!canEdit}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-left text-sm",
                    canEdit ? "cursor-grab hover:border-primary/50" : "opacity-70",
                    selectedId === signup.id && "border-primary bg-primary/10 ring-2 ring-primary/20",
                  )}
                  onClick={() => setSelectedId((current) => (current === signup.id ? null : signup.id))}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", signup.id);
                    setDraggedId(signup.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  aria-pressed={selectedId === signup.id}
                >
                  <GripVertical className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>{signup.memberName}</span>
                  <span className="text-xs text-muted-foreground">{signup.character.name}</span>
                  {selectedId === signup.id ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">没有未分配的确认/替补成员。</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, groupIndex) => {
            const groupNo = groupIndex + 1;
            const groupAssignments = assignments.filter((entry) => entry.groupNo === groupNo);
            return (
              <div key={groupNo} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">第 {groupNo} 组</p>
                  <span className="text-xs text-muted-foreground">{groupAssignments.length}/5</span>
                </div>
                {Array.from({ length: 5 }, (_, index) => {
                  const positionNo = index + 1;
                  const assignment = currentAssignment(groupNo, positionNo);
                  const signup = assignment ? eligible.find((entry) => entry.id === assignment.signupId) : undefined;
                  const slot = snapshot.slots.find(
                    (entry) => entry.groupNo === groupNo && entry.positionNo === positionNo,
                  );
                  const name = signup?.memberName ?? slot?.userName ?? "空席";
                  const character = signup?.character.name ?? slot?.characterName;
                  return (
                    <button
                      key={positionNo}
                      type="button"
                      disabled={!canEdit}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left",
                        canEdit && "cursor-pointer hover:border-primary/50",
                        selectedId && !signup && "border-primary/50 bg-primary/5",
                        draggedId && !signup && "border-dashed border-primary bg-primary/5",
                        !signup && !slot?.userName && "text-muted-foreground",
                      )}
                      onClick={() => {
                        if (!canEdit) return;
                        if (selectedId) place(groupNo, positionNo, selectedId);
                        else if (assignment) remove(groupNo, positionNo);
                      }}
                      onDragOver={(event) => {
                        if (canEdit) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const id = event.dataTransfer.getData("text/plain") || draggedId;
                        if (canEdit && id) place(groupNo, positionNo, id);
                      }}
                      onDragStart={(event) => {
                        if (signup) {
                          event.dataTransfer.setData("text/plain", signup.id);
                          setDraggedId(signup.id);
                        }
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      draggable={Boolean(signup && canEdit)}
                      aria-label={`第${groupNo}组 ${positionNo}号位，${name}`}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                        {positionNo}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{name}</span>
                        {character ? (
                          <span className="block truncate text-xs text-muted-foreground">{character}</span>
                        ) : null}
                      </span>
                      {signup ? (
                        <UserPlus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      ) : slot?.userName ? (
                        <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {tacticalSlots.length ? (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">战术抽象槽位绑定</p>
              <p className="text-xs text-muted-foreground">槽位执行者可与 8×5 团队席位独立绑定。</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {tacticalSlots.map((slot) => {
                const binding = bindings.find((entry) => entry.slotKey === slot.slotKey);
                const signupId = binding?.signupId ?? slot.signupId ?? "__none__";
                return (
                  <div key={slot.slotKey} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{slot.label}</span>
                    {canEdit ? (
                      <Select
                        value={signupId}
                        onValueChange={(value) => {
                          setSaved(false);
                          setBindings((current) => [
                            ...current.filter((entry) => entry.slotKey !== slot.slotKey),
                            ...(value === "__none__" ? [] : [{ slotKey: slot.slotKey, signupId: value }]),
                          ]);
                        }}
                      >
                        <SelectTrigger aria-label={`${slot.label}执行者`}>
                          <SelectValue placeholder="未分配" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">未分配</SelectItem>
                          {eligible.map((entry) => (
                            <SelectItem key={entry.id} value={entry.id}>
                              {entry.memberName} · {entry.character.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        {slot.signupId
                          ? `${slot.userName ?? "成员"}${slot.characterName ? ` · ${slot.characterName}` : ""}`
                          : "未分配"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {canEdit ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => {
                setAssignments(
                  snapshot.slots.flatMap((slot) =>
                    slot.groupNo && slot.positionNo && slot.signupId
                      ? [{ groupNo: slot.groupNo, positionNo: slot.positionNo, signupId: slot.signupId }]
                      : [],
                  ),
                );
                setBindings(
                  snapshot.slots.flatMap((slot) =>
                    !slot.groupNo && !slot.positionNo && slot.signupId
                      ? [{ slotKey: slot.slotKey, signupId: slot.signupId }]
                      : [],
                  ),
                );
                setSaved(false);
                setError(undefined);
              }}
            >
              <RotateCcw data-icon="inline-start" />
              撤销未保存修改
            </Button>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
              <Save data-icon="inline-start" />
              {save.isPending ? "保存中…" : "保存团队分配"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
