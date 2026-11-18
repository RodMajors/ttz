import type { CSSProperties, PropsWithChildren } from "react";

type ClassAccentProps = PropsWithChildren<{ color: string | null | undefined; className?: string }>;

export function ClassAccent({ color, className, children }: ClassAccentProps) {
  return (
    <span className={className} data-class-accent style={{ "--class-color": color ?? "currentColor" } as CSSProperties}>
      {children}
    </span>
  );
}
