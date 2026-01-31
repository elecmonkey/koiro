"use client";

import dynamic from "next/dynamic";

const UploadForm = dynamic(() => import("./UploadForm"), { ssr: false });

export default function UploadFormClient() {
  return <UploadForm />;
}
