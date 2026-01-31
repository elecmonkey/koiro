"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { adminPlaylists, songs } from "../lib/sample-data";
import ImageUploadField from "../components/ImageUploadField";

type PlaylistDraft = {
  name: string;
  coverObjectId: string;
  description: string;
};

export default function AdminShell() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"playlists" | "songs">("playlists");
  const [draft, setDraft] = useState<PlaylistDraft>({
    name: "",
    coverObjectId: "",
    description: "",
  });

  const handleClose = () => setOpen(false);

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">管理后台</Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Card
              variant="outlined"
              sx={{
                flex: 1,
                cursor: "pointer",
                borderColor: view === "playlists" ? "primary.main" : "rgba(31, 26, 22, 0.12)",
              }}
              onClick={() => setView("playlists")}
            >
              <CardContent
                sx={{
                  minHeight: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" align="center">
                  播放列表管理
                </Typography>
              </CardContent>
            </Card>
            <Card
              variant="outlined"
              sx={{
                flex: 1,
                cursor: "pointer",
                borderColor: view === "songs" ? "primary.main" : "rgba(31, 26, 22, 0.12)",
              }}
              onClick={() => setView("songs")}
            >
              <CardContent
                sx={{
                  minHeight: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" align="center">
                  歌曲管理
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {view === "playlists" ? (
            <>
              <Card className="float-in" variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      alignItems={{ md: "center" }}
                      justifyContent="space-between"
                    >
                      <Typography variant="h6">播放列表列表</Typography>
                      <Button variant="contained" onClick={() => setOpen(true)}>
                        新建播放列表
                      </Button>
                    </Stack>
                    {adminPlaylists.map((list) => (
                      <Box key={list.id}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <Box flex={1}>
                            <Typography variant="subtitle1">{list.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {list.songs} 首 · 更新于 {list.updatedAt}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button size="small" variant="outlined">
                              编辑
                            </Button>
                            <Button size="small" color="error">
                              删除
                            </Button>
                          </Stack>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="float-in stagger-1" variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">歌曲列表</Typography>
                    {songs.map((song) => (
                      <Box key={song.id}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <Box flex={1}>
                            <Typography variant="subtitle1">{song.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {song.description}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button size="small" variant="outlined">
                              编辑
                            </Button>
                            <Button size="small" color="error">
                              删除
                            </Button>
                          </Stack>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      </Container>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>新建播放列表</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="播放列表名称"
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              fullWidth
            />
            <ImageUploadField
              label="封面图片"
              objectId={draft.coverObjectId || null}
              onObjectIdChange={(value) =>
                setDraft((prev) => ({ ...prev, coverObjectId: value ?? "" }))
              }
            />
            <TextField
              label="简介"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>取消</Button>
          <Button
            variant="contained"
            onClick={() => {
              setDraft({ name: "", coverObjectId: "", description: "" });
              handleClose();
            }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
