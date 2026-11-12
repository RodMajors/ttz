"use client";

import { useQuery } from "@tanstack/react-query";
import { authUserSchema } from "@ttz/contracts";
import { CircleAlert, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiRequest } from "@/lib/api-client";

export function AuthBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest("/auth/me", authUserSchema),
    retry: false,
  });
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.code === "AUTH_REQUIRED") {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    } else if (query.data && !query.data.isApproved) {
      router.replace("/member-status");
    }
  }, [pathname, query.data, query.error, router]);
  if (query.isError && (!(query.error instanceof ApiError) || query.error.code !== "AUTH_REQUIRED")) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <CircleAlert />
          <AlertTitle>无法验证成员身份</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{query.error.message}</span>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw data-icon="inline-start" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!query.data?.isApproved) {
    return (
      <div className="grid min-h-screen place-items-center" role="status">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          正在验证成员身份
        </div>
      </div>
    );
  }
  return children;
}
