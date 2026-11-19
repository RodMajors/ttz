import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function FeaturePreview({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <div className="flex items-start gap-4">
        <div>
          <p className="text-xs text-muted-foreground tracking-[0.18em] font-bold">{"TTZ // THE TWILIGHT ZONE"}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Icon className="size-8" />
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
