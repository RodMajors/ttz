import type { Metadata } from "next";
import { ActivityCreateForm } from "./activity-create-form";
export const metadata: Metadata = { title: "创建活动 | TTZ 公会站" };
export default function NewActivityPage() {
  return <ActivityCreateForm />;
}
