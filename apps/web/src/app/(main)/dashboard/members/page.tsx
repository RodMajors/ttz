import type { Metadata } from "next";
import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeaturePreview } from "../_components/feature-preview";

export const metadata: Metadata = { title: "成员 | TTZ 公会站" };

export default function MembersPage() {
  return <FeaturePreview icon={Users} title="成员" description="成员、角色与身份组统一管理。所有审核通过的成员可以查看成员资料与出勤；身份组只作为标签，不授予权限。">
    <Card><CardHeader><CardTitle>成员列表</CardTitle><p className="text-sm text-muted-foreground">审核中的申请会在成员审核队列中处理。</p></CardHeader><CardContent><div className="grid min-h-48 place-items-center rounded-xl border border-dashed p-8 text-center"><div><Users className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">尚未连接成员 API</p><p className="mt-1 text-sm text-muted-foreground">真实成员将从微信登录后创建的 users 记录读取。</p></div></div></CardContent></Card>
  </FeaturePreview>;
}
