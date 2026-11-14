# 浏览器里的 C++ 和 Python：cpp-wasm-playground

一个纯前端的 C/C++ 编译运行环境。左边 Ace 编辑器里写 `main.cc`，右边填 stdin，点一下按钮就在浏览器里完成 **clang 编译 → wasm-ld 链接 → 生成新的 wasm 模块 → 执行 → 输出 stdout/stderr**，退出码、编译耗时、运行耗时、内存峰值一起报出来。全程没有后端，没有任何代码上传。另一条路是点「编译并调试」：编译时在 LLVM IR 里插行桩和变量桩，跑起来后可以双击下断点、单步、按 10⁻ⁿ 调速，停住时鼠标悬在变量名上看它的当前值，数组会铺开前 50 个元素（整段都是可显示文字的 `char[]` 直接写成 `"hello"` 一句，不再一个一个报数）；循环变量、每轮都在改的数组这类要一直盯着的东西，可以加进编辑器下方的「观察」窗，每停一行刷一次，数组按那一列的宽度尽量铺开。标题可点击跳转到项目主页（新标签页打开，不打断当前编译状态），工具链体积等说明文字收在标题的悬停 tips 里；标题右侧一个「白天」复选框切换深 / 浅配色，连代码编辑器的语法主题一起换（夜晚 `one_dark` / 白天 `tomorrow`），选择记在 `localStorage`，下次进来沿用。

实现方式是 **clang 和 lld 自己被编译成 WebAssembly**，在页面的 Worker 里当"宿主程序"跑，而不是把 g++ 搬进浏览器。g++ 搬不进来的原因是结构性的：它依赖 GCC 内部库和 configure 阶段对宿主环境的一堆探测结果，这些东西在 wasm 里复现不了；本项目的工具链整体来自 LLVM。

右边那块输出框还能当画布用：源码里写 `#include <goc.h>`（或老教材的 `#include "logo.h"`），GoC 的那套画笔 API 就在——`pen.fd(100)` 走、`pen.rt(90)` 转、`pen.c(3)` 换色，画在 stdout 背后那块 800×800 的画布上，`speed` 是货真价实的一段一段动画，`pause()` 等的是画布上的一次点击。机制和单步调试是同一套（编译出来的 wasm 调宿主导入函数，Worker 里攒批递给主线程），所以两者能叠着用：笔尖正走到一半按下暂停也照样停得住，悬停在 `x` `y` `angle` 上读到的就是笔的真实位置。详见「GoC 画图」一节。

工具条最左边是一个**语言**下拉框，目前两项：`C++`（clang.wasm 现场编译链接）和 `Python`（自托管的 Pyodide 解释器）。加 Python 不只是为了多一门语言，更重要的是把主流程改成**只认一张语言登记表**（`js/langs.js`）：按钮文案、工具条哪些字段该显示、示例集、诊断阶段叫什么、产物怎么交给运行侧、能不能单步调试、超时那句怎么说，全部从登记表读，`main.js` 里不再留 C++ 专有的硬编码。加第三门语言的代价因此是「一个编译 worker（解释器型可以编译运行合一）+ 一份示例集 + 登记表里加一项」，而不是把页面重写一遍。详见下面「多语言与扩展点」和「Python 支持做到哪一步」。

## 快速开始

Worker 和 `fetch('*.wasm')` 在 `file://` 下都会被浏览器拦掉，所以必须走 http。项目自带一个只依赖 Python 标准库的小服务器：

```bash
cd cpp-wasm-playground
python3 serve.py 8765
# cpp-wasm-playground  ->  http://127.0.0.1:8765/index.html
```

然后打开 <http://127.0.0.1:8765/index.html>，等状态栏从"正在初始化工具链…"变成绿点的"工具链就绪"。首次要下载约 60 MB 工具链（页头写的 58 MB 是按 MiB 算的同一个数），就绪耗时页面自己会报在那行里（实测 HTTP 缓存和浏览器 wasm 代码缓存都命中时是 0.1 秒，冷启动主要耗在下载上）。之后 `assets/` 和 `vendor/` 走一年长缓存，再开基本秒就绪。

下拉框切到 `Python` 是另一条独立的装载路径：首次约 12 MB（`pyodide.asm.wasm` 8.6 MB + `python_stdlib.zip` 2.4 MB + 胶水 1 MB），同样落在 `/assets/` 的长缓存里，第二次打开约 3 秒就绪（实测 `解释器就绪（3.1 s，Python 3.13.2 / Pyodide 0.29.5）`）。两套工具链各装各的，切来切去不用重新下载。

换任何静态服务器都行，只要注意四点：`.wasm` 建议给 `application/wasm` 这个 MIME（给错了两条路都兜得住：C++ 侧退回「先收完整字节再编译」，Python 侧把同一个 body 流重包成正确类型继续流式编译，见 `py.worker.js` 的 `fixWasmMime`——能用，但配置该修还得修）；如果加了 CSP，必须允许 `'wasm-unsafe-eval'`（或 `'unsafe-eval'`），否则 wasm 编译本身会被拒；要用单步调试就必须带上 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`（`serve.py` 已经带上了）——没有这两个响应头就没有跨源隔离，`SharedArrayBuffer` 拿不到，调试器停不住；**而这两个头只在安全上下文里有效**：`http://公网域名` 下加满了头也不会有 `SharedArrayBuffer`，必须是 `https://`，或本机的 `http://localhost` / `http://127.0.0.1`。这条是 nginx 部署最容易踩的，见下面「部署建议」。

## 界面与操作

| 控件 | 作用 |
| --- | --- |
| 语言 | `C++` / `Python`。切换时把当前语言的源码、stdin、观察窗名单各自存一份（`localStorage` 按语言分键，C++ 沿用不带后缀的老键，别的语言加 `.py` 之类后缀），来回切不丢。配色、字号、BGM 是全站偏好，不分语言。按钮文案、工具条字段、示例集、状态栏那格的叫法（编译耗时 / 语法检查，内存峰值 / 解释器堆）跟着换，详见下面「多语言与扩展点」 |
| 示例 | C++ 78 个预置用例，下拉框按课程章节分成 21 组（`optgroup`）：慢速演示 / 排序（插入-冒泡-快排对比、归并 + 逆序对）/ 线性表（顺序表插入删除 + 二分、手写单链表逆置 + 快慢指针）/ 栈与队列（括号匹配 + 逆波兰求值、循环队列 + 约瑟夫环）/ 树（先中后序 + 层序、BST 插入删除 + 高度、合并果子堆）/ 图（邻接表 DFS/BFS、Dijkstra 最短路、并查集连通块）/ 查找与字符串（KMP next 表、散列表除留余数 + 拉链法）/ 竞赛风格（万能头演示）/ STL / 基础 / 演示 / 堆 / 哈希 / 回溯 / 复杂度 / 数组技巧 / 动态规划 / 贪心 / 数学与位运算 / 高级数据结构 / GoC 画图。选中即同时填好源码和 stdin，比较交换次数这类输出都能手算复核。「手工冒泡排序」内置 30 个数据、手写双重循环（425 次比较 / 214 次交换），行桩触发次数多、当前行在几行之间反复推进，最适配合「每行停留」看慢动作。Python 一套 70 个，章节分组和算法与 C++ 那套对齐（合并果子用 `heapq`、BST 用递归插入删除、万能头和 STL 那两项换成 `读入 stdin + 中文输出` / `递归 + 大栈` / 三个演示用例），同一个算法两边各写一遍，可以对着看两种写法差多少。倒数第二批 17 条摘自《Hello 算法》（https://www.hello-algo.com/）：数组的栈上/堆上初始化、链表与双向链表、列表增删改查、栈/队列/双向队列、优先队列（大顶堆/小顶堆）、哈希表与 `hash()`、二叉树与 AVL 树、回溯框架、时间与空间复杂度。书里给的是片段（没 `main`、不打印），这里都补成了能直接跑的完整程序，两边同名同分组，可以对着看 C++ 手写指针和 Python 用对象差在哪。**除「STL」组外，C++ 侧的容器一律换成普通数组**：顺序表自己带 `len`、堆是自己写的数组版上浮/下沉、哈希表是「下标串起来」的链、图的邻接表是 `int adj[N][MAXD]` 这样的定长二维数组，插入删除都靠把后面的元素挪位置；「STL」组留着 `vector`/`set`/`map`/`sstream`，那几条本来就是给人看容器本身的。**最后 33 条补的是算法主线**，选题对着 OI Wiki、GeeksforGeeks DSA Roadmap、VisuAlgo 章节表、国家高等教育智慧教育平台《数据结构与算法》大纲和《Hello 算法》目录查漏：选择/希尔/堆/计数/桶/基数排序，双指针、前缀和与差分、滑动窗口、静态链表、二维数组，单调栈/单调队列/中缀转后缀求值，哈夫曼树，前向星数组邻接表、Floyd、拓扑排序、Prim/Kruskal，开放定址哈希、Trie、Rabin-Karp，01 背包、完全背包、LCS、LIS、编辑距离，全排列、八皇后，活动选择与找零钱，两种素数筛、扩展欧几里得/快速幂、大整数阶乘，树状数组与线段树。C++ 侧一律定长数组 + 下标：堆是数组上浮下沉、链表是游标 `next[]`、图是 `head/to/nxt` 三条数组、Trie 是 `nxt[节点][字母]`、DP 是 `dp[][]` 或滚动数组，不出现 `vector`/`queue`/`new`；Python 侧同名同分组用 `list` 对照。这 33 条全部用项目自带的 clang.wasm 编译链接成 wasm 后实跑过、Python 侧用 CPython 3.13 实跑过，两边输出逐条比对一致。**最后一组 6 条是 GoC 画图**（`#include <goc.h>`，见下面「GoC 画图」一节）：坐标、角度、递归 + `save/load`、图形全家福、`rand` + `pause`、极坐标 + 文字，一条一个知识点，同样是逐条编译执行过、并且回读画布像素确认「这个颜色真的落在了这个位置」 |
| 标准 | `-std=c++11` / `c++14` / `c++17`（默认）/ `c++2a`。`c++11` 对着 HUSTOJ 判题机那条命令行；工具链是 LLVM 8 年代，`c++2a` 只覆盖到该快照已实现的部分 |
| 优化 | `-O0` ～ `-O3`，默认 `-O0`。教学场景里默认不优化：单步停在的行号、悬浮看到的变量值都和源码一一对应（`-O2` 下变量被合并、循环被切开，行桩会跳来跳去）。要跑大数据压时间就手动切 `-O2`；「编译并调试」不受这个下拉框影响，本来就固定 `-O0 -g` |
| 额外 cc1 参数 | 原样拼进 `clang -cc1`，默认 `-Wall -DONLINE_JUDGE`。`-DONLINE_JUDGE` 与 HUSTOJ 判题机同一条命令行，代码里 `#ifdef ONLINE_JUDGE` 的那一支（不 `freopen`、不打印多余提示）在这儿也走得到，删掉它就切回本地那一支。可加 `-Wextra`、`-DNDEBUG` 之类 |
| 栈大小 | 链接参数 `-z stack-size`，默认 8 MB；深递归用例可调到 64 MB |
| 字号 | 源码编辑器字号，12 / 13 / 14（默认）/ 16 / 18 / 20 / 24 px，选完立刻生效并记进 `localStorage`，刷新保留。投影演示建议 16 px 以上 |
| BGM | 复选框，默认开。调试时把**当前执行行的个位**弹成一个音符：个位 1 = C 大调中音 do（C4），2..7 依次 re mi fa sol la si，8 / 9 / 0 接着往高八度走（C5 D5 E5）。取消勾选就静音，选择记进 `localStorage`；勾上的当下会响一声作为确认。只有「编译并调试」有声——普通「编译并运行」没有行号可跟 |
| 运行超时(ms) | 看门狗时长，默认 5000。到点直接终止运行用的 Worker。**只作用于「编译并运行」**，「编译并调试」不设超时。程序一旦开始画图，这一格从「总共跑多久」改成「多久没动静」，否则 `speed` 的分段动画会被自己的慢动作砍掉（见上面「GoC 画图」一节）。Python 那边被终止的是常驻解释器 Worker，不是单独一个运行进程，所以页面随后会立刻自动重新装入解释器（状态栏会再报一次「解释器就绪」），下一次运行照旧 |
| 编译并运行 | `Ctrl+Enter`（macOS `Cmd+Enter`）。Python 那一侧按钮写成「运行」，但走的仍是「先 `compile()` 查语法、再把字节码交给解释器执行」两步，所以语法错误照样当场报，不会跑一半才崩 |
| 编译并调试 | `Ctrl+Shift+Enter`（macOS `Cmd+Shift+Enter`），见下面「单步调试」一节。Python 本期禁用，按钮 `title` 里写明缺哪几块（登记表字段 `debugWhy`） |
| 停止 | `Ctrl+.` 或 `Esc` |
| 热力状态条 | 只在跑过一次「编译并调试」后出现，位于源码编辑器上方：色阶图例 + 「已标 N 行，最热第 X 行 × M 次」+「清除」按钮。见下面「单步调试」一节的热力背景 |
| 观察窗 | 源码编辑器下方一行常驻的面板：输入框填**表达式**（回车或点「添加」）加入观察，`a[i]`、`a[10]`、`a[j] > a[j+1]`、`*p`、`m[1][2]`、`&x`、`(double)x/n` 都算；单个标识符有 `<datalist>` 补全（来自插桩变量表），式子过长（>80 字符）或语法不通会当场说明。右侧 × 移除、「清空」全撤，最多 24 个。名单存 `localStorage['cpp-playground.watch']`，下次开会话还在。每停一行刷一次值，数组铺开多少个**由这一列的实际宽度现量**（列宽就多铺，挤不下靠省略号收尾，一行始终只占一行高；量不出宽度时退回固定 8 个，完整的 50 个看悬停框），整段都是可显示文字的 `char[]` 直接写成 `"hello"` 一句（同样按宽度铺，量不出宽度才给 64 个字符）。见下面「单步调试」一节的观察窗与表达式求值 |
| 重载工具链 / 重载解释器 | 清空输出并重建当前语言的常驻 Worker（改了工具链或 Pyodide 目录里的文件时用）；按钮文案由登记表给 |
| 清空输出 | 输出框右上角的红色小按钮，同时清掉 stdout/stderr 和字符计数；开着 GoC 画图时连画布一起擦掉、收回去 |

