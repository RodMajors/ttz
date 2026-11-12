import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10"><Button asChild variant="ghost"><Link href="/"><ArrowLeft />返回首页</Link></Button><div className="mt-8 flex items-end justify-between gap-4"><div><Badge variant="outline">CN · 伊森利恩</Badge><h1 className="mt-3 text-4xl font-semibold">团本进度</h1><p className="mt-2 text-muted-foreground">进度数据将接入 Warcraft Logs 公开资料。</p></div><Button asChild variant="outline"><a href="https://cn.warcraftlogs.com/server/id/569" target="_blank" rel="noreferrer">打开 WCL <ExternalLink /></a></Button></div><Card className="mt-8"><CardHeader><CardTitle>当前赛季</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">WCL 公会进度同步尚未接入，当前展示页为本地开发占位。</p></CardContent></Card></main>;
}
