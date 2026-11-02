# cpp-in-browser
C++ fast and dirty IDE in browser by Qoder 

## 已知限制

- 工具链是 LLVM 8 年代的 clang + libc++（不是 GCC/libstdc++）；`<bits/stdc++.h>` 与 C++20 的 `<concepts>`、`<ranges>`、`<format>`、`<coroutine>` 不存在。
- 文件系统是空的内存 FS：`std::filesystem` 基本不可用，没有真实磁盘。
- `std::thread` 需要 SharedArrayBuffer + 跨源隔离，此页未启用；单线程程序不受影响。
- 超时靠 `worker.terminate()` 实现，能杀掉死循环，但拿不到精确 CPU 时间。
- wasm 线性内存无法由宿主设上限；超分会以 `memory access out of bounds` 报出。
- `system()`、`fork()`、管道一类进程 API 不存在。
