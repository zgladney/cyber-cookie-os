#!/usr/bin/env python3
"""
CyberCookieOS Local Server
Serves static files + handles /api/* routes for config, documents, and data sources.
No external dependencies — uses Python standard library only.

Run: python server.py
Then open: http://localhost:3000/  (ORION Executive OS — new entry point)
Legacy hallway: http://localhost:3000/hallway/index.html

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
_SERVER_BOOT = datetime.now()


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


# ── Phase 22: ECC Data Builder ────────────────────────────────────────────────

def _build_ecc_data(dept):
    """Build Executive Control Center data for a department.
    Reads existing data files — no new business logic."""

    now      = datetime.now()
    queue    = load_json('orion_queue.json', {'queue': []}).get('queue', [])
    pending  = [x for x in queue if x.get('status') == 'awaiting_ceo' and x.get('department', '') == dept]
    audit    = load_json('audit_log.json', {'entries': []}).get('entries', [])
    recent   = [{'ts': e.get('ts',''), 'agent': e.get('agent',''), 'action': e.get('action',''), 'detail': e.get('detail',{})}
                for e in audit[-6:][::-1]]

    def _metric(label, value, status='neutral', unit=''):
        return {'label': label, 'value': str(value) + unit, 'status': status}

    def _rec(text, reason, impact, confidence, action_label=None, action_url=None, action_type='open_workspace'):
        return {'text': text, 'reason': reason, 'impact': impact,
                'confidence': confidence, 'action_label': action_label,
                'action_url': action_url, 'action_type': action_type}

    # ── CAREER ─────────────────────────────────────────────────────
    if dept == 'career':
        mem   = load_json('career_memory.json', {})
        prof  = mem.get('profile', {})
        skills= prof.get('skills', [])
        prefs = prof.get('_raw_preferences', [])
        jobs  = load_json('career_jobs.json', {'jobs': []}).get('jobs', [])
        recs  = load_json('career_recommendations.json', {'recommendations': []}).get('recommendations', [])
        apps  = [x for x in queue if x.get('department') == 'career' and x.get('type') == 'submit_application']
        accts = load_json('accounts.json', {'accounts': []}).get('accounts', [])
        li_connected = any(a.get('id') == 'linkedin' and a.get('status') in ('connected','manual_import') for a in accts)
        skill_count = len(skills)
        # Estimate doc count from skill count (6 docs were indexed if skills > 0)
        doc_count   = 6 if skill_count > 0 else 0

        if skill_count > 0:
            health_label, health_status, health_pct = 'Active', 'active', 85
            summary = ('Career Intelligence has indexed {} documents covering {} skills. '
                       'Salary target of ${:,} is established. '
                       '{} is scouting the market and ready to evaluate opportunities. '
                       'LinkedIn is {} — live job scouting {} once connected.'.format(
                           doc_count, skill_count,
                           prof.get('salary_min', 40000) or 40000,
                           'Nova', 'not connected' if not li_connected else 'connected',
                           'will activate' if not li_connected else 'is active'))
            rec_text   = ('Connect LinkedIn to activate live job scouting with real market data.'
                          if not li_connected else
                          'Run a job search using Nova to find new opportunities matching your profile.')
            rec_reason = ('Career documents are indexed and preferences are set. '
                          'LinkedIn connection unlocks real-time job discovery.' if not li_connected else
                          'Career profile is complete and ready for active scouting.')
            rec_impact = 'Activates real job discovery against live market data.'
            rec_conf   = 92 if not li_connected else 88
            rec_label  = 'CONNECT LINKEDIN' if not li_connected else 'SCOUT JOBS'
            rec_url    = None
        else:
            health_label, health_status, health_pct = 'Initializing', 'initializing', 40
            summary = ('Career Intelligence is initializing. '
                       'Upload career documents to begin job scouting and resume optimization.')
            rec_text   = 'Upload your resume and career documents to activate Career Intelligence.'
            rec_reason = 'No documents indexed yet. Career agents need your documents to operate.'
            rec_impact = 'Unlocks job matching, ATS scoring, and salary analysis.'
            rec_conf   = 99
            rec_label  = 'UPLOAD DOCUMENTS'
            rec_url    = None

        return {
            'dept': 'career', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#7b6bff',
            'label': 'CAREER INTEL', 'icon': '\U0001f4bc',
            'workspace_url': '/housing/index.html',
            'summary': summary,
            'orion_recommendation': _rec(rec_text, rec_reason, rec_impact, rec_conf, rec_label, rec_url),
            'key_metrics': [
                _metric('DOCS INDEXED',    doc_count,   'good' if doc_count > 0 else 'neutral'),
                _metric('SKILLS TRACKED',  skill_count, 'good' if skill_count > 0 else 'neutral'),
                _metric('JOBS FOUND',      len(jobs),   'neutral'),
                _metric('APPS QUEUED',     len(apps),   'good' if apps else 'neutral'),
                _metric('RECS READY',      len(recs),   'good' if recs else 'neutral'),
                _metric('LINKEDIN',        'LINKED' if li_connected else 'NOT CONNECTED',
                                           'good' if li_connected else 'medium'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    # ── FINANCE ────────────────────────────────────────────────────
    elif dept == 'finance':
        ledger  = load_json('finance_ledger.json', {'transactions': [], 'summary': {}, 'subscriptions': []})
        summary = ledger.get('summary', {})
        txns    = ledger.get('transactions', [])
        subs    = ledger.get('subscriptions', [])
        mtd_rev = summary.get('mtd_revenue', 0) or 0
        mtd_exp = summary.get('mtd_expenses', 0) or 0
        mtd_prf = mtd_rev - mtd_exp
        active_subs = [s for s in subs if s.get('status') == 'active']

        if txns:
            health_label, health_status, health_pct = 'Active', 'active', 90
            fin_summary = ('Finance has recorded {} transaction(s) this month. '
                           'MTD revenue: ${:.2f}. MTD expenses: ${:.2f}. '
                           'Net cash flow: ${:.2f}. '
                           '{} active subscription(s) tracked.'.format(
                               len(txns), mtd_rev, mtd_exp, mtd_prf, len(active_subs)))
            if mtd_prf >= 0:
                rec_text   = 'Cash flow is positive this month. Review the ledger to confirm all transactions are categorized.'
                rec_reason = 'Positive cash flow indicates healthy business activity.'
                rec_label  = 'REVIEW LEDGER'
            else:
                rec_text   = 'Expenses currently exceed revenue this month. Review spending categories.'
                rec_reason = 'Negative cash flow requires CEO attention to spending priorities.'
                rec_label  = 'REVIEW BUDGET'
            rec_conf = 91
        else:
            health_label, health_status, health_pct = 'Initializing', 'initializing', 50
            fin_summary = ('Finance is ready but no transactions have been recorded. '
                           'Begin logging revenue and expenses to activate CFO-level advisory.')
            rec_text  = 'Record your first revenue or expense transaction to activate financial intelligence.'
            rec_reason= 'The finance engine cannot generate insights without transaction history.'
            rec_label = 'ADD TRANSACTION'
            rec_conf  = 99

        return {
            'dept': 'finance', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#2ecc71',
            'label': 'FINANCE', 'icon': '\U0001f4b0',
            'workspace_url': '/finance/index.html',
            'summary': fin_summary,
            'orion_recommendation': _rec(rec_text,
                'Finance data is available for analysis.', 'Improves CEO financial decision-making.',
                rec_conf, rec_label),
            'key_metrics': [
                _metric('MTD REVENUE',  '${:.2f}'.format(mtd_rev), 'good' if mtd_rev > 0 else 'neutral'),
                _metric('MTD EXPENSES', '${:.2f}'.format(mtd_exp), 'medium' if mtd_exp > mtd_rev else 'good'),
                _metric('NET CASH FLOW','${:.2f}'.format(mtd_prf), 'good' if mtd_prf >= 0 else 'high'),
                _metric('TRANSACTIONS', len(txns),   'neutral'),
                _metric('SUBSCRIPTIONS',len(active_subs), 'neutral'),
                _metric('BUDGET HEALTH','Positive' if mtd_prf >= 0 else 'Attention', 'good' if mtd_prf >= 0 else 'medium'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    # ── SECURITY ───────────────────────────────────────────────────
    elif dept == 'security':
        scan_raw = load_json('scan_log.json', [])
        soc      = load_json('soc_analyst_results.json', {})
        scan_entries = scan_raw if isinstance(scan_raw, list) else scan_raw.get('entries', scan_raw.get('scans', []))
        scan_count   = len(scan_entries)
        threat_count = soc.get('count', 0)
        investigations = [e for e in audit if e.get('action','').startswith('scan') or 'threat' in e.get('action','')]

        if scan_count > 0 or threat_count > 0:
            health_label, health_status, health_pct = 'Monitoring', 'active', 95
            sec_summary = ('Security Operations is actively monitoring. '
                           '{} scan(s) on record. {} threat(s) investigated. '
                           'No critical incidents detected. Athena is standing watch.'.format(scan_count, threat_count))
        else:
            health_label, health_status, health_pct = 'Nominal', 'nominal', 100
            sec_summary = ('Security Operations is nominal. No active threats detected. '
                           'Athena, Nimbus, and Sentinel are standing by. '
                           'Run a scan to establish a security baseline.')

        return {
            'dept': 'security', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#9b6bff',
            'label': 'SECURITY OPS', 'icon': '\U0001f6e1',
            'workspace_url': '/hq/index.html',
            'summary': sec_summary,
            'orion_recommendation': _rec(
                'Run a baseline security scan to establish your system health profile.',
                'No scan baseline exists. Security posture cannot be measured without scan history.',
                'Establishes threat detection baseline and surfaces any existing vulnerabilities.',
                87, 'RUN SCAN', None, 'quick_action'),
            'key_metrics': [
                _metric('SCANS RUN',       scan_count,       'good' if scan_count > 0 else 'neutral'),
                _metric('THREATS FOUND',   threat_count,     'good' if threat_count == 0 else 'high'),
                _metric('INVESTIGATIONS',  len(investigations), 'neutral'),
                _metric('CRITICAL ALERTS', 0,                'good'),
                _metric('SYSTEMS WATCHED', 1,                'good'),
                _metric('STATUS',          'NOMINAL',         'good'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    # ── COMMERCE ───────────────────────────────────────────────────
    elif dept == 'commerce':
        pipeline= load_json('commerce_pipeline.json', {'products': [], 'content_items': []})
        accts   = load_json('accounts.json', {'accounts': []}).get('accounts', [])
        products= pipeline.get('products', [])
        content = pipeline.get('content_items', [])
        etsy_ok = any(a.get('id') == 'etsy' and a.get('status') in ('connected',) for a in accts)
        tiktok_ok=any(a.get('id') == 'tiktok' and a.get('status') in ('connected',) for a in accts)

        if products:
            health_label, health_status, health_pct = 'Active', 'active', 75
            com_summary = ('{} product(s) in pipeline. '
                           '{} content item(s) in production. '
                           'Etsy: {}. TikTok: {}.'.format(
                               len(products), len(content),
                               'Connected' if etsy_ok else 'Not connected',
                               'Connected' if tiktok_ok else 'Not connected'))
        else:
            health_label, health_status, health_pct = 'Initializing', 'initializing', 30
            com_summary = ('Commerce pipeline is ready but empty. '
                           'Connect Etsy and TikTok to begin autonomous revenue generation. '
                           'Pixel is standing by to research trends and create products.')

        rec_text   = ('Connect Etsy to activate the product listing pipeline.' if not etsy_ok else
                      'Create your first product to begin the commerce pipeline.')
        rec_label  = 'CONNECT ETSY' if not etsy_ok else 'CREATE PRODUCT'
        rec_conf   = 88

        return {
            'dept': 'commerce', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#ff69b4',
            'label': 'COMMERCE', 'icon': '\U0001f6cd',
            'workspace_url': '/commerce/index.html',
            'summary': com_summary,
            'orion_recommendation': _rec(rec_text,
                'Commerce cannot generate revenue without connected accounts and products.',
                'Activates autonomous product creation and listing pipeline.', rec_conf, rec_label),
            'key_metrics': [
                _metric('PRODUCTS',    len(products), 'good' if products else 'neutral'),
                _metric('CONTENT',     len(content),  'good' if content else 'neutral'),
                _metric('ETSY',        'CONNECTED' if etsy_ok else 'PENDING', 'good' if etsy_ok else 'medium'),
                _metric('TIKTOK',      'CONNECTED' if tiktok_ok else 'PENDING', 'good' if tiktok_ok else 'medium'),
                _metric('REVENUE MTD', '$0',           'neutral'),
                _metric('LISTINGS',    0,               'neutral'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    # ── PRODUCTIVITY ───────────────────────────────────────────────
    elif dept == 'productivity':
        google = load_json('connectors/google.json', {})
        cal_ok = google.get('status') in ('connected', 'configured')
        tasks  = load_json('task_manager_results.json', {})
        cal_r  = load_json('calendar_results.json', {})
        task_count = len(tasks.get('tasks', tasks.get('results', [])))

        health_label = 'Active' if cal_ok else 'Initializing'
        health_status= 'active' if cal_ok else 'initializing'
        health_pct   = 70 if cal_ok else 30

        prod_summary = ('Productivity is {} calendar integration. '
                        '{} Google account status. '
                        'Calypso and Echo are ready to manage your schedule and communications.'.format(
                            'active with' if cal_ok else 'ready — awaiting',
                            'Connected' if cal_ok else 'Not connected'))

        return {
            'dept': 'productivity', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#3aa8c8',
            'label': 'PRODUCTIVITY', 'icon': '\U0001f4c5',
            'workspace_url': '/productivity/index.html',
            'summary': prod_summary,
            'orion_recommendation': _rec(
                'Connect Google Calendar to activate schedule management and morning briefings.',
                'Calendar integration enables automated scheduling, reminders, and focus block planning.',
                'Unlocks full executive assistant capabilities for Calypso and Echo.',
                94, 'CONNECT CALENDAR'),
            'key_metrics': [
                _metric('CALENDAR',    'CONNECTED' if cal_ok else 'PENDING', 'good' if cal_ok else 'medium'),
                _metric('TASKS TODAY', task_count, 'neutral'),
                _metric('MEETINGS',    0, 'neutral'),
                _metric('FOCUS HRS',   '0h', 'neutral'),
                _metric('REMINDERS',   0, 'neutral'),
                _metric('AUTOMATION',  'PARTIAL', 'medium'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    # ── CONNECTIONS ────────────────────────────────────────────────
    elif dept == 'connections':
        crm     = load_json('connections_crm.json', {'contacts': [], 'communication_log': [], 'stats': {}})
        accts   = load_json('accounts.json', {'accounts': []}).get('accounts', [])
        contacts= crm.get('contacts', [])
        comms   = crm.get('communication_log', [])
        li_ok   = any(a.get('id') == 'linkedin' and a.get('status') in ('connected','manual_import') for a in accts)
        gmail_ok= any(a.get('id') == 'gmail' and a.get('status') == 'connected' for a in accts)

        if contacts:
            health_label, health_status, health_pct = 'Active', 'active', 80
            con_summary = ('Connections CRM has {} contact(s) on record. '
                           '{} message(s) logged. LinkedIn: {}. Gmail: {}.'.format(
                               len(contacts), len(comms),
                               'Connected' if li_ok else 'Not connected',
                               'Connected' if gmail_ok else 'Not connected'))
        else:
            health_label, health_status, health_pct = 'Initializing', 'initializing', 30
            con_summary = ('Connections department is ready. CRM is empty. '
                           'Connect LinkedIn or Gmail to begin building your professional network database.')

        return {
            'dept': 'connections', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#9cf6ff',
            'label': 'CONNECTIONS', 'icon': '\U0001f517',
            'workspace_url': '/connections/index.html',
            'summary': con_summary,
            'orion_recommendation': _rec(
                'Connect LinkedIn to import your professional network into the CRM.' if not li_ok else
                'Add your first contact to begin building the CRM database.',
                'Network data enables automated outreach, follow-up tracking, and opportunity discovery.',
                'Activates autonomous networking and recruiter relationship management.',
                86, 'CONNECT LINKEDIN' if not li_ok else 'ADD CONTACT'),
            'key_metrics': [
                _metric('CRM CONTACTS',  len(contacts), 'good' if contacts else 'neutral'),
                _metric('MESSAGES SENT', len(comms),    'neutral'),
                _metric('LINKEDIN',      'LINKED' if li_ok else 'PENDING', 'good' if li_ok else 'medium'),
                _metric('GMAIL',         'CONNECTED' if gmail_ok else 'PENDING', 'good' if gmail_ok else 'medium'),
                _metric('RESPONSE RATE', '0%', 'neutral'),
                _metric('INTEGRATIONS',  sum(1 for a in accts if a.get('status') == 'connected'), 'neutral'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    # ── PROJECTS ───────────────────────────────────────────────────
    elif dept == 'projects':
        import json as _json
        _proj_key = 'proj.projects.v1'

        try:
            _proj_raw = load_json('projects_data.json', [])
            projects  = _proj_raw if isinstance(_proj_raw, list) else []
        except Exception:
            projects = []

        active_count   = len([p for p in projects if p.get('stage') == 'active'])
        blocked_count  = len([p for p in projects if p.get('stage') == 'blocked'])
        complete_count = len([p for p in projects if p.get('stage') == 'complete'])

        if active_count > 0:
            health_label, health_status, health_pct = 'Active', 'active', 80
        elif projects:
            health_label, health_status, health_pct = 'Monitoring', 'active', 60
        else:
            health_label, health_status, health_pct = 'Ready', 'initializing', 30

        proj_summary = (
            'Project Command Center is running. {} total project(s): {} active, {} blocked, {} complete. '
            'Planner and Tracker are monitoring all cross-department initiatives.'.format(
                len(projects), active_count, blocked_count, complete_count)
            if projects else
            'Project Command Center is ready. No projects tracked yet. '
            'Add your first project to begin coordinating across departments.'
        )

        rec_text = (
            'Review {} blocked project(s) to unblock progress.'.format(blocked_count) if blocked_count else
            'Review active project milestones and advance next steps.' if active_count else
            'Add your first cross-department project to begin.'
        )

        return {
            'dept': 'projects', 'health_label': health_label, 'health_status': health_status,
            'health_pct': health_pct, 'health_color': '#3498db',
            'label': 'PROJECTS', 'icon': '\U0001f4cb',
            'workspace_url': '/apartment/index.html',
            'summary': proj_summary,
            'orion_recommendation': _rec(
                rec_text,
                'Active project tracking drives faster goal completion across all departments.',
                'Coordinates Career, Finance, Commerce, and Security initiatives in one view.',
                85,
                'VIEW PROJECTS'),
            'key_metrics': [
                _metric('TOTAL',    len(projects),   'good' if projects else 'neutral'),
                _metric('ACTIVE',   active_count,    'good' if active_count else 'neutral'),
                _metric('BLOCKED',  blocked_count,   'medium' if blocked_count else 'good'),
                _metric('COMPLETE', complete_count,  'good' if complete_count else 'neutral'),
                _metric('AGENTS',   3,               'good'),
                _metric('DEPTS',    4,               'good'),
            ],
            'pending_decisions': pending,
            'recent_activity':   recent,
            'last_updated': ts(),
        }

    else:
        return {'error': 'Unknown department: ' + dept}


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

        # ── Phase 22: Executive Control Center data ───────────────────────────────

        elif path.startswith('/api/ecc/dept/'):
            dept_name = path.split('/api/ecc/dept/')[-1].strip('/')
            safe_dept = ''.join(c for c in dept_name if c.isalnum() or c == '_')
            self._send(200, _build_ecc_data(safe_dept))

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

        # ── Phase 21: ORION Morning Brief (aggregates all departments) ────────────

        elif path == '/api/orion/morning-brief':
            now = datetime.now()
            hour = now.hour
            if hour < 12:   time_of_day = 'morning'
            elif hour < 17: time_of_day = 'afternoon'
            else:            time_of_day = 'evening'

            # Load all data in one pass
            q_data      = load_json('orion_queue.json',    {'queue': []})
            ledger      = load_json('finance_ledger.json', {'transactions': [], 'summary': {}})
            career_mem  = load_json('career_memory.json',  {})
            pipeline    = load_json('commerce_pipeline.json', {'products': [], 'content_items': []})
            crm_data    = load_json('connections_crm.json', {'contacts': []})
            accts_data  = load_json('accounts.json',       {'accounts': []})
            audit_data  = load_json('audit_log.json',      {'entries': []})

            queue        = q_data.get('queue', [])
            pending      = [x for x in queue if x.get('status') == 'awaiting_ceo']
            fin_summary  = ledger.get('summary', {})
            career_prof  = career_mem.get('profile', {})
            career_docs  = career_prof.get('source_documents', [])
            career_skills= career_prof.get('skills', [])
            products     = pipeline.get('products', [])
            contacts     = crm_data.get('contacts', [])
            acct_list    = accts_data.get('accounts', [])
            audit_entries= audit_data.get('entries', [])

            connected_ids = {a['id'] for a in acct_list if a.get('status') in ('connected', 'manual_import', 'configured')}
            acct_connected= len(connected_ids)

            # Department health cards
            dept_health = {
                'security': {
                    'label': 'SECURITY', 'icon': '\U0001f6e1', 'color': '#9b6bff',
                    'health': 100, 'status': 'nominal',
                    'summary': 'No active threats. System nominal.',
                    'link': '/hq/ecc.html', 'needs_attention': [],
                },
                'finance': {
                    'label': 'FINANCE', 'icon': '\U0001f4b0', 'color': '#2ecc71',
                    'health': 90 if fin_summary.get('mtd_revenue', 0) > 0 else 60,
                    'status': 'active' if fin_summary.get('mtd_revenue', 0) > 0 else 'initializing',
                    'summary': '${:.2f} MTD revenue.'.format(fin_summary.get('mtd_revenue', 0)) if fin_summary.get('mtd_revenue', 0) else 'No revenue recorded yet.',
                    'link': '/finance/ecc.html', 'needs_attention': [],
                },
                'career': {
                    'label': 'CAREER', 'icon': '\U0001f4bc', 'color': '#7b6bff',
                    'health': 85 if career_skills else 40,
                    'status': 'active' if career_skills else 'initializing',
                    'summary': '{} skills indexed · Target ${:,}'.format(len(career_skills), career_prof.get('salary_min', 40000) or 40000) if career_skills else 'No documents indexed.',
                    'link': '/housing/ecc.html',
                    'needs_attention': [] if 'linkedin' in connected_ids else ['Connect LinkedIn'],
                },
                'commerce': {
                    'label': 'COMMERCE', 'icon': '\U0001f6cd', 'color': '#ff69b4',
                    'health': 65 if products else 25,
                    'status': 'active' if products else 'initializing',
                    'summary': '{} product(s) in pipeline.'.format(len(products)) if products else 'Pipeline empty.',
                    'link': '/commerce/ecc.html',
                    'needs_attention': ['Connect Etsy'] if 'etsy' not in connected_ids else [],
                },
                'productivity': {
                    'label': 'PRODUCTIVITY', 'icon': '\U0001f4c5', 'color': '#3aa8c8',
                    'health': 30, 'status': 'initializing',
                    'summary': 'Calendar not connected.',
                    'link': '/productivity/ecc.html',
                    'needs_attention': ['Connect Google Calendar'],
                },
                'connections': {
                    'label': 'CONNECTIONS', 'icon': '\U0001f517', 'color': '#9cf6ff',
                    'health': 55 if contacts else 25,
                    'status': 'active' if contacts else 'initializing',
                    'summary': '{} contact(s) in CRM.'.format(len(contacts)) if contacts else 'CRM empty.',
                    'link': '/connections/ecc.html',
                    'needs_attention': ['Connect LinkedIn', 'Connect Gmail'] if acct_connected < 2 else [],
                },
            }

            # Executive recommendations from real data
            recs = []
            if pending:
                recs.append({'priority': 'high', 'confidence': 100,
                    'text': '{} decision{} await your approval.'.format(len(pending), 's' if len(pending) != 1 else ''),
                    'action': 'review_approvals'})
            if career_skills and 'linkedin' not in connected_ids:
                recs.append({'priority': 'medium', 'confidence': 88,
                    'text': 'Career documents indexed and ready. Connect LinkedIn to begin live job scouting.',
                    'action': 'connect_linkedin'})
            if 'etsy' not in connected_ids and not products:
                recs.append({'priority': 'medium', 'confidence': 82,
                    'text': 'Commerce pipeline ready. Connect Etsy to activate revenue generation.',
                    'action': 'connect_etsy'})
            if not recs:
                recs.append({'priority': 'low', 'confidence': 95,
                    'text': 'All departments nominal. No immediate action required.',
                    'action': None})

            # Overnight summary
            overnight = {
                'tasks_completed': len(audit_entries),
                'decisions_pending': len(pending),
                'threats_investigated': 0,
                'revenue_mtd': fin_summary.get('mtd_revenue', 0),
                'jobs_found': 0,
                'accounts_connected': acct_connected,
            }

            # Snapshot
            dept_active = sum(1 for d in dept_health.values() if d['status'] == 'active')
            snapshot = {
                'employees_online': 18,
                'departments_active': dept_active,
                'tasks_today': 0,
                'revenue_mtd': fin_summary.get('mtd_revenue', 0),
                'threats': 0,
                'approvals_pending': len(pending),
                'accounts_connected': acct_connected,
                'accounts_total': len(acct_list),
            }

            # Recent activity (newest first, max 8)
            recent = [{'ts': e.get('ts', ''), 'agent': e.get('agent', ''), 'action': e.get('action', ''), 'detail': e.get('detail', {})}
                      for e in audit_entries[-8:][::-1]]

            self._send(200, {
                'greeting': 'Good {}, Zee.'.format(time_of_day),
                'date':     now.strftime('%A, %B %d, %Y'),
                'time':     now.strftime('%I:%M %p'),
                'generated_at': ts(),
                'overnight':    overnight,
                'dept_health':  dept_health,
                'pending_decisions': pending[:5],
                'recommendations':   recs[:3],
                'recent_activity':   recent,
                'snapshot':     snapshot,
            })

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

        elif path == '/api/security/scans':
            raw = load_json('scan_log.json', [])
            scans = raw if isinstance(raw, list) else raw.get('entries', [])
            self._send(200, {'scans': scans, 'count': len(scans)})

        # ── System health (developer diagnostics page only) ───────────────────

        elif path == '/api/system/health':
            import subprocess
            uptime_s = int((datetime.now() - _SERVER_BOOT).total_seconds())
            build = 'unknown'
            try:
                build = subprocess.check_output(
                    ['git', 'rev-parse', '--short', 'HEAD'],
                    cwd=ROOT, stderr=subprocess.DEVNULL
                ).decode('utf-8', errors='replace').strip()
            except Exception:
                pass
            data_files = []
            try:
                for fn in sorted(os.listdir(DATA_DIR)):
                    if fn.endswith('.json'):
                        fp = os.path.join(DATA_DIR, fn)
                        try:
                            sz = os.path.getsize(fp)
                        except Exception:
                            sz = 0
                        data_files.append({'name': fn, 'size_bytes': sz})
            except Exception:
                pass
            self._send(200, {
                'phase':           '25.5',
                'cos_version':     '0.4.0',
                'orion_version':   '1.0.0',
                'build':           build,
                'server_time':     ts(),
                'server_boot':     _SERVER_BOOT.isoformat(),
                'uptime_s':        uptime_s,
                'port':            PORT,
                'data_files':      data_files,
                'data_file_count': len(data_files),
            })

        # ── Marketplace Integrations (status + connect init) ──────────────────

        elif path.startswith('/api/integrations/'):
            parts    = path.split('/')            # ['','api','integrations','etsy','status']
            platform = parts[3] if len(parts) > 3 else ''
            action   = parts[4] if len(parts) > 4 else ''
            integrations = load_json('integrations.json', {})
            state = integrations.get(platform, {})

            if action == 'status':
                self._send(200, {
                    'platform': platform,
                    'status':   state.get('status', 'not_connected'),
                    'note':     state.get('note', ''),
                    'last_sync':     state.get('last_sync'),
                    'listings_count':state.get('listings_count', 0),
                })

            elif action == 'connect':
                # Placeholder: no real OAuth until credentials are added.
                # Frontend reads redirect_url; None signals "not configured yet".
                self._send(200, {
                    'platform':     platform,
                    'status':       'not_configured',
                    'redirect_url': None,
                    'note':         (
                        'Integration not configured yet. '
                        'To enable ' + platform.upper() + ' OAuth, add credentials to '
                        'data/integrations.json and restart the server.'
                    ),
                })

            elif action == 'callback':
                # OAuth callback placeholder.  Real flow wires token here.
                self._send(200, {
                    'platform': platform,
                    'status':   'not_configured',
                    'note':     'OAuth callback received but no credentials configured.',
                })

            else:
                self._send(404, {'error': 'Unknown integration action: ' + action})

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

        elif path.startswith('/api/integrations/') and path.endswith('/sync'):
            parts    = path.split('/')
            platform = parts[3] if len(parts) > 3 else ''
            integrations = load_json('integrations.json', {})
            state = integrations.get(platform, {})

            if state.get('status') != 'connected':
                self._send(200, {
                    'status':  'not_configured',
                    'platform': platform,
                    'message': (
                        platform.upper() + ' integration is not configured. '
                        'Add API credentials to data/integrations.json to enable live sync.'
                    ),
                })
            else:
                # Real sync logic goes here when credentials are present.
                self._send(200, {
                    'ok': True,
                    'platform':       platform,
                    'listings_synced':0,
                    'message':        'Sync complete (no new data — credentials configured but API not yet wired).',
                })

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
        print('  ORION: http://localhost:{}/'.format(PORT))
        print('  HQ:    http://localhost:{}/hallway/index.html'.format(PORT))
        print('  API:   http://localhost:{}/api/status'.format(PORT))
        print()
        print('Press Ctrl+C to stop.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
            sys.exit(0)
