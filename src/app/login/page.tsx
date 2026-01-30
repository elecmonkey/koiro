import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function LoginPage() {
  return (
    <Box component="main" sx={{ minHeight: "100vh", py: 10 }}>
      <Container maxWidth="sm">
        <Card className="float-in">
          <CardContent sx={{ p: 5 }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h4">登录 Koiro</Typography>
                <Typography variant="body2" color="text.secondary">
                  通过邮箱登录以访问你的音乐收藏
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField label="邮箱" placeholder="you@example.com" fullWidth />
                <TextField label="密码" type="password" fullWidth />
                <TextField select label="有效期" defaultValue="7d">
                  <MenuItem value="1d">1 天</MenuItem>
                  <MenuItem value="7d">7 天</MenuItem>
                  <MenuItem value="30d">30 天</MenuItem>
                  <MenuItem value="180d">180 天</MenuItem>
                </TextField>
              </Stack>
              <Button variant="contained" size="large">
                登录并签发 JWT
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
