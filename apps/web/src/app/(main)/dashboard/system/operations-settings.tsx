"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contactSettingSchema,
  guildProfileSchema,
  recruitmentSettingSchema,
  toolLinksSettingSchema,
} from "@ttz/contracts";
import { CircleAlert, Save, Settings2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

export function OperationsSettings() {
  const guild = useQuery({
    queryKey: ["site-settings", "guild_profile"],
    queryFn: () => apiRequest("/site-settings/guild_profile", guildProfileSchema),
  });
  const recruitment = useQuery({
    queryKey: ["site-settings", "recruitment"],
    queryFn: () => apiRequest("/site-settings/recruitment", recruitmentSettingSchema),
  });
  const contact = useQuery({
    queryKey: ["site-settings", "contact"],
    queryFn: () => apiRequest("/site-settings/contact", contactSettingSchema),
  });
  const tools = useQuery({
    queryKey: ["site-settings", "tool_links"],
    queryFn: () => apiRequest("/site-settings/tool_links", toolLinksSettingSchema),
  });
  const queries = [guild, recruitment, contact, tools];
  if (queries.some((query) => query.isPending)) return <Skeleton className="h-[36rem] w-full" />;
  const error = queries.find((query) => query.isError)?.error;
  if (error)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>系统设置不可用</AlertTitle>
        <AlertDescription>{error.message}。此页面仅管理员可访问。</AlertDescription>
      </Alert>
    );
  if (!guild.data || !recruitment.data || !contact.data || !tools.data) return null;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">运营与公开内容</p>
        <h1 className="text-3xl font-semibold tracking-tight">系统设置</h1>
        <p className="mt-2 text-sm text-muted-foreground">身份组不授予权限；工具链接统一保存在站点配置中。</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <GuildForm value={guild.data} />
        <RecruitmentForm value={recruitment.data} />
        <ContactForm value={contact.data} />
        <ToolLinksForm value={tools.data} />
      </div>
    </div>
  );
}

