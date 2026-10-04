# 学院宣传影像

一分钟的玛甘比学院宣传短片《歌风之城的来信》。画面与配乐全部由本目录的代码在浏览器中逐帧生成，不使用外部素材；成片位于 `web/media/promo/`，玩家在首页的“观看学院影像”或顶部导航“学院影像”中点击播放。

## 结构

| 文件 | 内容 |
| --- | --- |
| `timeline.js` | 画幅、帧率、各段落与配乐重音的共享时间轴 |
| `film.js` | 七段画面：雨夜法阵、老法师贾特比、十魔将、纳塔穆博、学院五支、言与道、雨庭与院徽 |
| `score.js` | 程序化配乐：雨声、卡林巴琴、彩色玻璃风铃、手鼓与铺底和声 |
| `webm.js` | 极简 WebM 封装（VP9 视频 + Opus 音频，含索引以便拖动进度） |
| `capture.js` / `film.html` | 在无头 Chrome 中渲染并用 WebCodecs 编码 |
| `render.mjs` | 启动本地服务与无头 Chrome，写出成片 |
| `normalize.mjs` | 将 Canvas 输出转为 BT.709 有限范围 VP9，兼容浏览器硬件解码；保留 Opus 配乐 |

画面引用 `web/assets/crest.svg` 与 `web/assets/raincourt-poster.svg`。

## 重新渲染

需要 Node.js 20+、支持 WebCodecs 的 Google Chrome 或 Chromium，以及包含 `libvpx-vp9` 编码器的 FFmpeg。无需新增 npm 依赖；导出静帧或 WAV 时不需要 FFmpeg。

```bash
node promo/render.mjs
```

输出 `web/media/promo/magaambya-promo.webm` 与封面 `poster.webp`，整片渲染约需数分钟。其他用法：

```bash
node promo/render.mjs --stills=5,27,58.5 --out=/tmp/promo-stills
node promo/render.mjs --audio --out=/tmp/promo-audio
```

前者导出指定秒数的 PNG 画面，后者只导出配乐 WAV。Chrome 不在 PATH 中时，用 `CHROME=/path/to/chrome` 指定；以 root 身份运行时可设置 `CHROME_NO_SANDBOX=1`。

FFmpeg 不在 PATH 中时，用 `FFMPEG=/path/to/ffmpeg` 指定。完整渲染会自动转换视频像素和色彩元数据，避免 Canvas 生成的全范围 VP9 在部分 Windows D3D11 解码器中首帧后黑屏。旧版成片可单独修复：

```bash
node promo/normalize.mjs /path/to/original-full-range.webm web/media/promo/magaambya-promo.webm
```

此命令用于原始全范围成片，不应重复用于已转换的有限范围文件。

## 内容说明

设定参考 Paizo《Pathfinder》中玛甘比学院、老法师贾特比（Old-Mage Jatembe）、十魔将与纳塔穆博的公开资料，学派译名与站内一致。十张兽面、塔楼与院徽外圈均为本项目的原创演绎，并非官方形象。
