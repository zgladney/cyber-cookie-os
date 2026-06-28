/* CyberCookieOS — Security Workspace
   Threat / Event Log with severity filter, manual notes, mark reviewed, edit */

(function () {
  'use strict';

  var STORE = 'ws.security.threats';

  var DEFAULTS = [
    { id: 'th1', event: 'Suspicious IP detected — 203.45.12.8 flagged during scan', severity: 'high',   source: 'Athena / IPv6 Scan',     status: 'new',      ts: Date.now() - 7200000 },
    { id: 'th2', event: 'Failed login attempt — 5 attempts in 60 seconds',           severity: 'medium', source: 'Nimbus / Auth Monitor',   status: 'reviewed', ts: Date.now() - 3600000 },
    { id: 'th3', event: 'Cloud service health check failed — us-east-1',             severity: 'low',    source: 'Nimbus / Cloud Monitor',  status: 'reviewed', ts: Date.now() - 1800000 },
    { id: 'th4', event: 'Unusual outbound traffic spike — 480 MB in 2 minutes',      severity: 'high',   source: 'Athena / Traffic Watch',  status: 'new',      ts: Date.now() - 900000  },
    { id: 'th5', event: 'SOC sweep completed — no active incidents',                  severity: 'info',   source: 'Sentinel / SOC Ops',     status: 'reviewed', ts: Date.now() - 300000  },
  ];

  var _filter    = 'all';
  var _editingId = null;

  function load()      { return COS.state.get(STORE) || DEFAULTS.map(function (t) { return Object.assign({}, t); }); }
  function save(list)  { COS.state.set(STORE, list); }

  function fmtTime(ts) {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    var list     = load();
    var filtered = _filter === 'all' ? list : list.filter(function (t) { return t.severity === _filter; });
    var tbody    = document.getElementById('hq-threatBody');
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="ws-empty">No entries match this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(function (t) {
      var tr = document.createElement('tr');
      var reviewBtn = t.status !== 'reviewed'
        ? '<button class="ws-btn ws-btn-sm ws-btn-success" data-action="review" data-id="' + t.id + '" title="Mark Reviewed">✓</button>'
        : '';
      tr.innerHTML =
        '<td style="white-space:nowrap;font-size:7px;color:rgba(200,160,255,.3)">' + fmtTime(t.ts) + '</td>' +
        '<td style="max-width:240px">' + esc(t.event) + '</td>' +
        '<td><span class="ws-sev ws-sev-' + t.severity + '">' + t.severity.toUpperCase() + '</span></td>' +
        '<td style="font-size:7px;color:rgba(200,160,255,.4)">' + esc(t.source) + '</td>' +
        '<td><span class="ws-badge ws-badge-' + t.status + '">' + t.status.toUpperCase() + '</span></td>' +
        '<td><div style="display:flex;gap:4px">' + reviewBtn +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost" data-action="edit" data-id="' + t.id + '" title="Edit">✏</button>' +
          '<button class="ws-btn ws-btn-sm ws-btn-danger" data-action="delete" data-id="' + t.id + '" title="Delete">✕</button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });
  }

  function wireFilters() {
    document.querySelectorAll('#hq-workspace .ws-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#hq-workspace .ws-filter').forEach(function (b) { b.classList.remove('ws-filterActive'); });
        this.classList.add('ws-filterActive');
        _filter = this.dataset.sev;
        render();
      });
    });
  }

  function populateForm(item) {
    setValue('hq-noteEvent',  item.event    || '');
    setValue('hq-noteSev',    item.severity || 'medium');
    setValue('hq-noteSource', item.source   || '');
    var btn = document.getElementById('hq-addNote');
    if (btn) btn.textContent = '✓ UPDATE ENTRY';
    document.getElementById('hq-formPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function clearForm() {
    setValue('hq-noteEvent', '');
    setValue('hq-noteSource', '');
    setValue('hq-noteSev', 'medium');
    _editingId = null;
    var btn = document.getElementById('hq-addNote');
    if (btn) btn.textContent = '+ ADD ENTRY';
  }

  function wireAddForm() {
    var addBtn = document.getElementById('hq-addNote');
    if (!addBtn) return;
    addBtn.addEventListener('click', function () {
      var eventEl   = document.getElementById('hq-noteEvent');
      var sevEl     = document.getElementById('hq-noteSev');
      var sourceEl  = document.getElementById('hq-noteSource');
      var eventText = (eventEl.value || '').trim();
      if (!eventText) {
        eventEl.focus();
        eventEl.classList.add('ws-input-error');
        setTimeout(function () { eventEl.classList.remove('ws-input-error'); }, 1000);
        return;
      }

      var list = load();

      if (_editingId) {
        var entry = list.find(function (t) { return t.id === _editingId; });
        if (entry) {
          entry.event    = eventText;
          entry.severity = sevEl.value;
          entry.source   = (sourceEl.value || '').trim() || 'Manual Entry';
          save(list);
          COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Security entry updated: ' + eventText.slice(0, 60), source: 'user' });
        }
      } else {
        var newEntry = {
          id:       'th' + Date.now(),
          event:    eventText,
          severity: sevEl.value,
          source:   (sourceEl.value || '').trim() || 'Manual Entry',
          status:   'new',
          ts:       Date.now(),
        };
        list.unshift(newEntry);
        save(list);
        COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Security note added: ' + eventText.slice(0, 60), source: 'user' });
        COS.notifications.add('New security note: ' + eventText.slice(0, 50), 'normal');
      }

      clearForm();
      render();
    });

    var cancelBtn = document.getElementById('hq-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', clearForm);
  }

  function wireTable() {
    var tbody = document.getElementById('hq-threatBody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = load();

      if (action === 'review') {
        var entry = list.find(function (t) { return t.id === id; });
        if (entry) {
          entry.status = 'reviewed';
          save(list);
          COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Threat marked reviewed: ' + entry.event.slice(0, 50), source: 'user' });
          render();
        }
      } else if (action === 'edit') {
        var item = list.find(function (t) { return t.id === id; });
        if (item) {
          _editingId = id;
          populateForm(item);
        }
      } else if (action === 'delete') {
        list = list.filter(function (t) { return t.id !== id; });
        save(list);
        COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Security entry deleted.', source: 'user' });
        render();
      }
    });
  }

  function setValue(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    wireFilters();
    wireAddForm();
    wireTable();
  });

})();
