"use client";

import { useQuery } from "@tanstack/react-query";
import { publicMemberProfileSchema } from "@ttz/contracts";
import { ArrowLeft, CircleAlert, Crown, UserRound } from "lucide-react";
import Link from "next/link";
import type { z } from "zod";
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";
import { getInitials } from "@/lib/utils";

type PublicMemberProfile = z.infer<typeof publicMemberProfileSchema>;

export function PublicMemberProfileScreen({ memberId }: { memberId: string }) {
  const profile = useQuery({
    queryKey: ["public-member-profile", memberId],
    queryFn: () => apiRequest(`/members/${encodeURIComponent(memberId)}/profile`, publicMemberProfileSchema),
  });

  if (profile.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>无法加载成员主页</AlertTitle>
        <AlertDescription>{profile.error.message}</AlertDescription>
      </Alert>
    );
  }

  return <ProfileContent profile={profile.data} />;
}

function ProfileContent({ profile }: { profile: PublicMemberProfile }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/activities">
          <ArrowLeft data-icon="inline-start" />
          返回活动
        </Link>
      </Button>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Avatar size="lg" className="size-16">
            <AvatarImage src={profile.avatar ?? undefined} alt="" />
            <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">TTZ 群昵称：{profile.guildNickname ?? "未设置"}</p>
            <p className="text-sm text-muted-foreground">微信名：{profile.wxNickname ?? "未设置"}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserRound />
            <CardTitle>角色列表</CardTitle>
          </div>
          <CardDescription>公开展示该成员当前启用的角色资料。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {profile.characters.length ? (
            profile.characters.map((character) => (
              <div key={character.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <GameIcon src={character.classIconUrl} alt="" className="size-10 rounded" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ClassAccent color={character.classColor}>
                      <span className="font-medium">{character.name}</span>
                    </ClassAccent>
                    {character.isMain ? (
                      <Badge variant="secondary">
                        <Crown data-icon="inline-start" />
                        主角色
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {character.realm} · {character.className}
                    {character.raceName ? ` · ${character.raceName}` : ""}
                    {character.activeSpecName ? ` · ${character.activeSpecName}` : ""}
                    {character.itemLevel ? ` · ${character.itemLevel} 装等` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserRound />
                </EmptyMedia>
                <EmptyTitle>暂无启用角色</EmptyTitle>
                <EmptyDescription>该成员尚未公开启用的游戏角色。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
