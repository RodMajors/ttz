"use client";

import { useQuery } from "@tanstack/react-query";
import { contactSettingSchema, recruitmentSettingSchema } from "@ttz/contracts";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";

const defaultRecruitment = recruitmentSettingSchema.parse({});
const defaultContact = contactSettingSchema.parse({});

export function Recruitment() {
  const recruitment = useQuery({
    queryKey: ["public", "recruitment"],
    queryFn: () => apiRequest("/public/recruitment", recruitmentSettingSchema),
  });
  const contact = useQuery({
    queryKey: ["public", "contact"],
    queryFn: () => apiRequest("/public/contact", contactSettingSchema),
  });
  if (recruitment.isPending || contact.isPending)
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
        <Skeleton className="h-72 w-full" />
      </main>
    );
  const recruitmentData = recruitment.data ?? defaultRecruitment;
  const contactData = contact.data ?? defaultContact;
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <Button asChild variant="ghost">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" />
          返回首页
        </Link>
      </Button>
      <Badge variant="outline" className="mt-8">
        伊森利恩 · 部落
      </Badge>
      <h1 className="mt-3 text-4xl font-semibold">{recruitmentData.title}</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{recruitmentData.description}</p>
      {recruitment.isError || contact.isError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>部分招募信息不可用</AlertTitle>
          <AlertDescription>{recruitment.error?.message ?? contact.error?.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>当前招募</CardTitle>
            <CardDescription>岗位由管理员在运营配置中维护。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recruitmentData.needs.length ? (
              recruitmentData.needs.map((need) => (
                <div className="rounded-lg border p-3" key={need.role}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{need.role}</p>
                    {need.priority ? <Badge variant="secondary">{need.priority}</Badge> : null}
                  </div>
                  {need.description ? <p className="mt-1 text-sm text-muted-foreground">{need.description}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">目前未公布具体岗位，优秀玩家仍可联系 HR。</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>联系我们</CardTitle>
            <CardDescription>微信二维码配置后按需展示，不在代码仓保存敏感图片。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {contactData.email ? (
              <Button asChild variant="outline">
                <a href={`mailto:${contactData.email}`}>
                  <Mail data-icon="inline-start" />
                  {contactData.email}
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">邮箱尚未配置。</p>
            )}
            {recruitmentData.ngaUrl ? (
              <Button asChild variant="outline">
                <a href={recruitmentData.ngaUrl} target="_blank" rel="noreferrer">
                  NGA 招募帖 <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            ) : null}
            {contactData.wechatLabel ? <p className="text-sm">微信：{contactData.wechatLabel}</p> : null}
          </CardContent>
        </Card>
      </div>
      {recruitmentData.requirements.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>我们期待</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
              {recruitmentData.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
