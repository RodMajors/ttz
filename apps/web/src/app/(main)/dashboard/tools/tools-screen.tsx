"use client";
import { useQuery } from "@tanstack/react-query";
import { toolLinksSettingSchema } from "@ttz/contracts";
import { CircleAlert, ExternalLink, Link2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";
export function ToolsScreen() {
  const query = useQuery({
    queryKey: ["public", "tools"],
    queryFn: () => apiRequest("/public/tools", toolLinksSettingSchema),
  });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">公会工具箱</p>
        <h1 className="text-3xl font-semibold tracking-tight">常用工具</h1>
        <p className="mt-2 text-sm text-muted-foreground">链接由管理员在系统设置中统一维护。</p>
      </div>
      {query.isPending ? <Skeleton className="h-64 w-full" /> : null}
      {query.isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>工具链接不可用</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {query.data?.links.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.links.map((item) => (
            <Card key={item.url}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{item.description ?? "外部公会工具"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    打开工具 <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : query.data ? (
        <Empty className="min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Link2 />
            </EmptyMedia>
            <EmptyTitle>暂无工具链接</EmptyTitle>
            <EmptyDescription>管理员可在系统设置中添加 WCL、Wipefest 等入口。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}
