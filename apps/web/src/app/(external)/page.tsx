import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Mail, ShieldCheck, Swords, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";

export const metadata: Metadata = { title: APP_CONFIG.meta.title, description: APP_CONFIG.meta.description };

const activities = [
  { day: "周四", title: "M 团本开荒", detail: "21:00 · 伊森利恩 · 20 人上限", status: "报名中" },
  { day: "周一", title: "团本开荒", detail: "21:00 · 集合时间默认提前 20 分钟", status: "即将开放" },
  { day: "周二", title: "大秘境低保", detail: "21:00 · 需要坦克 / 治疗 / DPS", status: "即将开放" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b pb-5">
          <Link href="/" className="flex items-center gap-3" aria-label="返回 TTZ 公会站首页">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">TTZ</span>
            <span><span className="block text-sm font-semibold tracking-wide">THE TWILIGHT ZONE</span><span className="block text-xs text-muted-foreground">伊森利恩 · 部落</span></span>
          </Link>
          <div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link href="/progress">团本进度</Link></Button><Button asChild size="sm"><Link href="/dashboard/default">进入工作台 <ArrowRight /></Link></Button></div>
        </header>
        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="max-w-2xl"><Badge variant="outline" className="mb-5 rounded-full px-3 py-1">半休闲 · 重效率 · 重体验</Badge><h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-7xl">用有限的时间，打出值得记住的开荒。</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">The Twilight Zone 是伊森利恩的部落公会。我们保持轻松活跃的社区氛围，也认真对待每一次团本准备、配合与复盘。</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/recruitment">查看招募需求 <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/login">微信扫码登录</Link></Button></div><div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t pt-6"><div><p className="text-2xl font-semibold">21:00</p><p className="text-xs text-muted-foreground">固定开组时间</p></div><div><p className="text-2xl font-semibold">M 团本</p><p className="text-xs text-muted-foreground">核心开荒活动</p></div><div><p className="text-2xl font-semibold">CN 569</p><p className="text-xs text-muted-foreground">伊森利恩</p></div></div></div>
          <Card className="overflow-hidden border-foreground/10 bg-card/80 shadow-2xl shadow-foreground/5"><CardHeader className="border-b bg-muted/30"><div className="flex items-center justify-between"><CardTitle>近期活动</CardTitle><CalendarDays className="size-5 text-muted-foreground" /></div><p className="text-sm text-muted-foreground">活动、报名和名单都在工作台中完成。</p></CardHeader><CardContent className="divide-y p-0">{activities.map((activity) => <div className="flex items-start gap-4 p-5" key={activity.title + activity.day}><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold">{activity.day}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="font-medium">{activity.title}</p><Badge variant="secondary">{activity.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p></div></div>)}</CardContent></Card>
        </section>
        <section className="grid gap-4 border-t py-10 md:grid-cols-3"><Feature icon={Swords} title="清晰的开荒节奏" text="围绕活动创建、报名、最终名单和出勤记录，减少群聊里的重复确认。" /><Feature icon={Users} title="稳定的团队生态" text="活动负责人管理自己的活动，成员保留主角色和备选角色选择。" /><Feature icon={ShieldCheck} title="可追溯的公会数据" text="WCL 公开报告作为辅助证据，正常出勤和迟到都计入有效出勤。" /></section>
        <footer className="flex flex-col gap-3 border-t py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>{APP_CONFIG.copyright}</span><span className="inline-flex items-center gap-2"><Mail className="size-4" /> HR 联系方式将在招募页中展示</span></footer>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Swords; title: string; text: string }) {
  return <div className="rounded-xl border bg-card p-5"><Icon className="size-5" /><h2 className="mt-4 font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}
