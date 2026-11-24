import { redirect } from "next/navigation";

export default async function LegacyStrategyPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  redirect(`/dashboard/raids/strategies/${versionId}`);
}
