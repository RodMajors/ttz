import type { Metadata } from "next";
import { AttendanceDetailScreen } from "./attendance-detail-screen";

export const metadata: Metadata = { title: "活动出勤 | TTZ 公会站" };

export default async function AttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttendanceDetailScreen activityId={id} />;
}
