# 雨庭书院 · 玛甘比入学来信

面向 Pathfinder《万千之力》（Strength of Thousands）团务招募的互动问卷网站。玩家走进雨后庭院，启封学院来信、阅读材料并完成入学问卷；主持人在档案室中收取来信、记录批注和管理题库。

项目使用原生 JavaScript、Three.js 0.180.0 与 Node.js，数据保存为本地 JSON 文件，无需配置数据库，适合单个跑团的小规模部署。

## 功能

- **入学仪式**：三维庭院、信匣与拆信动画，串联抵达、启封、阅读、书写、核对和回执流程。
- **问卷与草稿**：启封词验证、客观题校验、分组问答、本机草稿保存，以及草稿导入与导出。
- **来信提交**：提交前核对内容与阅览授权，保存成功后生成回执，同一答题凭据重复提交不会产生重复记录。
- **主持人档案室**：查看来信、保存状态和批注，编辑与导入导出题库，修改启封词和暂停收信。
- **显示与音景**：响应式书页、画质设置、减少动态与静态模式，以及可开关的本地背景音乐。三维不可用时仍可填写问卷。

<img width="1841" height="979" alt="PixPin_2026-09-16_18-23-33" src="https://github.com/user-attachments/assets/d464b6f1-9579-4155-9bfc-0f24dcc1c3c2" />
<img width="1743" height="974" alt="PixPin_2026-09-16_18-23-48" src="https://github.com/user-attachments/assets/fbc3d2b9-7d10-4047-8e59-070f829ed569" />
<img width="1587" height="970" alt="PixPin_2026-09-16_18-24-18" src="https://github.com/user-attachments/assets/73a69117-cca7-4fe7-bef8-c40db853c0e0" />
<img width="1860" height="979" alt="PixPin_2026-09-16_18-24-35" src="https://github.com/user-attachments/assets/5c296534-875e-4e72-aa25-87b686014b71" />
<img width="1803" height="964" alt="PixPin_2026-09-16_18-24-53" src="https://github.com/user-attachments/assets/e38eb232-677c-45a6-94bb-8cc4a5b0ef2b" />
<img width="1795" height="982" alt="PixPin_2026-09-16_18-25-08" src="https://github.com/user-attachments/assets/eeb91ef4-6d61-4069-a62c-0d305d4f81da" />

## 本地启动

安装 Node.js 20 或以上版本，在项目目录执行：

```bash
npm install
npm start
```

| 入口 | 地址 | 默认口令 |
| --- | --- | --- |
| 玩家页面 | http://127.0.0.1:3001 | 启封词 `jatembe` |
| 主持人档案室 | http://127.0.0.1:3001/admin | 管理口令 `change-me` |

默认口令仅用于本地体验，公开部署前请修改。启封词可在档案室设置中调整，管理口令建议通过环境变量设置。

Windows 可以双击 `start.bat`，Linux 与 macOS 可以执行 `sh start.sh`；这些脚本在本地缺少依赖和已整理的引擎文件时会自动安装依赖。请通过 HTTP 地址访问，不要直接打开 `web/index.html`。

首次安装需要联网下载依赖。安装脚本会校验 Three.js 版本，将运行模块和许可证复制到 `web/vendor/`。之后页面资源由本站提供，不依赖 CDN、远程字体或外部图片服务。

## 配置

将根目录的 `.env.example` 复制为 `.env`，按需修改后执行 `npm start`。已有的进程环境变量优先于 `.env`。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 监听地址；需要从其他设备访问时可设置为 `0.0.0.0` |
| `PORT` | `3001` | HTTP 端口 |
| `NODE_ENV` | 未设置 | 公开部署设置为 `production` |
| `ADMIN_PASSPHRASE` | 使用数据文件中的口令 | 生产模式必填，至少 12 个字符 |
| `MAGIC_SCHOOL_SECRET` | 启动时生成临时密钥 | 凭据签名密钥；生产模式必填，至少 32 个字符 |
| `MAGIC_DATA_DIR` | `server/data/` | 数据目录，可指定独立的持久化目录 |
| `SERVE_DIST` | 未设置 | 设置为 `1` 时提供构建后的 `dist/` 资源 |

可用以下命令生成随机签名密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

生产模式下，管理口令或签名密钥长度不足会拒绝启动。开发时未固定签名密钥，重启服务后原有登录和答题凭据会失效，需要重新登录或启封。

## 主持人使用

1. 进入 `/admin`，使用管理口令登录档案室。
2. 检查题库与阅读材料，按团务需求编辑题目，或导入已有题库。
3. 设置启封词并开启收信，将玩家入口和启封词提供给参与者。
4. 查看已提交的来信，更新状态和批注；招募结束后可暂停收信。

更新题库会改变题库版本，旧答题凭据将失效，玩家需要重新启封。本机草稿会保留，但不等同于已提交的来信；只有收到服务器回执才表示提交成功。

## 数据与备份

默认数据目录为 `server/data/`：

| 文件 | 内容 |
| --- | --- |
| `exam-content.json` | 题库与阅读材料 |
| `settings.json` | 站点名称、启封词、收信开关等设置 |
| `submissions.json` | 玩家来信、状态与主持人批注 |

