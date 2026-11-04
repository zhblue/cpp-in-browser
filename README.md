# 浏览器里的 C++：cpp-wasm-playground

一个纯前端的 C/C++ 编译运行环境。左边 Ace 编辑器里写 `main.cc`，右边填 stdin，点一下按钮就在浏览器里完成 **clang 编译 → wasm-ld 链接 → 生成新的 wasm 模块 → 执行 → 输出 stdout/stderr**，退出码、编译耗时、运行耗时、内存峰值一起报出来。全程没有后端，没有任何代码上传。另一条路是点「编译并调试」：编译时在 LLVM IR 里插行桩和变量桩，跑起来后可以双击下断点、单步、按 10⁻ⁿ 调速，停住时鼠标悬在变量名上看它的当前值。标题可点击跳转到项目主页（新标签页打开，不打断当前编译状态），工具链体积等说明文字收在标题的悬停 tips 里；标题右侧一个「白天」复选框切换深 / 浅配色，连代码编辑器的语法主题一起换（夜晚 `one_dark` / 白天 `tomorrow`），选择记在 `localStorage`，下次进来沿用。

实现方式是 **clang 和 lld 自己被编译成 WebAssembly**，在页面的 Worker 里当"宿主程序"跑，而不是把 g++ 搬进浏览器。g++ 搬不进来的原因是结构性的：它依赖 GCC 内部库和 configure 阶段对宿主环境的一堆探测结果，这些东西在 wasm 里复现不了；本项目的工具链整体来自 LLVM。

## 快速开始

Worker 和 `fetch('*.wasm')` 在 `file://` 下都会被浏览器拦掉，所以必须走 http。项目自带一个只依赖 Python 标准库的小服务器：

```bash
cd cpp-wasm-playground
python3 serve.py 8765
# cpp-wasm-playground  ->  http://127.0.0.1:8765/index.html
```

然后打开 <http://127.0.0.1:8765/index.html>，等状态栏从"正在初始化工具链…"变成绿点的"工具链就绪"。首次要下载约 60 MB 工具链（页头写的 58 MB 是按 MiB 算的同一个数），就绪耗时页面自己会报在那行里（实测 HTTP 缓存和浏览器 wasm 代码缓存都命中时是 0.1 秒，冷启动主要耗在下载上）。之后 `assets/` 和 `vendor/` 走一年长缓存，再开基本秒就绪。

