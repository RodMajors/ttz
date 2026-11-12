import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeaturePreview } from "../_components/feature-preview";

export const metadata: Metadata = { title: "活动 | TTZ 公会站" };

export default function ActivitiesPage() {
  return <FeaturePreview icon={CalendarDays} title="活动" description="浏览活动状态并维护自己的活动。任何审核通过的成员都可以创建活动；活动负责人只能编辑自己创建的活动，管理员可管理全部活动。">
    <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>活动列表</CardTitle><p className="mt-1 text-sm text-muted-foreground">当前为本地空状态，连接 API 后会显示真实活动。</p></div><Button asChild><Link href="/dashboard/activities/new"><Plus />创建活动</Link></Button></CardHeader><CardContent><div className="grid min-h-48 place-items-center rounded-xl border border-dashed p-8 text-center"><div><CalendarDays className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">还没有活动数据</p><p className="mt-1 text-sm text-muted-foreground">活动类型包含团本开荒、团本 Farm、大秘境和休闲活动。</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">报名中</Badge><Badge variant="secondary">已截止</Badge><Badge variant="secondary">已结束</Badge></div></CardContent></Card>
  </FeaturePreview>;
}
