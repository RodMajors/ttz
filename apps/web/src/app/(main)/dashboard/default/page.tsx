import type { Metadata } from "next";
import { Bell, CalendarDays, CheckCircle2, Clock3, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AttendanceStatusBadge } from "../_components/attendance-status";
import { NotificationPreferences } from "../_components/notification-preferences";

export const metadata: Metadata = { title: "工作台 | TTZ 公会站" };

const attendance = [
  ["正常出勤", "bg-emerald-500", "7"],
  ["迟到", "bg-amber-500", "1"],
  ["请假", "bg-sky-500", "1"],
  ["缺席", "bg-rose-500", "0"],
  ["替补", "bg-violet-500", "2"],
  ["未报名", "bg-muted-foreground", "1"],
] as const;

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted-foreground">本地演示数据 · Asia/Shanghai</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">晚上好，欢迎回到 TTZ。</h1></div><Badge variant="outline" className="w-fit">页面原型</Badge></div>
      <div className="grid gap-4 @xl/main:grid-cols-4"><Metric icon={CalendarDays} label="本周活动" value="3" note="下次开组 周四 21:00" /><Metric icon={Clock3} label="待确认报名" value="2" note="需要活动负责人处理" /><Metric icon={CheckCircle2} label="我的有效出勤" value="87.5%" note="正常出勤 + 迟到" /><Metric icon={Users} label="当前成员" value="24" note="已审核成员" /></div>
      <div className="grid gap-5 @5xl/main:grid-cols-[1.25fr_0.75fr]">
        <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>近期活动</CardTitle><p className="mt-1 text-sm text-muted-foreground">报名截止后，普通成员不能再新增或修改报名。</p></div><CalendarDays className="size-5 text-muted-foreground" /></div></CardHeader><CardContent className="space-y-3"><ActivityRow day="周四 21:00" title="M 团本开荒" status="报名中" detail="集合时间 20:40 · 20 人上限" /><ActivityRow day="周一 21:00" title="团本开荒" status="已发布" detail="集合时间 20:40 · 20 人上限" /><ActivityRow day="周二 21:00" title="大秘境低保" status="草稿" detail="活动创建者：站长" /></CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>本月出勤概览</CardTitle><p className="mt-1 text-sm text-muted-foreground">团本开荒活动</p></div><CheckCircle2 className="size-5 text-muted-foreground" /></div></CardHeader><CardContent className="space-y-4">{attendance.map(([label, color, value]) => <div className="flex items-center gap-3" key={label}><span className={"size-2.5 rounded-full " + color} /><span className="flex-1 text-sm">{label}</span><span className="text-sm font-medium">{value}</span></div>)}</CardContent></Card>
      </div>
      <div className="grid gap-5 @5xl/main:grid-cols-2"><Card><CardHeader><div className="flex items-center gap-2"><Bell className="size-4" /><CardTitle>出勤状态</CardTitle></div><p className="text-sm text-muted-foreground">只有正常出勤和迟到计入有效出勤。</p></CardHeader><CardContent className="flex flex-wrap gap-2">{(["PRESENT", "LATE", "EXCUSED_ABSENCE", "UNEXCUSED_ABSENCE", "BENCH", "NOT_SIGNED_UP"] as const).map((status) => <AttendanceStatusBadge key={status} status={status} />)}</CardContent></Card><NotificationPreferences /></div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof CalendarDays; label: string; value: string; note: string }) { return <Card><CardContent className="p-5"><Icon className="size-5 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></CardContent></Card>; }
function ActivityRow({ day, title, status, detail }: { day: string; title: string; status: string; detail: string }) { return <div className="flex items-center gap-4 rounded-xl border p-4"><div className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{day}</div><div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></div><Badge variant={status === "报名中" ? "default" : "secondary"}>{status}</Badge></div>; }
