import { ChartNoAxesColumnIncreasing } from "lucide-react";
import type { Metadata } from "next";
import { FeaturePreview } from "../_components/feature-preview";
import { AttendanceScreen } from "./_components/attendance-screen";
export const metadata: Metadata = { title: "出勤统计 | TTZ 公会站" };
export default function AttendancePage() {
  return (
    <FeaturePreview
      icon={ChartNoAxesColumnIncreasing}
      title="出勤统计"
      description="正常出勤和迟到计为有效出勤；请假、缺席、替补与未报名不计入。"
    >
      <AttendanceScreen />
    </FeaturePreview>
  );
}
