"use client";

import { useQuery } from "@tanstack/react-query";
import { guildProfileSchema } from "@ttz/contracts";
import { ArrowRight, Mail, ShieldCheck, Swords, Users } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { apiRequest } from "@/lib/api-client";

const defaultGuild = guildProfileSchema.parse({});

export function PublicHome() {
  const guild = useQuery({
    queryKey: ["public", "guild"],
    queryFn: () => apiRequest("/public/guild", guildProfileSchema),
  });
  const data = guild.data ?? defaultGuild;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b pb-5">
          <Link href="/" className="flex items-center gap-3" aria-label="TTZ 公会站首页">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
              TTZ
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide">THE TWILIGHT ZONE</span>
              <span className="block text-xs text-muted-foreground">
                {data.realm} · {data.faction}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/login">
                进入工作台 <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </header>
        <section className="flex flex-1 items-center py-14 lg:py-20">
          <div className="max-w-4xl">
            {guild.isPending ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <>
                <Badge variant="outline" className="mb-5 rounded-full px-3 py-1">
                  {data.name}
                </Badge>
                <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-7xl">{data.tagline}</h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{data.description}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/recruitment">
                      查看招募需求 <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">微信扫码登录</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
        {guild.isError ? (
          <Alert variant="destructive">
            <AlertTitle>公会资料暂时不可用</AlertTitle>
            <AlertDescription>{guild.error?.message}</AlertDescription>
          </Alert>
        ) : null}
        <section className="grid gap-4 border-t py-10 md:grid-cols-3">
          <Feature icon={Swords} title="清晰的开荒节奏" text="活动创建、报名、最终名单与出勤形成完整闭环。" />
          <Feature icon={Users} title="稳定的团队生态" text="成员维护主角色和小号，活动负责人管理自己的活动。" />
          <Feature icon={ShieldCheck} title="可信的出勤数据" text="人工确认为准，WCL 公开报告只作为辅助证据。" />
        </section>
        <footer className="flex flex-col gap-3 border-t py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{APP_CONFIG.copyright}</span>
          <Link href="/recruitment" className="inline-flex items-center gap-2 hover:text-foreground">
            <Mail />
            查看 HR 联系方式
          </Link>
        </footer>
      </div>
    </main>
  );
}
function Feature({ icon: Icon, title, text }: { icon: typeof Swords; title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Icon />
      <h2 className="mt-4 font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
