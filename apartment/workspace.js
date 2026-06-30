/* CyberCookieOS — Project Command Center
   ES5 strict IIFEs. No const/let/arrow functions. */

/* ── 1. PROJECT STORE ──────────────────────────────────────────── */
var ProjectStore = (function () {
  'use strict';

  var KEY_PROJECTS = 'proj.projects.v1';
  var KEY_LOG      = 'proj.log.v1';

  var DEPT_COLORS = {
    career: '#7b6bff', finance: '#2ecc71', commerce: '#ff69b4',
    security: '#9b6bff', personal: '#f39c12', system: 'rgba(150,120,200,.5)'
  };

  var SEED_PROJECTS = [
    {
      id: 'prj1', title: 'Land Cybersecurity Job (Tier 1 SOC)',
      dept: 'career', stage: 'active', priority: 'high',
      deadline: '2026-09-01', progress: 25,
      notes: 'Primary income goal. Career workspace handles job search execution.',
      milestones: ['Update resume + certifications', 'Apply to 10 positions', 'Land first interview', 'Accept offer'],
      milestones_done: [0],
      created: Date.now() - 864000000
    },
    {
      id: 'prj2', title: 'Launch First Digital Product on Etsy',
      dept: 'commerce', stage: 'active', priority: 'high',
      deadline: '2026-07-15', progress: 33,
      notes: 'Digital planner product. Commerce workspace manages creation and listing.',
      milestones: ['Choose product niche', 'Design and create file', 'Write SEO listing', 'Publish and promote'],
      milestones_done: [0],
      created: Date.now() - 432000000
    },
    {
      id: 'prj3', title: 'Reduce Monthly Expenses by $200',
      dept: 'finance', stage: 'active', priority: 'medium',
      deadline: '2026-08-01', progress: 33,
      notes: 'Penny is tracking. Audit subscriptions, eliminate waste.',
      milestones: ['Audit all subscriptions', 'Cancel 3+ unused services', 'Track 30 days', 'Confirm savings'],
      milestones_done: [0],
      created: Date.now() - 259200000
    },
    {
      id: 'prj4', title: 'Complete WGU Cybersecurity Degree',
      dept: 'career', stage: 'active', priority: 'high',
      deadline: '2027-05-01', progress: 10,
      notes: 'WGU enrollment target: August 2026. Long-term credential.',
      milestones: ['Enroll in WGU program', 'Complete Term 1 courses', 'Complete Term 2 courses', 'Graduate'],
      milestones_done: [],
      created: Date.now() - 172800000
    },
    {
      id: 'prj5', title: 'Build Home Security Lab',
      dept: 'security', stage: 'backlog', priority: 'medium',
      deadline: '2026-10-01', progress: 0,
      notes: 'Raspberry Pi + Kali + virtual machines for active practice.',
      milestones: ['Research hardware requirements', 'Purchase components', 'Configure network', 'Run first lab'],
      milestones_done: [],
      created: Date.now() - 86400000
    },
    {
      id: 'prj6', title: 'Emergency Fund: $1,000',
      dept: 'finance', stage: 'active', priority: 'high',
      deadline: '2026-10-01', progress: 0,
      notes: 'First financial safety net. $0 to $1,000.',
      milestones: ['Set aside first $100', 'Reach $250', 'Reach $500', 'Reach $1,000'],
      milestones_done: [],
      created: Date.now() - 43200000
    }
  ];

  function load() {
    try {
      var stored = localStorage.getItem(KEY_PROJECTS);
      if (stored) { return JSON.parse(stored); }
    } catch (e) {}
    var seeds = [];
    for (var i = 0; i < SEED_PROJECTS.length; i++) { seeds.push(copyProject(SEED_PROJECTS[i])); }
    save(seeds);
    return seeds;
  }

  function copyProject(p) {
    return {
      id:              p.id,
      title:           p.title,
      dept:            p.dept,
      stage:           p.stage,
      priority:        p.priority,
      deadline:        p.deadline,
      progress:        p.progress,
      notes:           p.notes,
      milestones:      p.milestones.slice(),
      milestones_done: p.milestones_done.slice(),
      created:         p.created
    };
  }

  function save(list) {
    try { localStorage.setItem(KEY_PROJECTS, JSON.stringify(list)); } catch (e) {}
  }

  function loadLog() {
    try {
      var s = localStorage.getItem(KEY_LOG);
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  }

  function pushLog(agent, action) {
    var log = loadLog();
    log.unshift({ agent: agent, action: action, ts: Date.now() });
    if (log.length > 60) { log.length = 60; }
    try { localStorage.setItem(KEY_LOG, JSON.stringify(log)); } catch (e) {}
  }

  function getAll()        { return load(); }
  function getDeptColor(d) { return DEPT_COLORS[d] || DEPT_COLORS.system; }

  function upsert(proj) {
    var list = load();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === proj.id) { list[i] = proj; found = true; break; }
    }
    if (!found) { list.unshift(proj); }
    save(list);
  }

  function remove(id) {
    var list = load().filter(function (p) { return p.id !== id; });
    save(list);
  }

  function genId() { return 'prj' + Date.now(); }

  return { getAll: getAll, upsert: upsert, remove: remove, genId: genId, pushLog: pushLog, loadLog: loadLog, getDeptColor: getDeptColor };
}());


