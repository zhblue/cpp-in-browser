#!/usr/bin/env python3
"""
serve.py — 本地静态服务器（file:// 无法加载 Worker 和 wasm，必须走 http）

    python3 serve.py 8000

assets/ 下的 60 MB 工具链设了长缓存，第二次打开页面基本秒就绪。
生产部署请再叠一层 gzip/brotli（实测 gzip -9：clang.wasm 10.5 MB、lld.wasm 6.7 MB、
sysroot.tar 1.8 MB，合计 60.3 MB -> 19.1 MB）。

响应里带了 COOP/COEP 两个头，用来开启跨源隔离 —— 单步调试需要 SharedArrayBuffer 和
Atomics.wait 才能把执行停在某一行上。本页全部资源同源，所以 require-corp 不会挡加载；
如果以后把 assets 挪到 CDN，对方必须回 CORP 头，否则要改成 credentialless 或去掉这两个头。
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

mimetypes_add = {'.wasm': 'application/wasm', '.tar': 'application/octet-stream'}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in mimetypes_add:
            return mimetypes_add[ext]
        return super().guess_type(path)

    def end_headers(self):
        clean = self.path.split('?')[0]
        if clean.startswith('/assets/') or clean.startswith('/vendor/'):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        else:
            self.send_header('Cache-Control', 'no-cache')
        # 跨源隔离：页面需要 SharedArrayBuffer 才能实现真断点/单步
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('  %s\n' % (fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        print(f'cpp-wasm-playground  ->  http://127.0.0.1:{PORT}/index.html')
        print('Ctrl+C 停止')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
