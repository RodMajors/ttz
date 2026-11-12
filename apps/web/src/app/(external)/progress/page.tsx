import type { Metadata } from "next";
import { PublicProgress } from "./public-progress";

export const metadata: Metadata = { title: "团本进度 | TTZ 公会站" };

export default function ProgressPage() {
  return <PublicProgress />;
}
