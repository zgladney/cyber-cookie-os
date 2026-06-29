/* CyberCookieOS — Career Intelligence Center Workspace (Phase 13)
   Application tracker + Saved search + NOVA job intelligence search
   + Skill Gap Analyzer + Scout-X geographic analysis.
   NOTE: dept stays 'housing' (baked into employee roster). */

/* ================================================================
   SHARED DATA — Job listings, skills, pipeline, market data
================================================================ */
var JOB_LISTINGS = [
  // South Jersey
  { id:'j1',  title:'Help Desk Technician I',         company:'TechPath Solutions',   salary:42000, location:'Cherry Hill, NJ',   region:'south_jersey', workType:'hybrid',  type:'help_desk',    skills:['Windows 10','Office 365','Active Directory','Ticketing Systems','Hardware Troubleshooting'], source:'Indeed',         link:'https://www.indeed.com/jobs?q=help+desk+cherry+hill+nj',  desc:'Tier 1/2 desktop support for 200+ user environment. Windows 10, Active Directory, O365. ITIL helpful.' },
  { id:'j2',  title:'IT Support Specialist',          company:'Camden County Govt',    salary:45000, location:'Lindenwold, NJ',    region:'south_jersey', workType:'onsite',  type:'it_ops',       skills:['Windows 10','Networking','Hardware Troubleshooting','Customer Service','Documentation'],       source:'County Website',  link:'https://www.camdencounty.com/government/departments/human-resources/', desc:'County-wide IT support. PC imaging, network troubleshooting, user training.' },
  { id:'j3',  title:'Service Desk Analyst',           company:'Lockheed Martin',       salary:52000, location:'Moorestown, NJ',    region:'south_jersey', workType:'hybrid',  type:'service_desk', skills:['Windows 10','ITSM','ServiceNow','Documentation','Active Directory'],                          source:'LM Careers',      link:'https://www.lockheedmartin.com/en-us/careers.html',        desc:'ITSM-focused role. ServiceNow tickets, SLA management. DoD contractor environment.' },
  { id:'j4',  title:'NOC Technician',                 company:'GTT Communications',    salary:48000, location:'Mt Laurel, NJ',     region:'south_jersey', workType:'hybrid',  type:'noc',          skills:['Network Monitoring','Cisco','Routing Protocols','ITIL','TCP/IP Networking'],                   source:'LinkedIn',        link:'https://www.linkedin.com/jobs/search/?keywords=NOC+technician+new+jersey', desc:'24/7 NOC environment. Monitor global WAN/LAN. Cisco IOS, incident escalation.' },
  { id:'j5',  title:'Systems Administrator I',        company:'Cooper Health System',  salary:58000, location:'Camden, NJ',        region:'south_jersey', workType:'onsite',  type:'systems_admin', skills:['Active Directory','Windows Server','Azure','PowerShell','VMware'],                          source:'Cooper Jobs',     link:'https://careers.cooperhealth.org/',                        desc:'Healthcare IT admin. AD, GPO, Azure AD sync, VMware vSphere. On-call rotation.' },
  // Philadelphia
  { id:'j6',  title:'Junior SOC Analyst',             company:'Comcast',               salary:55000, location:'Philadelphia, PA',  region:'philadelphia', workType:'hybrid',  type:'soc_analyst',  skills:['SIEM','Splunk','Incident Response','Network Analysis','Threat Hunting'],                     source:'LinkedIn',        link:'https://careers.comcast.com/',                             desc:'Entry-level security monitoring. Splunk dashboards, alert triage, ticket escalation.' },
  { id:'j7',  title:'Cloud Support Engineer',         company:'AWS / Amazon',          salary:65000, location:'Philadelphia, PA',  region:'philadelphia', workType:'hybrid',  type:'cloud_support', skills:['AWS','Linux','Python','Networking','Docker'],                                                 source:'Amazon Jobs',     link:'https://www.amazon.jobs/en/teams/aws',                     desc:'Tier 1 AWS support. Customer-facing troubleshooting of EC2, S3, networking issues.' },
  { id:'j8',  title:'Microsoft 365 Support Spec.',    company:'CDW',                   salary:50000, location:'Cherry Hill, NJ',   region:'south_jersey', workType:'hybrid',  type:'ms_support',   skills:['Office 365','Intune','Azure AD','Exchange Online','PowerShell'],                              source:'CDW Careers',     link:'https://www.cdw.com/content/cdw/en/about/careers.html',    desc:'M365 specialist. Tenant admin, license management, Exchange/Teams troubleshooting.' },
  { id:'j9',  title:'IT Operations Specialist',       company:'Jefferson Health',       salary:54000, location:'Philadelphia, PA',  region:'philadelphia', workType:'hybrid',  type:'it_ops',        skills:['ITSM','Windows Server','VMware','Backup Solutions','Documentation'],                         source:'Indeed',          link:'https://careers.jeffersonhealth.org/',                     desc:'Hospital IT ops. Server monitoring, patch management, backup verification.' },
  { id:'j10', title:'Junior Security Analyst',        company:'Unisys Corporation',    salary:60000, location:'Blue Bell, PA',     region:'philadelphia', workType:'hybrid',  type:'security_jr',  skills:['CompTIA Security+','Vulnerability Scanning','SIEM','EDR Tools','Incident Response'],         source:'Unisys Careers',  link:'https://www.unisys.com/careers/',                          desc:'Entry security role. VA scans, EDR alert review, vulnerability reporting.' },
  // Remote
  { id:'j11', title:'Remote Help Desk Technician',    company:'Conduent Inc',          salary:43000, location:'Remote — US',       region:'remote',       workType:'remote',  type:'help_desk',    skills:['Windows 10','Citrix','VPN','Office 365','Customer Service'],                                 source:'Indeed',          link:'https://careers.conduent.com/',                            desc:'100% remote Tier 1 support. Citrix/VDI, VPN troubleshooting. Healthcare client base.' },
  { id:'j12', title:'Remote Service Desk Specialist', company:'DXC Technology',        salary:46000, location:'Remote — US',       region:'remote',       workType:'remote',  type:'service_desk', skills:['ServiceNow','ITIL','Windows 10','Active Directory','Documentation'],                          source:'DXC Careers',     link:'https://careers.dxc.com/',                                 desc:'Remote ITSM role. ITIL v4, ServiceNow, global enterprise clients.' },
  { id:'j13', title:'Remote Cloud Support Specialist',company:'Rackspace Technology',  salary:62000, location:'Remote — US',       region:'remote',       workType:'remote',  type:'cloud_support', skills:['AWS','Azure','Linux','Docker','Python'],                                                      source:'LinkedIn',        link:'https://www.rackspace.com/talent',                         desc:'Multi-cloud support. AWS + Azure. Linux admin. Customer technical guidance.' },
  { id:'j14', title:'Remote IT Support Tier 1',       company:'Teleperformance',       salary:40000, location:'Remote — US',       region:'remote',       workType:'remote',  type:'help_desk',    skills:['Windows 10','VoIP','Customer Service','Basic Networking','Ticketing Systems'],               source:'Glassdoor',       link:'https://jobs.teleperformance.com/',                         desc:'Entry-level remote support. High volume call center. WFH equipment provided.' },
  { id:'j15', title:'Remote Junior SOC Analyst',      company:'Secureworks',           salary:58000, location:'Remote — US',       region:'remote',       workType:'remote',  type:'soc_analyst',  skills:['Splunk','Threat Hunting','Incident Response','Python','MITRE ATT&CK'],                      source:'Secureworks Jobs', link:'https://www.secureworks.com/careers',                     desc:'100% remote SOC. Managed detection & response. Splunk-heavy. MITRE ATT&CK framework.' },
];

