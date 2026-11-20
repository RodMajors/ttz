"use client";

import { useQuery } from "@tanstack/react-query";
import { raidEpicTimelineSchema, type raidProgressPlanListSchema } from "@ttz/contracts";
import { Check, CheckCheck, CircleCheck, CircleCheckBig, CircleDot, Swords } from "lucide-react";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";

type Plan = z.infer<typeof raidProgressPlanListSchema>[number];
type EpicProgressTimelineProps = { plan?: Plan | null; className?: string };

export function EpicProgressTimeline({ plan, className }: EpicProgressTimelineProps) {
  const query = useQuery({
    queryKey: ["raid-progress", "epic-timeline"],
    queryFn: () => apiRequest("/raid-progress/epic-timeline", raidEpicTimelineSchema),
    enabled: plan === undefined,
    refetchInterval: 30_000,
  });
  const current = plan === undefined ? query.data : plan;

  if (plan === undefined && query.isPending) return <Skeleton className="h-36 w-full" />;
  if (!current) return null;

  const defeatedCount = current.bosses.filter((boss) => boss.status === "DEFEATED").length;
  const progressing = current.bosses.find((boss) => boss.status === "PROGRESSING");
  const background = current.raidBackground ?? current.raidIcon;

  return (
    <div className={className + `border-none select-none`}>
      <div className="relative isolate overflow-hidden">
        {background ? (
          <img
            src={background}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
            className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-64 object-cover opacity-10 blur-[1px]"
          />
        ) : null}
      </div>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <ol className="flex w-full min-w-200 items-start justify-center">
            {current.bosses.map((boss, index) => {
              const defeated = boss.status === "DEFEATED";
              const active = boss.status === "PROGRESSING";
              const image = boss.icon;
              const imageClass = ["h-full w-full object-cover", !defeated && !active ? "grayscale opacity-35" : ""]
                .filter(Boolean)
                .join(" ");
              const portraitClass = "relative flex w-30 shrink-0 items-center justify-center ";
              return (
                <li key={boss.id} className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <div className="flex h-14 w-full items-center">
                    {index > 0 ? (
                      <div className={`h-0.5 flex-1 ${defeated ? "bg-primary" : "bg-border"}`} />
                    ) : (
                      <div className={`h-0.5 flex-1 `} />
                    )}
                    <div className={portraitClass}>
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                          className={imageClass}
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                      )}
                      {defeated ? (
                        <span className="absolute right-3/7 top-1/4 flex items-center justify-center rounded-full  bg-green-600/90">
                          <Check className="size-7" />
                        </span>
                      ) : null}
                      {active ? (
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-background/90 py-0.5 text-[11px] font-semibold text-foreground">
                          <Swords className="size-4" />
                          开荒中
                        </span>
                      ) : null}
                    </div>
                    {index < current.bosses.length - 1 ? (
                      <div className={`h-0.5 flex-1 ${defeated ? "bg-primary" : "bg-border"}`} />
                    ) : (
                      <div className={`h-0.5 flex-1`} />
                    )}
                  </div>
                  <span
                    className={
                      "mt-2 px-1 leading-5  " +
                      (defeated || active ? "font-bold text-foreground" : "text-muted-foreground")
                    }
                  >
                    {boss.name}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </div>
  );
}