换任何静态服务器都行，只要注意三点：`.wasm` 建议给 `application/wasm` 这个 MIME（不对的话会退化成先收完整字节再编译，能用但慢）；如果加了 CSP，必须允许 `'wasm-unsafe-eval'`（或 `'unsafe-eval'`），否则 wasm 编译本身会被拒；要用单步调试就必须带上 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`（`serve.py` 已经带上了）——没有这两个响应头就没有跨源隔离，`SharedArrayBuffer` 拿不到，调试器停不住。

## 界面与操作

| 控件 | 作用 |
| --- | --- |
| 示例 | 七个预置用例：手工冒泡排序（慢速演示）/ STL 容器与算法 / 读入 stdin + 中文输出 / string map sstream / 递归 + 大栈 / 死循环（演示超时被终止）/ 编译错误（演示诊断输出）。选中即同时填好源码和 stdin。「手工冒泡排序」内置 30 个数据、手写双重循环（425 次比较 / 214 次交换），行桩触发次数多、当前行在几行之间反复推进，最适配合「每行停留」看慢动作 |
| 标准 | `-std=c++14` / `c++17`（默认）/ `c++2a`。工具链是 LLVM 8 年代，`c++2a` 只覆盖到该快照已实现的部分 |
| 优化 | `-O0` ～ `-O3`，默认 `-O2` |
| 额外 cc1 参数 | 原样拼进 `clang -cc1`，默认 `-Wall`。可加 `-Wextra`、`-DNDEBUG` 之类 |
| 栈大小 | 链接参数 `-z stack-size`，默认 8 MB；深递归用例可调到 64 MB |
| 运行超时(ms) | 看门狗时长，默认 5000。到点直接终止运行用的 Worker。**只作用于「编译并运行」**，「编译并调试」不设超时 |
| 编译并运行 | `Ctrl+Enter`（macOS `Cmd+Enter`） |
| 编译并调试 | `Ctrl+Shift+Enter`（macOS `Cmd+Shift+Enter`），见下面「单步调试」一节 |
| 停止 | `Ctrl+.` 或 `Esc` |
| 重载工具链 | 清空输出并重建编译 Worker（改了工具链文件时用） |
| 清空输出 | 输出框右上角的红色小按钮，同时清掉 stdout/stderr 和字符计数 |

左侧是 Ace 编辑器（主题跟着「白天 / 夜晚」复选框走：夜晚 `one_dark`、白天 `tomorrow`；C/C++ 模式、带补全弹窗），右侧从上到下是 stdin 40%、状态栏 10%、输出 50%。源码和 stdin 会存进 `localStorage`，刷新不丢。

状态栏四个格子分别是**退出码**（编译失败时显示 clang/wasm-ld 的退出码，「编译并运行」超时显示 `TLE`；调试会话不设超时，不会出现 `TLE`）、**编译耗时**、**运行耗时**、**内存峰值**（用户 wasm 实例线性内存的最终大小）。编译期诊断和运行期输出走同一条字节通道，统一解码后追加到输出框。

## 单步调试（断点 / 调速 / 看变量）

点「编译并调试」进入。这条路和「编译并运行」共用工具链，只是编译参数换成固定的 `-O0 -g`，产物多两个由 JS 实现的环境函数。

**它是怎么停住的**：`clang -cc1 -emit-llvm -debug-info-kind=standalone` 先出 LLVM IR 文本，驱动层解析 `!DILocation` / `!DISubprogram` / `!DILocalVariable` / `!DIBasicType` 这些元数据，在每个源码行边界插一条 `call void @__pg_trace(i32 行号)`，给每个局部变量插一条 `call void @__pg_var(i32 id, i32 lo, i32 hi)`（值从 `llvm.dbg.declare` 绑定的那个栈槽 alloca 里 `load` 出来，64 位拆成高低两个 i32），然后再 `-emit-obj` → `wasm-ld --allow-undefined`。这两个函数在运行 Worker 里是真正的 JS 回调，控制块是一块 `SharedArrayBuffer`；行桩里用 `Atomics.wait` **把 wasm 的执行真的冻在当前那一行**，主线程写 `GO` 再 `Atomics.notify` 才往下走——不是靠定时器猜位置。

| 操作 | 说明 |
| --- | --- |
| 双击行号 / `Ctrl+B` | 增删断点，装订线上一个红点 |
| 下一行 | 单步：走一个行桩就再停住 |
| 暂停 | 让下一次行桩触发时停住 |
| 继续 | 跑到下一个断点，或者跑到程序结束 |
| 退出调试 | 终止运行 Worker，编辑器恢复可写 |
| 每行停留 | 执行一行源码额外等的时间：1 s / 0.5 s（默认）/ 0.2 s / 10⁻¹ ～ 10⁻⁶ s / 全速。亚毫秒档位是欠账累计满 1 ms 才真睡一次（`Atomics.wait` 带超时），不空转烧 CPU。这个下拉框放在顶部工具条（不在只有会话才显示的调试条里），**点「编译并调试」之前就能先选好**，会话建立时以它为准；进入调试后随时改也立刻生效 |
| 运行超时 | 调试会话**不受**顶部「运行超时(ms)」约束，一个看门狗都不装：跑多久都不会被判超时，慢速走完长循环、乃至死循环都由你自己用「停止 / 退出调试」结束 |

当前执行行用 Ace 的 `screenLine` marker 铺满整行宽（`fullLine` 只铺到行尾内容，短行几乎看不见），运行中是蓝色、停住是琥珀色，左边一条色条，装订线的行号同时染色。**注意自定义 marker 类必须自己写 `position: absolute`**：Ace 的 CSS 只给它认识的那几个 marker 类设了绝对定位，自定义类不设的话 `top` 不生效，高亮条会贴在编辑区第一行上。

**看变量**：程序停住时把鼠标放到源码里的变量名上，浮动框给出 `名字 : 类型 = 值`。覆盖 POD——整型（含 `long long`，按高低位拼回）、浮点、指针（显示线性内存地址）、`bool`、`char`（同时给字符和数值），`int&` 这类引用会多插一次 `load` 显示被引用对象的值。`std::string`、容器、结构体只报名字和类型、不展开内容；可见性按「声明行 ≤ 当前行」判定，所以刚停在声明行上时多半显示"本行声明，可能还没赋值"。快照调用排在行桩之前，因此停在某行看到的是**这一行开始前**的值，符合"这行还没执行"的直觉。

**及时看到程序的输出**：程序用 `std::endl` / `std::flush` 写的行本来就会立刻刷出来，但竞赛风格地只写 `"\n"` 时，内容其实压在 libc++ 的 C `stdout` 缓冲里（`sync_with_stdio` 默认开着），要等写满 1 KB 或程序结束才到宿主。调试构建在每个行桩、`__pg_trace` 之前多插一条 `fflush(null)`，所以停在某行、或降速逐行走的时候，前面几行 `cout` 出去的内容已经实时进到了输出框。小坑：这条 `call` 的返回值必须给一个显式非数字名（借用插桩自己的 `tmp` 计数器），裸写匿名 `call i32 @fflush` 会被 LLVM 自动占一个 `%0/%1/…` 编号，跟 clang 原样抄下来的 `%0 = bitcast`、`%1 = load` 撞号，报 "instruction expected to be numbered"；`__pg_trace` 是 `void`，没这问题。（若程序自己 `sync_with_stdio(false)`，`std::cout` 改用 libc++ 内部缓冲，这条 `fflush` 刷不动它——教学用例没人这么写。）

**每次运行都从空输出开始**：点「编译并运行」「编译并调试」都会先清掉输出框和上一次的解码头，运行/编译的诊断直接落进干净框里，不再和历史输出叠在一起。

**耗时口径**：停在某行上想下一步的时间、降速刻意睡掉的时长都不是程序在跑。控制块里 `PARKED_MS` / `SLOW_MS` 两个槽由 Worker 累加，状态栏的运行耗时是总耗时减去这两段，鼠标悬在数字上能看到各扣了多少。降速的睡眠按 50 ms 一片——片小一点，按「暂停」时下一行很快就能停住，不用先把一整秒睡满；记账是先加计划片长、醒来再补实际超出的那几毫秒，只记计划值的话报表里的降速时间会偏小，扣不干净。

**调试不设运行超时**：顶部「运行超时(ms)」只给「编译并运行」装看门狗；「编译并调试」压根不装（`runProgram` 只在没传控制块时才 `setTimeout`）。逐步看的东西跑多久都不该被判 TLE——0.5 s/行走一个几十行的程序，光降速就早超过 5000 ms 了，死循环也一样由人自己用「停止 / 退出调试」结束（`dbgStopRun` 终止运行 Worker 并把等待中的 `runProgram` 以 `aborted` 结掉）。所以调试会话的状态栏不会出现 `TLE`。

**看变量的实现细节**：停住时鼠标悬在变量名上取值，不能用 `e.target` 是不是 `.ace_identifier` 那个 span 来判断——Ace 的 `.ace_layer` 整层 `pointer-events: none`（它 CSS 里写了，为了 Safari 滚轮不被打断），真实鼠标事件的 target 永远是 `div.ace_content`。走的是坐标反查：`renderer.screenToTextCoordinates(clientX, clientY)` 拿行列，再 `session.getTokenAt(row, column)` 取该位置的 token。

**前提与限制**：`SharedArrayBuffer` 要求跨源隔离，`serve.py` 已经带 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`，用别的服务器要自己加，否则页面会直说"拿不到 SharedArrayBuffer，无法调试"。行号可信的前提是 `-O0`，调试构建不接受优化档位；STL 头文件里的实现不插桩，所以单步进不了 `std::sort` 内部；这套行号来自 IR 元数据而不是 DWARF 的 `.debug_line`，够教学演示，但别按 gdb 的语义期待它。

