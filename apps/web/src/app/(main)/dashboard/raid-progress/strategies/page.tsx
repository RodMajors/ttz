import type { Metadata } from "next";
import { StrategyManagementScreen } from "./strategy-management-screen";

export const metadata: Metadata = { title: "战术方案管理 | TTZ 公会站" };

export default function StrategyManagementPage() {
  return <StrategyManagementScreen />;
}
