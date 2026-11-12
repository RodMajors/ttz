import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { FeaturePreview } from "../_components/feature-preview";

export const metadata: Metadata = { title: "系统设置 | TTZ 公会站" };

export default function SystemPage() {
  return <FeaturePreview icon={Settings2} title="系统设置" description="首期仅维护基础数据、成员 privilege、身份组、公告和站点内容。权限保持三档 privilege，不配置原子权限。" />;
}
