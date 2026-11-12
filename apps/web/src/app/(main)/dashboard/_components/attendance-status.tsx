import type { AttendanceStatus } from "@ttz/contracts";
import { Badge } from "@/components/ui/badge";

const statusPresentation: Record<
  AttendanceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; countsAsEffective: boolean }
> = {
  UNKNOWN: { label: "待记录", variant: "outline", countsAsEffective: false },
  PRESENT: { label: "正常出勤", variant: "default", countsAsEffective: true },
  LATE: { label: "迟到", variant: "default", countsAsEffective: true },
  EXCUSED_ABSENCE: { label: "请假", variant: "secondary", countsAsEffective: false },
  UNEXCUSED_ABSENCE: { label: "缺席", variant: "destructive", countsAsEffective: false },
  BENCH: { label: "替补", variant: "secondary", countsAsEffective: false },
  NOT_SIGNED_UP: { label: "未报名", variant: "outline", countsAsEffective: false },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const presentation = statusPresentation[status];
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}

export function isEffectiveAttendance(status: AttendanceStatus): boolean {
  return statusPresentation[status].countsAsEffective;
}
