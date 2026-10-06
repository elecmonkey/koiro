# 歌曲文档

`song export` 输出、`song update` / `song create` 读入的 JSON，即站点接口的 `SongInput`。`song create` 另外多一个字段 `playlistIds`（见下）。先读 [workflows.md](workflows.md) 的第 4、5、6 节了解修改和新建的流程。

## 完整结构

```json
{
  "title": "歌名",
  "description": "简介，可为空字符串",
  "coverObjectId": "<上传得到的封面 ID>",
  "staff": [
    { "role": "作词", "names": ["甲"] },
    { "role": "作曲", "names": ["乙", "丙"] }
  ],
  "versions": [
    {
      "name": "主版本",
      "objectId": "<上传得到的音频 ID>",
      "isDefault": true,
      "lyricsName": "原文"
    },
    {
      "name": "伴奏",
      "objectId": "<…>",
      "isDefault": false,
      "lyricsName": null
    }
  ],
  "lyrics": [
    {
      "name": "原文",
      "isDefault": true,
      "languages": ["ja"],
      "lines": [
        {
          "startMs": 10500,
          "endMs": 14000,
          "spans": [
            { "type": "ruby", "base": "君", "ruby": "きみ" },
            { "type": "text", "text": "の" },
            { "type": "ruby", "base": "声", "ruby": "こえ" },
            { "type": "text", "text": "が" }
          ]
        },
        {
          "startMs": 14000,
          "endMs": null,
          "spans": [{ "type": "text", "text": "聞こえる" }]
        }
      ]
    }
  ]
}
```

## 字段

**所有字段都必须写出来**，没有缺省值：没有简介写 `""`，没有歌词写 `[]`。缺字段时脚本在上传任何文件之前就报错（退出码 `2`），`details.missing` 列出缺的字段。这样 `update` 不会因为漏写某个字段而悄悄清空数据。

### 顶层

| 字段            | 类型   | 说明                                                                    |
| --------------- | ------ | ----------------------------------------------------------------------- |
| `title`         | 字符串 | 去掉首尾空白后不能为空                                                  |
| `description`   | 字符串 | 可以为空字符串                                                          |
| `coverObjectId` | 字符串 | 已上传封面的 ID，原样保留 `export` 给出的值；也可以改写成下面的本地输入 |
| `staff`         | 数组   | 可以为空，见下                                                          |
| `versions`      | 数组   | 至少一项，见下                                                          |
| `lyrics`        | 数组   | 可以为空，见下                                                          |

**所属歌单不在文档里。** 歌曲在哪些歌单里由歌单一侧管理（`playlist add` / `playlist remove`），`song update` 不会改动；`update` 的文档里写了 `playlistIds` 会直接报错。只有 `song create` 多一个必填字段 `playlistIds`：创建后要加入的歌单 ID 数组，追加到这些歌单末尾，不加入任何歌单写 `[]`；只能加入自己的歌单（ADMIN 不限）。

封面可以不写 `coverObjectId`，改写 `coverFile`（本地图片）或 `coverUrl`（网络图片，由站点下载），提交前自动上传。

### `staff[]`

| 字段    | 类型       | 说明                                                 |
| ------- | ---------- | ---------------------------------------------------- |
| `role`  | 字符串     | 角色，如"作词""作曲""编曲""演唱""调教""PV"；不能为空 |
| `names` | 字符串数组 | 担任这个角色的所有人；至少一人，姓名不能为空         |

- 首尾空白会被去掉。
- 同一个人在所有歌曲中要用同一种写法，网站据此聚合。写之前用 `staff list` 或 `song search <名字>` 查已有写法。
- 顺序会保留，按网页上希望显示的顺序排列。

### `versions[]`

| 字段         | 类型            | 说明                                                                  |
| ------------ | --------------- | --------------------------------------------------------------------- |
| `name`       | 字符串          | 版本名，在这首歌内唯一，不能为空                                      |
| `objectId`   | 字符串          | 已上传音频的 ID，原样保留 `export` 给出的值；也可以改写成 `audioFile` |
| `isDefault`  | 布尔            | 是否默认版本；**恰好一个**为 `true`                                   |
| `lyricsName` | 字符串或 `null` | 播放这个版本时显示的歌词，填 `lyrics[].name`；不绑定写 `null`         |

