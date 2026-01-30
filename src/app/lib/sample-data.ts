export const playlists = [
  {
    id: "list_01",
    name: "晨雾拾音",
    description: "轻柔的人声与钢琴，适合清晨与雨天。",
    cover: "#a3b18a",
    songCount: 8,
  },
  {
    id: "list_02",
    name: "街灯下的录音",
    description: "有点旧、有点暖，适合夜里慢放。",
    cover: "#b5838d",
    songCount: 12,
  },
  {
    id: "list_03",
    name: "风与合成器",
    description: "潮湿的空气和合成器低频。",
    cover: "#8ecae6",
    songCount: 6,
  },
  {
    id: "list_04",
    name: "未分类",
    description: "还没有被归类的单曲。",
    cover: "#adb5bd",
    songCount: 3,
  },
];

export const songs = [
  {
    id: "song_01",
    title: "玻璃海",
    staff: { 作词: "张三", 作曲: "李四", 演唱: "王五" },
    description: "漂浮在薄雾里的嗓音与低频脉冲。",
    cover: "#cdb4db",
    duration: "04:12",
    playlistIds: ["list_01"],
    versions: {
      default: "obj_default_01",
      "人声版": "obj_vocal_01",
      "伴奏版": "obj_inst_01",
    },
  },
  {
    id: "song_02",
    title: "雨声电台",
    staff: { 作词: "阿紫", 编曲: "Koiro Lab", 演唱: "夏月" },
    description: "收音机噪声与雨滴采样交织。",
    cover: "#90be6d",
    duration: "03:58",
    playlistIds: ["list_02"],
    versions: {
      default: "obj_default_02",
    },
  },
  {
    id: "song_03",
    title: "夜航",
    staff: { 作曲: "Sora", 演唱: "Yun" },
    description: "一首给长途旅行的慢歌。",
    cover: "#f28482",
    duration: "05:01",
    playlistIds: ["list_02", "list_03"],
    versions: {
      default: "obj_default_03",
      Live: "obj_live_03",
    },
  },
  {
    id: "song_04",
    title: "花火线",
    staff: { 作词: "凉", 作曲: "凉", 演唱: "凉" },
    description: "逐渐升温的合成器和碎拍。",
    cover: "#f6bd60",
    duration: "03:34",
    playlistIds: ["list_03"],
    versions: {
      default: "obj_default_04",
    },
  },
];

export const searchResults = [
  {
    id: "song_01",
    title: "玻璃海",
    match: "标题匹配",
    snippet: "漂浮在薄雾里的嗓音与低频脉冲...",
  },
  {
    id: "song_02",
    title: "雨声电台",
    match: "歌词匹配",
    snippet: "雨声像一台旧电台，重复你的名字...",
  },
  {
    id: "song_03",
    title: "夜航",
    match: "Staff 匹配",
    snippet: "作曲：Sora / 演唱：Yun",
  },
];

export const lyricsPreview = [
  "[00:12] 君の声が",
  "[00:18] 世界を変える",
  "[00:26] ひかりが溶けてゆく",
];

export const adminPlaylists = [
  {
    id: "list_01",
    name: "晨雾拾音",
    songs: 8,
    updatedAt: "2026-01-12",
  },
  {
    id: "list_02",
    name: "街灯下的录音",
    songs: 12,
    updatedAt: "2026-01-09",
  },
  {
    id: "list_03",
    name: "风与合成器",
    songs: 6,
    updatedAt: "2026-01-03",
  },
];
