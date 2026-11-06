/*
 * dbgproto.js — 单步调试控制块的共享布局
 *
 * 同一块 SharedArrayBuffer 由主线程（index.html 用 script 标签引入）和
 * run.worker.js（importScripts 引入）共同读写，所以下标和取值只能有一份定义。
 *
 * 握手协议（不会丢唤醒）：
 *   worker 停在某行时  Atomics.store(STATE, PARK)  然后 while (load(STATE)===PARK) wait
 *   主线程要放行时     Atomics.store(STATE, GO)    然后 notify
 *   如果主线程在 worker 进入 wait 之前就已经写了 GO，worker 的 wait 会因为
 *   期望值不相等立刻返回，循环重新判定后直接往下走。
 *
 * 六段数据的用途：
 *   ctl  10 个控制槽（模式、状态、当前行、停住原因、行桩计数、降速时长、耗时统计）
 *   bp   断点表，下标 = 源码行号，1 = 有断点；主线程写，worker 每行读一次
 *   val  变量值表，每个变量占两个 int32（低 32 位、高 32 位），worker 每行刷新
 *   wr   变量值有效性标记，0 = 这个变量的槽还没被写过（本行才声明 / 分支没走到）
 *   heat 每行执行次数，下标 = 源码行号；worker 每触发一个行桩加一，主线程只读，
 *        拿它算「热力背景」的深浅。计数必须在 worker 侧累加：主线程是 50 ms 轮询
 *        一次当前行，全速跑时两次轮询之间早就跨过几千行，采样数出来的是假数。
 *   arr  变量地址表，每个变量固定 ARR_W 个 int32：[0] 首元素／栈槽地址、
 *        [1] 元素字节数、[2] 元素个数（标量是 1，count=0 表示这个槽还没写过）。
 *        元素本身不在这里：调试构建的用户模块链的是 --shared-memory，主线程拿着
 *        那块共享内存直接按 addr 读，所以悬停的 50 个值、观察窗里的 a[i] 和 &x
 *        走的是同一份内存，不存在「缓冲区里那份拷贝过期」这种第二条真相。
 *
 * val/wr/arr 的下标是插桩时分配的变量 id，由 compile.worker 随产物一起交给主线程，
 * 两边用的是同一份 instrumentIR 生成的表。
 */
(function (global) {
  'use strict';

  const HDR = 10;             /* 头部整型槽位数 */
  const MAX_LINE = 20000;     /* 断点表覆盖的最大源码行号 */
  const MAX_VAR = 512;        /* 一次调试构建最多跟踪多少个局部变量 */

  const S = {
    MODE: 0,        /* 主线程写：0=运行 1=单步 2=暂停 */
    STATE: 1,       /* worker 写 PARK/EXEC，主线程写 GO */
    LINE: 2,        /* worker 写：当前执行到的源码行 */
    REASON: 3,      /* worker 写：停住的原因 */
    EVENTS: 4,      /* worker 写：已经触发过多少个行桩 */
    DELAY_US: 5,    /* 主线程写：每行额外停留的微秒 */
    FUTEX: 6,       /* 只用于“带超时的 wait”做降速，没人写它 */
    PARKED_MS: 7,   /* worker 累加：停在某行等人放行的总时长 */
    SLOW_MS: 8,     /* worker 累加：降速真正睡掉的总时长 */
    RESERVED: 9,
  };

  const MODE = { RUN: 0, STEP: 1, PAUSE: 2 };
  const STATE = { EXEC: 0, PARK: 1, GO: 2 };
  const REASON = { NONE: 0, BP: 1, STEP: 2, PAUSE: 3 };

  /* 地址表：每个变量三个 int32 —— 首元素地址、元素字节数、元素个数。
     元素本身待在被共享的用户线性内存里，由主线程按地址直接读。 */
  const ARR_W = 3;

  /* 各段的整型下标起点 */
  const HEAT0 = HDR + MAX_LINE + 1 + MAX_VAR * 3;
  const AT = {
    BP: HDR,
    VAL: HDR + MAX_LINE + 1,
    WR: HDR + MAX_LINE + 1 + MAX_VAR * 2,
    HEAT: HEAT0,
    ARR: HEAT0 + MAX_LINE + 1,
    END: HEAT0 + MAX_LINE + 1 + MAX_VAR * ARR_W,
  };

  function views(sab) {
    if (sab.byteLength < AT.END * 4) {
      throw new Error('调试控制块大小不符（js/dbgproto.js 与插桩表版本不一致），请刷新页面');
    }
    return {
      sab: sab,
      ctl: new Int32Array(sab, 0, HDR),
      bp: new Int32Array(sab, AT.BP * 4, MAX_LINE + 1),
      val: new Int32Array(sab, AT.VAL * 4, MAX_VAR * 2),
      wr: new Int32Array(sab, AT.WR * 4, MAX_VAR),
      heat: new Int32Array(sab, AT.HEAT * 4, MAX_LINE + 1),
      arr: new Int32Array(sab, AT.ARR * 4, MAX_VAR * ARR_W),
    };
  }

  /* 主线程侧：新建一次调试会话的控制块 */
  function newControlBlock() {
    if (typeof SharedArrayBuffer === 'undefined') return null;
    const v = views(new SharedArrayBuffer(AT.END * 4));
    v.ctl[S.MODE] = MODE.RUN;
    v.ctl[S.STATE] = STATE.EXEC;
    return v;
  }

  /* worker 侧：把传过来的 SharedArrayBuffer 还原成同样的视图 */
  function attachControlBlock(sab) {
    const v = views(sab);
    return {
      sab: v.sab, ctl: v.ctl, bp: v.bp, val: v.val, wr: v.wr, heat: v.heat, arr: v.arr,
      S: S, MODE: MODE, STATE: STATE, REASON: REASON,
      MAX_VAR: MAX_VAR, MAX_LINE: MAX_LINE, ARR_W: ARR_W,
    };
  }

  global.DBG = {
    HDR: HDR, MAX_LINE: MAX_LINE, MAX_VAR: MAX_VAR, AT: AT,
    ARR_W: ARR_W,
    S: S, MODE: MODE, STATE: STATE, REASON: REASON,
    newControlBlock: newControlBlock, attachControlBlock: attachControlBlock,
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
