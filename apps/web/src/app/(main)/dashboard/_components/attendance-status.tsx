import type { AttendanceStatus } from "@ttz/contracts";

const statusPresentation: Record<AttendanceStatus, { label: string; className: string; countsAsEffective: boolean }> = {
  PRESENT: { label: "正常出勤", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", countsAsEffective: true },
  LATE: { label: "迟到", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", countsAsEffective: true },
  EXCUSED_ABSENCE: { label: "请假", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300", countsAsEffective: false },
  UNEXCUSED_ABSENCE: { label: "缺席", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", countsAsEffective: false },
  BENCH: { label: "替补", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300", countsAsEffective: false },
  NOT_SIGNED_UP: { label: "未报名", className: "bg-muted text-muted-foreground", countsAsEffective: false },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const presentation = statusPresentation[status];
  return <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " + presentation.className}><span className="size-1.5 rounded-full bg-current" />{presentation.label}</span>;
}

export function isEffectiveAttendance(status: AttendanceStatus): boolean { return statusPresentation[status].countsAsEffective; }
