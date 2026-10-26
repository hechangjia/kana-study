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

界面回归：`node --test tests/ui-refine.test.cjs` 和 `node tests/ui-refine-browser.cjs`；浏览器环境配置同上，支持 `STUDY_URL` 和 `UI_TEST_OUTPUT` 指定目标及报告目录。


## 发音、听音辨认与专注模式
练习页顶部可切换“看字认读 / 听音辨认”，打开或关闭“答对后播放发音”，以及进入专注。
- 答对后播放默认为开启；完整播放结束后换题。失败时可重试或直接下一题；关闭开关恢复快速连练。
- 听音辨认先点击“播放本题”，后续题目自动播放。页面刷新不会自动发声；首次听题后再输入罗马音。听题、重播不算提示；查看答案、看笔顺或错误订正仍计入辅助。
- 听音题按读音去重，完整208项字库对应101种读音。o/wo、ji/di/zi、zu/du等同音写法合并接受；字形认读保持原来的判定规则。
- 专注模式收起页头、统计、范围和来源设置，保留模式、播放开关、答题与必要按钮。可随时点击“退出专注”或按 Escape。模式、发音开关和专注状态只保存在当前浏览器。
- 切换练习模式或范围会重置本轮统计，并停止之前的播放。

新增验证：`node --test tests/drill-audio.test.cjs tests/practice-modes.test.cjs`、`node tests/practice-modes-browser.cjs`、`node tests/practice-modes-real.cjs`。
浏览器测试沿用 PLAYWRIGHT_MODULE、CHROME_PATH、DRILL_URL，可用 MODE_TEST_OUTPUT 设置证据目录。前者模拟异常与状态转换，后者实际播放DJT与之前录音并检查 ended 时机。
