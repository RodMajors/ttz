"use client";
import { useQuery } from "@tanstack/react-query";
import { type AttendanceStatus, attendanceSummarySchema } from "@ttz/contracts";
import { AlertCircle, ChartNoAxesColumnIncreasing, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";
import { AttendanceStatusBadge } from "../../_components/attendance-status";

const statuses: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "EXCUSED_ABSENCE",
  "UNEXCUSED_ABSENCE",
  "BENCH",
  "NOT_SIGNED_UP",
];
export function AttendanceScreen() {
  const query = useQuery({
    queryKey: ["attendance-summary"],
    queryFn: () => apiRequest("/attendance/summary", attendanceSummarySchema),
  });
  if (query.isPending)
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  if (query.isError)
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>出勤数据暂时不可用</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
      </Alert>
    );
  if (query.data.activityCount === 0)
    return (
      <Empty className="min-h-56 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartNoAxesColumnIncreasing />
          </EmptyMedia>
          <EmptyTitle>暂无可统计活动</EmptyTitle>
          <EmptyDescription>完成计入出勤的团本开荒活动并登记出勤后，这里会显示真实统计。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="有效出勤率" value={`${(query.data.rate * 100).toFixed(1)}%`} description="正常出勤和迟到" />
        <Metric
          title="有效出勤"
          value={String(query.data.effectiveCount)}
          description={`共 ${query.data.activityCount} 场应统计活动`}
        />
        <Metric
          title="未计入出勤"
          value={String(query.data.activityCount - query.data.effectiveCount)}
          description="请假、缺席、替补或未报名"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>状态明细</CardTitle>
          <CardDescription>系统不设置早退状态；身份组筛选使用当前成员状态。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statuses.map((status) => (
            <div className="flex items-center justify-between rounded-lg border p-3" key={status}>
              <AttendanceStatusBadge status={status} />
              <span className="font-medium tabular-nums">{query.data.counts[status]}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>活动记录</CardTitle>
          <CardDescription>进入单场活动可查看自己的记录；活动负责人可人工确认并关联 WCL。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {query.data.activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/dashboard/attendance/${activity.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div>
                <p className="font-medium">{activity.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(activity.beginAt)}</p>
              </div>
              <AttendanceStatusBadge status={activity.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
function Metric({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 />
        {description}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(
    new Date(value),
  );
}
