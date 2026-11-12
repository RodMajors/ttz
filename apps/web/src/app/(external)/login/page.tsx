import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return <main className="grid min-h-screen place-items-center px-6 py-10"><Card className="w-full max-w-md"><CardHeader><Button asChild variant="ghost" className="w-fit px-0"><Link href="/"><ArrowLeft />返回首页</Link></Button><CardTitle className="pt-4">微信扫码登录</CardTitle></CardHeader><CardContent><div className="grid aspect-square place-items-center rounded-xl border border-dashed bg-muted/30"><QrCode className="size-16 text-muted-foreground" /></div><p className="mt-4 text-center text-sm leading-6 text-muted-foreground">扫码登录将在小程序 AppID 配置后启用。新用户需提交微信名和 TTZ 群昵称，待管理员审核。</p></CardContent></Card></main>;
}
