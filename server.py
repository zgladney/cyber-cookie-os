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
import zipfile
import xml.etree.ElementTree as ET
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


# ── Career Intelligence helpers ───────────────────────────────────────────────

CAREER_DOCS_DIR = os.path.join(ROOT, 'data', 'documents', 'career')

DOC_TYPE_MAP = {
    'resume':       {'type': 'resume',             'used_in': ['nova', 'resuMate']},
    'skill':        {'type': 'skills_inventory',   'used_in': ['nova', 'resuMate', 'scoutX']},
    'achievement':  {'type': 'achievements',        'used_in': ['resuMate', 'nova']},
    'preference':   {'type': 'career_preferences', 'used_in': ['nova', 'scoutX']},
    'cover':        {'type': 'cover_letter',        'used_in': ['resuMate']},
    'course':       {'type': 'course_plan',         'used_in': ['resuMate', 'scoutX']},
    'wgu':          {'type': 'course_plan',         'used_in': ['resuMate', 'scoutX']},
    'company':      {'type': 'target_companies',   'used_in': ['nova', 'scoutX']},
    'target':       {'type': 'target_companies',   'used_in': ['nova', 'scoutX']},
}

def _classify_doc(filename):
    lower = filename.lower()
    for keyword, meta in DOC_TYPE_MAP.items():
        if keyword in lower:
            return meta['type'], meta['used_in']
    return 'document', ['nova']


def _parse_docx(filepath):
    """Extract plain text from .docx using stdlib zipfile + xml only."""
    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            if 'word/document.xml' not in z.namelist():
                return ''
            xml_bytes = z.read('word/document.xml')
        ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        root = ET.fromstring(xml_bytes)
        paragraphs = []
        for p in root.iter(ns + 'p'):
            texts = [t.text for t in p.iter(ns + 't') if t.text]
            line = ''.join(texts).strip()
            if line:
                paragraphs.append(line)
        return '\n'.join(paragraphs)
    except Exception:
        return ''


def _list_career_docs():
    """Return metadata for all .docx files in the career documents folder."""
    if not os.path.isdir(CAREER_DOCS_DIR):
        return []
    memory = load_json('career_memory.json', {})
    indexed = {d['filename']: d for d in memory.get('_source_docs', [])}
    result = []
    for name in sorted(os.listdir(CAREER_DOCS_DIR)):
        if not name.lower().endswith('.docx'):
            continue
        full = os.path.join(CAREER_DOCS_DIR, name)
        stat = os.stat(full)
        idx  = indexed.get(name, {})
        doc_type, used_in = _classify_doc(name)
        result.append({
            'filename':      name,
            'path':          'data/documents/career/' + name,
            'type':          doc_type,
            'size_kb':       round(stat.st_size / 1024, 1),
            'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'status':        'indexed' if idx.get('indexed_at') else 'pending',
            'indexed_at':    idx.get('indexed_at'),
            'word_count':    idx.get('word_count', 0),
            'used_in':       used_in,
            'confidence':    idx.get('confidence', 'unknown'),
        })
    return result


