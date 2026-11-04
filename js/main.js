/* main.js — 页面编排：常驻编译 Worker + 一次性运行 Worker */
'use strict';

/* Worker 里 fetch 是相对 worker 脚本解析的，所以必须给绝对 URL */
const BASE = new URL('assets/', location.href).href;
const ASSETS = { clang: 'clang.wasm', lld: 'lld.wasm', memfs: 'memfs.wasm', sysroot: 'sysroot.tar' };

const $ = (id) => document.getElementById(id);
const stdinEl = $('stdin'), outEl = $('out');
const dotEl = $('dot'), msgEl = $('msg');
const runBtn = $('run'), stopBtn = $('stop'), clearBtn = $('clear'), reloadBtn = $('reload');
const debugBtn = $('debug'), dbgBar = $('dbgbar'), dbgState = $('dbgstate'), dbgSpeed = $('dbspeed');

/* ---------- Ace 编辑器（模块全部本地化，保持离线可用） ---------- */
const ACE_BASE = new URL('vendor/ace/', location.href).href;
ace.config.setModuleUrl('ace/mode/c_cpp', ACE_BASE + 'mode-c_cpp.js');
ace.config.setModuleUrl('ace/theme/one_dark', ACE_BASE + 'theme-one_dark.js');
ace.config.setModuleUrl('ace/theme/tomorrow', ACE_BASE + 'theme-tomorrow.js');
ace.config.setModuleUrl('ace/snippets/c_cpp', ACE_BASE + 'snippets/c_cpp.js');
ace.config.setModuleUrl('ace/ext/language_tools', ACE_BASE + 'ext-language_tools.js');

const srcEditor = ace.edit('editor', {
  mode: 'ace/mode/c_cpp',
  theme: 'ace/theme/one_dark',
  fontSize: '13px',
  showPrintMargin: false,
  useWorker: false,          /* 语法定位检查 worker 未打包，关掉以免 404 */
  wrap: false,
  tabSize: 4,
  useSoftTabs: true,
  displayIndentGuides: true,
});

/* language_tools 已在页面里用 script 标签同步加载，这三个选项必须在
   编辑器建好之后用 setOptions 给，构造参数里传会被 Ace 判定为拼写错误。 */
ace.require('ace/ext/language_tools');
srcEditor.setOptions({
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: false,
  enableSnippets: true,
});

/* ---------- 白天 / 夜晚配色 ----------
   页面配色全靠 CSS 变量：勾上就把 body 上的 day 类切过去，变量整组替换；
   Ace 编辑器的语法主题跟着一换（夜晚 one_dark / 白天 tomorrow）。选择记进
   localStorage，下次进页面直接是上次的模式。 */
const THEME_KEY = 'cpp-playground.theme';
function applyTheme(day) {
  document.body.classList.toggle('day', day);
  srcEditor.setTheme(day ? 'ace/theme/tomorrow' : 'ace/theme/one_dark');
  const cb = $('theme');
  if (cb) cb.checked = day;
}
(function initTheme() {
  let day = false;
  try { day = localStorage.getItem(THEME_KEY) === 'day'; } catch (e) {}
  applyTheme(day);
  const cb = $('theme');
  if (cb) cb.addEventListener('change', () => {
    applyTheme(cb.checked);
    try { localStorage.setItem(THEME_KEY, cb.checked ? 'day' : 'night'); } catch (e) {}
  });
})();

function setSource(text) {
  srcEditor.setValue(text, -1);
  srcEditor.clearSelection();
  srcEditor.gotoLine(1, 0, false);
  clearAllBreakpoints();   /* 换源码了，按行号画的断点不再有意义 */
  updateSrcLen();
}
function updateSrcLen() {
  const v = srcEditor.getValue();
  $('srclen').textContent = `${v.length} 字符 / ${v.split('\n').length} 行`;
}