/* ── 2. PIPELINE VIEW ───────────────────────────────────────────── */
var PipelineView = (function () {
  'use strict';

  var _stageFilter = 'all';
  var _deptFilter  = 'all';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _stageLabel(s) {
    var map = { backlog:'BACKLOG', active:'ACTIVE', blocked:'BLOCKED', review:'REVIEW', complete:'COMPLETE' };
    return map[s] || (s || '').toUpperCase();
  }

  function _stageColor(s) {
    var map = { backlog:'rgba(180,150,255,.5)', active:'#3498db', blocked:'#f39c12', review:'rgba(200,180,255,.7)', complete:'#2ecc71' };
    return map[s] || 'rgba(180,150,255,.5)';
  }

  function renderCounts() {
    var all = ProjectStore.getAll();
    var counts = { backlog:0, active:0, blocked:0, review:0, complete:0 };
    for (var i = 0; i < all.length; i++) {
      var s = all[i].stage;
      if (counts[s] !== undefined) { counts[s]++; }
    }

    var tot = document.getElementById('prj-cnt-total');
    if (tot) { tot.textContent = all.length; }

    var keys = ['backlog','active','blocked','review','complete'];
    for (var k = 0; k < keys.length; k++) {
      var el = document.getElementById('prj-cnt-' + keys[k]);
      if (el) { el.textContent = counts[keys[k]]; }
    }

    var sa = document.getElementById('prj-stat-total');    if (sa) { sa.textContent = all.length; }
    var sb = document.getElementById('prj-stat-active');   if (sb) { sb.textContent = counts.active; }
    var sc = document.getElementById('prj-stat-complete'); if (sc) { sc.textContent = counts.complete; }
    var sd = document.getElementById('prj-stat-blocked');  if (sd) { sd.textContent = counts.blocked; }

    var totalMs = 0, doneMs = 0;
    for (var j = 0; j < all.length; j++) {
      totalMs += (all[j].milestones || []).length;
      doneMs  += (all[j].milestones_done || []).length;
    }
    var sms = document.getElementById('prj-stat-ms');
    if (sms) { sms.textContent = doneMs + ' / ' + totalMs; }
  }

  function _cardHTML(p) {
    var deptColor = ProjectStore.getDeptColor(p.dept);
    var pct       = Math.min(100, Math.max(0, p.progress || 0));
    var msDone    = (p.milestones_done || []).length;
    var msTotal   = (p.milestones || []).length;
    var msText    = msTotal ? (msDone + '/' + msTotal + ' milestones') : 'No milestones';
    var dl        = p.deadline ? ' · due ' + p.deadline : '';
    var priClass  = p.priority === 'high' ? 'high' : p.priority === 'medium' ? 'medium' : 'low';

    return '<div class="prj-card" style="border-left-color:' + deptColor + '" onclick="prjOpenDetail(\'' + p.id + '\')">' +
      '<div class="prj-card-top">' +
        '<span class="prj-card-title">' + esc(p.title) + '</span>' +
        '<span class="prj-card-priority ' + priClass + '">' + (p.priority || 'medium').toUpperCase() + '</span>' +
      '</div>' +
      '<div class="prj-card-meta">' + msText + dl + '</div>' +
      '<div class="prj-card-progress"><div class="prj-card-progress-fill" style="width:' + pct + '%;background:' + deptColor + '"></div></div>' +
      '<div class="prj-card-tags">' +
        '<span class="prj-tag ' + (p.dept || '') + '">' + (p.dept || '').toUpperCase() + '</span>' +
        '<span class="prj-tag" style="color:' + _stageColor(p.stage) + ';border-color:rgba(155,107,255,.2)">' + _stageLabel(p.stage) + '</span>' +
      '</div>' +
    '</div>';
  }

  function renderList() {
    var all = ProjectStore.getAll();
    var filtered = all.filter(function (p) {
      var stageOk = (_stageFilter === 'all') || p.stage === _stageFilter;
      var deptOk  = (_deptFilter  === 'all') || p.dept  === _deptFilter;
      return stageOk && deptOk;
    });

    var el = document.getElementById('prj-project-list');
    if (!el) { return; }
    if (!filtered.length) { el.innerHTML = '<div class="prj-empty">No projects match this filter.</div>'; return; }

    var html = '';
    for (var i = 0; i < filtered.length; i++) { html += _cardHTML(filtered[i]); }
    el.innerHTML = html;
  }

  function renderActiveBoard() {
    var all = ProjectStore.getAll().filter(function (p) { return p.stage === 'active'; });
    var el  = document.getElementById('prj-active-board');
    if (!el) { return; }
    if (!all.length) { el.innerHTML = '<div class="prj-empty">No active projects.</div>'; return; }
    var html = '';
    for (var i = 0; i < all.length; i++) { html += _cardHTML(all[i]); }
    el.innerHTML = html;
  }

  function setStageFilter(s) {
    _stageFilter = s;
    var stages = document.querySelectorAll('.prj-pipe-stage');
    for (var i = 0; i < stages.length; i++) { stages[i].classList.remove('active'); }
    var el = document.getElementById('prj-stage-' + s);
    if (el) { el.classList.add('active'); }
    renderList();
  }

  function setDeptFilter(d) {
    _deptFilter = d;
    var btns = document.querySelectorAll('.prj-filter-btn');
    for (var i = 0; i < btns.length; i++) { btns[i].classList.remove('active'); }
    var el = document.getElementById('prj-f-' + d);
    if (el) { el.classList.add('active'); }
    renderList();
  }

  function renderAll() {
    renderCounts();
    renderList();
    renderActiveBoard();
    MilestoneTracker.render();
    TaskQueue.render();
    LogView.render();
  }

  return { renderAll: renderAll, renderList: renderList, renderCounts: renderCounts, setStageFilter: setStageFilter, setDeptFilter: setDeptFilter };
}());


