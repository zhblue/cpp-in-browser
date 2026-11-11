/* langs.js — 语言登记表。主流程（main.js）只认这里的字段，不认具体语言。
   再加一门语言 = 往 LANGS 里加一项 + 一个编译 worker + 一个运行 worker（解释器型
   语言可以两者合一，见 singleWorker）+ 一份 examples.<id>.js，main.js 不用改。

   字段的意思：
     label / title / titleTip  下拉框里的名字、页面 h1 的文字与悬停说明
     aceKey                    Ace 的语法/片段模块名（mode-<key>.js、snippets/<key>.js）
     filename / runName        诊断里用的源文件名、递给运行 worker 的产物名
     assets / initHint         工具链资源（相对 assets/）与初始化时那句提示
     readyLabel                就绪时那句话的主语（工具链 / 解释器）
     compileWorker             常驻 worker：收 init / compile
     runWorker                 一次性运行 worker：收 run；singleWorker 为真时不用它
     singleWorker              编译和运行是同一个常驻 worker。解释器型语言的重资产
                               是运行时本身（Pyodide 装一次要一两秒），不像 clang
                               那样编译重、运行轻，所以不该每次运行都重装一份。
                               超时/停止照样 terminate，之后自动重新初始化。
     fields                    工具条上这门语言用得着的字段 id，其余隐藏
     examples                  示例集（纯数据，键序即展示顺序）
     runLabel / debugLabel     两个主按钮的文案
     reloadLabel               「重载工具链 / 重载解释器」那个按钮
     stdinHint / buildMetric / memLabel
                               右栏三处随语言变的小标题：stdin 喂给谁、
                               构建耗时那一格叫什么、内存那一格量的是什么
     debug / debugWhy          能不能单步调试（行桩 + 断点 + 单步 + 热力 + 调速 + BGM）；
                               不能时按钮禁用。debugWhy 说「还缺哪一块」，写进按钮 title
     values                    停住时能不能读变量值（悬停展开 + 观察窗）。为假时观察窗
                               整块隐藏、悬停只报这行的执行次数——有行桩没值通道是调试
                               的一个中间形态，界面不能装作两样都有
     valueChannel              值从哪条路来：'guest' = 用户模块那块共享线性内存，主线程
                               按地址直接读（C++）；'locals' = 停住前 Worker 递一份当前帧
                               的变量快照，主线程只拼字（解释器型语言，堆在 Worker 里）
     phaseText                 构建各阶段失败时怎么说（编译/链接/插桩/语法检查）
     killedText                运行超时被终止时那句提示（C++ 杀的是运行 Worker，
                               解释器型语言杀的是常驻解释器，说法不能一样）
     opts(ui, debug)           把工具条的值翻成这门语言 worker 认的编译选项

   worker 协议与语言无关：init / compile → progress / ready / result / error，
   run → write / guest / locals / exit。产物一律叫 artifact（一块 ArrayBuffer），字节数由
   worker 算好放进 size，页面不用知道那是 wasm 还是 marshal 过的字节码。
   值通道有两种走法：C++ 发 guest（用户模块那块共享线性内存，主线程按地址读），
   解释器型语言发 locals（停住前递一份当前帧的变量快照，堆在 Worker 里读不到）。 */
'use strict';

const LANGS = {
  cpp: {
    id: 'cpp',
    label: 'C++',
    title: '浏览器里的 g++',
    docTitle: '浏览器里的 g++ — clang.wasm 在线编译运行',
    titleTip: 'clang.wasm + wasm-ld + Ace，全程零服务器。工具链在 Web Worker 里执行，用户程序跑在独立的 wasm 实例中（天然沙箱）。首次加载约 58 MB：clang.wasm 31 MB + lld.wasm 19 MB + sysroot.tar 9 MB。',
    aceKey: 'c_cpp',
    filename: 'main.cc',
    runName: 'main.wasm',
    assets: { clang: 'clang.wasm', lld: 'lld.wasm', memfs: 'memfs.wasm', sysroot: 'sysroot.tar' },
    initHint: '正在初始化工具链（首次需下载约 58 MB）…',
    readyLabel: '工具链就绪',
    compileWorker: 'js/compile.worker.js',
    runWorker: 'js/run.worker.js',
    singleWorker: false,
    fields: ['std', 'opt', 'extra', 'stack'],
    examples: CPP_EXAMPLES,
    runLabel: '编译并运行',
    debugLabel: '编译并调试',
    reloadLabel: '重载工具链',
    stdinHint: '喂给 cin / getline',
    buildMetric: '编译耗时',
    memLabel: '内存峰值',
    debug: true,
    values: true,
    valueChannel: 'guest',
    phaseText: { compile: '编译', link: '链接', instrument: '插桩' },
    killedText: '运行超时，已终止运行 Worker',
    opts(ui, debug) {
      const o = {
        std: ui.std, optimize: ui.optimize, stackSize: ui.stackSize, flags: ui.flags,
        filename: this.filename, obj: 'main.o', output: 'main.wasm',
        clang: this.assets.clang, lld: this.assets.lld,
        debug: !!debug,
      };
      if (debug) { o.obj = 'main.dbg.o'; o.output = 'main.dbg.wasm'; }
      return o;
    },
  },

  py: {
    id: 'py',
    label: 'Python',
    title: '浏览器里的 Python',
    docTitle: '浏览器里的 Python — Pyodide 在线运行',
    titleTip: 'Pyodide（CPython 3.13 编译成 wasm）+ Ace，全程零服务器，解释器在 Web Worker 里跑。首次加载约 12 MB：pyodide.asm.wasm 8.6 MB + 标准库 2.4 MB + 胶水 1 MB。不装第三方包，标准库够用。',
    aceKey: 'python',
    filename: 'main.py',
    runName: 'main.py',
    assets: { pyodide: 'pyodide/' },
    initHint: '正在初始化解释器（首次需下载约 12 MB）…',
    readyLabel: '解释器就绪',
    compileWorker: 'js/py.worker.js',
    runWorker: 'js/py.worker.js',
    singleWorker: true,
    fields: [],
    examples: PY_EXAMPLES,
    runLabel: '运行',
    debugLabel: '调试',
    reloadLabel: '重载解释器',
    stdinHint: '喂给 input() / sys.stdin',
    buildMetric: '语法检查',
    memLabel: '解释器堆',
    debug: true,
    values: true,
    valueChannel: 'locals',
    phaseText: { compile: '语法检查' },
    killedText: '运行超时，已终止解释器，下次运行自动重新装入',
    opts(ui, debug) {
      return { filename: this.filename, debug: !!debug };
    },
  },
};

/* 下拉框里的顺序，也是「第一次进页面用哪门语言」的兜底顺序 */
const LANG_ORDER = ['cpp', 'py'];
const LANG_KEY = 'cpp-playground.lang';

function langById(id) {
  return LANGS[id] || LANGS[LANG_ORDER[0]];
}

/* 本地存储按语言分开：C++ 沿用旧键（老用户存的源码不能丢），其余加后缀。
   配色、字号、BGM 是全站偏好，不分语言。 */
function localKey(base, lang) {
  return lang.id === 'cpp' ? base : base + '.' + lang.id;
}