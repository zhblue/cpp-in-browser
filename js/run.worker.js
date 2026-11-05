/*
 * run.worker.js — 一次性运行 Worker
 * 每次「运行」都新建一个，超时就直接 terminate()，所以死循环不会拖垮编译状态。
 * 用户程序的 WASI 环境由 memfs.wasm（345KB，浏览器会缓存）提供。
 *
 * 调试会话时主线程会传一块 SharedArrayBuffer（布局见 dbgproto.js）。插桩过的
 * wasm 每执行一行源码就调用一次 env.__pg_trace(行号)，本文件里这个函数决定
 * “记一行 / 睡一会儿降速 / 停在这一行等主线程放行”。
 */
'use strict';
importScripts('wasmclang.js', 'dbgproto.js');

/* 行桩的宿主实现。放在闭包里，避免每次调用都重新取常量。 */
function makeTracer(c) {
  const S = DBG.S, MODE = DBG.MODE, STATE = DBG.STATE, REASON = DBG.REASON;
  const ctl = c.ctl, bp = c.bp;
  let hits = 0;
  let debtUs = 0;

  /* 降速：每行欠 d 微秒。攒够 1 毫秒才真睡（Atomics.wait 带超时，睡在
     FUTEX 这个没人写的槽上），所以 10^-6 秒这种亚毫秒档位是靠累计平均出来
     的，而不是空转烧 CPU。
     一次最多睡 50ms：片小一点，用户按「暂停」时下一行很快就能停住，不用先把
     一整秒的降速睡满。记账按片走，先加计划的片长、醒来再把实际多睡的那点补上，
     所以 SLOW_MS 始终不小于真正睡着的时长；主线程结束时读它，把这段从「运行耗时」
     里扣掉。 */
  function pace() {
    const d = Atomics.load(ctl, S.DELAY_US);
    if (d <= 0) return;
    debtUs += d;
    while (debtUs >= 1000) {
      /* 用户按了暂停就别继续睡了，让下一行立刻停住 */
      if (Atomics.load(ctl, S.MODE) === MODE.PAUSE) return;
      const ms = Math.min(50, Math.floor(debtUs / 1000));
      debtUs -= ms * 1000;
      Atomics.add(ctl, S.SLOW_MS, ms);
      const s0 = performance.now();
      Atomics.wait(ctl, S.FUTEX, 0, ms);
      const over = Math.round(performance.now() - s0) - ms;
      if (over > 0) Atomics.add(ctl, S.SLOW_MS, over);
    }
  }

  return function trace(line) {
    ctl[S.LINE] = line;
    hits = (hits + 1) | 0;
    ctl[S.EVENTS] = hits;

    const mode = Atomics.load(ctl, S.MODE);
    const hit = line >= 0 && line <= DBG.MAX_LINE && bp[line] === 1;
    if (mode === MODE.PAUSE || mode === MODE.STEP || hit) {
      Atomics.store(ctl, S.REASON,
        hit ? REASON.BP : (mode === MODE.STEP ? REASON.STEP : REASON.PAUSE));
      Atomics.store(ctl, S.STATE, STATE.PARK);
      const p0 = performance.now();
      while (Atomics.load(ctl, S.STATE) === STATE.PARK) {
        Atomics.wait(ctl, S.STATE, STATE.PARK);
      }
      /* 停在这一行上等人放行多久：主线程报「运行耗时」时要把它扣掉，
         否则想一步的时间全算进程序的运行时间。 */
      Atomics.add(ctl, S.PARKED_MS, Math.round(performance.now() - p0));
      Atomics.store(ctl, S.STATE, STATE.EXEC);
      Atomics.store(ctl, S.REASON, REASON.NONE);
      return;
    }
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

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type !== 'run') return;
  const t0 = performance.now();

  let exit = { code: 127, memoryBytes: 0, note: 'startup-failed' };

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

    const module = await WebAssembly.compile(new Uint8Array(m.wasm));

    /* 调试构建的模块会导入 env.__pg_trace 和 env.__pg_var；没给控制块就退化成
       空桩，至少程序还能跑完，不会变成一个看不懂的 LinkError。 */
    let extra = null;
    if (m.ctl) {
      const c = DBG.attachControlBlock(m.ctl);
      extra = { env: { __pg_trace: makeTracer(c), __pg_var: makeVarWriter(c) } };
      Atomics.store(c.ctl, DBG.S.STATE, DBG.STATE.EXEC);
    } else {
      const names = new Set(WebAssembly.Module.imports(module)
        .filter((i) => i.module === 'env')
        .map((i) => i.name));
      if (names.has('__pg_trace') || names.has('__pg_var')) {
        extra = { env: { __pg_trace: () => {}, __pg_var: () => {} } };
      }
    }

    const app = extra
      ? new WasmClang.WasiApp(module, memfs, m.name || 'main.wasm', extra)
      : new WasmClang.WasiApp(module, memfs, m.name || 'main.wasm');
    await app.ready;
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

  postMessage({
    type: 'exit',
    code: exit.code,
    ms: Math.round(performance.now() - t0),
    memoryBytes: exit.memoryBytes || 0,
    note: exit.note || null,
  });
};