/* ── 3. MILESTONE TRACKER ───────────────────────────────────────── */
var MilestoneTracker = (function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function render() {
    var all   = ProjectStore.getAll();
    var items = [];

    for (var i = 0; i < all.length; i++) {
      var p    = all[i];
      var ms   = p.milestones      || [];
      var done = p.milestones_done || [];
      for (var j = 0; j < ms.length; j++) {
        items.push({ text: ms[j], done: done.indexOf(j) !== -1, projectTitle: p.title, projectId: p.id, msIdx: j });
      }
    }

    var pending   = items.filter(function (m) { return !m.done; });
    var completed = items.filter(function (m) { return m.done; });
    var sorted    = pending.concat(completed);

    var el  = document.getElementById('prj-milestone-list');
    if (!el) { return; }

    var cnt = document.getElementById('prj-ms-count');
    if (cnt) { cnt.textContent = pending.length + ' pending'; }

    if (!sorted.length) { el.innerHTML = '<div class="prj-empty">No milestones tracked.</div>'; return; }

    var html = '';
    for (var k = 0; k < sorted.length; k++) {
      var m = sorted[k];
      var dc = m.done ? ' done' : '';
      html += '<div class="prj-milestone-item" onclick="prjToggleMilestone(\'' + m.projectId + '\',' + m.msIdx + ')">' +
        '<div class="prj-milestone-check' + dc + '">' + (m.done ? '✓' : '') + '</div>' +
        '<div class="prj-milestone-body">' +
          '<div class="prj-milestone-title' + dc + '">' + esc(m.text) + '</div>' +
          '<div class="prj-milestone-project">' + esc(m.projectTitle) + '</div>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function toggle(projectId, msIdx) {
    var all = ProjectStore.getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === projectId) {
        var done = all[i].milestones_done || [];
        var idx  = done.indexOf(msIdx);
        if (idx === -1) {
          done.push(msIdx);
          ProjectStore.pushLog('Tracker', 'Milestone checked: ' + (all[i].milestones[msIdx] || ''));
        } else {
          done.splice(idx, 1);
        }
        all[i].milestones_done = done;
        var total = (all[i].milestones || []).length;
        all[i].progress = total ? Math.round((done.length / total) * 100) : 0;
        ProjectStore.upsert(all[i]);
        break;
      }
    }
    PipelineView.renderAll();
  }

  return { render: render, toggle: toggle };
}());