const EXAMPLES = {
  '手工冒泡排序（慢速演示）': {
    stdin: '',
    code: `#include <iostream>
#include <iomanip>

// 30 个数据，手工冒泡。比较 + 交换约 425 / 214 次，
// 双重循环会把当前行高亮一格一格往前推，适合配合「每行停留」看慢动作。
int main() {
    int a[30] = {42, 17, 88, 3, 65, 29, 51, 74, 8, 93,
                 36, 12, 60, 47, 21, 79, 5, 68, 34, 56,
                 90, 15, 63, 40, 72, 26, 85, 11, 49, 23};
    int n = 30;

    std::cout << "排序前：\\n";
    for (int i = 0; i < n; ++i) {
        std::cout << std::setw(4) << a[i];
        if (i % 10 == 9) std::cout << "\\n";
    }
    std::cout << "\\n";

    int cmp = 0, swp = 0;
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            ++cmp;
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                ++swp; swapped = true;
            }
        }
        std::cout << "第 " << i + 1 << " 趟后：";
        for (int k = 0; k < n; ++k) std::cout << std::setw(4) << a[k];
        std::cout << "\\n";
        if (!swapped) break;
    }

    std::cout << "排序完成：比较 " << cmp << " 次，交换 " << swp << " 次。\\n";
    return 0;
}
`,
  },
  'STL 容器与算法': {
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <iomanip>

int main() {
    std::vector<int> v{5, 3, 9, 1, 7, 2, 8};

    std::sort(v.begin(), v.end());
    long long sum = std::accumulate(v.begin(), v.end(), 0LL);
    auto [lo, hi] = std::minmax_element(v.begin(), v.end());

    std::cout << "sorted : ";
    for (int x : v) std::cout << std::setw(3) << x;
    std::cout << "\\nsum    : " << sum
              << "\\nmin,max: " << *lo << ", " << *hi
              << "\\nsize   : " << v.size() << std::endl;
    return 0;
}
`,
  },
  '读入 stdin + 中文输出': {
    stdin: `3
Alice 92
Bob 78
Carol 88
`,
    code: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

struct Student { std::string name; int score; };

int main() {
    int n;
    if (!(std::cin >> n)) { std::cerr << "没有读到人数\\n"; return 1; }

    std::vector<Student> a(n);
    for (auto& s : a) std::cin >> s.name >> s.score;

    std::sort(a.begin(), a.end(),
              [](const Student& x, const Student& y) { return x.score > y.score; });

    std::cout << "成绩排名（降序）:\\n";
    for (size_t i = 0; i < a.size(); ++i)
        std::cout << i + 1 << ". " << a[i].name << "  " << a[i].score << "\\n";

    double avg = 0;
    for (const auto& s : a) avg += s.score;
    std::cout << "平均分: " << avg / a.size() << "\\n";
}
`,
  },
  'string / map / sstream': {
    stdin: 'hello world hello wasm world\n',
    code: `#include <iostream>
#include <sstream>
#include <string>
#include <map>

int main() {
    std::map<std::string, int> freq;
    std::string line, word;
    while (std::getline(std::cin, line)) {
        std::istringstream iss(line);
        while (iss >> word) ++freq[word];
    }
    std::cout << "词频统计:\\n";
    for (const auto& [w, c] : freq) std::cout << w << " -> " << c << "\\n";
}
`,
  },
  '递归 + 大栈': {
    stdin: '30\n',
    code: `#include <iostream>
#include <vector>

unsigned long long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }

int main() {
    int n; std::cin >> n;
    std::cout << "fib(" << n << ") = " << fib(n) << std::endl;
    std::vector<double> buf(1 << 20, 0.5);
    double s = 0; for (double d : buf) s += d;
    std::cout << "1M 个 double 的和 = " << s << std::endl;
}
`,
  },
  '死循环（演示超时被终止）': {
    stdin: '',
    code: `#include <iostream>
int main() {
    std::cout << "开始跑，不会停" << std::endl;
    long long i = 0;
    while (true) { ++i; }
    std::cout << i << std::endl;
}
`,
  },
  '编译错误（演示诊断输出）': {
    stdin: '',
    code: `#include <iostream>
#include <vector>
int main() {
    std::vector<int> v;
    v.adn(1);            // 拼错了
    int n = "abc";       // 类型不对
    std::cout << v[0] << n;
}
`,
  },
};

/* ------------------------------------------------------------------ */
/* 状态与输出                                                          */
/* ------------------------------------------------------------------ */
let decoder = null;

function newDecodeSession() {
  if (decoder) try { outEl.value += decoder.decode(); } catch (e) {}
  decoder = new TextDecoder('utf-8', { fatal: false });
}
function pushBytes(bytes) {
  if (!decoder) newDecodeSession();
  outEl.value += decoder.decode(bytes, { stream: true });
  outEl.scrollTop = outEl.scrollHeight;
  $('outlen').textContent = outEl.value.length + ' 字符';
}
function closeDecodeSession() {
  if (decoder) { outEl.value += decoder.decode(); decoder = null; }
}

/* 每次点「编译并运行 / 编译并调试」都从空输出开始。丢弃上一次的解码头，
   免得它把残留的半个多字节序列刷进新框；输出长度计数一并清零。 */
function clearOutput() {
  decoder = null;
  outEl.value = '';
  outEl.scrollTop = 0;
  $('outlen').textContent = '';
}

function say(text, cls) {
  msgEl.textContent = text;
  msgEl.className = cls || '';
}
function setDot(kind) { dotEl.className = 'dot' + (kind ? ' ' + kind : ''); }

/* ---------- 状态面板四项指标 ---------- */
const METRICS = { exit: $('m-exit'), compile: $('m-compile'), run: $('m-run'), mem: $('m-mem') };
function metric(key, text, cls, tip) {
  const el = METRICS[key];
  if (!el) return;
  el.textContent = text;
  el.className = cls || '';
  el.title = tip || '';
}
function resetMetrics() {
  for (const k of Object.keys(METRICS)) metric(k, '—', '');
}

