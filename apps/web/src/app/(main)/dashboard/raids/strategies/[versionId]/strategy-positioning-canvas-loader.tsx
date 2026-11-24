"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const StrategyPositioningCanvas = dynamic(
  () => import("./strategy-positioning-canvas").then((module) => module.StrategyPositioningCanvas),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl border bg-muted" /> },
);

export function StrategyPositioningCanvasLoader(props: ComponentProps<typeof StrategyPositioningCanvas>) {
  return <StrategyPositioningCanvas {...props} />;
}
