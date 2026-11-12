import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { FeaturePreview } from "../_components/feature-preview";

export const metadata: Metadata = { title: "公告 | TTZ 公会站" };

export default function AnnouncementsPage() {
  return <FeaturePreview icon={Megaphone} title="公告" description="管理员可发布置顶公告、定时公告，并按身份组投放。普通成员按目标范围查看；定时发布与过期状态由服务端判定。" />;
}
