"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import SongCard from "@/app/components/SongCard";
import type { LyricsDocument } from "@/app/editor/ast/types";

type StaffInfo = {
  name: string;
  total: number;
  roles: { role: string; count: number }[];
};

type Song = {
  id: string;
  title: string;
  description: string | null;
  staff: { role: string; name: string | string[] }[];
  coverUrl: string | null;
  audioVersions: Record<string, string> | null;
  lyrics: LyricsDocument | null;
};

type ResponseData = {
  staff: StaffInfo;
  songs: Song[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function StaffDetailClient({ name }: { name: string }) {
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ResponseData["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const staffName = useMemo(() => decodeURIComponent(name), [name]);

  useEffect(() => {
    let active = true;
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/staff/${encodeURIComponent(staffName)}?page=${page}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "获取 Staff 详情失败");
        }
        const data = (await res.json()) as ResponseData;
        if (!active) return;
        setStaff(data.staff);
        setSongs(data.songs);
        setPagination(data.pagination);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchStaff();
    return () => {
      active = false;
    };
  }, [staffName, page]);

  const topRoles = staff?.roles.slice(0, 3) ?? [];

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">{staffName}</Typography>
          {staff && (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                共参与 {staff.total} 首
              </Typography>
              {topRoles.map((role) => (
                <Chip key={role.role} size="small" label={role.role} variant="outlined" />
              ))}
            </Stack>
          )}
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : songs.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            暂无歌曲
          </Typography>
        ) : (
          <Stack spacing={2}>
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}

            {pagination && pagination.totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={(_event, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
