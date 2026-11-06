/*
 * wasmclang.js — 浏览器内 C++ 工具链驱动层
 *
 * 派生自 binji/wasm-clang 的 shared.js
 *   Copyright 2020 WebAssembly Community Group participants
 *   Licensed under the Apache License, Version 2.0
 * https://github.com/binji/wasm-clang
 *
 * 相对上游的改动（都在 I/O 与健壮性上）：
 *   1. stdin/stdout 改为按字节传输，用 TextDecoder(stream) 解码 —— 中文不再乱码。
 *   2. 实现 clock_time_get（上游直接抛 NotImplemented），std::chrono / time() 可用。
 *   3. 宿主导入用 Proxy 兜底：模块引用了未实现的 wasi/env 函数时，报错信息里
 *      会指名是哪个函数，而不是 LinkError。
 *   4. 去掉 canvas 实现（保留名字），只留编译/链接/运行这条路径。
 *   5. 编译与链接合并成 compileAndLink()，由调用方决定在哪条 Worker 里跑。
 */

(function (global) {
  'use strict';

  const ESUCCESS = 0;

  class ProcExit extends Error {
    constructor(code) {
      super(`process exited with code ${code}.`);
      this.code = code;
    }
  }

  class NotImplemented extends Error {
    constructor(modname, fieldname) {
      super(`${modname}.${fieldname} not implemented.`);
    }
  }

  class AbortError extends Error {
    constructor(msg = 'abort') {
      super(msg);
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new AbortError(msg || 'assertion failed.');
  }

  /* 只在路径 / ASCII 场景使用：逐字节转 Latin1，不做 UTF-8 解码。 */
  function readStr(u8, o, len = -1) {
    let str = '';
    let end = u8.length;
    if (len !== -1) end = o + len;
    for (let i = o; i < end && u8[i] !== 0; ++i) str += String.fromCharCode(u8[i]);
    return str;
  }

  const textEncoder = new TextEncoder();

  /* ------------------------------------------------------------------ */
  /* Guest memory view                                                   */
  /* ------------------------------------------------------------------ */
  class Memory {
    constructor(memory) {
      this.memory = memory;
      this.buffer = memory.buffer;
      this.u8 = new Uint8Array(this.buffer);
      this.u32 = new Uint32Array(this.buffer);
    }

    /* wasm 内存 grow 之后必须重建视图。判据只能用「buffer 对象换了」，不能用
       「旧 buffer 的 byteLength 归零」：普通内存 grow 会把旧的 ArrayBuffer
       detach 掉（长度变 0，一碰就抛），这条判据够用；可共享内存 grow 是换成一个
       新的 SharedArrayBuffer，旧的那个既不 detach、长度也永远停在原来那份，
       继续拿旧视图读写就会静默越界或读到过期内容。 */
    check() {
      if (this.buffer !== this.memory.buffer) {
        this.buffer = this.memory.buffer;
        this.u8 = new Uint8Array(this.buffer);
        this.u32 = new Uint32Array(this.buffer);
      }
    }

    read8(o) { return this.u8[o]; }
    read32(o) { return this.u32[o >> 2]; }
    write8(o, v) { this.u8[o] = v; }
    write32(o, v) { this.u32[o >> 2] = v; }

    writeU64(o, value) {
      const v = BigInt(value);
      this.write32(o, Number(v & 0xffffffffn));
      this.write32(o + 4, Number(v >> 32n));
    }
    readU64(o) {
      return BigInt(this.read32(o)) | (BigInt(this.read32(o + 4)) << 32n);
    }

    readStr(o, len = -1) { return readStr(this.u8, o, len); }

    /* data: Uint8Array | ArrayBuffer | string(UTF-8) */
    write(o, data) {
      if (data instanceof ArrayBuffer) data = new Uint8Array(data);
      if (typeof data === 'string') data = textEncoder.encode(data);
      this.check();
      new Uint8Array(this.buffer, o, data.length).set(data);
      return data.length;
    }

    read(o, len) {
      this.check();
      return new Uint8Array(new Uint8Array(this.buffer, o, len));  /* 复制一份 */
    }

    writeStr(o, str) {
      const n = this.write(o, str);
      this.write8(o + n, 0);
      return n + 1;
    }
  }

  /* ------------------------------------------------------------------ */
  /* memfs.wasm 的宿主侧包装：一个纯内存文件系统 + stdin/stdout 通道       */
  /* ------------------------------------------------------------------ */
  class MemFS {
    constructor(options) {
      this.compileStreaming = options.compileStreaming;
      /* hostWrite 收到的是 Uint8Array（原始字节，不是字符串）。 */
      this.hostWrite = options.hostWrite;
      this.memfsFilename = options.memfsFilename;
      this.stdinBytes = new Uint8Array(0);
      this.stdinPos = 0;
      this.hostMem_ = null;

      const target = {
        abort: (msg, len) => {
          this.mem.check();
          throw new AbortError(len === -1 ? 'abort' : this.mem.readStr(msg, len));
        },
        host_write: this.host_write.bind(this),
        host_read: this.host_read.bind(this),
        memfs_log: (buf, len) => {
          this.mem.check();
          console.log('[memfs]', this.mem.readStr(buf, len));
        },
        copy_out: (clang_dst, memfs_src, size) => {
          this.hostMem_.check();
          const dst = new Uint8Array(this.hostMem_.buffer, clang_dst, size);
          this.mem.check();
          dst.set(new Uint8Array(this.mem.buffer, memfs_src, size));
        },
        copy_in: (memfs_dst, clang_src, size) => {
          this.mem.check();
          const dst = new Uint8Array(this.mem.buffer, memfs_dst, size);
          this.hostMem_.check();
          dst.set(new Uint8Array(this.hostMem_.buffer, clang_src, size));
        },
      };

      this.ready = this.compileStreaming(this.memfsFilename)
        .then((module) => WebAssembly.instantiate(module, { env: guard(target, 'env') }))
        .then((instance) => {
          this.instance = instance;
          this.exports = instance.exports;
          this.mem = new Memory(this.exports.memory);
          this.exports.init();
        });
    }

    set hostMem(mem) { this.hostMem_ = mem; }

    setStdin(bytes) {
      this.stdinBytes = typeof bytes === 'string' ? textEncoder.encode(bytes) : bytes;
      this.stdinPos = 0;
    }

    addDirectory(path) {
      this.mem.check();
      this.mem.write(this.exports.GetPathBuf(), path);
      this.exports.AddDirectoryNode(path.length);
    }

    addFile(path, contents) {
      if (contents instanceof ArrayBuffer) contents = new Uint8Array(contents);
      if (typeof contents === 'string') contents = textEncoder.encode(contents);
      this.mem.check();
      this.mem.write(this.exports.GetPathBuf(), path);
      const inode = this.exports.AddFileNode(path.length, contents.length);
      const addr = this.exports.GetFileNodeAddress(inode);
      this.mem.check();
      this.mem.write(addr, contents);
    }

    /* 注意：memfs.wasm 的 FindNode 对不存在的路径是直接 abort(trap)，
       不是返回哨兵值，所以这里必须吃掉异常。 */
    hasFile(path) {
      try {
        this.mem.check();
        this.mem.write(this.exports.GetPathBuf(), path);
        const inode = this.exports.FindNode(path.length);
        if (inode === 0xffffffff || inode === 0) return false;
        this.exports.GetFileNodeAddress(inode);
        return true;
      } catch (e) {
        return false;
      }
    }

    getFileSize(path) {
      this.mem.check();
      this.mem.write(this.exports.GetPathBuf(), path);
      const inode = this.exports.FindNode(path.length);
      return this.exports.GetFileNodeSize(inode);
    }

    getFileContents(path) {
      this.mem.check();
      this.mem.write(this.exports.GetPathBuf(), path);
      const inode = this.exports.FindNode(path.length);
      assert(inode !== 0xffffffff, `no such file in memfs: ${path}`);
      const addr = this.exports.GetFileNodeAddress(inode);
      const size = this.exports.GetFileNodeSize(inode);
      return new Uint8Array(new Uint8Array(this.mem.buffer, addr, size));
    }

    /* iovec[] 全部落到一个 Uint8Array 再交给宿主，避免按字节拼字符串。 */
    host_write(fd, iovs, iovs_len, nwritten_out) {
      this.hostMem_.check();
      assert(fd <= 2, `host_write: unexpected fd ${fd}`);
      const parts = [];
      let size = 0;
      for (let i = 0; i < iovs_len; ++i) {
        const buf = this.hostMem_.read32(iovs);
        iovs += 4;
        const len = this.hostMem_.read32(iovs);
        iovs += 4;
        parts.push(this.hostMem_.read(buf, len));
        size += len;
      }
      const out = new Uint8Array(size);
      let off = 0;
      for (const p of parts) { out.set(p, off); off += p.length; }
      this.hostMem_.write32(nwritten_out, size);
      if (size > 0) this.hostWrite(out);
      return ESUCCESS;
    }

    host_read(fd, iovs, iovs_len, nread_out) {
      this.hostMem_.check();
      assert(fd === 0, `host_read: unexpected fd ${fd}`);
      let size = 0;
      for (let i = 0; i < iovs_len; ++i) {
        const buf = this.hostMem_.read32(iovs);
        iovs += 4;
        const len = this.hostMem_.read32(iovs);
        iovs += 4;
        const avail = this.stdinBytes.length - this.stdinPos;
        const n = Math.min(len, avail);
        if (n === 0) break;
        this.hostMem_.write(buf, this.stdinBytes.subarray(this.stdinPos, this.stdinPos + n));
        size += n;
        this.stdinPos += n;
        if (n !== len) break;
      }
      this.hostMem_.write32(nread_out, size);
      return ESUCCESS;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 宿主导入兜底：未实现的名字返回一个会指名报错的函数                     */
  /* ------------------------------------------------------------------ */
  function guard(target, nsName, missing) {
    return new Proxy(target, {
      has() { return true; },
      get(obj, prop) {
        if (typeof prop !== 'string') return obj[prop];
        if (prop in obj) return obj[prop];
        if (missing && !missing.includes(prop)) missing.push(prop);
        return () => { throw new NotImplemented(nsName, prop); };
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* 一个 wasi preview1 应用（clang / lld / 用户程序都走这里）             */
  /* ------------------------------------------------------------------ */
  class WasiApp {
    constructor(module, memfs, name, ...args) {
      /* 允许把最后一个参数写成 {env: {...}} 用来注入额外的宿主函数
         （argv 只会是字符串，所以这么判断是安全的）。 */
      let options = {};
      const last = args[args.length - 1];
      if (last && typeof last === 'object') options = args.pop();
      this.argv = [name, ...args];
      this.environ = { USER: 'player', PATH: '/' };
      this.memfs = memfs;
      this.handles = new Map();
      this.nextHandle = 3;          /* 0/1/2 是 stdin/stdout/stderr */
      this.missingImports = [];

      const self = this;
      const wasiTarget = Object.assign({}, memfs.exports, {
        proc_exit(code) { throw new ProcExit(code); },

        environ_sizes_get(count_out, buf_size_out) {
          self.mem.check();
          const names = Object.getOwnPropertyNames(self.environ);
          let size = 0;
          for (const n of names) size += n.length + self.environ[n].length + 2;
          self.mem.writeU64(count_out, names.length);
          self.mem.writeU64(buf_size_out, size);
          return ESUCCESS;
        },
        environ_get(ptrs, buf) {
          self.mem.check();
          for (const n of Object.getOwnPropertyNames(self.environ)) {
            self.mem.write32(ptrs, buf);
            ptrs += 4;
            buf += self.mem.writeStr(buf, `${n}=${self.environ[n]}`);
          }
          self.mem.write32(ptrs, 0);
          return ESUCCESS;
        },
        args_sizes_get(argc_out, buf_size_out) {
          self.mem.check();
          let size = 0;
          for (const a of self.argv) size += a.length + 1;
          self.mem.writeU64(argc_out, self.argv.length);
          self.mem.writeU64(buf_size_out, size);
          return ESUCCESS;
        },
        args_get(argv_ptrs, argv_buf) {
          self.mem.check();
          for (const a of self.argv) {
            self.mem.write32(argv_ptrs, argv_buf);
            argv_ptrs += 4;
            argv_buf += self.mem.writeStr(argv_buf, a);
          }
          self.mem.write32(argv_ptrs, 0);
          return ESUCCESS;
        },
        random_get(buf, len) {
          self.mem.check();
          const view = new Uint8Array(self.mem.buffer, buf, len);
          if (global.crypto && global.crypto.getRandomValues) {
            for (let i = 0; i < len; i += 65536) {
              global.crypto.getRandomValues(view.subarray(i, Math.min(i + 65536, len)));
            }
          } else {
            for (let i = 0; i < len; ++i) view[i] = (Math.random() * 256) | 0;
          }
          return ESUCCESS;
        },
        /* 上游这里是 NotImplemented；实现之后 std::chrono / time() / srand 播种才可用。 */
        clock_time_get(id, precision, out) {
          self.mem.check();
          let ns;
          if (id === 0) ns = BigInt(Date.now()) * 1000000n;
          else {
            const now = (typeof performance !== 'undefined' && performance.now)
              ? performance.now() : Date.now();
            ns = BigInt(Math.round(now * 1e6));
          }
          self.mem.writeU64(out, ns);
          return ESUCCESS;
        },
        poll_oneoff(_, __, ___, out) {
          /* 不实现真正的等待：返回 0 个事件，避免 std::this_thread::sleep 挂死。 */
          self.mem.check();
          self.mem.writeU64(out, 0);
          return ESUCCESS;
        },
      });

      /* 用户程序若链接了 libcanvas，会引用 env.canvas_*；一律空实现。 */
      const envTarget = {
        abort: (msg, len) => {
          self.mem.check();
          throw new AbortError(len === -1 ? 'abort' : self.mem.readStr(msg, len));
        },
        ...(options.env || {}),
      };

      const imports = {
        wasi_unstable: guard(wasiTarget, 'wasi_unstable', this.missingImports),
        wasi_snapshot_preview1: guard(wasiTarget, 'wasi_snapshot_preview1', this.missingImports),
        env: guard(envTarget, 'env', this.missingImports),
      };

      this.ready = WebAssembly.instantiate(module, imports).then((instance) => {
        this.instance = instance;
        this.exports = instance.exports;
        this.mem = new Memory(this.exports.memory);
        this.memfs.hostMem = this.mem;
      });
    }

    async start() {
      await this.ready;
      try {
        this.exports._start();
        return { code: 0, signal: null };
      } catch (exn) {
        if (exn instanceof ProcExit) {
          if (this.missingImports.length) {
            this.memfs.hostWrite(textEncoder.encode(
              `\n[warn] 未实现的宿主函数: ${this.missingImports.join(', ')}\n`));
          }
          return { code: exn.code, signal: null };
        }
        let msg = `\n[runtime error] ${exn && exn.message}\n`;
        if (exn && exn.stack) msg += `${exn.stack}\n`;
        this.memfs.hostWrite(textEncoder.encode(msg));
        return { code: 127, signal: null, error: exn };
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* ustar 解包（sysroot.tar 是 plain tar）                                */
  /* ------------------------------------------------------------------ */
  class Tar {
    constructor(buffer) {
      this.u8 = new Uint8Array(buffer);
      this.offset = 0;
    }
    readStr(len) { const s = readStr(this.u8, this.offset, len); this.offset += len; return s; }
    readOctal(len) { return parseInt(this.readStr(len), 8); }
    alignUp() { this.offset = (this.offset + 511) & ~511; }

    readEntry() {
      if (this.offset + 512 > this.u8.length) return null;
      const entry = {
        filename: this.readStr(100),
        mode: this.readOctal(8),
        owner: this.readOctal(8),
        group: this.readOctal(8),
        size: this.readOctal(12),
        mtim: this.readOctal(12),
        checksum: this.readOctal(8),
        type: this.readStr(1),
        linkname: this.readStr(100),
      };
      if (this.readStr(8) !== 'ustar  ') {
        /* 结尾的全零块 */
        return null;
      }
      entry.ownerName = this.readStr(32);
      entry.groupName = this.readStr(32);
      entry.devMajor = this.readStr(8);
      entry.devMinor = this.readStr(8);
      entry.filenamePrefix = this.readStr(155);
      this.alignUp();
      if (entry.type === '0') {
        entry.contents = this.u8.subarray(this.offset, this.offset + entry.size);
        this.offset += entry.size;
        this.alignUp();
      } else if (entry.type !== '5') {
        assert(false, `tar: unsupported entry type "${entry.type}" (${entry.filename})`);
      }
      return entry;
    }

    untar(memfs) {
      let entry;
      let files = 0;
      while ((entry = this.readEntry())) {
        if (entry.type === '0') { memfs.addFile(entry.filename, entry.contents); files++; }
        else memfs.addDirectory(entry.filename);
      }
      return files;
    }
    get files() { return 0; }
  }

  /* ------------------------------------------------------------------ */
  /* 工具链：clang -cc1 -> obj，wasm-ld -> user.wasm                      */
  /* ------------------------------------------------------------------ */
  const CLANG_COMMON = [
    '-disable-free',
    '-isysroot', '/',
    '-internal-isystem', '/include/c++/v1',
    '-internal-isystem', '/include',
    '-internal-isystem', '/lib/clang/8.0.1/include',
    '-ferror-limit', '19',
    '-fmessage-length', '80',
    '-fno-color-diagnostics',
  ];

  /* ------------------------------------------------------------------ */
  /* 万能头 <bits/stdc++.h>                                               */
  /*                                                                    */
  /* GCC 的 libstdc++ 有这个文件，libc++ 没有。sysroot.tar 是预打包好的， */
  /* 不动它，改成解包之后往 memfs 里补一个虚拟文件：clang 的头搜索路径里   */
  /* 有 /include/c++/v1，所以 include/c++/v1/bits/stdc++.h 正好被         */
  /* <bits/stdc++.h> 命中，竞赛代码可以照抄。                             */
  /* 里面列的都是这份 sysroot 实测能过编译的头（逐个 include 编过一遍）。
     故意不收的三类：
       <csetjmp>  —— sysroot 里没有 setjmp.h，libc++ 的 setjmp.h 用 #include_next
                      找它，直接 fatal error；
       <csignal>  —— wasi-libc 的 signal.h 不提供 ::signal，<csignal> 里的
                      using ::signal 编译不过；
       <thread> <mutex> <future> <condition_variable> <shared_mutex> <filesystem>
                  —— 头本身能编过，但这份 sysroot 没有 pthread / 没有对应的系统
                      调用，真去用就是链接期未定义符号或运行期 trap，收进万能头
                      等于给所有人埋雷。要用请显式 include。
       <regex>    —— 能编，但模板展开很重，课程用不上，不值得让每次编译都背。
     <ccomplex> <ctgmath> <ciso646> <cstdbool> 也不收：C++17 已废弃，-Wall 下
     会刷一堆 deprecation 警告。                                              */
  /* ------------------------------------------------------------------ */
  const UMBRELLA_DIR = 'include/c++/v1/bits';
  const UMBRELLA_PATH = UMBRELLA_DIR + '/stdc++.h';
  const UMBRELLA_INCLUDES = [
    'cassert', 'cctype', 'cerrno', 'cfloat', 'climits', 'clocale', 'cmath',
    'cstdarg', 'cstddef', 'cstdint', 'cstdio', 'cstdlib', 'cstring', 'ctime',
    'cwchar', 'cwctype',
    'algorithm', 'array', 'atomic', 'bitset', 'chrono', 'complex', 'deque',
    'exception', 'forward_list', 'fstream', 'functional', 'initializer_list',
    'iomanip', 'ios', 'iosfwd', 'iostream', 'istream', 'iterator', 'limits',
    'list', 'locale', 'map', 'memory', 'new', 'numeric', 'optional', 'ostream',
    'queue', 'random', 'ratio', 'scoped_allocator', 'set', 'sstream', 'stack',
    'stdexcept', 'streambuf', 'string', 'string_view', 'system_error', 'tuple',
    'type_traits', 'typeindex', 'typeinfo', 'unordered_map', 'unordered_set',
    'utility', 'valarray', 'variant', 'vector',
  ];
  const UMBRELLA_TEXT = '// bits/stdc++.h —— 本环境在 sysroot 之外补的虚拟头，libc++ 自己不带\n'
    + '#pragma once\n'
    + UMBRELLA_INCLUDES.map((h) => `#include <${h}>`).join('\n') + '\n';

  /* 返回 1 = 补上了，0 = 已存在（不覆盖 sysroot 里可能带来的同名文件） */
  function addUmbrellaHeader(memfs) {
    try { if (memfs.hasFile(UMBRELLA_PATH)) return 0; } catch (e) { /* FindNode 会 trap */ }
    try { memfs.addDirectory(UMBRELLA_DIR); } catch (e) { /* 目录已存在 */ }
    memfs.addFile(UMBRELLA_PATH, textEncoder.encode(UMBRELLA_TEXT));
    return 1;
  }

  /* ------------------------------------------------------------------ */
  /* 调试插桩：在文本 LLVM IR 的源码行边界插入行桩和变量快照               */
  /*                                                                    */
  /* 为什么插在 IR 而不是解析 DWARF：clang -cc1 -emit-llvm 直接给出带      */
  /* !dbg 的文本 IR，行号在 !DILocation 里；插完之后 -cc1 -emit-obj 把它   */
  /* 当普通 IR 输入编译回对象文件，链接时加 --allow-undefined，             */
  /* __pg_trace 就变成模块的一个 env 导入，运行时由 JS 侧拿到行号。        */
  /* 插桩只针对用户自己源文件里的函数：内联进来的头文件代码带 inlinedAt，   */
  /* 不插；STL 一行一停的话事件量会爆掉。                                  */
  /*                                                                    */
  /* 变量值走同一条通道：-O0 下每个局部变量都有一条 llvm.dbg.declare，把    */
  /* 它的栈槽（i32* %s 这种）绑到 !DILocalVariable 上。于是在每个行桩之前   */
  /* 补若干条 load + 拆位 + call @__pg_var(id, lo, hi)，停在某行时宿主里的   */
  /* 变量表就是「这一行开始前」的值，和调试器停在行首的语义一致。           */
  /* 顺序很关键：快照必须在 __pg_trace 之前，否则停在行桩里时本行的快照      */
  /* 还没执行，看到的全是上一行的旧值。                                    */
  /*                                                                    */
  /* 数组不在这条通道上：一串元素两个 int32 装不下，而且本地数组的值           */
  /* 根本不在栈槽里 —— 槽本身就是首元素。所以每个有栈槽的变量另外发一条        */
  /* call @__pg_addr(id, 首地址, 元素字节数, 元素个数)：标量是个数 1，本地数组  */
  /* [30 x i32] 是 30 个 4 字节。宿主只把这三个数记进共享内存的地址表，元素    */
  /* 本身一个都不搬 —— 用户线性内存本来就是共享的（调试构建链 --shared-memory，*/
  /* 见 compileForDebug），主线程拿着地址直接读就行。                          */
  /* 这一条通道是观察窗能算表达式的前提：a[i] 要先有 a 的首地址、p 要先有它存   */
  /* 的那个地址，才能按类型算出偏移再去读。值留在 SSA 寄存器里的变量（-O0 下按 */
  /* 值传参才会这样）没有地址可给，就不发；引用也不发，因为槽里存的是被引用对  */
  /* 象的地址，登记成「这个变量的地址」会把 &r 算错。                          */
  /* ------------------------------------------------------------------ */
  const TRACE_FN = '__pg_trace';
  const VAR_FN = '__pg_var';
  const ADDR_FN = '__pg_addr';
  const MAX_VAR = 512;      /* 和 js/dbgproto.js 的变量槽数量保持一致 */

  /* 元数据字段：键是固定的几个，用字面量正则在模块级建一次
     （热路径每条指令都要用，反复 new RegExp 太浪费）。
     \bfile: 不会误命中 filename:，因为 file 后面必须紧跟冒号。 */
  const RE_REF = {
    file: /\bfile: !(\d+)/,
    scope: /\bscope: !(\d+)/,
    type: /\btype: !(\d+)/,
    base: /\bbaseType: !(\d+)/,
  };
  const RE_STR = {
    name: /\bname: "([^"]*)"/,
    filename: /\bfilename: "([^"]*)"/,
  };
  const RE_NUM = {
    line: /\bline: (\d+)/,
    size: /\bsize: (\d+)/,
  };
  const RE_TAG = /\btag: (\w+)/;
  const RE_ENC = /\bencoding: (\w+)/;

  /* 能直接取值的 LLVM 标量类型；指针另行处理，结构体/数组跳过。 */
  const SCALAR_TY = /^(i1|i8|i16|i32|i64|float|double)$/;

  /* llvm.dbg.declare 的第一个操作数里类型可以带空格（[4 x i32]* %arr），
     所以类型用懒惰匹配，结尾的 %xxx 才是明确的 SSA 值名。 */
  const RE_DECLARE =
    /^\s*call void @llvm\.dbg\.declare\(metadata (.+?) (%[-.\w\d]+), metadata !(\d+), metadata !DIExpression\(\)\)/;

  /* LLVM 数组类型 -> 元素个数 + 元素在内存里占几字节 + 每一维的长度。
     只吃字面量的定长数组：[30 x i32]* 是本地数组的 alloca，[2 x [3 x i32]]*
     这种多维干脆摊平成 6 个 i32（悬停里看一维序列比看嵌套更直观，实现也短）。
     dims 要留着：观察窗算 a[i][j] 的扁平下标靠的是 i*3+j，只有一个 6 出不来。
     字节数按 LLVM 类型的内存布局取，不按 DWARF 的 size 取 —— [10 x i8] 的元素
     在内存里就是 1 字节，不是 i8 提升后的 4 字节。元素类型不是标量/指针（结构体
     数组）时返回 null，照旧只报名字。 */
  const ELEM_BYTES = { i1: 1, i8: 1, i16: 2, i32: 4, i64: 8, float: 4, double: 8 };
  function arrayShape(lty) {
    let s = /\*$/.test(lty) ? lty.replace(/\*$/, '') : lty;
    const dims = [];
    let count = 1;
    for (;;) {
      const m = /^\[\s*(\d+)\s*x\s*(.+?)\s*\]$/.exec(s);
      if (!m) return null;
      dims.push(+m[1]);
      count *= +m[1];
      s = m[2];
      if (!/^\[/.test(s) && !(SCALAR_TY.test(s) || /\*$/.test(s))) return null;
      if (/^\[/.test(s)) continue;
      const bytes = SCALAR_TY.test(s) ? ELEM_BYTES[s] : 4;
      if (!bytes) return null;
      return { count: count, bytes: bytes, elemTy: s, dims: dims };
    }
  }

  function instrumentIR(irText, userFilename) {
    const lines = irText.split('\n');

    /* fflush 的指针类型要跟本模块里已有的声明对齐。用户只要用过 std::endl /
       std::flush / 同步，clang 就早生成了一条 `declare i32 @fflush(%struct...)`，
       LLVM8 用的是带类型的指针，我再用 i8* 去 call / 再 declare 一遍会撞类型、
       报重复声明。所以：扫到已有声明就沿用它的参数类型，不再补 declare；
       没有（只写 "\n" 的常见情况）就自己补一条 i8* 的。 */
    let flushArgTy = 'i8*';
    let flushAlreadyDeclared = false;
    for (const l of lines) {
      const dm = /^declare\b[^@]*@fflush\s*\(\s*([^,)\s][^,)]*?)\s*[,)]/.exec(l);
      if (dm) { flushArgTy = dm[1]; flushAlreadyDeclared = true; break; }
    }

    /* !id -> 该 id 的元数据定义文本 */
    const meta = new Map();
    for (const l of lines) {
      const m = /^!(\d+) = (.*)$/.exec(l);
      if (m) meta.set(m[1], m[2]);
    }
    const num = (def, key) => { const m = RE_REF[key].exec(def); return m ? m[1] : null; };
    const str = (def, key) => { const m = RE_STR[key].exec(def); return m ? m[1] : null; };
    const field = (def, re) => { const m = re.exec(def); return m ? m[1] : null; };
    const baseName = (p) => String(p || '').split('/').pop();
    const want = baseName(userFilename);

    /* DWARF 类型元数据 -> 主线程拿来格式化的描述。
       typedef / const / 引用一路顺着 baseType 剥到底，枚举按底层整数类型算，
       结构体、类归成 obj（只报名字，不发值）；数组标成 kind='arr' 并带上最内层
       元素类型，能不能真发出值还要看后面 arrayShape() 从 alloca 类型上读不读得到长度。 */
    const typeMemo = new Map();
    /* 一路剥到数组的最内层元素类型（数组的数组、typedef 过的数组都算） */
    function elemOf(t) {
      let e = t;
      for (let i = 0; e && e.kind === 'arr' && e.elem && i < 8; ++i) e = e.elem;
      return e || { kind: 'unknown', name: '?' };
    }
    /* 元素在内存里占几字节：标量按 DWARF 的 size（_Bool 的 size 就是 8 位，
       不是 i1 那一位），指针在 wasm32 是 4。结构体、未知类型、指向数组的指针
       一律给 0 —— 求值器看到 0 报「算不了」，比闷头算错强。 */
    function typeBytes(t) {
      if (!t) return 0;
      if (t.kind === 'ptr') return 4;
      if (t.kind === 'int' || t.kind === 'float' || t.kind === 'bool') {
        const b = (t.bits || 0) >> 3;
        return b === 1 || b === 2 || b === 4 || b === 8 ? b : 0;
      }
      return 0;
    }
    /* 类型描述要结构化克隆给主线程，顺手把字节数算好；指针的 pt 一路往下带，
       观察窗算 pp[i][j] 就是靠它一层层剥的（限 4 层，够教学用例了）。 */
    function wireTy(t, depth) {
      if (!t || depth > 4) return null;
      const o = {
        kind: t.kind, bits: t.bits || 0, signed: !!t.signed,
        name: t.name || '?', bytes: typeBytes(t),
      };
      if (t.kind === 'arr' && t.elem) o.elem = wireTy(t.elem, depth + 1);
      if (t.kind === 'ptr' && t.pt) o.pt = wireTy(t.pt, depth + 1);
      return o;
    }
    function resolveType(id, hop) {
      if (!id) return { kind: 'unknown', name: '?' };
      if (typeMemo.has(id)) return typeMemo.get(id);
      if (hop > 8) return { kind: 'unknown', name: '?' };
      const def = meta.get(id) || '';
      const tag = field(def, RE_TAG);
      const nm = str(def, 'name');
      const base = num(def, 'base');
      let r;
      if (/^!DIBasicType/.test(def)) {
        const enc = field(def, RE_ENC) || '';
        const bits = +(field(def, RE_NUM.size) || 0) || 32;
        if (enc === 'DW_ATE_float') {
          r = { kind: 'float', bits: bits, name: nm || (bits === 64 ? 'double' : 'float') };
        } else if (enc === 'DW_ATE_unsigned' || enc === 'DW_ATE_unsigned_char') {
          r = { kind: 'int', bits: bits, signed: false, name: nm || 'unsigned int' };
        } else if (enc === 'DW_ATE_signed' || enc === 'DW_ATE_signed_char' || enc === 'DW_ATE_char') {
          r = { kind: 'int', bits: bits, signed: true, name: nm || 'int' };
        } else if (enc === 'DW_ATE_boolean') {
          r = { kind: 'bool', bits: bits, name: nm || 'bool' };
        } else if (enc === 'DW_ATE_UTF') {
          r = { kind: 'int', bits: bits, signed: false, name: nm || 'char' };
        } else {
          r = { kind: 'unknown', name: nm || '?' };
        }
      } else if (tag === 'DW_TAG_pointer_type') {
        /* pt 留着：*p / p[i] 能不能算、按几个字节算，全看知不知道被指向的类型。
           void* 没有 baseType，给个 unknown，求值器会明说「不知道元素类型」。 */
        const pt = base ? resolveType(base, hop + 1) : { kind: 'unknown', name: 'void' };
        r = { kind: 'ptr', bits: 32, name: (pt.name || 'void') + '*', pt: pt };
      } else if (tag === 'DW_TAG_typedef') {
        const b = base ? resolveType(base, hop + 1) : { kind: 'unknown', name: '?' };
        r = Object.assign({}, b, { alias: b.name, name: nm || b.name });
      } else if (tag === 'DW_TAG_reference_type' || tag === 'DW_TAG_rvalue_reference_type') {
        /* 引用在 -O0 下就是一个存地址的栈槽；标上 isRef，取值时多 load 一层，
           这样悬停看到的是被引用到的那个值，而不是一个地址。 */
        const b = base ? resolveType(base, hop + 1) : { kind: 'unknown', name: '?' };
        r = Object.assign({}, b, { isRef: true, name: (b.name || '?') + '&' });
      } else if (tag === 'DW_TAG_const_type' || tag === 'DW_TAG_volatile_type') {
        r = base ? resolveType(base, hop + 1) : { kind: 'unknown', name: nm || '?' };
      } else if (tag === 'DW_TAG_enumeration_type') {
        const b = base ? resolveType(base, hop + 1) : null;
        r = {
          kind: 'int',
          bits: b && b.bits ? b.bits : 32,
          signed: !b || b.signed !== false,
          name: nm || 'enum',
        };
      } else if (tag === 'DW_TAG_array_type') {
        const raw = base ? resolveType(base, hop + 1) : { kind: 'unknown', name: '?' };
        /* 多维数组一路剥到最内层元素：[2 x [3 x i32]] 当 6 个 int 铺开看，比在
           tooltip 里再嵌一层括号有用，实现也短（长度由 alloca 的类型相乘得出）。
           只有标量/指针/布尔元素能展开，结构体数组照旧归 obj。 */
        const e = elemOf(raw);
        const dumpable = e.kind === 'int' || e.kind === 'float' || e.kind === 'bool' || e.kind === 'ptr';
        r = dumpable
          ? { kind: 'arr', elem: e, name: (e.name || '?') + '[]' }
          : { kind: 'obj', name: (raw.name || e.name || '?') + '[]' };
      } else if (tag === 'DW_TAG_structure_type' || tag === 'DW_TAG_class_type'
        || tag === 'DW_TAG_union_type') {
        r = { kind: 'obj', name: nm || (tag || '').replace('DW_TAG_', '') };
      } else {
        r = { kind: 'unknown', name: nm || '?' };
      }
      typeMemo.set(id, r);
      return r;
    }

    /* 函数 -> 是否属于用户源文件 */
    const fnIsUser = new Map();
    const locLine = new Map();
    for (let i = 0; i < lines.length; ++i) {
      const d = /^define\b/.exec(lines[i]);
      if (!d) continue;
      const m = /!dbg !(\d+)/.exec(lines[i]);
      let user = false;
      if (m) {
        const sub = meta.get(m[1]) || '';
        const name = str(sub, 'name') || '';
        if (!/^_GLOBAL__sub_I/.test(name)) {
          const f = num(sub, 'file');
          const fd = f ? meta.get(f) : null;
          user = !!fd && baseName(str(fd, 'filename')) === want;
        }
      }
      fnIsUser.set(i, user);
    }
    const lineOfLoc = (id) => {
      if (!locLine.has(id)) {
        const def = meta.get(id) || '';
        const m = RE_NUM.line.exec(def);
        /* inlinedAt 说明这行是头文件里内联过来的，不是用户写的那一行 */
        locLine.set(id, (m && !def.includes('inlinedAt:')) ? +m[1] : 0);
      }
      return locLine.get(id);
    };

    /* ---- 局部变量表：函数（按 define 的行号）-> 变量 id 列表 ---- */
    const vars = [];
    const fnVars = new Map();
    {
      let fid = -1, ufn = false;
      for (let i = 0; i < lines.length; ++i) {
        const text = lines[i];
        if (/^define\b/.test(text)) { ufn = !!fnIsUser.get(i); fid = i; continue; }
        if (/^}/.test(text)) { ufn = false; fid = -1; continue; }
        if (!ufn) continue;
        const m = RE_DECLARE.exec(text);
        if (!m) continue;
        const lty = m[1].trim();
        const val = m[2];
        const def = meta.get(m[3]) || '';
        const name = str(def, 'name');
        const lm = RE_NUM.line.exec(def);
        const line = lm ? +lm[1] : 0;
        if (!name || !line || vars.length >= MAX_VAR) continue;
        const typeId = num(def, 'type');
        const t = resolveType(typeId, 0);
        const id = vars.length;
        const rec = {
          id: id, name: name, line: line, fn: fid, lty: lty, val: val,
          kind: t.kind, bits: t.bits || 0, signed: !!t.signed,
          isRef: !!t.isRef, tname: t.name,
        };
        if (t.kind === 'arr') {
          const sh = arrayShape(lty);
          const e = t.elem || {};
          rec.ekind = e.kind || 'unknown';
          rec.ebits = e.bits || 32;
          rec.esigned = !!e.signed;
          rec.ename = e.name || '?';
          /* 元素自己的字节数：标量数组直接由 ebits 推，指针元素是 4。
             求值器算 a[i] 的地址靠的是它，不再回 LLVM 类型里翻一遍。 */
          rec.ebytes = e.kind === 'ptr' ? 4 : ((e.bits || 0) >> 3) || 0;
          /* 完整的元素类型（带 pt 链）：`int *q[4]` 里 q[0][1] 要往下再剥一层，
             光靠 ekind/ebits 那几个散字段是断的。wireTy 出来的是结构化克隆安全
             的普通对象，直接跟着变量表递回主线程。 */
          rec.et = wireTy(e, 0);
          rec.acount = sh ? sh.count : 0;
          rec.abytes = sh ? sh.bytes : 0;
          rec.adims = sh ? sh.dims : null;
          /* 类型名带上真实长度：悬停/观察窗里 `a : int[30]` 比 `int[]` 有用，
             多维写成 int[2][3]，跟源码里的声明对得上 */
          if (sh) rec.tname = rec.ename + sh.dims.map((d) => '[' + d + ']').join('');
        } else if (t.kind === 'ptr') {
          /* 指针带上被指向的类型：*p / p[i] / pp[i][j] 都要按它算字节宽度。 */
          rec.pt = wireTy(t.pt || null, 0);
        }
        vars.push(rec);
        if (!fnVars.has(fid)) fnVars.set(fid, []);
        fnVars.get(fid).push(id);
      }
    }

    const out = [];
    const traced = new Set();
    const lineVars = new Map();   /* 行号 -> 这一行快照过的变量 id 集合 */
    let tmp = 0;                  /* 临时 SSA 值编号，全模块唯一 */
    let userFn = false;
    let fnId = -1;
    let blockLine = 0;      /* 当前基本块里最后一次插桩的行 */
    let pending = 0;        /* 因为块首必须是 phi 而推迟的插桩行 */
    let usedFlush = false;  /* 是否插过 fflush —— 决定要不要补那条 declare */
    let usedAddr = false;   /* 是否插过地址快照 —— 决定要不要补 __pg_addr 的 declare */

    /* phi / landingpad 这类指令按 LLVM 文本格式必须排在同块其它指令前面，
       插桩只能往后压到第一条普通指令之前。只看操作符位置，避免把
       用户变量名里的 "phi" 误判成指令。 */
    const mustStayFirst = (s) =>
      /^\s*(?:landingpad|catchpad|cleanuppad|catchswitch|token)\b/.test(s)
      || /=\s*phi\b/.test(s);

    /* 把某个变量的当前值压成两个 i32（标量）或一段内存（数组）交给宿主；
       取不了值就返回 null。 */
    /* 这个变量在内存里怎么摆：本地数组的 alloca 本身就是首元素（若干个元素），
       标量和指针是栈槽里放一个值。字节数按 LLVM 类型的内存布局取，不按 DWARF 的
       size 取。给不出字节数的（结构体、long double、值留在寄存器里的形参）返回
       null —— 连地址都不发，宁缺毋滥。引用也归 null：槽里存的是被引用对象的地址，
       把它登记成「这个变量自己的地址」会把 &r 算错。 */
    function addrShape(v) {
      if (v.isRef || !/\*$/.test(v.lty)) return null;
      if (v.kind === 'arr') return v.acount && v.abytes ? { bytes: v.abytes, count: v.acount } : null;
      const b = ELEM_BYTES[v.lty.replace(/\*$/, '')] || (/\*$/.test(v.lty.replace(/\*$/, '')) ? 4 : 0);
      return b ? { bytes: b, count: 1 } : null;
    }

    function varRecord(v, line) {
      if (v.kind === 'obj' || v.kind === 'unknown') return null;
      const code = [];
      /* 地址通道。本地数组登记 [首元素地址, 元素字节数, 元素个数]（load 一个
         [30 x i32] 本来也不是合法指令）；标量和指针登记 [栈槽地址, 字节数, 1]。
         宿主只记这三个数，元素一个都不搬，主线程按地址读共享内存 —— 观察窗算
         a[i]、&a[i]、*p 的前提就是这条地址。长度从 alloca 的类型里读出来的才有，
         形参 int a[] 退化成指针槽、长度 unknown，就不发。 */
      const ab = addrShape(v);
      if (ab) {
        const a = `%pga${tmp++}`;
        code.push(`  ${a} = ptrtoint ${v.lty} ${v.val} to i32`);
        code.push(`  call void @${ADDR_FN}(i32 ${v.id}, i32 ${a}, i32 ${ab.bytes},`
          + ` i32 ${ab.count})`);
        usedAddr = true;
      }
      if (v.kind === 'arr') return code;
      const n = tmp++;
      let valTy, valRef;
      if (/\*$/.test(v.lty)) {
        /* 变量住在栈槽里：先把它 load 出来 */
        valTy = v.lty.replace(/\*$/, '');
        valRef = `%pgv${n}`;
        code.push(`  ${valRef} = load ${valTy}, ${v.lty} ${v.val}`);
      } else {
        /* 值本来就在 SSA 寄存器里（-O0 下按值传参才会这样） */
        valTy = v.lty;
        valRef = v.val;
      }
      if (v.isRef && /\*$/.test(valTy)) {
        /* 引用：槽里存的是被引用对象的地址，再 load 一层才是值本身 */
        const inner = valTy.replace(/\*$/, '');
        if (SCALAR_TY.test(inner) || /\*$/.test(inner)) {
          const r = `%pgr${n}`;
          code.push(`  ${r} = load ${inner}, ${valTy} ${valRef}`);
          valTy = inner;
          valRef = r;
        }
      }
      let lo, hi = '0';
      if (SCALAR_TY.test(valTy)) {
        if (valTy === 'i32') {
          lo = valRef;
        } else if (valTy === 'i1' || valTy === 'i8' || valTy === 'i16') {
          lo = `%pgl${n}`;
          code.push(`  ${lo} = zext ${valTy} ${valRef} to i32`);
        } else if (valTy === 'i64') {
          lo = `%pgl${n}`; hi = `%pgh${n}`;
          code.push(`  ${lo} = trunc i64 ${valRef} to i32`);
          code.push(`  %pgs${n} = lshr i64 ${valRef}, 32`);
          code.push(`  ${hi} = trunc i64 %pgs${n} to i32`);
        } else if (valTy === 'float') {
          lo = `%pgl${n}`;
          code.push(`  ${lo} = bitcast float ${valRef} to i32`);
        } else {
          lo = `%pgl${n}`; hi = `%pgh${n}`;
          code.push(`  %pgb${n} = bitcast double ${valRef} to i64`);
          code.push(`  ${lo} = trunc i64 %pgb${n} to i32`);
          code.push(`  %pgs${n} = lshr i64 %pgb${n}, 32`);
          code.push(`  ${hi} = trunc i64 %pgs${n} to i32`);
        }
      } else if (/\*$/.test(valTy)) {
        lo = `%pgl${n}`;
        code.push(`  ${lo} = ptrtoint ${valTy} ${valRef} to i32`);
      } else {
        return null;   /* 结构体、数组之类：名单里留着名字，但不发值 */
      }
      code.push(`  call void @${VAR_FN}(i32 ${v.id}, i32 ${lo}, i32 ${hi})`);
      return code;
    }

    /* 一个行边界上要插入的内容：先变量快照，再行桩 */
    function snapshot(fn, line) {
      const list = fnVars.get(fn);
      if (!list) return;
      let ids = null;
      for (const id of list) {
        const v = vars[id];
        if (v.line > line) continue;
        const code = varRecord(v, line);
        if (code) { for (const c of code) out.push(c); }
        /* obj / unknown / 长度未知的数组：发不出值，但名字要留在名单上，
           悬停和观察窗好回答「这个名字我认识，只是值给不了」。 */
        else if (v.kind !== 'obj' && v.kind !== 'unknown' && v.kind !== 'arr') continue;
        if (!ids) ids = [];
        ids.push(id);
      }
      if (!ids) return;
      if (!lineVars.has(line)) lineVars.set(line, new Set());
      const s = lineVars.get(line);
      for (const id of ids) s.add(id);
    }

    const emit = (line) => {
      snapshot(fnId, line);
      /* 停在某行之前先把程序已产生的输出冲出去。libc++ 的 std::cout 是
         sync_with_stdio(true)，数据压在 C 的 stdout 缓冲里，不 fflush 就
         要等写满 / std::endl / 程序结束才到宿主。fflush 放在行桩之前：
         执行到第 N 行、park 住的时候，1..N-1 行写过的内容已经在输出框里了。 */
      /* fflush 有返回值，必须给它一个显式的非数字名（借用 tmp 计数器，和
         变量快照的 %pgv/%pgl 同一命名空间）。裸写 `call i32 @fflush(...)`
         是个匿名值，LLVM 会自动分配 %0/%1/... 编号，跟 clang 自己写的
         `%0 = bitcast`、`%1 = load` 撞号，报 "instruction expected to be
         numbered"。__pg_trace 是 void 没这问题。 */
      const f = `%pgf${tmp++}`;
      out.push(`  ${f} = call i32 @fflush(${flushArgTy} null)`);
      usedFlush = true;
      out.push(`  call void @${TRACE_FN}(i32 ${line})`);
      traced.add(line);
      blockLine = line;
    };

    for (let i = 0; i < lines.length; ++i) {
      const text = lines[i].replace(/\s+$/, '');

      if (/^define\b/.test(text)) {
        userFn = !!fnIsUser.get(i);
        fnId = i;
        blockLine = 0; pending = 0;
        out.push(text);
        continue;
      }
      if (/^}/.test(text)) {
        /* 走到这里 pending 必然已经清零：每个块都以终结指令收尾，
           而终结指令不是 mustStayFirst，插桩在它之前就已发出。
           这里不再补发，否则会插到 ret/br 之后变成非法 IR。 */
        userFn = false; fnId = -1; blockLine = 0; pending = 0;
        out.push(text);
        continue;
      }
      if (!userFn) { out.push(text); continue; }

      /* 基本块标签（不缩进、整行只有 label:）：块内行号状态要重置 */
      if (/^\S+:$/.test(text)) { blockLine = 0; pending = 0; out.push(text); continue; }

      const m = /, !dbg !(\d+)$/.exec(text);
      if (!/^\s/.test(text) || !m) { out.push(text); continue; }
      const line = lineOfLoc(m[1]);
      if (!line) { out.push(text); continue; }

      if (pending && !mustStayFirst(text)) { emit(pending); pending = 0; }
      if (line !== blockLine) {
        if (mustStayFirst(text)) { pending = line; blockLine = line; }
        else emit(line);
      }
      out.push(text);
    }

    out.push('');
    out.push(`declare void @${TRACE_FN}(i32)`);
    if (vars.length) out.push(`declare void @${VAR_FN}(i32, i32, i32)`);
    if (usedAddr) out.push(`declare void @${ADDR_FN}(i32, i32, i32, i32)`);
    if (usedFlush && !flushAlreadyDeclared) out.push(`declare i32 @fflush(${flushArgTy})`);

    const lv = {};
    for (const [line, set] of lineVars) lv[String(line)] = [...set].sort((a, b) => a - b);
    return {
      ir: out.join('\n'),
      lines: [...traced].sort((a, b) => a - b),
      vars: vars,
      lineVars: lv,
    };
  }

  class Toolchain {
    /* options: {readBuffer(name)->ArrayBuffer, compileModule(name)->Module, onWrite(bytes)} */
    constructor(options) {
      this.options = options;
      this.moduleCache = new Map();
      this.missingImports = [];
      this.memfs = new MemFS({
        compileStreaming: options.compileModule,
        hostWrite: (bytes) => { this.writeSink(bytes); },
        memfsFilename: options.memfs || 'memfs.wasm',
      });
      this.sysrootPromise = null;
      this.ready = null;
    }

    /* 编译期输出（clang 诊断）走这里；运行期换成用户程序的通道。 */
    writeSink(bytes) {
      if (this.activeSink) this.activeSink(bytes);
      else this.options.onWrite(bytes);
    }

    setSink(fn) { this.activeSink = fn; }

    init() {
      if (this.ready) return this.ready;
      this.ready = (async () => {
        await this.memfs.ready;
        const t0 = Date.now();
        this.options.onProgress && this.options.onProgress('解压标准库头文件 sysroot.tar');
        const tar = new Tar(await this.options.readBuffer('sysroot.tar'));
        const n = tar.untar(this.memfs);
        /* 补一个 <bits/stdc++.h>，见上面 UMBRELLA_* 的说明 */
        const extra = addUmbrellaHeader(this.memfs);
        this.options.onProgress && this.options.onProgress(`已装入 ${n + extra} 个头文件/库`);
        this.sysrootFiles = n + extra;
        this.initMs = Date.now() - t0;
      })();
      return this.ready;
    }

    async getModule(name) {
      if (this.moduleCache.has(name)) return this.moduleCache.get(name);
      this.options.onProgress && this.options.onProgress(`加载 ${name}`);
      const m = await this.options.compileModule(name);
      this.moduleCache.set(name, m);
      return m;
    }

    async runTool(module, ...args) {
      const app = new WasiApp(module, this.memfs, ...args);
      this.lastToolApp = app;
      const t0 = Date.now();
      const res = await app.start();
      res.ms = Date.now() - t0;
      return res;
    }

    /* 返回 {ok, wasm:Uint8Array|null, exitCode} */
    async compileAndLink(source, opts) {
      const o = opts || {};
      const filename = o.filename || 'main.cc';
      const obj = o.obj || 'main.o';
      const out = o.output || 'main.wasm';
      const std = o.std || 'c++17';
      const level = o.optimize === undefined ? '2' : String(o.optimize);
      const stackSize = o.stackSize || 8 * 1024 * 1024;
      const extra = (o.flags || [])
        .join(' ').trim().split(/\s+/).filter((s) => s && s !== '-cc1');

      await this.init();
      this.memfs.addFile(filename, textEncoder.encode(source));

      const clang = await this.getModule(o.clang || 'clang.wasm');
      const cc1 = [
        'clang', '-cc1', '-emit-obj',
        ...CLANG_COMMON,
        `-std=${std}`,
        `-triple=wasm32-wasi`,
        `-O${level}`,
        ...extra,
        '-o', obj, '-x', 'c++', filename,
      ];
      const cres = await this.runTool(clang, ...cc1);
      if (cres.code !== 0 || !this.memfs.hasFile(obj)) {
        return { ok: false, phase: 'compile', exitCode: cres.code, wasm: null };
      }

      const lld = await this.getModule(o.lld || 'lld.wasm');
      const lres = await this.link(obj, out, stackSize, lld);
      if (lres.code !== 0 || !this.memfs.hasFile(out)) {
        return { ok: false, phase: 'link', exitCode: lres.code, wasm: null };
      }
      return { ok: true, wasm: this.memfs.getFileContents(out), exitCode: 0 };
    }

    /* 链接：正常路径和调试路径共用，调试路径多给一个 --allow-undefined，
       让 __pg_trace 落到模块的 env 导入上，由运行侧的 JS 实现。 */
    async link(obj, out, stackSize, lld, extraLd = []) {
      const libdir = 'lib/wasm32-wasi';
      /* libc++.a 里的 long double / 128 位比较会引用 __lttf2/__getf2 这类
         compiler-rt 符号，必须显式链上 builtins 库。 */
      const builtins = 'lib/clang/8.0.1/lib/wasi';
      const ldArgs = [
        'wasm-ld', '--no-threads', '--export-dynamic',
        ...extraLd,
        '-z', `stack-size=${stackSize}`,
        `-L${libdir}`, `-L${builtins}`,
        `${libdir}/crt1.o`, obj,
        '-lc', '-lc++', '-lc++abi', '-lcanvas',
        '-lclang_rt.builtins-wasm32',
        '-o', out,
      ];
      if (!lld) lld = await this.getModule('lld.wasm');
      return await this.runTool(lld, ...ldArgs);
    }

    /* 可调试构建：源码 -> 文本 IR -> 行插桩 + 变量快照 -> 对象 -> 链接。
       返回 {ok, phase, exitCode, wasm, lines, vars, lineVars}：
       lines 是插了桩的源码行号，vars/lineVars 是变量表和「哪行快照了哪些变量」。 */
    async compileForDebug(source, opts) {
      const o = opts || {};
      const filename = o.filename || 'main.cc';
      const obj = o.obj || 'main.dbg.o';
      const irFile = 'main.dbg.ll';
      const instrFile = 'main.instr.ll';
      const out = o.output || 'main.dbg.wasm';
      const std = o.std || 'c++17';
      const stackSize = o.stackSize || 8 * 1024 * 1024;
      const extra = (o.flags || [])
        .join(' ').trim().split(/\s+/).filter((s) => s && s !== '-cc1');

      await this.init();
      this.memfs.addFile(filename, textEncoder.encode(source));

      const clang = await this.getModule(o.clang || 'clang.wasm');
      /* -emit-llvm 单用（不带 -S）出的是文本 IR；带上 -S 反而变成 wasm 汇编。
         行号来自 -debug-info-kind=standalone，cc1 不认 -g。
         插桩构建必须 -O0：优化会把行边界抹掉、语句重排，高亮会乱跳。 */
      const emitIR = [
        'clang', '-cc1', '-emit-llvm',
        '-debug-info-kind=standalone',
        ...CLANG_COMMON,
        `-std=${std}`,
        '-triple=wasm32-wasi',
        '-O0',
        ...extra,
        '-o', irFile, '-x', 'c++', filename,
      ];
      const cres = await this.runTool(clang, ...emitIR);
      if (cres.code !== 0 || !this.memfs.hasFile(irFile)) {
        return { ok: false, phase: 'compile', exitCode: cres.code, wasm: null };
      }

      const irText = new TextDecoder('utf-8').decode(this.memfs.getFileContents(irFile));
      const instr = instrumentIR(irText, filename);
      if (!instr.lines.length) {
        return { ok: false, phase: 'instrument', exitCode: 0, wasm: null };
      }
      this.memfs.addFile(instrFile, textEncoder.encode(instr.ir));

      const ores = await this.runTool(clang,
        'clang', '-cc1', '-emit-obj', '-triple=wasm32-wasi', '-O0',
        '-o', obj, instrFile);
      if (ores.code !== 0 || !this.memfs.hasFile(obj)) {
        return { ok: false, phase: 'compile', exitCode: ores.code, wasm: null };
      }

      const lld = await this.getModule(o.lld || 'lld.wasm');
      /* 调试构建链成共享内存：数组展开和观察窗的表达式（a[i]、*p）都要由宿主
         按地址读用户内存，只有内存是 shared 的，它的 buffer 才是一块
         SharedArrayBuffer，才跨得到主线程去。普通「编译并运行」不走这里，链的
         还是私有内存，不受影响（也没有跨源隔离的要求）。
         代价有两条，都得记着：
           1) grow 会换成一个新的 SAB，旧对象既不 detach 也不清零 —— 所以
              Memory.check() 只能按对象身份判断，别改回看 byteLength；
           2) 共享内存模块只能在跨源隔离的上下文里实例化，而 doDebug() 本来就先
              查过 dbgSupported()，没有 SAB 根本走不到这一步。
         --max-memory 只要大于初始内存就行，取栈大小四倍、下限 256 MB、向上对齐
         到 64 KB 一页（这份 wasm-ld 不认 --import-shared-memory，只能让它自己
         定义这块共享内存再导出）。 */
      const shmMax = Math.max(256 * 1024 * 1024, stackSize * 4, 64 * 1024 * 1024);
      const lres = await this.link(obj, out, stackSize, lld, [
        '--allow-undefined', '--shared-memory',
        `--max-memory=${Math.ceil(shmMax / 65536) * 65536}`,
      ]);
      if (lres.code !== 0 || !this.memfs.hasFile(out)) {
        return { ok: false, phase: 'link', exitCode: lres.code, wasm: null };
      }
      return {
        ok: true, wasm: this.memfs.getFileContents(out),
        lines: instr.lines, exitCode: 0,
        vars: instr.vars, lineVars: instr.lineVars,
      };
    }
  }

  global.WasmClang = {
    Toolchain, MemFS, WasiApp, Tar, Memory, ProcExit, NotImplemented, AbortError,
    textEncoder, instrumentIR, TRACE_FN,
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
