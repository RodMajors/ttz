"use client";

import { useQuery } from "@tanstack/react-query";
import { type ActivityStatus, activityListSchema } from "@ttz/contracts";
import { AlertCircle, CalendarDays, Plus, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
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
  const hasFilter = Boolean(status || type || mine);

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

  function resetFilters() {
    setStatus("");
    setType("");
    setMine("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>活动列表</CardTitle>
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
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <FilterField label="状态" id="filter-status">
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
              <SelectTrigger id="filter-status" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                  <SelectItem value="PUBLISHED">已发布</SelectItem>
                  <SelectItem value="FINISHED">已结束</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="类型" id="filter-type">
            <Select value={type || "all"} onValueChange={(value) => setType(value === "all" ? "" : value)}>
              <SelectTrigger id="filter-type" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="raid_progress">团本开荒</SelectItem>
                  <SelectItem value="raid_farm">团本 Farm</SelectItem>
                  <SelectItem value="mythic_plus_push">大秘境冲层</SelectItem>
                  <SelectItem value="mythic_plus_vault">大秘境低保</SelectItem>
                  <SelectItem value="casual">休闲</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="我的" id="filter-mine">
            <Select value={mine || "all"} onValueChange={(value) => setMine(value === "all" ? "" : value)}>
              <SelectTrigger id="filter-mine" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部活动</SelectItem>
                  <SelectItem value="signed">我的报名</SelectItem>
                  <SelectItem value="unsigned">我未报名</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FilterField>

          {hasFilter ? (
            <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground">
              <X data-icon="inline-start" />
              重置
            </Button>
          ) : null}

          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {query.isPending ? "加载中…" : `共 ${visible.length} 个活动`}
          </span>
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
                    {activity.maxPlayers == null ? " · 不限人数" : ` · 建议 ${activity.maxPlayers} 人`}
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

function FilterField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="whitespace-nowrap text-sm text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
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
