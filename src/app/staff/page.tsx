import type { Metadata } from "next";
import { getSiteName } from "@/lib/site-config";
import StaffCloudClient from "./StaffCloudClient";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `Staff 云 - ${siteName}`,
  description: "按出现次数统计的 Staff 词云",
};

export default function StaffCloudPage() {
  return <StaffCloudClient />;
}