const enc = new TextEncoder();

/* ------------------------------------------------------------------ */
/* Worker 管理                                                         */
/* ------------------------------------------------------------------ */
let compileWorker = null;
let workerReady = false;
let readyResolve = null, readyReject = null;
let readyPromise = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });

let runWorker = null;
let watchdog = null;
let currentRun = null;

function startCompileWorker() {
  workerReady = false;
  readyPromise = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
  if (compileWorker) compileWorker.terminate();
  compileWorker = new Worker('js/compile.worker.js');
  compileWorker.onmessage = onCompileMessage;
  compileWorker.onerror = (e) => {
    setDot('bad');
    say('Worker 出错：' + e.message, 'err');
  };
  setDot('busy');
  say('正在初始化工具链（首次需下载约 58 MB）…');
  compileWorker.postMessage({ type: 'init', base: BASE, assets: ASSETS });
}

function onCompileMessage(ev) {
  const m = ev.data;
  switch (m.type) {
    case 'progress': say(m.text + '…'); break;
    case 'write': pushBytes(new Uint8Array(m.bytes)); break;
    case 'ready':
      workerReady = true;
      setDot('ready');
      say(`工具链就绪（${(m.initMs / 1000).toFixed(1)} s，sysroot 装入 ${m.sysrootFiles} 个文件）`, 'ok');
      readyResolve();
      break;
    case 'stage':
      if (m.stage === 'compile') say('编译中（clang -cc1）…');
      else if (m.stage === 'compile-debug') say('调试构建中（出 IR → 插桩 → 目标文件 → 链接）…');
      break;
    case 'result':
      if (m.ok) {
        lastCompileMs = m.ms;
        compileResolve && compileResolve({
          wasm: m.wasm, lines: m.lines || null,
          vars: m.vars || null, lineVars: m.lineVars || null,
        });
      }
      else { compileReject && compileReject({ phase: m.phase, ms: m.ms, exitCode: m.exitCode }); }
      break;
    case 'error':
      setDot('bad');
      say('编译器侧错误', 'err');
      outEl.value += '\n' + m.message + '\n';
      if (readyReject) readyReject(new Error(m.message));
      compileReject && compileReject({ jsError: m.message });
      break;
  }
}

let lastCompileMs = 0;
let compileResolve = null, compileReject = null;

function compile(code, debug) {
  return new Promise((resolve, reject) => {
    compileResolve = resolve;
    compileReject = (err) => { reject(err); compileResolve = null; compileReject = null; };
    const opts = {
      std: $('std').value,
      optimize: $('opt').value,
      stackSize: parseInt($('stack').value, 10),
      flags: $('extra').value.split(/\s+/).filter(Boolean),
      filename: 'main.cc', obj: 'main.o', output: 'main.wasm',
      clang: ASSETS.clang, lld: ASSETS.lld,
      debug: !!debug,
    };
    if (debug) { opts.obj = 'main.dbg.o'; opts.output = 'main.dbg.wasm'; }
    compileWorker.postMessage({ type: 'compile', code, opts });
  }).finally(() => { compileResolve = null; compileReject = null; });
}

function runProgram(wasmBytes, stdinText, timeoutMs, ctl) {
  return new Promise((resolve) => {
    if (runWorker) runWorker.terminate();
    runWorker = new Worker('js/run.worker.js');
    runWorker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'write') pushBytes(new Uint8Array(m.bytes));
      if (m.type === 'exit') {
        clearWatchdog();
        runWorker.terminate();
        runWorker = null;
        resolve({ ...m, killed: false });
      }
    };
    runWorker.onerror = (e) => {
      clearWatchdog();
      resolve({ code: 127, note: e.message, ms: 0, memoryBytes: 0, killed: false });
    };
    currentRun = { resolve };
    /* 调试会话（ctl 非空）不装看门狗：那是给人一步步看的，停在某行等人放行、
       降速睡过去都不该算成「程序在跑」。跑得慢或死循环也由用户自己用「停止 /
       退出调试」结束（dbgStopRun 会结掉这个 await）。只有普通「编译并运行」
       才按 运行超时(ms) 强杀 Worker。 */
    if (!ctl) {
      watchdog = setTimeout(() => {
        runWorker.terminate();
        runWorker = null;
        resolve({ code: null, killed: true, ms: timeoutMs, memoryBytes: 0 });
      }, timeoutMs);
    }
    const buf = wasmBytes.buffer.slice(0);   /* 复制，原字节留给下次「仅运行」 */
    runWorker.postMessage(
      { type: 'run', base: BASE, name: 'main.wasm', stdin: enc.encode(stdinText), wasm: buf, ctl: ctl || null },
      [buf]);
  });
}

function clearWatchdog() {
  if (!watchdog) return;
  if (typeof watchdog === 'number') clearInterval(watchdog);
  else clearTimeout(watchdog);
  watchdog = null;
}

