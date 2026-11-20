import type { Metadata } from "next";
import { RaidProgressScreen } from "./raid-progress-screen";

export const metadata: Metadata = { title: "团本进度 | TTZ 公会站" };

export default function RaidProgressPage() {
  return <RaidProgressScreen />;
}
