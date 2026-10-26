# 五十音手帖

中文界面的日语假名学习页，使用 HTML、CSS 和 JavaScript，无需构建。

**在线使用：https://kana.662613.xyz/**

- 平片假名共208张字卡，支持切换、对照和搜索。
- 认读练习：四类范围、按行选择、输入罗马音自动判定、发音和笔顺提示，记住练习范围。
- 动态笔顺、逐笔播放、PNG/GIF/SVG素材与手写练习。
- 默认DJT Kana发音，208张字卡均可听音；可切换之前的Fukujinzuke/Tofugu录音。
- 拗音33组提供笔顺、图像和完整录音。
- 下载仓库后直接打开 index.html，也可离线使用。

## GitHub Pages
从 `main` 分支的根目录发布；无外部构建依赖。

## 来源与授权
笔顺和程序：LGPL-3.0-or-later；Fukujinzuke录音：CC BY 4.0。
Tofugu录音版权属于Tofugu LLC，站点所有者已确认拥有本次公开发布授权；不因此向其他使用者授予通用再分发许可。
DJT录音作者和再分发许可未核实，不归入程序或其他素材的许可证。
逐项来源见 sources.html、manifest.json 和 LICENSE.md。各类素材的许可分别适用。

## 开发与验证
浏览器打开 index.html 即可运行。素材导出脚本见 tools/README.md。
verification.json 记录发布前的程序化检查，不代表全部录音经过人工听审。


## 认读练习
首页顶部进入“认读练习”，也可直接打开 drill.html。四步范围逐渐包含平假名、平假名拗音、片假名、片假名拗音。
支持常见罗马音别名。答对自动换题；错误答案仅在提交后提示；提示、听音、笔顺辅助后完成的题单独计数。
范围保存在当前浏览器；改变范围或刷新会重置本轮统计。音频方案与字表共用，不需要网络或账户。
玩法参考 DJT Kana，独立实现代码，复用现有208项字库（每种文字71个单音、33个拗音）。

### 测试
- 纯逻辑：`node --test tests/drill.test.cjs`（只需 Node.js）。
- 浏览器：安装 Playwright 及 Chromium 后运行 `node tests/drill-browser.cjs` 和 `node tests/drill-coverage.cjs`。
- 可选环境变量：`PLAYWRIGHT_MODULE` 指向已安装模块，`CHROME_PATH` 指向浏览器程序；`DRILL_URL` 可验证已部署网页，`DRILL_TEST_OUTPUT` 指定测试证据目录（默认系统临时目录）。
- 浏览器测试验证自动答题、IME、统计、四组/按行选择、录音切换、空范围、存储失败、手机布局和完整208题覆盖。
