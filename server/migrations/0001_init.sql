-- updated_at 由触发器维护
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 用户；permissions 为位掩码：VIEW=1 DOWNLOAD=2 UPLOAD=4 ADMIN=8，0 表示停用
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    display_name text NOT NULL,
    password_hash text NOT NULL,
    permissions integer NOT NULL,
    -- 头像，和歌曲/歌单封面共用 img/ 前缀；NULL 表示没有设置头像
    avatar_object_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 歌曲；staff 为 [{ "role": "演唱", "names": ["..."] }]
CREATE TABLE songs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    staff jsonb NOT NULL,
    cover_object_id text NOT NULL,
    -- 创建者，NOT NULL。外键写成 ON DELETE SET NULL 只是为了不卡住删除本身；
    -- 实际上应用层（删除用户的接口）会拒绝删除还有歌曲/歌单的用户，这条分支不会真的触发
    created_by uuid NOT NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE playlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL,
    cover_object_id text NOT NULL,
    -- 同上：created_by NOT NULL，ON DELETE SET NULL 不会真的触发
    created_by uuid NOT NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 歌单中的歌曲；position 决定顺序，可以不连续
CREATE TABLE song_playlists (
    song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    playlist_id uuid NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    position integer NOT NULL,
    PRIMARY KEY (song_id, playlist_id),
    UNIQUE (playlist_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- 歌词；lines 为 [{ "startMs", "endMs", "spans": [...] }]，plain_text 由 lines 派生，供搜索
CREATE TABLE lyrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer NOT NULL,
    is_default boolean NOT NULL,
    languages text[] NOT NULL,
    lines jsonb NOT NULL,
    plain_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (song_id, name),
    UNIQUE (song_id, position) DEFERRABLE INITIALLY DEFERRED,
    -- 供 audio_versions 的复合外键引用
    UNIQUE (song_id, id)
);
CREATE UNIQUE INDEX lyrics_one_default_idx ON lyrics (song_id) WHERE is_default;

-- 音频版本；可绑定同一首歌的一份歌词
CREATE TABLE audio_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer NOT NULL,
    is_default boolean NOT NULL,
    object_id text NOT NULL,
    lyrics_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (song_id, name),
    UNIQUE (song_id, position) DEFERRABLE INITIALLY DEFERRED,
    -- 绑定的歌词必须属于同一首歌；歌词被删时只清空绑定
    CONSTRAINT audio_versions_lyrics_fkey FOREIGN KEY (song_id, lyrics_id)
        REFERENCES lyrics (song_id, id) ON DELETE SET NULL (lyrics_id)
);
CREATE UNIQUE INDEX audio_versions_one_default_idx ON audio_versions (song_id) WHERE is_default;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER songs_set_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER playlists_set_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lyrics_set_updated_at BEFORE UPDATE ON lyrics
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audio_versions_set_updated_at BEFORE UPDATE ON audio_versions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
