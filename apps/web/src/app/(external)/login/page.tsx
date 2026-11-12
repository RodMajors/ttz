import type { Metadata } from "next";
import { QrLogin } from "./qr-login";

export const metadata: Metadata = { title: "微信扫码登录 | TTZ 公会站" };

export default function LoginPage() {
  return <QrLogin />;
}
