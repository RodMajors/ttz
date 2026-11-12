"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationPreferenceSchema } from "@ttz/contracts";
import { Bell, CalendarClock, CalendarPlus, CircleCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/api-client";

const preferences = [
  { key: "activityPublished", label: "活动发布", description: "有新活动开放报名时提醒", icon: CalendarPlus },
  { key: "signupResult", label: "报名结果", description: "报名进入正式名单或替补时提醒", icon: CircleCheck },
  { key: "beforeTeamUp", label: "开组前提醒", description: "在活动开组时间前提醒", icon: CalendarClock },
  { key: "activityCancelled", label: "活动取消", description: "活动被取消时提醒", icon: TriangleAlert },
] as const;

export function NotificationPreferences() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => apiRequest("/notification-preferences", notificationPreferenceSchema),
  });
  const mutation = useMutation({
    mutationFn: (body: NonNullable<typeof query.data>) =>
      apiRequest("/notification-preferences", notificationPreferenceSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => client.setQueryData(["notification-preferences"], data),
  });
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="text-muted-foreground" />
          <CardTitle>小程序提醒偏好</CardTitle>
        </div>
        <CardDescription>可分别关闭不需要的提醒；偏好会立即保存到成员账号。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {query.isPending ? <Skeleton className="h-52 w-full" /> : null}
        {query.data
          ? preferences.map((preference) => {
              const Icon = preference.icon;
              return (
                <div
                  className="flex items-center gap-4 border-b py-4 first:pt-0 last:border-0 last:pb-0"
                  key={preference.key}
                >
                  <Icon className="text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{preference.label}</p>
                    <p className="text-xs text-muted-foreground">{preference.description}</p>
                  </div>
                  <Switch
                    checked={query.data[preference.key]}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) => mutation.mutate({ ...query.data, [preference.key]: checked })}
                    aria-label={preference.label}
                  />
                </div>
              );
            })
          : null}
        {query.isError || mutation.isError ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>提醒偏好暂时不可用</AlertTitle>
            <AlertDescription>{query.error?.message ?? mutation.error?.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
