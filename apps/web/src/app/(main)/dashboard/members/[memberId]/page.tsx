import type { Metadata } from "next";
import { PublicMemberProfileScreen } from "./public-member-profile-screen";

export const metadata: Metadata = { title: "成员主页 | TTZ 公会站" };

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  return <PublicMemberProfileScreen memberId={memberId} />;
}
