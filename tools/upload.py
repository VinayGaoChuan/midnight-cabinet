import http.server, pathlib, base64, sys
OUT = pathlib.Path(__file__).resolve().parent.parent / '.ai' / 'shots'
OUT.mkdir(parents=True, exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Private-Network', 'true')
    def do_POST(self):
        n = int(self.headers['Content-Length']); body = self.rfile.read(n).decode()
        name = pathlib.Path(self.path.strip('/')).name or 'shot.png'
        data = body.split(',', 1)[1] if body.startswith('data:') else body
        (OUT / name).write_bytes(base64.b64decode(data))
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 18932), H).serve_forever()
