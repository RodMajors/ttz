import { Users } from "lucide-react";
import type { Metadata } from "next";
import { FeaturePreview } from "../_components/feature-preview";
import { MembersScreen } from "./_components/members-screen";
export const metadata: Metadata = { title: "成员 | TTZ 公会站" };
export default function MembersPage() {
  return (
    <FeaturePreview icon={Users} title="成员" description="查看公会成员、主角色和当前身份组。">
      <MembersScreen />
    </FeaturePreview>
  );
}
