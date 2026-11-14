/*
 * run.worker.js — 一次性运行 Worker
 * 每次「运行」都新建一个，超时就直接 terminate()，所以死循环不会拖垮编译状态。
 * 用户程序的 WASI 环境由 memfs.wasm（345KB，浏览器会缓存）提供。
 *
 * 调试会话时主线程会传一块 SharedArrayBuffer（布局见 dbgproto.js）。插桩过的
 * wasm 每执行一行源码就调用一次 env.__pg_trace(行号)，本文件里这个函数决定
 * “记一行 / 睡一会儿降速 / 停在这一行等主线程放行”。
 *
 * GoC 画图（见 js/goc.js）走的是同一块产物上的另一组宿主导入：__goc_* 调用在
 * 这里攒成一批批绘图指令递给主线程的 canvas，动画的睡眠也睡在这里，所以主线程
 * 照常刷新、照常能按暂停。
 */
'use strict';
importScripts('wasmclang.js', 'dbgproto.js', 'goc.js');

/* 行桩的宿主实现。放在闭包里，避免每次调用都重新取常量。
   判定、降速、停走握手都在 dbgproto.js 的共享核心里（Python 的 settrace 桩走的
   是同一套），这里只负责 wasm 每行过来时报的那三件事：当前行、事件数、热力累加。 */
function makeTracer(c, onPark) {
  const S = DBG.S, MAXL = DBG.MAX_LINE;
  const pace = DBG.makePacer(c);
  const park = DBG.makeParker(c, onPark);
  const ctl = c.ctl, heat = c.heat;
  let hits = 0;

  return function trace(line) {
    ctl[S.LINE] = line;
    hits = (hits + 1) | 0;
    ctl[S.EVENTS] = hits;
    /* 每行执行次数：热力背景的原料。这里用普通自增而不是 Atomics.add —— 这一格
       只有 worker 写、主线程只读（跟 ctl[S.LINE] 一个待遇），不存在丢更新；
       省下的是一次原子操作，全速档每行都要走这里。 */
    if (line >= 0 && line <= MAXL) heat[line] = (heat[line] + 1) | 0;

    const reason = DBG.stopReason(c, line);
    if (reason) { park(line, reason); return; }
    pace();
  };
}

/* 变量快照的宿主实现：每个变量两个 int32（低位、高位）＋一个「写过没有」标记。
   插桩把调用放在 __pg_trace 之前，所以停在某行时这里已经是这一行开始前的值。
   非原子写：主线程只在 worker 停住时才读，读到的一定是静止的数据。 */
function makeVarWriter(c) {
  const val = c.val, wr = c.wr, max = DBG.MAX_VAR;
  return function varSnap(id, lo, hi) {
    if (id < 0 || id >= max) return;
    val[id * 2] = lo;
    val[id * 2 + 1] = hi;
    wr[id] = 1;
  };
}

/* 数组变量的地址登记：arr 段每个变量固定 ARR_W 个 int32 —— [0]=首元素地址、
   [1]=元素字节数、[2]=元素个数，count=0 就是「这个槽还没写过」。

   这里不再搬元素了。以前是从 wasm 线性内存 memcpy 前 50 个元素进控制块，因为
   那时候主线程拿不到用户内存；现在调试构建链的是 --shared-memory，主线程手里
   就有同一块内存，按地址读就行。少一份拷贝，也少一份会过期的真相：悬停展开、
   观察窗的 a[i]、表达式里的 *p，读的都是内存本身，所以三个地方永远不会打架。
   一次调用三格普通写，代价小到不用再按「这一行会不会停住」设放行条件。 */