左侧是 Ace 编辑器（主题跟着「白天 / 夜晚」复选框走：夜晚 `one_dark`、白天 `tomorrow`；C/C++ 模式、带补全弹窗），编辑器下面挂着观察窗（只在调试会话里有值，平时显示「会话未开始」），右侧从上到下是 stdin 40%、状态栏 10%、输出 50%。源码和 stdin 会存进 `localStorage`，刷新不丢。

状态栏四个格子分别是**退出码**（编译失败时显示 clang/wasm-ld 的退出码，「编译并运行」超时显示 `TLE`；调试会话不设超时，不会出现 `TLE`）、**编译耗时**、**运行耗时**、**内存峰值**（用户 wasm 实例线性内存的最终大小）。编译期诊断和运行期输出走同一条字节通道，统一解码后追加到输出框。这四格的名字有两格随语言变（登记表的 `buildMetric` / `memLabel`）：Python 那边第二格叫**语法检查**（量的就是 `compile()` 那一步），第四格叫**解释器堆**——CPython 的内存不是"用户模块的线性内存"，报的是整个 Pyodide 堆，量的是同一块 wasm 内存但口径完全不一样，所以名字必须换，不然和 C++ 的 8 MB 栈那种数摆在一起会被误读。

## 单步调试（断点 / 调速 / 看变量）

点「编译并调试」进入。这条路和「编译并运行」共用工具链，只是编译参数换成固定的 `-O0 -g`，产物多三个由 JS 实现的环境函数（`__pg_trace` 行桩、`__pg_var` 标量快照、`__pg_addr` 地址登记），而且链接多带 `--shared-memory`——观察窗要按地址读用户内存，内存必须是一块 `SharedArrayBuffer`（详见下面「表达式求值」一节）。

**它是怎么停住的**：`clang -cc1 -emit-llvm -debug-info-kind=standalone` 先出 LLVM IR 文本，驱动层解析 `!DILocation` / `!DISubprogram` / `!DILocalVariable` / `!DIBasicType` 这些元数据，在每个源码行边界插一条 `call void @__pg_trace(i32 行号)`，给每个局部变量插一条 `call void @__pg_var(i32 id, i32 lo, i32 hi)`（值从 `llvm.dbg.declare` 绑定的那个栈槽 alloca 里 `load` 出来，64 位拆成高低两个 i32），再给每个**住在内存里**的变量插一条 `call void @__pg_addr(i32 id, i32 首地址, i32 元素字节数, i32 元素个数)`（地址由 `ptrtoint <allocaTy> %slot to i32` 拿到；标量是「栈槽地址 + 4/8 字节 + 1 个」，本地数组是「首元素地址 + 元素宽度 + 元素个数」，引用和值留在寄存器里的形参发不出地址，就不发），然后再 `-emit-obj` → `wasm-ld --allow-undefined`。这两个函数在运行 Worker 里是真正的 JS 回调，控制块是一块 `SharedArrayBuffer`；行桩里用 `Atomics.wait` **把 wasm 的执行真的冻在当前那一行**，主线程写 `GO` 再 `Atomics.notify` 才往下走——不是靠定时器猜位置。

| 操作 | 说明 |
| --- | --- |
| 双击行号 / `Ctrl+B` | 增删断点，装订线上一个红点 |
| 下一行 | 单步：走一个行桩就再停住 |
| 暂停 | 让下一次行桩触发时停住 |
| 继续 | 跑到下一个断点，或者跑到程序结束 |
| 退出调试 | 终止运行 Worker，编辑器恢复可写。调试条原本常驻的那一大段说明（断点、悬停、观察窗、调速、SAB 前提、BGM、热力）**收进了这个按钮的悬停浮层**：鼠标放到按钮上（或键盘 `Tab` 到它）才显示，调试条收回一行 40 px，不再把编辑器顶下去半屏。实现是纯 CSS：浮层 `#dbghint` 是按钮**后面的兄弟**，显隐用 `#dbg-quit:hover ~ #dbghint`，`.dbgbar` 给 `position: relative` 让它相对整条定位、`left/right: 18px` 铺满整条宽度（挂在按钮自己下面会从按钮那一侧伸出去，窗口窄一点就横向溢出看不见尾巴），`pointer-events: none` 保证指针滑进文字里也不会把这段当成按钮点下去。之所以不用原生 `title`：700 字的 `title` 在 Chrome 里会被压成一长条、还可能被截，而且 `<code>` 的排版全丢 |
| 每行停留 | 执行一行源码额外等的时间：1 s / 0.5 s / 0.2 s（默认）/ 10⁻¹ ～ 10⁻⁶ s / 全速。亚毫秒档位是欠账累计满 1 ms 才真睡一次（`Atomics.wait` 带超时），不空转烧 CPU。这个下拉框放在顶部工具条（不在只有会话才显示的调试条里），**点「编译并调试」之前就能先选好**，会话建立时以它为准；进入调试后随时改也立刻生效 |
| 运行超时 | 调试会话**不受**顶部「运行超时(ms)」约束，一个看门狗都不装：跑多久都不会被判超时，慢速走完长循环、乃至死循环都由你自己用「停止 / 退出调试」结束 |

当前执行行用 Ace 的 `screenLine` marker 铺满整行宽（`fullLine` 只铺到行尾内容，短行几乎看不见），运行中是蓝色、停住是琥珀色，左边一条色条，装订线的行号同时染色。**注意自定义 marker 类必须自己写 `position: absolute`**：Ace 的 CSS 只给它认识的那几个 marker 类设了绝对定位，自定义类不设的话 `top` 不生效，高亮条会贴在编辑区第一行上。

**画面自动跟着执行行**：编辑器不用手滚。程序**停住**的那一行直接 `gotoLine` 过去，光标一并落到那一行——这样停在当前行上直接悬停变量名就能看值，不必先把画面找回来。全速/降速**跑动**时只在当前行跑出视野才滚，而且只滚画面、不动光标：每行都拽一下的话，人正在看的那段会被顶走。这里两个 API 都挂在 `Editor` 上，不是 `renderer`：`isRowVisible(row)` 内部读 `getFirstVisibleRow()` / `getLastVisibleRow()`，`scrollToLine(row, center, animate)` 收的是 **0 基行号**（它把 row 直接喂给 `$cursorLayer.getPixelPosition`），传 `line - 1`。

**看变量**：程序停住时把鼠标放到源码里的变量名上，浮动框给出 `名字 : 类型 = 值`。覆盖 POD——整型（含 `long long`，按高低位拼回）、浮点、指针（显示线性内存地址）、`bool`、`char`（同时给字符和数值），`int&` 这类引用会多插一次 `load` 显示被引用对象的值。`std::string`、容器、结构体只报名字和类型、不展开内容，**定长数组会展开**：浮动框给前 50 个元素（`{ 0, 1, 4, 9, … }`，不够 50 个就全给，多余的末尾补一句「…（共 N 个）」）；**元素是 `char` 的数组先看它像不像一句话**——整段都是可显示文字就直接写成 `"hello"`（详见下面「字符数组什么时候算字符串」），掺了控制字符才退回逐个元素报数；可见性按「声明行 ≤ 当前行」判定，所以刚停在声明行上时多半显示"本行声明，可能还没赋值"。**同名变量按声明行取最靠近当前行的那个**：一个函数里写两个 `for (int i ...)` 就是两个 alloca、两个 id，插桩的名单是按函数收集的，出了作用域那个照样挂在当前行上；按名单顺序取第一个会读到死变量的旧值（实测冒泡用例停在第 25 行时，输入打印那趟的 `i` 停在 30，把真正的 `i = 0` 盖掉了），所以 `liveVarsAt` 比较声明行、后声明的顶掉先声明的。快照调用排在行桩之前，因此停在某行看到的是**这一行开始前**的值，符合"这行还没执行"的直觉。

