"use client";

import { useQuery } from "@tanstack/react-query";
import { activityListSchema, announcementListSchema, attendanceSummarySchema, memberListSchema } from "@ttz/contracts";
import { Bell, CalendarDays, CheckCircle2, CircleAlert, Clock3, Users } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";
import { AttendanceStatusBadge } from "../_components/attendance-status";

export function DashboardOverview() {
  const activities = useQuery({
    queryKey: ["activities", "dashboard"],
    queryFn: () => apiRequest("/activities?page=1&pageSize=10", activityListSchema),
  });
  const attendance = useQuery({
    queryKey: ["attendance-summary"],
    queryFn: () => apiRequest("/attendance/summary", attendanceSummarySchema),
  });
  const members = useQuery({
    queryKey: ["members", "dashboard"],
    queryFn: () => apiRequest("/members?page=1&pageSize=1", memberListSchema),
  });
  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiRequest("/announcements", announcementListSchema),
  });
  const queries = [activities, attendance, members, announcements];
  if (queries.some((query) => query.isPending))
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  const error = queries.find((query) => query.isError)?.error;
  if (error || !activities.data || !attendance.data || !members.data || !announcements.data)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>工作台数据暂时不可用</AlertTitle>
        <AlertDescription>{error?.message ?? "请稍后重试"}</AlertDescription>
      </Alert>
    );
  const upcoming = activities.data.items
    .filter((activity) => activity.status === "PUBLISHED" && new Date(activity.beginAt) > new Date())
    .sort((a, b) => new Date(a.beginAt).getTime() - new Date(b.beginAt).getTime())
    .slice(0, 5);
  const pendingSignups = activities.data.items.filter((activity) => activity.mySignupStatus === "PENDING").length;
  const needsSignup = upcoming.filter((activity) => activity.isSignupOpen && !activity.mySignupStatus).length;
  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Asia/Shanghai</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">TTZ 公会工作台</h1>
        <p className="mt-2 text-sm text-muted-foreground">活动、报名、名单和出勤的实时概览。</p>
      </div>
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Metric icon={CalendarDays} label="近期活动" value={String(upcoming.length)} note="未来已发布活动" />
        <Metric
          icon={Clock3}
          label="待确认报名"
          value={String(pendingSignups)}
          note={`另有 ${needsSignup} 场尚未报名`}
        />
        <Metric
          icon={CheckCircle2}
          label="我的有效出勤"
          value={`${(attendance.data.rate * 100).toFixed(1)}%`}
          note="正常出勤 + 迟到"
        />
        <Metric icon={Users} label="当前成员" value={String(members.data.pagination.total)} note="已审核且启用" />
      </div>
      <div className="grid gap-5 @5xl/main:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>近期活动</CardTitle>
            <CardDescription>报名截止或确认后，普通成员不能再修改或取消。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcoming.length ? (
              upcoming.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/dashboard/activities/${activity.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.beginAt)} · {activity.creatorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {activity.confirmedCount}/{activity.maxPlayers}
                    </Badge>
                    <Badge variant={activity.mySignupStatus === "CONFIRMED" ? "default" : "outline"}>
                      {activity.mySignupStatus
                        ? signupLabel(activity.mySignupStatus)
                        : activity.isSignupOpen
                          ? "未报名"
                          : "已截止"}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂无近期活动。</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>本人出勤</CardTitle>
            <CardDescription>正常出勤和迟到计入有效出勤。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {attendance.data.activities.slice(0, 6).map((activity) => (
              <Link
                key={activity.id}
                href={`/dashboard/attendance/${activity.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{activity.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(activity.beginAt)}</p>
                </div>
                <AttendanceStatusBadge status={activity.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell />
            公告
          </CardTitle>
          <CardDescription>只显示当前成员可见且在有效期内的公告。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {announcements.data.slice(0, 4).map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                {announcement.isPinned ? <Badge>置顶</Badge> : null}
                <p className="font-medium">{announcement.title}</p>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {announcement.content}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
        <CardAction>
          <Badge variant="outline">
            <Icon />
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="font-medium">{note}</div>
        <div className="text-muted-foreground">数据来自当前工作台</div>
      </CardFooter>
    </Card>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
function signupLabel(status: string) {
  return (
    { PENDING: "待确认", CONFIRMED: "已确认", BENCH: "替补", CANCELLED: "已取消", REJECTED: "已拒绝" }[status] ?? status
  );
}
