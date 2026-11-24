"use client";

import { useMutation } from "@tanstack/react-query";
import type { ActivityDetail } from "@ttz/contracts";
import { activityTeamLayoutSaveSchema } from "@ttz/contracts";
import { cn } from "cn";
import { Check, GripVertical, Lock, RotateCcw, Save, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";

const saveResponseSchema = z.object({ layoutId: z.string(), revision: z.number().int(), updated: z.boolean() });
type Assignment = { groupNo: number; positionNo: number; signupId: string };

export function StrategyTeamWorkspace({
  activity,
  onChanged,
}: {
  activity: ActivityDetail;
  onChanged: () => Promise<void>;
}) {
  const layout = activity.teamLayout;
  const eligible = useMemo(
    () => activity.signups.filter((signup) => signup.status === "CONFIRMED" || signup.status === "BENCH"),
    [activity.signups],
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!layout) return;
    setAssignments(
      layout.seats.flatMap((seat) =>
        seat.signupId ? [{ groupNo: seat.groupNo, positionNo: seat.positionNo, signupId: seat.signupId }] : [],
      ),
    );
    setSelectedId(null);
    setSaved(false);
  }, [layout]);

  const save = useMutation({
    mutationFn: async () => {
      if (!layout) throw new Error("活动团队框架不存在");
      const body = activityTeamLayoutSaveSchema.parse({ revision: layout.revision, assignments });
      return apiRequest(`/activities/${activity.id}/team-layout`, saveResponseSchema, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      setError(undefined);
      setSaved(true);
      await onChanged();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "保存团队分组失败"),
  });

  if (!layout) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">团队分组（必选）</CardTitle>
          <CardDescription>活动团队框架尚未初始化，无法进行团队分组。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canEdit =
    activity.canManage &&
    activity.status !== "FINISHED" &&
    activity.status !== "CANCELLED" &&
    !activity.rosterLockedAt &&
    layout.status === "EDITING";
  const assignedIds = new Set(assignments.map(({ signupId }) => signupId));
  const unassigned = eligible.filter((signup) => !assignedIds.has(signup.id));
  const currentAssignment = (groupNo: number, positionNo: number) =>
    assignments.find((entry) => entry.groupNo === groupNo && entry.positionNo === positionNo);
  const currentSeat = (groupNo: number, positionNo: number) =>
    layout.seats.find((seat) => seat.groupNo === groupNo && seat.positionNo === positionNo);

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
  const reset = () => {
    setAssignments(
      layout.seats.flatMap((seat) =>
        seat.signupId ? [{ groupNo: seat.groupNo, positionNo: seat.positionNo, signupId: seat.signupId }] : [],
      ),
    );
    setSelectedId(null);
    setSaved(false);
    setError(undefined);
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          团队分组（必选）
          <Badge variant="secondary">活动级共享</Badge>
          <Badge variant={layout.status === "LOCKED" ? "default" : "outline"}>
            {layout.status === "LOCKED" ? "已锁定" : "可编辑"}
          </Badge>
          <Badge variant="outline">修订 {layout.revision}</Badge>
        </CardTitle>
        <CardDescription>
          {canEdit
            ? "这份团队框架由本场活动所有 Boss 共享。可拖动成员，或先点击成员再点击目标席位。"
            : "这份团队框架由本场活动所有 Boss 共享"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {layout.needsReview ? (
          <Alert>
            <AlertTitle>请核对迁移的团队分组</AlertTitle>
            <AlertDescription>
              旧活动在不同 Boss
              快照中的团队席位存在差异。系统先带入一份历史布局；请检查所有席位后保存，确认后会清除此提示。
            </AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">团队分组已保存。</p>
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
                    "flex items-center gap-1.5 border bg-background px-2 py-1.5 text-left text-sm",
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
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: layout.groupCount }, (_, groupIndex) => {
            const groupNo = groupIndex + 1;
            return (
              <div key={groupNo} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">第 {groupNo} 组</p>
                </div>
                {Array.from({ length: layout.seatsPerGroup }, (_, index) => {
                  const positionNo = index + 1;
                  const assignment = currentAssignment(groupNo, positionNo);
                  const signup = assignment ? eligible.find((entry) => entry.id === assignment.signupId) : undefined;
                  const seat = currentSeat(groupNo, positionNo);
                  const name = signup?.memberName ?? seat?.userName ?? "空席";
                  const character = signup?.character.name ?? seat?.characterName;
                  return (
                    <button
                      key={positionNo}
                      type="button"
                      disabled={!canEdit}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-2 border px-2 py-1.5 text-left",
                        canEdit && "cursor-pointer hover:border-primary/50",
                        selectedId && !signup && "border-primary/50 bg-primary/5",
                        draggedId && !signup && "border-dashed border-primary bg-primary/5",
                        !signup && !seat?.userName && "text-muted-foreground",
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
                      ) : seat?.userName ? (
                        <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {canEdit ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={reset}>
              <RotateCcw data-icon="inline-start" />
              撤销未保存修改
            </Button>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
              <Save data-icon="inline-start" />
              {save.isPending ? "保存中…" : "保存团队分组"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
