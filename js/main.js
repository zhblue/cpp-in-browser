/* main.js — 页面编排：语言登记表（langs.js）+ 编译 Worker + 运行 Worker
   这里不认具体语言：资源、worker、示例、按钮文案、工具条字段全从 lang 里取。
   再加一门语言 = 往 langs.js 加一项 + 一个 worker + 一份 examples.<id>.js。 */
'use strict';

/* Worker 里 fetch 是相对 worker 脚本解析的，所以必须给绝对 URL */
const BASE = new URL('assets/', location.href).href;

function storedLang() {
  try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
}
let lang = langById(storedLang());

const $ = (id) => document.getElementById(id);
const stdinEl = $('stdin'), outEl = $('out');
const dotEl = $('dot'), msgEl = $('msg');
const runBtn = $('run'), stopBtn = $('stop'), clearBtn = $('clear'), reloadBtn = $('reload');
const debugBtn = $('debug'), dbgBar = $('dbgbar'), dbgState = $('dbgstate'), dbgSpeed = $('dbspeed');
const langSel = $('lang');

/* ---------- Ace 编辑器（模块全部本地化，保持离线可用） ---------- */
const ACE_BASE = new URL('vendor/ace/', location.href).href;
ace.config.setModuleUrl('ace/theme/one_dark', ACE_BASE + 'theme-one_dark.js');
ace.config.setModuleUrl('ace/theme/tomorrow', ACE_BASE + 'theme-tomorrow.js');
ace.config.setModuleUrl('ace/ext/language_tools', ACE_BASE + 'ext-language_tools.js');
/* 各语言的语法/片段模块一次性登记好，切语言时只 setMode，不用再注册 URL */
for (const id of LANG_ORDER) {
  const k = LANGS[id].aceKey;
  ace.config.setModuleUrl('ace/mode/' + k, ACE_BASE + 'mode-' + k + '.js');
  ace.config.setModuleUrl('ace/snippets/' + k, ACE_BASE + 'snippets/' + k + '.js');
}

const srcEditor = ace.edit('editor', {
  mode: 'ace/mode/' + lang.aceKey,
  theme: 'ace/theme/one_dark',
  fontSize: '14px',          /* 真正的值由下面 initFontSize 按 localStorage 覆盖 */
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

/* ---------- 编辑器字号 ----------
   Ace 的 setFontSize 收数字就按 px 算；选完记进 localStorage，下次进页面直接
   恢复。投影演示调大到 18/20 px 时行高跟着走，装订线和当前行高亮都是 Ace
   自己排的，不用额外改 CSS。 */
const FONT_KEY = 'cpp-playground.fontsize';
(function initFontSize() {
  const sel = $('fontsize');
  let px = parseInt(sel.value, 10) || 14;
  try {
    const v = parseInt(localStorage.getItem(FONT_KEY), 10);
    if (v >= 10 && v <= 32) px = v;
  } catch (e) { /* 隐私模式读不到就算了 */ }
  if (![...sel.options].some((o) => o.value === String(px))) px = 14;
  sel.value = String(px);
  srcEditor.setFontSize(px);
  sel.addEventListener('change', () => {
    const v = parseInt(sel.value, 10) || 14;
    srcEditor.setFontSize(v);
    try { localStorage.setItem(FONT_KEY, String(v)); } catch (e) {}
  });
})();

/* ---------- BGM：把当前执行行的个位弹成音符 ----------
   锚点按要求定：个位 1 = C 大调中音 do（C4）。2..7 顺下去 re mi fa sol la si，
   8 / 9 / 0 接着往高八度走（C5 D5 E5）——十位进位之前音高一路向上，整十行之后
   落回高八度的 do，听起来像一句句往上翻，而不是随机乱跳。
   只在调试会话里响：普通「编译并运行」没有行号可跟，自然也没音可弹。
   工具条的复选框能关掉，选择记进 localStorage。 */
const BGM_KEY = 'cpp-playground.bgm';
/* 相对 C4 的半音数：大调 1234567 = 0 2 4 5 7 9 11，8 9 0 是下一八度的 1 2 3 */
const BGM_SEMITONE = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12, 9: 14, 0: 16 };
const bgm = { ac: null, lastDigit: -1, lastAt: 0, notes: 0 };

function bgmOn() { const cb = $('bgm'); return !!(cb && cb.checked); }

function bgmNote(line) {
  if (!bgmOn() || line <= 0) return;
  const d = line % 10;
  const now = performance.now();
  /* 同一个音不重复敲：停在某行时 tick 每 50 ms 就来一趟；两次发声之间至少隔
     45 ms：全速档一秒能划过几千行，不限流就成了一堵噪音墙，AudioNode 也会堆。 */
  if (d === bgm.lastDigit && now - bgm.lastAt < 400) return;
  if (now - bgm.lastAt < 45) return;
  bgm.lastDigit = d;
  bgm.lastAt = now;

  let ac = bgm.ac;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = bgm.ac = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
  }
  /* 浏览器不让没有用户手势的 AudioContext 起播；点「编译并调试」本身就是手势，
     但自动播放策略偶尔还是会把新开的 ctx 停在 suspended，这里补一次 resume。 */
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const f = 261.6256 * Math.pow(2, BGM_SEMITONE[d] / 12);   /* A4=440 十二平均律下的 C4 */
  const t = ac.currentTime;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(0.16, t + 0.006);        /* 几毫秒起音，接近拨弦/音盒 */
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);  /* 0.3 s 收干净，音符之间不糊 */
  amp.connect(ac.destination);
  /* 三角波基音 + 高八度正弦泛音：单振荡器太"嘟嘟叫"，叠一层八度才有音乐盒味 */
  [[f, 'triangle', 1], [f * 2, 'sine', 0.35]].forEach((p) => {
    const o = ac.createOscillator();
    o.type = p[1];
    o.frequency.value = p[0];
    const g = ac.createGain();
    g.gain.value = p[2];
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + 0.34);
  });
  bgm.notes++;
}