/* ------------------------------------------------------------------ */
/* 主流程                                                             */
/* ------------------------------------------------------------------ */
let busy = false;

async function doRun() {
  if (busy) return;
  busy = true;
  runBtn.disabled = true; stopBtn.disabled = false;
  const t0 = performance.now();
  clearOutput();
  resetMetrics();
  newDecodeSession();

  try {
    if (!workerReady) await readyPromise;

    let wasm;
    try {
      wasm = (await compile(srcEditor.getValue(), false)).wasm;
    } catch (err) {
      closeDecodeSession();
      setDot('bad');
      if (err.phase) {
        metric('compile', (err.ms || 0) + ' ms', 'err');
        metric('exit', err.exitCode === undefined ? '—' : err.exitCode, 'err');
        say(`${err.phase === 'compile' ? '编译' : '链接'}失败`, 'err');
      } else if (err.jsError) {
        metric('compile', '异常', 'err');
        say('编译器内部错误', 'err');
        outEl.value += '\n' + err.jsError + '\n';
      } else {
        say('编译被中断', 'warn');
      }
      return;
    }

    const compileMs = Math.round(performance.now() - t0);
    metric('compile', compileMs + ' ms', 'ok');
    say(`编译完成（产物 ${(wasm.byteLength / 1024).toFixed(1)} KB），运行中…`);

    const timeoutMs = Math.max(200, parseInt($('timeout').value, 10) || 5000);
    const r = await runProgram(wasm, stdinEl.value, timeoutMs);
    closeDecodeSession();

    if (r.aborted) { say('已停止', 'warn'); return; }
    if (r.killed) {
      setDot('bad');
      metric('run', '> ' + timeoutMs + ' ms', 'warn');
      metric('exit', 'TLE', 'warn');
      say('运行超时，已终止该 wasm 实例', 'warn');
      outEl.value += `\n[已终止] 运行超过 ${timeoutMs} ms\n`;
    } else {
      setDot(r.code === 0 ? 'ready' : 'bad');
      metric('exit', r.code, r.code === 0 ? 'ok' : 'err');
      metric('run', r.ms + ' ms', r.code === 0 ? '' : 'err');
      if (r.memoryBytes) metric('mem', (r.memoryBytes / 1048576).toFixed(1) + ' MB');
      say(r.note ? '运行出错：' + r.note : `正常结束（产物 ${(wasm.byteLength / 1024).toFixed(1)} KB）`,
          r.code === 0 ? 'ok' : 'err');
    }
    outEl.scrollTop = outEl.scrollHeight;
  } finally {
    clearWatchdog();
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    updateSrcLen();
  }
}

function stopAll() {
  dbgStopRun();                       /* terminate 之后必须把等待中的 run 结掉，
                                         否则 await 永远不返回，busy 卡住 */
  if (compileResolve) { compileReject({ aborted: true }); }
  closeDecodeSession();
  if (dbg.active) dbgQuit();
  setDot('busy');
  say('已停止', 'warn');
}

/* ------------------------------------------------------------------ */
/* 单步调试：插桩构建 + SharedArrayBuffer 握手                          */
/*                                                                    */
/* 编译侧（wasmclang.js 的 compileForDebug）在 LLVM IR 的每个源码行边界 */
/* 插一句 call void @__pg_trace(i32 行号)，链接时 --allow-undefined，    */
/* 于是运行模块多了一个 env.__pg_trace 导入 —— run.worker 里那个函数    */
/* 就是断点/单步/降速的全部实现处。行号通过 SAB 传回来，主线程只读，     */
/* 不用每行发一次 postMessage。                                        */
/* ------------------------------------------------------------------ */
const Range = ace.require('ace/range').Range;

const REASON_TEXT = {
  [DBG.REASON.BP]: '命中断点',
  [DBG.REASON.STEP]: '单步',
  [DBG.REASON.PAUSE]: '被暂停',
};

const dbg = {
  cb: null, ctl: null, bp: null,
  lines: null,
  vars: null, lineVars: null,     /* instrumentIR 给的变量表 / 每行快照名单 */
  marker: null, markerRow: -1, markerCls: '',
  timer: 0, lastLine: -1, lastParked: null,
  active: false,
};

function dbgSupported() { return typeof SharedArrayBuffer !== 'undefined'; }

function dbgCmd(mode) {
  if (!dbg.ctl) return;
  hideVarTip();
  Atomics.store(dbg.ctl, DBG.S.MODE, mode);
  /* 先改 STATE 再 notify：worker 可能还卡在 wait 上；也有一种时序是它刚判完
     循环条件还没进 wait，那时 wait 会因为期望值不符立刻返回。 */
  Atomics.store(dbg.ctl, DBG.S.STATE, DBG.STATE.GO);
  Atomics.notify(dbg.ctl, DBG.S.STATE);
}

function dbgPause() {
  if (dbg.ctl) Atomics.store(dbg.ctl, DBG.S.MODE, DBG.MODE.PAUSE);
}

