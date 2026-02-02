"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signOut } from "next-auth/react";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  permissions: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 昵称编辑状态
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameSuccess, setDisplayNameSuccess] = useState<string | null>(null);
  const [submittingDisplayName, setSubmittingDisplayName] = useState(false);

  // 密码修改状态
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("请先登录");
        }
        throw new Error("获取用户信息失败");
      }
      const data = await res.json();
      setProfile(data.user);
      setDisplayNameValue(data.user.displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveDisplayName = async () => {
    if (!displayNameValue.trim()) {
      setDisplayNameError("昵称不能为空");
      return;
    }

    setSubmittingDisplayName(true);
    setDisplayNameError(null);
    setDisplayNameSuccess(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayNameValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "更新失败");
      }

      setProfile((prev) =>
        prev ? { ...prev, displayName: data.displayName } : null
      );
      setEditingDisplayName(false);
      setDisplayNameSuccess("昵称更新成功");
      setTimeout(() => setDisplayNameSuccess(null), 3000);
    } catch (err) {
      setDisplayNameError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmittingDisplayName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("请输入当前密码");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("新密码至少 6 位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }

    setSubmittingPassword(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "更新失败");
      }

      setPasswordSuccess("密码更新成功，请重新登录");
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // 3秒后自动退出登录
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmittingPassword(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">未找到用户信息</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        个人中心
      </Typography>

      {/* 基本信息卡片 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            基本信息
          </Typography>

          <Stack spacing={2}>
            {/* 邮箱 - 只读 */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                邮箱（不可修改）
              </Typography>
              <Typography variant="body1">{profile.email}</Typography>
            </Box>

            <Divider />

            {/* 昵称 - 可编辑 */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                昵称
              </Typography>
              {editingDisplayName ? (
                <Stack spacing={1} mt={1}>
                  <TextField
                    size="small"
                    fullWidth
                    value={displayNameValue}
                    onChange={(e) => setDisplayNameValue(e.target.value)}
                    placeholder="请输入昵称"
                    error={!!displayNameError}
                    helperText={displayNameError}
                    disabled={submittingDisplayName}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveDisplayName}
                      disabled={submittingDisplayName}
                    >
                      {submittingDisplayName ? "保存中..." : "保存"}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setEditingDisplayName(false);
                        setDisplayNameValue(profile.displayName);
                        setDisplayNameError(null);
                      }}
                      disabled={submittingDisplayName}
                    >
                      取消
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="body1">{profile.displayName}</Typography>
                  <Button
                    size="small"
                    onClick={() => setEditingDisplayName(true)}
                  >
                    修改
                  </Button>
                </Stack>
              )}
              {displayNameSuccess && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {displayNameSuccess}
                </Alert>
              )}
            </Box>

            <Divider />

            {/* 注册时间 */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                注册时间
              </Typography>
              <Typography variant="body1">
                {formatDate(profile.createdAt)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* 密码修改卡片 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            安全设置
          </Typography>

          {changingPassword ? (
            <Stack spacing={2}>
              <TextField
                type="password"
                size="small"
                fullWidth
                label="当前密码"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={submittingPassword}
              />
              <TextField
                type="password"
                size="small"
                fullWidth
                label="新密码（至少6位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submittingPassword}
              />
              <TextField
                type="password"
                size="small"
                fullWidth
                label="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submittingPassword}
              />

              {passwordError && (
                <Alert severity="error">{passwordError}</Alert>
              )}
              {passwordSuccess && (
                <Alert severity="success">{passwordSuccess}</Alert>
              )}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={submittingPassword}
                >
                  {submittingPassword ? "提交中..." : "确认修改"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError(null);
                  }}
                  disabled={submittingPassword}
                >
                  取消
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                修改登录密码
              </Typography>
              <Button size="small" onClick={() => setChangingPassword(true)}>
                修改密码
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
