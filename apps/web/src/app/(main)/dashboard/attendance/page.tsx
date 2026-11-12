import type { Metadata } from "next";
import { ChartNoAxesColumnIncreasing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeaturePreview } from "../_components/feature-preview";
import { AttendanceStatusBadge } from "../_components/attendance-status";

export const metadata: Metadata = { title: "出勤统计 | TTZ 公会站" };

const statuses = ["PRESENT", "LATE", "EXCUSED_ABSENCE", "UNEXCUSED_ABSENCE", "BENCH", "NOT_SIGNED_UP"] as const;

export default function AttendancePage() {
  return <FeaturePreview icon={ChartNoAxesColumnIncreasing} title="出勤统计" description="统计团本开荒活动。正常出勤和迟到计为有效出勤；请假、缺席、替补与未报名分别展示。所有审核通过成员均可查看。">
    <Card><CardHeader><CardTitle>状态图例</CardTitle><p className="text-sm text-muted-foreground">出勤记录与报名/最终名单分开保存。</p></CardHeader><CardContent><div className="flex flex-wrap gap-2">{statuses.map((status) => <AttendanceStatusBadge key={status} status={status} />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">有效出勤</p><div className="mt-3 flex gap-2"><Badge className="bg-emerald-600">正常出勤</Badge><Badge className="bg-amber-500 text-black">迟到</Badge></div></div><div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">统计范围</p><p className="mt-3 text-sm">仅团本开荒类型且已结束的活动</p></div></div></CardContent></Card>
  </FeaturePreview>;
}