## 工作原理

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

几个关键设计：

编译 Worker 常驻，工具链和 sysroot 只加载一次；运行 Worker 每次新建、用完即弃。这样超时只要 `terminate()` 就能硬杀死循环，且不会伤到编译器状态，代价是一次 Worker 创建（约几毫秒）。

输入输出全程按 `Uint8Array` 传字节，只在主线程用 `TextDecoder('utf-8', {stream:true})` 解码，中文和跨 flush 边界的多字节字符不会乱码。

链接走静态链接：`crt1.o + libc++.a + libc++abi.a + libc.a + libclang_rt.builtins-wasm32.a` 一起打进产物，STL 可用性不依赖任何运行时的系统库。链接参数沿用了上游的 `--export-dynamic`（导出全部符号），libc++ 被拉进来的那批目标文件会整片留在产物里，所以产物不小——示例中的 STL 用例是 1.3 MB，具体字节数状态栏那行会报出来。

## 目录结构

```
cpp-wasm-playground/
├── index.html              页面 + 全部样式（单文件，无框架）
├── serve.py                本地静态服务器（长缓存 + .wasm MIME）
├── js/
│   ├── wasmclang.js        工具链驱动层：Toolchain / MemFS / WasiApp / Tar / IR 行插桩与变量表
│   ├── compile.worker.js   常驻编译 Worker
│   ├── run.worker.js       一次性运行 Worker
│   ├── dbgproto.js         调试控制块（SharedArrayBuffer）布局，主线程与 Worker 共用一份定义
│   └── main.js             UI 编排、Ace、指标、快捷键、localStorage
├── assets/                 工具链（约 60 MB，见下方致谢）
│   ├── clang.wasm          31.2 MB
│   ├── lld.wasm            19.5 MB
│   ├── sysroot.tar          9.3 MB（解包后 8.95 MB / 416 个文件）
│   └── memfs.wasm           345 KB
└── vendor/ace/             ace-builds 1.45.2 的 src-min-noconflict 子集（约 552 KB，本地化以保证离线可用）
```

