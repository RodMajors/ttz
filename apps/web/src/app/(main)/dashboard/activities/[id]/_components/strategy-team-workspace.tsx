"use client";

import healerRoleIcon from "@media/roles/healer-modern.png";
import tankRoleIcon from "@media/roles/tank-modern.png";
import { useMutation } from "@tanstack/react-query";
import type { ActivityDetail } from "@ttz/contracts";
import { activityTeamLayoutSaveSchema } from "@ttz/contracts";
import { cn } from "cn";
import { Check, Lock, RotateCcw, Save, X } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { apiRequest } from "@/lib/api-client";

const saveResponseSchema = z.object({
  layoutId: z.string(),
  revision: z.number().int(),
  updated: z.boolean(),
});
type Assignment = { groupNo: number; positionNo: number; signupId: string };
const roleLabels = { TANK: "坦克", HEALER: "治疗", MELEE: "近战", RANGED: "远程" } as const;

export function StrategyTeamWorkspace({
  activity,
  onChanged,
  readOnly = false,
}: {
  activity: ActivityDetail;
  onChanged: () => Promise<void>;
  readOnly?: boolean;
}) {
  const layout = activity.teamLayout;
  const eligible = useMemo(
    () => activity.signups.filter((signup) => signup.status === "CONFIRMED"),
    [activity.signups],
  );
  const groupsToShow = Math.min(6, Math.max(4, Math.ceil(eligible.length / 5)));
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const visibleAssignments = assignments.filter((entry) => entry.groupNo <= groupsToShow);

  useEffect(() => {
    if (!layout) return;
    const confirmedIds = new Set(eligible.map((signup) => signup.id));
    setAssignments(
      layout.seats.flatMap((seat) =>
        seat.signupId && confirmedIds.has(seat.signupId)
          ? [
              {
                groupNo: seat.groupNo,
                positionNo: seat.positionNo,
                signupId: seat.signupId,
              },
            ]
          : [],
      ),
    );
    setSelectedId(null);
    setSaved(false);
  }, [eligible, layout]);

  const save = useMutation({
    mutationFn: async () => {
      if (!layout) throw new Error("活动团队框架不存在");
      const body = activityTeamLayoutSaveSchema.parse({
        revision: layout.revision,
        assignments: visibleAssignments,
      });
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
      <Card className="ring-0">
        <CardHeader>
          <CardTitle className="text-base">团队分组</CardTitle>
          <CardDescription>活动团队框架尚未初始化，无法进行团队分组。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canEdit =
    !readOnly &&
    activity.canManage &&
    activity.status !== "FINISHED" &&
    activity.status !== "CANCELLED" &&
    activity.lifecycleStatus !== "COMPLETED" &&
    !activity.rosterLockedAt &&
    layout.status === "EDITING";
  const assignedIds = new Set(visibleAssignments.map(({ signupId }) => signupId));
  const unassigned = eligible.filter((signup) => !assignedIds.has(signup.id));
  const currentAssignment = (groupNo: number, positionNo: number) =>
    visibleAssignments.find((entry) => entry.groupNo === groupNo && entry.positionNo === positionNo);
  // Live signups come from the draft assignments, not from the original seat.
  const historicalSeat = (groupNo: number, positionNo: number) =>
    layout.seats.find((entry) => entry.groupNo === groupNo && entry.positionNo === positionNo && !entry.signupId);

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
        seat.signupId && eligible.some((signup) => signup.id === seat.signupId)
          ? [
              {
                groupNo: seat.groupNo,
                positionNo: seat.positionNo,
                signupId: seat.signupId,
              },
            ]
          : [],
      ),
    );
    setSelectedId(null);
    setSaved(false);
    setError(undefined);
  };

  return (
    <Card className="ring-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          团队分组
          <Badge variant="secondary">活动级共享</Badge>
          <Badge variant={layout.status === "LOCKED" ? "default" : "outline"}>
            {layout.status === "LOCKED" ? "已锁定" : canEdit ? "可编辑" : "只读"}
          </Badge>
          <Badge variant="outline">修订 {layout.revision}</Badge>
        </CardTitle>
        <CardDescription>
          {canEdit
            ? "根据最终确认名单显示团队分组。可拖动角色，或先点击角色再点击目标席位。"
            : "团队分组展示最终确认名单。"}
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
        <div className="flex flex-col gap-2 rounded border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-medium">未分配池</p>
              <p className="text-xs text-muted-foreground">{unassigned.length} 名确认成员未分配团队分组</p>
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
                <HoverCard key={signup.id}>
                  <HoverCardTrigger asChild>
                    <button
                      key={signup.id}
                      type="button"
                      draggable={canEdit}
                      disabled={!canEdit}
                      className={cn(
                        "flex max-w-64 items-center gap-1.5 rounded border px-2 py-1.5 text-left text-sm",
                        signup.character.classColor ? "text-background" : "bg-background",
                        canEdit && "cursor-grab hover:border-primary/50",
                        selectedId === signup.id && "border-primary ring-2 ring-primary/20",
                      )}
                      {...classBackground(signup.character.classColor)}
                      onClick={() => setSelectedId((current) => (current === signup.id ? null : signup.id))}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", signup.id);
                        setDraggedId(signup.id);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      aria-pressed={selectedId === signup.id}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <GameIcon src={signup.character.classIconUrl} className="size-6" />
                        <span className="truncate">{signup.character.name}</span>
                      </span>
                      {selectedId === signup.id ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        <div className="size-3.5" />
                      )}
                    </button>
                  </HoverCardTrigger>
                  <SignupCharacterHoverCard signup={signup} />
                </HoverCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">没有未分配的确认/替补成员。</p>
            )}
          </div>
        </div>
        <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto">
          {Array.from({ length: groupsToShow }, (_, groupIndex) => {
            const groupNo = groupIndex + 1;
            return (
              <div key={groupNo} className="flex w-40 shrink-0 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">第 {groupNo} 组</p>
                </div>
                {Array.from({ length: layout.seatsPerGroup }, (_, index) => {
                  const positionNo = index + 1;
                  const assignment = currentAssignment(groupNo, positionNo);
                  const signup = assignment ? eligible.find((entry) => entry.id === assignment.signupId) : undefined;
                  const seat = signup ? undefined : historicalSeat(groupNo, positionNo);
                  const name = signup?.character.name ?? seat?.characterName ?? "空席";
                  const isOwn = Boolean(signup && signup.userId === activity.mySignup?.userId);
                  const classColor = signup
                    ? signup.character.classColor
                    : activity.signups.find((entry) => entry.character.classId === seat?.classId)?.character.classColor;
                  const seatButton = (
                    <button
                      key={positionNo}
                      type="button"
                      disabled={!canEdit}
                      className={cn(
                        "relative flex min-h-12 w-full items-center gap-2 border px-2 py-1.5 text-left",
                        (signup?.preferredRole === "TANK" || signup?.preferredRole === "HEALER") && "pr-6",
                        classColor && "text-background",
                        isOwn && "border-amber-500 inset-ring-2 inset-ring-amber-500",
                        canEdit && "cursor-pointer",
                        canEdit && !isOwn && "hover:border-primary/50",
                        selectedId && !signup && "border-primary/50",
                        draggedId && !signup && "border-dashed border-primary",
                        (selectedId || draggedId) && !signup && !classColor && "bg-primary/5",
                        !classColor && !signup && !seat?.characterName && "text-muted-foreground",
                      )}
                      {...classBackground(classColor)}
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
                      aria-label={`第${groupNo}组 ${positionNo}号位，${name}${isOwn ? "（我的角色）" : ""}`}
                    >
                      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                        {positionNo}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-base text-center">{name}</span>
                      {signup?.preferredRole === "TANK" ? (
                        <GameIcon src={tankRoleIcon.src} alt="坦克" className="absolute right-1 top-1 size-3.5" />
                      ) : signup?.preferredRole === "HEALER" ? (
                        <GameIcon src={healerRoleIcon.src} alt="治疗" className="absolute right-1 top-1 size-3.5" />
                      ) : null}
                      {signup ? null : seat?.userName ? (
                        <Lock className="size-3.5 opacity-70" aria-hidden="true" />
                      ) : (
                        <div className="size-3.5" />
                      )}
                    </button>
                  );
                  return signup ? (
                    <HoverCard key={`card-${positionNo}`}>
                      <HoverCardTrigger asChild>{seatButton}</HoverCardTrigger>
                      <SignupCharacterHoverCard signup={signup} />
                    </HoverCard>
                  ) : (
                    seatButton
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

function classBackground(color: string | null | undefined) {
  return color
    ? {
        "data-class-accent-bg": "",
        style: { "--class-color": color } as CSSProperties,
      }
    : {};
}

function SignupCharacterHoverCard({ signup }: { signup: ActivityDetail["signups"][number] }) {
  const spec = signup.character.availableSpecs.find((entry) => entry.id === signup.preferredSpecId);
  return (
    <HoverCardContent className="w-72">
      <div className="flex items-start gap-3">
        <GameIcon src={signup.character.classIconUrl} alt="" className="size-10 rounded" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{signup.character.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {signup.memberName} · {signup.character.realm}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {spec?.iconUrl ? <GameIcon src={spec.iconUrl} alt="" className="size-5 rounded" /> : null}
            <span>{spec?.name ?? signup.character.activeSpecName ?? "未指定专精"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {spec?.role
              ? roleLabels[spec.role]
              : signup.preferredRole
                ? roleLabels[signup.preferredRole]
                : "职责未指定"}
            {signup.character.averageItemLevel != null ? ` · 装等 ${signup.character.averageItemLevel}` : ""}
          </p>
        </div>
      </div>
    </HoverCardContent>
  );
}
