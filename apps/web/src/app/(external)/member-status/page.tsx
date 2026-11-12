import type { Metadata } from "next";
import { MemberStatus } from "./member-status";

export const metadata: Metadata = { title: "成员状态 | TTZ 公会站" };

export default function MemberStatusPage() {
  return <MemberStatus />;
}
