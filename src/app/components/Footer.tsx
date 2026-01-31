"use client";

import { Box, Container, Link, Typography } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: "auto",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Koiro · Made with ❤️ by{" "}
            <Link
              href="https://www.elecmonkey.com"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              sx={{ "&:hover": { color: "text.primary" } }}
            >
              Elecmonkey
            </Link>
          </Typography>
          <Link
            href="https://github.com/elecmonkey/koiro"
            target="_blank"
            rel="noopener noreferrer"
            color="text.secondary"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              "&:hover": {
                color: "text.primary",
              },
            }}
          >
            <GitHubIcon fontSize="small" />
            <Typography variant="body2">GitHub</Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