**观察窗（watch）**：悬停一次只能看一个名字，但循环变量、每轮都在改的数组、正在比较的那对元素是要一直盯着的，所以编辑器下方常驻一栏面板，把**表达式**钉住、每个 tick 刷一次值：`a[i]`、`a[10]`、`a[j] > a[j+1]`、`*p`、`p[0]`、`**pp`、`m[1][2]`、`&x`、`(double)x / n` 都能算（怎么算的见下面「表达式求值」一节）。式子和悬停共用同一套解码（`numFromBits` + `showVal`：标量读 `val` 槽，数组、指针、`&x` 按 `arr` 槽登记的地址读内存），所以口径也一致：停在某行时显示的是"这一行开始前"的值。名字怎么定位到变量，跟悬停同一个难点——同名可能有多个 alloca（一个函数里两个 `for (int i ...)`，或者别的函数里的同名变量），所以 `pickVar` 先查当前行的快照名单（`lineVars`），那里活着的那个才是人想看的东西；当前行没有它才退回全表按声明行挑最靠后的一个，面板标成琥珀色并在末尾写明是哪一种：`（x 不在当前行的快照名单里，按登记的地址读）`——读的是内存本身，值是这一行的真值，只是那个名字不属于当前作用域；`（n 当前行没快照到，是旧值）`——只有标量通道那份缓存、连地址都没登记的那种（值留在寄存器里的形参）。其余几种状态：`会话未开始`（灰）、`没有 g：本次构建的变量表里找不到它`（全局变量不在表里）、`x 当前行没有快照`（刚声明、或者分支压根没走到）、`x 的类型是 Node，结构体/类/未知类型本期读不了`、`这句看不懂：…`（加进名单时就当场拒）。数组在这里铺开**多少个由这一列的实际宽度现量**（见下面「一行放得下多少就铺多少」一节）：列宽了就多铺，窄了就少铺，挤不下靠省略号收尾，一行始终只占一行高——固定铺 50 个会把别的行顶出视野，固定铺 8 个又白占着一列宽度；量不出宽度时（拿不到 canvas、面板还没布局）退回 8 个，要看全的把鼠标放到源码里的变量名上（悬停框固定给前 50 个）；`char[]` 整段可显示就直接写成一句字符串，铺几个同样按宽度定（量不出宽度才给 64 个字符，见下面「字符数组什么时候算字符串」）。名单存 `localStorage['cpp-playground.watch']`（上限 24 个，一条最长 80 字符），输入框挂着 `<datalist>` 补全，选项来自插桩出来的变量表，所以每次插桩构建产物回来刷新一次——补全只给单个标识符，`a[i]` 这种下标要自己敲完；加进来先过一遍语法，`a[q]]`、`1,2` 这类当场说明哪里连不上，不会留一行看不懂的东西。**会话结束时面板不刷**，最后一次的观测值冻在那儿留着看，跟热力层一个待遇；新会话开场才统一归位成「等待执行…」。

**一行放得下多少就铺多少**：观察窗那一列以前固定铺 8 个元素，可面板实际有六七百像素宽，等宽字体下二十几个都塞得下，窗口拉大还能更多——所以现在按列宽现量。测量用 canvas 的 `measureText`（`js/main.js` 里的 `measurer`）：字体从那一列的 computed style 取一次、变了才重取，量文字全程不碰 DOM 布局；`refreshWatch` 开头把每一行的 `clientWidth` **一次读完**，再逐个写文本——读布局会强制同步重排，读和写交错着来就是每个 tick、每行一次。预算里连尾巴那句「…（共 N 个）」也算进去（先按宽度试到放不下，再回退到连尾巴也放得下的个数），另留 2 px 给亚像素抖动；再窄也至少给一个片段，不空着一行。一段最多试 `FIT_MAX = 200` 个片段：等宽列摆不下更多，也不值得为根本看不见的部分去读内存。量完还有一层 CSS 兜底——这类行挂上 `.fit1`，`.wrow.fit1 .wv { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`，字体没量准、列忽然变窄时靠省略号收尾，绝不让一行撑成两行把别的行顶出视野；错误说明那种长句子的行不挂 `.fit1`，照旧可以折行，信息不截。量不到宽度（列还没布局、`px = 0`，或者拿不到 canvas）就退回原来的定数：数组 8 个、字符 64 个。**悬停框不参与测量**，它是弹层、不占面板的高度，维持固定 50 个元素 / 200 个字符。

**数组展开：值是怎么从内存里读出来的**：标量的 `__pg_var(id, lo, hi)` 是把值当参数塞进行桩，数组没法这么办——一来插桩时不知道要传多少个（`long long v` 占两个 i32 已经是极限），二来 50 个元素的字节数远超三个槽。所以数组走另一条通道：插桩只登记 `__pg_addr(id, 首地址, 元素字节数, 元素个数)`，地址由 `ptrtoint [N x TY]* %a to i32` 拿到——栈上那个 alloca **本身就是**数组首地址，不用 `load`（`load` 一个 `[30 x i32]` 也不是合法指令）；元素个数和元素字节宽度直接从 alloca 的 LLVM 类型 `[30 x i32]*` 上读，多维数组按行优先摊平成一个一维（`[2 x [3 x i32]]` → `int[6]`）。**元素一个都不搬**，宿主只记这三个数。不搬的理由是内存本身就是共享的：调试构建链接时带了 `--shared-memory`，用户线性内存是一块 `SharedArrayBuffer`，运行 Worker 在每次 park 之前把它递给主线程（`makeTracer` 里调 `postSab()`，比的是 buffer 的**对象身份**——共享内存 grow 之后 `memory.buffer` 换成一块全新的 SAB，旧的不 detach、不清零，`byteLength` 看着还是老值，所以别改回按长度判重），主线程 `new DataView(sab)` 之后按地址读就行。少一份拷贝也少一份会过期的真相：悬停展开、观察窗的 `a[i]`、表达式里的 `*p` 读的都是内存本身，三处不可能打架；一次调用只写三格普通数，也就不需要再按「这一行会不会停住」设放行条件。这里有一份 wasm-ld 的实测结论要记着：`--import-shared-memory` 这个参数它压根不认，`--import-memory` 认但链出来的模块既没有 memory import 也没有 memory export（用不了），所以只能让 wasm-ld 自己定义这块共享内存再导出，`--max-memory` 取栈大小四倍、下限 256 MB、向上对齐到 64 KB 一页；代价是共享内存模块只能在跨源隔离的上下文里实例化，而 `doDebug()` 本来就先查过 `dbgSupported()`，没有 SAB 走不到这一步。普通「编译并运行」不走这条路，链的还是私有内存。读内存和读快照共用同一对解码函数（`numFromBits` + `showVal`），所以元素类型的显示规则和标量、和悬停完全一样；唯一的额外注意是 8 字节元素的高 32 位必须 `getInt32` 按有符号取，`numFromBits` 的 64 位分支靠 `BigInt(hi) << 32` 的符号扩展还原负数，用 `getUint32` 的话 `long long` 的 `-1` 会拼成 18446744073709551615（标量通道存的就是 `Int32Array`，天然带符号，没这个问题）。控制块的 `arr` 段因此只要每变量固定 `ARR_W = 3` 个 int32（`[0]`=首地址／栈槽地址、`[1]`=元素字节数、`[2]`=元素个数，`[2]` 为 0 就是「还没登记过」），512 个变量共 1536 格——比原来搬 50 个元素的 `ARR_W = 102` 小了整整两个数量级。`views()` 要校验大小并提示「请刷新页面」的原因不变：旧的 `js/dbgproto.js` 配上新的 `index.html`（或反过来）会算错段偏移。覆盖不到的：元素是结构体 / `std::string` 的数组仍然不展开（插桩不知道每个元素多大，交给 `obj`）；`int a[]` 这类形参在 `-O0` 下 clang 给的 DWARF 是 `pointer_type` 而不是 `array_type`，所以悬停只显示指针地址、不铺开元素，变长数组同理——但它的栈槽地址和「指向 `int`」都登记了，观察窗里 `a[i]`、`a[j+1]` 照样算得出来，走的是指针步长。地址是**按变量**登记的，不是按调用帧：递归函数每一层的数组各有各的 alloca，同一个 id 只会留下最后一次登记的那一份。