/* --- 断点：交给 Ace 的 session 断点表画装订线圆点，行号同步进 SAB --- */
const BP_CLS = 'pgdbp';
const bpTable = () => srcEditor.session.getBreakpoints();
const bpRows = () => Object.keys(bpTable()).map(Number);

function toggleBreakpoint(row) {
  const sess = srcEditor.session;
  if (bpTable()[row]) sess.clearBreakpoint(row);
  else sess.setBreakpoint(row, BP_CLS);
  syncBpTable();
}
function clearAllBreakpoints() {
  srcEditor.session.clearBreakpoints();
  syncBpTable();
}
function syncBpTable() {
  if (!dbg.bp) return;
  dbg.bp.fill(0);
  for (const row of bpRows()) {
    const line = row + 1;
    if (line >= 0 && line <= DBG.MAX_LINE) dbg.bp[line] = 1;
  }
}

/* --- 当前执行行的画线 --- */
const GUTTER_CLS = ['pgcur', 'pgpark'];
function dbgGutterMark(line, cls) {
  const cells = srcEditor.container.querySelectorAll('.ace_gutter-cell');
  for (const c of cells) {
    if (c.classList.contains('pgcur') || c.classList.contains('pgpark')) c.classList.remove(...GUTTER_CLS);
  }
  if (line <= 0) return;
  /* 装订线一格一行，按行号文本找；比从 renderer 内部缓存里摸 cell 稳。 */
  for (const c of cells) if (c.textContent.trim() === String(line)) c.classList.add(cls);
}

/* Ace 的 marker 层要等渲染循环（requestAnimationFrame）才画。切到后台标签页时
   rAF 被暂停，marker 就停在旧画面上，所以这里补一次同步刷新；前台时它自己会画，
   多刷一次只是把同一个 div 的样式重写一遍，没有副作用。 */
function dbgSyncMarkers() {
  const r = srcEditor.renderer;
  try {
    r.updateBackMarkers();
    const mb = r.$markerBack;
    if (mb && mb.config) mb.update(mb.config);
  } catch (e) { /* 拿不到内部层就算了，marker 还是会在下一帧画出来 */ }
}

function dbgClearMarkerDivs() {
  const ds = srcEditor.container.querySelectorAll('.ace_marker-layer .dbgcur, .ace_marker-layer .dbgparked');
  for (const d of ds) d.remove();
}

function dbgMarkLine(line, parked) {
  const sess = srcEditor.session;
  const row = line - 1;
  const cls = parked ? 'dbgparked' : 'dbgcur';
  if (line <= 0 || row >= sess.getLength()) {
    if (dbg.marker !== null) { sess.removeMarker(dbg.marker); dbg.marker = null; dbg.markerRow = -1; }
    dbgGutterMark(0, '');
    dbgSyncMarkers(); dbgClearMarkerDivs();
    return;
  }
  if (dbg.marker !== null && dbg.markerRow === row && dbg.markerCls === cls) return;
  if (dbg.marker !== null) { sess.removeMarker(dbg.marker); dbg.marker = null; }
  /* screenLine 而不是 fullLine：前者铺满可视宽度，短行/深缩进也一眼看得到 */
  dbg.marker = sess.addMarker(new Range(row, 0, row, 1), cls, 'screenLine', false);
  dbg.markerRow = row;
  dbg.markerCls = cls;
  dbgGutterMark(line, parked ? 'pgpark' : 'pgcur');
  dbgSyncMarkers();
}

function dbgTick() {
  if (!dbg.ctl) return;
  const c = dbg.ctl;
  const line = c[DBG.S.LINE];
  const parked = Atomics.load(c, DBG.S.STATE) === DBG.STATE.PARK;
  const hits = c[DBG.S.EVENTS];
  if (line !== dbg.lastLine || parked !== dbg.lastParked) {
    dbg.lastLine = line;
    dbg.lastParked = parked;
    dbgMarkLine(line, parked);
    /* 跟着执行行走：停住时把该行放进视野；跑动时只有它跑出可视区才滚，
       免得每行都跳一次把画面晃得没法看。 */
    if (line > 0 && (parked || !srcEditor.renderer.isRowVisible(line - 1))) {
      srcEditor.gotoLine(line, 0, false);
    }
  }
  dbgState.textContent = parked
    ? `停在第 ${line} 行（${REASON_TEXT[c[DBG.S.REASON]] || '已停'}）· 行桩触发 ${hits.toLocaleString('en-US')} 次`
    : `运行中 · 第 ${line} 行 · 行桩触发 ${hits.toLocaleString('en-US')} 次`;
  if (!parked) hideVarTip();
}