## 已知限制

工具链是 LLVM 8 年代的 clang + libc++，不是 GCC/libstdc++。因此没有 `<bits/stdc++.h>`，没有 C++20 的 `<concepts>` `<ranges>` `<format>` `<coroutine>`，也不要有"和 g++ 报错完全一致"的预期。libc++ 的 STL 本身（容器、算法、迭代器、`<string>` `<map>` `<sstream>` `<chrono>` 等）是完整可用的。

文件系统是一个空的内存 FS，程序跑起来时里面没有任何文件，`std::filesystem`、`fopen` 读外部数据基本无从谈起。

`std::thread` / `<execution>` 需要 SharedArrayBuffer 加跨源隔离（COOP/COEP）。从 `serve.py` 打开就是隔离的（单步调试也依赖这一条），换成别的服务器要自己补那两个头，否则多线程和调试都用不了；单线程程序不受影响。

超时靠终止 Worker 实现，能可靠杀掉死循环，但拿不到精确 CPU 时间，也不区分 CPU 时间和挂钟时间。wasm 线性内存只能增长不能收缩，宿主侧无法给它设上限——超内存会以 `memory access out of bounds` 报出来，而不是 MLE。`system()`、`fork()`、管道这类进程 API 在 WASI 预览版里不存在。

所以：**这个可以当教学、写码验证、面试手撕、离线 playground 用，不能当 OJ 判题后端**。判题要的是精确内存计量、进程级隔离、可对齐 g++ 的诊断信息，这些只有服务端真装一个 g++ 才给得了。

## 部署建议

60 MB 原文直接发出去太重。实测 `gzip -9`：

| 文件 | 原始 | gzip -9 |
| --- | --- | --- |
| clang.wasm | 31.2 MB | 10.5 MB |
| lld.wasm | 19.5 MB | 6.7 MB |
| sysroot.tar | 9.3 MB | 1.8 MB |
| memfs.wasm | 345 KB | 18 KB |
| 合计 | 60.3 MB | **19.1 MB** |