**字符数组什么时候算字符串**：`char s[16] = "hello"` 铺开成 `{ 'h' 104, 'e' 101, 'l' 108, 'l' 108, 'o' 111, 0, 0, 0 }` 谁也不想看，所以 `cellsText` 在铺元素之前先问一句「这段内存像不像一句话」，像就直接写成 `"hello"`（观察窗和悬停共用这一条判断，`isCharTy` → `charPieces` → 不成立才走原来的元素循环）。判定是**宁缺毋滥**的：元素类型是 1 字节整数（`char` / `unsigned char` / `int8_t`；`bool` 的 `kind` 是 `'bool'`，不会被误当成字符），从首地址读到**第一个 0** 为止（没有 0 就按定宽字段读到数组末尾或扫描上限），这段字节必须能被 `TextDecoder('utf-8', {fatal: true})` **严格**解出来，解出来的字符只允许可显示区，`\t` `\n` `\r` 例外——写成转义形式，`"` 和 `\` 也加反斜杠，不然一行放不平、引号也会看串。任何一个条件不满足（掺了 `0x01` 这种控制字符、字节不是合法 UTF-8、内存还没递过来）就返回 `null`，退回逐个元素报数：**报一屏乱码不如报数，所以不猜**。好处是中文也能直接读出来，`char zh[10] = "中文"` 显示成 `"中文"` 而不是 `{ -28, -72, -83, … }`。几个上限：面板一行铺多少个字符**由这一列的宽度现量**（见下面「一行放得下多少就铺多少」一节），量不出宽度时才退回固定的 `STR_WATCH_N = 64` 个；悬停框不参与测量，固定 `STR_TIP_N = 200` 个。截断了在末尾只补一句「…（共 N 个字符）」，不再重复「只显示前 k 个」——省略号本身已经说明没铺完，尾巴越短同一行塞得下的字符就越多；找结尾那个 0 最多扫 `STR_SCAN_MAX = 4096` 字节，被这个上限截断时长度说不准，措辞换成「至少」。有一个坑踩在这里：`TextDecoder.decode()` **拒绝挂在 `SharedArrayBuffer` 上的视图**（Chrome 直接抛 `The provided ArrayBufferView value must not be shared`），而调试构建的用户内存正好是 SAB，所以先把字节 `set` 进一份普通 `Uint8Array` 再解码——拷的规模由 `STR_SCAN_MAX` 兜住，不超过 4 KB。**没有**跟着扩到字符串的是指针：`char *p` 仍然只显示线性内存地址（`p[i]` 单个元素能算，把 `p` 整个当字符串读要先知道长度或找 0，本期不做）；`std::string` 维持原样，单个 `char` 元素（`s[0]`）走的还是标量那条 `showVal`，写成 `'h' 104`（`zh[1]` 这种落在多字节序列中间的字节只有数：`-72`）。

**表达式求值：观察窗怎么算 `a[i]`**：本期没有现成的求值器，所以在 `js/main.js` 里手写了一个**只读**的小 C++ 求值器，紧挨着 `arrCells` / `fmtVar`——读的是同一份内存、用的是同一对解码函数，宁可说「算不了」也不给第二个口径。三段：`tokenizeExpr` 词法（带后缀的整数／浮点、字符字面量、标识符、运算符；字符串字面量和 `++/--` 不给语法错，直接说清楚为什么不支持）、递归下降的语法（`BIN_LEVELS` 一层一个优先级，覆盖 `?:`、`||`、`&&`、`|`、`^`、`&`、`== !=`、`< <= > >=`、`<< >>`、`+ -`、`* / %`，一元 `- + ! ~ * &`、`(T)` 强制转换、后缀 `[]`、括号分组），`evalNode` 语义。式子解析一次存进 `astCache`（面板 50 ms 一轮询、最多 24 行，语法不该每趟重算）。中间量统一成 `{ty, val}`（右值）或 `{ty, addr}`（左值），`ty` 是 `normTy` 归一化过的 `{kind, bits, signed, name, bytes, elem?, dims?, pt?}`：数组的 `elem`/`dims` 来自插桩从 alloca 类型上读到的形状，指针的 `pt` 来自 DWARF 的 `pointer_type` 链，所以 `*p`、`p[i]`、`**pp`、`pp[0][1]` 能一路剥下去。`rvalue()` 优先用标量通道那份值（和悬停看到的是同一个数），没有值才按地址读内存；`decay()` 管数组衰减；`evalIdx` 故意**不先衰减**基址，否则 `m[i][j]` 会一步跨 4 字节而不是跨一行。整数全程 BigInt，`toTyBig` 截断并符号扩展，32 位以下按 C++ 的整型提升升到 `int`，64 位走 `long long`（wasm32 里 `long` 也是 32 位）。**不猜未定义行为**：除 0、对 0 取余、移位数超出位宽、NaN/inf 转整数，一律回一句「C++ 里这是未定义行为，观察窗不猜结果」；下标越界反过来是不拦的（C++ 本来也不拦，读到的是相邻内存）。范围外：成员访问（`.` / `->`）、函数调用（`v.size()`）、`sizeof`、字符串字面量、`++/--`（要写内存）、全局变量（插桩的变量表只收 `llvm.dbg.declare` 覆盖的局部变量）、结构体／容器／`std::string` 本身。

**热力背景：每行执行了多少次**：行桩每触发一次，Worker 就在共享内存的 `heat[行号]` 上加一（控制块新增的一段，见 `js/dbgproto.js`）。主线程按次数取 `log2` 分 9 档给这一行涂红：1 次、2~3、4~7、8~15、16~31、32~63、64~127、128~255、≥256 各一档，`index.html` 里 `.heat1`～`.heat9` 的 alpha 从 .05 到 .30。**计数必须在 Worker 侧**：`dbgTick` 是 50 ms 一轮询，全速档两次轮询之间早就跨过几千行，主线程攒出来的是「这行被看见过几次」，跟执行次数差着好几个数量级。**必须封顶**：冒泡内层一行动辄上千次，线性映射的话除了最里面那一两行全是纯红，外层循环和只做一次的初始化行分不出层次；alpha 上限 .30 是量着对比度定的——用的不是 `--err` 那种浅粉而是饱和度高的深红（`--heat-rgb`），同样透明度下抬不起底色，第 9 档时正文对比度还有约 4.9:1（白天配色约 5.6:1）。跑动中 200 ms 刷一次，停住时每个 tick 刷（没跨档就提前返回，不碰 marker 层，免得画面抖）。退出调试后**红色保留**，找热点要看的就是这份终态；三个入口撤掉它：改一下源码（`session.on('change')`，行号已经对不上旧编译了）、重开一次调试（新会话从全 0 开始）、点编辑器上方「热力」状态条里的「清除」。那条状态条同时报「已标 N 行，最热第 X 行 × M 次」，会话结束时的状态栏也带同一句；没停住的时候把鼠标放到红行上，浮动框给出这一行的确切次数和档次（停住时那个位置仍然是变量值优先）。实测手工冒泡用例：第 22 行 450、第 23/24/28 行 425、第 25~27 行 214，和程序自己报的「比较 425 次，交换 214 次」对得上。

**及时看到程序的输出**：程序用 `std::endl` / `std::flush` 写的行本来就会立刻刷出来，但竞赛风格地只写 `"\n"` 时，内容其实压在 libc++ 的 C `stdout` 缓冲里（`sync_with_stdio` 默认开着），要等写满 1 KB 或程序结束才到宿主。调试构建在每个行桩、`__pg_trace` 之前多插一条 `fflush(null)`，所以停在某行、或降速逐行走的时候，前面几行 `cout` 出去的内容已经实时进到了输出框。小坑：这条 `call` 的返回值必须给一个显式非数字名（借用插桩自己的 `tmp` 计数器），裸写匿名 `call i32 @fflush` 会被 LLVM 自动占一个 `%0/%1/…` 编号，跟 clang 原样抄下来的 `%0 = bitcast`、`%1 = load` 撞号，报 "instruction expected to be numbered"；`__pg_trace` 是 `void`，没这问题。（若程序自己 `sync_with_stdio(false)`，`std::cout` 改用 libc++ 内部缓冲，这条 `fflush` 刷不动它——教学用例没人这么写。）

**BGM：行号当旋律**：`dbgTick` 发现行号变了就调 `bgmNote(line)`，取 `line % 10` 查半音表（`{1:0, 2:2, 3:4, 4:5, 5:7, 6:9, 7:11, 8:12, 9:14, 0:16}`，相对 C4），按 A4=440 的十二平均律算频率，用 Web Audio 发一声：三角波基音 + 高八度正弦泛音（0.35 倍），6 ms 起音、0.32 s 指数衰减，像音乐盒而不拖尾。两处限流是必须的：同一个音 400 ms 内不重复敲（停在某行时 tick 每 50 ms 就来一趟，不然一个音能敲几十次），两次发声之间至少隔 45 ms（全速档一秒划过几千行，不限流就是一堵噪音墙，AudioNode 也会堆一堆）。`AudioContext` 第一次出声时才建，建在用户手势之后（点「编译并调试」本身就是手势），万一还是 `suspended` 就补一次 `resume()`。复选框关掉立刻不出声，状态记进 `localStorage`，重新勾选时先响一声确认。

**每次运行都从空输出开始**：点「编译并运行」「编译并调试」都会先清掉输出框和上一次的解码头，运行/编译的诊断直接落进干净框里，不再和历史输出叠在一起。

**耗时口径**：停在某行上想下一步的时间、降速刻意睡掉的时长都不是程序在跑。控制块里 `PARKED_MS` / `SLOW_MS` 两个槽由 Worker 累加，状态栏的运行耗时是总耗时减去这两段，鼠标悬在数字上能看到各扣了多少。降速的睡眠按 50 ms 一片——片小一点，按「暂停」时下一行很快就能停住，不用先把一整秒睡满；记账是先加计划片长、醒来再补实际超出的那几毫秒，只记计划值的话报表里的降速时间会偏小，扣不干净。

**调试不设运行超时**：顶部「运行超时(ms)」只给「编译并运行」装看门狗；「编译并调试」压根不装（`runProgram` 只在没传控制块时才 `setTimeout`）。逐步看的东西跑多久都不该被判 TLE——0.5 s/行走一个几十行的程序，光降速就早超过 5000 ms 了，死循环也一样由人自己用「停止 / 退出调试」结束（`dbgStopRun` 终止运行 Worker 并把等待中的 `runProgram` 以 `aborted` 结掉）。所以调试会话的状态栏不会出现 `TLE`。

**看变量的实现细节**：停住时鼠标悬在变量名上取值，不能用 `e.target` 是不是 `.ace_identifier` 那个 span 来判断——Ace 的 `.ace_layer` 整层 `pointer-events: none`（它 CSS 里写了，为了 Safari 滚轮不被打断），真实鼠标事件的 target 永远是 `div.ace_content`。走的是坐标反查：`renderer.screenToTextCoordinates(clientX, clientY)` 拿行列，再 `session.getTokenAt(row, column)` 取该位置的 token。

**前提与限制**：`SharedArrayBuffer` 要求跨源隔离，而跨源隔离又要求页面先在安全上下文里——`https://` 或本机 `http://localhost` / `127.0.0.1`，`http://公网域名` 直接出局。`serve.py` 已经带 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`，用别的服务器要自己加，否则页面会直说拿不到 `SharedArrayBuffer`，并把到底缺哪一层（非安全上下文 / 缺头 / 浏览器没有这个对象）写在同一行里。行号可信的前提是 `-O0`，调试构建不接受优化档位；STL 头文件里的实现不插桩，所以单步进不了 `std::sort` 内部；这套行号来自 IR 元数据而不是 DWARF 的 `.debug_line`，够教学演示，但别按 gdb 的语义期待它。

## GoC 画图（`<goc.h>`）

C++ 那边多了一套画笔：源码里写 `#include <goc.h>`（老教材写的是 `#include "logo.h"`，给了同名转发文件），就能用 GoC 的那套 `pen.fd(100)` / `pen.rt(90)` / `pen.c(3)` 在页面上画图，接口名和参数顺序尽量对齐 webGoC，示例下拉框最后一组「GoC 画图」六个用例（第一步、正多边形、递归分形树、图形全家福、随机漫步、时钟表盘）都是实跑过的。不 include 就什么都没变：不占体积、不改行为，普通算法题感觉不到这套东西存在。

**画布垫在输出框背后**。GoC 的画布是 800×800 正方形、原点在正中、y 轴朝上，页面里就是一块同样尺寸的 `<canvas>`，绝对定位在 `#out` 底下；一旦真的有东西画出来，输出区换成 GoC 那块浅绿底（`rgb(188,255,209)`）、stdout 的字改成墨色继续压在图上，所以「画图 + 打印进度」两边同时看得见。一笔都没画的那些运行，输出区维持原样（不会凭空亮出一块绿板子，连只转身不走字的程序都不亮）；「清空输出」和每次新运行开头都会把画布一并擦掉、收回去。

**笔的状态在 wasm 里面，不在 JS 里面**。`goc.h` 里那个 `GoCPenState`（位置、角度、粗细、颜色、透明度、多边形点列、字体名，外加一个 16 格的笔状态栈）是头文件里的一个文件作用域对象，`pen` 和 `p` 都是它的引用。这条选择换来的是：调试时悬停、观察窗、单步看到的 `x` `y` `angle` 就是笔的真位置，不需要第二条状态通道，也不需要主线程和 Worker 之间来回同步一支笔。代价是这些字段的读写全在 guest 侧，`__goc_*` 那一组导入函数是**无状态**的——每次调用只报「从哪儿到哪儿、什么颜色多粗」，画师照着画就完事。

**通道就是宿主导入函数**。`__goc_line` / `__goc_circle` / `__goc_text` / `__goc_sleep` / `__goc_poke` 这些在编译期没有定义，链接时靠 `--allow-undefined` 放行，运行时由 `run.worker` 用 `GOC.makeEnv()` 提供的 JS 函数顶上——也就是说这套东西走的是「用户模块 import 宿主函数」这条最直的路，跟行桩、值通道共用同一块实例。运行 Worker 侧把调用攒成一批再 `postMessage` 给主线程（攒批的三个时机见下一段），字符串参数（`text` 的内容、字体名）在 Worker 里就从用户的线性内存里按 UTF-8 解好，过境的是 JS 字符串而不是主线程读不到的指针。解之前必须先 `set` 拷一份到普通 `Uint8Array`：`TextDecoder.decode` 明确不收挂在 `SharedArrayBuffer` 上的视图，而**调试构建链的正是 `--shared-memory`**，`memory.buffer` 就是共享的那块——少这一步，带 `pen.text` 的示例一进「编译并调试」就 `TypeError: The provided ArrayBufferView value must not be shared`（普通运行不带那条旗，所以只有调试会炸；主线程看 `char[]` 那处走的是同一个绕法，见 `main.js` 的 `charPieces`）。坐标换算（`px = 400 + x`、`py = 400 − y`）也全在 guest 侧做完，主线程只管照数画。要不要挂这套导入，看的是**编译出来的模块自己的导入表**：`WebAssembly.Module.imports()` 里出现 `__goc_*` 才装，普通程序连这套代码都不会执行到。

