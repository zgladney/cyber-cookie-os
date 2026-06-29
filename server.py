#!/usr/bin/env python3
"""
CyberCookieOS Local Server
Serves static files + handles /api/* routes for config, documents, and data sources.
No external dependencies — uses Python standard library only.

Run: python server.py
Then open: http://localhost:3000/hallway/index.html

SECURITY NOTE: This server is for LOCAL use only (localhost).
Never expose it to the internet. Tokens and credentials belong
in data/tokens/ (gitignored) or .env (gitignored), never in
JSON files that the frontend can read.
"""

import http.server
import json
import os
import sys
import urllib.parse
from datetime import datetime

PORT = 3000
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, 'data')


# ── JSON helpers ─────────────────────────────────────────────────────────────

def load_json(relative_path, default=None):
    full = os.path.join(DATA_DIR, relative_path)
    try:
        with open(full, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default if default is not None else {}


def save_json(relative_path, data):
    full = os.path.join(DATA_DIR, relative_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def ts():
    return datetime.now().isoformat()


# ── Request handler ───────────────────────────────────────────────────────────

class COSHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ── CORS + routing ────────────────────────────────────────────────────────

    def do_OPTIONS(self):
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/'):
            params = dict(urllib.parse.parse_qsl(parsed.query))
            self._api_get(parsed.path, params)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/'):
            length = int(self.headers.get('Content-Length', 0))
            try:
                body = json.loads(self.rfile.read(length)) if length else {}
            except json.JSONDecodeError:
                return self._send(400, {'error': 'Invalid JSON body'})
            self._api_post(parsed.path, body)
        else:
            self._send(405, {'error': 'Method not allowed on non-API routes'})

    # ── GET routes ────────────────────────────────────────────────────────────

    def _api_get(self, path, params):

        if path == '/api/config':
            self._send(200, load_json('company_config.json'))

        elif path == '/api/documents':
            self._send(200, load_json('documents/index.json', {'documents': []}))

        elif path == '/api/data-sources':
            self._send(200, load_json('data_sources.json', {'sources': []}))

        elif path == '/api/permissions':
            # Permission definitions are safe to expose (no secrets)
            self._send(200, load_json('permissions.json', {'agents': {}}))

        elif path == '/api/check-permission':
            # GET /api/check-permission?agent=nova&action=submit_application
            agent = params.get('agent', '')
            action = params.get('action', '')
            perms = load_json('permissions.json', {'agents': {}})
            agent_perms = perms.get('agents', {}).get(agent, {})
            needs_approval = action in agent_perms.get('requires_approval', [])
            can_execute = action in agent_perms.get('can', [])
            self._send(200, {
                'agent': agent,
                'action': action,
                'requires_approval': needs_approval,
                'can_execute': can_execute,
                'unknown_action': not needs_approval and not can_execute
            })

        elif path == '/api/connections':
            # Status only — no tokens ever leave the server
            conns = load_json('connections.json', [])
            self._send(200, {'connections': conns})

        elif path == '/api/status':
            # Data readiness per department
            sources = load_json('data_sources.json', {'sources': []}).get('sources', [])
            dept_status = {}
            depts = ['career', 'finance', 'security', 'productivity', 'commerce', 'global']
            for d in depts:
                dept_sources = [s for s in sources if s.get('department') == d]
                if not dept_sources:
                    dept_status[d] = 'simulated'
                    continue
                connected = sum(1 for s in dept_sources if s.get('status') in ('connected', 'configured'))
                if connected == 0:
                    dept_status[d] = 'simulated'
                elif connected == len(dept_sources):
                    dept_status[d] = 'real'
                else:
                    dept_status[d] = 'partial'
            self._send(200, {'status': dept_status, 'checked_at': ts()})

        else:
            self._send(404, {'error': 'Unknown API route: ' + path})

    # ── POST routes ───────────────────────────────────────────────────────────

    def _api_post(self, path, body):

        if path == '/api/documents/register':
            index = load_json('documents/index.json', {'documents': []})
            doc = {
                'id': body.get('id') or 'doc_' + str(int(datetime.now().timestamp())),
                'filename': body.get('filename', ''),
                'type': body.get('type', 'unknown'),
                'department': body.get('department', 'global'),
                'description': body.get('description', ''),
                'tags': body.get('tags', []),
                'uploaded_at': ts(),
                'last_used_at': None,
                'status': 'registered'
            }
            index['documents'] = [d for d in index.get('documents', []) if d.get('id') != doc['id']]
            index['documents'].append(doc)
            save_json('documents/index.json', index)
            self._send(200, {'ok': True, 'document': doc})

        elif path == '/api/documents/remove':
            doc_id = body.get('id', '')
            if not doc_id:
                return self._send(400, {'error': 'id required'})
            index = load_json('documents/index.json', {'documents': []})
            before = len(index.get('documents', []))
            index['documents'] = [d for d in index.get('documents', []) if d.get('id') != doc_id]
            save_json('documents/index.json', index)
            self._send(200, {'ok': True, 'removed': before - len(index['documents'])})

        elif path == '/api/documents/tag':
            doc_id = body.get('id', '')
            tags = body.get('tags', [])
            if not doc_id:
                return self._send(400, {'error': 'id required'})
            index = load_json('documents/index.json', {'documents': []})
            updated = False
            for d in index.get('documents', []):
                if d.get('id') == doc_id:
                    d['tags'] = tags
                    updated = True
            save_json('documents/index.json', index)
            self._send(200, {'ok': True, 'updated': updated})

        elif path == '/api/config/update':
            config = load_json('company_config.json', {})
            dept = body.get('department', '')
            updates = body.get('data', {})
            if not updates:
                return self._send(400, {'error': 'data field required'})
            if dept:
                if dept not in config:
                    config[dept] = {}
                config[dept].update(updates)
            else:
                config.update(updates)
            config['_updated'] = ts()
            save_json('company_config.json', config)
            self._send(200, {'ok': True, 'updated': dept or 'global'})

        elif path == '/api/data-sources/update':
            source_id = body.get('source_id', '')
            if not source_id:
                return self._send(400, {'error': 'source_id required'})
            ds = load_json('data_sources.json', {'sources': []})
            updated = False
            for s in ds.get('sources', []):
                if s.get('source_id') == source_id:
                    if 'status' in body:
                        s['status'] = body['status']
                    if 'notes' in body:
                        s['notes'] = body['notes']
                    s['last_checked'] = ts()
                    updated = True
            ds['_updated'] = ts()
            save_json('data_sources.json', ds)
            self._send(200, {'ok': True, 'updated': updated})

        else:
            self._send(404, {'error': 'Unknown API route: ' + path})

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _cors(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:' + str(PORT))
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:' + str(PORT))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Suppress 200/304 noise for static files; show all API calls
        if args and str(args[1]) in ('200', '304'):
            if '/api/' not in str(args[0]):
                return
        super().log_message(fmt, *args)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    try:
        from http.server import ThreadingHTTPServer
        ServerClass = ThreadingHTTPServer
    except ImportError:
        ServerClass = http.server.HTTPServer

    with ServerClass(('', PORT), COSHandler) as httpd:
        print('CyberCookieOS Server')
        print('  App:   http://localhost:{}/hallway/index.html'.format(PORT))
        print('  API:   http://localhost:{}/api/status'.format(PORT))
        print()
        print('Press Ctrl+C to stop.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
            sys.exit(0)
