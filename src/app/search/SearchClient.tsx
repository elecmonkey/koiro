"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter, useSearchParams } from "next/navigation";
import SearchResultCard from "@/app/components/SearchResultCard";

type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  staff: { role: string; name: string | string[] }[];
  coverUrl: string | null;
  score: number;
  matchType: ("title" | "staff" | "lyrics")[];
  matchSnippet?: string;
  titleHighlights?: { text: string; highlight?: boolean }[];
  staffHighlights?: { role: string; name: { text: string; highlight?: boolean }[] }[];
  matchSnippetHighlights?: { text: string; highlight?: boolean }[];
};

type SearchResponse = {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get("q") || "";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [keyword, setKeyword] = useState(initialKeyword);
  const [inputValue, setInputValue] = useState(initialKeyword);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!initialKeyword);

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载时如果有关键词就搜索
  useEffect(() => {
    if (initialKeyword) {
      doSearch(initialKeyword, initialPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const q = inputValue.trim();
    setKeyword(q);
    setPage(1);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    doSearch(q, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`/search?q=${encodeURIComponent(keyword)}&page=${newPage}`);
    doSearch(keyword, newPage);
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Typography variant="h4">搜索</Typography>
          <Card variant="outlined">
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  placeholder="搜索歌曲标题、Staff 或歌词内容..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={loading}
                  sx={{ minWidth: 100 }}
                >
                  {loading ? <CircularProgress size={24} /> : "搜索"}
                </Button>
              </Stack>
            </Box>
          </Card>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {searched && (
          <Card variant="outlined">
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6">搜索结果</Typography>
                  {keyword && (
                    <Chip
                      size="small"
                      label={`"${keyword}" · ${total} 条结果`}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>

                {loading ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <CircularProgress />
                  </Box>
                ) : results.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    未找到匹配的结果
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {results.map((item) => (
                      <SearchResultCard key={item.id} result={item} />
                    ))}
                  </Stack>
                )}

                {totalPages > 1 && (
                  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ pt: 2 }}>
                    <Button
                      variant="outlined"
                      disabled={page <= 1 || loading}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      上一页
                    </Button>
                    <Typography variant="body2" sx={{ lineHeight: "36px" }}>
                      {page} / {totalPages}
                    </Typography>
                    <Button
                      variant="outlined"
                      disabled={page >= totalPages || loading}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      下一页
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Card>
        )}
      </Container>
    </Box>
  );
}
