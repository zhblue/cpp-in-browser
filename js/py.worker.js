/*
 * py.worker.js — 常驻的 Python Worker：语法检查和运行用的是同一个解释器
 *
 * 和 C++ 那对 worker 的分工正好相反：clang 是「编译重、运行轻」，所以编译常驻、
 * 运行一次性；Pyodide 重的是解释器本身（装一次一两秒、十几 MB），每次运行都重
 * 装一份纯属浪费。所以这里一个 worker 从头用到尾，超时/停止时由主线程 terminate
 * 再重新 init（见 langs.js 的 singleWorker）。
 *
 * 产物不是 wasm，是 marshal.dumps 出来的字节码：先 compile() 做语法检查（诊断按
 * clang 的样式写进输出框），过了才把 code object 序列化交给页面；页面点「运行」
 * 时原样递回来，marshal.loads + exec。于是「编译一次、运行多次」和 C++ 走同一条
 * 路，主流程不用为 Python 分叉。
 *
 * 协议与语言无关（见 langs.js 顶部）：init / compile / run →
 * progress / ready / result / write / exit / error。
 */
'use strict';

importScripts('dbgproto.js');

let py = null;
let initing = null;

const ART = '/tmp/_pg_artifact.bin';
const DIAG = '/tmp/_pg_diag.txt';

function postText(text) {
  if (!text) return;
  const bytes = new TextEncoder().encode(text);
  postMessage({ type: 'write', bytes: bytes }, [bytes.buffer]);
}

/* 输出按字节攒，攒到换行或 8 KB 才发一次 postMessage —— 逐字节发会把主线程淹掉，
   等到程序结束再发又看不见过程。stdout 和 stderr 共用一个缓冲区，两边交错的顺序
   才是真的顺序（traceback 走 stderr，print 走 stdout）。
   不在这里解码 UTF-8：主线程本来就有一个流式解码会话，多字节字符被切在两块之间
   也由它接上，和 C++ 那条路完全一样。 */
function makeOut() {
  let buf = new Uint8Array(4096);
  let n = 0;
  function flush() {
    if (!n) return;
    const bytes = buf.slice(0, n);
    n = 0;
    postMessage({ type: 'write', bytes: bytes }, [bytes.buffer]);
  }
  return {
    byte(b) {
      if (n === buf.length) {
        const bigger = new Uint8Array(buf.length * 2);
        bigger.set(buf);
        buf = bigger;
      }
      buf[n++] = b;
      if (b === 10 || n >= 8192) flush();
    },
    flush: flush,
  };
}

/* 诊断写成 clang 的样子：文件:行:列: error: 说明，下面跟原行和插入符。
   Python 3.13 的 SyntaxError 还给了 end_offset，所以范围用 ^~~~ 画出来，
   和 clang 标 range 的手法一致。IndentationError / TabError 把类名也带上，
   光看 msg（「unexpected indent」）不知道是哪一类错。 */