使用 `MAGIC_DATA_DIR` 时，`npm start` 会补齐缺失的默认题库、设置及空来信文件，不覆盖已有文件。直接执行 `node server/app.js` 时，需要自行准备数据目录。

建议停止服务后备份整个数据目录，同时妥善保存部署配置。不要将 `.env`、真实来信或私人批注提交到公开仓库。

后端使用原子文件替换与单进程写入队列。**同一数据目录只运行一个服务进程**，不支持多个容器或 PM2 cluster 共同写入。

## 构建与部署

### Node.js 部署

安装依赖后执行：

```bash
npm run build
```

构建会重新生成 `dist/`，复制前端资源，并生成包含 SHA-256 校验值的 `dist/build-manifest.json`。

在 `.env` 中设置 `NODE_ENV=production`、`ADMIN_PASSPHRASE`、`MAGIC_SCHOOL_SECRET` 和 `SERVE_DIST=1`，然后执行 `npm start`。按访问方式配置监听地址与反向代理，通过 HTTPS 对外提供服务。

启封、题目校验、提交和档案室都依赖 Node API，不能仅将 `dist/` 上传到纯静态托管。

### Docker Compose 部署

在根目录 `.env` 中设置 `ADMIN_PASSPHRASE` 和 `MAGIC_SCHOOL_SECRET` 后执行：

```bash
docker compose up -d --build
```

构建需要下载 Node 基础镜像和 npm 依赖。Compose 自动启用生产模式和构建资源，默认映射到宿主机 `127.0.0.1:3001`；`.env` 中的 `PORT` 可修改宿主机端口。数据持久化到命名卷 `raincourt-data`，备份时应包含该卷。通过 Caddy、Nginx 等反向代理对外提供 HTTPS。

应用对登录和启封有单进程 IP 频率限制，故意不信任任意客户端传来的转发 IP 标头。经反向代理访问时，限流可能按代理地址聚合；正式部署可在可信反向代理层按真实来源限流，不应直接信任开放的 `X-Forwarded-For`。

## 项目结构与定制

```text
web/
  app.js              玩家流程与问卷界面
  admin.js            主持人档案室
  lib/                API、草稿、状态机与音景
  scene/              Three.js 场景、模型、材质与渲染
  assets/             SVG 插图、标记与本地音乐
server/
  app.js              HTTP 服务入口
  router.js           API 与静态资源路由
  controllers/        玩家与管理端请求处理
  services/           题库、设置、来信与凭据逻辑
  data/               默认 JSON 数据
  tests/              后端测试
scripts/              启动、资源整理、构建与检查脚本
tests/                状态、场景与浏览器流程测试
docs/                 设计、测试记录与第三方内容说明
```

题库优先通过档案室维护。玩家与主持人界面样式分别位于 `web/style.css` 和 `web/admin.css`。

背景音乐文件为 `web/assets/music/replace-me.ogg`，可替换为有权使用的 OGG 音频；使用构建资源部署时，替换后需重新构建。

## 开发与测试

| 命令 | 用途 |
| --- | --- |
| `npm start` | 读取 `.env`、准备运行资源并启动服务 |
| `npm run dev` | 监视后端文件变化并自动重启 |
| `npm run check` | 检查 JavaScript 语法和首页 HTML 约束 |
| `npm test` | 运行 Node 单元测试与 API 测试 |
| `npm run build` | 整理依赖并生成前端发布目录 |

`npm run dev` 直接启动 `server/app.js`，**不会读取 `.env`、整理 Three.js 资源或初始化自定义数据目录**。使用前应完成安装，并通过进程环境提供所需配置。

Node 测试使用临时数据目录，不写入正式来信文件。Three.js 几何与开合测试需要已安装依赖；依赖缺失时会标记跳过。这些测试不覆盖实际 GPU 渲染。

浏览器流程脚本为 `tests/browser_flow.py`，需要 Python、`tests/requirements.txt` 中的依赖和可用的 Chromium。先启动使用独立测试数据的服务，再执行脚本。设置 `LIVE_BROWSER=1` 时使用正常 HTTP 导航与真实浏览器存储；未设置时使用 `about:blank` 测试夹具。默认服务地址为 `http://127.0.0.1:3107`，可通过 `TEST_ORIGIN` 修改。

浏览器脚本使用默认口令 `jatembe` 和 `change-me`，测试服务配置需与之匹配。脚本会创建和批阅来信、写出截图及报告，不能指向正式服务。

## 相关文档与内容说明

- [设计说明](docs/DESIGN.md)：视觉语言、场景实现与交互设计。
- [设计画册](DESIGN.html)：项目界面与设计展示。
- [测试记录](docs/TESTING.md)：对应交付时的测试环境、结果与验证边界，不代表当前版本的全部验证状态。
- [第三方内容说明](docs/THIRD_PARTY.md)：依赖与背景设定的权利说明。

本项目是非官方团务工具，不代表获得 Paizo 授权或背书。Pathfinder、Strength of Thousands、Magaambya 等名称与设定归相应权利人所有；Three.js 使用其自身的 MIT 许可证。
