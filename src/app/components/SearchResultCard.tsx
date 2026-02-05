"use client";

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

type SearchResultCardProps = {
  result: {
    id: string;
    title: string;
    description: string | null;
    staff: { role: string; name: string | string[] }[];
    coverUrl: string | null;
    matchType: ("title" | "staff" | "lyrics")[];
    matchSnippet?: string;
    titleHighlights?: { text: string; highlight?: boolean }[];
    staffHighlights?: { role: string; name: { text: string; highlight?: boolean }[] }[];
    matchSnippetHighlights?: { text: string; highlight?: boolean }[];
  };
};

const matchTypeLabels: Record<string, string> = {
  title: "标题",
  staff: "Staff",
  lyrics: "歌词",
};

function HighlightText({ parts }: { parts: { text: string; highlight?: boolean }[] }) {
  return (
    <>
      {parts.map((part, idx) =>
        part.highlight ? (
          <Box
            key={idx}
            component="span"
            sx={{
              bgcolor: "warning.light",
              color: "text.primary",
              borderRadius: 0.5,
              px: 0.2,
            }}
          >
            {part.text}
          </Box>
        ) : (
          <Box key={idx} component="span">
            {part.text}
          </Box>
        )
      )}
    </>
  );
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const titleParts = result.titleHighlights ?? [{ text: result.title }];
  const snippetParts =
    result.matchSnippetHighlights ?? (result.matchSnippet ? [{ text: result.matchSnippet }] : []);
  const staffParts = result.staffHighlights ?? [];

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        transition: "border-color 0.2s",
        overflow: "hidden",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      {result.coverUrl && (
        <Box
          sx={{
            display: { xs: "block", sm: "none" },
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "45%",
            background: `url(${result.coverUrl}) center/cover no-repeat`,
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "60%",
              background: (theme) =>
                `linear-gradient(to right, transparent, ${theme.palette.background.paper})`,
            },
          }}
        />
      )}

      <CardActionArea component={Link} href={`/songs/${result.id}`} sx={{ height: { xs: "auto", sm: 92 } }}>
        <CardContent
          sx={{
            py: { xs: 2, sm: 0 },
            pl: { xs: 2, sm: 0 },
            height: "100%",
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ width: "100%" }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                width: 92,
                height: 92,
                flexShrink: 0,
                background: result.coverUrl
                  ? `url(${result.coverUrl}) center/cover no-repeat`
                  : "linear-gradient(135deg, #f3efe7, #e8dfd1)",
                alignItems: "center",
                justifyContent: "center",
                color: "text.disabled",
                fontSize: 24,
              }}
            >
              {!result.coverUrl && "♪"}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, pl: { xs: "30%", sm: 0 } }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1" fontWeight={500} noWrap color="text.primary">
                      <HighlightText parts={titleParts} />
                    </Typography>
                    {result.matchType.map((type) => (
                      <Chip
                        key={type}
                        size="small"
                        label={matchTypeLabels[type]}
                      color={type === "title" ? "primary" : type === "staff" ? "secondary" : "default"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  ))}
                </Stack>

                {result.matchSnippet && snippetParts.length > 0 && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    <HighlightText parts={snippetParts} />
                  </Typography>
                )}

                {(result.staff && result.staff.length > 0) || staffParts.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(staffParts.length > 0 ? staffParts : result.staff.map((s) => ({ role: s.role, name: [{ text: Array.isArray(s.name) ? s.name.join("、") : s.name || "" }] })))
                      .slice(0, 3)
                      .map((s, idx) => (
                      <Chip
                        key={idx}
                        label={
                          <Box component="span">
                            {s.role || "Staff"} · <HighlightText parts={s.name} />
                          </Box>
                        }
                        size="small"
                        variant="outlined"
                        sx={{
                          bgcolor: { xs: "rgba(255,255,255,0.8)", sm: "transparent" },
                          backdropFilter: { xs: "blur(4px)", sm: "none" },
                        }}
                      />
                    ))}
                    {((staffParts.length > 0 ? staffParts : result.staff).length > 3) && (
                      <Chip
                        label={`+${(staffParts.length > 0 ? staffParts : result.staff).length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          bgcolor: { xs: "rgba(255,255,255,0.8)", sm: "transparent" },
                          backdropFilter: { xs: "blur(4px)", sm: "none" },
                        }}
                      />
                    )}
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
