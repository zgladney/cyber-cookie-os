#!/usr/bin/env python3
"""
CyberCookieOS — Local Development Server

Usage:
    python server.py

Routes:
    Static files          GET  /*
    Housing Scout         POST /api/housing/scout
    Auth status           GET  /api/auth/status
    Start OAuth flow      GET  /api/auth/{service}/start
    OAuth callback        GET  /api/auth/{service}/callback
    Disconnect service    POST /api/auth/{service}/disconnect

Supported service keys:
    google_calendar  gmail  google_drive  github  etsy  tiktok
    housing_sources  finance

Security:
    OAuth tokens are stored in data/tokens/ (backend only — gitignored).
    Tokens are NEVER sent to the frontend. The frontend only sees
    connection status (connected / not_connected / configured).
    Credentials must be placed in .env (copied from .env.example).
"""

import datetime
import http.server
import json
import os
import socket
import socketserver
import subprocess
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from urllib.parse import urlparse

PORT     = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
URL      = f"http://localhost:{PORT}/hq/index.html"

CONNECTIONS_FILE = os.path.join(BASE_DIR, 'data', 'connections.json')
_connections_lock = threading.Lock()


# ── Environment loader ────────────────────────────────────────────────────────

def load_env(path=None):
    """Load .env file into os.environ — no python-dotenv required."""
    if path is None:
        path = os.path.join(BASE_DIR, '.env')
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            key   = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


# ── Service registry ──────────────────────────────────────────────────────────

AUTH_SERVICES = {
    'google_calendar': {
        'name': 'Google Calendar',
        'type': 'google_oauth',
        'scopes': [
            'openid', 'email', 'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
        ],
        'implemented': True,
    },
    'gmail': {
        'name': 'Gmail',
        'type': 'google_oauth',
        'scopes': [
            'openid', 'email', 'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
        ],
        'implemented': True,
    },
    'google_drive': {
        'name': 'Google Drive',
        'type': 'google_oauth',
        'scopes': [
            'openid', 'email', 'profile',
            'https://www.googleapis.com/auth/drive.readonly',
        ],
        'implemented': True,
    },
    'github': {
        'name': 'GitHub',
        'type': 'github_oauth',
        'scopes': ['repo', 'read:security_events'],
        'implemented': False,
    },
    'etsy': {
        'name': 'Etsy',
        'type': 'etsy_oauth',
        'scopes': ['listings_r', 'listings_w', 'transactions_r'],
        'implemented': False,
    },
    'tiktok': {
        'name': 'TikTok',
        'type': 'tiktok_oauth',
        'scopes': ['video.list', 'hashtag.search'],
        'implemented': False,
    },
    'housing_sources': {
        'name': 'Housing Sources',
        'type': 'local_config',
        'scopes': [],
        'implemented': True,
    },
    'finance': {
        'name': 'Finance / Budget',
        'type': 'local_storage',
        'scopes': [],
        'implemented': True,
    },
}


# ── Connection state helpers ──────────────────────────────────────────────────

