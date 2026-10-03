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
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 歌曲；staff 为 [{ "role": "演唱", "name": ["..."] }]
CREATE TABLE songs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    staff jsonb NOT NULL DEFAULT '[]',
    cover_object_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE playlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    cover_object_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE song_playlists (
    song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    playlist_id uuid NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    position integer,
    PRIMARY KEY (song_id, playlist_id)
);
CREATE INDEX song_playlists_playlist_id_idx ON song_playlists (playlist_id, position);

-- 歌词文档；content 为 KOIRO_AST_V1，plain_text 由 content 派生，供搜索
CREATE TABLE lyrics_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    version_key text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    format text NOT NULL,
    content jsonb NOT NULL,
    plain_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (song_id, version_key),
    -- 供 audio_versions 的复合外键引用
    UNIQUE (song_id, id)
);
CREATE UNIQUE INDEX lyrics_documents_one_default_idx ON lyrics_documents (song_id) WHERE is_default;

-- 音频版本；可绑定同一首歌的一份歌词
CREATE TABLE audio_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id uuid NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    name text NOT NULL,
    object_id text NOT NULL,
    lyrics_id uuid,
    is_default boolean NOT NULL DEFAULT false,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (song_id, name),
    -- 绑定的歌词必须属于同一首歌；歌词被删时只清空绑定
    CONSTRAINT audio_versions_lyrics_fkey FOREIGN KEY (song_id, lyrics_id)
        REFERENCES lyrics_documents (song_id, id) ON DELETE SET NULL (lyrics_id)
);
CREATE UNIQUE INDEX audio_versions_one_default_idx ON audio_versions (song_id) WHERE is_default;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER songs_set_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER playlists_set_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lyrics_documents_set_updated_at BEFORE UPDATE ON lyrics_documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audio_versions_set_updated_at BEFORE UPDATE ON audio_versions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