const BOOTSTRAP = `
import sys as _sys, marshal as _marshal, traceback as _traceback, builtins as _builtins

def _pg_diag(e, name):
    kind = type(e).__name__
    msg = getattr(e, 'msg', None) or str(e)
    ln = getattr(e, 'lineno', None) or 0
    col = getattr(e, 'offset', None) or 0
    head = name
    if ln:
        head += ':%d:%d' % (ln, col)
    head += ': error: '
    if kind != 'SyntaxError':
        head += kind + ': '
    out = [head + msg]
    text = (getattr(e, 'text', None) or '').rstrip('\\n')
    if text:
        out.append(text)
        if col > 0:
            end = getattr(e, 'end_offset', None) or col
            if (getattr(e, 'end_lineno', None) or ln) != ln:
                end = col + 1
            n = max(1, min(end - col, len(text) - col + 1))
            out.append(' ' * (col - 1) + '^' + '~' * (n - 1))
    return '\\n'.join(out) + '\\n'

def _pg_lines(co, out):
    # 可停的行：本 code object 的 co_lines，加上嵌套的（函数体、推导式、lambda、
    # 生成器都各自是一个 code object，都在源码里，都该能停）。这就是 Python 那边的
    # 「行桩名单」，主线程拿它当 C++ 的 built.lines 用（热力只画这些行、状态栏报条数）。
    for start, end, lineno in co.co_lines():
        if lineno is not None:
            out.add(lineno)
    for k in co.co_consts:
        if isinstance(k, type(co)):
            _pg_lines(k, out)
    return out

def _pg_compile(src, name):
    global _pg_lines_csv
    try:
        co = compile(src, name, 'exec')
    except (SyntaxError, ValueError) as e:
        with open('${DIAG}', 'w', encoding='utf-8') as f:
            f.write(_pg_diag(e, name))
        return 'err'
    with open('${ART}', 'wb') as f:
        f.write(_marshal.dumps(co))
    _pg_lines_csv = ','.join(str(n) for n in sorted(_pg_lines(co, set())))
    return 'ok'

def _pg_run(name, dbg):
    with open('${ART}', 'rb') as f:
        code = _marshal.loads(f.read())
    g = {'__name__': '__main__', '__file__': name, '__builtins__': _builtins}
    _sys.argv = [name]
    rc = 0
    # 桩必须在 exec 之前装：settrace 只跟踪装桩之后新建的帧，模块帧就是 exec 建的那个。
    # 顺序反了的话整个程序一行都不会停（实测过，见 README 的 Python 单步一节）。
    if dbg:
        _pg_dbg_start(name)
    try:
        try:
            exec(code, g)
        except SystemExit as e:
            c = e.code
            if c is None:
                rc = 0
            elif isinstance(c, int):
                rc = c
            else:
                _sys.stderr.write(str(c) + '\\n')
                rc = 1
        except BaseException:
            t, v, tb = _sys.exc_info()
            _sys.stderr.write(''.join(_traceback.format_exception(t, v, tb.tb_next)))
            rc = 1
    finally:
        # 桩一定要摘掉：这是常驻解释器，留着下一次普通运行就变成「每行都过一遍
        # 回调」的慢程序，而且控制块早就不在了。
        if dbg:
            _pg_dbg_stop()
    return rc
`;