/* ------------------------------------------------------------------ */
/* 停行时悬停看变量值                                                  */
/*                                                                    */
/* 变量表和「每行快照了哪些变量」来自插桩（compile.worker 随产物一起    */
/* 送回来），值本身在共享内存的 val 里，wr 标记这个槽写过没有。         */
/* 只在停住的时候读，读到的一定是静止数据。                            */
/* ------------------------------------------------------------------ */
const varTipEl = (() => {
  const el = document.createElement('div');
  el.className = 'vartip';
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
})();

function hideVarTip() { varTipEl.style.display = 'none'; }

/* 把一个快照还原成人类可读的值：kind 决定怎么解释那两个 int32 */
function fmtVar(v, lo, hi) {
  const u = lo >>> 0;
  const uh = hi >>> 0;
  const bits = v.bits || 32;
  if (v.kind === 'bool') return u ? 'true' : 'false';
  if (v.kind === 'float') {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(0, u, true);
    dv.setUint32(4, uh, true);
    const x = bits === 32 ? dv.getFloat32(0, true) : dv.getFloat64(0, true);
    if (Number.isNaN(x)) return 'NaN';
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    return Object.is(x, -0) ? '-0' : String(x);
  }
  if (v.kind === 'ptr') return '0x' + u.toString(16).padStart(8, '0');
  let s;
  if (bits === 64) {
    /* 64 位用 BigInt，免得超过 2^53 掉精度 */
    s = (v.signed ? (BigInt(hi) << 32n) | BigInt(u)
                  : (BigInt(uh) << 32n) | BigInt(u)).toString();
  } else if (bits === 32) {
    s = String(v.signed ? (lo | 0) : u);
  } else {
    const m = (1 << bits) - 1;
    let x = u & m;
    if (v.signed && (x & (1 << (bits - 1)))) x -= (1 << bits);
    s = String(x);
    if (bits === 8 && /char/.test(v.tname || '')) {
      const g = x >= 32 && x < 127 ? `'${String.fromCharCode(x)}' ` : '';
      s = `${g}${x}`;
    }
  }
  return s;
}

/* 停在某行时能看到的变量：名字 -> 变量描述（同一行重名取第一个） */
function liveVarsAt(line) {
  const map = new Map();
  const ids = (dbg.lineVars && dbg.lineVars[String(line)]) || [];
  for (const id of ids) {
    const v = dbg.vars && dbg.vars[id];
    if (v && !map.has(v.name)) map.set(v.name, v);
  }
  return map;
}

function varTipText(name, v, line) {
  const head = `${name} : ${v.tname || '?'}`;
  if (v.kind === 'obj' || v.kind === 'unknown') {
    return `${head} = 结构体/数组，暂不展开`;
  }
  if (!dbg.cb || !dbg.cb.wr[v.id]) return `${head} = 尚无快照`;
  const lo = dbg.cb.val[v.id * 2];
  const hi = dbg.cb.val[v.id * 2 + 1];
  const note = v.line === line ? '（本行声明，可能还没赋值）' : '';
  return `${head} = ${fmtVar(v, lo, hi)}${note}`;
}

/* 悬停查变量。注意不能用 e.target 是不是 .ace_identifier 的 span 来判断：
   Ace 的 .ace_layer 整层 pointer-events: none（它自己的 CSS 里写了，为了 Safari
   滚轮不被打断），真实鼠标事件的 target 永远是 div.ace_content，压根拿不到 span。
   所以走坐标反查：clientX/Y -> 文档行列 -> 该位置的 token。 */
srcEditor.container.addEventListener('mousemove', (ev) => {
  if (!(dbg.active && dbg.ctl) || Atomics.load(dbg.ctl, DBG.S.STATE) !== DBG.STATE.PARK) {
    hideVarTip();
    return;
  }
  let name = '';
  try {
    const pos = srcEditor.renderer.screenToTextCoordinates(ev.clientX, ev.clientY);
    const tok = srcEditor.session.getTokenAt(pos.row, pos.column);
    if (tok && /^(identifier|variable|property)/.test(tok.type) && /^[\w$]+$/.test(tok.value)) {
      name = tok.value;
    }
  } catch (e) { name = ''; }
  if (!name) { hideVarTip(); return; }
  const line = dbg.ctl[DBG.S.LINE];
  const v = liveVarsAt(line).get(name);
  if (!v) { hideVarTip(); return; }
  varTipEl.textContent = varTipText(name, v, line);
  varTipEl.style.display = 'block';
  const w = varTipEl.offsetWidth, h = varTipEl.offsetHeight;
  varTipEl.style.left = Math.min(ev.clientX + 14, innerWidth - w - 8) + 'px';
  varTipEl.style.top = (ev.clientY + 16 + h > innerHeight ? ev.clientY - h - 8 : ev.clientY + 16) + 'px';
});
srcEditor.container.addEventListener('mouseleave', hideVarTip);

function dbgStopRun() {
  if (runWorker) { runWorker.terminate(); runWorker = null; }
  clearWatchdog();
  if (currentRun) {
    currentRun.resolve({ code: null, aborted: true, killed: false, ms: 0, memoryBytes: 0 });
    currentRun = null;
  }
}