(function initBgm() {
  const cb = $('bgm');
  if (!cb) return;
  try {
    const v = localStorage.getItem(BGM_KEY);
    if (v !== null) cb.checked = v === 'on';
  } catch (e) { /* 隐私模式读不到就按 HTML 里的默认值 */ }
  cb.addEventListener('change', () => {
    try { localStorage.setItem(BGM_KEY, cb.checked ? 'on' : 'off'); } catch (e) {}
    bgm.lastDigit = -1;
    /* 勾上的时候给一声确认，不然安静的页面上看不出到底生效没有 */
    if (cb.checked) bgmNote(dbg.lastLine > 0 ? dbg.lastLine : 1);
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

function startCompileWorker(quiet) {
  workerReady = false;
  readyPromise = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
  /* 装失败时未必有人在 await（刚进页面就 404），先挂个空的 catch，
     免得控制台多一条 unhandled rejection 把真正的原因挤下去 */
  readyPromise.catch(() => {});
  if (compileWorker) compileWorker.terminate();
  compileWorker = new Worker(lang.compileWorker);
  compileWorker.onmessage = onCompileMessage;
  compileWorker.onerror = (e) => {
    setDot('bad');
    say('Worker 出错：' + e.message, 'err');
  };
  setDot('busy');
  /* quiet：超时/停止把常驻解释器杀掉之后自动重装，这时状态栏留着「已终止」
     那句话更有用，别用「正在初始化」把它盖掉。 */
  if (!quiet) say(lang.initHint);
  compileWorker.postMessage({ type: 'init', base: BASE, assets: lang.assets });
}

function onCompileMessage(ev) {
  const m = ev.data;
  switch (m.type) {
    case 'progress': say(m.text + '…'); break;
    case 'ready':
      workerReady = true;
      setDot('ready');
      say(`${lang.readyLabel}（${(m.initMs / 1000).toFixed(1)} s，${m.detail}）`, 'ok');
      readyResolve();
      break;
    case 'result':
      if (m.ok) {
        /* 观察窗的补全名单跟着每次插桩构建刷新（普通运行没有变量表，跳过） */
        if (m.vars) fillWatchNames(m.vars);
        compileResolve && compileResolve({
          artifact: m.artifact, size: m.size, lines: m.lines || null,
          vars: m.vars || null, lineVars: m.lineVars || null,
        });
      }
      else { compileReject && compileReject({ phase: m.phase, ms: m.ms, exitCode: m.exitCode }); }
      break;
    case 'error':
      setDot('bad');
      say('初始化失败，原因见输出框', 'err');
      /* 把页面实际请求的 assets 前缀一起打出来：部署出问题时，这一行和上面的
         完整 URL 能直接对上是路径错了（404）、被中间层改了（返回 HTML）、
         还是压根没发出去（证书/CSP/COEP）。 */
      outEl.value += '\n' + m.message + '\n（资源前缀 BASE = ' + BASE + '，这门语言要的资源：' +
        Object.values(lang.assets).join('、') +
        '；可在控制台执行 fetch(BASE + "资源名", {method: "HEAD"}).then(r => console.log(r.status, r.headers.get("content-type"), r.headers.get("content-length"))) 自查）\n';
      if (readyReject) readyReject(new Error(m.message));
      compileReject && compileReject({ jsError: m.message });
      break;
    /* write / guest / exit：解释器型语言的运行结果也从这条通道回来 */
    default: onRunMessage(m);
  }
}

/* 运行结果的公共入口。C++ 从一次性运行 Worker 来，解释器型语言（singleWorker）
   从常驻的那个来，两条通道共用这一段。 */
function onRunMessage(m) {
  if (m.type === 'write') { pushBytes(new Uint8Array(m.bytes)); return; }
  /* 只有调试构建会发这条：把用户模块那块共享线性内存交过来给悬停和观察窗读 */
  if (m.type === 'guest') { setGuestMemory(m.sab); return; }
  /* 解释器型语言的对应物：停住前递来的那一帧变量快照（C++ 不发这条） */
  if (m.type === 'locals') {
    dbg.pyLocals = { line: m.line, frame: m.frame, items: m.items };
    /* 补全名单跟着这一帧走：C++ 那份来自插桩表（构建完就有），解释器型语言
       停住时才知道这一帧有哪些名字，所以每递一份快照刷一次。 */
    if (lang.valueChannel === 'locals') fillWatchNames(m.items.map((it) => ({ name: it.n })));
    return;
  }
  if (m.type === 'exit') finishRun({ ...m, killed: false });
}

/* 一次运行只有一个出口：正常退出、看门狗超时、worker 报错、「停止」都走这里，
   免得某条路径忘了清看门狗、忘了收 worker，或者忘了把 await 结掉。 */
function finishRun(result) {
  const pending = currentRun;
  currentRun = null;
  clearWatchdog();
  if (lang.singleWorker) {
    /* 常驻解释器正常跑完就留着下次接着用（重装一次要一两秒、十几 MB）。
       只有真被 terminate 掉的才补一份：killed=超时、aborted=用户停止、
       note=worker 自己报了内部错误。用户程序 sys.exit(非 0) 不算，解释器还活着。 */
    if (pending && (result.killed || result.aborted || result.note)) startCompileWorker(true);
  } else if (runWorker) {
    runWorker.terminate();
    runWorker = null;
  }
  if (pending) pending.resolve(result);
}

let compileResolve = null, compileReject = null;

function compile(code, debug) {
  return new Promise((resolve, reject) => {
    compileResolve = resolve;
    compileReject = (err) => { reject(err); compileResolve = null; compileReject = null; };
    const opts = lang.opts({
      std: $('std').value,
      optimize: $('opt').value,
      stackSize: parseInt($('stack').value, 10),
      flags: $('extra').value.split(/\s+/).filter(Boolean),
    }, debug);
    compileWorker.postMessage({ type: 'compile', code, opts });
  }).finally(() => { compileResolve = null; compileReject = null; });
}

function runProgram(artifact, stdinText, timeoutMs, ctl) {
  return new Promise((resolve) => {
    currentRun = { resolve };
    /* 解释器型语言不新建 worker：编译和运行是同一个常驻 worker，运行消息由
       onCompileMessage 转给 onRunMessage。 */
    if (!lang.singleWorker) {
      if (runWorker) runWorker.terminate();
      runWorker = new Worker(lang.runWorker);
      runWorker.onmessage = (ev) => onRunMessage(ev.data);
      runWorker.onerror = (e) => finishRun({ code: 127, note: e.message, ms: 0, memoryBytes: 0, killed: false });
    }
    /* 调试会话（ctl 非空）不装看门狗：那是给人一步步看的，停在某行等人放行、
       降速睡过去都不该算成「程序在跑」。跑得慢或死循环也由用户自己用「停止 /
       退出调试」结束（dbgStopRun 会结掉这个 await）。只有普通运行才按
       运行超时(ms) 强杀 Worker。 */
    if (!ctl) {
      watchdog = setTimeout(() => finishRun({ code: null, killed: true, ms: timeoutMs, memoryBytes: 0 }), timeoutMs);
    }
    const buf = artifact.slice(0);   /* 复制，原字节留给下次「仅运行」 */
    const w = lang.singleWorker ? compileWorker : runWorker;
    w.postMessage(
      { type: 'run', base: BASE, name: lang.runName, stdin: enc.encode(stdinText), artifact: buf, ctl: ctl || null },
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
  runBtn.disabled = true; stopBtn.disabled = false; langSel.disabled = true;
  const t0 = performance.now();
  clearOutput();
  resetMetrics();
  newDecodeSession();

  try {
    if (!workerReady) await readyPromise;

    let built;
    try {
      built = await compile(srcEditor.getValue(), false);
    } catch (err) {
      closeDecodeSession();
      setDot('bad');
      if (err.phase) {
        metric('compile', (err.ms || 0) + ' ms', 'err');
        metric('exit', err.exitCode === undefined ? '—' : err.exitCode, 'err');
        say(`${lang.phaseText[err.phase] || err.phase}失败`, 'err');
      } else if (err.jsError) {
        metric('compile', '异常', 'err');
        say('构建过程内部错误', 'err');
        outEl.value += '\n' + err.jsError + '\n';
      } else {
        say(`${lang.phaseText.compile}被中断`, 'warn');
      }
      return;
    }

    const compileMs = Math.round(performance.now() - t0);
    const kb = (built.size / 1024).toFixed(1);
    metric('compile', compileMs + ' ms', 'ok');
    say(`${lang.phaseText.compile}完成（产物 ${kb} KB），运行中…`);

    const timeoutMs = Math.max(200, parseInt($('timeout').value, 10) || 5000);
    const r = await runProgram(built.artifact, stdinEl.value, timeoutMs);
    closeDecodeSession();

    if (r.aborted) { say('已停止', 'warn'); return; }
    if (r.killed) {
      setDot('bad');
      metric('run', '> ' + timeoutMs + ' ms', 'warn');
      metric('exit', 'TLE', 'warn');
      say(lang.killedText, 'warn');
      outEl.value += `\n[已终止] 运行超过 ${timeoutMs} ms\n`;
    } else {
      setDot(r.code === 0 ? 'ready' : 'bad');
      metric('exit', r.code, r.code === 0 ? 'ok' : 'err');
      metric('run', r.ms + ' ms', r.code === 0 ? '' : 'err');
      if (r.memoryBytes) metric('mem', (r.memoryBytes / 1048576).toFixed(1) + ' MB');
      say(r.note ? '运行出错：' + r.note : `正常结束（产物 ${kb} KB）`,
          r.code === 0 ? 'ok' : 'err');
    }
    outEl.scrollTop = outEl.scrollHeight;
  } finally {
    clearWatchdog();
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    langSel.disabled = false;
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
  /* 热力背景：次数在 worker 侧的 heat 表里，这里只缓存「画成第几档」，
     避免每个 tick 都把同一档的 marker 删了重建。 */
  heatMarks: new Map(), heatLv: new Map(), heatN: new Map(),
  heatRows: null, heatMax: { n: 0, line: 0 }, heatTick: 0,
  /* 用户程序的线性内存。调试构建链的是共享内存，运行 Worker 会把它的
     SharedArrayBuffer 递过来（grow 之后会换一块新的，所以每次收都重建视图），
     数组展开和观察窗的表达式就按地址从这里读。 */
  guest: null, gdv: null,
  /* 解释器型语言的值通道：堆在 Worker 里，主线程读不到，所以停住前由 Worker
     递一份当前帧的变量快照过来（{line, frame, items}）。line 是这份快照属于
     哪一行——读之前对一次当前行，免得把上一站的名字配到这一站的值上。 */
  pyLocals: null,
};

function setGuestMemory(sab) {
  dbg.guest = sab || null;
  dbg.gdv = sab ? new DataView(sab) : null;
}

function dbgSupported() { return typeof SharedArrayBuffer !== 'undefined'; }

/* 拿不到 SharedArrayBuffer 时，把到底缺哪一层说清楚。链条是：
   安全上下文 → COOP/COEP → crossOriginIsolated → SAB。
   最容易说错的是最后一步：https 到位、头没到位的时候，Firefox 和 Safari 直接
   不发 SAB 这个对象，此时 typeof SharedArrayBuffer === 'undefined' 看着像
   「浏览器太旧」，其实跟版本一点关系没有；Chrome 系反过来，非隔离上下文里照样
   给 SAB，但 Atomics.wait 会被拒，调试一样停不住。所以判因先看
   crossOriginIsolated，再看 SAB 在不在，别把缺响应头报成缺浏览器。 */
function sabMissing() {
  const hasSAB = typeof SharedArrayBuffer !== 'undefined';
  if (hasSAB && self.crossOriginIsolated) return '';
  if (!self.isSecureContext)
    return `当前不是安全上下文（${location.protocol}//${location.host}）：` +
      'SharedArrayBuffer 只在 https、或 http://localhost / 127.0.0.1 下才存在，' +
      '光加 COOP/COEP 响应头没用，先把站点切到 https（或本地用 serve.py 打开）';
  if (!self.crossOriginIsolated)
    return '站点已经是 https，但页面没拿到跨源隔离：文档响应里缺 ' +
      'Cross-Origin-Opener-Policy: same-origin 或 Cross-Origin-Embedder-Policy: require-corp。' +
      (hasSAB
        ? '这个浏览器在非隔离上下文里仍然给了 SharedArrayBuffer，但 Atomics.wait 会被拒绝，调试照样停不住。'
        : '这个浏览器在非隔离上下文里不提供 SharedArrayBuffer，所以看着像「没有这个对象」，跟版本新旧无关。') +
      'nginx 有两个坑：add_header 不继承（某个 location 一旦自己写了 add_header，' +
      '上层那两个头就不再落到这个响应上，要么每个 location 重复写，要么 include 一个片段）；' +
      '要带 always，改完还得硬刷新，旧的文档响应有缓存。' +
      '如果这个页面是被 iframe 嵌在别的站点里用的，父页面也得带同样两个头，祖先链上断一环就不隔离。' +
      `自查：控制台看 self.isSecureContext 和 self.crossOriginIsolated（当前分别是 ${self.isSecureContext} 和 ${self.crossOriginIsolated}），` +
      '或者 curl -I 这个页面，看响应头里有没有那两行';
  return '跨源隔离已经生效，但这个浏览器里没有 SharedArrayBuffer：多半是企业策略或隐私设置把它关掉了';
}

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
  /* 断点表换版本了。C++ 的行桩每行都直接读 bp[]，不看这个槽；Python 的桩把断点
     名单镜像成了 Python 自己的集合（每行跨 Python→JS 去查表太贵），靠版本号才知道
     什么时候该重取。见 dbgproto.js 的 S.BPGEN。 */
  Atomics.add(dbg.ctl, DBG.S.BPGEN, 1);
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

/* ------------------------------------------------------------------ */
/* 每行执行次数 → 热力背景                                              */
/*                                                                    */
/* 计数在 worker 侧（共享内存的 heat[行号]，见 dbgproto.js），不是主线程 */
/* 攒的：dbgTick 50 ms 才读一次当前行，全速档两次轮询之间早就跨过几千行， */
/* 采样数出来的是「这行被看见过几次」，跟真正的执行次数差着好几个数量级。 */
/* 深浅按 log2 分档、第 9 档封顶，是因为冒泡内层动辄上万次：线性映射的   */
/* 话除了最里面那两行全是纯红，外层循环和只做一次的初始化行分不出层次；   */
/* 取对数后 1 次、2~3、4~7、…、≥256 各占一档，红度上限锁在不吃掉字的     */
/* 那一档（.heat9 的 alpha 见 index.html）。                            */
/* ------------------------------------------------------------------ */
const HEAT_LEVELS = 9;
const HEAT_SEL = Array.from({ length: HEAT_LEVELS },
  (_, i) => `.ace_marker-layer .heat${i + 1}`).join(', ');

/* 次数 → 档次：1→1，2~3→2，4~7→3，…，≥256→9（封顶） */
function heatBucket(n) {
  let b = 1;
  while (b < HEAT_LEVELS && n >= (1 << b)) b++;
  return b;
}

/* 会话结束后给状态栏补一句：热力层还在编辑器上，顺手把最热的那行报出来。 */
function heatSummary() {
  if (!dbg.heatMarks.size) return '';
  return ` · 热力 ${dbg.heatMarks.size} 行，最热第 ${dbg.heatMax.line} 行 × ${dbg.heatMax.n.toLocaleString('en-US')} 次`;
}

function updateHeatBar() {
  const bar = $('heatbar');
  if (!bar) return;
  if (!dbg.heatMarks.size) { bar.classList.remove('on'); return; }
  bar.classList.add('on');
  $('heatinfo').textContent =
    `已标 ${dbg.heatMarks.size} 行，最热第 ${dbg.heatMax.line} 行 × ${dbg.heatMax.n.toLocaleString('en-US')} 次`;
}

/* 把 heat[] 里的次数刷成行背景。只动「档次变了」的那几行：addMarker/removeMarker
   会让 Ace 重画整个 marker 层，每个 tick 全量重建的话画面会跟着抖。 */
function paintHeat() {
  const heat = dbg.cb && dbg.cb.heat;
  if (!heat || !dbg.heatRows) return;
  const sess = srcEditor.session;
  const rows = sess.getLength();
  let changed = false;
  for (const line of dbg.heatRows) {
    if (line < 1 || line > DBG.MAX_LINE) continue;
    const n = heat[line];
    if (n > dbg.heatMax.n) dbg.heatMax = { n: n, line: line };
    if (!n) continue;
    const row = line - 1;
    if (row >= rows) continue;
    /* 次数每次都存（悬停框要报准确数字），marker 只在档次跨档时才重画 */
    if (dbg.heatN.get(row) !== n) dbg.heatN.set(row, n);
    const b = heatBucket(n);
    if (dbg.heatLv.get(row) === b) continue;
    const old = dbg.heatMarks.get(row);
    if (old) sess.removeMarker(old);
    dbg.heatMarks.set(row, sess.addMarker(new Range(row, 0, row, 1), 'heat' + b, 'screenLine', false));
    dbg.heatLv.set(row, b);
    changed = true;
  }
  if (changed) dbgSyncMarkers();
  /* 状态条每次都刷：heatMax 会在一档之内继续往上走（128~255 都算第 8 档），
     只跨档才刷的话「最热 ×N 次」会停在旧数字上。 */
  updateHeatBar();
}

/* 清掉热力层：换源码、重开一次调试会话，或者手动按「清除」。
   会话结束时不调它 —— 保留最终的红色分布正是这个功能的目的。 */
function clearHeat() {
  const sess = srcEditor.session;
  for (const m of dbg.heatMarks.values()) sess.removeMarker(m);
  dbg.heatMarks.clear(); dbg.heatLv.clear(); dbg.heatN.clear();
  dbg.heatMax = { n: 0, line: 0 };
  hideVarTip();     /* 悬停框里可能正挂着某一行的次数，层都撤了就不能再留着 */
  dbgSyncMarkers();
  const ds = srcEditor.container.querySelectorAll(HEAT_SEL);
  for (const d of ds) d.remove();
  updateHeatBar();
}

/* 行号对应的是编译进去的那份源码；改一个字热力层就不再可信了，直接撤掉。
   （会话中编辑器是只读的，所以这里不会跟插桩过程抢着改 marker。） */
srcEditor.session.on('change', () => { if (dbg.heatMarks.size) clearHeat(); });

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
    bgmNote(line);      /* 行号变了才弹一声，个位决定音高（见 BGM 一节） */
    /* 跟着执行行走：
       停住时 gotoLine —— 光标也一起过去（Ace 的 gotoLine 自带居中），这样停下行
         直接悬停变量名就能看值；
       跑动时只有它跑出视野才滚，而且只滚不动光标，免得每行都拽一下画面、把人
         正在看的那段顶走。
       两个 API 都挂在 Editor 上而不是 renderer 上：isRowVisible(row) 内部读
       editor.getFirstVisibleRow()/getLastVisibleRow()；scrollToLine 收的是 0 基
       行号（它拿 row 直接喂给 $cursorLayer.getPixelPosition），所以这里传 line-1。 */
    if (line > 0) {
      if (parked) srcEditor.gotoLine(line, 0, false);
      else if (!srcEditor.isRowVisible(line - 1)) srcEditor.scrollToLine(line - 1, true, false);
    }
  }
  dbgState.textContent = parked
    ? `停在第 ${line} 行（${REASON_TEXT[c[DBG.S.REASON]] || '已停'}）· 行桩触发 ${hits.toLocaleString('en-US')} 次`
    : `运行中 · 第 ${line} 行 · 行桩触发 ${hits.toLocaleString('en-US')} 次`;
  if (!parked) hideVarTip();
  /* 热力背景：跑动时 200 ms 刷一次就够（看的是趋势，不是逐帧动画）；停住时每趟
     都刷，手工单步绕一圈能看着当前行一档一档变红。没档次变化时 paintHeat 自己会
     提前返回，不碰 marker 层。 */
  if (parked) paintHeat();
  else if (++dbg.heatTick >= 4) { dbg.heatTick = 0; paintHeat(); }
  /* 观察窗每趟都刷：它报的就是 val/arr 里的当前快照，代价只有十几行 textContent，
     而「跟着单步一起跳」正是这个面板存在的意义。 */
  refreshWatch();
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

/* 两个 int32 按类型描述还原成数值：数字，64 位给 BigInt。
   悬停/观察窗的格式化（fmtVar）和表达式求值器读内存用的是同一个函数，
   两条路对同一个字节的解释不可能对不上。 */
function numFromBits(t, lo, hi) {
  const u = lo >>> 0;
  const uh = hi >>> 0;
  const bits = t.bits || 32;
  if (t.kind === 'bool') return u ? 1 : 0;
  if (t.kind === 'float') {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(0, u, true);
    dv.setUint32(4, uh, true);
    return bits === 32 ? dv.getFloat32(0, true) : dv.getFloat64(0, true);
  }
  if (t.kind === 'ptr') return u;
  if (bits === 64) {
    /* 64 位用 BigInt，免得超过 2^53 掉精度 */
    return t.signed ? (BigInt(hi) << 32n) | BigInt(u) : (BigInt(uh) << 32n) | BigInt(u);
  }
  if (bits === 32) return t.signed ? (lo | 0) : u;
  const m = (1 << bits) - 1;
  let x = u & m;
  if (t.signed && (x & (1 << (bits - 1)))) x -= (1 << bits);
  return x;
}

/* 数值写成人类可读的样子：指针给地址，bool 给字面量，char 带上字符提示 */
function showVal(t, x) {
  if (t.kind === 'bool') return x ? 'true' : 'false';
  if (t.kind === 'float') {
    if (Number.isNaN(x)) return 'NaN';
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    return Object.is(x, -0) ? '-0' : String(x);
  }
  if (t.kind === 'ptr') return '0x' + (x >>> 0).toString(16).padStart(8, '0');
  const s = typeof x === 'bigint' ? x.toString() : String(x);
  const bits = t.bits || 32;
  if (bits === 8 && /char/.test(t.name || t.tname || '')) {
    const n = typeof x === 'bigint' ? Number(x) : x;
    const g = n >= 32 && n < 127 ? `'${String.fromCharCode(n)}' ` : '';
    return `${g}${s}`;
  }
  return s;
}

/* 把一个快照还原成人类可读的值：kind 决定怎么解释那两个 int32 */
function fmtVar(v, lo, hi) {
  return showVal(v, numFromBits(v, lo, hi));
}

/* 停在某行时能看到的变量：名字 -> 变量描述。
   同名要挑对的那个：一个函数里写两个 for (int i...) 就是两个 alloca、两个 id，
   插桩按函数收集快照名单，所以外面那个已经出了作用域也照样挂在当前行的名单上。
   取「先出现的」会读到死变量的旧值（实测冒泡用例里停在第 25 行，输入打印那趟的
   i 停在 30，把真正的循环变量 i=0 盖掉了），所以按声明行比大：离当前行最近的那次
   声明就是当前作用域里活着的那个，把早先的同名顶掉。 */
function liveVarsAt(line) {
  const map = new Map();
  const ids = (dbg.lineVars && dbg.lineVars[String(line)]) || [];
  for (const id of ids) {
    const v = dbg.vars && dbg.vars[id];
    if (!v) continue;
    const prev = map.get(v.name);
    if (!prev || (v.line || 0) >= (prev.line || 0)) map.set(v.name, v);
  }
  return map;
}

/* 悬停/面板里一次铺开多少个元素。纯显示上限，不再是缓冲区宽度 —— 元素本来就
   在主线程直接读的那块共享内存里，想给多少个都行，只是 tooltip 会撑成一屏日志。 */
const ARR_TIP_N = 50;

/* 从用户的共享线性内存里按地址读一个元素，返回那两个小端 int32。
   字节宽度优先用类型描述自带的（插桩时算好的），回落到 DWARF 位宽推。
   越界、宽度不认识、内存还没递过来 —— 一律返回 null，由调用方说清楚原因，
   绝不猜一个数填上去。 */
function memPeek(addr, d) {
  const dv = dbg.gdv;
  if (!dv || !addr) return null;
  const b = d.bytes || (d.kind === 'ptr' ? 4 : ((d.bits || 0) >> 3));
  if (b !== 1 && b !== 2 && b !== 4 && b !== 8) return null;
  if (addr < 0 || addr + b > dv.byteLength) return null;
  let lo, hi = 0;
  if (b === 1) lo = dv.getUint8(addr);
  else if (b === 2) lo = dv.getUint16(addr, true);
  else if (b === 4) lo = dv.getUint32(addr, true);
  /* 高 32 位一定要按「有符号」取：numFromBits 的 64 位分支靠 BigInt(hi) << 32 的
     符号扩展还原负数，取成无符号的话 -1 会报成 18446744073709551615。
     （标量那条通道存的就是 Int32Array，天然带符号，所以没这个问题。） */
  else { lo = dv.getUint32(addr, true); hi = dv.getInt32(addr + 4, true); }
  return { lo: lo, hi: hi, bytes: b };
}

/* 按类型从内存里取一个值；读不到给 null（求值器拿它区分「0」和「没读着」） */
function readAt(addr, ty) {
  const p = memPeek(addr, ty);
  return p ? numFromBits(ty, p.lo, p.hi) : null;
}

/* 类型描述归一化。插桩送回来的变量记录（rec）和 rec.pt 那种 wireTy 节点形状不完全
   一样（一个用 tname/ekind，一个用 name/elem），这里统一成求值器认的那一份：
   { kind, bits, signed, name, bytes }，数组再带 elem + dims，指针再带 pt。
   bytes 是「这个类型在内存里占几个字节」，算下标偏移全靠它；拿不准就是 0，
   求值器看到 0 会明说算不了，不会闷头猜。 */
function normTy(t) {
  if (!t) return { kind: 'unknown', name: '?', bytes: 0 };
  const o = {
    kind: t.kind || 'unknown', bits: t.bits || 0, signed: !!t.signed,
    name: t.name || t.tname || '?',
    bytes: t.bytes || (t.kind === 'ptr' ? 4 : ((t.bits || 0) >> 3)),
  };
  if (o.kind === 'arr') {
    o.elem = normTy(t.elem);
    o.dims = (t.dims && t.dims.length) ? t.dims.slice() : [0];
  }
  if (o.kind === 'ptr') o.pt = normTy(t.pt);
  return o;
}

/* 变量记录 -> 类型描述。数组的元素类型优先用插桩带回来的 et（那是完整的 wireTy，
   指针元素还能继续往下剥），老构建没有 et 才用 ekind/ebits 这几个散字段拼。 */
function varTy(v) {
  if (v.kind === 'arr') {
    const e = v.et ? normTy(v.et) : normTy({
      kind: v.ekind, bits: v.ebits, signed: v.esigned, name: v.ename, bytes: v.ebytes,
    });
    return {
      kind: 'arr', name: v.tname || (e.name + '[]'), bytes: e.bytes,
      elem: e, dims: (v.adims && v.adims.length) ? v.adims.slice() : [v.acount || 0],
    };
  }
  if (v.kind === 'ptr') {
    return { kind: 'ptr', bits: 32, signed: false, name: v.tname || 'void*', bytes: 4, pt: normTy(v.pt) };
  }
  /* 标量：变量记录里的 name 是变量名，类型名在 tname 上，别让它俩串位
     （不然观察窗的类型列会显示成 `x : x = 42`）。 */
  return normTy({
    kind: v.kind, bits: v.bits, signed: v.signed, name: v.tname,
  });
}

/* ------------------------------------------------------------------ */
/* 一行放得下多少就铺多少。观察窗以前固定铺 8 个元素，可那一列实际有六七百像素 */
/* 宽，等宽字体下二十几个都塞得下，窗口拉大还能更多 —— 所以现在按列宽量着给。  */
/* 量文字用 canvas 的 measureText，字体从那一列的 computed style 取，全程不摸 */
/* DOM 布局；clientWidth 只在 refreshWatch 开头集中读一次（读布局会强制同步重 */
/* 排，和写文本交错着来就是每行一次）。预算里连尾巴那句「…（共 N 个）」也算进 */
/* 去，否则加上它正好超一格，行高就被撑成两行。拿不到 canvas、或者            */
/* 列还没布局（px=0）时退回原来的定数，不硬撑。                              */
/* ------------------------------------------------------------------ */
const FIT_MAX = 200;      /* 一行最多尝试铺多少个片段（等宽列摆不下更多） */

const measurer = (() => {
  const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = cv ? cv.getContext('2d') : null;
  let font = '';
  return {
    ok: !!ctx,
    /* 换行/换字号/换配色之后 font 会变，取一次比每次量都读 computed style 便宜 */
    use(el) {
      if (!ctx || !el) return;
      const cs = getComputedStyle(el);
      const f = (cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily).trim();
      if (f !== font) { font = f; ctx.font = f; }
    },
    w(s) { return ctx ? ctx.measureText(s).width : 0; }
  };
})();

/* pieces 是已经写好的片段（元素值，或字符串的一个字符）；pre/post 是外层括号，
   sep 是片段间的分隔符，noteFor(k) 是截断时要补的那句。px > 0 走量宽那条路，
   否则按 limit 个切。total 是这一段的**真实**元素个数：pieces 可能本来就只给了
   前若干个（悬停框只读 50 个、量宽那条路最多铺 FIT_MAX 个），截断与否要同 total
   比，不能同 pieces.length 比 —— 不然「一共 100 个、这里只给了 50 个」这一句会被
   判成「全给了」，尾巴整个丢掉。 */
function fitLine(px, limit, pieces, pre, post, sep, noteFor, total) {
  const n = pieces.length;
  const tot = Math.max(total === undefined ? n : total, n);
  if (!(px > 0) || !measurer.ok) {
    const m = Math.min(n, limit || n);
    return pre + pieces.slice(0, m).join(sep) + post + (m < tot ? noteFor(m) : '');
  }
  const budget = px - 2;               /* 留 2 px：亚像素抖动不该把一行挤成两行 */
  const sepW = measurer.w(sep);
  let used = measurer.w(pre + post);
  let k = 0;
  for (; k < n; ++k) {
    const add = measurer.w(pieces[k]) + (k ? sepW : 0);
    if (used + add > budget) break;
    used += add;
  }
  while (k > 0 && k < tot && measurer.w(pre + pieces.slice(0, k).join(sep) + post + noteFor(k)) > budget) k -= 1;
  if (k < 1) k = 1;                    /* 再窄也至少给一个，别空着一行 */
  return pre + pieces.slice(0, k).join(sep) + post + (k < tot ? noteFor(k) : '');
}

/* ------------------------------------------------------------------ */
/* char[] 当字符串看。元素是 1 字节整数（char / unsigned char / int8_t）、 */
/* 内容又全是可显示的文字，就直接写成 "…"，不再一个一个报十进制。           */
/* 「可显示」按 UTF-8 严格解码判定：解不出合法 UTF-8，或者解出来还带着控制   */
/* 字符（\t \n \r 除外，它们写成转义，不然一行放不平），就退回逐个元素铺开 —— */
/* 报一屏乱码不如报数，所以宁可退回，不猜。                                 */
/* 第一个 0 是 C 字符串的结尾：它之后的字节（补位用的那一大片 0）不参与判定， */
/* 也不显示。整个数组都没有 0 时按定宽字段处理，全可显示就照抄。             */
/* bool 不会被误认：它的 kind 是 'bool'，不是 'int'。                       */
/* ------------------------------------------------------------------ */
const STR_WATCH_N = 64;   /* 量不出宽度时观察窗一行退回铺多少个字符 */
const STR_TIP_N = 200;    /* 悬停框铺开多少个字符 */
const STR_SCAN_MAX = 4096; /* 找结尾那个 0 最多扫多少字节：再长的数组只报「至少」 */
const utf8Strict = typeof TextDecoder !== 'undefined'
  ? new TextDecoder('utf-8', { fatal: true }) : null;

function isCharTy(t) {
  return !!t && t.kind === 'int' && (t.bytes === 1 || t.bits === 8);
}

/* 像字符串就返回转义好的字符数组（外加长度信息），不像（或内存还没递过来）
   返回 null —— 铺几个、加不加省略号那句，全交给 fitLine 按行宽定。 */
function charPieces(addr, count) {
  const dv = dbg.gdv;
  if (!dv || !utf8Strict || !addr || !count) return null;
  const hi = Math.min(count, STR_SCAN_MAX);
  let end = hi;
  for (let i = 0; i < hi; ++i) {
    const p = addr + i;
    if (p < 0 || p >= dv.byteLength) return null;
    if (dv.getUint8(p) === 0) { end = i; break; }
  }
  /* TextDecoder 不吃挂在 SharedArrayBuffer 上的视图（"must not be shared"），
     所以先把这一段字节拷进一份普通内存；拷的规模由 STR_SCAN_MAX 兜住。 */
  const bytes = new Uint8Array(end);
  bytes.set(new Uint8Array(dv.buffer, addr, end));
  let s;
  try { s = utf8Strict.decode(bytes); }
  catch (e) { return null; }             /* 不是合法 UTF-8：退回逐个元素报数 */
  const parts = new Array(s.length);
  for (let i = 0; i < s.length; ++i) {
    const c = s.charCodeAt(i);
    if (c === 0x09) parts[i] = '\\t';
    else if (c === 0x0a) parts[i] = '\\n';
    else if (c === 0x0d) parts[i] = '\\r';
    else if (c < 0x20 || c === 0x7f) return null;   /* 其余控制字符：不像文字 */
    else parts[i] = (c === 0x22 || c === 0x5c) ? '\\' + s[i] : s[i];
  }
  /* 「共」还是「至少」：看见过结尾的 0（end < hi），或者整个数组都在扫描范围里
     （hi === count），长度才是确定的；只有被 STR_SCAN_MAX 截断的那一段才说不准。 */
  return { parts: parts, known: end < hi || hi === count };
}

/* 一段内存里的 n 个同类型元素铺开成 { … }，超过 limit 就把总长度报出来。
   读不到的位置（越界、元素宽度不认识）给一个「·」，不猜值。
   字符数组先试字符串那条路；px > 0 时按这一列的像素宽度尽量多铺（观察窗），
   否则退回 limit 个定数（悬停框）。 */
function cellsText(addr, elemTy, count, limit, strLimit, px) {
  if (isCharTy(elemTy)) {
    const cp = charPieces(addr, count);
    if (cp) {
      /* 尾巴那句越短，同一行能塞下的字符就越多 —— 省略号本身已经说明「没铺完」，
         这里只补一个总长，不再重复「只显示前 k 个」。 */
      const noteFor = (k) => `…（${cp.known ? '共' : '至少'} ${cp.parts.length} 个字符）`;
      return fitLine(px, strLimit, cp.parts, '"', '"', '', noteFor);
    }
  }
  const cap = px > 0 && measurer.ok ? Math.min(count, FIT_MAX) : Math.min(count, limit || count);
  const pieces = new Array(cap);
  for (let i = 0; i < cap; ++i) {
    const x = readAt(addr + i * elemTy.bytes, elemTy);
    pieces[i] = x === null ? '·' : showVal(elemTy, x);
  }
  const noteFor = (k) => `…（共 ${count} 个）`;
  return fitLine(px, limit, pieces, '{ ', ' }', ', ', noteFor, count);
}

/* 数组的前 limit 个元素：地址从控制块的地址表里拿（那是 __pg_addr 在每行快照时
   登记的栈槽地址，函数返回后同一个槽会被后面的调用复用 —— 和真实调试器一样），
   元素本身直接读共享内存。 */
function arrCells(v, limit, strLimit) {
  if (v.kind !== 'arr' || !v.acount) return { err: '长度未知的数组（变长数组），没法展开' };
  const cb = dbg.cb;
  const base = v.id * DBG.ARR_W;
  const addr = cb ? cb.arr[base] : 0;
  const count = (cb && cb.arr[base + 2]) || v.acount;
  if (!cb || !addr || !count) return { err: '尚无快照（这一行还没执行到它的声明）' };
  if (!dbg.gdv) return { err: '用户内存还没从运行 Worker 递过来' };
  return { text: cellsText(addr, varTy(v).elem, count, limit, strLimit) };
}

/* 数组值的一行写法；拿不到快照时把原因原话说出来 */
function arrText(v, limit, strLimit) {
  const a = arrCells(v, limit, strLimit);
  return a.err ? a.err : a.text;
}

function varTipText(name, v, line) {
  const head = `${name} : ${v.tname || '?'}`;
  if (v.kind === 'arr') return `${head} = ${arrText(v, ARR_TIP_N, STR_TIP_N)}`;
  if (v.kind === 'obj' || v.kind === 'unknown') {
    return `${head} = 结构体/数组，暂不展开`;
  }
  if (!dbg.cb || !dbg.cb.wr[v.id]) return `${head} = 尚无快照`;
  const lo = dbg.cb.val[v.id * 2];
  const hi = dbg.cb.val[v.id * 2 + 1];
  const note = v.line === line ? '（本行声明，可能还没赋值）' : '';
  return `${head} = ${fmtVar(v, lo, hi)}${note}`;
}

/* ------------------------------------------------------------------ */
/* 解释器型语言的值通道                                                */
/*                                                                    */
/* 解释器的堆在 Worker 里，主线程按地址读不到，所以停住前由 Worker 递   */
/* 一份当前帧的快照（{line, frame, items}，见 py.worker.js 的 PYSNAP）。 */
/* 值已经是那边格式化好的文本：有界、不执行用户的 __repr__，这边只拼字， */
/* 不再解释字节，也就没有 C++ 那套类型描述和求值器的事。                */
/* ------------------------------------------------------------------ */

/* 读之前对一次行号，并且要求真的停住了：快照属于哪一行是 Worker 说的，
   控制块的当前行可能已经又往前走了（全速跑时两次轮询之间跨过几千行）。
   对不上就当没有 —— 绝不把上一站的值配到这一站上。 */
function snapshotAt(line) {
  const L = dbg.pyLocals;
  if (!L || L.line !== line) return null;
  if (!dbg.ctl || Atomics.load(dbg.ctl, DBG.S.STATE) !== DBG.STATE.PARK) return null;
  return L;
}

/* 截断了才补一句真实总数。省略号是 Worker 切原料时留下的记号，没切过的短值
   再报一遍「共 5 个」只是噪音。单位按 kind 分：字符串报字符、字节串报字节。 */
function pyCountNote(it) {
  if (!it.c || it.v.indexOf('…') < 0) return '';
  const unit = it.k === 'str' ? '个字符' : it.k === 'bytes' ? '个字节' : '个';
  return `（共 ${it.c.toLocaleString('en-US')} ${unit}）`;
}

function pyTipText(it) {
  return `${it.n} : ${it.t} = ${it.v}${pyCountNote(it)}`;
}

/* 观察窗本期只收单个变量名：式子（a[i]、x+1）要在解释器里 eval 才算得准，
   拿 C++ 那套按地址算的求值器去套 Python 的名字，算出来的不是同一回事。
   名字按 Unicode 标识符认（Python 3 允许 姓名 = '张三'），不是 ASCII 词字符。 */
function isPlainName(s) {
  return /^[\p{ID_Start}_][\p{ID_Continue}]*$/u.test(s);
}

function pyWatchValue(expr, line) {
  const name = expr.trim();
  if (!isPlainName(name)) {
    return { ty: '—', val: '只支持单个变量名，表达式（a[i]、x+1）还没做', cls: 'off' };
  }
  const L = snapshotAt(line);
  if (!L) return { ty: '—', val: '停住才有值（运行中不递快照）', cls: 'idle' };
  const it = L.items.find((x) => x.n === name);
  if (!it) return { ty: '—', val: `第 ${line} 行（${L.frame}）没有 ${name}`, cls: 'off' };
  /* fit：值是那边写好的一整段文本，这边不量宽切片段，交给 .fit1 那条 CSS
     单行收省略号，整句挂在 title 上（refreshWatch 每趟都写）。 */
  return { ty: it.t, val: it.v + pyCountNote(it), cls: '', fit: true };
}

/* 悬浮框只有一个（.vartip）：停住时显示变量值，其余时候显示这行的执行次数。 */
function showTip(text, ev) {
  varTipEl.textContent = text;
  varTipEl.style.display = 'block';
  const w = varTipEl.offsetWidth, h = varTipEl.offsetHeight;
  varTipEl.style.left = Math.min(ev.clientX + 14, innerWidth - w - 8) + 'px';
  varTipEl.style.top = (ev.clientY + 16 + h > innerHeight ? ev.clientY - h - 8 : ev.clientY + 16) + 'px';
}

/* 没停住时悬停报这一行的执行次数：找热点的人要的正是这个数。
   取的是最后一次 paintHeat 存下的快照，会话结束后那就是终值。 */
function heatTipAt(ev) {
  if (!dbg.heatN.size) return false;
  let row = -1;
  try {
    row = srcEditor.renderer.screenToTextCoordinates(ev.clientX, ev.clientY).row;
  } catch (e) { return false; }
  const n = dbg.heatN.get(row);
  if (!n) return false;
  showTip(`第 ${row + 1} 行执行 ${n.toLocaleString('en-US')} 次（热力第 ${dbg.heatLv.get(row)}/${HEAT_LEVELS} 档）`, ev);
  return true;
}

/* 悬停查变量。注意不能用 e.target 是不是 .ace_identifier 的 span 来判断：
   Ace 的 .ace_layer 整层 pointer-events: none（它自己的 CSS 里写了，为了 Safari
   滚轮不被打断），真实鼠标事件的 target 永远是 div.ace_content，压根拿不到 span。
   所以走坐标反查：clientX/Y -> 文档行列 -> 该位置的 token。
   变量值只在「停住」时给（那时内存是静止的）；没停住就退一步报热力次数。 */
srcEditor.container.addEventListener('mousemove', (ev) => {
  if (!(dbg.active && dbg.ctl) || Atomics.load(dbg.ctl, DBG.S.STATE) !== DBG.STATE.PARK) {
    if (heatTipAt(ev)) return;
    hideVarTip();
    return;
  }
  let name = '';
  try {
    const pos = srcEditor.renderer.screenToTextCoordinates(ev.clientX, ev.clientY);
    /* getTokenAt 收的是光标位（内部按「累计长度 >= column」挑 token，等于 1 基），
       screenToTextCoordinates 给的是 0 基列号，差这一格的话每个标识符的第一个字符
       都会落到前一个 token 上 —— 单字符名字（i、a、s）整格都取不到值。 */
    const tok = srcEditor.session.getTokenAt(pos.row, pos.column + 1);
    if (tok && /^(identifier|variable|property)/.test(tok.type) && /^[\w$]+$/.test(tok.value)) {
      name = tok.value;
    } else if (tok && lang.valueChannel === 'locals') {
      /* Ace 的 python 高亮规则只认 ASCII 词字符，中文名字（姓名 = '张三'）落在
         text token 上。这时拿快照当权威：整段 token 去掉空白正好是这一帧里的一个
         名字就认它 —— 注释和字符串的 token 带着 # 和引号，配不上任何名字。 */
      const L = snapshotAt(dbg.ctl[DBG.S.LINE]);
      const w = tok.value.trim();
      if (L && L.items.some((x) => x.n === w)) name = w;
    }
  } catch (e) { name = ''; }
  if (!name) { if (!heatTipAt(ev)) hideVarTip(); return; }
  const line = dbg.ctl[DBG.S.LINE];
  if (lang.valueChannel === 'locals') {
    const L = snapshotAt(line);
    const it = L && L.items.find((x) => x.n === name);
    if (!it) { if (!heatTipAt(ev)) hideVarTip(); return; }
    showTip(pyTipText(it), ev);
    return;
  }
  const v = liveVarsAt(line).get(name);
  if (!v) { if (!heatTipAt(ev)) hideVarTip(); return; }
  showTip(varTipText(name, v, line), ev);
});
srcEditor.container.addEventListener('mouseleave', hideVarTip);

/* ------------------------------------------------------------------ */
/* 表达式求值                                                          */
/*                                                                    */
/* 观察窗要收 a[i]、*(p+1)、a[i][j]、x/100 > 0.5 这样的式子。wasm 里那 */
/* 套 clang 没法拿来算 JS 字符串，所以这里自己写一个：词法 -> 递归下降 */
/* -> 按类型描述算地址 -> 从共享内存读值。它算出来的数不是蒙的，依据有 */
/* 两条：插桩把每个变量的 DWARF 类型（元素类型、多维数组每一维的长度、 */
/* 指针指向什么）一起带回了主线程；调试构建链的是共享内存，主线程拿着   */
/* 地址就能读到程序此刻真实的字节。                                    */
/*                                                                    */
/* 覆盖：标识符、整数字面量（含十六进制和 u/l 后缀）、字符字面量、浮点   */
/* 字面量、true/false/nullptr、下标 []（数组、多维、指针）、括号、一元  */
/* + - ! ~ * &、二元 + - * / % << >> < <= > >= == != & | ^ && || ?:、 */
/* 指针加减下标、(类型) 强转。                                         */
/* 明确不做，碰到了就直说而不是给个看着像答案的数：成员访问 . 和 ->（结 */
/* 构体字段本期不展开）、函数调用（v.size()）、字符串字面量、++/--（会  */
/* 写内存，观察窗只读）、全局变量（DWARF 的 llvm.dbg.declare 只报局部量，*/
/* 插桩表里压根没有它们）。                                            */
/*                                                                    */
/* 求值时机跟悬停一样：停住时内存是静止的，读到的一定是干净值；全速跑时 */
/* 每个 tick 也在刷，可能读到某个赋值写到一半的撕裂值 —— 这是「跟着每行 */
/* 刷新」换来的，标量通道一直如此。                                    */
/* ------------------------------------------------------------------ */

/* 表达式里说人话的错误：e.expr 标记这是「该给用户看的一句解释」，
   不是页面自己出了 bug。求值器绝不静默返回一个猜出来的数。 */
function exprErr(msg) {
  const e = new Error(msg);
  e.expr = true;
  return e;
}

const E_INT = { kind: 'int', bits: 32, signed: true, name: 'int', bytes: 4 };
const E_UINT = { kind: 'int', bits: 32, signed: false, name: 'unsigned int', bytes: 4 };
const E_SHORT = { kind: 'int', bits: 16, signed: true, name: 'short', bytes: 2 };
const E_USHORT = { kind: 'int', bits: 16, signed: false, name: 'unsigned short', bytes: 2 };
const E_LLONG = { kind: 'int', bits: 64, signed: true, name: 'long long', bytes: 8 };
const E_ULLONG = { kind: 'int', bits: 64, signed: false, name: 'unsigned long long', bytes: 8 };
const E_FLOAT = { kind: 'float', bits: 32, signed: true, name: 'float', bytes: 4 };
const E_DOUBLE = { kind: 'float', bits: 64, signed: true, name: 'double', bytes: 8 };
const E_CHR = { kind: 'int', bits: 8, signed: true, name: 'char', bytes: 1 };
const E_BOOL = { kind: 'bool', bits: 8, signed: false, name: 'bool', bytes: 1 };

/* ---- 词法 ---- */
const EX_NUM = /((?:0[xX][0-9a-fA-F]+|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?))([uUlLfF]*)/y;
const EX_ID = /[A-Za-z_$][\w$]*/y;
const EX_OP2 = ['<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--', '->', '::'];
const EX_OP1 = '+-*/%()[],<>=!&|^~?:;.';

function tokenizeExpr(src) {
  const tk = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { ++i; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') {
          const e = src[j + 1];
          s += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e === '0' ? '\0' : (e === undefined ? '' : e);
          j += 2;
        } else { s += src[j]; ++j; }
      }
      if (j >= src.length) throw exprErr('引号没有闭合');
      if (c === '"') throw exprErr('字符串字面量不参与求值：要看内容请直接观察那个 char 数组');
      if (s.length !== 1) throw exprErr('字符字面量只支持单个字符（\'a\'），多个字符的（\'ab\'）不算');
      tk.push({ k: 'num', v: s.charCodeAt(0), ty: E_CHR, t: `'${s}'` });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      EX_NUM.lastIndex = i;
      const m = EX_NUM.exec(src);
      if (!m) throw exprErr(`这个数看不懂：${src.slice(i, i + 12)}`);
      i += m[0].length;
      tk.push(numToken(m[1], m[2].toLowerCase()));
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      EX_ID.lastIndex = i;
      const m = EX_ID.exec(src);
      tk.push({ k: 'id', v: m[0], t: m[0] });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (EX_OP2.indexOf(two) >= 0) { tk.push({ k: 'op', v: two, t: two }); i += 2; continue; }
    if (EX_OP1.indexOf(c) >= 0) { tk.push({ k: 'op', v: c, t: c }); ++i; continue; }
    throw exprErr(`这个字符进不了表达式：${c}`);
  }
  return tk;
}

/* 数字字面量的类型：wasm32 里 long 是 32 位、long long 才是 64 位，
   后缀按这个规则给；没后缀就按 C++ 的规则往能装下的最小类型上靠。
   十六进制（0x…）里那个 x 不能被当成指数，所以判浮点前先看是不是十六进制。 */
function numToken(text, suf) {
  const hex = /^0[xX]/.test(text);
  if (!hex && /[.eE]/.test(text)) {
    const bits = suf.indexOf('f') >= 0 ? 32 : 64;
    return {
      k: 'num', v: parseFloat(text), t: text,
      ty: { kind: 'float', bits: bits, signed: true, name: bits === 32 ? 'float' : 'double', bytes: bits / 8 },
    };
  }
  let x;
  try { x = BigInt(text); } catch (e) { throw exprErr(`这个数看不懂：${text}`); }
  const u = suf.indexOf('u') >= 0;
  let bits = suf.indexOf('ll') >= 0 ? 64 : 32;
  let signed = !u;
  if (!suf) {
    if (x > 0x7fffffffn && x <= 0xffffffffn) signed = false;
    if (x > 0xffffffffn) bits = 64;
  } else if (u && bits === 32 && x > 0xffffffffn) bits = 64;
  const name = `${signed ? '' : 'unsigned '}${bits === 64 ? 'long long' : 'int'}`;
  return {
    k: 'num', v: bits === 64 ? x : Number(x), t: text,
    ty: { kind: 'int', bits: bits, signed: signed, name: name, bytes: bits / 8 },
  };
}

/* ---- 语法：递归下降，一层一个优先级 ---- */
const BIN_LEVELS = [
  ['||'], ['&&'], ['|'], ['^'], ['&'],
  ['==', '!='], ['<', '<=', '>', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%'],
];
const CAST_WORDS = { int: 1, long: 1, short: 1, char: 1, signed: 1, unsigned: 1, float: 1, double: 1, bool: 1, _bool: 1 };
const CAST_TY = {
  'bool': E_BOOL,
  '_bool': { kind: 'bool', bits: 8, signed: false, name: '_Bool', bytes: 1 },
  'char': E_CHR,
  'signed char': { kind: 'int', bits: 8, signed: true, name: 'signed char', bytes: 1 },
  'unsigned char': { kind: 'int', bits: 8, signed: false, name: 'unsigned char', bytes: 1 },
  'short': E_SHORT, 'short int': E_SHORT, 'signed short': E_SHORT, 'signed short int': E_SHORT,
  'unsigned short': E_USHORT, 'unsigned short int': E_USHORT,
  'int': E_INT, 'signed int': E_INT, 'signed': E_INT,
  'unsigned int': E_UINT, 'unsigned': E_UINT,
  /* wasm32：long 和 int 同宽，unsigned long 同理 */
  'long': E_INT, 'long int': E_INT, 'signed long': E_INT, 'signed long int': E_INT,
  'unsigned long': E_UINT, 'unsigned long int': E_UINT,
  'long long': E_LLONG, 'long long int': E_LLONG, 'signed long long': E_LLONG,
  'unsigned long long': E_ULLONG,
  'float': E_FLOAT, 'double': E_DOUBLE,
};

function isOpAt(p, ops) {
  const t = p.tk[p.i];
  return !!t && t.k === 'op' && ops.indexOf(t.v) >= 0;
}
function expectOp(p, o) {
  if (!isOpAt(p, [o])) throw exprErr(`表达式里这里该有 ${o}`);
  p.i++;
}

function parseLevel(p, lv) {
  if (lv >= BIN_LEVELS.length) return parseUnary(p);
  let l = parseLevel(p, lv + 1);
  while (isOpAt(p, BIN_LEVELS[lv])) {
    const o = p.tk[p.i++].v;
    l = { k: 'bin', o: o, l: l, r: parseLevel(p, lv + 1) };
  }
  return l;
}

function parseTernary(p) {
  const c = parseLevel(p, 0);
  if (!isOpAt(p, ['?'])) return c;
  p.i++;
  const a = parseTernary(p);
  expectOp(p, ':');
  return { k: 'tern', c: c, a: a, b: parseTernary(p) };
}

function parseUnary(p) {
  if (isOpAt(p, ['-', '+', '!', '~', '*', '&'])) {
    const o = p.tk[p.i++].v;
    return { k: 'un', o: o, a: parseUnary(p) };
  }
  if (isOpAt(p, ['++', '--'])) throw exprErr('++/-- 要写内存，观察窗只读不写，别放进表达式');
  if (isOpAt(p, ['(']) && looksLikeCast(p)) return parseCast(p);
  return parsePostfix(p);
}

/* (int) x 和 (a + b) 都以 ( 开头，靠括号里是不是清一色的类型关键字区分 */
function looksLikeCast(p) {
  let i = p.i + 1;
  let n = 0;
  while (p.tk[i] && p.tk[i].k === 'id' && CAST_WORDS[p.tk[i].v.toLowerCase()]) { ++n; i += 1; }
  if (!n) return false;
  if (!(p.tk[i] && p.tk[i].k === 'op' && p.tk[i].v === ')')) return false;
  const key = p.tk.slice(p.i + 1, p.i + 1 + n).map((t) => t.v.toLowerCase()).join(' ');
  return !!CAST_TY[key];
}

function parseCast(p) {
  p.i++;
  const words = [];
  while (p.tk[p.i] && p.tk[p.i].k === 'id' && CAST_WORDS[p.tk[p.i].v.toLowerCase()]) {
    words.push(p.tk[p.i++].v.toLowerCase());
  }
  expectOp(p, ')');
  const ty = CAST_TY[words.join(' ')];
  return { k: 'cast', ty: ty, a: parseUnary(p) };
}

function parsePostfix(p) {
  let a = parsePrimary(p);
  for (;;) {
    if (isOpAt(p, ['['])) {
      p.i++;
      const i = parseTernary(p);
      expectOp(p, ']');
      a = { k: 'idx', a: a, i: i };
      continue;
    }
    if (isOpAt(p, ['.', '->'])) throw exprErr('成员访问（. 和 ->）不在本期范围：结构体/类的字段还读不到');
    if (isOpAt(p, ['('])) throw exprErr('函数调用不参与求值：观察窗只读内存，不执行代码（v.size() 这类得先把它存进一个变量再观察）');
    if (isOpAt(p, ['++', '--'])) throw exprErr('++/-- 要写内存，观察窗只读不写，别放进表达式');
    return a;
  }
}

function parsePrimary(p) {
  const t = p.tk[p.i];
  if (!t) throw exprErr('表达式不完整，后面还缺东西');
  if (t.k === 'num') { p.i++; return { k: 'lit', ty: t.ty, v: t.v }; }
  if (t.k === 'id') {
    p.i++;
    const low = t.v.toLowerCase();
    if (t.v === 'true' || t.v === 'false') {
      return { k: 'lit', ty: CAST_TY.bool, v: t.v === 'true' ? 1 : 0 };
    }
    if (t.v === 'nullptr' || t.v === 'NULL') {
      return { k: 'lit', ty: { kind: 'ptr', bits: 32, signed: false, name: 'nullptr', bytes: 4, pt: { kind: 'unknown', name: 'void', bytes: 0 } }, v: 0 };
    }
    if (low === 'sizeof') throw exprErr('sizeof 不参与求值（它是编译期就算好的）');
    return { k: 'id', n: t.v };
  }
  if (t.k === 'op' && t.v === '(') {
    p.i++;
    const e = parseTernary(p);
    expectOp(p, ')');
    return e;
  }
  if (t.k === 'op' && (t.v === ';' || t.v === ',')) throw exprErr('观察窗一次只算一个表达式，别写分号或逗号');
  throw exprErr(`这里该有一个数、变量名或 ( ，看到的是 ${t.t}`);
}

function parseExprSrc(src) {
  const p = { tk: tokenizeExpr(src), i: 0 };
  if (!p.tk.length) throw exprErr('表达式是空的');
  const e = parseTernary(p);
  if (p.i < p.tk.length) throw exprErr(`${p.tk[p.i].t} 这里连不上下文`);
  return e;
}

/* 语法很便宜，但每个 tick 都要重算 24 行，还是缓存一下。
   键是表达式文本，值要么是 AST 要么是「这句式子哪儿不对」。 */
const astCache = new Map();
function parseWatch(src) {
  const hit = astCache.get(src);
  if (hit) return hit;
  let r;
  try { r = { ast: parseExprSrc(src) }; }
  catch (e) { r = { err: e.expr ? e.message : `解析失败：${e.message}` }; }
  if (astCache.size > 128) astCache.clear();
  astCache.set(src, r);
  return r;
}

/* ---- 语义 ---- */
const isPtr = (t) => !!t && t.kind === 'ptr';
const isFlt = (t) => !!t && t.kind === 'float';
const isInt = (t) => !!t && (t.kind === 'int' || t.kind === 'bool');

/* 参与算术时 bool / char 一律先升到整数（C++ 的整型提升），位宽留给类型判断 */
function numTy(t) {
  if (t.kind === 'bool') return { kind: 'int', bits: 8, signed: true, name: t.name, bytes: 1 };
  return t;
}

/* 常规算术转换：有浮点就升到最宽的那个浮点，否则整数按最宽位走；
   32 位以下统一升到 int（wasm32 上 int 是 32 位），一方无符号结果就无符号。 */
function arithTy(a, b) {
  a = numTy(a); b = numTy(b);
  if (isFlt(a) || isFlt(b)) {
    const bits = Math.max(isFlt(a) ? a.bits : 0, isFlt(b) ? b.bits : 0) || 64;
    return { kind: 'float', bits: bits, signed: true, name: bits === 64 ? 'double' : 'float', bytes: bits / 8 };
  }
  const bits = Math.max(32, a.bits || 32, b.bits || 32);
  const signed = a.signed !== false && b.signed !== false;
  return {
    kind: 'int', bits: bits, signed: signed, bytes: bits / 8,
    name: `${signed ? '' : 'unsigned '}${bits === 64 ? 'long long' : 'int'}`,
  };
}

/* 值收成目标类型：整数走 BigInt 截断，浮点原样，bool 只看非零 */
function toTyBig(t, x) {
  if (typeof x !== 'bigint') x = BigInt(Math.trunc(Number(x)));
  const bits = BigInt(t.bits || 32);
  x &= (1n << bits) - 1n;
  if (t.signed && ((x >> (bits - 1n)) & 1n) === 1n) x -= (1n << bits);
  return x;
}
function intRes(t, x) {
  return { ty: t, val: t.bits >= 64 ? x : Number(x) };
}
const TRUE_RES = { ty: E_INT, val: 1 };
const FALSE_RES = { ty: E_INT, val: 0 };
function cmpRes(ok) { return ok ? TRUE_RES : FALSE_RES; }

function truthy(r) {
  const v = r.val;
  if (typeof v === 'bigint') return v !== 0n;
  return v !== 0;
}

/* 结果值写成一行。数组（a[i] 落在多维数组上剩下的那一行也是数组）按 px 这一列
   的宽度尽量铺开（拿不到宽度就 limit 个；字符数组走 strLimit），其它类型走
   showVal —— 和悬停完全同一套格式化。fit 标记「这行是按宽度铺的」，样式据此
   只许一行、放不下就省略号，不让它换行把面板撑高。 */
function showRes(r, limit, strLimit, px) {
  if (r.ty.kind === 'arr') {
    if (r.addr === undefined) throw exprErr('这个数组值没有地址，读不出元素');
    const n = dimProd(r.ty.dims);
    return {
      ty: r.ty.name,
      text: cellsText(r.addr, r.ty.elem, n, limit, strLimit, px),
      fit: px > 0,
    };
  }
  if (r.addr !== undefined) {
    const x = readAt(r.addr, r.ty);
    if (x === null) throw exprErr(`地址 0x${(r.addr >>> 0).toString(16)} 上读不出 ${r.ty.name}：越界，或者这个类型的宽度还不认`);
    return { ty: r.ty.name, text: showVal(r.ty, x) };
  }
  return { ty: r.ty.name, text: showVal(r.ty, r.val) };
}

function dimProd(dims) {
  let p = 1;
  for (const d of dims || []) p *= (d > 0 ? d : 0);
  return p;
}

/* 数组出现在要值的地方就是首元素地址（衰减）；带地址的标量按地址读；
   已经有值的原样返回。 */
function rvalue(r) {
  if (r.val !== undefined) return r;         /* 标量通道已经把这个变量的此刻值报给我们了 */
  if (r.ty.kind === 'arr') {
    const e = r.ty.elem;
    return {
      ty: { kind: 'ptr', bits: 32, signed: false, name: (e.name || '?') + '*', bytes: 4, pt: e },
      val: r.addr >>> 0,
    };
  }
  const x = readAt(r.addr, r.ty);
  if (x === null) throw exprErr(`地址 0x${(r.addr >>> 0).toString(16)} 上读不出 ${r.ty.name}：越界，或者这个类型的宽度还不认`);
  return { ty: r.ty, val: x };
}

/* 二元运算里数组先衰减成指针（a + 1 是加一个元素，不是把首地址当成数加） */
function decay(r) {
  return r.ty.kind === 'arr' ? rvalue(r) : r;
}

/* 变量名 -> 左值/右值。值走标量通道（val 槽），数组和「不在当前行名单里」的
   变量走地址通道（arr 槽），指针的「指向什么」从插桩带回来的 pt 链上取。
   ctx.stale 是一句话，不是个布尔：名单外按地址读的是这一行的真值，只是不属于
   当前作用域；只有退回标量通道那份缓存的才是旧值。 */
function varValue(name, ctx) {
  const hit = pickVar(name, ctx.line);
  if (!hit) throw exprErr(`没有 ${name}：本次构建的变量表里找不到它（全局变量不在表里，别的函数里的同名变量也不算）`);
  const v = hit.v;
  const ty = varTy(v);
  if (v.kind === 'obj' || v.kind === 'unknown') throw exprErr(`${name} 的类型是 ${ty.name}，结构体/类/未知类型本期读不了`);
  const cb = ctx.cb;
  if (!cb) throw exprErr(`${name} 还没有快照：会话没开始`);
  const snap = () => ({
    ty: ty, val: numFromBits(ty, cb.val[v.id * 2], cb.val[v.id * 2 + 1]), addr: cb.arr[v.id * DBG.ARR_W] | 0,
  });
  /* 一句提示只报第一个数不上名字的表达式，多个变量在外名单里时说不清是哪个 */
  const offList = () => { if (!ctx.stale) ctx.stale = `（${name} 不在当前行的快照名单里，按登记的地址读）`; };
  const base = v.id * DBG.ARR_W;
  const addr = cb.arr[base] | 0;
  if (v.kind === 'arr') {
    if (!addr || !cb.arr[base + 2]) throw exprErr(`${name} 当前行没有快照（这一行还没执行到它的声明）`);
    if (!hit.live) offList();
    return { ty: ty, addr: addr };
  }
  if (hit.live && cb.wr[v.id]) return snap();
  /* 没进这一行的快照名单，但插桩登记过它的栈槽地址 —— 直接读内存，
     拿到的还是这一行的真值（函数返回后同一个槽会被复用，这点和真实调试器一样）。 */
  if (addr) {
    if (!hit.live) offList();
    return { ty: ty, addr: addr };
  }
  /* 标量通道写过它（值本来就在 SSA 寄存器里的形参没地址，只有这一条路） */
  if (cb.wr[v.id]) {
    if (!ctx.stale) ctx.stale = `（${name} 当前行没快照到，是旧值）`;
    return snap();
  }
  throw exprErr(`${name} 当前行没有快照（这一行还没执行到它的声明）`);
}

/* X[i]：数组按 dims 走（多维数组一步跨的是「剩下那些维的乘积」个元素），
   指针按被指向类型的大小走。base 不能先衰减成指针，否则多维就退化成一步 4 字节。 */
function evalIdx(base, idxNode, ctx) {
  const k = rvalue(evalNode(idxNode, ctx));
  if (!isInt(k.ty)) throw exprErr('下标得是整数');
  const kn = typeof k.val === 'bigint' ? Number(k.val) : k.val;
  if (!Number.isInteger(kn)) throw exprErr('下标得是整数');
  if (base.ty.kind === 'arr') {
    const dims = base.ty.dims || [];
    if (!dims.length || dims[0] <= 0) throw exprErr(`${base.ty.name} 的每一维长度未知，算不了下标`);
    const stride = dimProd(dims.slice(1)) * base.ty.elem.bytes;
    if (!stride) throw exprErr(`${base.ty.name} 的元素宽度不认识，算不了下标`);
    const rest = dims.slice(1);
    const ty = rest.length
      ? { kind: 'arr', name: base.ty.elem.name + rest.map((d) => `[${d}]`).join(''), elem: base.ty.elem, dims: rest, bytes: base.ty.elem.bytes }
      : base.ty.elem;
    return { ty: ty, addr: base.addr + kn * stride };
  }
  if (isPtr(base.ty)) {
    const bytes = ptrStride(base.ty);
    if (!bytes) throw exprErr(`${base.ty.name} 指向的类型不知道宽度（void* / 结构体指针），算不了下标`);
    return { ty: base.ty.pt, addr: ((rvalue(base).val >>> 0) + kn * bytes) >>> 0 };
  }
  throw exprErr(`${base.ty.name} 不能取下标：[] 只用在数组和指针上`);
}

function evalUn(n, ctx) {
  if (n.o === '*') {
    const r = rvalue(evalNode(n.a, ctx));
    if (!isPtr(r.ty)) throw exprErr(`* 只能解引用指针，这里是 ${r.ty.name}`);
    if (!r.ty.pt || !r.ty.pt.bytes) throw exprErr(`${r.ty.name} 指向的类型不知道宽度（void* / 结构体指针），读不出值`);
    return { ty: r.ty.pt, addr: r.val >>> 0 };
  }
  if (n.o === '&') {
    const r = evalNode(n.a, ctx);
    if (r.addr === undefined) throw exprErr('& 只能取变量、数组元素这类“住在内存里”的东西的地址，临时算出来的值没有地址');
    return ptrRes(r.ty, r.addr);
  }
  const r = rvalue(evalNode(n.a, ctx));
  const x = r.val;
  if (n.o === '!') return cmpRes(!truthy(r));
  if (r.ty.kind === 'bool') {
    /* 一元 + - 作用在 bool 上按整型提升算 */
    const b = numTy(r.ty);
    return evalUnInt(n.o, toTyBig(b, x), b);
  }
  if (isFlt(r.ty)) {
    if (n.o === '-') return { ty: r.ty, val: -x };
    if (n.o === '+') return { ty: r.ty, val: x };
    throw exprErr(`${n.o} 用不了在 ${r.ty.name} 上`);
  }
  if (isInt(r.ty)) return evalUnInt(n.o, toTyBig(r.ty, x), r.ty);
  throw exprErr(`${n.o} 用不了在 ${r.ty.name} 上`);
}

function ptrRes(t, addr) {
  return {
    ty: { kind: 'ptr', bits: 32, signed: false, name: (t.name || '?') + '*', bytes: 4, pt: t },
    val: addr >>> 0,
  };
}

function evalUnInt(o, x, ty) {
  if (o === '-') return intRes(ty, toTyBig(ty, -x));
  if (o === '+') return intRes(ty, x);
  if (o === '~') return intRes(ty, toTyBig(ty, ~x));
  if (o === '!') return cmpRes(x === 0n);
  throw exprErr(`${o} 用不了在 ${ty.name} 上`);
}

function evalBin(n, ctx) {
  const o = n.o;
  if (o === '&&') return truthy(rvalue(evalNode(n.l, ctx))) ? cmpRes(truthy(rvalue(evalNode(n.r, ctx)))) : FALSE_RES;
  if (o === '||') return truthy(rvalue(evalNode(n.l, ctx))) ? TRUE_RES : cmpRes(truthy(rvalue(evalNode(n.r, ctx))));

  const L = decay(evalNode(n.l, ctx));
  const R = decay(evalNode(n.r, ctx));

  /* 指针参与的运算：p+i / p-i（步长是被指向类型的大小）、p-q（给元素个数差）、
     指针之间的比较。数组已经先 decay 成指针了，所以这里只看 isPtr。 */
  const lp = isPtr(L.ty);
  const rp = isPtr(R.ty);
  if (lp && isInt(R.ty) && (o === '+' || o === '-')) {
    return ptrOffset(L, R, o);
  }
  if (rp && isInt(L.ty) && (o === '+' || o === '-')) {
    return ptrOffset(R, L, o);
  }
  if (lp && rp) {
    const lv = rvalue(L).val >>> 0;
    const rv = rvalue(R).val >>> 0;
    if (o === '-') {
      const bytes = ptrStride(L.ty);
      if (!bytes) throw exprErr(`${L.ty.name} 指向的类型不知道宽度，算不出两个指针相差几个元素`);
      return intRes(E_INT, BigInt(Math.trunc((lv - rv) / bytes)));
    }
    return cmpRes(ptrCmp(o, lv, rv));
  }
  if (lp || rp) throw exprErr(`${lp ? L.ty.name : R.ty.name} 不能这样参与 ${o}：指针只能和整数加减、和同类型指针相减或比较`);

  const a = rvalue(L);
  const b = rvalue(R);
  const ty = arithTy(a.ty, b.ty);
  if (isFlt(ty)) {
    const x = Number(a.val), y = Number(b.val);
    switch (o) {
      case '+': return { ty: ty, val: x + y };
      case '-': return { ty: ty, val: x - y };
      case '*': return { ty: ty, val: x * y };
      case '/': return { ty: ty, val: y === 0 ? (x === 0 ? NaN : (x > 0 ? Infinity : -Infinity)) : x / y };
      case '<': return cmpRes(x < y);
      case '<=': return cmpRes(x <= y);
      case '>': return cmpRes(x > y);
      case '>=': return cmpRes(x >= y);
      case '==': return cmpRes(x === y);
      case '!=': return cmpRes(x !== y);
      default: throw exprErr(`${ty.name} 不能 ${o}：位运算和取余只能用整数`);
    }
  }
  const x = toTyBig(ty, a.val);
  const y = toTyBig(ty, b.val);
  switch (o) {
    case '+': return intRes(ty, toTyBig(ty, x + y));
    case '-': return intRes(ty, toTyBig(ty, x - y));
    case '*': return intRes(ty, toTyBig(ty, x * y));
    case '/':
      if (y === 0n) throw exprErr('除以 0：C++ 里这是未定义行为，观察窗不猜结果');
      return intRes(ty, toTyBig(ty, x / y));
    case '%':
      if (y === 0n) throw exprErr('对 0 取余：C++ 里这是未定义行为，观察窗不猜结果');
      return intRes(ty, toTyBig(ty, x % y));
    case '&': return intRes(ty, x & y);
    case '|': return intRes(ty, x | y);
    case '^': return intRes(ty, x ^ y);
    case '<<': case '>>': {
      const c = Number(y);
      if (!Number.isInteger(c) || c < 0 || c >= ty.bits) {
        throw exprErr(`移位数 ${y} 超出了 ${ty.name} 的位宽（${ty.bits}），C++ 里这是未定义行为`);
      }
      return intRes(ty, o === '<<' ? toTyBig(ty, x << BigInt(c)) : toTyBig(ty, x >> BigInt(c)));
    }
    case '<': return cmpRes(x < y);
    case '<=': return cmpRes(x <= y);
    case '>': return cmpRes(x > y);
    case '>=': return cmpRes(x >= y);
    case '==': return cmpRes(x === y);
    case '!=': return cmpRes(x !== y);
    default: throw exprErr(`不认识运算符 ${o}`);
  }
}

function ptrCmp(o, x, y) {
  if (o === '==') return x === y;
  if (o === '!=') return x !== y;
  if (o === '<') return x < y;
  if (o === '<=') return x <= y;
  if (o === '>') return x > y;
  if (o === '>=') return x >= y;
  throw exprErr(`指针不能 ${o}`);
}

function ptrStride(t) {
  const pt = t && t.pt;
  if (!pt) return 0;
  if (pt.kind === 'arr') return dimProd(pt.dims) * (pt.elem ? pt.elem.bytes : 0);
  return pt.bytes || 0;
}

/* 指针 ± 整数：结果还是同类型指针，走的格数就是那个整数 */
function ptrOffset(P, Q, o) {
  const pv = rvalue(P);
  const qv = rvalue(Q);
  const bytes = ptrStride(pv.ty);
  if (!bytes) throw exprErr(`${pv.ty.name} 指向的类型不知道宽度（void* / 结构体指针），加减不了`);
  const k = typeof qv.val === 'bigint' ? Number(qv.val) : qv.val;
  if (!Number.isInteger(k)) throw exprErr('指针的偏移得是整数');
  return { ty: pv.ty, val: ((pv.val >>> 0) + (o === '+' ? k : -k) * bytes) >>> 0 };
}

function evalCast(n, ctx) {
  const ty = n.ty;
  const r = rvalue(evalNode(n.a, ctx));
  const src = numTy(r.ty);
  if (ty.kind === 'bool') return { ty: ty, val: truthy(r) ? 1 : 0 };
  if (isPtr(ty)) {
    if (isPtr(src)) return { ty: Object.assign({}, ty, { pt: src.pt }), val: r.val >>> 0 };
    if (isInt(src)) return { ty: ty, val: Number(toTyBig(E_UINT, r.val)) >>> 0 };
    throw exprErr(`${r.ty.name} 转不成 ${ty.name}`);
  }
  if (isPtr(src)) {
    if (!isInt(ty)) throw exprErr('指针只能转成整数，比如 (int)(p - q)');
    return intRes(ty, toTyBig(ty, BigInt(r.val >>> 0)));
  }
  if (isFlt(ty)) {
    if (!isInt(src) && !isFlt(src)) throw exprErr(`${r.ty.name} 转不成 ${ty.name}`);
    return { ty: ty, val: typeof r.val === 'bigint' ? Number(r.val) : Number(r.val) };
  }
  if (isInt(ty)) {
    if (isFlt(src)) {
      if (!Number.isFinite(r.val)) throw exprErr(`${r.val} 转成 ${ty.name} 在 C++ 里是未定义行为，观察窗不猜结果`);
      return intRes(ty, toTyBig(ty, BigInt(Math.trunc(r.val))));
    }
    if (!isInt(src)) throw exprErr(`${r.ty.name} 转不成 ${ty.name}`);
    return intRes(ty, toTyBig(ty, r.val));
  }
  throw exprErr(`不支持转成 ${ty.name}`);
}

function evalNode(n, ctx) {
  switch (n.k) {
    case 'lit': return { ty: n.ty, val: n.v };
    case 'id': return varValue(n.n, ctx);
    case 'un': return evalUn(n, ctx);
    case 'bin': return evalBin(n, ctx);
    case 'cast': return evalCast(n, ctx);
    case 'idx': return evalIdx(evalNode(n.a, ctx), n.i, ctx);
    case 'tern': return truthy(rvalue(evalNode(n.c, ctx))) ? evalNode(n.a, ctx) : evalNode(n.b, ctx);
    default: throw exprErr('表达式里有不支持的写法');
  }
}

/* ------------------------------------------------------------------ */
/* 观察窗（watch）                                                     */
/*                                                                    */
/* 悬停一次只能看一个名字，可循环里的循环变量、每轮都在改的数组、正在   */
/* 比较的那对元素是要一直盯着的。这里收的是表达式：a[i]、a[10]、*p、    */
/* pp[0][1]、i<n-1 && a[j]>a[j+1] 都行，求值走上面那一节。名单记进      */
/* localStorage，每次调试会话复用。                                    */
/*                                                                    */
/* 停在某行时看到的是「这一行开始前」的状态 —— 和悬停完全同一套数据：   */
/* 标量取快照的 val，数组和指针按登记的栈槽地址直接读共享内存。         */
/*                                                                    */
/* 数组在面板里铺多少个，由这一列的实际宽度决定（见上面按列宽量着给那一 */
/* 节）：列宽了就多铺，挤不下靠省略号收尾，行高始终只占一行；量不出宽度 */
/* 时退回固定 8 个。悬停框不参与测量（它不占面板的高度），仍给前 50 个  */
/* 元素。                                                               */
/* ------------------------------------------------------------------ */
/* 名单按语言各存一份：C++ 的 a[i] 拿到 Python 那边全是「名字不在快照里」 */
function watchKey() { return localKey('cpp-playground.watch', lang); }
const WATCH_MAX = 24;
const WATCH_ARR_N = 8;
const WATCH_LEN = 80;

const watchEl = {
  list: $('wlist'), input: $('watch-add'), names: $('watch-names'), tip: $('watchtip'),
};
/* 表达式 -> {row, ty, val}；只在名单变化时重建 */
const watchRows = new Map();
const watchItems = loadWatch();

function loadWatch() {
  try {
    const raw = JSON.parse(localStorage.getItem(watchKey()) || '[]');
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const s of raw) {
      if (typeof s !== 'string') continue;
      const t = s.trim();
      if (t && t.length <= WATCH_LEN && out.indexOf(t) < 0) out.push(t);
      if (out.length >= WATCH_MAX) break;
    }
    return out;
  } catch (e) { return []; }
}
function saveWatch() {
  try { localStorage.setItem(watchKey(), JSON.stringify(watchItems)); } catch (e) {}
}

/* 名字 -> 变量描述。优先要「当前行快照过的那个」：同名有多个 alloca（两个
   for (int i...)、或者别的函数里的同名变量）时，只有这一行活着的那个才是
   人想看的东西。当前行没有它才退回全表按声明行挑最靠后的一个，那种情况下
   值八成是旧的，面板上会标出来。 */
function pickVar(name, line) {
  const live = liveVarsAt(line).get(name);
  if (live) return { v: live, live: true };
  let best = null;
  for (const v of dbg.vars || []) {
    if (v.name !== name) continue;
    if (!best || (v.line || 0) >= (best.line || 0)) best = v;
  }
  return best ? { v: best, live: false } : null;
}

/* 一行观察结果：表达式 -> {类型, 值, 状态}。
   会话没开始、式子写错、式子对的但这一行拿不到值，三种情况分开说 —— 面板上
   留着的永远是「这一行开始前」的状态，跟悬停同一个口径。
   px 是这一行「值」那一列现在有多少像素宽，数组/字符串按它决定铺多少个。 */
function watchValue(expr, line, px) {
  if (!dbg.active || !dbg.cb) return { ty: '—', val: '会话未开始', cls: 'idle' };
  if (lang.valueChannel === 'locals') return pyWatchValue(expr, line);
  const p = parseWatch(expr);
  if (p.err) return { ty: '—', val: p.err, cls: 'off' };
  const ctx = { line: line, cb: dbg.cb, stale: '' };
  try {
    const r = showRes(evalNode(p.ast, ctx), WATCH_ARR_N, STR_WATCH_N, px);
    return {
      ty: r.ty,
      val: r.text + ctx.stale,
      cls: ctx.stale ? 'stale' : '',
      fit: r.fit && !ctx.stale,
    };
  } catch (e) {
    if (e.expr) return { ty: '—', val: e.message, cls: 'off' };
    return { ty: '—', val: `求值出错：${e.message}`, cls: 'off' };
  }
}

function buildWatchRows() {
  for (const r of watchRows.values()) r.row.remove();
  watchRows.clear();
  for (const expr of watchItems) {
    const row = document.createElement('div');
    row.className = 'wrow';
    const n = document.createElement('span');
    n.className = 'wn'; n.textContent = expr;
    /* 表达式长了面板会截断（CSS 里 max-width + ellipsis），完整的一句挂在 title 上 */
    n.title = expr;
    const ty = document.createElement('span');
    ty.className = 'wt'; ty.textContent = '—';
    const val = document.createElement('span');
    val.className = 'wv'; val.textContent = '会话未开始';
    const x = document.createElement('button');
    x.className = 'wx mini secondary'; x.type = 'button';
    x.title = `不再观察 ${expr}`; x.textContent = '×';
    x.onclick = () => {
      watchItems.splice(watchItems.indexOf(expr), 1);
      saveWatch(); buildWatchRows(); refreshWatch();
    };
    row.append(n, ty, val, x);
    watchEl.list.appendChild(row);
    watchRows.set(expr, { row: row, ty: ty, val: val });
  }
  watchEl.list.classList.toggle('empty', !watchItems.length);
}

function refreshWatch() {
  if (!watchItems.length) return;
  const line = dbg.active && dbg.ctl ? dbg.ctl[DBG.S.LINE] : 0;
  /* 先读后写：值那一列还剩多宽是布局属性（clientWidth），读它会强制同步布局。
     一趟里把宽度全量完再去改文本，就只有一次布局；一行「写→读」交错着来，24 行
     就是 24 次重排，而这里是 50 ms 一轮询。 */
  const todo = [];
  for (const expr of watchItems) {
    const r = watchRows.get(expr);
    if (r) todo.push({ r: r, px: r.val.clientWidth, expr: expr });
  }
  if (!todo.length) return;
  measurer.use(todo[0].r.val);            /* 字体：观察窗整块都是 .wlist 那一条 */
  for (const it of todo) {
    const o = watchValue(it.expr, line, it.px);
    it.r.ty.textContent = o.ty;
    it.r.val.textContent = o.val;
    /* 值被宽度切掉时（连省略号都不够放），悬停至少能看到面板上这一整句 */
    it.r.val.title = o.val;
    it.r.row.className = 'wrow' + (o.cls ? ' ' + o.cls : '') + (o.fit ? ' fit1' : '');
  }
}

/* 加完把提示写清楚。还没做过插桩构建时别乱报「构建里没有它」——
   那时变量表压根还是空的。表达式里挑出标识符逐个查名字，查得到的个数
   直接报出来，省得「a[i]」和「a[q]]」这种混在一句提示里看不出区别。 */
function exprIdents(ast) {
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.k === 'id') { out.push(n.n); return; }
    for (const key of ['l', 'r', 'a', 'b', 'c', 'i']) if (n[key]) walk(n[key]);
  })(ast);
  return [...new Set(out)];
}

function watchHint(expr) {
  const all = dbg.vars || [];
  const set = new Set(all.map((v) => v.name));
  const names = exprIdents(parseWatch(expr).ast || {});
  const miss = names.filter((n) => !set.has(n));
  if (!all.length) {
    watchEl.tip.textContent = `已加入 ${expr}`;
    watchEl.tip.className = 'wnote';
    return;
  }
  watchEl.tip.textContent = names.length
    ? (miss.length ? `已加入 ${expr}（本次构建的变量表里还没有 ${miss.join('、')}）` : `已加入 ${expr}`)
    : `已加入 ${expr}`;
  watchEl.tip.className = 'wnote' + (names.length && miss.length ? ' warn' : ' ok');
}

function watchAdd() {
  const src = watchEl.input.value.trim();
  if (!src) return;
  if (src.length > WATCH_LEN) {
    watchEl.tip.textContent = `一条表达式最多 ${WATCH_LEN} 个字符`;
    watchEl.tip.className = 'wnote bad';
    return;
  }
  if (lang.valueChannel === 'locals') {
    /* 不走 C++ 那套词法器：它不认中文名字，而本期只收单个变量名，
       「是不是一个名字」isPlainName 已经判完了。 */
    if (!isPlainName(src)) {
      watchEl.tip.textContent = '这门语言的观察窗本期只收单个变量名，表达式（a[i]、x+1）还没做';
      watchEl.tip.className = 'wnote bad';
      return;
    }
  } else {
    const p = parseWatch(src);
    if (p.err) {
      watchEl.tip.textContent = `这句看不懂：${p.err}`;
      watchEl.tip.className = 'wnote bad';
      return;
    }
  }
  if (!watchItems.includes(src)) {
    if (watchItems.length >= WATCH_MAX) {
      watchEl.tip.textContent = `最多同时观察 ${WATCH_MAX} 个`;
      watchEl.tip.className = 'wnote bad';
      return;
    }
    watchItems.push(src);
    saveWatch(); buildWatchRows();
  }
  watchEl.input.value = '';
  refreshWatch();
  watchHint(src);
}

/* 补全名单：变量表要插桩构建完才有，所以每次产物回来刷一遍。
   只是名字清单，跨函数的同名会合并成一项。 */
function fillWatchNames(list) {
  const set = new Set();
  for (const v of list || dbg.vars || []) if (v.name) set.add(v.name);
  watchEl.names.replaceChildren(...[...set].sort().map((s) => {
    const o = document.createElement('option');
    o.value = s;
    return o;
  }));
}

/* 新会话开场：把上一轮冻在面板上的值收掉，别让人误读成这一轮的。
   会话结束（退出 / 跑完 / 停止）时不叫它 —— 最后一次的观测值留着看，
   跟热力层一个待遇。 */
function resetWatch() {
  for (const r of watchRows.values()) {
    r.ty.textContent = '—';
    r.val.textContent = '等待执行…';
    r.row.className = 'wrow idle';
  }
}

watchEl.input.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); watchAdd(); }
});
$('watch-push').onclick = watchAdd;
$('watch-clear').onclick = () => {
  watchItems.length = 0;
  saveWatch(); buildWatchRows();
  watchEl.tip.textContent = '已清空，名单存在浏览器里，下次调试还在';
  watchEl.tip.className = 'wnote';
};
buildWatchRows();