/* ------------------------------------------------------------------ */
/* 单步调试：行桩 + 停走（停住时递变量快照，见下面的 PYSNAP）           */
/*                                                                    */
/* 行桩的来源是 sys.settrace，不是改源码：跑的还是语法检查那份 marshal   */
/* 字节码，产物和「仅运行」完全同一个，所以没有 C++ 那种「调试构建」。   */
/* 每行都要做的事（记行号、累加每行次数）留在 Python 侧，只有「这一行    */
/* 可能要停」或者攒够 _pg_beat 行时才跨一次 Python→JS：实测每行都跨的    */
/* 代价是纯 Python 记账的十倍（6.9 µs 对 0.7 µs），全速档白付这笔钱会    */
/* 把热力统计变成主角。                                                 */
/* 判定权在控制块：Python 里那几个镜像值只决定「要不要过去问一趟」，     */
/* 问错了最多白跑一次桥，既不会漏停也不会错停——和 C++ 那边 stub 每次直接 */
/* 读 SAB 是同一个结论的两种花法。                                      */
/* ------------------------------------------------------------------ */
const PYDBG = `
_pg_file = ''
_pg_mode = 1
_pg_delay = 0
_pg_bp = frozenset()
_pg_pending = {}
_pg_n = [0]
_pg_last = [0]
_pg_ln = [0]
_pg_beat = 512
_pg_js = None
_pg_frame = None

def _pg_flush(line, final):
    global _pg_mode, _pg_delay, _pg_bp
    _pg_last[0] = _pg_n[0]
    r = _pg_js.hit(line, _pg_n[0], ','.join('%d:%d' % (k, v) for k, v in _pg_pending.items()), final)
    _pg_pending.clear()
    p = r.split('|')
    _pg_mode = int(p[0])
    _pg_delay = int(p[1])
    if p[2]:
        _pg_bp = frozenset(int(x) for x in p[2].split(','))

def _pg_hit(line, f):
    global _pg_frame
    _pg_n[0] += 1
    _pg_ln[0] = line
    _pg_pending[line] = _pg_pending.get(line, 0) + 1
    if _pg_mode or _pg_delay or (line in _pg_bp) or (_pg_n[0] - _pg_last[0] >= _pg_beat):
        # 记帧只在这儿做：停住必然发生在下面这次跨桥里面，所以快照取到的就是
        # 这一行的帧。放到 _pg_tr 里每行都记的话，全速档白付几百万次全局赋值。
        _pg_frame = f
        _pg_flush(line, 0)

def _pg_tr(f, event, arg):
    # 按文件名筛帧：库代码（含 <frozen posixpath> 这类冻结模块）不进跟踪，
    # 和 C++ 只插桩用户模块、不插桩 std::sort 是同一条口径。
    if f.f_code.co_filename != _pg_file:
        return None
    if event == 'line':
        _pg_hit(f.f_lineno, f)
    elif event == 'call':
        # 进函数停在 def 那一行，对应 C++ 函数入口基本块的行桩；
        # 模块帧的 call 事件行号是 0，那种「行」没有源码可指，跳过。
        if f.f_lineno > 0:
            _pg_hit(f.f_lineno, f)
    return _pg_tr

def _pg_dbg_start(name):
    global _pg_file, _pg_mode, _pg_delay, _pg_bp, _pg_frame
    _pg_file = name
    _pg_frame = None
    # _pg_mode 先给个非零值：第一行一定要跨过去问一趟，好把真正的模式、每行停留
    # 时长和断点名单取回来。JS 那边按控制块说了算，这一趟不会误停。
    _pg_mode = 1
    _pg_delay = 0
    _pg_bp = frozenset()
    _pg_pending.clear()
    _pg_n[0] = 0
    _pg_last[0] = 0
    _sys.settrace(_pg_tr)

def _pg_dbg_stop():
    _sys.settrace(None)
    # 收尾这一次带着「最后一个执行到的行」去交账（final=1 只交账，不停也不睡）：
    # 全速档下最后一次跨桥可能停在几百行之前，不带行号的话主线程报的「最后一站」
    # 就是那一次的老行号，程序明明在第 9 行结束、却说停在第 2 行。
    _pg_flush(_pg_ln[0], 1)
`;