function dbgQuit() {
  if (dbg.timer) clearInterval(dbg.timer);
  dbg.timer = 0;
  hideVarTip();
  if (dbg.marker !== null && dbg.ctl) srcEditor.session.removeMarker(dbg.marker);
  dbgGutterMark(0, '');
  dbg.marker = null; dbg.markerRow = -1; dbg.markerCls = '';
  dbgSyncMarkers(); dbgClearMarkerDivs();
  dbg.lastLine = -1; dbg.lastParked = null;
  dbg.cb = null; dbg.ctl = null; dbg.bp = null; dbg.lines = null; dbg.active = false;
  dbg.vars = null; dbg.lineVars = null;
  dbgBar.classList.remove('on');
  dbgState.textContent = '—';
  srcEditor.setReadOnly(false);
  runBtn.disabled = false;
  debugBtn.disabled = false;
}

async function startDebugSession(built) {
  const cb = DBG.newControlBlock();
  if (!cb) { say('拿不到 SharedArrayBuffer，无法调试', 'err'); return; }
  const lines = built.lines;
  cb.wr.fill(0);
  dbg.cb = cb; dbg.ctl = cb.ctl; dbg.bp = cb.bp; dbg.lines = lines;
  dbg.vars = built.vars || [];
  dbg.lineVars = built.lineVars || {};
  dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
  Atomics.store(dbg.ctl, DBG.S.MODE, DBG.MODE.RUN);
  Atomics.store(dbg.ctl, DBG.S.STATE, DBG.STATE.EXEC);
  syncBpTable();

  dbg.active = true;
  dbgBar.classList.add('on');
  srcEditor.setReadOnly(true);
  runBtn.disabled = true;
  debugBtn.disabled = false;      /* 再点一次 = 退出调试 */
  stopBtn.disabled = false;
  setDot('busy');
  say(`调试构建完成，${lines.length} 个行桩、${dbg.vars.length} 个可查变量，已启动，正在跟踪执行行…`, 'ok');
  newDecodeSession();
  /* 用 setInterval 而不是 requestAnimationFrame：后台标签页里 rAF 会停摆，
     切去看输出再切回来时高亮就冻住了；50ms 一帧对手工单步足够跟手。 */
  dbg.timer = setInterval(dbgTick, 50);

  /* 调试会话没有运行超时（第 3 个参数只在非调试时用到，这里给 0 占位） */
  const r = await runProgram(built.wasm, stdinEl.value, 0, cb.sab);
  closeDecodeSession();
  if (dbg.timer) clearInterval(dbg.timer);
  dbg.timer = 0;

  /* 调试没有超时，所以「停止 / 退出调试」是结束会话的正常出口：灯要收回中性，
     不能继续闪「运行中」，看着像程序还在跑。 */
  if (r.aborted) { setDot(''); say('调试已结束', 'warn'); dbgQuit(); return; }
  /* worker 里测的 r.ms 把「停在某行等人放行」和「降速睡过去」的时间也算进去了。
     那不是程序在跑，是人在看，报成运行时间会离谱到几十秒。 */
  const parked = Atomics.load(cb.ctl, DBG.S.PARKED_MS);
  const slowed = Atomics.load(cb.ctl, DBG.S.SLOW_MS);
  const netMs = Math.max(0, r.ms - parked - slowed);
  const tip = parked + slowed > 0
    ? `暂停等待 ${parked} ms，降速停留 ${slowed} ms（均不计入运行耗时）`
    : '';
  setDot(r.code === 0 ? 'ready' : 'bad');
  metric('exit', r.code, r.code === 0 ? 'ok' : 'err');
  metric('run', netMs + ' ms', r.code === 0 ? '' : 'err', tip);
  if (r.memoryBytes) metric('mem', (r.memoryBytes / 1048576).toFixed(1) + ' MB');
  say(r.note ? '运行出错：' + r.note : `程序结束（第 ${dbg.lastLine > 0 ? dbg.lastLine : '—'} 行是最后一站）`,
      r.code === 0 ? 'ok' : 'err');
  dbgQuit();
}

