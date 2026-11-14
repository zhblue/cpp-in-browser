/*
 * compile.worker.js — 常驻的编译 Worker
 * 只加载一次 clang.wasm / lld.wasm / sysroot.tar，之后反复复用。
 * 超时或出错时不需要重建它（运行用户程序用的是另一个一次性 Worker）。
 */
'use strict';
/* goc.js 要在 wasmclang.js 之前：Toolchain.init() 会拿 global.GOC 往 memfs 里
   补 goc.h / logo.h。这里只用它的头文件文本，画布那两半在 Worker 里不碰 DOM。 */
importScripts('goc.js', 'wasmclang.js');

let tc = null;
let initing = null;

function postWrite(bytes) {
  postMessage({ type: 'write', bytes: bytes }, [bytes.buffer]);
}

/* 工具链是 60 MB 静态资源，「拿不到」的原因其实分好几类，混成一句话就只能靠猜：
   文件没上传（404）、权限/目录不对（403）、反代或 CDN 把大文件掐了（5xx / 截断）、
   try_files 把缺失文件回落成 index.html（200 但回的是 HTML）、跨源没给 CORP 被
   COEP 拦（fetch 直接抛 TypeError）。这里把 URL、HTTP 状态、返回类型、声明字节数和
   实收字节数一起写进错误文本，页面那行红字自己就能指出是哪一类。 */
function whyStatus(s) {
  if (s === 404) return '服务器上这个路径没有文件：确认 assets/ 真的传上去了（60 MB 容易被 rsync/FTP 的过滤规则跳过，或只剩 git-lfs 占位文件），再确认 nginx 的 root/alias 指的是这个目录';
  if (s === 403) return 'nginx 读不到这个文件：worker 进程的用户没有权限，或目录索引设置不对';
  if (s >= 500 || s === 499) return '请求到了服务器但没成功：大文件走反代/CDN 时通常是 proxy_read_timeout 太短、缓冲不够，或链路被掐断';
  return '非 2xx，看这一条的响应体和 nginx 的 error.log';
}

async function grab(url, label) {
  let r;
  try {
    r = await fetch(url);
  } catch (e) {
    throw new Error(`${label} 的请求根本没完成（${url}）：${e.name}: ${e.message}。` +
      'fetch 直接抛异常一般不是文件缺失，而是这几种：页面是 https 但资源写成了 http（混合内容被拦）、' +
      '证书链不全导致同源连接失败、CSP 的 connect-src 没放行、COEP: require-corp 拦下跨源且没有 ' +
      'Cross-Origin-Resource-Policy 头的资源、或者下载中途断线');
  }
  if (!r.ok) {
    throw new Error(`${label} 取不到（HTTP ${r.status} ${r.statusText || ''}，${url}）：${whyStatus(r.status)}`);
  }
  return r;
}

/* 声明长度和实收长度对不上 = 传输被中间层截了。gzip/br 响应要跳过这个检查：
   content-length 是压缩后的字节数，arrayBuffer 拿到的是解压后的，本来就不该相等。 */
function checkComplete(name, r, bytes) {
  const enc = (r.headers.get('content-encoding') || '').toLowerCase();
  const len = r.headers.get('content-length');
  if (enc || !len) return;
  const want = Number(len);
  if (Number.isFinite(want) && want !== bytes.byteLength) {
    throw new Error(`${name} 下载不完整：服务器声明 ${want} 字节，实收 ${bytes.byteLength} 字节。` +
      '多半是反代/CDN 截断或传输中断，绕开中间层直连源站比一次大小最快：' +
      `curl -o /dev/null -w "%{size_download}\\n" "${r.url}"`);
  }
}

function makeToolchain(base, assets) {
  async function readBuffer(name) {
    const url = base + name;
    const r = await grab(url, `工具链文件 ${name}`);
    const buf = await r.arrayBuffer();
    checkComplete(name, r, buf);
    return buf;
  }
  async function compileModule(name) {
    const url = base + (assets[name] || name);
    const r = await grab(url, `工具链模块 ${name}`);
    const type = (r.headers.get('content-type') || '').toLowerCase();
    if (type.includes('html')) {
      throw new Error(`${name}（${url}）返回的是 HTML 而不是 wasm（HTTP 200，content-type: ${type}）。` +
        '这是 nginx 的 try_files 把缺失文件回落到了 index.html，或 CDN 回了错误页——' +
        '把 /assets/ 那个 location 的 try_files 去掉，让它老实报 404，才好定位到底缺哪个文件');
    }
    if (type.includes('application/wasm') && WebAssembly.compileStreaming) {
      try {
        return await WebAssembly.compileStreaming(r);
      } catch (e) {
        throw new Error(`${name} 的 wasm 流式编译失败（${url}）：${e.message}。` +
          '若本地 curl 下来的文件是完整的，说明中间层改了字节（透明解压、改写，或塞了 BOM）');
      }
    }
    const buf = await r.arrayBuffer();
    checkComplete(name, r, buf);
    const head = new Uint8Array(buf.slice(0, 4));
    if (!(head[0] === 0x00 && head[1] === 0x61 && head[2] === 0x73 && head[3] === 0x6d)) {
      throw new Error(`${name}（${url}）拿到的不是 wasm：前 4 字节是 ` +
        Array.from(head, (b) => b.toString(16).padStart(2, '0')).join(' ') +
        '，正常应该是 00 61 73 6d。内容多半是错误页或占位文件（git-lfs 指针、HTML、空文件）');
    }
    return await WebAssembly.compile(buf);
  }
  return new WasmClang.Toolchain({
    memfs: 'memfs.wasm',
    readBuffer: (n) => readBuffer(n),
    compileModule: (n) => compileModule(n),
    onWrite: postWrite,
    onProgress: (text) => postMessage({ type: 'progress', text }),
  });
}

self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.type === 'init') {
      if (initing) return;
      const t0 = performance.now();
      tc = makeToolchain(m.base, m.assets || {});
      initing = tc.init().then(() => {
        postMessage({
          type: 'ready',
          initMs: Math.round(performance.now() - t0),
          detail: `sysroot 装入 ${tc.sysrootFiles} 个文件`,
        });
        initing = null;
      }).catch((e) => {
        initing = null;
        postMessage({ type: 'error', message: `工具链初始化失败：${(e && e.message) || e}` });
      });
      return;
    }

    if (m.type === 'compile') {
      const t0 = performance.now();
      const debug = !!(m.opts && m.opts.debug);
      tc.setSink(postWrite);
      postMessage({
        type: 'progress',
        text: debug ? '调试构建中（出 IR → 插桩 → 目标文件 → 链接）' : '编译中（clang -cc1）',
      });
      const res = debug
        ? await tc.compileForDebug(m.code, m.opts)
        : await tc.compileAndLink(m.code, m.opts);
      tc.setSink(null);
      const ms = Math.round(performance.now() - t0);
      if (!res.ok) {
        postMessage({
          type: 'result', ok: false, phase: res.phase, exitCode: res.exitCode, ms,
        });
        return;
      }
      postMessage({
        type: 'result', ok: true, ms, size: res.wasm.byteLength,
        artifact: res.wasm.buffer, lines: res.lines || null, debug: debug,
        vars: res.vars || null, lineVars: res.lineVars || null,
      }, [res.wasm.buffer]);
      return;
    }

    if (m.type === 'dispose') {
      tc = null;
      initing = null;
      close();
    }
  } catch (e) {
    tc && tc.setSink(null);
    postMessage({ type: 'error', message: String((e && e.stack) || e) });
  }
};