/* ------------------------------------------------------------------ */
/* 停住时的变量快照（值通道）                                           */
/*                                                                    */
/* C++ 那边主线程拿着共享线性内存按地址读，Python 的解释器堆在 Worker   */
/* 里、主线程碰不到，所以改成「停住的那一刻，把当前帧的 f_locals 写成   */
/* 一段文本递过去」。只在 park 前取一次，不是每行都取——每行取的话，   */
/* 全速档就变成「每行格式化一遍所有变量」，比行桩本身贵几个数量级。     */
/*                                                                    */
/* 三条硬规矩，都是实测踩出来的：                                       */
/*  1) 绝不先 repr 再截断。repr(v)[:120] 会把整个对象算完才切，百万元素 */
/*     的 list 实测 66 ms 一次；这里一律先切原料（str 切片 / islice）   */
/*     再格式化，代价只跟「要显示多少个」有关。                         */
/*  2) 绝不调用用户对象的 __repr__ / __len__ / __iter__。那是在调试器里 */
/*     执行用户代码：可能改状态、可能抛异常、可能死循环。容器只认精确   */
/*     的内建类型（type(v) is list），子类一律走「只报类名 + 摊开自己   */
/*     的字段」那条路，字段用 object.__getattribute__ 取，绕开重载。    */
/*  3) 总量有预算。嵌套深度、每层元素数、变量个数、以及一个全局的元素   */
/*     预算四道闸一起卡，循环引用和 50×50×50 的嵌套都只会写到「…」为止。*/
/* ------------------------------------------------------------------ */
const PYSNAP = `
import json as _json, types as _types
from itertools import islice as _islice

_pg_SNIP = 120      # 一个值最多写多少个字符
_pg_ITEMS = 50      # 一个容器最多铺多少个元素（和悬停的 ARR_TIP_N 对齐）
_pg_VARS = 256      # 一帧最多报多少个变量
_pg_DEPTH = 3       # 容器套容器最多往下写几层
_pg_BUDGET = 400    # 一次快照总共最多格式化多少个值（防嵌套爆炸）
_pg_left = [0]

def _pg_cut(s):
    return s if len(s) <= _pg_SNIP else s[:_pg_SNIP] + '…'

def _pg_one(v, depth):
    # 返回 (kind, 显示文本, 个数)。个数：容器是元素数、字符串是字符数、
    # 整数是十进制位数，0 表示这一类没有「个数」可言。
    if _pg_left[0] <= 0:
        return 'obj', '…', 0
    _pg_left[0] -= 1
    t = type(v)
    if v is None:
        return 'none', 'None', 0
    if t is bool:
        return 'bool', 'True' if v else 'False', 0
    if t is int:
        try:
            s = str(v)
        except ValueError:
            # 3.11 起 int→str 有 4300 位的默认上限，超了会抛；不去改解释器的
            # 全局设置，改用位数说话（bit_length 是 O(1) 的）。
            return 'int', '<大整数，%d 位二进制>' % v.bit_length(), 0
        return 'int', _pg_cut(s), len(s)
    if t is float or t is complex:
        return 'float', repr(v), 0
    if t is str:
        return 'str', repr(v if len(v) <= _pg_SNIP else v[:_pg_SNIP] + '…'), len(v)
    if t is bytes or t is bytearray:
        s = repr(bytes(v[:64]))
        # repr 的定界引号可能是单也可能是双，省略号插在收尾那个引号之前
        return 'bytes', s if len(v) <= 64 else s[:-1] + '…' + s[-1], len(v)
    if t is range:
        return 'seq', repr(v), len(v)
    if t is list or t is tuple:
        n = len(v)
        if depth <= 0:
            return 'seq', '[…]' if t is list else '(…)', n
        body = ', '.join(_pg_one(x, depth - 1)[1] for x in _islice(v, _pg_ITEMS))
        if n > _pg_ITEMS:
            body += ', …'
        return 'seq', ('[%s]' if t is list else '(%s)') % body, n
    if t is dict:
        n = len(v)
        if depth <= 0:
            return 'map', '{…}', n
        parts = ['%s: %s' % (_pg_one(k, depth - 1)[1], _pg_one(x, depth - 1)[1])
                 for k, x in _islice(v.items(), _pg_ITEMS)]
        body = ', '.join(parts)
        if n > _pg_ITEMS:
            body += ', …'
        return 'map', '{%s}' % body, n
    if t is set or t is frozenset:
        n = len(v)
        if depth <= 0:
            return 'set', '{…}', n
        body = ', '.join(_pg_one(x, depth - 1)[1] for x in _islice(v, _pg_ITEMS))
        if n > _pg_ITEMS:
            body += ', …'
        return 'set', '{%s}' % body, n
    if t is _types.FunctionType or t is _types.BuiltinFunctionType or t is _types.MethodType:
        return 'func', '<函数 %s>' % getattr(v, '__qualname__', '?'), 0
    if t is type:
        return 'type', '<类 %s>' % v.__name__, 0
    if t is _types.ModuleType:
        return 'mod', '<模块 %s>' % getattr(v, '__name__', '?'), 0
    # 其它对象：只报类名，再把它自己的字段摊开一层。数据结构课那些结点
    # （key/left/right、val/next）就靠这一步才看得见，否则只有一个类名。
    tn = t.__name__
    if depth > 0:
        parts = []
        try:
            d = object.__getattribute__(v, '__dict__')
        except AttributeError:
            d = None
        if isinstance(d, dict) and d:
            for k, x in _islice(d.items(), _pg_ITEMS):
                parts.append('%s=%s' % (k, _pg_one(x, depth - 1)[1]))
        else:
            # __slots__ 的类没有 __dict__；沿 MRO 收槽名，用 object.__getattribute__
            # 逐个取（槽描述符不会跑用户代码），没赋过值的槽会抛 AttributeError。
            names = []
            for base in t.__mro__:
                sl = base.__dict__.get('__slots__', ())
                if isinstance(sl, str):
                    sl = (sl,)
                if isinstance(sl, (tuple, list)):
                    for nm in sl:
                        if isinstance(nm, str) and nm not in ('__dict__', '__weakref__') and nm not in names:
                            names.append(nm)
            for nm in names[:_pg_ITEMS]:
                try:
                    x = object.__getattribute__(v, nm)
                except AttributeError:
                    continue
                parts.append('%s=%s' % (nm, _pg_one(x, depth - 1)[1]))
        if parts:
            return 'obj', '%s(%s)' % (tn, ', '.join(parts)), len(parts)
    return 'obj', '<%s 对象>' % tn, 0

def _pg_snapshot():
    f = _pg_frame
    if f is None:
        return '{"frame": "", "items": []}'
    _pg_left[0] = _pg_BUDGET
    out = []
    for k, v in f.f_locals.items():
        if len(out) >= _pg_VARS:
            break
        # __name__ / __builtins__ 这类模块自带的名字不是用户变量，别占面板
        if not isinstance(k, str) or (k.startswith('__') and k.endswith('__')):
            continue
        try:
            kind, text, cnt = _pg_one(v, _pg_DEPTH)
            tn = type(v).__name__
        except Exception:
            # 用户的类可以在元类上把 __name__ 做成会抛的 property。一个怪对象
            # 不该让整帧的快照都拿不到。
            kind, text, cnt, tn = 'obj', '<取不到值>', 0, '?'
        out.append({'n': k, 'k': kind, 't': tn, 'v': text, 'c': cnt})
    return _json.dumps({'frame': f.f_code.co_name, 'items': out})
`;