def _read_connections():
    """Read connections.json. Caller should hold _connections_lock."""
    try:
        with open(CONNECTIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _write_connections(connections):
    """Write connections.json. Caller should hold _connections_lock."""
    os.makedirs(os.path.dirname(CONNECTIONS_FILE), exist_ok=True)
    with open(CONNECTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(connections, f, indent=2, ensure_ascii=False)


# ── Request Handler ───────────────────────────────────────────────────────────

class CyberCookieHandler(http.server.SimpleHTTPRequestHandler):
    """Extends SimpleHTTPRequestHandler with API routes for agent triggers."""

    # ── GET routing ───────────────────────────────────────────────────────────

    def do_GET(self):
        path  = urlparse(self.path).path
        parts = path.split('/')  # e.g. ['', 'api', 'auth', 'google_calendar', 'start']
        print('[GET] ' + path)

        # ── Auth routes (must be checked before static fallback) ──────────────
        if path == '/api/auth/status':
            self._handle_auth_status()
            return

        if len(parts) >= 4 and parts[1] == 'api' and parts[2] == 'auth':
            service = parts[3] if len(parts) > 3 else ''
            action  = parts[4] if len(parts) > 4 else ''
            if action == 'start':
                self._handle_auth_start(service)
                return
            if action == 'callback':
                self._handle_auth_callback(service)
                return

        # ── Guard: never let /api/ paths fall through to static serving ───────
        if path.startswith('/api/'):
            self._send_json(404, {'error': f'Unknown API endpoint: {path}'})
            return

        super().do_GET()

    # ── POST routing ──────────────────────────────────────────────────────────

    def do_POST(self):
        path  = urlparse(self.path).path
        parts = path.split('/')

        if path == '/api/housing/scout':
            self._handle_housing_scout()
            return

        if len(parts) == 5 and parts[1] == 'api' and parts[2] == 'auth' and parts[4] == 'disconnect':
            self._handle_auth_disconnect(parts[3])
            return

        self._send_json(404, {'error': f'Unknown endpoint: {path}'})

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    # ── Auth: status ──────────────────────────────────────────────────────────

    def _handle_auth_status(self):
        """GET /api/auth/status — returns all 8 service connection statuses."""
        with _connections_lock:
            stored = _read_connections()

        stored_map = {c.get('service'): c for c in stored if c.get('service')}

        connections = []
        for key, svc in AUTH_SERVICES.items():
            entry = stored_map.get(key)
            if entry:
                connections.append(entry)
            else:
                svc_type = svc['type']
                default_status = 'configured' if svc_type in ('local_config', 'local_storage') else 'not_connected'
                connections.append({
                    'service':      key,
                    'status':       default_status,
                    'connected_at': None,
                    'last_checked': None,
                    'scopes':       [],
                    'display_name': svc['name'] if default_status == 'configured' else None,
                })

        self._send_json(200, {
            'connections': connections,
            'checked_at':  datetime.datetime.utcnow().isoformat() + 'Z',
        })

    # ── Auth: start OAuth flow ────────────────────────────────────────────────

    def _handle_auth_start(self, service):
        """GET /api/auth/{service}/start — returns OAuth redirect URL or status."""
        svc = AUTH_SERVICES.get(service)
        if svc is None:
            self._send_json(404, {'error': f'Unknown service: {service}'})
            return

        svc_type = svc['type']

        if svc_type == 'local_config':
            self._send_json(200, {
                'status':  'configured',
                'message': 'Housing Sources use the local Python scraper — no external '
                           'authentication required. Run python server.py and the '
                           'Housing Scout handles connections automatically.',
            })
            return

        if svc_type == 'local_storage':
            self._send_json(200, {
                'status':  'configured',
                'message': 'Finance data is stored locally in your browser. '
                           'No external connection or account needed.',
            })
            return

        if svc_type == 'google_oauth':
            client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
            if not client_id:
                self._send_json(200, {
                    'status':  'credentials_missing',
                    'message': 'Google OAuth credentials not configured yet. '
                               'Copy .env.example to .env, add your GOOGLE_CLIENT_ID '
                               'and GOOGLE_CLIENT_SECRET, then restart server.py. '
                               'See README for full setup instructions.',
                })
                return

            redirect_uri = f'http://localhost:{PORT}/api/auth/{service}/callback'
            params = urllib.parse.urlencode({
                'client_id':     client_id,
                'redirect_uri':  redirect_uri,
                'response_type': 'code',
                'scope':         ' '.join(svc['scopes']),
                'access_type':   'offline',
                'prompt':        'consent',
                'state':         service,
            })
            auth_url = f'https://accounts.google.com/o/oauth2/v2/auth?{params}'
            self._send_json(200, {'status': 'redirect', 'url': auth_url})
            return

        # All other services: not yet implemented
        self._send_json(200, {
            'status':  'coming_soon',
            'message': f'{svc["name"]} OAuth integration is planned but not yet '
                       f'implemented. Credentials and callback logic coming soon.',
        })

    # ── Auth: OAuth callback ──────────────────────────────────────────────────

    def _handle_auth_callback(self, service):
        """GET /api/auth/{service}/callback — exchanges code, stores token, redirects."""
        parsed  = urlparse(self.path)
        params  = dict(urllib.parse.parse_qsl(parsed.query))
        base    = '/connections/index.html'

        error = params.get('error')
        if error:
            desc = urllib.parse.quote(params.get('error_description', error))
            self._send_redirect(f'{base}?auth_error={desc}&service={service}')
            return

        code = params.get('code')
        if not code:
            self._send_redirect(f'{base}?auth_error=missing_code&service={service}')
            return

        svc = AUTH_SERVICES.get(service)
        if svc is None:
            self._send_json(404, {'error': f'Unknown service: {service}'})
            return

        if svc['type'] == 'google_oauth':
            success, msg = self._exchange_google_code(service, code)
            if success:
                self._send_redirect(f'{base}?connected={service}')
            else:
                self._send_redirect(f'{base}?auth_error={urllib.parse.quote(msg)}&service={service}')
            return

        self._send_redirect(f'{base}?auth_error=not_implemented&service={service}')

    # ── Auth: disconnect ──────────────────────────────────────────────────────

    def _handle_auth_disconnect(self, service):
        """POST /api/auth/{service}/disconnect — clears token and resets status."""
        svc = AUTH_SERVICES.get(service)
        if svc is None:
            self._send_json(404, {'error': f'Unknown service: {service}'})
            return

        # Delete token file — don't leave stale tokens sitting around
        token_file = os.path.join(BASE_DIR, 'data', 'tokens', f'{service}.json')
        if os.path.exists(token_file):
            try:
                os.remove(token_file)
            except Exception:
                pass

        svc_type   = svc['type']
        new_status = 'configured' if svc_type in ('local_config', 'local_storage') else 'not_connected'
        self._update_connection(service, new_status, clear=True)

        self._send_json(200, {
            'success': True,
            'service': service,
            'status':  new_status,
            'message': f'{svc["name"]} disconnected successfully.',
        })

    # ── Google OAuth: token exchange ──────────────────────────────────────────

    def _exchange_google_code(self, service, code):
        """Exchange Google authorization code for tokens. Returns (success, message).

        SECURITY: tokens are written to data/tokens/{service}.json on the server.
        They are never included in any API response to the frontend.
        """
        client_id     = os.environ.get('GOOGLE_CLIENT_ID', '')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
        redirect_uri  = f'http://localhost:{PORT}/api/auth/{service}/callback'

        if not client_id or not client_secret:
            return False, 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env'

        post_data = urllib.parse.urlencode({
            'code':          code,
            'client_id':     client_id,
            'client_secret': client_secret,
            'redirect_uri':  redirect_uri,
            'grant_type':    'authorization_code',
        }).encode()

        try:
            req = urllib.request.Request(
                'https://oauth2.googleapis.com/token',
                data=post_data,
                method='POST',
            )
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            with urllib.request.urlopen(req, timeout=30) as resp:
                tokens = json.loads(resp.read().decode())
        except Exception as exc:
            return False, f'Token exchange failed: {exc}'

        if 'error' in tokens:
            return False, tokens.get('error_description', tokens['error'])

        # Try to get the user's display name for the UI
        access_token = tokens.get('access_token', '')
        display_name = None
        try:
            ui_req = urllib.request.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
            )
            with urllib.request.urlopen(ui_req, timeout=15) as resp:
                userinfo = json.loads(resp.read().decode())
            display_name = userinfo.get('name') or userinfo.get('email')
        except Exception:
            pass

        # Write token file (backend-only storage — never sent to frontend)
        tokens_dir = os.path.join(BASE_DIR, 'data', 'tokens')
        os.makedirs(tokens_dir, exist_ok=True)
        token_file = os.path.join(tokens_dir, f'{service}.json')
        tokens['stored_at']    = datetime.datetime.utcnow().isoformat() + 'Z'
        tokens['service']      = service
        tokens['redirect_uri'] = redirect_uri
        try:
            with open(token_file, 'w', encoding='utf-8') as f:
                json.dump(tokens, f, indent=2)
        except Exception as exc:
            return False, f'Could not save token: {exc}'

        self._update_connection(
            service, 'connected',
            display_name=display_name,
            scopes=AUTH_SERVICES[service]['scopes'],
        )
        print(f'[Auth] {service} connected — account: {display_name or "unknown"}')
        return True, 'Connected'

    # ── Connection state update ───────────────────────────────────────────────

    def _update_connection(self, service, status, display_name=None, scopes=None, clear=False):
        """Thread-safe update of a single connection entry in connections.json."""
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        with _connections_lock:
            connections = _read_connections()
            found = False
            for c in connections:
                if c.get('service') == service:
                    c['status']       = status
                    c['last_checked'] = now
                    if display_name is not None:
                        c['display_name'] = display_name
                    if scopes is not None:
                        c['scopes'] = scopes
                    if status == 'connected':
                        c['connected_at'] = now
                    if clear:
                        c['connected_at'] = None
                        c['display_name'] = None
                        c['scopes']       = []
                    found = True
                    break
            if not found:
                connections.append({
                    'service':      service,
                    'status':       status,
                    'connected_at': now if status == 'connected' else None,
                    'last_checked': now,
                    'scopes':       scopes or [],
                    'display_name': display_name,
                })
            _write_connections(connections)

    # ── Housing Scout API ─────────────────────────────────────────────────────

    def _handle_housing_scout(self):
        length = int(self.headers.get('Content-Length', 0))
        raw    = self.rfile.read(length) if length else b'{}'
        try:
            filters = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            filters = {}

        scout_script = os.path.join(
            BASE_DIR, 'agents', 'housing_scout_v2', 'housing_scout_browser.py'
        )
        results_file = os.path.join(BASE_DIR, 'data', 'housing_scout_v2_results.json')

        if not os.path.exists(scout_script):
            self._send_json(503, {
                'success': False,
                'error': 'Housing Scout script not found at ' + scout_script,
            })
            return

        env = os.environ.copy()
        env['SCOUT_API_MODE'] = '1'
        env['SCOUT_FILTERS']  = json.dumps(filters)

        print(f'\n[API] POST /api/housing/scout — running scout (may take 1-3 min)...')
        try:
            result = subprocess.run(
                [sys.executable, '-u', scout_script],
                capture_output=True,
                text=True,
                timeout=300,
                env=env,
                cwd=BASE_DIR,
            )
            print(f'[API] Scout exit code: {result.returncode}')
            if result.returncode != 0 and result.stderr:
                print(f'[API] stderr: {result.stderr[:600]}')
        except subprocess.TimeoutExpired:
            self._send_json(504, {
                'success': False,
                'error': 'Housing Scout timed out after 5 minutes.',
            })
            return
        except FileNotFoundError:
            self._send_json(503, {
                'success': False,
                'error': 'Python interpreter not found. Check your PATH.',
            })
            return
        except Exception as exc:
            self._send_json(500, {'success': False, 'error': str(exc)})
            return

        try:
            with open(results_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
            latest = history[-1] if history else {}
        except Exception as exc:
            self._send_json(500, {
                'success': False,
                'error': f'Could not read results file: {exc}',
            })
            return

        all_raw = []
        sources_checked = 0
        for sr in latest.get('source_results', []):
            all_raw.extend(sr.get('listings', []))
            sources_checked += 1
        all_raw.extend(latest.get('manual_listings', []))

        normalized = _normalize_listings(all_raw)
        print(f'[API] Scout done — {len(all_raw)} raw, {len(normalized)} normalized listings')

        self._send_json(200, {
            'success':         True,
            'source':          'real_scout',
            'listings':        normalized,
            'total_raw':       len(all_raw),
            'sources_checked': sources_checked,
            'started_at':      latest.get('started_at'),
            'finished_at':     latest.get('finished_at'),
        })

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _send_redirect(self, url):
        self.send_response(302)
        self.send_header('Location', url)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        if len(args) > 1 and ('/api/' in fmt % args or args[1][0] in ('4', '5')):
            super().log_message(fmt, *args)


# ── Listing normalizer ────────────────────────────────────────────────────────

def _normalize_listings(raw_listings):
    """Convert scraper output dicts → frontend card format."""
    out = []
    for i, raw in enumerate(raw_listings):
        if raw.get('passes_filters') is False:
            continue
        if raw.get('source_status') == 'MANUAL_DIRECT_URL' and not raw.get('rent'):
            continue

        text  = (raw.get('raw_text') or '').strip()
        city  = raw.get('city', 'Unknown')
        ptype = raw.get('property_type', 'house')
        if ptype not in ('house', 'townhouse', 'condo', 'apartment'):
            ptype = 'house'

        out.append({
            'id':      f'scout_{i + 1}',
            'name':    text[:60]  or f'{city} Listing',
            'addr':    text[:40]  or 'Address not extracted',
            'city':    city,
            'rent':    raw.get('rent')     or 0,
            'beds':    raw.get('bedrooms') or 0,
            'baths':   raw.get('bathrooms') or 0,
            'type':    ptype,
            # TODO: parse "pets welcome", "section 8 accepted", etc. from raw_text
            'pets':    False,
            'voucher': False,
            'family':  False,
            'source':    raw.get('source_site', 'housing scout'),
            'sourceUrl': raw.get('source_url', ''),
            'link':      raw.get('listing_url', ''),
            'desc':      text[:250] or 'No description extracted.',
        })
    return out


# ── Threaded server ───────────────────────────────────────────────────────────

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Each request handled in its own thread."""
    daemon_threads      = True
    allow_reuse_address = True


class DualStackThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """IPv4 + IPv6 dual-stack threaded server."""
    address_family      = socket.AF_INET6
    allow_reuse_address = True
    daemon_threads      = True

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


# ── Entry point ───────────────────────────────────────────────────────────────

def start():
    os.chdir(BASE_DIR)
    load_env()

    env_loaded = os.path.exists(os.path.join(BASE_DIR, '.env'))
    google_ok  = bool(os.environ.get('GOOGLE_CLIENT_ID'))

    print('=' * 60)
    print('  CyberCookieOS — Local Server')
    print(f'  Site            :  http://localhost:{PORT}/hq/index.html')
    print(f'  Connections     :  http://localhost:{PORT}/connections/index.html')
    print(f'  Housing Scout   :  POST /api/housing/scout')
    print(f'  Auth status     :  GET  /api/auth/status')
    print(f'  .env loaded     :  {"yes" if env_loaded else "no — copy .env.example to .env"}')
    print(f'  Google OAuth    :  {"ready" if google_ok else "not configured (see .env.example)"}')
    print('=' * 60)

    try:
        with DualStackThreadedServer(('::', PORT), CyberCookieHandler) as httpd:
            print(f'  Dual-stack      :  :: ({PORT})\n')
            webbrowser.open(URL)
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print('\n[OK] Server stopped.')
    except OSError:
        print('[!] IPv6 unavailable — falling back to IPv4.')
        with ThreadedHTTPServer(('', PORT), CyberCookieHandler) as httpd:
            print(f'  IPv4            :  0.0.0.0:{PORT}\n')
            webbrowser.open(URL)
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print('\n[OK] Server stopped.')


if __name__ == '__main__':
    start()
