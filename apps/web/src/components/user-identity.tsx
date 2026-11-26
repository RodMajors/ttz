"use client";

import { useQuery } from "@tanstack/react-query";
import { type PublicMemberSummary, publicMemberProfileSchema } from "@ttz/contracts";
import Link from "next/link";
import type { z } from "zod";
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";
import { getInitials } from "@/lib/utils";

type PublicMemberProfile = z.infer<typeof publicMemberProfileSchema>;

export function UserIdentity({ user, className }: { user: PublicMemberSummary; className?: string }) {
  const profile = useQuery({
    queryKey: ["public-member-profile", user.id],
    queryFn: () => apiRequest(`/members/${encodeURIComponent(user.id)}/profile`, publicMemberProfileSchema),
    enabled: false,
    staleTime: 5 * 60_000,
  });

  return (
    <HoverCard
      openDelay={50}
      closeDelay={50}
      onOpenChange={(open) => {
        if (open && !profile.data && !profile.isFetching) void profile.refetch();
      }}
    >
      <HoverCardTrigger asChild>
        <Link
          href={`/dashboard/members/${encodeURIComponent(user.id)}`}
          className={`inline-flex min-w-0 items-center gap-2 rounded-md hover:underline ${className ?? ""}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Avatar size="sm">
            <AvatarImage src={user.avatar ?? undefined} alt="" />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{user.name}</span>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" onClick={(event) => event.stopPropagation()}>
        <MemberPreview user={user} profile={profile.data} isLoading={profile.isFetching} error={profile.error} />
      </HoverCardContent>
    </HoverCard>
  );
}

function MemberPreview({
  user,
  profile,
  isLoading,
  error,
}: {
  user: PublicMemberSummary;
  profile?: PublicMemberProfile;
  isLoading: boolean;
  error: Error | null;
}) {
  const main = profile?.mainCharacter ?? user.mainCharacter;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar className="w-16 h-16 size-16">
          <AvatarImage src={profile?.avatar ?? user.avatar ?? undefined} alt="" />
          <AvatarFallback>{getInitials(profile?.name ?? user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile?.name ?? user.name}</p>
          <p className="truncate text-xs text-muted-foreground">微信名：{profile?.wxNickname ?? "加载中…"}</p>
          <p className="truncate text-xs text-muted-foreground">群昵称：{profile?.guildNickname ?? "加载中…"}</p>
        </div>
      </div>
      {isLoading && !profile ? <Skeleton className="h-16 w-full" /> : null}
      {error && !profile ? <p className="text-xs text-muted-foreground">暂时无法加载详细资料</p> : null}
      {main ? (
        <div className="rounded-md border p-2.5">
          <p className="mb-2 text-xs text-muted-foreground">主角色</p>
          <div className="flex items-center gap-2">
            <GameIcon src={main.classIconUrl} alt="" className="size-8 rounded" />
            <div className="min-w-0">
              <p className="truncate font-medium">
                <ClassAccent color={main.classColor}>{main.name}</ClassAccent>
                <span className="text-muted-foreground"> - {main.realm}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {main.className} · {main.raceName ?? "种族未知"} · 装等 {main.itemLevel ?? "—"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">尚未设置主角色</p>
      )}
      <Link
        href={`/dashboard/members/${encodeURIComponent(user.id)}`}
        className="text-xs text-primary hover:underline text-right"
      >
        查看成员主页
      </Link>
    </div>
  );
}