/* 断点名单：控制块里 bp[行号] 是一张 20000 格的表，Python 侧要的是一个能按行号
   问「这里有没有断点」的集合，所以只在主线程改过表（BPGEN 变了）之后重取一次。 */
function bpCsv(bp) {
  const out = [];
  for (let line = 1; line <= DBG.MAX_LINE; line++) if (bp[line] === 1) out.push(line);
  return out.join(',');
}

/* 「1,4,7」→ [1, 4, 7]：越界的、非数字的行号直接扔掉（空串走 Number('')===0 那条分支）。 */
function parseLines(csv) {
  const out = [];
  for (const s of String(csv || '').split(',')) {
    const n = +s;
    if (Number.isInteger(n) && n >= 1 && n <= DBG.MAX_LINE) out.push(n);
  }
  return out;
}

/* JS 侧的桥。参数和返回值只用数字与字符串，不走对象代理那一层——少一处会随
   Pyodide 版本变的转换行为。onPark 传的是输出缓冲区的 flush：停住之前先把攒着的
   print（尤其是 end='' 那种没有换行的）吐出去，不然人对着停住的那行看不到上半句。
   onLocals(line) 紧跟着它跑，同样在置 PARK 之前：主线程一看见 PARK 就该已经拿到
   这一帧的变量快照，顺序反了就会先显示上一行的值。 */