var MY_SKILLS = [
  'Windows 10', 'Windows 10/11', 'Office 365', 'Customer Service',
  'Hardware Troubleshooting', 'TCP/IP Networking', 'Active Directory',
  'Basic Networking', 'Networking Fundamentals', 'Ticketing Systems',
  'Remote Desktop', 'Documentation', 'VoIP',
];

var PIPELINE_STAGES = [
  { id:'saved',              label:'SAVED',              color:'rgba(150,80,255,.6)' },
  { id:'applied',            label:'APPLIED',            color:'rgba(58,168,200,.8)' },
  { id:'interview_scheduled',label:'INTERVIEW SCHED.',   color:'rgba(255,200,60,.8)' },
  { id:'interview_complete', label:'INTERVIEW DONE',     color:'rgba(255,140,60,.8)' },
  { id:'offer',              label:'OFFER',              color:'rgba(125,255,156,.9)' },
  { id:'rejected',           label:'REJECTED',           color:'rgba(255,80,80,.7)'  },
  { id:'ghosted',            label:'GHOSTED',            color:'rgba(120,120,120,.5)' },
  { id:'follow_up',          label:'FOLLOW-UP',          color:'rgba(255,170,80,.7)' },
];

var US_MARKET_DATA = [
  { state:'Virginia',       abbr:'VA', socJobs:1240, helpDeskJobs:980,  avgSalary:72000, costOfLiving:92,  remoteScore:85, growthPct:38, note:'Strong government/DOD cybersecurity market.' },
  { state:'Maryland',       abbr:'MD', socJobs:1180, helpDeskJobs:850,  avgSalary:68000, costOfLiving:95,  remoteScore:80, growthPct:31, note:'NSA/DHS proximity. Heavy security clearance roles.' },
  { state:'Texas',          abbr:'TX', socJobs:1050, helpDeskJobs:1200, avgSalary:55000, costOfLiving:75,  remoteScore:88, growthPct:29, note:'Austin/DFW booming. Lower cost of living advantage.' },
  { state:'North Carolina', abbr:'NC', socJobs:820,  helpDeskJobs:760,  avgSalary:60000, costOfLiving:72,  remoteScore:82, growthPct:34, note:'Research Triangle Park. Growing tech corridor.' },
  { state:'Georgia',        abbr:'GA', socJobs:910,  helpDeskJobs:880,  avgSalary:58000, costOfLiving:70,  remoteScore:84, growthPct:27, note:'Atlanta tech hub. Diverse IT job market.' },
  { state:'Colorado',       abbr:'CO', socJobs:780,  helpDeskJobs:720,  avgSalary:65000, costOfLiving:88,  remoteScore:90, growthPct:32, note:'Remote-friendly culture. Aerospace/tech employers.' },
  { state:'Washington',     abbr:'WA', socJobs:890,  helpDeskJobs:950,  avgSalary:78000, costOfLiving:105, remoteScore:87, growthPct:25, note:'Microsoft/Amazon HQ. High pay, high cost.' },
  { state:'Florida',        abbr:'FL', socJobs:860,  helpDeskJobs:920,  avgSalary:54000, costOfLiving:78,  remoteScore:86, growthPct:30, note:'Tampa/Orlando growing fast. No state income tax.' },
  { state:'Pennsylvania',   abbr:'PA', socJobs:740,  helpDeskJobs:820,  avgSalary:56000, costOfLiving:82,  remoteScore:78, growthPct:18, note:'Your current metro. Philadelphia corridor.' },
  { state:'New Jersey',     abbr:'NJ', socJobs:680,  helpDeskJobs:750,  avgSalary:56000, costOfLiving:98,  remoteScore:76, growthPct:15, note:'Current location. High cost but familiar market.' },
];

// Type label map used across sections
var TYPE_LABELS = {
  help_desk:'Help Desk', service_desk:'Service Desk', soc_analyst:'SOC Analyst',
  noc:'NOC', cloud_support:'Cloud Support', systems_admin:'Systems Admin',
  it_ops:'IT Ops', security_jr:'Junior Security', ms_support:'M365 Support',
};

// Compute a match % between MY_SKILLS and a job (used in several places)
function cicJobMatch(job) {
  if (!job || !job.skills || !job.skills.length) return 0;
  var have = job.skills.filter(function (s) { return MY_SKILLS.indexOf(s) >= 0; });
  return Math.round((have.length / job.skills.length) * 100);
}