**攒批有三个时机：够 128 条、离上次递送超过 33 ms、以及停住之前。** 只留「够 128 条」这一条会漏两类画面：`speed(10)` 一步画完的程序压根不调 `__goc_sleep`（睡眠是顺带 flush 的地方），几十条指令攒不满一批，要等退出前那一次补发才亮出来；调试时更难看——行桩是在**下一行**的开头停的，上一行画的东西还压在缓冲区里，于是画面永远落后行号，逐单步走完一个只画四五笔的程序，全程画布都是空的。所以 `push` 里加了时间闸（最坏多等一帧，消息量仍然每秒几十条封顶），`makeTracer` 和 `makeEnv` 的 `onPark` 也改成「递内存 + 刷绘图缓冲」一起走（都在置 `PARK` 之前，主线程停住时拿到的一定是这一行之前的完整画面）。实测同一个四笔到位的用例：修之前逐行单步八次读数全是 0、最后一次跳成 1920，修之后是 496 → 976 → 1456 → 1920 跟着行号走；普通运行那边批次从「结束时一批发 4 条」变成「运行途中分三批到」。最终像素两条路一致（1920），刷新的时机不改画面内容。

**动画照抄 webGoC 的分段公式**，所以 `speed` 是有画面的：前进 `2.5^s × A` 像素/毫秒、转身 `1.9^s × A` 度/毫秒、一帧 20 ms，`fd(100)` 在 `speed(5)` 下是 13 段、约 260 ms 走完；`speed(0)` 和 `speed(10)` 都表示一步画完（webGoC 里 0 是个死循环，这里当最快）。分段这件事在 guest 侧（`goc.h` 里那个循环：一段一线、跟一次 `__goc_sleep(20)`），JS 只在被叫到的时候睡。睡眠用的是 `Atomics.wait`，睡在**运行 Worker** 里，主线程照常刷新、照常响应点击；每一片睡（50 ms）醒来还问一次「是不是按下了暂停」，所以笔尖正走到一半按下暂停，最多一片就停住，放行后剩下的段继续一段一段走完（少睡的只是当前这一次 20 ms，路径一格不少）。

**断点和单步不在睡眠循环里判**，那是行桩在行边界干的活。看着像少了一条路，其实是必须的：`MODE` 和断点表会一直保持到下一次点击，而一行动画要睡几十片——在切片里重走完整的 `stopReason`，「继续」只放行 50 ms，下一片又以同一个理由停在同一行，实测一段动画永远跑不完（命中断点后点继续，40 秒画面一动不动）。暂停没有这个问题，因为用户放行时必然先把 `MODE` 改成别的。

**等点击就是 `pause()`**。每次运行现造一块 4 格的 `SharedArrayBuffer`（[0] 是点击计数），画布上按下鼠标、或者在焦点不在编辑器/stdin 上时按任意键，都算一次唤醒；`pause()` 无限等，`pause(秒)` 最多等这么久，等到了返回 1、超时返回 0。带 Ctrl/Meta/Alt 的组合键不算，免得把「Ctrl+Enter 编译并运行」当成给画面的回应。

**带画图的运行换了超时口径**。普通运行原本是「从头到尾最多跑这么久」；收到第一批绘图指令之后改成「连续这么久没动静才算卡死」。不改的话，一个 `speed(5)` 的螺旋会被 5 秒默认超时砍在半道上。而**转身、`wait()`、`pause()` 等点击这几段是一条绘图指令都不产生的**，所以睡眠循环里每 100 ms 递一个只装 `beat` 的空批次当心跳：主线程拿它重新计时，画师看到纯心跳批次直接跳过（不亮画布）。这条改动的代价写在已知限制里——「一直有节奏地空转」的画图程序（`while (1) wait(0.1);`）不再会被超时杀掉，只能按「停止」。

**和 webGoC 对不齐的几处**，都是刻意的：所有走与转都要写 `pen.` 前缀（没有裸的 `fd(100)`，免得和 `<cmath>`、用户自己写的函数抢名字）；`sin`/`cos`/`atan2` 照 `<cmath>` 收弧度，角度版另叫 `sin_deg` / `cos_deg` / `atan2_deg`；`pen.rgb(r,g,b)` 写完第 16 格顺手把它设成当前笔色（webGoC 只写不切）；`polXY(x,y)` 收的是画布绝对坐标、`pol()` 画完不清点列（这两条和 webGoC 一致，但和「以为跟着笔尖走」的直觉相反）；`cls` 只把位置和角度归零，颜色、粗细、`speed` 都留着；`a`/`aa` 的 `pivot` 参数保留位置但不改变画法，圆心一律在笔尖周围。图片、声音、视频、按钮、联机、`getKey`/`getMX`/`mouseDown` 这类键盘鼠标读数、`fill` 溢色填充、小海龟的脑袋都没有——**这些名字根本不在头文件里，写了就当场编译不过**，不会跑到一半才炸。`rand`/`srand` 反过来是特意接过的：签名和 `<stdlib.h>` 逐字相同，链接器只为主文件里还没有的定义去翻 libc，所以 `rand()` 落到的就是 GoC 那台 9301/49297/233280 的线性同余，出值范围 0~65536，和 webGoC 一致（`srand(1)` 之后前两个随机数是 16462、4，可以拿来对答案）。

**顺带修掉一个跟画图无关的老 bug**：这份 clang 8 的 wasm32 后端选不出「线程安全局部 static」要用的那条原子指令（`AtomicLoad` acquire），所以用户代码里只要有一个需要动态初始化的函数内 `static`（`static std::string s = "x";`、`static S s;` 这种），编译就死在 `fatal error: error in backend: Cannot select`，而且**报不出源码行号**。现在 `CLANG_COMMON` 固定带 `-fno-threadsafe-statics`：跑出来的 wasm 本来只有一个线程、初始化也只发生在 `_start` 之前的单线程阶段，去掉守卫不影响正确性。同一个坑在 `goc.h` 内部是这么绕的——两份 `GoCPenState` 放文件作用域（走全局构造，不产生守卫变量），调色板那份 `static unsigned tab[17]` 留在函数里是因为它是常量初始化、本来就不需要守卫。

## 多语言与扩展点

`js/langs.js` 是一张登记表，`main.js` 只读它的字段、不认具体语言。每项的字段：

| 字段 | 管什么 |
| --- | --- |
| `label` / `title` / `docTitle` / `titleTip` | 下拉框里的名字、页面 `h1` 的文字、浏览器标签页标题、标题悬停说明 |
| `aceKey` | Ace 的语法与片段模块名（`mode-<key>.js`、`snippets/<key>.js`），切换语言时 `session.setMode` 用它 |
| `filename` / `runName` | 诊断里显示的源文件名、递给运行侧的产物名 |
| `assets` / `initHint` / `readyLabel` | 工具链资源（相对 `assets/`，就绪提示会把它们的值列进缺件清单）、初始化那句提示、就绪那句的主语 |
| `compileWorker` / `runWorker` / `singleWorker` | 常驻 worker、一次性运行 worker、以及两者是否合一（解释器型语言为真） |
| `fields` | 工具条上这门语言用得着的字段 id（`std` / `opt` / `extra` / `stack`），其余连「每行停留」「BGM」「热力条」「观察窗」一起隐藏 |
| `examples` | 示例集（纯数据，键序即下拉框顺序） |
| `runLabel` / `debugLabel` / `reloadLabel` / `stdinHint` / `buildMetric` / `memLabel` | 三处按钮文案、stdin 小标题、状态栏两格的名字 |
| `debug` / `debugWhy` | 能不能单步调试；不能时「编译并调试」禁用，`debugWhy` 写进它的 `title` |
| `phaseText` / `killedText` | 构建各阶段失败时怎么说（编译 / 链接 / 插桩 / 语法检查）、超时被终止那句怎么说（C++ 杀的是运行 Worker，解释器型杀的是常驻解释器，措辞不能共用） |
| `opts(ui, debug)` | 把工具条的值翻成这门语言 worker 认的选项 |

worker 协议也和语言无关：`init` / `compile` → `progress` / `ready` / `result` / `error`，`run` → `write` / `guest` / `exit`。产物一律叫 `artifact`（一块 `ArrayBuffer`），字节数由 worker 算好放进 `size`——页面不知道也不需要知道那是 wasm 还是 marshal 过的字节码，`ready` 里那句版本 / 文件数走自由的 `detail` 字符串。

**加第三门语言要做的五件事**：① `LANGS` 里加一项；② 一个常驻编译 worker（解释器型可以和运行合一，置 `singleWorker: true`）；③ 编译型语言再加一个一次性运行 worker；④ 一份 `js/examples.<id>.js`（纯数据，形如 `{ '用例名': { group, stdin, code } }`）；⑤ `index.html` 里按顺序补上 `<script>`、把 `LANG_ORDER` 加上这个 id、给页脚加一条 `<ul data-lang="<id>">` 的限制清单。`main.js` 不用改。localStorage 也自动分键：`localKey(base, lang)` 只给非 C++ 语言加 `.<id>` 后缀，C++ 沿用老键，老用户存的源码不受影响。

## Python 支持做到哪一步

本期完成的是「装载 + 运行 + 诊断 + stdin + 单步调试」，调试那一路的取舍在下面第 6 条。

**1）自托管 Pyodide 0.29.5（CPython 3.13.2）**，目录 `assets/pyodide/`，约 12 MB，全部走 `/assets/` 的长缓存。版本是钉住的：3.14 世代的构建（如 314.0.7）不再支持 classic worker，只能用 ES module worker，而本页所有 worker（包括 clang 那两个）都是 classic，换过去要把四个 worker 一起改造。0.29.5 是仍支持 classic worker 的最新一代，`js/py.worker.js` 里 `importScripts('pyodide.js')` 就能装。

**2）常驻解释器，不像 clang 那样每次运行新建。** 这是成本结构反过来的结果：clang 是编译重（工具链 60 MB、一次编译几秒）、运行轻，所以编译 Worker 常驻、运行 Worker 用完即弃；Pyodide 的重资产是运行时本身（装入 3 秒），一次脚本执行只有几毫秒，所以 `singleWorker: true`——一个 worker 同时收 `compile` 和 `run`，跑完不销毁。`main.js` 侧的对应改动是 `onCompileMessage` 的 `default:` 分支把不认识的报文转给 `onRunMessage`，以及 `finishRun()` 里「什么时候该重建 worker」的判据：普通正常退出留着复用，**被超时终止 / 被停止 / 解释器自己报了内部错误**这三种才 `terminate()` 后自动重新初始化（`py.worker.js` 在 `exit` 报文里带 `note` 说明是哪种）。实测「死循环」用例走完整条链路：6 秒判 TLE → 输出 `[已终止] 运行超过 6000 ms` → 状态栏自己变回「解释器就绪（3.1 s，Python 3.13.2 / Pyodide 0.29.5）」→ 下一个用例照跑。