function dbgStopRun() {
  /* terminate 之后必须把等待中的 run 结掉，否则 await 永远不返回，busy 卡住。
     收 worker 和清看门狗都在 finishRun 里，和超时那条路共用一套。 */
  finishRun({ code: null, aborted: true, killed: false, ms: 0, memoryBytes: 0 });
}

function dbgQuit() {
  if (dbg.timer) clearInterval(dbg.timer);
  dbg.timer = 0;
  hideVarTip();
  /* 退场前补一次热力：dbgTick 最快也要 50 ms 后才跑，最后那几行的次数不能丢。
     注意这里只清「当前行」那层高亮，热力层要留着给人找热点，
     它由改源码 / 重开会话 / 手动清除三个入口撤掉。 */
  paintHeat();
  if (dbg.marker !== null && dbg.ctl) srcEditor.session.removeMarker(dbg.marker);
  dbgGutterMark(0, '');
  dbg.marker = null; dbg.markerRow = -1; dbg.markerCls = '';
  dbgSyncMarkers(); dbgClearMarkerDivs();
  dbg.lastLine = -1; dbg.lastParked = null;
  dbg.cb = null; dbg.ctl = null; dbg.bp = null; dbg.lines = null; dbg.active = false;
  dbg.vars = null; dbg.lineVars = null; dbg.pyLocals = null;
  dbgBar.classList.remove('on');
  dbgState.textContent = '—';
  srcEditor.setReadOnly(false);
  runBtn.disabled = false;
  debugBtn.disabled = !lang.debug;
}