/* ================================================================
   IIFE 1 — APPLICATION TRACKER + SAVED SEARCH CRITERIA
================================================================ */
(function () {
  'use strict';

  var APPS_KEY   = 'cic.apps';
  var SEARCH_KEY = 'cic.search';

  var DEFAULT_APPS = [
    { id:'a1', title:'Help Desk Technician', company:'TechPath Solutions', salary:42000, location:'Cherry Hill, NJ', status:'saved',    link:'', notes:'Found on Indeed. Hybrid role. Matches my skills.', ts: Date.now() - 86400000 },
    { id:'a2', title:'Service Desk Analyst', company:'Lockheed Martin',    salary:52000, location:'Moorestown, NJ', status:'applied',   link:'', notes:'Applied online 6/28. Great company for growth.',   ts: Date.now() - 172800000 },
    { id:'a3', title:'NOC Technician',       company:'GTT Communications', salary:48000, location:'Mt Laurel, NJ',  status:'saved',    link:'', notes:'Need to brush up on networking before applying.',   ts: Date.now() - 259200000 },
  ];

  var DEFAULT_SEARCH = {
    regions:  'South Jersey\nPhiladelphia\nRemote (United States)',
    minSalary: 40000,
    jobTypes:  'help desk, service desk, SOC analyst, cloud support',
    remote:    true,
    hybrid:    true,
    onsite:    false,
  };

  var _editingId = null;

  function loadApps()      { return COS.state.get(APPS_KEY) || DEFAULT_APPS.map(function (a) { return Object.assign({}, a); }); }
  function saveApps(a)     { COS.state.set(APPS_KEY, a); }
  function loadSearch()    { return COS.state.get(SEARCH_KEY) || Object.assign({}, DEFAULT_SEARCH); }
  function saveSearchCrit(s){ COS.state.set(SEARCH_KEY, s); }

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function stageLabel(id) {
    for (var i = 0; i < PIPELINE_STAGES.length; i++) if (PIPELINE_STAGES[i].id === id) return PIPELINE_STAGES[i].label;
    return (id || '').toUpperCase();
  }

  // ── SEARCH CRITERIA ──────────────────────────────────────────────

  function renderSearch() {
    var s  = loadSearch();
    var rg = document.getElementById('cic-searchRegions');   if (rg) rg.value = s.regions || '';
    var ms = document.getElementById('cic-searchMinSalary'); if (ms) ms.value = s.minSalary || '';
    var tp = document.getElementById('cic-searchTypes');     if (tp) tp.value = s.jobTypes || '';
    var rm = document.getElementById('cic-searchRemote');    if (rm) rm.checked = !!s.remote;
    var hy = document.getElementById('cic-searchHybrid');    if (hy) hy.checked = !!s.hybrid;
    var on = document.getElementById('cic-searchOnsite');    if (on) on.checked = !!s.onsite;
  }

  function wireSearch() {
    var saveBtn = document.getElementById('cic-saveSearch');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function () {
      var s = {
        regions:   (document.getElementById('cic-searchRegions').value || '').trim(),
        minSalary: parseInt(document.getElementById('cic-searchMinSalary').value, 10) || 0,
        jobTypes:  (document.getElementById('cic-searchTypes').value || '').trim(),
        remote:    document.getElementById('cic-searchRemote').checked,
        hybrid:    document.getElementById('cic-searchHybrid').checked,
        onsite:    document.getElementById('cic-searchOnsite').checked,
      };
      saveSearchCrit(s);
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Career search criteria saved — min salary $' + s.minSalary, source: 'user' });
      showCicToast('Search criteria saved!');
    });
  }

  // ── APPLICATION TRACKER ──────────────────────────────────────────

  function renderApps() {
    var list      = loadApps();
    var container = document.getElementById('cic-appContainer');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="ws-empty">No applications yet. Add one below.</div>';
      return;
    }

    container.innerHTML = '';
    list.forEach(function (a) {
      var card = document.createElement('div');
      card.className = 'cic-appCard';

      var linkHtml = a.link ? '<a href="' + esc(a.link) + '" target="_blank" rel="noopener" style="font-size:8px;color:rgba(123,107,255,.6);text-decoration:none">🔗 VIEW</a>' : '';

      card.innerHTML =
        '<div class="cic-appHeader">' +
          '<div style="min-width:0">' +
            '<div class="cic-appTitle">' + esc(a.title) + '</div>' +
            '<div class="cic-appCompany">🏢 ' + esc(a.company || '—') + (a.location ? ' · 📍 ' + esc(a.location) : '') + '</div>' +
          '</div>' +
          '<span class="cic-appStatus cic-app-' + a.status + '">' + stageLabel(a.status) + '</span>' +
        '</div>' +
        '<div class="cic-appSalary">$' + (a.salary || 0).toLocaleString() + '<span style="font-size:8px;color:rgba(200,160,255,.4)">/yr</span></div>' +
        (a.notes ? '<div style="font-size:8px;color:rgba(200,160,255,.4);font-style:italic;margin:4px 0">' + esc(a.notes) + '</div>' : '') +
        '<div class="ws-listingActions" style="margin-top:6px;display:flex;gap:6px;align-items:center">' +
          linkHtml +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost"  data-action="edit"   data-id="' + a.id + '">EDIT</button>' +
          '<button class="ws-btn ws-btn-sm ws-btn-danger" data-action="delete" data-id="' + a.id + '">DELETE</button>' +
        '</div>';
      container.appendChild(card);
    });
  }

  function wireAppActions() {
    var container = document.getElementById('cic-appContainer');
    if (!container) return;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = loadApps();

      if (action === 'delete') {
        list = list.filter(function (a) { return a.id !== id; });
        saveApps(list);
        COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Application removed from tracker.', source: 'user' });
        renderApps();
      } else if (action === 'edit') {
        var item = list.find(function (a) { return a.id === id; });
        if (!item) return;
        _editingId = id;
        populateForm(item);
        var panel = document.getElementById('cic-addPanel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function populateForm(item) {
    setValue('cic-newTitle',    item.title    || '');
    setValue('cic-newCompany',  item.company  || '');
    setValue('cic-newSalary',   item.salary   || '');
    setValue('cic-newLocation', item.location || '');
    setValue('cic-newLink',     item.link     || '');
    setValue('cic-newStatus',   item.status   || 'saved');
    setValue('cic-newNotes',    item.notes    || '');
    var addBtn = document.getElementById('cic-submitApp');
    if (addBtn) addBtn.textContent = '✓ UPDATE APPLICATION';
  }

  function clearForm() {
    ['cic-newTitle','cic-newCompany','cic-newSalary','cic-newLocation','cic-newLink','cic-newNotes'].forEach(function (id) { setValue(id, ''); });
    setValue('cic-newStatus', 'saved');
    _editingId = null;
    var addBtn = document.getElementById('cic-submitApp');
    if (addBtn) addBtn.textContent = '+ ADD APPLICATION';
  }

  function wireAddForm() {
    var btn = document.getElementById('cic-submitApp');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var title = (document.getElementById('cic-newTitle').value || '').trim();
      if (!title) {
        var el = document.getElementById('cic-newTitle');
        el.focus();
        el.classList.add('ws-input-error');
        setTimeout(function () { el.classList.remove('ws-input-error'); }, 1000);
        return;
      }

      var company = (document.getElementById('cic-newCompany').value || '').trim();
      var item = {
        id:       _editingId || 'a' + Date.now(),
        title:    title,
        company:  company,
        salary:   parseInt(document.getElementById('cic-newSalary').value, 10) || 0,
        location: (document.getElementById('cic-newLocation').value || '').trim(),
        link:     (document.getElementById('cic-newLink').value || '').trim(),
        status:   document.getElementById('cic-newStatus').value || 'saved',
        notes:    (document.getElementById('cic-newNotes').value || '').trim(),
        ts:       Date.now(),
      };

      var list = loadApps();
      if (_editingId) {
        var idx = list.findIndex(function (a) { return a.id === _editingId; });
        if (idx > -1) list[idx] = item;
      } else {
        list.unshift(item);
      }
      saveApps(list);
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Application tracked: ' + title + ' @ ' + (company || 'N/A'), source: 'user' });
      if (!_editingId) COS.notifications.add('New application tracked: ' + title, 'normal');

      if (typeof OE !== 'undefined') {
        OE.generate({
          type:    'application_update',
          title:   _editingId ? 'Application Updated' : 'Application Tracked',
          summary: title + ' @ ' + (company || 'N/A') + ' — status: ' + stageLabel(item.status) + ', $' + item.salary + '/yr',
        }, 'nova', 'housing');
      }

      clearForm();
      renderApps();
      showCicToast(_editingId ? 'Application updated!' : 'Application added!');
    });

    var cancelBtn = document.getElementById('cic-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { clearForm(); showCicToast('Edit cancelled.'); });
  }

  // ── HELPERS ──────────────────────────────────────────────────────

  function setValue(id, val) { var el = document.getElementById(id); if (el) el.value = val; }
  function showCicToast(msg) {
    var t = document.getElementById('hs-toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(function () { t.style.opacity = '0'; }, 2400);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderSearch();
    wireSearch();
    renderApps();
    wireAppActions();
    wireAddForm();
    COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Career Intelligence Center loaded — tracking ' + loadApps().length + ' applications.', source: 'system' });
  });

})();

