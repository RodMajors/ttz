import type { Metadata } from "next";
import { AnnouncementsScreen } from "./announcements-screen";

export const metadata: Metadata = { title: "公告 | TTZ 公会站" };

export default function AnnouncementsPage() {
  return <AnnouncementsScreen />;
}
