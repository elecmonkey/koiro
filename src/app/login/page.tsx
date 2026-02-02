import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSiteName } from "@/lib/site-config";
import LoginForm from "./LoginForm";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `登录 - ${siteName}`,
  description: `登录到 ${siteName} 平台`,
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return <LoginForm />;
}
