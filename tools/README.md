# 素材导出源码

普通使用不需要运行这些脚本。网页代码与笔画数据已完整保存在上级目录。

`render.cjs` 从 manifest.json 中的笔画外形和中线生成 PNG 与动画帧；`make_gifs.py` 将帧转为循环 GIF。
所需开发依赖：Node.js + playwright；Python + Pillow；本机 Chrome。
`CHROME_PATH` 环境变量可指定 Chrome 可执行文件路径。依赖由使用者在独立开发环境安装，交付包不携带浏览器或第三方运行时。
在 tools 目录依次执行 `node render.cjs` 和 `python make_gifs.py`。
中间帧写入 tools/.frames。已有结果默认跳过；重生成请先备份原文件，再由使用者移开待重生成的 PNG/GIF/帧文件。
原笔顺SVG及其许可在 assets/svg-original 和 licenses。导出文件对源图进行了配色、编号、网格和拗音排版改编，采用相同的 LGPL-3.0-or-later 许可。
