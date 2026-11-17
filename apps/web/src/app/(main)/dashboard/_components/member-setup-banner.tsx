"use client";

import { useQuery } from "@tanstack/react-query";
import { characterListSchema, wclLinkStatusSchema } from "@ttz/contracts";
import { Link2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

export function MemberSetupBanner() {
  const characters = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiRequest("/characters", characterListSchema),
  });
  const wcl = useQuery({
    queryKey: ["wcl-link"],
    queryFn: () => apiRequest("/auth/wcl/status", wclLinkStatusSchema),
  });
  if (characters.isPending || wcl.isPending || characters.isError || wcl.isError) return null;
  if (characters.data.length > 0 && wcl.data.linked) return null;
  return (
    <div className="px-4 pt-4 md:px-6">
      <Alert>
        <TriangleAlert />
        <AlertTitle>请先完善游戏角色资料</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {!wcl.data.linked ? "尚未关联 WCL 账号。" : "WCL 账号已关联。"}
            {!characters.data.length ? " 当前还没有可用于报名的角色。" : " 已有角色，可以继续验证或管理。"}
          </span>
          <Button asChild size="sm">
            <Link href="/dashboard/profile">
              <Link2 data-icon="inline-start" />
              去绑定角色
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
