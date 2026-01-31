import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { searchResults } from "../lib/sample-data";
import { requireAuth } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

type SearchPageProps = {
  searchParams?: { keyword?: string };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  await requireAuth({ permission: PERMISSIONS.VIEW, allowAnonymous: true });
  const keyword = searchParams?.keyword?.trim() ?? "";
  const hasKeyword = Boolean(keyword);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4">搜索</Typography>
            <Typography variant="body2" color="text.secondary">
              以标题、Staff、歌词内容进行权重搜索
            </Typography>
          </Stack>
          <Card className="float-in">
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  placeholder="例如：夜航 / Yun / 世界を変える"
                  defaultValue={keyword}
                />
                <Button variant="contained">搜索</Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Card className="float-in stagger-1">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6">搜索结果</Typography>
                <Chip
                  size="small"
                  label={hasKeyword ? `关键词：${keyword}` : "暂无关键词"}
                />
              </Stack>
              {hasKeyword ? (
                <Stack spacing={2}>
                  {searchResults.map((item) => (
                    <Box key={item.id}>
                      <Stack spacing={1}>
                        <Typography variant="subtitle1">{item.title}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={item.match} />
                          <Typography variant="body2" color="text.secondary">
                            {item.snippet}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Divider sx={{ my: 2 }} />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  请输入关键词开始搜索。
                </Typography>
              )}
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined">上一页</Button>
                <Button variant="contained">下一页</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