function makePyBridge(c, onPark, onLocals) {
  const ctl = c.ctl;
  let cur = 0;
  const pace = DBG.makePacer(c);
  const park = DBG.makeParker(c, () => {
    if (onPark) onPark();
    if (onLocals) onLocals(cur);
  });
  let bpGen = -1;
  return {
    hit(line, events, csv, final) {
      line = line | 0;
      cur = line;
      /* final 是会话收尾那一次（_pg_dbg_stop）：行号照写，但绝不停下去等一个
         不会再来的放行——程序已经要退了，那时候还 park 就永远结不掉。 */
      if (line > 0) ctl[DBG.S.LINE] = line;
      ctl[DBG.S.EVENTS] = events | 0;
      if (csv) {
        for (const piece of csv.split(',')) {
          const i = piece.indexOf(':');
          const l = +piece.slice(0, i) | 0;
          const n = +piece.slice(i + 1) | 0;
          if (l >= 1 && l <= DBG.MAX_LINE && n > 0) c.heat[l] = (c.heat[l] + n) | 0;
        }
      }
      if (line > 0 && !final) {
        const reason = DBG.stopReason(c, line);
        if (reason) park(line, reason);
        else pace();
      }
      let send = '';
      const gen = Atomics.load(ctl, DBG.S.BPGEN);
      if (gen !== bpGen) { bpGen = gen; send = bpCsv(c.bp); }
      return Atomics.load(ctl, DBG.S.MODE) + '|' + (ctl[DBG.S.DELAY_US] | 0) + '|' + send;
    },
  };
}

/* 每次运行都换一份全新的 __main__ 字典，上一次跑剩的变量不会漏到这一次。
   解释器本身（sys.modules、已 import 的模块）是复用的，这正是常驻的意义。 */
function setStdin(text, out) {
  /* Pyodide 的 stdin 钩子按「一次一行」喂：返回的字符串若不以换行结尾，它自己
     补一个；返回 null/undefined 就是 EOF（autoEOF 默认开）。所以这里把整段
     stdin 切成行，末尾那个换行切出来的空串要丢掉，否则程序会多读到一行空行。 */
  const lines = text === '' ? [] : text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  let i = 0;
  py.setStdin({
    stdin: () => {
      /* 读之前先把攒着的输出吐出去：print('输入：', end='') 这种提示语没有换行，
         不主动 flush 就要等到程序结束才看得见。 */
      out.flush();
      return i < lines.length ? lines[i++] : null;
    },
  });
}

/* 版本钉在 0.29.5（CPython 3.13.2）：314 世代的加载器收到 classic worker 时是直接
   throw，而本页三个 worker 文件全是 classic（clang 那两个改 ES module 要连 importScripts
   一起动）。哪天要升 3.14，代价是把 py.worker 换成 module worker，不是换目录里的文件。 */
async function init(m) {
  const indexURL = m.base + ((m.assets && m.assets.pyodide) || 'pyodide/');
  postMessage({ type: 'progress', text: '正在装入 Pyodide 解释器' });
  importScripts(indexURL + 'pyodide.js');
  py = await loadPyodide({ indexURL: indexURL, packages: [] });
  py.runPython(BOOTSTRAP);
  return `Python ${py.runPython('_sys.version.split()[0]')} / Pyodide ${py.version}`;
}

