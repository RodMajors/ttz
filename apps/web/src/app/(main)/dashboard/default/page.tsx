import type { Metadata } from "next";
import { DashboardOverview } from "./dashboard-overview";

export const metadata: Metadata = { title: "工作台 | TTZ 公会站" };

export default function DashboardPage() {
  return <DashboardOverview />;
}
