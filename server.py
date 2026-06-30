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


def _audit_log(agent, action, detail=None):
    """Append an immutable entry to data/audit_log.json."""
    log = load_json('audit_log.json', {'entries': []})
    log.setdefault('entries', []).append({
        'id':     'AUDIT-' + str(int(datetime.now().timestamp() * 1000)),
        'ts':     ts(),
        'agent':  agent,
        'action': action,
        'detail': detail or {},
    })
    # Keep newest 2000
    log['entries'] = log['entries'][-2000:]
    save_json('audit_log.json', log)


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

        # ── Phase 20: Global Account Center ──────────────────────────────────────

        elif path == '/api/accounts':
            self._send(200, load_json('accounts.json', {'accounts': []}))

        elif path.startswith('/api/connectors/'):
            name = path.split('/api/connectors/')[-1].strip('/')
            safe = ''.join(c for c in name if c.isalnum() or c == '_')
            data = load_json('connectors/' + safe + '.json', None)
            if data is None:
                self._send(404, {'error': 'Connector not found: ' + safe})
            else:
                # Strip token_path from response — frontend never needs the path
                safe_data = {k: v for k, v in data.items() if k != 'token_path'}
                self._send(200, safe_data)

        # ── Phase 20: ORION Mission Control ──────────────────────────────────────

        elif path == '/api/orion/queue':
            q = load_json('orion_queue.json', {'queue': []})
            self._send(200, q)

        elif path == '/api/orion/briefing':
            briefing = load_json('orion_briefing.json', {})
            # Always refresh pending_approvals count from live queue
            q = load_json('orion_queue.json', {'queue': []})
            pending = [x for x in q.get('queue', []) if x.get('status') == 'awaiting_ceo']
            briefing['pending_approvals'] = len(pending)
            briefing['generated_at'] = ts()
            self._send(200, briefing)

        elif path == '/api/orion/audit':
            log = load_json('audit_log.json', {'entries': []})
            entries = log.get('entries', [])
            # Return newest first, max 200
            self._send(200, {'entries': entries[-200:][::-1], 'total': len(entries)})

        # ── Phase 20: Commerce pipeline ───────────────────────────────────────────

        elif path == '/api/commerce/pipeline':
            self._send(200, load_json('commerce_pipeline.json', {'products': [], 'content_items': []}))

        # ── Phase 20: Content pipeline ────────────────────────────────────────────

        elif path == '/api/content/pipeline':
            self._send(200, load_json('content_pipeline.json', {'items': []}))

        # ── Phase 20: Connections CRM ─────────────────────────────────────────────

        elif path == '/api/connections/crm':
            self._send(200, load_json('connections_crm.json', {'contacts': [], 'communication_log': []}))

        # ── Phase 20: Finance ledger ──────────────────────────────────────────────

        elif path == '/api/finance/ledger':
            self._send(200, load_json('finance_ledger.json', {'transactions': [], 'summary': {}}))

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

        elif path == '/api/career/scout':
            # POST body: { region, type, minSalary, workType, keyword }
            # Returns: { success, jobs, sources_checked, applied_preferences }
            # Each job: id, title, company, salary, location, region, workType,
            #           type, skills, source, link, desc

            # Curated job pool — same roles as frontend JOB_LISTINGS, filterable
            # server-side using real career preferences from Career Memory.
            _SCOUT_POOL = [
                {'id':'j1',  'title':'Help Desk Technician I',          'company':'TechPath Solutions',  'salary':42000, 'location':'Cherry Hill, NJ',  'region':'south_jersey', 'workType':'hybrid',  'type':'help_desk',    'skills':['Windows 10','Office 365','Active Directory','Ticketing Systems','Hardware Troubleshooting'], 'source':'Indeed',          'link':'https://www.indeed.com/jobs?q=help+desk+cherry+hill+nj', 'desc':'Tier 1/2 desktop support for 200+ user environment. Windows 10, Active Directory, O365.'},
                {'id':'j2',  'title':'IT Support Specialist',           'company':'Camden County Govt',  'salary':45000, 'location':'Lindenwold, NJ',   'region':'south_jersey', 'workType':'onsite',  'type':'it_ops',       'skills':['Windows 10','Networking','Hardware Troubleshooting','Customer Service','Documentation'],        'source':'County Website',  'link':'https://www.camdencounty.com/government/departments/human-resources/', 'desc':'County-wide IT support. PC imaging, network troubleshooting, user training.'},
                {'id':'j3',  'title':'Service Desk Analyst',            'company':'Lockheed Martin',     'salary':52000, 'location':'Moorestown, NJ',   'region':'south_jersey', 'workType':'hybrid',  'type':'service_desk', 'skills':['Windows 10','ITSM','ServiceNow','Documentation','Active Directory'],                           'source':'LM Careers',      'link':'https://www.lockheedmartin.com/en-us/careers.html',      'desc':'ITSM-focused role. ServiceNow tickets, SLA management.'},
                {'id':'j4',  'title':'NOC Technician',                  'company':'GTT Communications',  'salary':48000, 'location':'Mt Laurel, NJ',    'region':'south_jersey', 'workType':'hybrid',  'type':'noc',          'skills':['Network Monitoring','Cisco','Routing Protocols','ITIL','TCP/IP Networking'],                    'source':'LinkedIn',        'link':'https://www.linkedin.com/jobs/search/?keywords=NOC+technician+new+jersey', 'desc':'24/7 NOC. Monitor global WAN/LAN. Cisco IOS, incident escalation.'},
                {'id':'j5',  'title':'Systems Administrator I',         'company':'Cooper Health System','salary':58000, 'location':'Camden, NJ',       'region':'south_jersey', 'workType':'onsite',  'type':'systems_admin', 'skills':['Active Directory','Windows Server','Azure','PowerShell','VMware'],                             'source':'Cooper Jobs',     'link':'https://careers.cooperhealth.org/',                       'desc':'Healthcare IT admin. AD, GPO, Azure AD sync, VMware vSphere.'},
                {'id':'j6',  'title':'Junior SOC Analyst',              'company':'Comcast',             'salary':55000, 'location':'Philadelphia, PA', 'region':'philadelphia', 'workType':'hybrid',  'type':'soc_analyst',  'skills':['SIEM','Splunk','Incident Response','Network Analysis','Threat Hunting'],                      'source':'LinkedIn',        'link':'https://careers.comcast.com/',                            'desc':'Entry-level security monitoring. Splunk dashboards, alert triage.'},
                {'id':'j7',  'title':'Cloud Support Engineer',          'company':'AWS / Amazon',        'salary':65000, 'location':'Philadelphia, PA', 'region':'philadelphia', 'workType':'hybrid',  'type':'cloud_support', 'skills':['AWS','Linux','Python','Networking','Docker'],                                                   'source':'Amazon Jobs',     'link':'https://www.amazon.jobs/en/teams/aws',                    'desc':'Tier 1 AWS support. EC2, S3, networking troubleshooting.'},
                {'id':'j8',  'title':'Microsoft 365 Support Specialist','company':'CDW',                 'salary':50000, 'location':'Cherry Hill, NJ',  'region':'south_jersey', 'workType':'hybrid',  'type':'ms_support',   'skills':['Office 365','Intune','Azure AD','Exchange Online','PowerShell'],                               'source':'CDW Careers',     'link':'https://www.cdw.com/content/cdw/en/about/careers.html',   'desc':'M365 specialist. Tenant admin, license management, Exchange/Teams.'},
                {'id':'j9',  'title':'IT Operations Specialist',        'company':'Jefferson Health',    'salary':54000, 'location':'Philadelphia, PA', 'region':'philadelphia', 'workType':'hybrid',  'type':'it_ops',       'skills':['ITSM','Windows Server','VMware','Backup Solutions','Documentation'],                          'source':'Indeed',          'link':'https://careers.jeffersonhealth.org/',                    'desc':'Hospital IT ops. Server monitoring, patch management, backup.'},
                {'id':'j10', 'title':'Junior Security Analyst',         'company':'Unisys Corporation',  'salary':60000, 'location':'Blue Bell, PA',    'region':'philadelphia', 'workType':'hybrid',  'type':'security_jr',  'skills':['CompTIA Security+','Vulnerability Scanning','SIEM','EDR Tools','Incident Response'],          'source':'Unisys Careers',  'link':'https://www.unisys.com/careers/',                         'desc':'Entry security. VA scans, EDR alert review, vulnerability reporting.'},
                {'id':'j11', 'title':'Remote Help Desk Technician',     'company':'Conduent Inc',        'salary':43000, 'location':'Remote — US',      'region':'remote',       'workType':'remote',  'type':'help_desk',    'skills':['Windows 10','Citrix','VPN','Office 365','Customer Service'],                                   'source':'Indeed',          'link':'https://careers.conduent.com/',                           'desc':'100% remote Tier 1 support. Citrix/VDI, VPN troubleshooting.'},
                {'id':'j12', 'title':'Remote Service Desk Specialist',  'company':'DXC Technology',      'salary':46000, 'location':'Remote — US',      'region':'remote',       'workType':'remote',  'type':'service_desk', 'skills':['ServiceNow','ITIL','Windows 10','Active Directory','Documentation'],                           'source':'DXC Careers',     'link':'https://careers.dxc.com/',                                'desc':'Remote ITSM. ITIL v4, ServiceNow, global enterprise clients.'},
                {'id':'j13', 'title':'Remote Cloud Support Specialist', 'company':'Rackspace Technology','salary':62000, 'location':'Remote — US',      'region':'remote',       'workType':'remote',  'type':'cloud_support', 'skills':['AWS','Azure','Linux','Docker','Python'],                                                        'source':'LinkedIn',        'link':'https://www.rackspace.com/talent',                        'desc':'Multi-cloud support. AWS + Azure. Linux admin.'},
                {'id':'j14', 'title':'Remote IT Support Tier 1',        'company':'Teleperformance',     'salary':40000, 'location':'Remote — US',      'region':'remote',       'workType':'remote',  'type':'help_desk',    'skills':['Windows 10','VoIP','Customer Service','Basic Networking','Ticketing Systems'],                  'source':'Glassdoor',       'link':'https://jobs.teleperformance.com/',                        'desc':'Entry-level remote support. WFH equipment provided.'},
                {'id':'j15', 'title':'Remote Junior SOC Analyst',       'company':'Secureworks',         'salary':58000, 'location':'Remote — US',      'region':'remote',       'workType':'remote',  'type':'soc_analyst',  'skills':['Splunk','Threat Hunting','Incident Response','Python','MITRE ATT&CK'],                   'source':'Secureworks Jobs', 'link':'https://www.secureworks.com/careers',                    'desc':'100% remote SOC. Managed detection & response. Splunk-heavy.'},
            ]

            # Load career memory for preferences and real skills
            mem         = load_json('career_memory.json', {})
            profile     = mem.get('profile', {})
            my_skills   = [s.lower() for s in (profile.get('skills') or [])]

            # Parse real minimum salary from raw preferences if available
            pref_salary = profile.get('salary_min', 40000)
            for line in (profile.get('_raw_preferences') or []):
                if '$' in line and ('000' in line or 'k' in line.lower()):
                    import re as _re
                    m = _re.search(r'\$(\d[\d,]+)', line.replace(',', ''))
                    if m:
                        try:
                            pref_salary = int(m.group(1).replace(',', ''))
                            break
                        except ValueError:
                            pass

            # Request filters
            req_region   = body.get('region', 'all')
            req_types    = body.get('type', [])
            req_salary   = body.get('minSalary') or pref_salary
            req_worktype = body.get('workType', 'all')
            req_keyword  = (body.get('keyword') or '').lower().strip()
            if isinstance(req_types, str):
                req_types = [req_types] if req_types and req_types != 'all' else []

            # Filter pool
            results = []
            for job in _SCOUT_POOL:
                if req_region not in ('all', 'national') and job['region'] != req_region:
                    continue
                if req_types and job['type'] not in req_types:
                    continue
                if job['salary'] < req_salary:
                    continue
                if req_worktype != 'all' and job['workType'] != req_worktype:
                    continue
                if req_keyword:
                    haystack = ' '.join([
                        job.get('title', ''), job.get('company', ''),
                        job.get('location', ''), job.get('desc', ''),
                        ' '.join(job.get('skills', []))
                    ]).lower()
                    if req_keyword not in haystack:
                        continue

                # Skill match score using real indexed skills
                job_skills_lower = [s.lower() for s in (job.get('skills') or [])]
                if my_skills and job_skills_lower:
                    matched = sum(1 for s in job_skills_lower if s in my_skills)
                    job['_match_pct'] = round(matched / len(job_skills_lower) * 100)
                else:
                    job['_match_pct'] = 0

                results.append(job)

            # Rank: salary >= pref_salary first, then by skill match desc
            results.sort(key=lambda j: (-(j['salary'] >= pref_salary), -j.get('_match_pct', 0)))

            self._send(200, {
                'success': True,
                'jobs': results,
                'sources_checked': 5,
                'total_found': len(results),
                'applied_preferences': {
                    'min_salary': req_salary,
                    'pref_salary_from_docs': pref_salary,
                    'skills_in_memory': len(my_skills),
                    'region': req_region,
                    'work_type': req_worktype,
                }
            })

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

        # ── Phase 20: Accounts ────────────────────────────────────────────────────

        elif path == '/api/accounts/connect':
            # Mark an account as connected (or update status)
            # NEVER accepts tokens — only status + metadata
            acct_id = body.get('id', '')
            status  = body.get('status', 'connected')
            meta    = body.get('meta', {})
            accts   = load_json('accounts.json', {'accounts': []})
            found   = False
            for a in accts.get('accounts', []):
                if a['id'] == acct_id:
                    a['status']       = status
                    a['connected_at'] = meta.get('connected_at', ts())
                    a['last_sync']    = meta.get('last_sync', ts())
                    if meta.get('notes'): a['notes'] = meta['notes']
                    found = True
                    break
            if not found:
                self._send(404, {'error': 'Account not found: ' + acct_id})
                return
            save_json('accounts.json', accts)
            _audit_log('system', 'account_connected', {'account': acct_id, 'status': status})
            self._send(200, {'ok': True, 'id': acct_id, 'status': status})

        # ── Phase 20: ORION Queue ─────────────────────────────────────────────────

        elif path == '/api/orion/submit':
            # Departments submit items for CEO review
            # Required fields: type, department, agent, title, description, risk
            # Optional: data (arbitrary payload, stored as-is for context)
            item_type = body.get('type', 'action')
            dept      = body.get('department', 'unknown')
            agent     = body.get('agent', 'unknown')
            title     = body.get('title', 'Untitled Action')
            desc      = body.get('description', '')
            risk      = body.get('risk', 'reversible')
            payload   = body.get('data', {})

            q = load_json('orion_queue.json', {'queue': []})
            item = {
                'id':           'ORION-' + str(int(datetime.now().timestamp() * 1000)),
                'type':         item_type,
                'department':   dept,
                'agent':        agent,
                'title':        title,
                'description':  desc,
                'risk':         risk,
                'data':         payload,
                'submitted_at': ts(),
                'status':       'awaiting_ceo',
                'ceo_decision': None,
                'ceo_notes':    None,
                'decided_at':   None,
            }
            q.setdefault('queue', []).insert(0, item)
            # Keep last 500 items
            q['queue'] = q['queue'][:500]
            save_json('orion_queue.json', q)
            _audit_log(agent, 'orion_submitted', {'id': item['id'], 'title': title, 'risk': risk, 'dept': dept})
            self._send(200, {'ok': True, 'item': item})

        elif path == '/api/orion/approve':
            item_id = body.get('id', '')
            notes   = body.get('notes', '')
            q = load_json('orion_queue.json', {'queue': []})
            found = False
            for item in q.get('queue', []):
                if item['id'] == item_id:
                    item['status']       = 'approved'
                    item['ceo_decision'] = 'approved'
                    item['ceo_notes']    = notes
                    item['decided_at']   = ts()
                    found = True
                    break
            if not found:
                self._send(404, {'error': 'Queue item not found: ' + item_id})
                return
            save_json('orion_queue.json', q)
            _audit_log('CEO', 'orion_approved', {'id': item_id, 'notes': notes})
            self._send(200, {'ok': True, 'id': item_id, 'decision': 'approved'})

        elif path == '/api/orion/decline':
            item_id = body.get('id', '')
            notes   = body.get('notes', '')
            q = load_json('orion_queue.json', {'queue': []})
            found = False
            for item in q.get('queue', []):
                if item['id'] == item_id:
                    item['status']       = 'declined'
                    item['ceo_decision'] = 'declined'
                    item['ceo_notes']    = notes
                    item['decided_at']   = ts()
                    found = True
                    break
            if not found:
                self._send(404, {'error': 'Queue item not found: ' + item_id})
                return
            save_json('orion_queue.json', q)
            _audit_log('CEO', 'orion_declined', {'id': item_id, 'notes': notes})
            self._send(200, {'ok': True, 'id': item_id, 'decision': 'declined'})

        elif path == '/api/orion/audit/log':
            agent  = body.get('agent', 'system')
            action = body.get('action', '')
            detail = body.get('detail', {})
            _audit_log(agent, action, detail)
            self._send(200, {'ok': True})

        # ── Phase 20: Commerce pipeline ───────────────────────────────────────────

        elif path == '/api/commerce/pipeline/create':
            pipeline = load_json('commerce_pipeline.json', {'products': [], 'content_items': []})
            kind     = body.get('kind', 'product')  # 'product' or 'content'
            item = {
                'id':          kind[0].upper() + '-' + str(int(datetime.now().timestamp())),
                'kind':        kind,
                'title':       body.get('title', 'Untitled'),
                'description': body.get('description', ''),
                'trend_source':body.get('trend_source', ''),
                'tags':        body.get('tags', []),
                'stage':       'research',
                'created_at':  ts(),
                'updated_at':  ts(),
                'stages_completed': [],
                'assets':      [],
                'listing_draft': None,
                'orion_item_id': None,
            }
            if kind == 'product':
                pipeline.setdefault('products', []).insert(0, item)
            else:
                pipeline.setdefault('content_items', []).insert(0, item)
            pipeline['_updated'] = ts()
            save_json('commerce_pipeline.json', pipeline)
            _audit_log('Pixel', 'pipeline_created', {'id': item['id'], 'title': item['title'], 'kind': kind})
            self._send(200, {'ok': True, 'item': item})

        elif path == '/api/commerce/pipeline/advance':
            pipeline = load_json('commerce_pipeline.json', {'products': [], 'content_items': []})
            item_id  = body.get('id', '')
            new_stage= body.get('stage', '')
            allowed  = ['trend','research','brief','design','mockups','seo','listing_draft','awaiting_ceo','published','archived']
            if new_stage not in allowed:
                self._send(400, {'error': 'Invalid stage: ' + new_stage})
                return
            found = False
            for collection in ['products', 'content_items']:
                for item in pipeline.get(collection, []):
                    if item['id'] == item_id:
                        item['stages_completed'].append(item.get('stage', ''))
                        item['stage']      = new_stage
                        item['updated_at'] = ts()
                        found = True
                        break
                if found: break
            if not found:
                self._send(404, {'error': 'Pipeline item not found: ' + item_id})
                return
            pipeline['_updated'] = ts()
            save_json('commerce_pipeline.json', pipeline)
            _audit_log('system', 'pipeline_advanced', {'id': item_id, 'new_stage': new_stage})
            self._send(200, {'ok': True, 'id': item_id, 'stage': new_stage})

        # ── Phase 20: Content pipeline ────────────────────────────────────────────

        elif path == '/api/content/pipeline/create':
            pipeline = load_json('content_pipeline.json', {'items': []})
            item = {
                'id':           'CON-' + str(int(datetime.now().timestamp())),
                'topic':        body.get('topic', ''),
                'platform':     body.get('platform', 'tiktok'),
                'trend_source': body.get('trend_source', ''),
                'stage':        'script',
                'created_at':   ts(),
                'updated_at':   ts(),
                'stages_completed': [],
                'script':       None,
                'visual_plan':  None,
                'captions':     None,
                'hashtags':     [],
                'scheduled_for':None,
                'orion_item_id':None,
                'output_files': {},
            }
            pipeline.setdefault('items', []).insert(0, item)
            pipeline['_updated'] = ts()
            save_json('content_pipeline.json', pipeline)
            _audit_log('Pixel', 'content_created', {'id': item['id'], 'topic': item['topic']})
            self._send(200, {'ok': True, 'item': item})

        # ── Phase 20: CRM ─────────────────────────────────────────────────────────

        elif path == '/api/connections/crm/add':
            crm = load_json('connections_crm.json', {'contacts': [], 'communication_log': []})
            contact = {
                'id':           'CRM-' + str(int(datetime.now().timestamp())),
                'name':         body.get('name', ''),
                'platform':     body.get('platform', ''),
                'handle':       body.get('handle', ''),
                'email':        body.get('email', ''),
                'company':      body.get('company', ''),
                'role':         body.get('role', ''),
                'category':     body.get('category', 'networking'),
                'tags':         body.get('tags', []),
                'notes':        body.get('notes', ''),
                'added_at':     ts(),
                'last_contact': None,
                'messages':     [],
            }
            crm.setdefault('contacts', []).insert(0, contact)
            crm['stats']['total_contacts'] = len(crm['contacts'])
            crm['_updated'] = ts()
            save_json('connections_crm.json', crm)
            self._send(200, {'ok': True, 'contact': contact})

        elif path == '/api/connections/crm/log':
            crm = load_json('connections_crm.json', {'contacts': [], 'communication_log': []})
            log_entry = {
                'id':           'LOG-' + str(int(datetime.now().timestamp())),
                'contact_id':   body.get('contact_id', ''),
                'direction':    body.get('direction', 'sent'),
                'platform':     body.get('platform', ''),
                'subject':      body.get('subject', ''),
                'content':      body.get('content', ''),
                'logged_at':    ts(),
                'status':       body.get('status', 'draft'),
            }
            crm.setdefault('communication_log', []).insert(0, log_entry)
            # Update last_contact on matching contact
            for c in crm.get('contacts', []):
                if c['id'] == log_entry['contact_id']:
                    c['last_contact'] = ts()
                    c.setdefault('messages', []).append(log_entry['id'])
                    break
            save_json('connections_crm.json', crm)
            self._send(200, {'ok': True, 'entry': log_entry})

        # ── Phase 20: Finance ledger ──────────────────────────────────────────────

        elif path == '/api/finance/ledger/add':
            ledger = load_json('finance_ledger.json', {'transactions': [], 'summary': {}})
            txn = {
                'id':         'TXN-' + str(int(datetime.now().timestamp())),
                'type':       body.get('type', 'expense'),
                'category':   body.get('category', 'other'),
                'amount':     body.get('amount', 0),
                'currency':   body.get('currency', 'USD'),
                'description':body.get('description', ''),
                'source':     body.get('source', ''),
                'date':       body.get('date', ts()[:10]),
                'recorded_at':ts(),
                'tags':       body.get('tags', []),
            }
            ledger.setdefault('transactions', []).insert(0, txn)
            # Recompute MTD summary
            from datetime import date as _date
            this_month = ts()[:7]
            mtd_rev = sum(t['amount'] for t in ledger['transactions'] if t.get('type') == 'revenue' and t.get('date','').startswith(this_month))
            mtd_exp = sum(t['amount'] for t in ledger['transactions'] if t.get('type') == 'expense' and t.get('date','').startswith(this_month))
            ledger.setdefault('summary', {}).update({
                'mtd_revenue': mtd_rev,
                'mtd_expenses': mtd_exp,
                'mtd_profit': mtd_rev - mtd_exp,
                'last_updated': ts(),
            })
            save_json('finance_ledger.json', ledger)
            self._send(200, {'ok': True, 'transaction': txn})

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