**3）产物是 marshal 字节码，不是 wasm。** 点「运行」其实有两步：先 `compile(src, 'main.py', 'exec')` 出代码对象，这一步的 `SyntaxError` 当场报诊断；再把 `marshal.dumps(code)` 当作 `artifact` 交给运行侧，运行侧 `marshal.loads` 后在一个**全新的 dict** 里 `exec`。这么切是为了跟 C++ 那条「编译 → 产物 → 运行」的路径同构（观察窗、退出码、耗时、内存四格的语义才一致），也顺手把语法错误挡在执行之前——不会像直接 `runPython` 那样，跑到第 200 行才发现第 200 行写错了。代码对象和诊断在 JS 侧和 Python 侧之间靠 Pyodide 的内存 FS 传（`/tmp/_pg_artifact.bin`、`/tmp/_pg_diag.txt`），不靠字符串序列化，避免「这是文本还是字节」的二次猜测。

**4）诊断按 clang 的口径重排。** 用户看到的不是 Python 原样的 `File "<stdin>", line 1` 那套，而是
```
main.py:1:16: error: expected ':'
def greet(name)
               ^
```
行列取自 `SyntaxError.lineno` / `offset`，有 `end_offset` 就画成 `^~~~` 一段范围，`IndentationError` 的 `error: [IndentationError: unindent ...]` 保持一行内可 grep。文件名用登记表的 `filename`（`main.py`），所以复制粘贴到本地 `python -m py_compile` 也能对上。运行期异常则维持 Python 原样的 traceback，只把解释器自己那几层 bootstrap 帧去掉——最后一行是 `ZeroDivisionError: division by zero`，中间只有 `File "main.py", line 8, in <module>` 这样的用户帧，退出码给 1。

**5）stdio 和 stdin 的口径。** 输出用 Pyodide 的 `raw` 字节回调（不是 `batched`）：`batched` 那个 `StringWriter` 会把行尾的 `\n` 剥掉、还会丢 `NUL` 字节，中文和多字节字符要等整行齐了才给，跨 flush 边界的字符就可能断。字节直接进和 C++ 那侧共用的 `TextDecoder(stream)` 通道，换行按 `\n`、攒到 8 KB 或每次要读 stdin 之前刷一次。`print("输入：", end=" ")` 这种不带换行的提示因此看得见；`input()` 走 `setStdin`，`stdin` 框里的整段文本按行喂，读到底给 EOF（`autoEOF`）。**它是整段文本，不是 tty**：`sys.stdin.read()` 一次拿到全部、`input()` 不实时回显、终端控制序列没有意义。

**6）单步调试最后走的是 `sys.settrace`，不是原计划的 AST 插桩。** 原本以为两处底层机制都得换：行桩要从 IR 插桩换成 AST 插桩（`compile()` 前给每个语句节点包一个回调，因为 wasm 里没有 `!DILocation` 可以解析），变量值要从「主线程按地址读共享内存」换成递一份快照。真做下来第一处可以更省事：`settrace` 的 `line` 事件本身就是逐行的回调，在回调里写控制块、判停走、`Atomics.wait`，效果和行桩一模一样，而**产物一个字节都不变**——「运行」和「编译并调试」跑的是同一份 marshal 字节码，不存在「为了调试改源码」这条容易出错的路。控制块的 park/step 握手（`Atomics.wait` + `GO`）语言无关，直接照用；断点表也照用，只是每次改动要靠 `BPGEN` 那一格通知解释器重下断点行号（`f_line`）。代价是每行都要跨一次 Python→JS 的桥，实测比纯 Python 记账贵一个数量级，所以全速档攒够 512 行才跨一次——换来的是「暂停」会停在攒批的那一行，而不是按下去的那一行。第二处确实换了：CPython 的对象住在解释器堆里，不是 wasm32 下一个能按 `(地址, 元素宽度, 个数)` 定位的定长字段，`arr` 那条地址通道没有对应物，所以停住时把当前帧的 `f_locals` 格式化成文本递过去（长度、层数、元素总数、每帧变量数各有一道闸，且**绝不执行用户代码**：不调 `__repr__`/`__len__`/`__iter__`）。也因此观察窗在 Python 下只收单个变量名——`a[i]`、`x+1` 得 `eval()` 才算得准，那是下一步。只跟踪用户这份源文件的帧，标准库内部下不了断点。

**7）Python 侧其余限制**：不装第三方包（`loadPyodide({packages: []})`，`pyodide-lock.json` 只是留在目录里没用到），标准库够用；`sys.path` 上没有用户文件，内存 FS 里除了那两个临时文件是空的；递归深度受 CPython 的 `sys.setrecursionlimit`（默认 1000）和 wasm 那侧栈大小双重限制，「递归 + 大栈」用例演示了把上限调到能跑深度 1500 的写法，再深会 `RecursionError` 而不是像 C++ 那样栈溢出；没有并行（`threading` 能 import 但没有真正的线程，`multiprocessing` 直接不可用），也没有 socket。

## 工作原理

C++ 那条路：

```
Ace 编辑器 ──源码字节──> compile.worker（常驻）
                          clang -cc1 → main.o
                          wasm-ld    → main.wasm
                                │
                          产物字节 │ 连同 stdin 一起 transfer
                                ↓
                         run.worker（一次性，每次新建）
                          memfs.wasm 提供内存文件系统
                          WASI 预览版宿主接口 → 执行 main.wasm
                                │
                       stdout/stderr 字节流 │ 退出码 / 耗时 / 内存峰值
                                ↓
                          主线程 TextDecoder(stream) → 输出框
```

Python 那条路（同一个协议，两个阶段挤进同一个常驻 worker）：

```
Ace 编辑器 ──源码文本──> py.worker（常驻，singleWorker）
                          compile(src, 'main.py', 'exec') ── SyntaxError ──> 诊断文本
                                │ 通过
                          marshal.dumps(code) → artifact（字节码，不是 wasm）
                                │ 同一 worker 内立刻执行
                          marshal.loads → exec(code, 全新 dict)
                                │ raw 字节回调（每个 UTF-8 字节一次）
                       stdout/stderr 字节流 │ 退出码 / 耗时 / 解释器堆
                                ↓
                          主线程 TextDecoder(stream) → 输出框（和 C++ 同一个解码头）
```

几个关键设计：

编译 Worker 常驻，工具链和 sysroot 只加载一次；运行 Worker 每次新建、用完即弃。这样超时只要 `terminate()` 就能硬杀死循环，且不会伤到编译器状态，代价是一次 Worker 创建（约几毫秒）。Python 把这个取舍反了过来——它的重资产是解释器本身，所以编译和运行合在同一个常驻 worker 里，见上面「Python 支持做到哪一步」第 2 条。

输入输出全程按 `Uint8Array` 传字节，只在主线程用 `TextDecoder('utf-8', {stream:true})` 解码，中文和跨 flush 边界的多字节字符不会乱码。

链接走静态链接：`crt1.o + libc++.a + libc++abi.a + libc.a + libclang_rt.builtins-wasm32.a` 一起打进产物，STL 可用性不依赖任何运行时的系统库。链接参数沿用了上游的 `--export-dynamic`（导出全部符号），libc++ 被拉进来的那批目标文件会整片留在产物里，所以产物不小——示例中的 STL 用例是 1.3 MB，具体字节数状态栏那行会报出来。

**万能头 `<bits/stdc++.h>`**：libc++ 本来没有这个文件（它是 GCC libstdc++ 的东西），但 `sysroot.tar` 是预打包好的，不动它——工具链解包完成后，驱动层往内存 FS 里补一个虚拟文件 `include/c++/v1/bits/stdc++.h`，内容是把可用的头逐个 `#include` 一遍。clang 的头搜索路径里就有 `/include/c++/v1`，所以 `#include <bits/stdc++.h>` 正好命中它，竞赛代码可以照抄。清单是逐个头实编一遍筛出来的：`<csetjmp>` 被剔（sysroot 里没有 `setjmp.h`，libc++ 的 `setjmp.h` 靠 `#include_next` 去找它，直接 fatal error）、`<csignal>` 被剔（wasi-libc 的 `signal.h` 不提供 `::signal`，`<csignal>` 里的 `using ::signal` 编不过）、`<ccomplex>` `<ctgmath>` `<ciso646>` `<cstdbool>` 是 C++17 已废弃头，`-Wall` 下会刷一堆警告所以不收、并发和 `<filesystem>` `<regex>` 也不收（原因见「已知限制」）。这个补件也计入就绪提示里的文件数：416 个 sysroot 文件 + 1 个万能头 + 2 个 GoC 头（`include/goc.h` 和转发的 `include/logo.h`）= 419。GoC 那两个走的是同一个注入口子（`Toolchain.init()` 解包完成后往内存 FS 里写），内容不在 tar 包里，所以改画笔 API 不用重新打包 9 MB 的 sysroot。`js/goc.js` 一个文件装三样东西：要注入的头文件文本、运行 Worker 用的宿主导入函数（`makeEnv`）、主线程用的画师（`applyOps`），两个 Worker 和各页面都 import 它，各取自己那一半——编译侧只往内存 FS 写头文件，不碰 DOM。

## 目录结构

```
cpp-wasm-playground/
├── index.html              页面 + 全部样式（单文件，无框架）
├── serve.py                本地静态服务器（长缓存 + .wasm MIME）
├── article/                面向 HUSTOJ 用户的公众号稿：Markdown 原文 + 配图 + build_html.py
│                           （把稿子转成能直接粘进微信编辑器的 HTML，样式全走行内、
│                            图片转 data URI，否则粘贴时图片会丢）
├── js/
│   ├── langs.js            语言登记表：本页唯一的扩展点，字段含义见「多语言与扩展点」
│   ├── wasmclang.js        工具链驱动层：Toolchain / MemFS / WasiApp / Tar / IR 行插桩与变量表
│   ├── compile.worker.js   常驻编译 Worker（C++）
│   ├── run.worker.js       一次性运行 Worker（C++）
│   ├── py.worker.js        常驻解释器 Worker（Python）：compile / marshal 产物 / 执行 / stdio 全在一个 worker 里
│   ├── examples.cpp.js     C++ 示例集（78 个，纯数据）
│   ├── examples.py.js      Python 示例集（70 个，与 C++ 那套章节对齐）
│   ├── goc.js              GoC 画图：要注入的 goc.h/logo.h 文本 + 运行 Worker 的宿主导入函数 + 主线程的画师（见「GoC 画图」一节）
│   ├── dbgproto.js         调试控制块（SharedArrayBuffer）布局：控制槽 / 断点表 / 变量值表 / 每行执行次数 / 数组快照，主线程与 Worker 共用一份定义
│   └── main.js             UI 编排、Ace、指标、快捷键、localStorage
├── assets/                 工具链（C++ 约 60 MB + Python 约 12 MB，见下方致谢）
│   ├── clang.wasm          31.2 MB
│   ├── lld.wasm            19.5 MB
│   ├── sysroot.tar          9.3 MB（解包后 8.95 MB / 416 个文件，运行时另补 3 个虚拟头：万能头 + goc.h + logo.h）
│   ├── memfs.wasm           345 KB
│   └── pyodide/            Pyodide 0.29.5（CPython 3.13.2）：pyodide.asm.wasm 8.6 MB
│                            + python_stdlib.zip 2.4 MB + pyodide.asm.js 1 MB + pyodide.js
│                            + pyodide-lock.json（没装第三方包，这个清单只是随包留下没用到）
└── vendor/ace/             ace-builds 1.45.2 的 src-min-noconflict 子集（约 552 KB，本地化以保证离线可用）
                            c_cpp 和 python 两套 mode + snippets 都在里面
```

