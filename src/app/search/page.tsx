import { Suspense } from "react";
import { Box, CircularProgress, Container } from "@mui/material";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteName } from "@/lib/site-config";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `搜索 - ${siteName}`,
  description: "搜索歌曲和播放列表",
};

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });

  return (
    <Suspense
      fallback={
        <Box component="main" sx={{ pb: 8 }}>
          <Container sx={{ pt: 6, textAlign: "center" }}>
            <CircularProgress />
          </Container>
        </Box>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
