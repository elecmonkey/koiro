# 歌曲文档

`song export` 输出、`song update` / `song create` 读入的 JSON。先读 [workflows.md](workflows.md) 的第 4、5、6 节了解修改和新建的流程。

## 完整结构

```json
{
  "title": "歌名",
  "description": "简介，可为空字符串",
  "coverObjectId": "<上传得到的封面 ID>",
  "staff": [
    { "role": "作词", "name": ["甲"] },
    { "role": "作曲", "name": ["乙", "丙"] }
  ],
  "versions": [
    {
      "name": "主版本",
      "objectId": "<上传得到的音频 ID>",
      "isDefault": true,
      "lyricsKey": "原文"
    },
    { "name": "伴奏", "objectId": "<…>", "isDefault": false, "lyricsKey": null }
  ],
  "lyrics": [
    {
      "key": "原文",
      "isDefault": true,
      "languages": ["ja"],
      "lines": [
        {
          "startMs": 10500,
          "endMs": 14000,
          "text": "君/の/声/が",
          "rubyByIndex": { "0": "きみ", "2": "こえ" }
        },
        { "startMs": 14000, "text": "聞こえる" }
      ]
    }
  ],
  "playlistIds": ["<歌单 UUID>"]
}
```

## 字段

### 顶层

| 字段            | 类型       | 必填 | 说明                                               |
| --------------- | ---------- | ---- | -------------------------------------------------- |
| `title`         | 字符串     | 是   | 去掉首尾空白后不能为空                             |
| `description`   | 字符串     | 否   | 缺省为空                                           |
| `coverObjectId` | 字符串     | 是*  | 已上传封面的 ID，原样保留 `export` 给出的值        |
| `coverFile`     | 字符串     | 是*  | 本地图片路径，代替 `coverObjectId`，提交前自动上传 |
| `coverUrl`      | 字符串     | 是*  | 网络图片地址，代替 `coverObjectId`，由站点下载     |
| `staff`         | 数组       | 否   | 缺省为空，见下                                     |
| `versions`      | 数组       | 是   | 至少一项，见下                                     |
| `lyrics`        | 数组       | 否   | 缺省为空，见下                                     |
| `playlistIds`   | 字符串数组 | 否   | 缺省为空，即不属于任何歌单                         |

\* 封面三选一：写了 `coverFile` 或 `coverUrl` 时忽略 `coverObjectId`；`coverFile` 和 `coverUrl` 都写时用 `coverFile`。

**再次提醒：`update` 时缺省 = 清空。**`staff`、`lyrics`、`playlistIds`、`description` 不写就会被清空，所以修改时必须从 `export` 的输出开始。

### `staff[]`

| 字段   | 类型       | 说明                                               |
| ------ | ---------- | -------------------------------------------------- |
| `role` | 字符串     | 角色，如"作词""作曲""编曲""演唱""调教""PV"；可为空 |
| `name` | 字符串数组 | 这个角色的所有人；也接受单个字符串                 |

- 姓名去掉首尾空白，空的姓名被丢弃；角色和姓名都为空的项被丢弃。
- 同一个人在所有歌曲中要用同一种写法，网站据此聚合。写之前可以用 `staff list --include-singles` 或 `song search <名字>` 查已有写法。
- 顺序会保留，按网页上希望显示的顺序排列。

### `versions[]`

| 字段        | 类型            | 必填 | 说明                                          |
| ----------- | --------------- | ---- | --------------------------------------------- |
| `name`      | 字符串          | 是   | 版本名，在这首歌内唯一，不能为空              |
| `objectId`  | 字符串          | 是*  | 已上传音频的 ID，原样保留 `export` 给出的值   |
| `audioFile` | 字符串          | 是*  | 本地音频路径，代替 `objectId`，提交前自动上传 |
| `isDefault` | 布尔            | 否   | 是否默认版本                                  |
| `lyricsKey` | 字符串或 `null` | 否   | 播放这个版本时显示的歌词，填 `lyrics[].key`   |

\* 二选一，写了 `audioFile` 时忽略 `objectId`。

- `audioFile` 支持 `.mp3` `.m4a` `.aac` `.flac` `.wav` `.ogg` `.oga` `.opus`，单个文件不超过 500 MB。
- `update` 时按 `name` 对应已有版本：名字不变则保留原版本（只更新其内容）；文档里没有的版本会被删除。
- 默认版本：多个 `isDefault: true` 时只保留第一个；都没有时第一项成为默认。数组顺序就是网页上的显示顺序。
- `lyricsKey` 必须是同一份文档里存在的歌词 `key`，否则提交失败。

