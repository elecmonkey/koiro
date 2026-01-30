import { Box, Button, Card, CardContent, Container, Stack, Typography } from "@mui/material";

export default function DeniedPage() {
  return (
    <Box component="main" sx={{ minHeight: "100vh", py: 10 }}>
      <Container maxWidth="sm">
        <Card className="float-in">
          <CardContent sx={{ p: 5 }}>
            <Stack spacing={2}>
              <Typography variant="h4">权限不足</Typography>
              <Typography variant="body2" color="text.secondary">
                当前账号权限不足或已被停用，请联系管理员。
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained">返回首页</Button>
                <Button variant="outlined">重新登录</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
