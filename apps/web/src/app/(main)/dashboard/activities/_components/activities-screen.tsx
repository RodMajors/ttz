"use client";

import { useQuery } from "@tanstack/react-query";
import { type ActivityStatus, activityListSchema } from "@ttz/contracts";
import { AlertCircle, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [mine, setMine] = useState("");
  const query = useQuery({
    queryKey: ["activities"],
    queryFn: () => apiRequest("/activities?page=1&pageSize=20", activityListSchema),
  });
  const visible =
    query.data?.items.filter((activity) => {
      const statusMatches = !status || activity.status === status;
      const typeMatches = !type || activity.type === type;
      const mineMatches = !mine || (mine === "signed" ? Boolean(activity.mySignupStatus) : !activity.mySignupStatus);
      return statusMatches && typeMatches && mineMatches;
    }) ?? [];
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
        <div className="mb-4 flex flex-wrap gap-2">
          <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} aria-label="按活动状态筛选">
            <NativeSelectOption value="">全部状态</NativeSelectOption>
            <NativeSelectOption value="DRAFT">草稿</NativeSelectOption>
            <NativeSelectOption value="PUBLISHED">已发布</NativeSelectOption>
            <NativeSelectOption value="FINISHED">已结束</NativeSelectOption>
            <NativeSelectOption value="CANCELLED">已取消</NativeSelectOption>
          </NativeSelect>
          <NativeSelect value={type} onChange={(event) => setType(event.target.value)} aria-label="按活动类型筛选">
            <NativeSelectOption value="">全部类型</NativeSelectOption>
            <NativeSelectOption value="raid_progress">团本开荒</NativeSelectOption>
            <NativeSelectOption value="raid_farm">团本 Farm</NativeSelectOption>
            <NativeSelectOption value="mythic_plus_push">大秘境冲层</NativeSelectOption>
            <NativeSelectOption value="mythic_plus_vault">大秘境低保</NativeSelectOption>
            <NativeSelectOption value="casual">休闲</NativeSelectOption>
          </NativeSelect>
          <NativeSelect value={mine} onChange={(event) => setMine(event.target.value)} aria-label="按本人报名筛选">
            <NativeSelectOption value="">全部活动</NativeSelectOption>
            <NativeSelectOption value="signed">我的报名</NativeSelectOption>
            <NativeSelectOption value="unsigned">我未报名</NativeSelectOption>
          </NativeSelect>
        </div>
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
        {query.data && visible.length === 0 ? (
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
        {visible.length ? (
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
              {visible.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Link className="font-medium hover:underline" href={`/dashboard/activities/${activity.id}`}>
                      {activity.name}
                    </Link>
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