function GuildForm({ value }: { value: z.infer<typeof guildProfileSchema> }) {
  return (
    <SettingForm
      settingKey="guild_profile"
      schema={guildProfileSchema}
      title="公会主页"
      description="公开首页的名称、口号、介绍与固定活动时间。"
      initial={value}
      build={(data) => ({
        name: string(data, "name"),
        tagline: string(data, "tagline"),
        description: string(data, "description"),
        realm: string(data, "realm"),
        faction: string(data, "faction"),
        schedule: lines(data, "schedule"),
        highlights: lines(data, "highlights"),
      })}
    >
      {(current) => (
        <>
          <Field>
            <FieldLabel htmlFor="guild-name">公会名称</FieldLabel>
            <Input id="guild-name" name="name" defaultValue={current.name} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="tagline">主页口号</FieldLabel>
            <Input id="tagline" name="tagline" defaultValue={current.tagline} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="guild-description">公会介绍</FieldLabel>
            <Textarea id="guild-description" name="description" defaultValue={current.description} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="realm">服务器</FieldLabel>
              <Input id="realm" name="realm" defaultValue={current.realm} />
            </Field>
            <Field>
              <FieldLabel htmlFor="faction">阵营</FieldLabel>
              <Input id="faction" name="faction" defaultValue={current.faction} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="schedule">固定活动时间</FieldLabel>
            <Textarea id="schedule" name="schedule" defaultValue={current.schedule.join("\n")} />
            <FieldDescription>每行一个时间安排。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="highlights">公会特点</FieldLabel>
            <Textarea id="highlights" name="highlights" defaultValue={current.highlights.join("\n")} />
          </Field>
        </>
      )}
    </SettingForm>
  );
}
function RecruitmentForm({ value }: { value: z.infer<typeof recruitmentSettingSchema> }) {
  return (
    <SettingForm
      settingKey="recruitment"
      schema={recruitmentSettingSchema}
      title="招募内容"
      description="维护招募岗位、要求和 NGA 招募帖。"
      initial={value}
      build={(data) => ({
        title: string(data, "title"),
        description: string(data, "description"),
        needs: lines(data, "needs").map((line) => {
          const [role, priority, description] = line.split("|").map((part) => part.trim());
          return { role: role ?? "", priority: priority || undefined, description: description || undefined };
        }),
        requirements: lines(data, "requirements"),
        ngaUrl: nullableString(data, "ngaUrl"),
      })}
    >
      {(current) => (
        <>
          <Field>
            <FieldLabel htmlFor="recruit-title">标题</FieldLabel>
            <Input id="recruit-title" name="title" defaultValue={current.title} />
          </Field>
          <Field>
            <FieldLabel htmlFor="recruit-description">招募介绍</FieldLabel>
            <Textarea id="recruit-description" name="description" defaultValue={current.description} />
          </Field>
          <Field>
            <FieldLabel htmlFor="needs">招募岗位</FieldLabel>
            <Textarea
              id="needs"
              name="needs"
              defaultValue={current.needs
                .map((item) => [item.role, item.priority, item.description].filter(Boolean).join(" | "))
                .join("\n")}
            />
            <FieldDescription>每行：岗位 | 优先级 | 说明。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="requirements">加入要求</FieldLabel>
            <Textarea id="requirements" name="requirements" defaultValue={current.requirements.join("\n")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ngaUrl">NGA 招募帖</FieldLabel>
            <Input id="ngaUrl" name="ngaUrl" type="url" defaultValue={current.ngaUrl ?? ""} />
          </Field>
        </>
      )}
    </SettingForm>
  );
}
function ContactForm({ value }: { value: z.infer<typeof contactSettingSchema> }) {
  return (
    <SettingForm
      settingKey="contact"
      schema={contactSettingSchema}
      title="联系方式"
      description="公开邮箱、HR 微信说明与二维码 URL。"
      initial={value}
      build={(data) => ({
        email: nullableString(data, "email"),
        wechatLabel: nullableString(data, "wechatLabel"),
        wechatQrUrl: nullableString(data, "wechatQrUrl"),
      })}
    >
      {(current) => (
        <>
          <Field>
            <FieldLabel htmlFor="contact-email">公开邮箱</FieldLabel>
            <Input id="contact-email" name="email" type="email" defaultValue={current.email ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="wechatLabel">HR 微信说明</FieldLabel>
            <Input id="wechatLabel" name="wechatLabel" defaultValue={current.wechatLabel ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="wechatQrUrl">微信二维码 URL</FieldLabel>
            <Input id="wechatQrUrl" name="wechatQrUrl" type="url" defaultValue={current.wechatQrUrl ?? ""} />
            <FieldDescription>二维码图片应上传到受控的 COS，再保存公开 URL。</FieldDescription>
          </Field>
        </>
      )}
    </SettingForm>
  );
}
function ToolLinksForm({ value }: { value: z.infer<typeof toolLinksSettingSchema> }) {
  return (
    <SettingForm
      settingKey="tool_links"
      schema={toolLinksSettingSchema}
      title="常用工具"
      description="统一维护 WCL、Wipefest、Analyzer 等外部链接。"
      initial={value}
      build={(data) => ({
        links: lines(data, "links").map((line) => {
          const [name, url, description] = line.split("|").map((part) => part.trim());
          return { name: name ?? "", url: url ?? "", description: description || undefined };
        }),
      })}
    >
      {(current) => (
        <Field>
          <FieldLabel htmlFor="tool-links">工具链接</FieldLabel>
          <Textarea
            id="tool-links"
            name="links"
            className="min-h-52"
            defaultValue={current.links
              .map((item) => [item.name, item.url, item.description].filter(Boolean).join(" | "))
              .join("\n")}
          />
          <FieldDescription>每行：名称 | URL | 说明。</FieldDescription>
        </Field>
      )}
    </SettingForm>
  );
}
function SettingForm<T>({
  settingKey,
  schema,
  title,
  description,
  initial,
  build,
  children,
}: {
  settingKey: string;
  schema: z.ZodType<T>;
  title: string;
  description: string;
  initial: T;
  build: (data: FormData) => unknown;
  children: (initial: T) => React.ReactNode;
}) {
  const client = useQueryClient();
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (body: T) =>
      apiRequest(`/site-settings/${settingKey}`, schema, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (data) => client.setQueryData(["site-settings", settingKey], data),
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(build(new FormData(event.currentTarget)));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请检查配置内容");
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent>
          <FieldGroup>
            {children(initial)}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>保存失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
function string(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
function nullableString(data: FormData, key: string) {
  return string(data, key) || null;
}
function lines(data: FormData, key: string) {
  return string(data, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
