# 五十音手帖

中文界面的日语假名学习页，使用 HTML、CSS 和 JavaScript，无需构建。

**在线使用：https://kana.662613.xyz/**

- 平片假名共208张字卡，支持切换、对照和搜索。
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