/* ================================================================
   IIFE 2 — NOVA JOB INTELLIGENCE SEARCH
   South Jersey · Philadelphia · Remote — Simulated / Scraper-Ready
================================================================ */
(function () {
  'use strict';

  var SAVED_KEY        = 'cic.jobs.saved';
  var HIDDEN_KEY       = 'cic.jobs.hidden';
  var STATUS_KEY       = 'cic.jobs.statuses';
  var NOTES_KEY        = 'cic.jobs.notes';
  var currentDisplayed = [];

  var RECRUITER_MSG =
    'Hello,\n\n' +
    'I came across this opportunity and I am very interested in learning more. ' +
    'I have experience in IT support, help desk operations, and am actively pursuing CompTIA certifications. ' +
    'I am located in South Jersey and am open to hybrid and remote positions.\n\n' +
    'Could you please let me know if this role is still available and the best way to apply?\n\n' +
    'Thank you for your time — I look forward to connecting!';

  // ── STATE HELPERS ───────────────────────────────────────────

  function getSaved()    { return COS.state.get(SAVED_KEY)  || []; }
  function getHidden()   { return COS.state.get(HIDDEN_KEY) || []; }
  function getStatuses() { return COS.state.get(STATUS_KEY) || {}; }
  function getNotes()    { return COS.state.get(NOTES_KEY)  || {}; }

  function toggleSave(id) {
    var s = getSaved();
    var i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else s.push(id);
    COS.state.set(SAVED_KEY, s);
  }
  function hideJob(id) {
    var h = getHidden();
    if (h.indexOf(id) < 0) h.push(id);
    COS.state.set(HIDDEN_KEY, h);
  }
  function clearHidden() { COS.state.set(HIDDEN_KEY, []); }
  function setStatus(id, status) { var st = getStatuses(); st[id] = status; COS.state.set(STATUS_KEY, st); }
  function saveNote(id, text)    { var n = getNotes(); n[id] = text; COS.state.set(NOTES_KEY, n); }

  // ── SCRAPER FRAMEWORK STUBS ─────────────────────────────────
  // Connect a real scraper by replacing the body of fetchJobListings.

  function fetchJobListings(filters) {
    return JOB_LISTINGS; // currently returns simulated data
  }

  // ── FILTER ──────────────────────────────────────────────────

  function filterJobs(filters, source) {
    var list    = source || JOB_LISTINGS;
    var hidden  = getHidden();
    var keyword = (filters.keyword || '').toLowerCase().trim();
    return list.filter(function (j) {
      if (hidden.indexOf(j.id) >= 0) return false;
      if (filters.region !== 'all' && filters.region !== 'national') {
        if (j.region !== filters.region) return false;
      }
      if (filters.type !== 'all' && j.type !== filters.type) return false;
      if (j.salary < filters.minSalary) return false;
      if (filters.workType !== 'all' && j.workType !== filters.workType) return false;
      if (keyword && !(
        (j.title    || '').toLowerCase().indexOf(keyword) >= 0 ||
        (j.company  || '').toLowerCase().indexOf(keyword) >= 0 ||
        (j.location || '').toLowerCase().indexOf(keyword) >= 0 ||
        (j.desc     || '').toLowerCase().indexOf(keyword) >= 0 ||
        (j.skills   || []).join(' ').toLowerCase().indexOf(keyword) >= 0
      )) return false;
      return true;
    });
  }

  // ── CARD BUILD ──────────────────────────────────────────────

  function cardStatusInfo(j) {
    var saved    = getSaved();
    var statuses = getStatuses();
    var st = statuses[j.id];
    if (st === 'interview_scheduled' || st === 'interview_complete') return { cls: 'sp-status-scheduled', txt: '📅 INTERVIEW' };
    if (st === 'applied')   return { cls: 'sp-status-contacted', txt: '✓ APPLIED' };
    if (st === 'offer')     return { cls: 'sp-status-scheduled', txt: '🏆 OFFER' };
    if (saved.indexOf(j.id) >= 0) return { cls: 'sp-status-saved', txt: '★ SAVED' };
    return { cls: 'sp-status-new', txt: '● NEW' };
  }

  function buildCard(j, inSavedSection) {
    var saved   = getSaved();
    var notes   = getNotes();
    var isSaved = saved.indexOf(j.id) >= 0;
    var note    = notes[j.id] || '';
    var si      = cardStatusInfo(j);
    var typeLbl = TYPE_LABELS[j.type] || j.type;
    var match   = cicJobMatch(j);

    var skillPills = (j.skills || []).map(function (s) {
      var have = MY_SKILLS.indexOf(s) >= 0;
      return '<span class="cic-skillPill ' + (have ? 'cic-pill-have' : 'cic-pill-missing') + '">' + s + '</span>';
    }).join('');

    var remoteBadge = j.workType === 'remote' ? '<span class="sp-badge sp-family">🌐 Remote</span>' : '';

    return (
      '<div class="sp-propCard" id="sp-card-' + j.id + '" data-id="' + j.id + '">' +
        '<div class="sp-propHeader" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
          '<div style="min-width:0">' +
            '<div class="sp-propAddr">💼 ' + j.title + '</div>' +
            '<div class="sp-propCompany" style="font-size:8px;color:rgba(200,160,255,.45);margin-top:2px;letter-spacing:.3px">🏢 ' + j.company + '</div>' +
          '</div>' +
          '<span class="sp-cardStatus ' + si.cls + '" style="flex-shrink:0">' + si.txt + '</span>' +
        '</div>' +
        '<div class="sp-propRent">$' + j.salary.toLocaleString() + '<span>/yr</span></div>' +
        '<div class="sp-propMeta">' +
          '<span>📍 ' + j.location + '</span>' +
          '<span>' + j.workType.charAt(0).toUpperCase() + j.workType.slice(1) + '</span>' +
          '<span class="sp-badge">' + typeLbl + '</span>' +
          '<span class="sp-badge sp-voucher">' + match + '% MATCH</span>' +
          remoteBadge +
        '</div>' +
        '<div class="cic-skills" style="margin:6px 0">' + skillPills + '</div>' +
        '<div class="sp-propDesc">' + (j.desc || '') + '</div>' +
        '<div class="sp-source" style="font-size:7px;color:rgba(200,160,255,.3);letter-spacing:.3px;margin-bottom:8px">Source: ' +
          (j.link
            ? '<a href="' + j.link + '" target="_blank" rel="noopener noreferrer" style="color:rgba(123,107,255,.5);text-decoration:none">' + (j.source || 'Unknown') + ' ↗</a>'
            : (j.source || 'Unknown')) +
        '</div>' +
        '<textarea class="sp-cardNotes" rows="2" placeholder="Notes..." data-id="' + j.id + '">' + (note ? note.replace(/</g,'&lt;') : '') + '</textarea>' +
        '<div class="sp-propBtns" style="flex-wrap:wrap;gap:5px;margin-top:2px">' +
          '<button class="sp-btnSave sp-btnSm ' + (isSaved ? 'sp-saved' : '') + '" data-action="save" data-id="' + j.id + '">' + (isSaved ? '★ SAVED' : '☆ SAVE') + '</button>' +
          (inSavedSection ? '' : '<button class="sp-btnSm sp-btnDanger" data-action="hide" data-id="' + j.id + '">✕ HIDE</button>') +
          '<button class="sp-btnSm sp-btnContact"  data-action="apply"     data-id="' + j.id + '">✓ APPLIED</button>' +
          '<button class="sp-btnSm sp-btnSchedule" data-action="interview" data-id="' + j.id + '">📅 INTERVIEW</button>' +
          '<button class="sp-btnSm sp-btnCopy"     data-action="copy"      data-id="' + j.id + '">📋 COPY MSG</button>' +
          '<button class="sp-btnSm sp-btnScout"    data-action="analyze"   data-id="' + j.id + '">🧠 SKILL GAP</button>' +
          (j.link
            ? '<a href="' + j.link + '" target="_blank" rel="noopener noreferrer" class="sp-btnSm sp-btnOpen">🔗 OPEN LISTING</a>'
            : '<span class="sp-btnSm" style="opacity:.28;cursor:not-allowed" title="No listing URL available">NO LINK</span>') +
        '</div>' +
      '</div>'
    );
  }

  // ── RENDER ──────────────────────────────────────────────────

  function renderJobs(jobs) {
    var el = document.getElementById('sp-results');
    if (!el) return;

    if (!jobs.length) {
      el.innerHTML = '<div style="font-size:9px;color:rgba(200,160,255,.3);padding:16px;font-style:italic;grid-column:1/-1">No jobs match your filters. Try adjusting the criteria or loading your profile.</div>';
    } else {
      el.innerHTML = jobs.map(function (j) { return buildCard(j, false); }).join('');
      wireCards(el);
    }

    updateSummary(jobs);
    updateHiddenBar();
    renderSavedSection();
  }

  function updateSummary(jobs) {
    var sumEl = document.getElementById('sp-summary');
    if (!sumEl) return;
    if (!jobs.length) { sumEl.innerHTML = ''; return; }

    var saved      = getSaved();
    var hidden     = getHidden();
    var salaries   = jobs.map(function (j) { return j.salary; });
    var total      = salaries.reduce(function (s, r) { return s + r; }, 0);
    var avgSal     = Math.round(total / salaries.length);
    var maxSal     = Math.max.apply(null, salaries);
    var savedCount = saved.filter(function (id) { return jobs.some(function (j) { return j.id === id; }); }).length;

    var bestMatch = 0;
    jobs.forEach(function (j) { var m = cicJobMatch(j); if (m > bestMatch) bestMatch = m; });

    sumEl.innerHTML =
      '<span class="sp-summaryItem"><strong>' + jobs.length + '</strong> matches</span>' +
      '<span class="sp-summaryItem"><strong>' + savedCount + '</strong> saved</span>' +
      '<span class="sp-summaryItem"><strong>' + hidden.length + '</strong> hidden</span>' +
      '<span class="sp-summaryItem">Avg: <strong>$' + avgSal.toLocaleString() + '/yr</strong></span>' +
      '<span class="sp-summaryItem">Top pay: <strong>$' + maxSal.toLocaleString() + '/yr</strong></span>' +
      '<span class="sp-summaryItem">Best match: <strong>' + bestMatch + '%</strong></span>';
  }

  function updateHiddenBar() {
    var bar = document.getElementById('sp-hiddenBar');
    if (!bar) return;
    var hidden = getHidden();
    if (!hidden.length) { bar.innerHTML = ''; return; }
    bar.innerHTML =
      '<span>' + hidden.length + ' job' + (hidden.length !== 1 ? 's' : '') + ' hidden</span>' +
      '<button class="sp-btnSm" id="sp-clearHidden" style="font-size:6px;padding:2px 9px;letter-spacing:.5px">Clear Hidden</button>';
    var cb = document.getElementById('sp-clearHidden');
    if (cb) cb.addEventListener('click', function () { clearHidden(); runSearch(); });
  }

  function renderSavedSection() {
    var sec = document.getElementById('sp-savedSection');
    if (!sec) return;
    var saved = getSaved();
    if (!saved.length) {
      sec.innerHTML =
        '<div class="sp-savedTitle">★ SAVED JOBS</div>' +
        '<div style="font-size:8px;color:rgba(200,160,255,.22);font-style:italic;padding:10px 0">No saved jobs yet. Click ☆ SAVE on any listing above.</div>';
      return;
    }
    var pool      = currentDisplayed.length ? currentDisplayed : JOB_LISTINGS;
    var savedJobs = pool.filter(function (j) { return saved.indexOf(j.id) >= 0; });
    sec.innerHTML =
      '<div class="sp-savedTitle">★ SAVED JOBS (' + savedJobs.length + ')</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">' +
      savedJobs.map(function (j) { return buildCard(j, true); }).join('') +
      '</div>';
    wireCards(sec);
  }

  function wireCards(container) {
    container.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id     = this.getAttribute('data-id');
        var action = this.getAttribute('data-action');
        if (action === 'save')      { toggleSave(id);                       runSearch(); }
        if (action === 'hide')      { hideJob(id);                          runSearch(); }
        if (action === 'apply')     { setStatus(id, 'applied');             runSearch(); }
        if (action === 'interview') { setStatus(id, 'interview_scheduled'); runSearch(); }
        if (action === 'copy')      { copyRecruiterMsg(); }
        if (action === 'analyze')   { triggerSkillGap(id); }
      }.bind(el));
    });

    container.querySelectorAll('.sp-cardNotes').forEach(function (ta) {
      ta.addEventListener('blur', function () {
        saveNote(this.getAttribute('data-id'), this.value);
      }.bind(ta));
    });
  }

  // Hand off to the Skill Gap Analyzer section
  function triggerSkillGap(jobId) {
    var panel = document.getElementById('cic-sgaPanel');
    var sel   = document.getElementById('cic-sgaJobSel');
    if (sel) sel.value = jobId;
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof window.cicRunSkillGap === 'function') window.cicRunSkillGap(jobId);
  }

  function copyRecruiterMsg() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(RECRUITER_MSG).then(function () {
        showToast('Recruiter outreach message copied to clipboard!');
      }).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = RECRUITER_MSG;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Message copied!'); } catch (e) { showToast('Copy failed — check browser permissions.'); }
    document.body.removeChild(ta);
  }

  function showToast(msg) {
    if (COS && COS.notifications) { COS.notifications.add(msg, 'success'); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:rgba(123,107,255,.15);border:1px solid rgba(123,107,255,.5);color:rgba(220,210,255,.9);font-size:10px;letter-spacing:1px;padding:8px 16px;border-radius:4px;pointer-events:none;transition:opacity .4s';
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; }, 2200);
    setTimeout(function () { document.body.removeChild(t); }, 2700);
  }

  // ── SEARCH ──────────────────────────────────────────────────

  function getFilters() {
    var g = function (id) { return document.getElementById(id) || {}; };
    return {
      region:   g('cic-region').value   || 'all',
      type:     g('cic-type').value     || 'all',
      minSalary:parseFloat(g('cic-salary').value) || 0,
      workType: g('cic-workType').value || 'all',
      keyword:  g('cic-keyword').value  || '',
    };
  }

  function runSearch() {
    var filters = getFilters();
    var raw     = fetchJobListings(filters);
    var results = filterJobs(filters, raw);
    currentDisplayed = results;
    renderJobs(results);

    var best    = null;
    var avgSal  = 0;
    if (results.length) {
      results.forEach(function (j) {
        if (!best || cicJobMatch(j) > cicJobMatch(best)) best = j;
      });
      avgSal = Math.round(results.reduce(function (s, j) { return s + j.salary; }, 0) / results.length);
    }

    COS.activity.log({
      agent: 'Nova', dept: 'housing',
      msg: 'Job search: ' + results.length + ' match' + (results.length !== 1 ? 'es' : '') +
           ' — avg $' + avgSal + '/yr' + (best ? ', top match: ' + best.title + ' (' + cicJobMatch(best) + '%)' : ''),
      source: 'search',
    });

    if (typeof OE !== 'undefined') {
      OE.generate({
        type:    'search_results',
        title:   'Job Search Completed',
        summary: results.length + ' jobs matched — avg $' + avgSal + '/yr, top match ' +
                 (best ? best.title + ' (' + cicJobMatch(best) + '%)' : 'N/A'),
      }, 'nova', 'housing');
    }

    // Publish company event so Orion can start cross-dept collaboration chain
    if (best && results.length > 0 && typeof COS !== 'undefined') {
      COS.company.emit('JobFound', {
        job:       best,
        count:     results.length,
        avgSalary: avgSal,
        source:    'nova_search',
      });
    }
  }

  // ── LOAD MY PROFILE ─────────────────────────────────────────

  function loadMyProfile() {
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.value = val; };
    // "all" region keeps South Jersey + Philadelphia + Remote in view; all types
    set('cic-region',   'all');
    set('cic-type',     'all');
    set('cic-salary',   '40000');
    set('cic-workType', 'all');
    set('cic-keyword',  '');
    showToast("Your career profile loaded — South Jersey · Philadelphia · Remote");
    runSearch();
  }

  // ── CAREER SCOUT — frontend integration ─────────────────────
  // Calls POST /api/career/scout. Falls back to simulated results.

  var SCOUT_STEPS = [
    'Initializing career intelligence agent...',
    'Scanning Indeed — Help Desk South Jersey...',
    'Scanning LinkedIn — Service Desk Philadelphia...',
    'Searching Remote — SOC Analyst US...',
    'Pulling NOC openings — Camden / Burlington County...',
    'Checking Dice — Systems Admin Philadelphia...',
    'Scanning Glassdoor — Junior Security roles...',
    'Filtering by salary / work type / skills...',
    'Calculating match scores...',
    'Ranking by opportunity index...',
    'Generating career intelligence report...',
  ];

  function setScoutMode(mode, badge, text, time) {
    var bar    = document.getElementById('sp-scoutBar');
    var modeEl = document.getElementById('sp-scoutMode');
    var msgEl  = document.getElementById('sp-scoutMsg');
    var timeEl = document.getElementById('sp-scoutTime');
    if (!bar) return;
    bar.style.display = '';
    bar.className = 'sp-scoutBar scout-' + (
      mode === 'real'    ? 'success' :
      mode === 'running' ? 'running' :
      mode === 'offline' ? 'offline' : 'fallback'
    );
    if (modeEl) {
      modeEl.textContent = badge || '';
      modeEl.className   = 'sp-scoutMode sp-mode-' + (
        mode === 'real'    ? 'real'    :
        mode === 'running' ? 'running' :
        mode === 'offline' ? 'offline' : 'sim'
      );
    }
    if (msgEl)  msgEl.textContent  = text || '';
    if (timeEl) timeEl.textContent = time || '';
  }

  function displayScoutResults(jobs) {
    currentDisplayed = jobs;
    var el = document.getElementById('sp-results');
    if (!el) return;
    if (!jobs.length) {
      el.innerHTML = '<div style="font-size:9px;color:rgba(200,160,255,.3);padding:16px;font-style:italic;grid-column:1/-1">Scout returned 0 jobs. Try again or widen your filters.</div>';
    } else {
      el.innerHTML = jobs.map(function (j) { return buildCard(j, false); }).join('');
      wireCards(el);
    }
    updateSummary(jobs);
    updateHiddenBar();
    renderSavedSection();
  }

  function runScout() {
    var btn = document.getElementById('sp-scoutBtn');
    if (!btn || btn.disabled) return;

    btn.textContent = '⟳ SCOUTING...';
    btn.disabled    = true;

    var stepIdx   = 0;
    var stepTimer = setInterval(function () {
      var msgEl = document.getElementById('sp-scoutMsg');
      if (msgEl) msgEl.textContent = SCOUT_STEPS[stepIdx % SCOUT_STEPS.length];
      stepIdx++;
    }, 2200);

    setScoutMode('running', '⟳ SCOUTING', SCOUT_STEPS[0], '');

    var filters = getFilters();
    var body = JSON.stringify({
      region:    filters.region,
      type:      filters.type === 'all' ? [] : [filters.type],
      minSalary: filters.minSalary,
      workType:  filters.workType,
      keyword:   filters.keyword,
    });

    fetch('/api/career/scout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    body,
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (e) { throw new Error(e.error || ('Server returned ' + res.status)); });
      }
      return res.json();
    })
    .then(function (data) {
      clearInterval(stepTimer);
      btn.textContent = '▸ RUN CAREER SCOUT';
      btn.disabled    = false;

      if (!data.success) throw new Error(data.error || 'Scout returned failure status.');

      var jobs = (data.jobs || data.listings || []).map(function (l, i) {
        return {
          id:       l.id       || ('scout_' + (i + 1)),
          title:    l.title    || ('Role #' + (i + 1)),
          company:  l.company  || 'Unknown',
          salary:   l.salary   || 0,
          location: l.location || 'Unknown',
          region:   l.region   || 'national',
          workType: l.workType || 'onsite',
          type:     l.type     || 'help_desk',
          skills:   l.skills   || [],
          source:   l.source   || 'career scout',
          link:     l.link     || '',
          desc:     l.desc     || '',
        };
      });

      var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (!jobs.length) {
        setScoutMode('fallback', 'SIMULATED', 'Scout ran but found 0 jobs — showing simulated results.', 'Last run: ' + now);
        runSearch();
        return;
      }

      var total = 0;
      jobs.forEach(function (j) { total += (j.salary || 0); });
      var avgSal = jobs.length ? Math.round(total / jobs.length) : 0;

      setScoutMode('real', 'REAL SCOUT',
        jobs.length + ' job' + (jobs.length !== 1 ? 's' : '') + ' · ' + (data.sources_checked || 0) + ' sources checked',
        'Last run: ' + now);
      displayScoutResults(jobs);

      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Career Scout complete — ' + jobs.length + ' real jobs, avg $' + avgSal + '/yr', source: 'real_scout' });
      if (typeof OE !== 'undefined') {
        OE.generate({
          type:    'scout_results',
          title:   'Career Scout Completed',
          summary: jobs.length + ' real jobs · avg $' + avgSal + '/yr · Source: REAL SCOUT',
        }, 'nova', 'housing');
      }
    })
    .catch(function (err) {
      clearInterval(stepTimer);
      btn.textContent = '▸ RUN CAREER SCOUT';
      btn.disabled    = false;

      var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var msg = err.message || '';
      var isNetworkErr = !msg || msg.indexOf('fetch') >= 0 || msg.indexOf('Failed') >= 0 ||
                         msg.indexOf('NetworkError') >= 0 || msg.indexOf('ECONNREFUSED') >= 0;

      if (isNetworkErr) {
        setScoutMode('offline', 'BACKEND OFFLINE', 'Career Scout backend is not connected. Run: python server.py', 'Last attempt: ' + now);
      } else {
        setScoutMode('offline', 'SCOUT ERROR', msg, 'Last attempt: ' + now);
      }

      runSearch();
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Career Scout backend offline — simulated fallback active', source: 'fallback' });
    });
  }

  // Expose for cross-section access
  window.cicRunJobSearch = runSearch;

  // ── INIT ────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var searchBtn  = document.getElementById('cic-searchBtn') || document.getElementById('sp-searchBtn');
    var searchAlt  = document.getElementById('sp-searchBtn');
    var profileBtn = document.getElementById('cic-myProfile');
    var scoutBtn   = document.getElementById('sp-scoutBtn') || document.getElementById('cic-scoutBtn');

    if (searchBtn)  searchBtn.addEventListener('click', runSearch);
    if (searchAlt && searchAlt !== searchBtn) searchAlt.addEventListener('click', runSearch);
    if (profileBtn) profileBtn.addEventListener('click', loadMyProfile);
    if (scoutBtn)   scoutBtn.addEventListener('click', runScout);

    runSearch();
  });

})();

