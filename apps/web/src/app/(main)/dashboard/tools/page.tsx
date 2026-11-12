import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { FeaturePreview } from "../_components/feature-preview";

export const metadata: Metadata = { title: "常用工具 | TTZ 公会站" };

export default function ToolsPage() {
  return <FeaturePreview icon={Link2} title="常用工具" description="常用外部工具入口由管理员维护，并保存在站点结构化配置中。WCL 服务器固定为 CN 伊森利恩（server id 569）。" />;
}
