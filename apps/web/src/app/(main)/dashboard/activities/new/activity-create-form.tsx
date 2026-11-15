"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ActivityTypeCode, createActivitySchema, idSchema } from "@ttz/contracts";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

const createdSchema = z.object({ id: idSchema }).passthrough();
export function ActivityCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof createActivitySchema>) =>
      apiRequest("/activities", createdSchema, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activities"] });
      router.push("/dashboard/activities");
    },
    onError: (reason) => setError(reason.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const beginAt = new Date(String(form.get("beginAt")));
    const parsed = createActivitySchema.safeParse({
      name: form.get("name"),
      type: form.get("type") as ActivityTypeCode,
      description: form.get("description"),
      passphrase: form.get("passphrase") || null,
      beginAt: beginAt.toISOString(),
      teamUpAt: form.get("teamUpAt") ? new Date(String(form.get("teamUpAt"))).toISOString() : undefined,
      signupDeadline: new Date(String(form.get("signupDeadline"))).toISOString(),
      durationMinutes: Number(form.get("durationMinutes")),
      maxPlayers: Number(form.get("maxPlayers")),
      tankSlots: optionalNumber(form.get("tankSlots")),
      healerSlots: optionalNumber(form.get("healerSlots")),
      meleeSlots: optionalNumber(form.get("meleeSlots")),
      rangedSlots: optionalNumber(form.get("rangedSlots")),
      attendanceEnabled: form.get("attendanceEnabled") === "on",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查活动信息");
      return;
    }
    setError(undefined);
    mutation.mutate(parsed.data);
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/activities">
          <ArrowLeft data-icon="inline-start" />
          返回活动
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>创建活动</CardTitle>
          <CardDescription>活动先保存为草稿，发布后成员才可报名。集合时间默认比开始时间提前 20 分钟。</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">活动名称</FieldLabel>
                <Input id="name" name="name" required maxLength={64} placeholder="例如：M 团本开荒" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="type">活动类型</FieldLabel>
                  <Select name="type" defaultValue="raid_progress">
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="raid_progress">团本开荒</SelectItem>
                        <SelectItem value="raid_farm">团本 Farm</SelectItem>
                        <SelectItem value="mythic_plus_push">大秘境冲层</SelectItem>
                        <SelectItem value="mythic_plus_vault">大秘境低保</SelectItem>
                        <SelectItem value="casual">休闲活动</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="maxPlayers">人数上限</FieldLabel>
                  <Input id="maxPlayers" name="maxPlayers" type="number" min={1} max={100} defaultValue={20} required />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="beginAt">开始时间</FieldLabel>
                  <Input id="beginAt" name="beginAt" type="datetime-local" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signupDeadline">报名截止</FieldLabel>
                  <Input id="signupDeadline" name="signupDeadline" type="datetime-local" required />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="teamUpAt">集合时间（可选）</FieldLabel>
                <Input id="teamUpAt" name="teamUpAt" type="datetime-local" />
                <FieldDescription>不填写时，服务端默认设置为开始前 20 分钟。</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="durationMinutes">持续时间</FieldLabel>
                <Select name="durationMinutes" defaultValue="120">
                  <SelectTrigger id="durationMinutes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="60">1 小时</SelectItem>
                      <SelectItem value="90">1.5 小时</SelectItem>
                      <SelectItem value="120">2 小时</SelectItem>
                      <SelectItem value="180">3 小时</SelectItem>
                      <SelectItem value="240">4 小时</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="tankSlots">坦克</FieldLabel>
                  <Input id="tankSlots" name="tankSlots" type="number" min={0} max={100} defaultValue={2} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="healerSlots">治疗</FieldLabel>
                  <Input id="healerSlots" name="healerSlots" type="number" min={0} max={100} defaultValue={4} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="meleeSlots">近战</FieldLabel>
                  <Input id="meleeSlots" name="meleeSlots" type="number" min={0} max={100} defaultValue={7} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="rangedSlots">远程</FieldLabel>
                  <Input id="rangedSlots" name="rangedSlots" type="number" min={0} max={100} defaultValue={7} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="passphrase">进组暗号 / 语音频道</FieldLabel>
                <Input id="passphrase" name="passphrase" maxLength={255} />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">说明</FieldLabel>
                <Textarea id="description" name="description" maxLength={10000} placeholder="活动要求、集合说明等" />
                <FieldDescription>站位和团本准备事项不在本期活动模型中，后续由模板功能承载。</FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="attendanceEnabled" name="attendanceEnabled" defaultChecked />
                <FieldLabel htmlFor="attendanceEnabled">计入团本开荒出勤统计</FieldLabel>
              </Field>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>无法创建活动</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-5 justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner data-icon="inline-start" /> : <CalendarPlus data-icon="inline-start" />}
              保存草稿
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}