async function doDebug() {
  if (busy) return;
  if (dbg.active) { dbgStopRun(); dbgQuit(); return; }
  if (!dbgSupported()) {
    setDot('bad');
    say('调试需要 SharedArrayBuffer：请从带 COOP/COEP 响应头的 serve.py 打开本页', 'err');
    return;
  }
  busy = true;
  const t0 = performance.now();
  clearOutput();
  resetMetrics();
  newDecodeSession();
  try {
    if (!workerReady) await readyPromise;
    let built;
    try {
      built = await compile(srcEditor.getValue(), true);
    } catch (err) {
      closeDecodeSession();
      setDot('bad');
      const PHASE = { compile: '编译', link: '链接', instrument: '插桩' };
      if (err.phase) {
        metric('compile', (err.ms || 0) + ' ms', 'err');
        metric('exit', err.exitCode === undefined ? '—' : err.exitCode, 'err');
        say(`${PHASE[err.phase] || err.phase}失败（调试构建）`, 'err');
      } else if (err.jsError) {
        metric('compile', '异常', 'err');
        say('编译器内部错误', 'err');
        outEl.value += '\n' + err.jsError + '\n';
      } else {
        say('调试构建被中断', 'warn');
      }
      return;
    }
    closeDecodeSession();
    metric('compile', Math.round(performance.now() - t0) + ' ms', 'ok');
    if (!built.lines || !built.lines.length) {
      setDot('bad');
      say('这个源文件里没有可插桩的用户代码行（只有头文件里的代码？）', 'err');
      return;
    }
    await startDebugSession(built);
  } finally {
    clearWatchdog();
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    updateSrcLen();
  }
}

/* ------------------------------------------------------------------ */
/* UI 绑定                                                            */
/* ------------------------------------------------------------------ */
function fillExamples() {
  const sel = $('examples');
  for (const name of Object.keys(EXAMPLES)) {
    const o = document.createElement('option');
    o.textContent = name;
    sel.appendChild(o);
  }
  sel.onchange = () => {
    const e = EXAMPLES[sel.value];
    setSource(e.code);
    stdinEl.value = e.stdin;
    saveLocal();
  };
}

function saveLocal() {
  try {
    localStorage.setItem('cpp-playground.src', srcEditor.getValue());
    localStorage.setItem('cpp-playground.stdin', stdinEl.value);
  } catch (e) { /* 忽略 */ }
}

srcEditor.on('change', () => { updateSrcLen(); saveLocal(); });
stdinEl.addEventListener('input', saveLocal);

/* Ace 内部快捷键（不走 document，避免焦点在编辑器里时漏掉） */
srcEditor.commands.addCommand({
  name: 'runAndGo',
  bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
  exec: () => doRun(),
});
srcEditor.commands.addCommand({
  name: 'stopAndGo',
  bindKey: { win: 'Ctrl-.', mac: 'Cmd-.' },
  exec: () => stopAll(),
});
srcEditor.commands.addCommand({
  name: 'debugAndGo',
  bindKey: { win: 'Ctrl-Shift-Enter', mac: 'Cmd-Shift-Enter' },
  exec: () => doDebug(),
});
srcEditor.commands.addCommand({
  name: 'toggleBreakpoint',
  bindKey: { win: 'Ctrl-B', mac: 'Cmd-B' },
  exec: (ed) => toggleBreakpoint(ed.getCursorPosition().row),
});

/* 双击行号切换断点。装订线事件在 ace 1.45 里叫 gutterdblclick，行号用
   getGutterRow() 拿（这个版本没有 getDocumentRow()，也没有坐标换算的公开接口）。
   单按 Ctrl+B 走当前光标行，两条路都不需要坐标。 */
srcEditor.on('gutterdblclick', (e) => {
  const row = typeof e.getGutterRow === 'function'
    ? e.getGutterRow()
    : (e.getDocumentPosition ? e.getDocumentPosition().row : -1);
  if (row === undefined || row === null || row < 0) return;
  if (typeof e.stop === 'function') e.stop();
  toggleBreakpoint(row);
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) doDebug(); else doRun();
  }
  /* Ctrl/Cmd+B：在当前光标行增删断点，和双击行号走同一个函数 */
  if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
    e.preventDefault();
    toggleBreakpoint(srcEditor.getSelection().getCursor().row);
  }
  if (e.key === 'Escape') stopAll();
});

runBtn.onclick = doRun;
debugBtn.onclick = doDebug;
stopBtn.onclick = stopAll;
clearBtn.onclick = () => { outEl.value = ''; $('outlen').textContent = ''; };
reloadBtn.onclick = () => {
  if (dbg.active) { dbgStopRun(); dbgQuit(); }
  outEl.value = '';
  startCompileWorker();
};

$('dbg-cont').onclick = () => dbgCmd(DBG.MODE.RUN);
$('dbg-step').onclick = () => dbgCmd(DBG.MODE.STEP);
$('dbg-pause').onclick = dbgPause;
$('dbg-quit').onclick = () => { dbgStopRun(); dbgQuit(); };
dbgSpeed.onchange = () => {
  if (dbg.ctl) dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
};

/* ------------------------------------------------------------------ */
fillExamples();
let restored = false;
try {
  const s = localStorage.getItem('cpp-playground.src');
  const i = localStorage.getItem('cpp-playground.stdin');
  if (s) { setSource(s); if (i !== null) stdinEl.value = i; restored = true; }
} catch (e) { /* 忽略 */ }
if (!restored) {
  $('examples').value = Object.keys(EXAMPLES)[0];
  setSource(EXAMPLES[$('examples').value].code);
  stdinEl.value = EXAMPLES[$('examples').value].stdin;
}
srcEditor.focus();
startCompileWorker();
