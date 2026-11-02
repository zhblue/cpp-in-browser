/* main.js — 页面编排：常驻编译 Worker + 一次性运行 Worker */
'use strict';

/* Worker 里 fetch 是相对 worker 脚本解析的，所以必须给绝对 URL */
const BASE = new URL('assets/', location.href).href;
const ASSETS = { clang: 'clang.wasm', lld: 'lld.wasm', memfs: 'memfs.wasm', sysroot: 'sysroot.tar' };

const $ = (id) => document.getElementById(id);
const stdinEl = $('stdin'), outEl = $('out');
const dotEl = $('dot'), msgEl = $('msg');
const runBtn = $('run'), stopBtn = $('stop'), clearBtn = $('clear'), reloadBtn = $('reload');

/* ---------- Ace 编辑器（模块全部本地化，保持离线可用） ---------- */
const ACE_BASE = new URL('vendor/ace/', location.href).href;
ace.config.setModuleUrl('ace/mode/c_cpp', ACE_BASE + 'mode-c_cpp.js');
ace.config.setModuleUrl('ace/theme/one_dark', ACE_BASE + 'theme-one_dark.js');
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

function setSource(text) {
  srcEditor.setValue(text, -1);
  srcEditor.clearSelection();
  srcEditor.gotoLine(1, 0, false);
  updateSrcLen();
}
function updateSrcLen() {
  const v = srcEditor.getValue();
  $('srclen').textContent = `${v.length} 字符 / ${v.split('\n').length} 行`;
}

const EXAMPLES = {
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

function say(text, cls) {
  msgEl.textContent = text;
  msgEl.className = cls || '';
}
function setDot(kind) { dotEl.className = 'dot' + (kind ? ' ' + kind : ''); }

/* ---------- 状态面板四项指标 ---------- */
const METRICS = { exit: $('m-exit'), compile: $('m-compile'), run: $('m-run'), mem: $('m-mem') };
function metric(key, text, cls) {
  const el = METRICS[key];
  if (!el) return;
  el.textContent = text;
  el.className = cls || '';
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
      break;
    case 'result':
      if (m.ok) { lastCompileMs = m.ms; compileResolve && compileResolve(m.wasm); }
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

function compile(code) {
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
    };
    compileWorker.postMessage({ type: 'compile', code, opts });
  }).finally(() => { compileResolve = null; compileReject = null; });
}

function runProgram(wasmBytes, stdinText, timeoutMs) {
  return new Promise((resolve) => {
    if (runWorker) runWorker.terminate();
    runWorker = new Worker('js/run.worker.js');
    runWorker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'write') pushBytes(new Uint8Array(m.bytes));
      if (m.type === 'exit') {
        clearTimeout(watchdog);
        runWorker.terminate();
        runWorker = null;
        resolve({ ...m, killed: false });
      }
    };
    runWorker.onerror = (e) => {
      clearTimeout(watchdog);
      resolve({ code: 127, note: e.message, ms: 0, memoryBytes: 0, killed: false });
    };
    currentRun = { resolve };
    watchdog = setTimeout(() => {
      runWorker.terminate();
      runWorker = null;
      resolve({ code: null, killed: true, ms: timeoutMs, memoryBytes: 0 });
    }, timeoutMs);
    const buf = wasmBytes.buffer.slice(0);   /* 复制，原字节留给下次「仅运行」 */
    runWorker.postMessage({ type: 'run', base: BASE, name: 'main.wasm', stdin: enc.encode(stdinText), wasm: buf }, [buf]);
  });
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
  resetMetrics();
  newDecodeSession();

  try {
    if (!workerReady) await readyPromise;

    let wasm;
    try {
      wasm = await compile(srcEditor.getValue());
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
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    updateSrcLen();
  }
}

function stopAll() {
  if (runWorker) { runWorker.terminate(); runWorker = null; }
  if (watchdog) { clearTimeout(watchdog); watchdog = null; }
  if (compileResolve) { compileReject({ aborted: true }); }
  closeDecodeSession();
  setDot('busy');
  say('已停止', 'warn');
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

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doRun(); }
  if (e.key === 'Escape') stopAll();
});

runBtn.onclick = doRun;
stopBtn.onclick = stopAll;
clearBtn.onclick = () => { outEl.value = ''; $('outlen').textContent = ''; };
reloadBtn.onclick = () => { outEl.value = ''; startCompileWorker(); };

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