### `lyrics[]`

| 字段        | 类型       | 必填 | 说明                                               |
| ----------- | ---------- | ---- | -------------------------------------------------- |
| `key`       | 字符串     | 是   | 歌词版本名，在这首歌内唯一；空字符串会变成"未命名" |
| `isDefault` | 布尔       | 否   | 是否默认歌词，规则与音频版本相同                   |
| `languages` | 字符串数组 | 否   | 语种代码，只能用 `koiro help` 列出的几种           |
| `lines`     | 数组       | 是*  | 歌词行，见下                                       |
| `lrcFile`   | 字符串     | 是*  | 本地 LRC 文件路径，代替 `lines`，提交前在本地转换  |

\* 二选一，写了 `lrcFile` 时忽略 `lines`。

- `update` 时按 `key` 对应已有歌词：`key` 不变则保留原歌词版本（音频版本对它的绑定也保持）；文档里没有的歌词版本会被删除，绑定它的音频版本必须同时改掉 `lyricsKey`。
- 改 `key` 时，同时修改所有引用它的 `versions[].lyricsKey`。

### `lyrics[].lines[]`

| 字段          | 类型   | 必填 | 说明                                                                    |
| ------------- | ------ | ---- | ----------------------------------------------------------------------- |
| `startMs`     | 整数   | 是   | 开始时间，毫秒，不能为负                                                |
| `endMs`       | 整数   | 否   | 结束时间，毫秒，不能早于 `startMs`                                      |
| `text`        | 字符串 | 否   | 这一行的文字；有注音时用 `/` 分段；可为空表示空行（间奏）；不能包含换行 |
| `rubyByIndex` | 对象   | 否   | 注音：键为分段序号字符串（`"0"` 起），值为读音                          |

- 行按数组顺序保存，按 `startMs` 从小到大排列。
- 分段时空的段会被丢掉：`"a//b"` 等同 `"a/b"`，序号按丢掉后的计算。
- 正文不能含 `/` 字符本身（它总被当成分段符）。
- 搜索用的纯文本是去掉注音、拼接分段、折叠空白后的结果，所以分段不影响搜索。

## 本地文件

`coverFile`、`audioFile`、`lrcFile` 的相对路径**以文档文件所在目录为基准**；文档从标准输入读入（`--file -`）时以当前目录为基准。

文件按以下顺序上传：封面 → 各个音频 → 提交歌曲。上传后服务端校验失败时，已上传的文件留在存储中无害，修正文档后重新执行即可（会重新上传）。

## 示例：新建

目录：

```text
new-song/
  song.json
  cover.jpg
  main.flac
  inst.flac
  lyrics.lrc
```

`song.json`：

```json
{
  "title": "歌名",
  "description": "",
  "coverFile": "cover.jpg",
  "staff": [
    { "role": "作词作曲", "name": ["甲"] },
    { "role": "演唱", "name": ["乙"] }
  ],
  "versions": [
    {
      "name": "主版本",
      "audioFile": "main.flac",
      "isDefault": true,
      "lyricsKey": "原文"
    },
    { "name": "伴奏", "audioFile": "inst.flac" }
  ],
  "lyrics": [
    {
      "key": "原文",
      "isDefault": true,
      "languages": ["zh"],
      "lrcFile": "lyrics.lrc"
    }
  ],
  "playlistIds": []
}
```

```sh
koiro song create --file new-song/song.json
```

## 示例：修改

为已有的歌加一份中文翻译，并让"伴奏"版本也显示原文歌词：

```sh
koiro song export <SONG> > song.json
```

在 `song.json` 中，`lyrics` 数组末尾加一项，其余内容不动：

```json
{
  "key": "中文翻译",
  "isDefault": false,
  "languages": ["zh"],
  "lrcFile": "translation.lrc"
}
```

把 `versions` 里"伴奏"的 `lyricsKey` 改为 `"原文"`。然后：

```sh
koiro song update <SONG> --file song.json
koiro song view <SONG> --json
```

核对：`lyrics` 多了"中文翻译"，原有歌词和其他字段不变，"伴奏"的 `lyricsId` 指向"原文"。
