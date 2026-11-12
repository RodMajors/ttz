"use client";

import { useQuery } from "@tanstack/react-query";
import { publicProgressSchema } from "@ttz/contracts";
import { ArrowLeft, ExternalLink, Swords } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";

export function PublicProgress() {
  const query = useQuery({
    queryKey: ["public", "progress"],
    queryFn: () => apiRequest("/public/progress", publicProgressSchema),
  });
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <Button asChild variant="ghost">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" />
          返回首页
        </Link>
      </Button>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <Badge variant="outline">CN · 伊森利恩</Badge>
          <h1 className="mt-3 text-4xl font-semibold">团本进度与报告</h1>
          <p className="mt-2 text-muted-foreground">展示本站已导入的 Warcraft Logs 公开报告摘要。</p>
        </div>
        <Button asChild variant="outline">
          <a href="https://cn.warcraftlogs.com/server/id/569" target="_blank" rel="noreferrer">
            打开 WCL <ExternalLink data-icon="inline-end" />
          </a>
        </Button>
      </div>
      {query.isPending ? <Skeleton className="mt-8 h-64 w-full" /> : null}
      {query.isError ? (
        <Alert variant="destructive" className="mt-8">
          <AlertTitle>进度数据不可用</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {query.data?.reports.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {query.data.reports.map((report) => (
            <Card key={report.reportCode}>
              <CardHeader>
                <CardTitle>{report.activityName}</CardTitle>
                <CardDescription>{new Date(report.beginAt).toLocaleString("zh-CN", { hour12: false })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="战斗" value={report.summary?.fightCount} />
                  <Metric label="击杀" value={report.summary?.killCount} />
                  <Metric label="角色" value={report.summary?.actorCount} />
                </div>
                <Button asChild variant="link" className="mt-3 px-0">
                  <a href={`https://cn.warcraftlogs.com/reports/${report.reportCode}`} target="_blank" rel="noreferrer">
                    查看报告 <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : query.data ? (
        <Empty className="mt-8 min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Swords />
            </EmptyMedia>
            <EmptyTitle>暂无公开报告</EmptyTitle>
            <EmptyDescription>活动负责人完成 WCL 导入后会显示在这里。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </main>
  );
}
function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{typeof value === "number" ? value : 0}</p>
    </div>
  );
}