function makeAddrRec(c) {
  const arr = c.arr;
  const max = DBG.MAX_VAR, W = DBG.ARR_W;
  return function arrAddr(id, addr, bytes, count) {
    if (id < 0 || id >= max) return;
    const base = id * W;
    arr[base] = addr;
    arr[base + 1] = bytes;
    arr[base + 2] = count;
  };
}

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type !== 'run') return;
  const t0 = performance.now();

  let exit = { code: 127, memoryBytes: 0, note: 'startup-failed' };
  let flushGoc = null;

  try {
    const memfs = new WasmClang.MemFS({
      compileStreaming: async () => {
        const url = m.base + 'memfs.wasm';
        let r;
        try {
          r = await fetch(url);
        } catch (e) {
          throw new Error(`memfs.wasm 请求没完成（${url}）：${e.name}: ${e.message}`);
        }
        if (!r.ok) throw new Error(`memfs.wasm 取不到（HTTP ${r.status} ${r.statusText || ''}，${url}）`);
        return await WebAssembly.compile(await r.arrayBuffer());
      },
      hostWrite: (bytes) => postMessage({ type: 'write', bytes: bytes }, [bytes.buffer]),
      memfsFilename: 'memfs.wasm',
    });
    await memfs.ready;
    memfs.setStdin(m.stdin ? new Uint8Array(m.stdin) : new Uint8Array(0));

    const module = await WebAssembly.compile(new Uint8Array(m.artifact));

    /* 用户内存要等 WasiApp 实例化完才拿得到，所以下面传的都是取值器/回调，
       不是内存本身。共享内存 grow 之后 buffer 会换成新的 SAB，主线程要的是
       「当前那块」，所以停住时按对象身份比一次，变了就再递一次。 */
    let app = null;
    let sentSab = null;
    const getMem = () => (app ? app.mem : null);
    const postSab = () => {
      const mem = getMem();
      if (!mem || mem.buffer === sentSab) return;
      sentSab = mem.buffer;
      postMessage({ type: 'guest', sab: sentSab });
    };
    /* 每次停住（行桩命中断点/单步，或动画切片里被暂停）之前要递出去的东西有两样：
       当前这块用户内存，和攒在 GOC 缓冲区里还没发的绘图指令。后者是「调试时画面跟
       不上行号」的根因 —— 行桩的 park 在下一行的开头，绘图指令是上一行产生的，
       不 flush 就得等到下一次睡觉或程序结束才看得见，而 `speed(10)` 的程序根本不睡。
       flushGoc 这时候还没赋值（goc 在下面才建），所以只在调用时读它。 */
    const parkFlush = () => {
      postSab();
      if (flushGoc) flushGoc();
    };

    /* 要挂哪些宿主导入，看产物自己声明了什么，不看源码 —— 编译和运行之间只传字节。
       调试构建导入 env.__pg_*，include 过 goc.h/logo.h 的导入 env.__goc_*，
       两组可能同时出现（一边单步一边画图）。 */
    const envNames = [];
    for (const i of WebAssembly.Module.imports(module)) {
      if (i.module === 'env') envNames.push(i.name);
    }
    const has = (n) => envNames.indexOf(n) >= 0;
    const hasPg = has('__pg_trace') || has('__pg_var') || has('__pg_addr');
    let hasGoc = false;
    for (const n of envNames) if (n.indexOf('__goc_') === 0) { hasGoc = true; break; }

    let c = null;
    if (m.ctl) {
      c = DBG.attachControlBlock(m.ctl);
      Atomics.store(c.ctl, DBG.S.STATE, DBG.STATE.EXEC);
    }

    /* 一笔一笔走动画的时候也要听得见用户：makeEnv 拿的是同一份调试控制块，
       每睡醒一片问一次「是不是按下了暂停」。断点和单步不在这里判 —— 那是行桩
       在行边界干的活，切片里重复判会因为 MODE/断点表一直保持而反复停住同一行。 */
    const goc = (hasGoc && typeof GOC !== 'undefined')
      ? GOC.makeEnv({
        mem: getMem,
        post: (ops) => postMessage({ type: 'goc', ops }),
        ctl: m.goc ? new Int32Array(m.goc) : null,
        dbg: c,
        onPark: parkFlush,
      })
      : null;

    const env = {};
    if (hasPg) {
      /* 调试构建但没给控制块：退化成空桩，至少程序还能跑完，
         不会变成一个看不懂的 LinkError。 */
      Object.assign(env, c
        ? {
          __pg_trace: makeTracer(c, parkFlush), __pg_var: makeVarWriter(c),
          __pg_addr: makeAddrRec(c),
        }
        : { __pg_trace: () => {}, __pg_var: () => {}, __pg_addr: () => {} });
    }
    if (goc) Object.assign(env, goc.env);
    if (goc) flushGoc = goc.flush;
    const extra = (hasPg || goc) ? { env: env } : null;

    app = extra
      ? new WasmClang.WasiApp(module, memfs, m.name || 'main.wasm', extra)
      : new WasmClang.WasiApp(module, memfs, m.name || 'main.wasm');
    await app.ready;
    /* 先递一次内存：实例化时 wasm-ld 可能已经按 --max-memory 之外的初值 grow 过，
       主线程第一次轮询到停住之前就该拿到当前这块。 */
    if (m.ctl) postSab();
    exit = await app.start();
    exit.memoryBytes = app.exports.memory.buffer.byteLength;
    exit.note = exit.error ? String((exit.error.message || exit.error)) : null;
  } catch (e) {
    exit = {
      code: 127,
      memoryBytes: 0,
      note: String((e && e.message) || e),
    };
  }

  /* 攒在缓冲区里没发的最后几条指令要补上，否则程序末尾那几笔（往往是 pen.text
     或者最后一条 fd）永远看不到 —— 主线程收到 exit 就把这次运行收尾了。 */
  if (flushGoc) {
    try { flushGoc(); } catch (e) { /* 已经要退出了，别再制造第二条错误 */ }
  }

  postMessage({
    type: 'exit',
    code: exit.code,
    ms: Math.round(performance.now() - t0),
    memoryBytes: exit.memoryBytes || 0,
    note: exit.note || null,
  });
};
