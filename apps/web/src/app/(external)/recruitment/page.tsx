import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecruitmentPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10"><Button asChild variant="ghost"><Link href="/"><ArrowLeft />返回首页</Link></Button><Badge variant="outline" className="mt-8">伊森利恩 · 部落</Badge><h1 className="mt-3 text-4xl font-semibold">加入 The Twilight Zone</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">我们追求效率与体验的平衡，重视稳定出勤、团队协作和清晰沟通。招募岗位与申请方式将在站点配置完成后更新。</p><div className="mt-8 grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>团队节奏</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">每周四 / 一 / 二 21:00–23:00。开荒期请提前沟通无法出勤的场次。</CardContent></Card><Card><CardHeader><CardTitle>联系我们</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">公会邮箱与 HR 微信二维码待管理员配置。二维码设置为点击后展示。</CardContent></Card></div></main>;
}
