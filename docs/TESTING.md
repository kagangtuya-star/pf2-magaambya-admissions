# 验证记录

验证日期为 2026 年 9 月 15 日。执行环境为 Linux、Node.js 22.16.0、Python Playwright 1.57.0 和容器内 Chromium。以下数字来自随包保留的原始输出，不把跳过的检查记作通过。

## 已执行的检查

JavaScript 静态检查覆盖 44 个模块，语法错误为 0。检查对象包括玩家界面、主持人界面、场景与着色器容器代码、服务器、构建脚本和 Node 测试；该检查不能代替 GLSL 编译或 Three.js 导入后的实际执行。输出见 `syntax-check.txt`。

Node 测试共 53 项，其中 52 项通过、0 项失败、1 项跳过。覆盖状态机、草稿过滤、长度限制、存储异常、输入转义、必答检查、启封与管理鉴权、题库版本、真实持久化、重复提交、批阅、请求大小限制和登录频率限制。过期凭据从核对页返回启封页的路径也有状态机测试。完整 TAP 输出见 `node-tests.tap`。

唯一跳过的是实际 Three.js 几何与开合测试，原因是当前环境无法下载引擎依赖。安装依赖后，它会导入真正的 Three.js r180，检查网格坐标、箱盖角度、信封动作、实例数量及合批前后的包围盒；它仍然不是 GPU 渲染测试。

浏览器执行了 29 项交互检查，全部通过，收集到的未捕获错误为 0。覆盖桌面与 390 像素宽移动布局、学院五支弹窗与 Escape、错误启封词、揭封、署名必填、错误客观题、服务端验题、必答长文、输入转义、提交确认、真实回执与下载，以及主持人登录、阅信、批注、题库编辑入口和设置读取。结果见 `browser-results.json`。

另有 19 个前端源资源经真实本地 HTTP 服务逐一获取，并与磁盘源文件核对字节和 SHA-256，全部一致。详见 `http-assets.json`。它们是当前源资源，不是已经安装 Three.js 并完成生产构建后的资源总数。

## 浏览器验证的边界

运行环境不允许浏览器正常导航到本地 HTTP 地址，因此本次使用 about:blank 测试夹具。页面资源和请求由测试执行器转发到真实本地 Node 服务，没有修改浏览器策略。API 提交与批阅使用真实服务器，不是假回执。

夹具中的 localStorage 与 sessionStorage 是内存替身。因此浏览器草稿操作被覆盖，但关闭浏览器后的真实持久化、常规导航、CSP 实际执行效果、移动键盘遮挡、Safari 和真实手机 GPU 没有得到这组结果的证明。正常环境可通过 `LIVE_BROWSER=1` 使用实际导航和浏览器存储重新执行。

截图中的庭院使用静态 SVG 回退；书页、输入框、问卷和管理界面是实际前端 DOM。不能把这些截图标注为 Three.js GPU 场景实拍。部分批阅与回执截图含自动化测试输入，是测试留档，不是种子来信；交付的数据文件已经清空。

## 未执行的验收

当前环境无法取得 Three.js npm 依赖。Three.js 场景运行、GLSL 编译、反射与景深效果、资源释放后的显存变化、真实帧率和设备分档效果均未在 GPU 上验证。生产资源构建和 Docker 构建也没有执行。几何、着色器和部署源代码已经提供，但不应将其表述为已经完成跨设备验收。

项目没有实现或交付 GLB 导出、WebGPU 渲染、光线追踪、物理流体模拟或摄影测量资产。这些不属于本版本能力。

## 复验

安装 Node.js 20 或以上版本，在项目目录运行：

```bash
npm install
npm run check
npm test
npm run build
npm start
```

正常进入庭院后，应确认 `window.__RAINCOURT__.stats.revision` 为 `180`，而非静态模式；这只是开发者控制台中的诊断对象，不会显示在玩家页面。再验证轻盈、均衡、细腻三档，启封与抽信、窗口缩放、隐藏与恢复标签页，以及静态庭院开关。遇到错误可查看控制台，表单不应因渲染不可用而消失。

浏览器测试只应连接独立测试数据，不能指向正式服务。先在独立项目副本中启动端口 3107，再安装浏览器测试依赖。

```bash
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
```

Linux 或 macOS 可执行：

```bash
PORT=3107 npm start
# 在另一个终端运行
LIVE_BROWSER=1 python tests/browser_flow.py
```

Windows PowerShell 可执行：

```powershell
$env:PORT = '3107'
npm start
# 在另一个终端运行
$env:LIVE_BROWSER = '1'
python tests/browser_flow.py
```

`TEST_ORIGIN` 可以改测试地址，`CHROMIUM_EXECUTABLE` 可以指定系统浏览器路径。未指定路径时，Linux 优先使用现有 `/usr/bin/chromium`，其他环境使用 Playwright 安装的浏览器。浏览器用例默认采用静态庭院，以隔离表单回归与 GPU 验收；Three.js 场景需要上述独立检查。
