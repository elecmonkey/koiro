"use client";

import { Box } from "@mui/material";

type CoverArtProps = {
  url: string | null;
  height?: number | string;
  width?: number | string;
  alt?: string;
};

export default function CoverArt({
  url,
  height = 280,
  width,
  alt = "封面",
}: CoverArtProps) {
  if (!url) {
    return (
      <Box
        sx={{
          width: width ?? "100%",
          height,
          borderRadius: 4,
          background: "linear-gradient(135deg, #f3efe7, #e8dfd1)",
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: width ?? "100%",
        height,
        borderRadius: 4,
        overflow: "hidden",
        background: "#f8f4ee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        component="img"
        src={url}
        alt={alt}
        sx={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </Box>
  );
}