- `audioFile` 是本地音频路径，提交前自动上传，代替 `objectId`。支持 `.mp3` `.m4a` `.aac` `.flac` `.wav` `.ogg` `.oga` `.opus`，单个文件不超过 500 MB。
- `update` 时按 `name` 对应已有版本：名字不变则保留原版本（ID 不变，只更新内容）；文档里没有的版本会被删除。
- 数组顺序就是网页上的显示顺序。
- `lyricsName` 必须是同一份文档里存在的歌词名，否则提交失败。

### `lyrics[]`

| 字段        | 类型       | 说明                                                 |
| ----------- | ---------- | ---------------------------------------------------- |
| `name`      | 字符串     | 歌词名，在这首歌内唯一，不能为空，如"原文""中文翻译" |
| `isDefault` | 布尔       | 是否默认歌词；有歌词时**恰好一份**为 `true`          |
| `languages` | 字符串数组 | 语种代码，只能用 `koiro help` 列出的几种             |
| `lines`     | 数组       | 歌词行，见下；也可以改写成 `lrcFile`                 |

- `lrcFile` 是本地 LRC 文件路径，提交前在本地转换，代替 `lines`。
- `update` 时按 `name` 对应已有歌词：名字不变则保留原歌词（ID 不变，音频版本对它的绑定也保持）；文档里没有的歌词会被删除，绑定它的音频版本必须同时改掉 `lyricsName`。
- 改歌词名时，同时修改所有引用它的 `versions[].lyricsName`。
- 数组顺序就是网页上的显示顺序。

### `lyrics[].lines[]`

| 字段      | 类型          | 说明                                               |
| --------- | ------------- | -------------------------------------------------- |
| `startMs` | 整数          | 开始时间，毫秒，不能为负                           |
| `endMs`   | 整数或 `null` | 结束时间，毫秒，不能早于 `startMs`；没有写 `null`  |
| `spans`   | 数组          | 这一行的内容，按顺序拼接；空数组表示空行（如间奏） |

- 行必须按 `startMs` 从小到大排列（相同的时间可以并列）。
- `spans` 的每一项是以下两种之一：
  - `{ "type": "text", "text": "…" }`：普通文字；
  - `{ "type": "ruby", "base": "…", "ruby": "…" }`：带注音的文字，`ruby` 标在 `base` 上方。
- 文字都不能为空，也不能包含换行：一行歌词就是一个带时间的行。

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
    { "role": "作词作曲", "names": ["甲"] },
    { "role": "演唱", "names": ["乙"] }
  ],
  "versions": [
    {
      "name": "主版本",
      "audioFile": "main.flac",
      "isDefault": true,
      "lyricsName": "原文"
    },
    {
      "name": "伴奏",
      "audioFile": "inst.flac",
      "isDefault": false,
      "lyricsName": null
    }
  ],
  "lyrics": [
    {
      "name": "原文",
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
  "name": "中文翻译",
  "isDefault": false,
  "languages": ["zh"],
  "lrcFile": "translation.lrc"
}
```

把 `versions` 里"伴奏"的 `lyricsName` 改为 `"原文"`。然后：

```sh
koiro song update <SONG> --file song.json
koiro song view <SONG> --json
```

核对：`lyrics` 多了"中文翻译"，原有歌词和其他字段不变，"伴奏"的 `lyricsId` 指向"原文"的 `id`。

## 示例：给一句歌词加注音

导出后找到这一行，把需要注音的词拆成单独的 `ruby` 片段：

```json
{
  "startMs": 10500,
  "endMs": null,
  "spans": [{ "type": "text", "text": "君の声が" }]
}
```

改为：

```json
{
  "startMs": 10500,
  "endMs": null,
  "spans": [
    { "type": "ruby", "base": "君", "ruby": "きみ" },
    { "type": "text", "text": "の" },
    { "type": "ruby", "base": "声", "ruby": "こえ" },
    { "type": "text", "text": "が" }
  ]
}
```
