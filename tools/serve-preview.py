#!/usr/bin/env python3
"""Local static preview; read omitted sparse-checkout assets from Git on demand."""
import mimetypes
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/marvel-updated-trailer-preview-cache')
CACHE.mkdir(exist_ok=True)
READS = threading.Semaphore(3)
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('model/gltf-binary', '.glb')


def resolve_asset(name):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or any(p.startswith('.') for p in Path(name).parts):
        return None
    if path.is_file():
        return path
    with READS:
        item = subprocess.run(['git', '-C', str(ROOT), 'ls-tree', 'HEAD', '--', name],
                              capture_output=True, text=True, check=True).stdout.strip()
        if not item or '\t' not in item or item.split('\t', 1)[0].split()[1] != 'blob':
            return None
        blob = item.split('\t', 1)[0].split()[2]
        cached = CACHE / blob
        if not cached.exists():
            fd, pending = tempfile.mkstemp(dir=CACHE)
            try:
                with os.fdopen(fd, 'wb') as out:
                    subprocess.run(['git', '-C', str(ROOT), 'cat-file', 'blob', blob],
                                   stdout=out, check=True)
                os.replace(pending, cached)
            finally:
                if os.path.exists(pending):
                    os.unlink(pending)
        return cached


class Preview(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.serve(False)

    def do_GET(self):
        self.serve(True)

    def serve(self, body):
        name = unquote(urlsplit(self.path).path).lstrip('/')
        if not name or name.endswith('/'):
            name += 'index.html'
        if name == '__review/PAYMENT_TEST_WORKFLOW.html':
            path = Path('/home/jaxon/marvel-launch-readiness-20261108/PAYMENT_TEST_WORKFLOW.html')
        else:
            path = resolve_asset(name)
        if path is None or not path.is_file():
            self.send_error(404)
            return
        size = path.stat().st_size
        start, end = 0, size - 1
        partial = self.headers.get('Range')
        if partial:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', partial.strip())
            if not match or not any(match.groups()):
                self.send_error(416)
                return
            a, b = match.groups()
            if a:
                start = int(a)
                end = min(int(b), size - 1) if b else size - 1
            else:
                start = max(0, size - int(b))
            if start > end or start >= size:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return
        self.send_response(206 if partial else 200)
        self.send_header('Content-Type', mimetypes.guess_type(name)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        if partial:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        if body:
            try:
                with path.open('rb') as source:
                    source.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        block = source.read(min(256 * 1024, remaining))
                        if not block:
                            break
                        self.wfile.write(block)
                        remaining -= len(block)
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == '__main__':
    print('Marvel preview: http://127.0.0.1:8768/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8768), Preview).serve_forever()
