"use client";

import { useState } from "react";
import { Bell, CalendarClock, CalendarPlus, CircleCheck, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const preferences = [
  { key: "activityPublished", label: "活动发布", description: "有新活动开放报名时提醒", icon: CalendarPlus },
  { key: "signupResult", label: "报名结果", description: "报名进入正式名单或替补时提醒", icon: CircleCheck },
  { key: "beforeTeamUp", label: "开组前提醒", description: "在活动开组时间前提醒", icon: CalendarClock },
  { key: "activityCancelled", label: "活动取消", description: "活动被取消时提醒", icon: TriangleAlert },
] as const;

type PreferenceKey = (typeof preferences)[number]["key"];

export function NotificationPreferences() {
  const [values, setValues] = useState<Record<PreferenceKey, boolean>>({ activityPublished: true, signupResult: true, beforeTeamUp: true, activityCancelled: true });
  return <Card><CardHeader><div className="flex items-center gap-2"><Bell className="size-4 text-muted-foreground" /><CardTitle>小程序提醒偏好</CardTitle></div><p className="text-sm text-muted-foreground">可分别关闭不需要的提醒。微信订阅权限接入后，偏好将同步保存。</p></CardHeader><CardContent className="divide-y">{preferences.map((preference) => { const Icon = preference.icon; return <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0" key={preference.key}><Icon className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{preference.label}</p><p className="text-xs text-muted-foreground">{preference.description}</p></div><Switch checked={values[preference.key]} onCheckedChange={(checked) => setValues((current) => ({ ...current, [preference.key]: checked }))} aria-label={preference.label} /></div>; })}</CardContent></Card>;
}
