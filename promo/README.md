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

画面引用 `web/assets/crest.svg` 与 `web/assets/raincourt-poster.svg`。

## 重新渲染

需要 Node.js 20+ 与支持 WebCodecs 的 Google Chrome 或 Chromium，不需要安装额外依赖。

```bash
node promo/render.mjs
```

输出 `web/media/promo/magaambya-promo.webm` 与封面 `poster.webp`，整片渲染约需数分钟。其他用法：

```bash
node promo/render.mjs --stills=5,27,58.5 --out=/tmp/promo-stills
node promo/render.mjs --audio --out=/tmp/promo-audio
```

前者导出指定秒数的 PNG 画面，后者只导出配乐 WAV。Chrome 不在 PATH 中时，用 `CHROME=/path/to/chrome` 指定；以 root 身份运行时可设置 `CHROME_NO_SANDBOX=1`。

## 内容说明

设定参考 Paizo《Pathfinder》中玛甘比学院、老法师贾特比（Old-Mage Jatembe）、十魔将与纳塔穆博的公开资料，学派译名与站内一致。十张兽面、塔楼与院徽外圈均为本项目的原创演绎，并非官方形象。
