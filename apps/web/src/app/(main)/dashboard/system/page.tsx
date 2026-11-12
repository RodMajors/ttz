import type { Metadata } from "next";
import { OperationsSettings } from "./operations-settings";

export const metadata: Metadata = { title: "系统设置 | TTZ 公会站" };

export default function SystemPage() {
  return <OperationsSettings />;
}
