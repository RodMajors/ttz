import type { Metadata } from "next";
import { APP_CONFIG } from "@/config/app-config";
import { PublicHome } from "./public-home";

export const metadata: Metadata = { title: APP_CONFIG.meta.title, description: APP_CONFIG.meta.description };

export default function Home() {
  return <PublicHome />;
}
