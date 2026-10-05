-- 歌曲/歌单的创建者；NULL 表示无主（历史数据、或创建者账号已删除），此时只有 ADMIN 能编辑
ALTER TABLE songs ADD COLUMN created_by uuid REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE playlists ADD COLUMN created_by uuid REFERENCES users (id) ON DELETE SET NULL;
