#!/usr/bin/env python3
# One-shot file receiver so the browser can hand us encoded GIF bytes directly,
# without routing the base64 through the model's context. POST base64 body to
# /save?name=foo.gif  ->  writes assets/foo.gif
from http.server import BaseHTTPRequestHandler, HTTPServer
import base64, urllib.parse, os

DIR = os.path.dirname(os.path.abspath(__file__))

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')

    def do_OPTIONS(self):
        self.send_response(204); self._cors()
        self.send_header('Access-Control-Allow-Headers', '*'); self.end_headers()

    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        name = urllib.parse.parse_qs(q.query).get('name', ['out.bin'])[0]
        n = int(self.headers.get('Content-Length', 0))
        raw = base64.b64decode(self.rfile.read(n))
        path = os.path.join(DIR, os.path.basename(name))
        with open(path, 'wb') as f:
            f.write(raw)
        self.send_response(200); self._cors(); self.end_headers()
        self.wfile.write(f'ok {len(raw)} -> {name}'.encode())
        print(f'wrote {name}: {len(raw)} bytes', flush=True)

    def log_message(self, *a):
        pass

print('recv on 127.0.0.1:8901', flush=True)
HTTPServer(('127.0.0.1', 8901), H).serve_forever()
