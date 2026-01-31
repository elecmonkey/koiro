"use client";

import dynamic from "next/dynamic";
import type { SongFormData } from "@/app/upload/SongForm";

const SongForm = dynamic(() => import("@/app/upload/SongForm"), { ssr: false });

type Props = {
  songId: string;
  initialData: SongFormData;
};

export default function EditSongClient({ songId, initialData }: Props) {
  return <SongForm mode="edit" songId={songId} initialData={initialData} />;
}
