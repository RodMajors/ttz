import type { Metadata } from "next";
import { ProfileScreen } from "./profile-screen";

export const metadata: Metadata = { title: "个人中心 | TTZ 公会站" };

export default function ProfilePage() {
  return <ProfileScreen />;
}