/* ── 4. TASK QUEUE ──────────────────────────────────────────────── */
var TaskQueue = (function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function render() {
    var all   = ProjectStore.getAll();
    var el    = document.getElementById('prj-task-queue');
    if (!el) { return; }

    var tasks = [];
    for (var i = 0; i < all.length && tasks.length < 8; i++) {
      var p    = all[i];
      var ms   = p.milestones      || [];
      var done = p.milestones_done || [];
      for (var j = 0; j < ms.length && tasks.length < 8; j++) {
        if (done.indexOf(j) === -1) {
          tasks.push({ text: ms[j], project: p.title, projectId: p.id, msIdx: j, dept: p.dept });
        }
      }
    }

    if (!tasks.length) { el.innerHTML = '<div class="prj-empty">All tasks complete — add new milestones to projects.</div>'; return; }

    var html = '';
    for (var k = 0; k < tasks.length; k++) {
      var t = tasks[k];
      var dc = ProjectStore.getDeptColor(t.dept);
      html += '<div class="prj-milestone-item" onclick="prjToggleMilestone(\'' + t.projectId + '\',' + t.msIdx + ')">' +
        '<div class="prj-milestone-check"></div>' +
        '<div class="prj-milestone-body">' +
          '<div class="prj-milestone-title">' + esc(t.text) + '</div>' +
          '<div class="prj-milestone-project" style="color:' + dc + '">' + esc(t.project) + '</div>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  return { render: render };
}());


/* ── 5. ACTIVITY LOG ────────────────────────────────────────────── */
var LogView = (function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function timeLabel(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000)    { return 'just now'; }
    if (diff < 3600000)  { return Math.floor(diff / 60000) + 'm ago'; }
    if (diff < 86400000) { return Math.floor(diff / 3600000) + 'h ago'; }
    return Math.floor(diff / 86400000) + 'd ago';
  }

  function render() {
    var log = ProjectStore.loadLog();
    var el  = document.getElementById('prj-activity-log');
    if (!el) { return; }
    if (!log.length) { el.innerHTML = '<div class="prj-empty">No activity yet.</div>'; return; }

    var html = '';
    for (var i = 0; i < Math.min(log.length, 20); i++) {
      var e = log[i];
      html += '<div class="prj-log-entry">' +
        '<div class="prj-log-dot">●</div>' +
        '<div class="prj-log-body">' +
          '<span class="prj-log-agent">' + esc(e.agent) + '</span>' +
          ' <span class="prj-log-action">' + esc(e.action) + '</span>' +
        '</div>' +
        '<div class="prj-log-time">' + timeLabel(e.ts) + '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  return { render: render };
}());


/* ── 6. AGENT ANIMATION ─────────────────────────────────────────── */
var AgentAnimation = (function () {
  'use strict';

  var PLANNER_TASKS = [
    'Mapping milestones for active projects...',
    'Structuring Career project roadmap...',
    'Breaking Commerce goal into steps...',
    'Calculating Finance project timeline...',
    'Aligning deadlines across departments...',
    'Preparing project briefs for Tracker...'
  ];
  var TRACKER_TASKS = [
    'Scanning deadlines across all departments...',
    'Monitoring Commerce product launch date...',
    'Flagging overdue milestones...',
    'Calculating completion rates across 6 projects...',
    'Syncing milestone progress with Scribe...',
    'Reviewing WGU enrollment target...'
  ];
  var SCRIBE_TASKS = [
    'Ready to capture project notes',
    'Logging recent milestone completions...',
    'Documenting project decision notes...',
    'Archiving completed project records...',
    'Ready to capture project notes'
  ];

  var _plannerIdx = 0;
  var _trackerIdx = 0;
  var _scribeIdx  = 0;

  function _setTask(id, text) {
    var el = document.getElementById(id);
    if (el) { el.textContent = text; }
  }
  function _setPct(id, pct) {
    var el = document.getElementById(id);
    if (el) { el.style.width = pct + '%'; }
  }
  function _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function _tickPlanner() {
    _plannerIdx = (_plannerIdx + 1) % PLANNER_TASKS.length;
    _setTask('prj-task-planner', PLANNER_TASKS[_plannerIdx]);
    _setPct('prj-sp-planner', _rand(35, 90));
  }

  function _tickTracker() {
    _trackerIdx = (_trackerIdx + 1) % TRACKER_TASKS.length;
    _setTask('prj-task-tracker', TRACKER_TASKS[_trackerIdx]);
    _setPct('prj-sp-tracker', _rand(25, 85));
  }

  function _tickScribe() {
    _scribeIdx = (_scribeIdx + 1) % SCRIBE_TASKS.length;
    var task   = SCRIBE_TASKS[_scribeIdx];
    var active = task.indexOf('Ready') === -1;
    _setTask('prj-task-scribe', task);
    _setPct('prj-sp-scribe', active ? _rand(20, 60) : 0);
    var st = document.getElementById('prj-status-scribe');
    if (st) {
      st.textContent  = active ? 'WORKING' : 'IDLE';
      st.className    = 'prj-ws-status' + (active ? ' working' : '');
    }
  }

  function start() {
    setInterval(_tickPlanner, 4200);
    setInterval(_tickTracker, 3600);
    setInterval(_tickScribe,  6500);
  }

  return { start: start };
}());


/* ── 7. COS INTEGRATION + GLOBAL FUNCTIONS ──────────────────────── */
(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _toast(msg) {
    var el = document.getElementById('prj-toast');
    if (!el) { return; }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function _emit(event, data) {
    if (window.COS && COS.events) { try { COS.events.emit(event, data); } catch (e) {} }
  }

  function _ensureAgents() {
    if (!window.COS || !COS.AgentEngine) { return; }
    try {
      COS.AgentEngine.register('planner', { name: 'Planner', dept: 'projects', role: 'Project Strategist', status: 'working' });
      COS.AgentEngine.register('tracker', { name: 'Tracker', dept: 'projects', role: 'Milestone Monitor',  status: 'working' });
      COS.AgentEngine.register('scribe',  { name: 'Scribe',  dept: 'projects', role: 'Documentation',     status: 'idle'    });
    } catch (e) {}
  }

  window.prjOpenDrawer = function (id) {
    var ovs = document.querySelectorAll('.prj-drawer-ov');
    for (var i = 0; i < ovs.length; i++) { ovs[i].classList.remove('open'); }
    var el = document.getElementById(id);
    if (el) { el.classList.add('open'); }
  };

  window.prjCloseDrawers = function () {
    var ovs = document.querySelectorAll('.prj-drawer-ov');
    for (var i = 0; i < ovs.length; i++) { ovs[i].classList.remove('open'); }
  };

  window.prjFilterStage = function (stage) { PipelineView.setStageFilter(stage); };
  window.prjFilterDept  = function (dept)  { PipelineView.setDeptFilter(dept);   };

  window.prjSaveProject = function () {
    var titleEl    = document.getElementById('prj-inp-title');
    var deptEl     = document.getElementById('prj-inp-dept');
    var priEl      = document.getElementById('prj-inp-priority');
    var stageEl    = document.getElementById('prj-inp-stage');
    var dlEl       = document.getElementById('prj-inp-deadline');
    var notesEl    = document.getElementById('prj-inp-notes');
    var msEl       = document.getElementById('prj-inp-milestones');
    var idEl       = document.getElementById('prj-inp-id');

    var title = titleEl ? titleEl.value : '';
    if (!title || !title.trim()) { _toast('Project title is required.'); return; }

    var milestones = [];
    if (msEl && msEl.value) {
      var lines = msEl.value.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line) { milestones.push(line); }
      }
    }

    var proj = {
      id:              (idEl && idEl.value) ? idEl.value : ProjectStore.genId(),
      title:           title.trim(),
      dept:            (deptEl  && deptEl.value)  || 'personal',
      stage:           (stageEl && stageEl.value) || 'active',
      priority:        (priEl   && priEl.value)   || 'medium',
      deadline:        (dlEl    && dlEl.value)    || '',
      notes:           (notesEl && notesEl.value) || '',
      milestones:      milestones,
      milestones_done: [],
      progress:        0,
      created:         Date.now()
    };

    ProjectStore.upsert(proj);
    ProjectStore.pushLog('Planner', 'Project saved: ' + proj.title);
    _emit('project.saved', { id: proj.id, title: proj.title, dept: proj.dept });
    _toast('Project saved.');
    prjCloseDrawers();
    PipelineView.renderAll();

    var fields = ['prj-inp-id','prj-inp-title','prj-inp-deadline','prj-inp-notes','prj-inp-milestones'];
    for (var f = 0; f < fields.length; f++) {
      var el = document.getElementById(fields[f]);
      if (el) { el.value = ''; }
    }
    var dbt = document.getElementById('prj-delete-btn');
    if (dbt) { dbt.style.display = 'none'; }
    var dt = document.getElementById('prj-drawer-add-title');
    if (dt) { dt.textContent = 'NEW PROJECT'; }
  };

  window.prjOpenDetail = function (id) {
    var all = ProjectStore.getAll();
    var p   = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { p = all[i]; break; } }
    if (!p) { return; }

    var db = document.getElementById('prj-detail-body');
    if (!db) { return; }

    var dc   = ProjectStore.getDeptColor(p.dept);
    var pct  = Math.min(100, Math.max(0, p.progress || 0));
    var ms   = p.milestones      || [];
    var done = p.milestones_done || [];

    var msHtml = '';
    for (var j = 0; j < ms.length; j++) {
      var isDone = done.indexOf(j) !== -1;
      msHtml += '<div class="prj-detail-ms-item" onclick="prjToggleMilestone(\'' + id + '\',' + j + ')">' +
        '<div class="prj-detail-ms-box' + (isDone ? ' done' : '') + '">' + (isDone ? '✓' : '') + '</div>' +
        '<div class="prj-detail-ms-txt' + (isDone ? ' done' : '') + '">' + esc(ms[j]) + '</div>' +
      '</div>';
    }

    db.innerHTML =
      '<div class="prj-detail-project-title">' + esc(p.title) + '</div>' +
      '<div class="prj-card-progress" style="margin-bottom:10px"><div class="prj-card-progress-fill" style="width:' + pct + '%;background:' + dc + '"></div></div>' +
      '<div class="prj-detail-row"><span>DEPT</span><span style="color:' + dc + '">' + (p.dept || '').toUpperCase() + '</span></div>' +
      '<div class="prj-detail-row"><span>STATUS</span><span>' + (p.stage || '').toUpperCase() + '</span></div>' +
      '<div class="prj-detail-row"><span>PRIORITY</span><span>' + (p.priority || '').toUpperCase() + '</span></div>' +
      '<div class="prj-detail-row"><span>TARGET DATE</span><span>' + (p.deadline || '—') + '</span></div>' +
      '<div class="prj-detail-row"><span>PROGRESS</span><span>' + pct + '%</span></div>' +
      (p.notes ? '<div style="margin-top:8px;font-size:9px;color:rgba(180,150,255,.5);line-height:1.5">' + esc(p.notes) + '</div>' : '') +
      '<div class="prj-detail-milestones">' +
        '<div class="prj-detail-ms-hdr">MILESTONES</div>' +
        (msHtml || '<div class="prj-empty" style="font-size:8.5px">No milestones set.</div>') +
      '</div>' +
      '<div style="margin-top:12px;display:flex;gap:6px">' +
        '<button class="prj-btn-primary" style="width:auto;flex:1" onclick="prjEditProject(\'' + id + '\')">EDIT</button>' +
        '<button class="prj-btn-secondary" style="width:auto;flex:1" onclick="prjCloseDrawers()">CLOSE</button>' +
      '</div>';

    prjOpenDrawer('prj-drawer-detail');
  };

  window.prjEditProject = function (id) {
    var all = ProjectStore.getAll();
    var p   = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { p = all[i]; break; } }
    if (!p) { return; }

    prjCloseDrawers();
    setTimeout(function () {
      var fields = {
        'prj-inp-id':         p.id,
        'prj-inp-title':      p.title,
        'prj-inp-dept':       p.dept,
        'prj-inp-priority':   p.priority,
        'prj-inp-stage':      p.stage,
        'prj-inp-deadline':   p.deadline,
        'prj-inp-notes':      p.notes,
        'prj-inp-milestones': (p.milestones || []).join('\n')
      };
      for (var fid in fields) {
        var el = document.getElementById(fid);
        if (el) { el.value = fields[fid]; }
      }
      var dbt = document.getElementById('prj-delete-btn');
      if (dbt) { dbt.style.display = 'block'; }
      var dt = document.getElementById('prj-drawer-add-title');
      if (dt) { dt.textContent = 'EDIT PROJECT'; }
      prjOpenDrawer('prj-drawer-add');
    }, 80);
  };

  window.prjDeleteProject = function () {
    var idEl = document.getElementById('prj-inp-id');
    var id   = idEl ? idEl.value : '';
    if (!id) { return; }
    ProjectStore.remove(id);
    ProjectStore.pushLog('Scribe', 'Project removed.');
    _emit('project.removed', { id: id });
    _toast('Project removed.');
    prjCloseDrawers();
    PipelineView.renderAll();
  };

  window.prjToggleMilestone = function (projectId, msIdx) {
    MilestoneTracker.toggle(projectId, msIdx);
  };

  document.addEventListener('DOMContentLoaded', function () {
    _ensureAgents();
    PipelineView.renderAll();
    AgentAnimation.start();

    var ovs = document.querySelectorAll('.prj-drawer-ov');
    for (var i = 0; i < ovs.length; i++) {
      (function (ov) {
        ov.addEventListener('click', function (e) { if (e.target === ov) { prjCloseDrawers(); } });
      }(ovs[i]));
    }

    ProjectStore.pushLog('Planner', 'Project Command Center loaded');
    _emit('projects.workspace.ready', { ts: Date.now() });
  });
}());
