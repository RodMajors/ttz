"use client";

import { useQuery } from "@tanstack/react-query";
import { type ActivityStatus, activityListSchema } from "@ttz/contracts";
import { AlertCircle, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api-client";

const labels: Record<ActivityStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  FINISHED: "已结束",
  CANCELLED: "已取消",
};

export function ActivitiesScreen() {
  const query = useQuery({
    queryKey: ["activities"],
    queryFn: () => apiRequest("/activities?page=1&pageSize=20", activityListSchema),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>活动列表</CardTitle>
        <CardDescription>显示真实 API 数据；报名中、截止和进行中由时间与活动状态共同计算。</CardDescription>
        <CardAction>
          <Button asChild>
            <Link href="/dashboard/activities/new">
              <Plus data-icon="inline-start" />
              创建活动
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="flex flex-col gap-3" role="status" aria-label="正在加载活动">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {query.isError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>活动数据暂时不可用</AlertTitle>
            <AlertDescription>{query.error.message}。请确认 API、数据库和本地调试用户配置。</AlertDescription>
          </Alert>
        ) : null}
        {query.data?.items.length === 0 ? (
          <Empty className="min-h-56 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>还没有活动</EmptyTitle>
              <EmptyDescription>创建第一场活动后，成员即可在截止时间前报名。</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/dashboard/activities/new">创建活动</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {query.data?.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>活动</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>报名</TableHead>
                <TableHead>负责人</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <span className="font-medium">{activity.name}</span>
                    <p className="text-xs text-muted-foreground">{activity.type}</p>
                  </TableCell>
                  <TableCell>{formatDate(activity.beginAt)}</TableCell>
                  <TableCell>
                    <Badge variant={activity.status === "PUBLISHED" ? "default" : "secondary"}>
                      {labels[activity.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {activity.confirmedCount} 已确认 / {activity.signupCount} 已报名
                  </TableCell>
                  <TableCell>{activity.creatorName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
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
