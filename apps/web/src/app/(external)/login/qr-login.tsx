"use client";

import { authUserSchema, qrSessionSchema, qrSessionStatusSchema } from "@ttz/contracts";
import { ArrowLeft, CheckCircle2, QrCode, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/api-client";

type LoginStatus = "CREATING" | "PENDING" | "SCANNED" | "CONFIRMED" | "EXPIRED" | "CANCELLED" | "ERROR";

const statusCopy: Record<LoginStatus, { title: string; description: string }> = {
  CREATING: { title: "正在创建安全会话", description: "二维码仅包含短期登录编号和一次性随机值。" },
  PENDING: { title: "等待扫码", description: "打开 TTZ 小程序，在首页选择“扫描网页二维码”。" },
  SCANNED: { title: "请在小程序确认", description: "已识别成员身份，确认前不会登录此浏览器。" },
  CONFIRMED: { title: "登录成功", description: "正在进入 TTZ 工作台。" },
  EXPIRED: { title: "二维码已过期", description: "登录二维码有效期较短，请重新生成。" },
  CANCELLED: { title: "已在小程序取消", description: "本次登录不会建立浏览器会话。" },
  ERROR: { title: "无法创建登录会话", description: "请检查 API 服务和网络连接后重试。" },
};

export function QrLogin() {
  const router = useRouter();
  const [status, setStatus] = useState<LoginStatus>("CREATING");
  const [qrImage, setQrImage] = useState<string>();
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<Awaited<ReturnType<typeof createSession>>>();

  const start = useCallback(async () => {
    setStatus("CREATING");
    setError(undefined);
    setSession(undefined);
    setQrImage(undefined);
    try {
      const next = await createSession();
      const payload = `ttz-miniapp://login?loginNo=${encodeURIComponent(next.loginNo)}&nonce=${encodeURIComponent(next.nonce)}`;
      const image = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width: 360 });
      setSession(next);
      setQrImage(image);
      setStatus("PENDING");
    } catch (reason) {
      setStatus("ERROR");
      setError(reason instanceof Error ? reason.message : "创建登录会话失败");
    }
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (!session || !["PENDING", "SCANNED"].includes(status)) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiRequest(
          `/auth/qr-sessions/${encodeURIComponent(session.loginNo)}`,
          qrSessionStatusSchema,
          {
            headers: { "x-ttz-browser-secret": session.browserSecret },
          },
        );
        setStatus(result.status);
        if (result.status === "CONFIRMED") {
          const user = await apiRequest("/auth/me", authUserSchema);
          router.replace(user.isApproved ? "/dashboard" : "/member-status");
          router.refresh();
        }
      } catch (reason) {
        setStatus("ERROR");
        setError(reason instanceof Error ? reason.message : "检查登录状态失败");
      }
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, [router, session, status]);

  const copy = statusCopy[status];
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button asChild variant="ghost" className="w-fit px-0">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              返回首页
            </Link>
          </Button>
          <CardTitle className="pt-4">微信扫码登录</CardTitle>
          <CardDescription>浏览器不会接触微信 openid、session_key 或小程序长期凭证。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border bg-background p-4">
            {qrImage && ["PENDING", "SCANNED"].includes(status) ? (
              // biome-ignore lint/performance/noImgElement: generated data URLs cannot be optimized by Next Image.
              <img className="size-full" src={qrImage} alt="TTZ 小程序登录二维码" />
            ) : status === "CREATING" ? (
              <Skeleton className="size-full rounded-lg" />
            ) : status === "CONFIRMED" ? (
              <CheckCircle2 className="size-16 text-primary" />
            ) : (
              <QrCode className="size-16 text-muted-foreground" />
            )}
          </div>
          <Alert variant={status === "ERROR" ? "destructive" : "default"}>
            {status === "CREATING" ? <Spinner /> : status === "SCANNED" ? <Smartphone /> : <ShieldCheck />}
            <AlertTitle>{copy.title}</AlertTitle>
            <AlertDescription>{error ?? copy.description}</AlertDescription>
          </Alert>
        </CardContent>
        {["EXPIRED", "CANCELLED", "ERROR"].includes(status) ? (
          <CardFooter className="justify-end">
            <Button type="button" onClick={() => void start()}>
              <RefreshCw data-icon="inline-start" />
              重新生成
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </main>
  );
}

function createSession() {
  return apiRequest("/auth/qr-sessions", qrSessionSchema, { method: "POST" });
}