async function startDebugSession(built) {
  const cb = DBG.newControlBlock();
  if (!cb) { say('建不起调试控制块（SharedArrayBuffer）：' + (sabMissing() || '原因不明'), 'err'); return; }
  const lines = built.lines;
  cb.wr.fill(0);
  dbg.cb = cb; dbg.ctl = cb.ctl; dbg.bp = cb.bp; dbg.lines = lines;
  dbg.vars = built.vars || [];
  dbg.lineVars = built.lineVars || {};
  /* 上一轮的内存先收掉：新会话的 wasm 还没实例化，这时候拿旧 DataView 求值
     会把「上一次运行留下的字节」当成这一轮的值报出来。运行 Worker 实例化好
     新模块后会把它的 SharedArrayBuffer 递过来（每次 park 前还会再对一遍）。 */
  setGuestMemory(null);
  dbg.pyLocals = null;
  /* 新会话从空热力开始：上一轮的次数留在旧控制块里，行号却是按旧源码编的，
     混着画会指错热点。heat 是新建 SAB 上的一块，天生全 0，不用清。 */
  dbg.heatRows = lines;
  dbg.heatTick = 0;
  clearHeat();
  fillWatchNames();
  resetWatch();
  dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
  Atomics.store(dbg.ctl, DBG.S.MODE, DBG.MODE.RUN);
  Atomics.store(dbg.ctl, DBG.S.STATE, DBG.STATE.EXEC);
  syncBpTable();

  dbg.active = true;
  bgm.lastDigit = -1;      /* 新会话第一行一定要出声，别被上一段的「同音不重复」挡掉 */
  dbgBar.classList.add('on');
  srcEditor.setReadOnly(true);
  runBtn.disabled = true;
  debugBtn.disabled = false;      /* 再点一次 = 退出调试 */
  stopBtn.disabled = false;
  setDot('busy');
  /* 变量表只有做过静态变量名单的那门语言才有（C++ 从 DWARF 拿），Python 的变量是
     停住时从帧里现取的，构建阶段给不出个数，这句话就不能报「0 个可查变量」。 */
  say(`调试构建完成，${lines.length} 个行桩${dbg.vars.length ? `、${dbg.vars.length} 个可查变量` : ''}，已启动，正在跟踪执行行…`, 'ok');
  newDecodeSession();
  /* 用 setInterval 而不是 requestAnimationFrame：后台标签页里 rAF 会停摆，
     切去看输出再切回来时高亮就冻住了；50ms 一帧对手工单步足够跟手。 */
  dbg.timer = setInterval(dbgTick, 50);

  /* 调试会话没有运行超时（第 3 个参数只在非调试时用到，这里给 0 占位） */
  const r = await runProgram(built.artifact, stdinEl.value, 0, cb.sab);
  closeDecodeSession();
  if (dbg.timer) clearInterval(dbg.timer);
  dbg.timer = 0;

  /* 调试没有超时，所以「停止 / 退出调试」是结束会话的正常出口：灯要收回中性，
     不能继续闪「运行中」，看着像程序还在跑。
     dbgQuit 里会补最后一次 paintHeat，热力层留在编辑器上，所以先收尾再报数。 */
  /* 「最后一站」按控制块里的 LINE 报：那是 worker 写的最后一个行桩，比 50 ms 轮询
     采到的 dbg.lastLine 准（全速档常常只采到跑到一半的行号，甚至一次都没采到）。
     LINE 为 0 说明一个行桩都没触发（main 之前就 trap 了），退回采样值。 */
  const last = (cb.ctl[DBG.S.LINE] | 0) || (dbg.lastLine > 0 ? dbg.lastLine : 0);
  if (r.aborted) { setDot(''); dbgQuit(); say('调试已结束' + heatSummary(), 'warn'); return; }
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
  dbgQuit();
  say((r.note ? '运行出错：' + r.note : `程序结束（第 ${last > 0 ? last : '—'} 行是最后一站）`) + heatSummary(),
      r.code === 0 ? 'ok' : 'err');
}

