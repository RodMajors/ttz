import type { Metadata } from "next";
import { Recruitment } from "./recruitment";

export const metadata: Metadata = { title: "招募 | TTZ 公会站" };

export default function RecruitmentPage() {
  return <Recruitment />;
}
