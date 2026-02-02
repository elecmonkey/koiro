import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-config";
import { auth } from "@/auth";
import ProfileClient from "./ProfileClient";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `个人信息 - ${siteName}`,
  description: "个人信息设置",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <ProfileClient />;
}
