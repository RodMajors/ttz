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
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border bg-card">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">TTZ 公会工作台</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
