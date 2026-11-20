"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const PositioningBoard = dynamic(() => import("./positioning-board").then((module) => module.PositioningBoard), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl border bg-muted" />,
});

export function PositioningBoardLoader(props: ComponentProps<typeof PositioningBoard>) {
  return <PositioningBoard {...props} />;
}