nginx 开 `gzip on` 并把 `application/wasm` 加进 `gzip_types` 就能拿到上面的数字；brotli 预压缩还能再小一点。工具链是无版本的静态文件，`Cache-Control: public, max-age=31536000, immutable` 尽管打满（`serve.py` 已经这么做了）。

## 依赖与致谢

这个项目完全站在前人的肩膀上——把 LLVM 编译进 wasm、把 WASI 宿主接口在浏览器里跑通这些最难的部分，上游都做完了；本项目做的事是把它们接成一条 textarea → textarea 的路径，并修掉这条路上几个 I/O 与健壮性问题。

| 项目 | 版本 | 许可 | 在本项目中提供什么 |
| --- | --- | --- | --- |
| [binji/wasm-clang](https://github.com/binji/wasm-clang) | — | Apache-2.0 | `js/wasmclang.js` 的驱动层从它的 `shared.js`（Copyright 2020 WebAssembly Community Group participants）派生：Toolchain、MemFS、WasiApp、ustar 解包 |
| [Ben Smith](https://github.com/binji) 的 CppCon 2019 演讲 [Fast, Small, Simple Compile to WASM!](https://www.youtube.com/watch?v=5N4b-rU-OAA) | — | — | 整套"编译器跑在 wasm 里"的思路来源 |
| [luoxuhai/clang.js](https://github.com/luoxuhai/clang.js) | 0.1.1 | Apache-2.0 | `assets/` 下的四个 wasm/tar 二进制（其 README 说明这些二进制复制自 binji 的 llvm-project fork） |
| [LLVM Project](https://llvm.org/)（Clang、LLD、libc++、libc++abi、compiler-rt） | clang 8.0.1 世代 | Apache-2.0 WITH LLVM-exception（LLVM 9 之前的版本为 NCSA/UIUC 许可，源码树内各子项目还带各自的第三方许可） | sysroot 里的头文件、静态库，以及被编译成 `clang.wasm` / `lld.wasm` 的那份源码 |
| [wasi-libc](https://github.com/WebAssembly/wasi-libc) | — | 多重许可：Apache-2.0 WITH LLVM-exception / Apache-2.0 / MIT | sysroot 里的 `libc.a`、`crt1.o` 与 WASI 预览版头文件 |
| [ajaxorg/ace](https://github.com/ajaxorg/ace)（ace-builds） | 1.45.2 | BSD-3-Clause | 源码编辑器的语法高亮、行号、补全 |

本项目的浏览器端改动集中在 I/O 与健壮性，不是重新实现工具链：stdin/stdout 改为字节传输并流式解码（上游拼字符串，中文会乱码）；实现了 `clock_time_get`（上游直接抛 `NotImplemented`，导致 `std::chrono` 和 `time()` 不可用）；链接参数补上 `-lclang_rt.builtins-wasm32`（否则用了 128 位整型的路径会 `undefined symbol: __lttf2`）；宿主导入用 `Proxy` 兜底，未实现的 WASI 函数会在报错信息里指名而不是抛裸 `LinkError`；内存 FS 的 `FindNode` 对不存在的路径是 trap 而不是返回哨兵，因此用 try/catch 包住并二次校验退出码。

## 许可

`js/wasmclang.js` 派生自 Apache-2.0 的 binji/wasm-clang，再分发时请连同它的版权声明一起保留；本项目其余自研代码同样按 Apache-2.0 提供。`assets/` 下的 LLVM 与 wasi-libc 二进制受各自上游许可约束（Apache-2.0 系为主，wasi-libc 另含 MIT 选项，LLVM 8 世代的代码还带 NCSA/UIUC 条款），`vendor/ace/` 为 BSD-3-Clause（Copyright (c) 2010, Ajax.org B.V.）。这些版权声明都别删；上游若附带 `NOTICE` 文件，按 Apache-2.0 的要求一并随分发保留。
