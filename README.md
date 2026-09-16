# 雨庭书院 · 玛甘比入学来信

这是一次从零组织玩家界面与三维场景的新实现，不是上一版 WebGL 适配器的改名。默认三维代码直接使用 Three.js 0.180.0，原有招募题库与 Node API 在新界面中继续使用。设计说明在 `docs/DESIGN.md`，浏览器画册在根目录 `DESIGN.html`。

## 启动

安装 Node.js 20 或以上版本，在项目目录执行：

```bash
npm install
npm start
```

打开 `http://127.0.0.1:3001`。Windows 也可以双击 `start.bat`；它会在依赖缺失时先执行 npm 安装。Linux 与 macOS 可以执行 `./start.sh`。请通过本地 HTTP 服务访问，不要双击 `web/index.html`。

开发启封词为 `jatembe`。主持人入口为 `/admin`，开发管理口令为 `change-me`。公开部署前必须替换管理口令和签名密钥。这个新工程不带旧项目的来信记录，题目与材料则保留原内容。

首次安装需要访问 npm。当前交付环境未能下载 Three.js，因此 ZIP 不包含 `node_modules` 或生成后的 `web/vendor`。安装脚本会校验依赖版本，并把需要的两个官方模块及许可证复制到 `web/vendor`。安装完成后，应用的运行资源均由本站提供，不需要 CDN、远程字体或外部图片服务。

只运行 `node server/app.js` 可以在未安装 Three.js 时查看静态庭院和完整问卷/API；这不是三维模式，也不是三维验收方式。正常体验应先执行 `npm install`。

## 配置与数据

把 `.env.example` 复制为 `.env`，通过 `npm start` 启动以读取配置。`PORT` 默认 3001，`HOST` 默认 127.0.0.1。公开服务设置 `NODE_ENV=production`，并提供至少 12 个字符的 `ADMIN_PASSPHRASE` 和至少 32 个字符的 `MAGIC_SCHOOL_SECRET`。生产模式缺少这些配置时会拒绝启动。

可用以下命令生成随机签名密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

题库、收信设置与来信分别保存在 `server/data/exam-content.json`、`settings.json` 和 `submissions.json`。应备份整个数据目录。`MAGIC_DATA_DIR` 可以指定独立数据目录；使用 `npm start` 时，首次启动会补充缺失的默认题库、设置和空来信文件，不覆盖已经存在的数据。直接启动 `server/app.js` 时，需要事先准备好该目录。

后台使用原子文件替换和单进程写入队列。请只运行一个服务进程，不要让多个容器或 PM2 cluster 同时修改同一组 JSON 文件。题库替换会改变版本并使旧答题凭据失效；同一个答题凭据重复提交会返回原记录，避免网络重试生成重复来信。

管理员口令优先读取环境变量，不会被前端接口返回。不要把 `.env`、真实来信或私人批注提交到公开仓库。开发模式未设置签名密钥时，每次重启会使旧凭据失效，这是预期行为。

## 构建与部署

```bash
npm run build
```

构建会检查 Three.js 版本、整理同源资源、生成 `dist` 和包含 SHA-256 的资源清单。设置 `SERVE_DIST=1` 后通过同一 Node 服务运行。只把 `dist` 上传到纯静态托管不能替代 API：启封、验题、最终提交和主持人管理都需要后台。

Docker 方式需要能够下载 Node 基础镜像和 npm 依赖。将生产密钥写入 `.env` 后执行：

```bash
docker compose up -d --build
```

Compose 默认只把服务映射到本机 `127.0.0.1:3001`，数据使用命名卷持久化。通过 Caddy、Nginx 等反向代理提供 HTTPS。Docker 构建和实际部署在本次环境中没有执行，配置文件作为部署入口交付，不计入已通过测试。

应用对登录和启封有单进程 IP 频率限制，故意不信任任意客户端传来的转发 IP 标头。经反向代理访问时，限流可能按代理地址聚合；正式部署可在可信反向代理层按真实来源限流，不应直接信任开放的 `X-Forwarded-For`。

## 设计与文件位置

`web/app.js` 负责七阶段玩家流程和 DOM，`web/style.css` 负责书页、场景覆盖层与响应式布局。`web/admin.js` 与 `admin.css` 是主持人界面。`web/lib` 包含草稿与状态机、API、音景及公共 DOM 工具。

`web/scene/scene.js` 管理 Three.js 场景、镜头、生命周期和画质；`models.js` 是信匣、信封、封蜡与书桌；`courtyard.js` 是庭院建筑、实例化植物与风；`textures.js` 生成材质贴图；`water.js` 管理反射；`compositor.js` 管理轻景深与亮部合成；`batch.js` 对静态部分按材质合批。

`web/assets` 保存原创 SVG 标记、植物图版和静态庭院。图版可通过 `node scripts/art.mjs` 重新生成。没有外部美术、模型或字体下载步骤。改变题库请使用档案室，不必直接编辑前端模板。

## 检查与测试

```bash
npm run check
npm test
```

Node 测试会复制数据到临时目录，不写入正式来信文件。安装 Three.js 后会额外执行实际几何与开合测试；没有依赖时，该测试明确标记跳过，不冒充通过。测试不包括 GPU 渲染。

浏览器测试需要 Python 与 Playwright。先启动一个使用测试数据的独立服务，然后运行 `tests/browser_flow.py`。设置 `LIVE_BROWSER=1` 时使用正常 HTTP 导航与真实浏览器存储；未设置时使用为受限环境准备的 about:blank 夹具。默认测试服务地址为 `http://127.0.0.1:3107`，可通过 `TEST_ORIGIN` 修改。浏览器测试会创建和批阅测试来信，不能指向正式服务。

本次已经执行的结果与未验证项详见 `docs/TESTING.md`。特别注意：本次未取得 Three.js 引擎依赖，未做 GPU 场景运行验收。画册中的庭院图是静态回退，不能视为三维效果实拍。
