import type { Metadata } from "next";
import { StrategyManagementScreen } from "./strategy-management-screen";

export const metadata: Metadata = { title: "团本战术 | TTZ 公会站" };

export default function RaidsPage() {
  return <StrategyManagementScreen />;
}
