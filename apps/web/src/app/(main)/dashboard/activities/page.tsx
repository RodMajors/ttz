import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { FeaturePreview } from "../_components/feature-preview";
import { ActivitiesScreen } from "./_components/activities-screen";

export const metadata: Metadata = { title: "活动 | TTZ 公会站" };
export default function ActivitiesPage() {
  return (
    <FeaturePreview
      icon={CalendarDays}
      title="活动"
      description="创建、发布和管理公会活动。普通成员只能在截止前且尚未被确认时修改或取消自己的报名。"
    >
      <ActivitiesScreen />
    </FeaturePreview>
  );
}