async function doDebug() {
  if (busy) return;
  if (dbg.active) { dbgStopRun(); dbgQuit(); return; }
  /* 按钮本身是灰的，但 Ctrl+Shift+Enter 绕得过 disabled，这里再挡一道 */
  if (!lang.debug) { say(lang.debugWhy, 'warn'); return; }
  if (!dbgSupported()) {
    setDot('bad');
    say('调试需要 SharedArrayBuffer：' + (sabMissing() || '条件看着都满足，可能被浏览器扩展拦了'), 'err');
    return;
  }
  busy = true;
  langSel.disabled = true;
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
      if (err.phase) {
        metric('compile', (err.ms || 0) + ' ms', 'err');
        metric('exit', err.exitCode === undefined ? '—' : err.exitCode, 'err');
        say(`${lang.phaseText[err.phase] || err.phase}失败（调试构建）`, 'err');
      } else if (err.jsError) {
        metric('compile', '异常', 'err');
        say('构建过程内部错误', 'err');
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
      say('这个源文件里没有可执行的用户代码行（空文件、只有注释，或者全在头文件/库里？）', 'err');
      return;
    }
    await startDebugSession(built);
  } finally {
    clearWatchdog();
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    langSel.disabled = false;
    debugBtn.disabled = !lang.debug;
    updateSrcLen();
  }
}