def _refresh_career_memory():
    """Parse all career docs and rebuild career_memory.json. Returns updated memory dict."""
    memory = load_json('career_memory.json', {
        '_version': '1.0', '_last_refresh': None, '_source_docs': [],
        'profile': {}, 'linkedin': {}
    })

    if not os.path.isdir(CAREER_DOCS_DIR):
        os.makedirs(CAREER_DOCS_DIR, exist_ok=True)

    source_docs = []
    all_text_by_type = {}

    for name in sorted(os.listdir(CAREER_DOCS_DIR)):
        if not name.lower().endswith('.docx'):
            continue
        full = os.path.join(CAREER_DOCS_DIR, name)
        text = _parse_docx(full)
        stat = os.stat(full)
        doc_type, used_in = _classify_doc(name)
        words = len(text.split()) if text else 0
        source_docs.append({
            'filename':      name,
            'type':          doc_type,
            'indexed_at':    ts(),
            'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'word_count':    words,
            'used_in':       used_in,
            'confidence':    'high' if words > 50 else ('low' if words > 0 else 'empty'),
        })
        if text:
            all_text_by_type[doc_type] = all_text_by_type.get(doc_type, '') + '\n' + text

    memory['_source_docs'] = source_docs
    memory['_last_refresh'] = ts()
    memory['_doc_count']    = len(source_docs)
    memory['_total_words']  = sum(d['word_count'] for d in source_docs)

    # Seed profile fields from parsed text (keyword extraction)
    profile = memory.get('profile', {})
    skills_text = all_text_by_type.get('skills_inventory', '')
    if skills_text and not profile.get('skills'):
        # Extract lines that look like skill items (short, no full sentences)
        lines = [l.strip() for l in skills_text.split('\n') if l.strip()]
        skills = [l for l in lines if 3 < len(l) < 60 and '.' not in l]
        if skills:
            profile['skills'] = skills[:80]

    prefs_text = all_text_by_type.get('career_preferences', '')
    if prefs_text and not profile.get('target_roles'):
        lines = [l.strip() for l in prefs_text.split('\n') if l.strip()]
        profile['_raw_preferences'] = lines[:40]

    memory['profile'] = profile
    save_json('career_memory.json', memory)
    return memory


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

        # ── Career Intelligence routes ─────────────────────────────────────────

        elif path == '/api/career/documents':
            self._send(200, {'documents': _list_career_docs()})

        elif path == '/api/career/memory':
            self._send(200, load_json('career_memory.json',
                {'_source_docs': [], 'profile': {}, 'linkedin': {}, '_doc_count': 0, '_last_refresh': None}))

        elif path == '/api/career/jobs':
            self._send(200, load_json('career_jobs.json', {'jobs': []}))

        elif path == '/api/career/recommendations':
            self._send(200, load_json('career_recommendations.json', {'recommendations': []}))

        elif path == '/api/career/linkedin':
            self._send(200, load_json('career_linkedin.json', {'connected': False}))

        elif path == '/api/career/companies':
            self._send(200, load_json('career_companies.json', {'companies': []}))

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

        # ── Career Intelligence POST routes ───────────────────────────────────

        elif path == '/api/career/memory/refresh':
            result = _refresh_career_memory()
            self._send(200, {
                'ok': True,
                'doc_count':    result.get('_doc_count', 0),
                'total_words':  result.get('_total_words', 0),
                'refreshed_at': result.get('_last_refresh'),
                'source_docs':  result.get('_source_docs', [])
            })

        elif path == '/api/career/jobs/save':
            jobs_data = load_json('career_jobs.json', {'jobs': []})
            job = {
                'id':               body.get('id') or 'job_' + str(int(datetime.now().timestamp())),
                'title':            body.get('title', ''),
                'company':          body.get('company', ''),
                'salary_min':       body.get('salary_min') or body.get('salary'),
                'salary_max':       body.get('salary_max'),
                'location':         body.get('location', ''),
                'work_type':        body.get('work_type', 'unknown'),
                'description':      body.get('description', ''),
                'url':              body.get('url', ''),
                'source':           body.get('source', 'manual'),
                'skills':           body.get('skills', []),
                'stage':            body.get('stage', 'saved'),
                'ats_score':        body.get('ats_score'),
                'missing_keywords': body.get('missing_keywords', []),
                'cover_letter_ready': body.get('cover_letter_ready', False),
                'notes':            body.get('notes', ''),
                'nova_score':       body.get('nova_score'),
                'nova_reason':      body.get('nova_reason', ''),
                'saved_at':         ts(),
                'applied_at':       None,
                'offer_details':    None,
            }
            jobs_data['jobs'] = [j for j in jobs_data.get('jobs', []) if j.get('id') != job['id']]
            jobs_data['jobs'].append(job)
            jobs_data['_updated'] = ts()
            save_json('career_jobs.json', jobs_data)
            self._send(200, {'ok': True, 'job': job})

        elif path == '/api/career/jobs/update':
            job_id = body.get('id', '')
            if not job_id:
                return self._send(400, {'error': 'id required'})
            jobs_data = load_json('career_jobs.json', {'jobs': []})
            updated = False
            allowed = ['stage', 'notes', 'ats_score', 'missing_keywords', 'cover_letter_ready',
                       'applied_at', 'offer_details', 'nova_score', 'nova_reason', 'title',
                       'company', 'salary_min', 'location', 'url', 'description']
            for j in jobs_data.get('jobs', []):
                if j.get('id') == job_id:
                    for k in allowed:
                        if k in body:
                            j[k] = body[k]
                    if body.get('stage') == 'applied' and not j.get('applied_at'):
                        j['applied_at'] = ts()
                    j['_updated_at'] = ts()
                    updated = True
            jobs_data['_updated'] = ts()
            save_json('career_jobs.json', jobs_data)
            self._send(200, {'ok': True, 'updated': updated})

        elif path == '/api/career/jobs/remove':
            job_id = body.get('id', '')
            if not job_id:
                return self._send(400, {'error': 'id required'})
            jobs_data = load_json('career_jobs.json', {'jobs': []})
            before = len(jobs_data.get('jobs', []))
            jobs_data['jobs'] = [j for j in jobs_data.get('jobs', []) if j.get('id') != job_id]
            jobs_data['_updated'] = ts()
            save_json('career_jobs.json', jobs_data)
            self._send(200, {'ok': True, 'removed': before - len(jobs_data['jobs'])})

        elif path == '/api/career/recommendations/create':
            recs = load_json('career_recommendations.json', {'recommendations': []})
            rec = {
                'id':                 'rec_' + str(int(datetime.now().timestamp())),
                'job_id':             body.get('job_id', ''),
                'title':              body.get('title', ''),
                'company':            body.get('company', ''),
                'salary':             body.get('salary', ''),
                'ats_match':          body.get('ats_match', 0),
                'missing_keywords':   body.get('missing_keywords', []),
                'resume_updated':     body.get('resume_updated', False),
                'cover_letter_ready': body.get('cover_letter_ready', False),
                'financial_impact':   body.get('financial_impact', 'unknown'),
                'location':           body.get('location', ''),
                'location_match':     body.get('location_match', False),
                'recommendation':     body.get('recommendation', 'review'),
                'orion_notes':        body.get('orion_notes', ''),
                'status':             'awaiting_approval',
                'created_at':         ts(),
                'reviewed_at':        None,
                'ceo_decision':       None,
            }
            recs.setdefault('recommendations', []).append(rec)
            recs['_updated'] = ts()
            save_json('career_recommendations.json', recs)
            self._send(200, {'ok': True, 'recommendation': rec})

        elif path == '/api/career/recommendations/action':
            rec_id   = body.get('id', '')
            decision = body.get('decision', '')
            if not rec_id or decision not in ('approved', 'rejected'):
                return self._send(400, {'error': 'id and decision (approved/rejected) required'})
            recs = load_json('career_recommendations.json', {'recommendations': []})
            updated = False
            for r in recs.get('recommendations', []):
                if r.get('id') == rec_id:
                    r['ceo_decision'] = decision
                    r['status']       = decision
                    r['reviewed_at']  = ts()
                    updated = True
            recs['_updated'] = ts()
            save_json('career_recommendations.json', recs)
            self._send(200, {'ok': True, 'updated': updated})

        elif path == '/api/career/linkedin/import':
            li = load_json('career_linkedin.json', {})
            li['connected']     = False  # Manual import only — no OAuth token
            li['import_method'] = 'manual'
            li['last_imported'] = ts()
            allowed_li = ['headline', 'profile_url', 'summary', 'experience', 'education',
                          'skills', 'certifications', 'name', 'location']
            for k in allowed_li:
                if k in body:
                    li[k] = body[k]
            # Cross-reference with resume skills from memory
            mem = load_json('career_memory.json', {})
            resume_skills = mem.get('profile', {}).get('skills', [])
            li_skills     = body.get('skills', [])
            if resume_skills and li_skills:
                li['discrepancies'] = {
                    'on_resume_not_linkedin': [s for s in resume_skills if s not in li_skills],
                    'on_linkedin_not_resume':  [s for s in li_skills if s not in resume_skills],
                }
            save_json('career_linkedin.json', li)
            self._send(200, {'ok': True, 'profile': li})

        elif path == '/api/career/companies/add':
            companies = load_json('career_companies.json', {'companies': []})
            co = {
                'id':                  'co_' + str(int(datetime.now().timestamp())),
                'name':                body.get('name', ''),
                'priority':            body.get('priority', 'medium'),
                'reason':              body.get('reason', ''),
                'applications':        [],
                'recruiter_contacts':  [],
                'interview_history':   [],
                'status':              'tracking',
                'added_at':            ts(),
            }
            companies.setdefault('companies', []).append(co)
            companies['_updated'] = ts()
            save_json('career_companies.json', companies)
            self._send(200, {'ok': True, 'company': co})

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
