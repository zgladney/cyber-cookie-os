#!/usr/bin/env python3
"""
CyberCookieOS — Local Development Server  (replaces launch.py)

Usage:
    python server.py

What it does:
    - Serves all static files at http://localhost:8080  (same as launch.py)
    - POST /api/housing/scout  →  triggers Housing Scout v2, returns JSON listings

Housing Scout requirements:
    pip install playwright
    playwright install chromium

The scout runs headless when triggered from the browser (no window appears).
"""

import http.server
import json
import os
import socket
import socketserver
import subprocess
import sys
import webbrowser
from urllib.parse import urlparse

PORT     = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
URL      = f"http://localhost:{PORT}/hq/index.html"


# ── Request Handler ───────────────────────────────────────────────────────────

class CyberCookieHandler(http.server.SimpleHTTPRequestHandler):
    """Extends SimpleHTTPRequestHandler with API routes for agent triggers."""

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/housing/scout':
            self._handle_housing_scout()
        else:
            self._send_json(404, {'error': f'Unknown endpoint: {path}'})

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

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

        # Pass filters + headless flag to the scout script via env vars
        env = os.environ.copy()
        env['SCOUT_API_MODE'] = '1'
        env['SCOUT_FILTERS']  = json.dumps(filters)

        print(f'\n[API] POST /api/housing/scout — running scout (may take 1-3 min)...')
        try:
            result = subprocess.run(
                [sys.executable, '-u', scout_script],
                capture_output=True,
                text=True,
                timeout=300,   # 5-minute hard limit
                env=env,
                cwd=BASE_DIR,
            )
            print(f'[API] Scout exit code: {result.returncode}')
            if result.returncode != 0 and result.stderr:
                print(f'[API] stderr: {result.stderr[:600]}')
        except subprocess.TimeoutExpired:
            self._send_json(504, {
                'success': False,
                'error': 'Housing Scout timed out after 5 minutes. Sources may be slow.',
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

        # Read the latest run from the results file
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

        # Collect all raw listings from this run
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

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        # Suppress noisy static-file logs; keep API + error logs
        if len(args) > 1 and ('/api/' in fmt % args or args[1][0] in ('4', '5')):
            super().log_message(fmt, *args)


# ── Listing normalizer ────────────────────────────────────────────────────────

def _normalize_listings(raw_listings):
    """
    Convert scraper output dicts → frontend card format.
    Only includes listings that passed the scraper's own filter check.
    """
    out = []
    for i, raw in enumerate(raw_listings):
        # Skip listings that the scraper itself rejected
        if raw.get('passes_filters') is False:
            continue
        # Skip manual placeholder URLs with no data yet
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
            'rent':    raw.get('rent')      or 0,
            'beds':    raw.get('bedrooms')  or 0,
            'baths':   raw.get('bathrooms') or 0,
            'type':    ptype,
            # Scraper doesn't yet extract these — kept as False for now
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
    """Each request handled in its own thread — scout won't block page loads."""
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

    print('=' * 58)
    print('  CyberCookieOS — Local Server')
    print(f'  Site          :  http://localhost:{PORT}/hq/index.html')
    print(f'  Housing Scout :  POST /api/housing/scout')
    print('=' * 58)

    try:
        with DualStackThreadedServer(('::', PORT), CyberCookieHandler) as httpd:
            print(f'  Dual-stack    :  :: ({PORT})\n')
            webbrowser.open(URL)
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print('\n[OK] Server stopped.')
    except OSError:
        print('[!] IPv6 unavailable — falling back to IPv4.')
        with ThreadedHTTPServer(('', PORT), CyberCookieHandler) as httpd:
            print(f'  IPv4          :  0.0.0.0:{PORT}\n')
            webbrowser.open(URL)
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print('\n[OK] Server stopped.')


if __name__ == '__main__':
    start()