self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.type === 'init') {
      if (initing) return;
      const t0 = performance.now();
      initing = init(m).then((detail) => {
        initing = null;
        postMessage({
          type: 'ready',
          initMs: Math.round(performance.now() - t0),
          detail: detail,
        });
      }).catch((e) => {
        initing = null;
        py = null;
        postMessage({ type: 'error', message: `解释器初始化失败：${(e && e.message) || e}` });
      });
      return;
    }

    if (m.type === 'compile') {
      const t0 = performance.now();
      const name = (m.opts && m.opts.filename) || 'main.py';
      postMessage({ type: 'progress', text: '语法检查中（compile）' });
      py.globals.set('_pg_src', m.code);
      py.globals.set('_pg_name', name);
      const st = py.runPython('_pg_compile(_pg_src, _pg_name)');
      const ms = Math.round(performance.now() - t0);
      if (st !== 'ok') {
        postText(py.FS.readFile(DIAG, { encoding: 'utf8' }));
        postMessage({ type: 'result', ok: false, phase: 'compile', exitCode: 1, ms: ms });
        return;
      }
      const bytes = py.FS.readFile(ART);
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      /* 调试构建（其实就是「顺便把可停的行报回去」）：产物一个字节都不差，
         lines 用 co_lines 现算，作用等同 C++ 那边插桩出来的行桩名单——主线程拿它
         当 dbg.heatRows（热力只画这些行）、拿它的长度报「N 个行桩」。 */
      const dbgBuild = !!(m.opts && m.opts.debug);
      postMessage({
        type: 'result', ok: true, ms: ms, size: bytes.byteLength, artifact: buf,
        lines: dbgBuild ? parseLines(py.runPython('_pg_lines_csv')) : null,
      }, [buf]);
      return;
    }

    if (m.type === 'run') {
      const t0 = performance.now();
      const out = makeOut();
      let exit = { code: 127, note: 'startup-failed' };
      const dbgOn = !!m.ctl;
      let snap = null;
      try {
        py.FS.writeFile(ART, new Uint8Array(m.artifact));
        const stdin = m.stdin ? new TextDecoder().decode(new Uint8Array(m.stdin)) : '';
        setStdin(stdin, out);
        /* raw 是逐字节的回调（batched 会吞掉换行、还要等 fsync 才吐尾巴），
           我们要的就是原始字节流，攒和 flush 的时机由上面 makeOut 说了算。 */
        py.setStdout({ raw: out.byte });
        py.setStderr({ raw: out.byte });
        py.globals.set('_pg_name', m.name || 'main.py');
        if (dbgOn) {
          /* 控制块由主线程建（布局和 C++ 用的那份完全一样，见 dbgproto.js），
             随 run 消息递过来；解释器不共享堆，所以这里没有 C++ 那种「把用户
             线性内存递出去」的 guest 消息，改成停住前递一份变量快照（locals）。 */
          const c = DBG.attachControlBlock(m.ctl);
          py.runPython(PYDBG);
          py.runPython(PYSNAP);
          /* 取一次函数代理留着用：park 是人在看的时刻，一次 JS→Python 调用无所谓，
             但每行都 runPython 一段字符串去取快照就太贵了。 */
          snap = py.globals.get('_pg_snapshot');
          py.globals.set('_pg_js', makePyBridge(c, out.flush, (line) => {
            postMessage({ type: 'locals', line: line, ...JSON.parse(snap()) });
          }));
          Atomics.store(c.ctl, DBG.S.STATE, DBG.STATE.EXEC);
        }
        py.globals.set('_pg_dbg', dbgOn ? 1 : 0);
        const code = py.runPython('_pg_run(_pg_name, _pg_dbg)');
        out.flush();
        exit = { code: code, note: null };
      } catch (e) {
        out.flush();
        exit = { code: 127, note: String((e && e.message) || e) };
      }
      /* 代理是引用计数的，JS 这一份不还回去，解释器里那个函数对象就一直被钉着。
         常驻解释器要跑很多次会话，一次漏一个。 */
      if (snap) snap.destroy();
      postMessage({
        type: 'exit',
        code: exit.code,
        ms: Math.round(performance.now() - t0),
        /* Python 没有「用户模块的线性内存」这种东西，报的是解释器整个堆：
           标准库、用户对象、字节码都在里面，量级和 C++ 那个数不是一回事。 */
        memoryBytes: py._module.HEAP8.byteLength,
        note: exit.note,
      });
      return;
    }
  } catch (e) {
    postMessage({ type: 'error', message: String((e && e.stack) || e) });
  }
};