/* ================================================================
   IIFE 3 — SKILL GAP ANALYZER (flagship, powered by Resu-Mate)
================================================================ */
(function () {
  'use strict';

  // Count how many of the 15 jobs require a given skill (for priority)
  function skillDemand(skill) {
    return JOB_LISTINGS.filter(function (j) { return (j.skills || []).indexOf(skill) >= 0; }).length;
  }

  function analyzeGap(jobId) {
    var job = JOB_LISTINGS.find(function (j) { return j.id === jobId; });
    if (!job) return null;

    var have    = job.skills.filter(function (s) { return MY_SKILLS.indexOf(s) >= 0; });
    var missing = job.skills.filter(function (s) { return MY_SKILLS.indexOf(s) < 0; });
    var pct     = Math.round((have.length / job.skills.length) * 100);

    var cert = 'CompTIA A+';
    if (missing.some(function (s) { var t = s.toLowerCase(); return t.indexOf('security') >= 0 || t.indexOf('siem') >= 0 || t.indexOf('splunk') >= 0; })) cert = 'CompTIA Security+';
    if (missing.some(function (s) { var t = s.toLowerCase(); return t.indexOf('azure') >= 0 || t.indexOf('cloud') >= 0; })) cert = 'AZ-900 Azure Fundamentals';
    if (missing.some(function (s) { return s.toLowerCase().indexOf('aws') >= 0; })) cert = 'AWS Cloud Practitioner';
    if (missing.some(function (s) { return s.toLowerCase().indexOf('linux') >= 0; })) cert = 'CompTIA Linux+';
    if (missing.some(function (s) { var t = s.toLowerCase(); return t.indexOf('network') >= 0 || t.indexOf('cisco') >= 0; })) cert = 'CompTIA Network+';

    var project = 'Build a help desk ticket tracking spreadsheet';
    if (missing.some(function (s) { return s.toLowerCase().indexOf('powershell') >= 0; })) project = 'Write PowerShell scripts to automate AD user creation';
    if (missing.some(function (s) { var t = s.toLowerCase(); return t.indexOf('splunk') >= 0 || t.indexOf('siem') >= 0; })) project = 'Set up Splunk SIEM in a home lab and write detection rules';
    if (missing.some(function (s) { return s.toLowerCase().indexOf('linux') >= 0; })) project = 'Deploy Ubuntu server VM and practice CLI administration';
    if (missing.some(function (s) { var t = s.toLowerCase(); return t.indexOf('aws') >= 0 || t.indexOf('azure') >= 0; })) project = 'Complete a cloud free-tier project (S3 static site or Azure VM)';

    return { job: job, have: have, missing: missing, pct: pct, cert: cert, project: project };
  }

  function priorityLabel(skill) {
    var d = skillDemand(skill);
    return d >= 3 ? 'HIGH' : (d === 2 ? 'MEDIUM' : 'LOW');
  }

  function render(res) {
    if (!res) return;
    var setHtml = function (id, v) { var el = document.getElementById(id); if (el) el.innerHTML = v; };
    var setText = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };

    var result = document.getElementById('cic-sgaResult');
    if (result) result.style.display = '';

    setText('cic-sgaTitle', res.job.title + ' — ' + res.job.company);
    setHtml('cic-sgaMatch', '<span class="cic-matchPct">' + res.pct + '%</span>');

    setHtml('cic-sgaSkillsHave',
      res.have.length
        ? res.have.map(function (s) { return '<span class="cic-skillPill cic-pill-have">✓ ' + s + '</span>'; }).join('')
        : '<span style="font-size:8px;color:rgba(200,160,255,.3);font-style:italic">No direct matches yet.</span>');

    setHtml('cic-sgaMissing',
      res.missing.length
        ? res.missing.map(function (s) {
            var p = priorityLabel(s);
            var cls = p === 'MEDIUM' ? 'cic-pill-warn' : 'cic-pill-missing';
            return '<span class="cic-skillPill ' + cls + '">✗ ' + s + ' · ' + p + '</span>';
          }).join('')
        : '<span style="font-size:8px;color:rgba(125,255,156,.6);font-style:italic">You meet every listed skill! 🎉</span>');

    setHtml('cic-sgaCert',    '🎓 Recommended cert: <strong style="color:rgba(255,200,60,.85)">' + res.cert + '</strong>');
    setHtml('cic-sgaProject', '🛠 Recommended project: <strong style="color:rgba(58,168,200,.85)">' + res.project + '</strong>');

    if (typeof COS !== 'undefined') {
      COS.activity.log({ agent: 'Resu-Mate', dept: 'housing', msg: 'Skill gap analyzed: ' + res.job.title + ' — ' + res.pct + '% match, ' + res.missing.length + ' gaps.', source: 'analyzer' });
    }
    if (typeof OE !== 'undefined') {
      OE.generate({
        type:    'skill_gap',
        title:   'Skill Gap Analysis — ' + res.job.title,
        summary: res.pct + '% match. Missing: ' + (res.missing.join(', ') || 'none') + '. Cert: ' + res.cert + '. Project: ' + res.project + '.',
      }, 'resu-mate', 'housing');
    }
  }

  function runSkillGap(jobId) {
    var sel = document.getElementById('cic-sgaJobSel');
    var id  = jobId || (sel ? sel.value : null);
    if (!id) return;
    var res = analyzeGap(id);
    render(res);
  }

  // Expose so the job-search section can hand off
  window.cicRunSkillGap = runSkillGap;

  function populateSelector() {
    var sel = document.getElementById('cic-sgaJobSel');
    if (!sel) return;
    sel.innerHTML = JOB_LISTINGS.map(function (j) {
      return '<option value="' + j.id + '">' + j.title + ' — ' + j.company + '</option>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    populateSelector();
    var btn = document.getElementById('cic-sgaRunBtn');
    if (btn) btn.addEventListener('click', function () { runSkillGap(); });
  });

})();

