# 命令参考

每条命令的参数、含义、所需权限和输出。各命令怎样组合成完整的任务见 [workflows.md](workflows.md)。

## 目录

- [通用约定](#通用约定)
- [登录与配置](#登录与配置)：`login`、`logout`、`auth status`、`config get`、`config set`
- [歌曲](#歌曲)：`song list`、`random`、`search`、`view`、`export`、`update`、`create`、`delete`、`download`
- [歌单](#歌单)：`playlist list`、`view`、`create`、`edit`、`delete`、`add`、`remove`、`reorder`
- [staff 与语种](#staff-与语种)：`staff list`、`staff view`、`language list`、`language view`
- [本地工具](#本地工具)：`lyrics from-lrc`

## 通用约定

以下用 `koiro` 代表 `node <skill 目录>/scripts/koiro.mjs`。

**引用对象**

| 占位符     | 可以写成                                                |
| ---------- | ------------------------------------------------------- |
| `SONG`     | 歌曲 UUID，或歌曲链接 `https://<站点>/songs/<UUID>`     |
| `PLAYLIST` | 歌单 UUID，或歌单链接 `https://<站点>/playlists/<UUID>` |
| `NAME`     | staff 名字（精确写法），或链接 `/staff/<名字>`          |
| `CODE`     | 语种代码，或链接 `/languages/<代码>`                    |

链接只用来取出 ID，脚本不会访问链接本身，也不检查链接的域名。

**全局选项**（任何命令都可以加）

| 选项            | 含义                                     |
| --------------- | ---------------------------------------- |
| `--json`        | 输出单行紧凑 JSON；不加时输出缩进的 JSON |
| `--web-url URL` | 本次命令使用的站点，优先于其他配置       |
| `--help`        | 打印用法                                 |

**分页选项**（列表类命令）

| 选项       | 含义                                                                  |
| ---------- | --------------------------------------------------------------------- |
| 不加       | 返回第 1 页：`{items, page, pageSize, total, totalPages}`，每页 20 条 |
| `--page N` | 返回第 N 页，格式同上                                                 |
| `--all`    | 依次取完所有页，返回 `{items, total}`                                 |

`--page` 和 `--all` 不能同时使用。

**带文字的选项**：`--description TEXT` 与 `--description-file FILE` 二选一；`FILE` 写 `-` 表示从标准输入读。

**站点**：依次取 `--web-url`、环境变量 `KOIRO_WEB_URL`、`config set` 保存的站点、安装 skill 时写入的站点。站点必须是 HTTPS（本机回环地址允许 HTTP），末尾不带 `/api`。

**登录凭据**：保存在 `~/.config/koiro/config.json`（权限 0600），按站点分别保存。环境变量 `KOIRO_TOKEN` 会代替保存的登录；`KOIRO_CONFIG_DIR` 改变配置目录。不要读取、打印或转述凭据。

**输出**：成功时结果是 stdout 上的 JSON，退出码 0。失败时 stderr 上是 `{"error": {"code", "message", "details"?}}`，退出码见 [workflows.md 第 9 节](workflows.md#9-登录与错误处理)。

**歌曲摘要**：列表类命令返回的每首歌是一份摘要：

```json
{
  "id": "…",
  "title": "…",
  "description": "…",
  "staff": [{ "role": "作曲", "names": ["…"] }],
  "coverUrl": "…",
  "defaultVersion": {
    "id": "…",
    "name": "主版本",
    "isDefault": true,
    "lyricsId": "…"
  },
  "versionCount": 2,
  "lyricsCount": 1,
  "updatedAt": "2026-01-01T00:00:00Z",
  "url": "https://<站点>/songs/<id>"
}
```

## 登录与配置

### `koiro login [--no-browser]`

不需要权限。在浏览器里授权本机命令行以当前网页账号的身份操作。

1. 在 `127.0.0.1` 的随机端口上等待回调，并在 stderr 打印授权地址。
2. 打开默认浏览器（`--no-browser` 时只打印地址）。
3. 用户在网页上确认后，浏览器跳回本机，命令换取 30 天有效的登录并保存。

最多等待 3 分钟。授权必须在运行脚本的同一台机器上的浏览器里完成。网页上未登录时，会先跳到登录页，登录后回到授权页。

输出：`{webUrl, user, expiresAt}`，`user` 是站点的用户对象：`{id, email, displayName, avatarUrl, permissions, createdAt, updatedAt}`，`avatarUrl` 没有头像时为 `null`，`permissions` 是权限名数组（见 [workflows.md 第 2 节](workflows.md#2-权限)）。

只有在其他命令以退出码 `3` 失败时才需要运行。

### `koiro logout`

删除当前站点保存的登录（只影响本机，不影响网页上的登录）。输出：`{webUrl, loggedOut: true}`。设置了 `KOIRO_TOKEN` 时会附带提醒：那份凭据仍然有效，需要取消该环境变量。

### `koiro auth status`

向站点确认当前登录。输出：`{webUrl, user}`，`user` 同 `login`。未登录、登录过期或账号已删除时退出码 `3`。

用于开始写操作前确认权限，`permissions` 的含义见 [workflows.md 第 2 节](workflows.md#2-权限)。

### `koiro config get`

不联网。输出：`{webUrl, apiUrl, configDir, loggedIn}`。`loggedIn` 只说明本机有凭据，不代表凭据仍有效；要确认用 `auth status`。

### `koiro config set --web-url URL`

保存默认站点，此后不必每次传 `--web-url`。输出：`{webUrl}`。安装 skill 时已经写入了站点，通常不需要设置。

## 歌曲

### `koiro song list [--page N | --all]`

需要 `view`。按更新时间从新到旧列出全部歌曲，每页 20 首。返回歌曲摘要列表。

### `koiro song random`

需要 `view`。随机返回 5 首歌曲：`{items}`。

### `koiro song search QUERY [--page N | --all]`

需要 `view`。在标题、staff 姓名、歌词正文中搜索 `QUERY`，按相关度排序，每页 20 条。每一项是歌曲摘要，另外有：

| 字段            | 含义                                                      |
| --------------- | --------------------------------------------------------- |
| `matched`       | 命中部分的数组，元素为 `title`、`staff`、`lyrics`         |
| `lyricsExcerpt` | 命中歌词时，包含关键字的一段歌词；没有命中歌词时为 `null` |

```sh
koiro song search 夜に駆ける --json
```

### `koiro song view SONG`

需要 `view`。返回一首歌的完整信息：

| 字段                                                                               | 含义                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `id`、`title`、`description`、`staff`、`coverUrl`、`url`、`createdAt`、`updatedAt` | 基本信息                                                                     |
| `versions[]`                                                                       | 音频版本：`id`、`name`、`isDefault`、`lyricsId`（绑定的歌词，可能为 `null`） |
| `lyrics[]`                                                                         | 歌词：`id`、`name`、`isDefault`、`languages`、`lines[]`                      |
| `lyrics[].lines[]`                                                                 | `{startMs, endMs, text}`；`text` 里有注音的词写成 `基字(读音)`               |
| `playlists[]`                                                                      | 所属歌单：`id`、`name`                                                       |
| `owner`                                                                            | 创建者：`id`、`displayName`、`avatarUrl`                                     |

这是给人读的形式。要修改歌曲时不要用它当底稿，改用 `song export`。

### `koiro song export SONG`

需要 `upload`，并且是这首歌的创建者（有 `admin` 时不限）。输出可以直接编辑、再交给 `song update` 的歌曲文档，字段见 [song-document.md](song-document.md)。和 `view` 的区别：

- 封面和音频以 `coverObjectId`、`objectId` 表示（不是网址）；
- 歌词行是原始结构（`spans` 文字片段，注音是 `ruby` 片段）；
- 音频与歌词的绑定以歌词的 `name` 表示（`lyricsName`）；
- 不含所属歌单，所属歌单用 `view` 查看、在歌单一侧调整。

```sh
koiro song export <SONG> > song.json
```

### `koiro song update SONG --file FILE`

需要 `upload`，并且是这首歌的创建者（有 `admin` 时不限）。用文档**整体替换**这首歌：先上传文档引用的本地文件，再提交。`FILE` 为 `-` 时从标准输入读，此时文档里的相对路径以当前目录为基准。

整体替换的含义、哪些内容会保留，见 [workflows.md 第 4 节](workflows.md#4-修改歌曲)。不改动所属歌单，文档里写了 `playlistIds` 会报错（退出码 `2`）。

输出：`{ok: true, id, url}`。

### `koiro song create --file FILE`

需要 `upload`。用文档新建一首歌，先上传文档引用的封面和音频，再创建。文档必须写全所有字段，见 [song-document.md](song-document.md)；缺字段时在上传前就报错（退出码 `2`）。输出：`{ok: true, id, url}`。

退出码 `7` 时歌曲可能已经创建，先搜索确认再决定是否重试。

### `koiro song delete SONG`

需要 `upload`，并且是这首歌的创建者（有 `admin` 时不限）。删除歌曲及其全部音频版本、歌词，并把它移出所有歌单。不可恢复。输出：`{ok: true, id}`。

### `koiro song download SONG --out FILE [--version NAME] [--force]`

需要 `download`。下载一个音频版本的原始文件。

| 选项             | 含义                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `--out FILE`     | 必填，保存路径（相对于当前目录）。内容是原样的音频文件，扩展名请按用户的要求或常见格式选择 |
| `--version NAME` | 版本名，默认下载默认版本。不存在时退出码 `5`，`details.versions` 列出可选版本名            |
| `--force`        | 覆盖已存在的 `--out`；不加时文件已存在就退出码 `2`                                         |

先写入临时文件，完成后再改名，中断不会留下半个文件。输出：`{ok: true, path, version, sizeBytes}`。

## 歌单

### `koiro playlist list [--page N | --all]`

需要 `view`。按更新时间从新到旧列出歌单，每页 20 个：每项 `{id, name, description, coverUrl, songCount, owner, updatedAt, url}`，`owner` 是创建者 `{id, displayName, avatarUrl}`。

### `koiro playlist view PLAYLIST [--page N | --all]`

需要 `view`。输出 `{playlist: {id, name, description, coverUrl, songCount, owner, updatedAt, url}, songs: <分页的歌曲摘要>}`，歌曲按歌单中的顺序排列。

### `koiro playlist create --name NAME (--cover-file FILE | --cover-url URL) [--description TEXT | --description-file FILE]`

需要 `upload`。新歌单的创建者就是当前用户。

| 选项                                   | 含义                                             |
| -------------------------------------- | ------------------------------------------------ |
| `--name`                               | 必填，歌单名                                     |
| `--cover-file` / `--cover-url`         | 必填其一，封面：本地图片，或由站点下载的网络图片 |
| `--description` / `--description-file` | 可选，简介                                       |

输出：`{ok: true, id, url}`。新歌单是空的，用 `playlist add` 加歌。

### `koiro playlist edit PLAYLIST [--name NAME] [--cover-file FILE | --cover-url URL] [--description TEXT | --description-file FILE]`

需要 `upload`，并且是这个歌单的创建者（有 `admin` 时不限）。只修改传入的项，至少传一项。`--description ''` 清空简介。输出：`{ok: true, id}`。

### `koiro playlist delete PLAYLIST`

需要 `upload`，并且是这个歌单的创建者（有 `admin` 时不限）。删除歌单，其中的歌曲不受影响。不可恢复。输出：`{ok: true, id}`。

### `koiro playlist add PLAYLIST SONG...`

需要 `upload`，并且是这个歌单的创建者（有 `admin` 时不限）；加的歌不必是自己创建的。按给出的顺序把歌曲追加到歌单末尾。已在歌单里的、不存在的、重复给出的歌曲会跳过。输出：`{ok: true, added, skipped}`。

```sh
koiro playlist add <PLAYLIST> <SONG1> <SONG2> https://<站点>/songs/<UUID3>
```

### `koiro playlist remove PLAYLIST SONG`

需要 `upload`，并且是这个歌单的创建者（有 `admin` 时不限）。把一首歌移出歌单（不删除歌曲）。歌曲不在歌单里时退出码 `5`。输出：`{ok: true}`。

### `koiro playlist reorder PLAYLIST SONG...`

需要 `upload`，并且是这个歌单的创建者（有 `admin` 时不限）。按给出的顺序重排歌单。必须**恰好**列出歌单里的每一首歌各一次，否则站点拒绝（退出码 `8`），歌单保持不变。输出：`{ok: true}`。

```sh
koiro playlist view <PLAYLIST> --all --json   # 取得当前全部歌曲
koiro playlist reorder <PLAYLIST> <ID3> <ID1> <ID2> …
```

## staff 与语种

### `koiro staff list`

需要 `view`。所有参与者，按参与的歌曲数从多到少：`{items: [{name, songCount, crewSongCount, roles: [{role, songCount}]}]}`。`crewSongCount` 是以「演唱」以外的角色参与的歌曲数（同一首歌担任多个这样的角色只算一次）；唱过几首看 `roles` 里「演唱」的 `songCount`。

### `koiro staff view NAME [--page N | --all]`

需要 `view`。输出 `{staff: {name, songCount, crewSongCount, roles}, songs: <分页的歌曲摘要>}`。名字按精确写法匹配，不存在时退出码 `5`。

### `koiro language list`

需要 `view`。`{items: [{language, songCount}]}`：每个语种代码，及有歌词标注了该语种的歌曲数。

### `koiro language view CODE [--page N | --all]`

需要 `view`。输出 `{language, songs: <分页的歌曲摘要>}`，歌曲总数见 `songs.total`。`CODE` 不是站点定义的语种时退出码 `2`，`details.languages` 列出可选代码。

## 本地工具

### `koiro lyrics from-lrc FILE`

不联网、不需要站点和登录。把 LRC 转成歌词行：`{lines: [{startMs, endMs, spans}]}`，可以直接放进歌曲文档的 `lines`。`FILE` 为 `-` 时从标准输入读。规则见 [workflows.md 第 6 节](workflows.md#6-编写歌词)。

用于先检查、修改转换结果（例如加注音），再写进歌曲文档的 `lines`。不需要修改时，直接在文档里写 `lrcFile` 更简单。
