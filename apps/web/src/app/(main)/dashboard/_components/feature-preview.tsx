import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function FeaturePreview({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl border bg-card"><Icon className="size-5" /></div><div><p className="text-sm text-muted-foreground">TTZ 公会工作台</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div></div>
      {children ?? <Card><CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center"><Construction className="size-8 text-muted-foreground" /><div><p className="font-medium">页面结构已就绪</p><p className="mt-1 text-sm text-muted-foreground">等待接入 NestJS API 与 MySQL 数据。</p></div></CardContent></Card>}
    </div>
  );
}