/* ------------------------------------------------------------------ */
/* UI 绑定                                                            */
/* ------------------------------------------------------------------ */
function fillExamples() {
  const sel = $('examples');
  sel.textContent = '';
  /* 用例多了以后按分组挂 optgroup，下拉框里能直接看到课程章节；
     分组顺序按「第一次出现」排，所以示例表的键序就是展示顺序。 */
  const groups = new Map();
  for (const name of Object.keys(lang.examples)) {
    const g = lang.examples[name].group || '其他';
    if (!groups.has(g)) {
      const og = document.createElement('optgroup');
      og.label = g;
      groups.set(g, og);
      sel.appendChild(og);
    }
    const o = document.createElement('option');
    o.textContent = name;
    groups.get(g).appendChild(o);
  }
  sel.onchange = () => {
    const e = lang.examples[sel.value];
    setSource(e.code);
    stdinEl.value = e.stdin;
    saveLocal();
  };
}

function saveLocal() {
  try {
    localStorage.setItem(localKey('cpp-playground.src', lang), srcEditor.getValue());
    localStorage.setItem(localKey('cpp-playground.stdin', lang), stdinEl.value);
  } catch (e) { /* 忽略 */ }
}

/* 进页面 / 换语言时恢复这门语言上次留下的源码；没存过就用示例表的第一个 */
function restoreLocal() {
  let s = null, i = null;
  try {
    s = localStorage.getItem(localKey('cpp-playground.src', lang));
    i = localStorage.getItem(localKey('cpp-playground.stdin', lang));
  } catch (e) { /* 隐私模式读不到就算了 */ }
  const first = Object.keys(lang.examples)[0];
  $('examples').value = first;
  if (s) {
    setSource(s);
    if (i !== null) stdinEl.value = i;
    return;
  }
  setSource(lang.examples[first].code);
  stdinEl.value = lang.examples[first].stdin;
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
$('heat-clear').onclick = clearHeat;
dbgSpeed.onchange = () => {
  if (dbg.ctl) dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
};

/* ------------------------------------------------------------------ */
/* 语言切换                                                            */
/*                                                                    */
/* 页面上所有随语言变的东西都在这里刷一遍：标题、按钮文案、右栏小标题、 */
/* 工具条上哪些字段露出来、示例表、本地存储、观察名单、常驻 worker。    */
/* 登记表（langs.js）之外再加一门语言，这一段不用动。                   */
/* ------------------------------------------------------------------ */
const OPT_FIELDS = ['std', 'opt', 'extra', 'stack'];

function applyLangChrome() {
  const link = $('titlelink');
  link.textContent = lang.title;
  link.title = lang.titleTip;
  document.title = lang.docTitle;
  runBtn.textContent = lang.runLabel;
  debugBtn.textContent = lang.debugLabel;
  debugBtn.disabled = !lang.debug;
  /* 按钮能点但只有一半能力（有行桩、没值通道）时，title 照样要说清缺的是哪一块 */
  debugBtn.title = lang.debug && lang.values ? '' : lang.debugWhy;
  reloadBtn.textContent = lang.reloadLabel;
  $('srccap').textContent = `源代码 ${lang.filename}（Ctrl+Enter 运行）`;
  $('stdinhint').textContent = lang.stdinHint;
  $('lab-compile').textContent = lang.buildMetric;
  $('lab-mem').textContent = lang.memLabel;
  outEl.placeholder = `点「${lang.runLabel}」，或按 Ctrl+Enter`;
  for (const id of OPT_FIELDS) $('f-' + id).hidden = lang.fields.indexOf(id) < 0;
  /* 调试专属的那几样：没有单步调试的语言，留着也只是占地方。
     观察窗再多看一格 values：值通道还没做的语言里它一栏算不出东西，与其整片
     显示「会话未开始」，不如收起来，缺什么写在按钮 title 里。 */
  $('f-dbspeed').hidden = !lang.debug;
  $('f-bgm').hidden = !lang.debug;
  $('heatbar').hidden = !lang.debug;
  $('watchbox').hidden = !(lang.debug && lang.values);
  /* 随语言换的文案：页脚「已知限制」和调试条那段悬停说明都按 data-lang 分份 */
  for (const el of document.querySelectorAll('[data-lang]')) {
    el.hidden = el.dataset.lang !== lang.id;
  }
  /* Ace 1.45 的 Editor 上没有 setMode，换语法要动 session */
  srcEditor.session.setMode('ace/mode/' + lang.aceKey);
}

function setLang(id) {
  const next = langById(id);
  if (next.id === lang.id) return;
  saveLocal();                       /* 先把上一门语言的源码和 stdin 存好 */
  lang = next;
  try { localStorage.setItem(LANG_KEY, lang.id); } catch (e) { /* 忽略 */ }
  langSel.value = lang.id;
  applyLangChrome();
  clearOutput();
  resetMetrics();
  fillExamples();
  restoreLocal();
  /* 观察名单也是按语言存的，换一门就换一份 */
  watchItems.length = 0;
  for (const s of loadWatch()) watchItems.push(s);
  buildWatchRows();
  startCompileWorker();
}

for (const id of LANG_ORDER) {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = LANGS[id].label;
  langSel.appendChild(o);
}
langSel.value = lang.id;
langSel.onchange = () => setLang(langSel.value);

/* ------------------------------------------------------------------ */
applyLangChrome();
fillExamples();
restoreLocal();
srcEditor.focus();
startCompileWorker();
