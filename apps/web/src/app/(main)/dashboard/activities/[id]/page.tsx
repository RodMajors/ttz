import type { Metadata } from "next";
import { ActivityDetailScreen } from "./activity-detail-screen";

export const metadata: Metadata = { title: "活动详情 | TTZ 公会站" };

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityDetailScreen activityId={id} />;
}