## 已知限制

### C++

工具链是 LLVM 8 年代的 clang + libc++，不是 GCC/libstdc++。`<bits/stdc++.h>` 是 libc++ 没有的，本页在 sysroot 之外补了一个虚拟头顶上（见上面「万能头」一节），但里面的清单只收了这份 sysroot 实测能过的头：`<csetjmp>` `<csignal>` 因为缺 `setjmp.h` / 不提供 `::signal` 被排除，`<thread>` `<mutex>` `<future>` `<condition_variable>` `<shared_mutex>` `<filesystem>` `<regex>` 这类头文件本身能编，但这份 sysroot 没链 pthread，真调用就是链接期未定义符号或运行期 trap，所以也不在万能头里——要用请显式 `#include`，并接受链接/运行可能失败。此外没有 C++20 的 `<concepts>` `<ranges>` `<format>` `<coroutine>`，也不要有"和 g++ 报错完全一致"的预期。libc++ 的 STL 本身（容器、算法、迭代器、`<string>` `<map>` `<sstream>` `<chrono>` 等）是完整可用的。

文件系统是一个空的内存 FS，程序跑起来时里面没有任何文件，`std::filesystem`、`fopen` 读外部数据基本无从谈起。

`std::thread` / `<execution>` 需要 SharedArrayBuffer 加跨源隔离（https 或 localhost + COOP/COEP，见「部署建议」）。从 `serve.py` 打开就是隔离的（单步调试也依赖这一条），换成别的服务器要自己补那两个头，否则多线程和调试都用不了；单线程程序不受影响。话虽如此，这份 sysroot 没有链 pthread，并发头也不在万能头清单里——真调多线程多半停在链接期未定义符号或运行期 trap。

超时靠终止 Worker 实现，能可靠杀掉死循环，但拿不到精确 CPU 时间，也不区分 CPU 时间和挂钟时间。**开画图之后这一条口径变了**：收到第一批绘图指令前还是「总共跑多久」，之后改成「多久没动静」，而且转身、`wait()`、`pause()` 等点击这几段每 100 ms 会递一个心跳——于是一直有节奏地空转的画图程序（`while (1) wait(0.1);`、`while (1) pause();`）不会再被超时杀掉，只能按「停止」结束。不画图的程序一点不变。wasm 线性内存只能增长不能收缩，宿主侧无法给它设上限——超内存会以 `memory access out of bounds` 报出来，而不是 MLE。`system()`、`fork()`、管道这类进程 API 在 WASI 预览版里不存在。

编译参数里固定带 `-fno-threadsafe-statics`，因为这份 clang 8 的 wasm32 后端选不出「线程安全局部 static」要用的 `AtomicLoad`（acquire），函数内只要有需要动态初始化的 `static` 就死在 `error in backend: Cannot select` 且**报不出行号**。跑出来的 wasm 只有一个线程，去掉守卫不影响正确性；但这也意味着「两个线程同时首次进入」那种写法在这里既编不出守卫、也等不到保护——而这条场景本来就不存在（见上面 `std::thread` 那段）。

GoC 画图是一套自己实现、名字对齐 webGoC 的 API，不是那份运行时：画布固定 800×800（缩到窗口里显示，坐标不会因为窗口大小而变）、颜色还是那 17 格、`rand` 还是那台线性同余，但**图片、声音、视频、按钮、联机、`getKey`/`getMX`/`mouseDown` 读数、`fill` 溢色填充、小海龟的脑袋都没有**，这些名字不在头文件里，写了就是编译不过（不是跑一半才炸）。三处和 webGoC 的口径差容易看不见：动作都要 `pen.` 前缀；`sin`/`cos` 收弧度，角度版得写 `sin_deg`；`a`/`aa` 的 `pivot` 参数只占位、圆心一律在笔尖周围。另外因为画图函数是宿主提供的导入，链接时要加 `--allow-undefined`——这条旗只在源码真的 include 了 `goc.h`/`logo.h` 时才加，但加了之后拼错的函数名就从链接期错误挪到运行期（运行时报「未实现的宿主函数」），普通算法题不受影响。

热力背景的口径和单步一样：数的是**行桩触发次数**，只有你自己的代码有行桩——`std::sort`、`std::map` 这些头文件里的实现不插桩，所以一次调用算在调用它那一行上，红的是「这行调了多少次」而不是内部跑了多少步；`-O0` 之外不接受优化档位，优化后循环被切开、行被合并，次数就不再对应源码结构。计数槽是 int32，一行累计到 21 亿次才回绕，教学用例碰不到。**有一种写法会低估**：把条件、循环体、自增全挤在同一行的 `for`（`for (int i = 0; i < n; ++i) f(i);`），插桩在循环体那个基本块里找不到行号变化，于是一趟循环只触发行桩一次——热力停在最浅一档，按一次「下一行」整趟循环就走完了。根因是行号状态只在「基本块标签行」重置，而判定用的是「整行只有一个 label:」，clang 实际打出来的是 `for.body:    ; preds = %for.cond`，后面挂着前驱注释，永远匹配不上（实测一个 9 行、里面写了两趟单行 `for` 的用例，插桩出来的 `__pg_trace` 站点总共 6 个——每行一个，两趟循环各自也只有 1 个）。拆成多行（循环体单独占行）就恢复正常，教学用例本来就建议多行写法；真正的修法是在基本块边界也重置行号状态，但那会同时改变热力数值和单步语义，属于单独一次改动，没跟在这次功能里一起做。

数组展开和观察窗的覆盖面：能展开的是**定长、元素为标量或指针的本地数组**（`int a[30]`、`double m[4][4]`、`char s[64]`，多维按行优先摊成一维看），元素是结构体 / `std::string` / 容器的数组只知道名字和类型、不展开内容；`int a[]` 形参和变长数组在 `-O0` 下 DWARF 给的是指针类型，没有长度信息，悬停只能显示地址（观察窗里 `a[i]` 能算，按指针步长走）。悬停一次给前 50 个元素、观察窗一行按这一列的宽度现量给（量不出宽度才退回 8 个），都不是采样估算：悬停那个数是写死的上限，面板那个数是这一列实际有多少像素；`char s[n]` 整段都是可显示文字时不铺元素，直接写成 `"hello"` 一句（面板同样按宽度铺、量不出宽度才给 64 个字符，悬停固定 200 个，判定见上面「字符数组什么时候算字符串」），掺了控制字节或非法 UTF-8 才退回报数。观察窗收的是**表达式**，但那个求值器只读内存、不执行代码：`a[i]`、`a[10]`、`m[1][2]`、`*p`、`p[i]`、`&x`、`a+j`、四则 / 比较 / 逻辑 / 位运算、三元、类型转换都能算；**算不了**的是成员访问（`s.x`、`p->v`）、函数调用（`v.size()`）、`sizeof`、字符串字面量、`++/--`，以及**全局变量**——插桩的变量表只收 `llvm.dbg.declare` 覆盖的局部变量，`g[2]` 会直接报「本次构建的变量表里找不到它」。未定义行为不猜结果（除 0、越界移位、NaN 转整数都回一句原因），下标越界则不拦（C++ 本来也不拦，读到的是相邻内存）。栈槽地址按变量登记、不按调用帧：函数返回后同一个槽会被后面的调用复用，递归函数里同名数组只留最后一次登记的那一份。

### Python

Python 也有单步调试了（`sys.settrace` 行桩 + 同一块 SAB 控制块：断点、下一行、暂停、继续、调速、热力背景、BGM 和 C++ 共用一套），只是几处口径天然不如 C++：只跟踪用户这份源文件里的帧，标准库内部下不了断点；全速档每 512 行才跨一次 Python→JS 的桥，所以「暂停」停在攒批的那一行上而不是按下去的那一行；变量值是停住那一刻从 `f_locals` 递出来的一份文本快照（长度、层数、元素总数各有一道闸，且绝不执行用户代码），不是像 C++ 那样由主线程按地址实时读内存；观察窗本期只收单个变量名，`a[i]`、`x+1` 这类表达式要在解释器里 `eval()` 才算得准，还没做。

不装第三方包，`import numpy` 这类会直接失败；标准库够用。stdin 是**整段文本**而不是 tty：`input()` 不实时回显、`sys.stdin.read()` 一次读到 EOF，交互式的猜数字游戏在这里没法一路问答下去。递归深度是 `sys.setrecursionlimit`（默认 1000）和 wasm 栈两重上限，超了给 `RecursionError`；内存超了是 Pyodide 堆先长到浏览器不给涨，报法跟 C++ 那边的 `memory access out of bounds` 不一样。「内存峰值」那一格在 Python 下改名「解释器堆」，量的是整个 Pyodide 的堆（起步就 20 MB 上下），不是用户程序自己吃了多少，不能拿去和 C++ 的数对比，也不能当 MLE 判据。超时终止的是常驻解释器，代价是下一次运行要先等它重新装入（约 3 秒，缓存没命中时更久）。同样**不能当判题后端**，而且比 C++ 那条路更不适合——判 Python 本来就该在服务端跑真 CPython。

所以：**这个可以当教学、写码验证、面试手撕、离线 playground 用，不能当 OJ 判题后端**。判题要的是精确内存计量、进程级隔离、可对齐 g++ 的诊断信息，这些只有服务端真装一个 g++（或服务端真装一个 CPython）才给得了。

## 部署建议

### 一、先上 https，再加 COOP/COEP

单步调试依赖 `SharedArrayBuffer`，而它存在的条件是**两个都得满足**：

1. 页面处在安全上下文——`https://` 任意域名，或 `http://localhost` / `http://127.0.0.1`；
2. 文档响应带 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`，让浏览器算出 `crossOriginIsolated === true`。

`http://公网域名` 属于第 1 条就不合格：这种情况下 COOP/COEP 加得再齐，`SharedArrayBuffer` 也依然是 `undefined`，页面点「编译并调试」只会报缺 SAB。这不是页面的检查太严，是浏览器根本不发这个对象——所以别去改源码跳过检测，跳过之后下一行建控制块照样失败。判断依据：控制台里敲 `self.isSecureContext` 和 `self.crossOriginIsolated`，两个都 `true` 才有的调；只有前者真，就是头没生效（nginx 的 `add_header` **不继承**：某个 `location` 一旦自己写了 `add_header`，上层那两个头就不再落到这个响应上，要么在每个 `location` 重复写，要么用 `include` 片段）。

第 2 条没满足时，报错文案会随浏览器变，别被它带偏：Firefox 和 Safari 在非隔离上下文里**压根不提供** `SharedArrayBuffer` 这个构造器，于是 `typeof SharedArrayBuffer === 'undefined'`，看着像"浏览器太旧"，其实跟版本无关；Chrome / Edge 相反，非隔离上下文里照样给 SAB，但 `Atomics.wait` 会被拒，调试一样停不住。所以排查顺序是先看 `crossOriginIsolated`，再看 SAB 在不在，`sabMissing()` 按这个顺序分支，并把当前两个布尔值直接印在提示里。还有一个容易漏的场景：页面被 iframe 嵌进别的站点（比如挂进 OJ 的某一页），**祖先链上每一环都得隔离**，父页面不带这两个头，iframe 里的 `crossOriginIsolated` 就是 `false`，本地直开却正常——这种情况要么父页面一起加头，要么把入口改成新标签页直开。

一份能直接用的 nginx 片段（证书按各自情况签，Let's Encrypt 的 certbot 一条命令就够）：

