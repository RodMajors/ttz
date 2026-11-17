"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authUserSchema, memberProfileSchema } from "@ttz/contracts";
import { Clock3, LogOut, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiRequest } from "@/lib/api-client";

const loggedOutSchema = z.object({ loggedOut: z.boolean() });
export function MemberStatus() {
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState<string>();
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest("/auth/me", authUserSchema),
    retry: false,
  });
  const profile = useMutation({
    mutationFn: (body: z.infer<typeof memberProfileSchema>) =>
      apiRequest("/auth/profile", authUserSchema, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (user) => {
      client.setQueryData(["auth", "me"], user);
      if (user.isApproved) router.replace("/dashboard");
    },
    onError: (reason) => setError(reason.message),
  });
  if (query.isPending)
    return (
      <main className="grid min-h-screen place-items-center">
        <Spinner />
      </main>
    );
  if (query.error instanceof ApiError && query.error.code === "AUTH_REQUIRED") {
    router.replace("/login");
    return null;
  }
  if (!query.data) return null;
  if (query.data.isApproved) {
    router.replace("/dashboard");
    return null;
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = memberProfileSchema.safeParse({
      name: data.get("name") || null,
      guildNickname: data.get("guildNickname"),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "请完善成员资料");
    setError(undefined);
    profile.mutate(parsed.data);
  }
  async function logout() {
    await apiRequest("/auth/logout", loggedOutSchema, { method: "POST" });
    client.clear();
    router.replace("/login");
  }
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            {query.data.approvalStatus === "REJECTED"
              ? "成员申请未通过"
              : query.data.profileComplete
                ? "成员申请审核中"
                : "完善成员资料"}
          </CardTitle>
          <CardDescription>请确认 TTZ 群昵称和站内显示名；微信名来自登录身份，只读展示。</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="guildNickname">TTZ 群昵称</FieldLabel>
                <Input id="guildNickname" name="guildNickname" defaultValue={query.data.guildNickname ?? ""} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="name">站内显示名（可选）</FieldLabel>
                <Input id="name" name="name" defaultValue={query.data.name === "TTZ 成员" ? "" : query.data.name} />
              </Field>
              <Field>
                <FieldLabel htmlFor="wxNickname">微信名</FieldLabel>
                <Input id="wxNickname" value={query.data.wxNickname ?? "未获取"} disabled readOnly />
              </Field>
              <Alert>
                {query.data.profileComplete ? <Clock3 /> : <UserRoundCheck />}
                <AlertTitle>{query.data.profileComplete ? "等待管理员审核" : "资料尚未完成"}</AlertTitle>
                <AlertDescription>资料可在审核前继续修改；身份组只作为当前标签，不授予权限。</AlertDescription>
              </Alert>
              {query.data.approvalStatus === "REJECTED" ? (
                <Alert variant="destructive">
                  <AlertTitle>审核未通过</AlertTitle>
                  <AlertDescription>{query.data.rejectReason ?? "请修改资料后重新提交审核。"}</AlertDescription>
                </Alert>
              ) : null}
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>无法保存</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-5 justify-between">
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              <LogOut data-icon="inline-start" />
              退出登录
            </Button>
            <Button type="submit" disabled={profile.isPending}>
              {profile.isPending ? <Spinner data-icon="inline-start" /> : null}保存资料
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
