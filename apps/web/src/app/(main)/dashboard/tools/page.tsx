import type { Metadata } from "next";
import { ToolsScreen } from "./tools-screen";
export const metadata: Metadata = { title: "常用工具 | TTZ 公会站" };
export default function ToolsPage() {
  return <ToolsScreen />;
}