```nginx
# 让两个隔离头能被多个 location 复用：写成片段文件，例如 /etc/nginx/snippets/coop-coep.conf
# add_header Cross-Origin-Opener-Policy "same-origin" always;
# add_header Cross-Origin-Embedder-Policy "require-corp" always;

# MIME 只在 http 层补。同一层里 include 之后再写 types 是「叠加」，重复后缀只报一条
# duplicate extension 警告、后写的生效；而换到 server / location 层写 types 是「整表
# 替换」（ngx_http_core_merge_srv_conf: if (conf->types == NULL) conf->types = prev->types），
# 那一层的 .js / .css / .html 会全部退回 default_type —— classic worker 的脚本 MIME
# 不对直接加载失败，页面整个起不来。所以千万别把 types 挪进 server 块。
http {
    include       mime.types;
    default_type  application/octet-stream;   # .tar 这类没登记的后缀走这里

    types {
        application/wasm          wasm;       # 新版 nginx 的 mime.types 已带，旧版（1.20 及更早）要自己加
        application/octet-stream  tar;        # sysroot.tar；不写也由上面的 default_type 兜住
    }

    # ……下面两个 server 块放在这个 http 里
}

server {
    listen 80;
    server_name cpp.example.com;
    return 301 https://$host$request_uri;      # http 一律跳 https
}

server {
    listen 443 ssl http2;
    server_name cpp.example.com;
    root /var/www/cpp-wasm-playground;
    ssl_certificate     /etc/letsencrypt/live/cpp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cpp.example.com/privkey.pem;

    location / {
        try_files $uri $uri/ =404;
        include /etc/nginx/snippets/coop-coep.conf;
        add_header Cache-Control "no-cache" always;
    }

    # 工具链是无版本的静态文件，长缓存打满；这个 location 自己写了 add_header，
    # 所以隔离头必须在这里再 include 一次，否则文档以外的响应就没了。
    location /assets/ {
        include /etc/nginx/snippets/coop-coep.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    location /vendor/ {
        include /etc/nginx/snippets/coop-coep.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
}
```

`always` 别省：不带它时 `add_header` 只作用于 2xx/3xx/4xx 里的一部分状态码，出错页反而没有隔离头。改完配置要**硬刷新**（甚至清一次站点数据），文档响应会被缓存，旧的那份没头就等于没改。

**`Incorrect response MIME type. Expected 'application/wasm'` 这一句怎么查。** 完整报错是 `TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type. Expected 'application/wasm'.`——注意 `compileStreaming` 和 `instantiateStreaming` 报的是**同一句**（都写 `'compile'`），从文案认不出是哪个 API 调的，别顺着 `compile` 去找 `WebAssembly.compile`。先 `curl -I https://你的域名/assets/pyodide/pyodide.asm.wasm` 看 `Content-Type`：四个 wasm（`clang` / `lld` / `memfs` / `pyodide.asm`）都必须是 `application/wasm`。C++ 那侧的 `compile.worker.js` 一直自己判类型、不对就走 `arrayBuffer`，所以它不会抛这句；**Pyodide 0.29.5 的加载器没有兜底**——`pyodide.js` 里 `getInstantiateWasmFunc` 把 `fetch` 来的 Response 直接交给 `instantiateStreaming`，失败只 `console.warn("wasm instantiation failed!")`，于是解释器装不起来、页面上只看见「正在装入解释器…」一直转。`py.worker.js` 的 `fixWasmMime()` 在 `importScripts` 之前补上了这一层（类型对就原样走流式，不对就用同一个 body 流重包一个类型正确的 Response，仍然流式；回的是 HTML 或非 2xx 则报明确错误），所以服务器标错类型现在也能跑。

**服务器改对了还报同一句，多半是缓存。** `/assets/` 打的是 `max-age=31536000`，改配置**之前**访问过的浏览器会把那份带错 `Content-Type` 的响应连同响应头一起存一年，nginx 改好也不会自动失效；CDN 边缘同理。处置顺序：浏览器硬刷新 / 清站点数据 → 刷 CDN 缓存 → 再 `curl -I` 复核。要让这类事故以后不再发生，给工具链文件名带上版本号（或内容哈希）再配长缓存，别给无版本 URL 打一年。

如果以后把 `assets/` 挪到 CDN 或 OSS（另一个域名），`require-corp` 会连这些子资源一起拦：那边必须回 `Cross-Origin-Resource-Policy: cross-origin`（跨源 `fetch` 还要 `Access-Control-Allow-Origin`），否则要么退回同域，要么把页面的 COEP 换成 `credentialless`（Chrome/Edge 支持，Firefox 不支持，此时调试照样不可用，普通编译运行不受影响）。

### 二、把 60 MB 压下去

60 MB 原文直接发出去太重。实测 `gzip -9`：

| 文件 | 原始 | gzip -9 |
| --- | --- | --- |
| clang.wasm | 31.2 MB | 10.5 MB |
| lld.wasm | 19.5 MB | 6.7 MB |
| sysroot.tar | 9.3 MB | 1.8 MB |
| memfs.wasm | 345 KB | 18 KB |
| 合计 | 60.3 MB | **19.1 MB** |

nginx 开 `gzip on` 并把 `application/wasm` 加进 `gzip_types` 就能拿到上面的数字；brotli 预压缩还能再小一点。工具链是无版本的静态文件，`Cache-Control: public, max-age=31536000, immutable` 尽管打满（`serve.py` 已经这么做了）。

Python 那边只有 12 MB，但同样值得压：实测 `gzip -9` 把 `pyodide.asm.wasm` 从 8.65 MB 压到 2.83 MB（`application/wasm` 已经在 `gzip_types` 里的话这条自动生效）；`python_stdlib.zip` 里面本来就是 deflate，再压只从 2.42 MB 到 2.38 MB，可以不管。`/assets/` 那条长缓存规则是按前缀匹配的，`assets/pyodide/` 已经一起罩住了。`python_stdlib.zip` 是解释器自己要读的字节（`loadPyodide({stdLibURL})` 默认指到 `indexURL + python_stdlib.zip`），走的是哪条取数路径由 Pyodide 内部决定，MIME 不参与判定，nginx 默认的 `application/zip` 就行。

真正要注意的还是上面那条：**这两个头罩不住子目录就没了跨源隔离**，Pyodide 本身不吃 `SharedArrayBuffer`（普通编译运行在非隔离上下文里也能跑），但同一页面切回 C++ 就要用调试，别只给 Python 那一侧放开。

## 依赖与致谢

这个项目完全站在前人的肩膀上——把 LLVM 编译进 wasm、把 WASI 宿主接口在浏览器里跑通这些最难的部分，上游都做完了；本项目做的事是把它们接成一条 textarea → textarea 的路径，并修掉这条路上几个 I/O 与健壮性问题。

| 项目 | 版本 | 许可 | 在本项目中提供什么 |
| --- | --- | --- | --- |
| [binji/wasm-clang](https://github.com/binji/wasm-clang) | — | Apache-2.0 | `js/wasmclang.js` 的驱动层从它的 `shared.js`（Copyright 2020 WebAssembly Community Group participants）派生：Toolchain、MemFS、WasiApp、ustar 解包 |
| [Ben Smith](https://github.com/binji) 的 CppCon 2019 演讲 [Fast, Small, Simple Compile to WASM!](https://www.youtube.com/watch?v=5N4b-rU-OAA) | — | — | 整套"编译器跑在 wasm 里"的思路来源 |
| [luoxuhai/clang.js](https://github.com/luoxuhai/clang.js) | 0.1.1 | Apache-2.0 | `assets/` 下的四个 wasm/tar 二进制（其 README 说明这些二进制复制自 binji 的 llvm-project fork） |
| [LLVM Project](https://llvm.org/)（Clang、LLD、libc++、libc++abi、compiler-rt） | clang 8.0.1 世代 | Apache-2.0 WITH LLVM-exception（LLVM 9 之前的版本为 NCSA/UIUC 许可，源码树内各子项目还带各自的第三方许可） | sysroot 里的头文件、静态库，以及被编译成 `clang.wasm` / `lld.wasm` 的那份源码 |
| [wasi-libc](https://github.com/WebAssembly/wasi-libc) | — | 多重许可：Apache-2.0 WITH LLVM-exception / Apache-2.0 / MIT | sysroot 里的 `libc.a`、`crt1.o` 与 WASI 预览版头文件 |
| [ajaxorg/ace](https://github.com/ajaxorg/ace)（ace-builds） | 1.45.2 | BSD-3-Clause | 源码编辑器的语法高亮、行号、补全；`c_cpp` 和 `python` 两套 mode + snippets 都取的是本地那份 |
| [pyodide/pyodide](https://github.com/pyodide/pyodide) | 0.29.5 | Apache-2.0（`assets/pyodide/` 里另附的 `LICENSE` 为准） | Python 那一侧的整条运行时：`pyodide.asm.wasm` 是把 CPython 编成 wasm 的构建产物，`pyodide.js` / `pyodide.asm.js` 是加载器和 Emscripten 胶水，`python_stdlib.zip` 是标准库 |
| [CPython](https://github.com/python/cpython) | 3.13.2（Pyodide 0.29.5 内嵌的版本） | PSF-2.0 | 语言本身：`compile()` / `marshal` / traceback 的语义、标准库内容，全部来自这份解释器，本项目只做外层装载和 stdio |

本项目的浏览器端改动集中在 I/O 与健壮性，不是重新实现工具链：stdin/stdout 改为字节传输并流式解码（上游拼字符串，中文会乱码）；实现了 `clock_time_get`（上游直接抛 `NotImplemented`，导致 `std::chrono` 和 `time()` 不可用）；链接参数补上 `-lclang_rt.builtins-wasm32`（否则用了 128 位整型的路径会 `undefined symbol: __lttf2`）；宿主导入用 `Proxy` 兜底，未实现的 WASI 函数会在报错信息里指名而不是抛裸 `LinkError`；内存 FS 的 `FindNode` 对不存在的路径是 trap 而不是返回哨兵，因此用 try/catch 包住并二次校验退出码。

## 许可

`js/wasmclang.js` 派生自 Apache-2.0 的 binji/wasm-clang，再分发时请连同它的版权声明一起保留；本项目其余自研代码同样按 Apache-2.0 提供。`assets/` 下的 LLVM 与 wasi-libc 二进制受各自上游许可约束（Apache-2.0 系为主，wasi-libc 另含 MIT 选项，LLVM 8 世代的代码还带 NCSA/UIUC 条款），`vendor/ace/` 为 BSD-3-Clause（Copyright (c) 2010, Ajax.org B.V.）。这些版权声明都别删；上游若附带 `NOTICE` 文件，按 Apache-2.0 的要求一并随分发保留。

`assets/pyodide/` 这一目录要单独说一句：里面的五个文件是 Apache-2.0 的 Pyodide 发行物，而它们跑的语义来自 PSF-2.0 的 CPython。**本目录里只有二进制和加载器，没有带上游的 `LICENSE` 正文**（我们是从 CDN 直接取的文件，没解包 wheel 里的许可附件）。自己部署给人用没问题，但对外再分发这 12 MB 时，请按 Apache-2.0 和 PSF-2.0 各补一份上游 `LICENSE` 进去——从 Pyodide 仓库和 CPython 仓库各取一份就行，别到要用的时候才发现缺。