/* ================================================================
   IIFE 4 — SCOUT-X GEOGRAPHIC OPPORTUNITY ANALYSIS
================================================================ */
(function () {
  'use strict';

  // Opportunity index = SOC demand weighted by growth, adjusted for cost of living
  function opportunityIndex(d) {
    return Math.round(((d.socJobs * (1 + d.growthPct / 100)) / d.costOfLiving) * 10) / 10;
  }

  function rowClass(d, best) {
    if (d.abbr === best.abbr) return 'cic-scoutx-hot';
    if (d.growthPct >= 30)    return 'cic-scoutx-warm';
    if (d.remoteScore >= 85)  return 'cic-scoutx-cool';
    return '';
  }

  function renderTable() {
    var table = document.getElementById('cic-scoutxTable');
    if (!table) return;

    var ranked = US_MARKET_DATA.slice().sort(function (a, b) { return opportunityIndex(b) - opportunityIndex(a); });
    var best   = ranked[0];

    // Reference: NJ (current) SOC openings for comparison
    var nj = US_MARKET_DATA.find(function (d) { return d.abbr === 'NJ'; }) || { socJobs: 680 };
    var vaPctMore = Math.round(((best.socJobs - nj.socJobs) / nj.socJobs) * 100);

    var rows = ranked.map(function (d) {
      return '<tr class="' + rowClass(d, best) + '">' +
        '<td><strong>' + d.state + '</strong> <span style="opacity:.5">(' + d.abbr + ')</span></td>' +
        '<td>' + d.socJobs.toLocaleString() + '</td>' +
        '<td>' + d.helpDeskJobs.toLocaleString() + '</td>' +
        '<td>$' + d.avgSalary.toLocaleString() + '</td>' +
        '<td>' + d.costOfLiving + '</td>' +
        '<td>' + d.remoteScore + '</td>' +
        '<td>+' + d.growthPct + '%</td>' +
        '<td>' + opportunityIndex(d) + '</td>' +
      '</tr>';
    }).join('');

    table.innerHTML =
      '<table class="cic-scoutxTable">' +
        '<thead><tr>' +
          '<th>STATE</th><th>SOC JOBS</th><th>HELP DESK</th><th>AVG SALARY</th>' +
          '<th>COL</th><th>REMOTE</th><th>GROWTH</th><th>OPP. INDEX</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<div class="cic-scoutxHint">▸ NOVA / Scout-X recommendation: <strong>' + best.state + '</strong> has ' + vaPctMore +
      '% more SOC openings than New Jersey at comparable-to-higher salary levels. ' + best.note + '</div>';

    if (typeof COS !== 'undefined') {
      COS.activity.log({ agent: 'Scout-X', dept: 'housing', msg: 'Geographic analysis complete — ' + best.state + ' leads with highest SOC demand.', source: 'scout_x' });
    }
    if (typeof OE !== 'undefined') {
      OE.generate({
        type:    'geo_analysis',
        title:   'Scout-X Geographic Opportunity Analysis',
        summary: best.state + ' ranks #1 (opportunity index ' + opportunityIndex(best) + ') — ' + vaPctMore + '% more SOC openings than NJ.',
      }, 'scout-x', 'housing');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('cic-scoutxAnalyze');
    if (btn) btn.addEventListener('click', renderTable);
    // Pre-render a quiet preview so the panel is not empty
    renderTable();
  });

})();
