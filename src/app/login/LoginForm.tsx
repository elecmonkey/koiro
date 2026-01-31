"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
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

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttlDays, setTtlDays] = useState("7");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const result = await signIn("credentials", {
      email,
      password,
      ttlDays,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("邮箱或密码错误");
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <Box component="main" sx={{ minHeight: "100vh", py: 10 }}>
      <Container maxWidth="sm">
        <Card className="float-in">
          <CardContent sx={{ p: 5 }}>
            <Stack spacing={3} component="form" onSubmit={handleSubmit}>
              <Stack spacing={1}>
                <Typography variant="h4">登录 Koiro</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  label="邮箱"
                  name="email"
                  placeholder="you@example.com"
                  fullWidth
                  required
                />
                <TextField
                  label="密码"
                  name="password"
                  type="password"
                  fullWidth
                  required
                />
                <TextField
                  select
                  label="有效期"
                  value={ttlDays}
                  onChange={(event) => setTtlDays(event.target.value)}
                >
                  <MenuItem value="1">1 天</MenuItem>
                  <MenuItem value="7">7 天</MenuItem>
                  <MenuItem value="30">30 天</MenuItem>
                  <MenuItem value="180">180 天</MenuItem>
                </TextField>
              </Stack>
              {error ? (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              ) : null}
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
