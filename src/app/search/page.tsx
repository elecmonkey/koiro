import { Suspense } from "react";
import { Box, CircularProgress, Container } from "@mui/material";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import SearchClient from "./SearchClient";

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
