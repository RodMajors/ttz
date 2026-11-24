import type { Metadata } from "next";
import { StrategyEditor } from "./strategy-editor";

export const metadata: Metadata = { title: "战术编辑 | TTZ 公会站" };

export default async function StrategyPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  return <StrategyEditor versionId={versionId} />;
}
