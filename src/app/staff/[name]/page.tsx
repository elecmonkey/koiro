import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-config";
import StaffDetailClient from "./StaffDetailClient";

type Params = {
  params: Promise<{ name: string }>;
};

const siteName = getSiteName();

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  return {
    title: `${decoded} - ${siteName}`,
    description: `${decoded} 参与的作品`,
  };
}

export default async function StaffDetailPage({ params }: Params) {
  const { name } = await params;
  return <StaffDetailClient name={name} />;
}
