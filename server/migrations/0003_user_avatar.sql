-- 用户头像，和歌曲/歌单封面共用 img/ 前缀；NULL 表示没有设置头像
ALTER TABLE users ADD COLUMN avatar_object_id text;
