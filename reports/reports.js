/* CyberCookieOS — Report Center Controller */

(function () {
  'use strict';

  var DEPT_COLORS = {
    security:    '#9b6bff',
    housing:     '#c4784a',
    commerce:    '#ff69b4',
    productivity:'#3aa8c8',
    finance:     '#2ecc71',
  };

  var TYPE_LABELS = {
    property_recommendations: 'Property Recs',
    rent_comparison:          'Rent Analysis',
    pet_friendly_shortlist:   'Pet Shortlist',
    voucher_eligible_list:    'Voucher List',
    ranked_shortlist:         'Ranked List',
    recommendation:           'Recommendation',
    tracker_update:           'Tracker Update',
    threat_report:            'Threat Report',
    log_review_report:        'Log Review',
    cloud_health_report:      'Cloud Health',
    incident_report:          'Incident Report',
    security_summary:         'Security Summary',
    flagged_event:            'Flagged Event',
    trend_report:             'Trend Report',
    product_ideas:            'Product Ideas',
    etsy_listing_draft:       'Etsy Draft',
    tiktok_trend_report:      'TikTok Trends',
    production_queue:         'Prod Queue',
    calendar_summary:         'Calendar Summary',
    email_triage_report:      'Email Triage',
    reminder_cards:           'Reminders',
    task_list:                'Task List',
    optimized_schedule:       'Schedule',
    bill_review:              'Bill Review',
    budget_report:            'Budget Report',
    expense_report:           'Expense Report',
    savings_update:           'Savings Update',
    financial_summary:        'Financial Summary',
  };

  var _activeDept   = 'all';
  var _activeStatus = 'active';
  var _selectedId   = null;
  var _reports      = [];

  // ── CLOCK ─────────────────────────────────────────────────────
  function tick() {
    var el = document.getElementById('rc-clock');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick(); setInterval(tick, 1000);

  // ── HELPERS ───────────────────────────────────────────────────
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)    return diff + 's ago';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return new Date(ts).toLocaleDateString();
  }
  function fmtDate(ts) { return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  // ── LOAD & FILTER ─────────────────────────────────────────────
  function loadReports() {
    var all = OE.getAll();
    return all.filter(function (o) {
      if (_activeDept !== 'all' && o.dept !== _activeDept) return false;
      if (_activeStatus === 'active'   && o.status !== 'active')   return false;
      if (_activeStatus === 'archived' && o.status !== 'archived') return false;
      return true;
    }).slice().reverse();
  }

  function updateSummary() {
    var all      = OE.getAll();
    var active   = all.filter(function (o) { return o.status === 'active'; }).length;
    var archived = all.filter(function (o) { return o.status === 'archived'; }).length;
    var today    = OE.getTodayCount();
    var topAgent = OE.getTopAgent();

    setText('rc-totalCount', all.length);
    setText('rc-todayCount', today);
    setText('rc-activeCount', active);
    setText('rc-archCount', archived);

    var topBlock = document.getElementById('rc-topAgentBlock');
    if (topAgent && topAgent.count > 0) {
      setText('rc-topAgentName', topAgent.name + ' (' + topAgent.count + ')');
      if (topBlock) topBlock.style.display = '';
    } else {
      if (topBlock) topBlock.style.display = 'none';
    }
  }

  // ── RENDER CARDS ──────────────────────────────────────────────
  function renderCards() {
    _reports = loadReports();
    var cards   = document.getElementById('rc-cards');
    var empty   = document.getElementById('rc-emptyState');
    if (!cards) return;

    cards.innerHTML = '';
    empty.hidden = _reports.length > 0;
    if (!_reports.length) return;

    _reports.forEach(function (o) {
      var color    = DEPT_COLORS[o.dept] || '#9b6bff';
      var typeLabel = TYPE_LABELS[o.outputType] || o.outputType;
      var isSelected = (o.id === _selectedId);

      var card = document.createElement('div');
      card.className = 'rc-card' + (isSelected ? ' rc-cardActive' : '') + (o.status === 'archived' ? ' rc-cardArchived' : '');
      card.style.setProperty('--dept-color', color);
      card.dataset.id = o.id;

      var archLabel  = o.status === 'archived' ? 'RESTORE' : 'ARCHIVE';
      var archClass  = o.status === 'archived' ? 'rc-cardBtn-restore' : 'rc-cardBtn-archive';

      card.innerHTML =
        '<div>' +
          '<div class="rc-cardTop">' +
            '<span class="rc-deptDot" style="background:' + color + ';box-shadow:0 0 5px ' + color + '"></span>' +
            '<span class="rc-cardAgent">' + esc(o.agentName) + '</span>' +
            '<span class="rc-cardType">' + esc(typeLabel) + '</span>' +
          '</div>' +
          '<div class="rc-cardSummary">' + esc(o.summary) + '</div>' +
          '<div class="rc-cardBtns">' +
            '<button class="rc-cardBtn ' + archClass + '" data-action="' + (o.status === 'archived' ? 'restore' : 'archive') + '" data-id="' + o.id + '">' + archLabel + '</button>' +
            '<button class="rc-cardBtn rc-cardBtn-delete" data-action="delete" data-id="' + o.id + '">DELETE</button>' +
          '</div>' +
        '</div>' +
        '<span class="rc-cardTime">' + timeAgo(o.ts) + '</span>';

      cards.appendChild(card);
    });

    // Auto-select first if nothing selected
    if (!_selectedId && _reports.length) {
      openDetail(_reports[0].id);
    } else if (_selectedId) {
      var still = _reports.find(function (r) { return r.id === _selectedId; });
      if (still) openDetail(_selectedId);
      else { _selectedId = null; clearDetail(); }
    }

    updateSummary();
  }

  // ── DETAIL PANEL ──────────────────────────────────────────────
  function clearDetail() {
    var empty   = document.getElementById('rc-detailEmpty');
    var content = document.getElementById('rc-detailContent');
    if (empty)   empty.style.display   = '';
    if (content) content.style.display = 'none';
  }

  function openDetail(id) {
    _selectedId = id;
    var o = OE.getAll().find(function (x) { return x.id === id; });
    if (!o) { clearDetail(); return; }

    var empty   = document.getElementById('rc-detailEmpty');
    var content = document.getElementById('rc-detailContent');
    if (empty)   empty.style.display   = 'none';
    if (content) content.style.display = '';

    var color     = DEPT_COLORS[o.dept] || '#9b6bff';
    var deptLabel = (COS.departments[o.dept] || {}).name || o.dept;
    var typeLabel = TYPE_LABELS[o.outputType] || o.outputType;

    var headerEl = document.getElementById('rc-detailHeader');
    if (headerEl) {
      headerEl.innerHTML =
        '<span class="rc-detailBadge" style="color:' + color + ';border-color:' + color + '40">' + esc(deptLabel.toUpperCase()) + '</span>' +
        '<span class="rc-detailBadge" style="color:rgba(200,160,255,.5);border-color:rgba(150,80,255,.15)">' + esc(typeLabel) + '</span>';
    }

    setText('rc-detailTitle', o.taskTitle);
    var metaEl = document.getElementById('rc-detailMeta');
    if (metaEl) {
      metaEl.innerHTML =
        '<span class="rc-detailMetaItem"><strong>' + esc(o.agentName) + '</strong></span>' +
        '<span class="rc-detailMetaItem">&#128336; ' + fmtDate(o.ts) + '</span>' +
        '<span class="rc-detailMetaItem">Status: <strong>' + (o.status === 'archived' ? '&#128451; Archived' : '&#9679; Active') + '</strong></span>';
    }

    setText('rc-detailSummary', o.summary);

    var bodyEl = document.getElementById('rc-detailBody');
    if (bodyEl) bodyEl.innerHTML = renderMetadata(o);

    // Archive / Delete buttons
    var archBtn = document.getElementById('rc-archiveBtn');
    var delBtn  = document.getElementById('rc-deleteBtn');
    if (archBtn) {
      archBtn.textContent = o.status === 'archived' ? '&#8617; RESTORE' : '&#128451; ARCHIVE';
      archBtn.onclick = function () {
        if (o.status === 'archived') OE.restore(id);
        else OE.archive(id);
        renderCards();
      };
    }
    if (delBtn) {
      delBtn.onclick = function () {
        OE.remove(id);
        _selectedId = null;
        clearDetail();
        renderCards();
      };
    }

    // Highlight selected card
    document.querySelectorAll('.rc-card').forEach(function (c) {
      c.classList.toggle('rc-cardActive', c.dataset.id === id);
    });
  }

  // ── METADATA RENDERER ─────────────────────────────────────────
  function renderMetadata(o) {
    var m = o.metadata || {};
    var html = '';

    switch (o.outputType) {

      case 'property_recommendations':
      case 'pet_friendly_shortlist':
      case 'voucher_eligible_list':
      case 'ranked_shortlist':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">PROPERTIES (' + (m.properties || []).length + ')</div>';
        (m.properties || []).forEach(function (p) {
          html += '<div class="rc-propCard">' +
            '<div class="rc-propName">' + esc(p.name) + '</div>' +
            '<div class="rc-propMeta">' +
              '<span>$' + p.rent + '/mo</span>' +
              '<span>' + esc(p.loc) + '</span>' +
              '<span>' + esc(p.type) + '</span>' +
              '<span class="rc-propBadge ' + (p.pets ? 'rc-badge-yes' : 'rc-badge-no') + '">' + (p.pets ? 'PETS ✓' : 'NO PETS') + '</span>' +
              '<span class="rc-propBadge ' + (p.voucher ? 'rc-badge-yes' : 'rc-badge-no') + '">' + (p.voucher ? 'VOUCHER ✓' : 'NO VOUCHER') + '</span>' +
            '</div>' +
            '<div style="font-size:7px;color:rgba(200,160,255,.4);margin-top:4px">' + esc(p.note) + '</div>' +
          '</div>';
        });
        html += '</div>';
        if (m.note) html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">NOTE</div><div class="rc-listItem" style="list-style:none">' + esc(m.note) + '</div></div>';
        break;

      case 'recommendation':
        if (m.topPick) {
          html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">TOP PICK</div>';
          html += '<div class="rc-propCard"><div class="rc-propName">' + esc(m.topPick.name) + '</div>';
          html += '<div class="rc-propMeta"><span>$' + m.topPick.rent + '/mo</span><span>' + esc(m.topPick.loc) + '</span></div>';
          html += '<div style="font-size:7px;color:rgba(200,160,255,.4);margin-top:4px">' + esc(m.topPick.note) + '</div></div></div>';
        }
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">MATCH SCORE</div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Score</span><span class="rc-kvVal" style="color:#2ecc71">' + (m.matchScore || '—') + '%</span></div>';
        (m.reasons || []).forEach(function (r) { html += '<div class="rc-listItem">' + esc(r) + '</div>'; });
        html += '</div>';
        break;

      case 'rent_comparison':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">RENT ANALYSIS — ' + esc(m.area || '') + '</div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Average Rent</span><span class="rc-kvVal">$' + m.avgRent + '/mo</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Range</span><span class="rc-kvVal">$' + m.minRent + ' – $' + m.maxRent + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Sample Size</span><span class="rc-kvVal">' + m.sampleSize + ' listings</span></div>';
        if (m.vsLastMonth) html += '<div class="rc-kvRow"><span class="rc-kvKey">vs Last Month</span><span class="rc-kvVal">' + m.vsLastMonth + '</span></div>';
        html += '</div>';
        break;

      case 'threat_report':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">THREATS DETECTED</div>';
        (m.threats || []).forEach(function (t) {
          html += '<div class="rc-threatRow">' +
            '<span class="rc-threatIp">' + esc(t.ip) + '</span>' +
            '<span class="rc-threatType">' + esc(t.type) + '</span>' +
            '<span class="rc-sevBadge rc-sev-' + t.sev + '">' + t.sev.toUpperCase() + '</span>' +
          '</div>';
        });
        html += '</div>';
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">SCAN STATS</div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Hosts Scanned</span><span class="rc-kvVal">' + (m.scannedHosts || '—') + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Clean Hosts</span><span class="rc-kvVal" style="color:#2ecc71">' + (m.cleanHosts || '—') + '</span></div>';
        html += '</div>';
        break;

      case 'incident_report':
        if (m.incident) {
          html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">INCIDENT DETAILS</div>';
          html += '<div class="rc-kvRow"><span class="rc-kvKey">Case ID</span><span class="rc-kvVal">#' + (m.caseId || '—') + '</span></div>';
          html += '<div class="rc-kvRow"><span class="rc-kvKey">Type</span><span class="rc-kvVal">' + esc(m.incident.type) + '</span></div>';
          html += '<div class="rc-kvRow"><span class="rc-kvKey">Source IP</span><span class="rc-kvVal" style="color:#ffdc32">' + esc(m.incident.ip) + '</span></div>';
          html += '<div class="rc-kvRow"><span class="rc-kvKey">Severity</span><span class="rc-sevBadge rc-sev-' + m.incident.sev + '">' + m.incident.sev.toUpperCase() + '</span></div>';
          html += '<div class="rc-kvRow"><span class="rc-kvKey">Resolution</span><span class="rc-kvVal">' + esc(m.resolution || '—') + '</span></div>';
          html += '<div class="rc-kvRow"><span class="rc-kvKey">Status</span><span class="rc-kvVal" style="color:#2ecc71">' + (m.status || 'closed').toUpperCase() + '</span></div>';
          html += '</div>';
        }
        break;

      case 'security_summary':
      case 'cloud_health_report':
        html += '<div class="rc-detailSection">';
        if (m.healthScore !== undefined || m.score !== undefined) {
          var score = m.healthScore || m.score;
          html += '<div class="rc-kvRow"><span class="rc-kvKey">' + (m.healthScore !== undefined ? 'Health Score' : 'Security Score') + '</span><span class="rc-kvVal" style="color:' + (score >= 85 ? '#2ecc71' : '#ffdc32') + '">' + score + '%</span></div>';
        }
        ['resolved','open','endpointsChecked','avgResponseMs','threatsDetected','recommendation'].forEach(function (k) {
          if (m[k] !== undefined) {
            html += '<div class="rc-kvRow"><span class="rc-kvKey">' + k.replace(/([A-Z])/g, ' $1').trim() + '</span><span class="rc-kvVal">' + esc(String(m[k])) + '</span></div>';
          }
        });
        html += '</div>';
        break;

      case 'product_ideas':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">PRODUCT IDEAS (' + (m.ideas || []).length + ')</div>';
        (m.ideas || []).forEach(function (idea) { html += '<div class="rc-listItem">' + esc(idea) + '</div>'; });
        html += '</div>';
        if (m.category) html += '<div class="rc-kvRow"><span class="rc-kvKey">Category</span><span class="rc-kvVal">' + esc(m.category) + '</span></div>';
        break;

      case 'trend_report':
      case 'tiktok_trend_report':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">TRENDING NOW</div>';
        (m.trends || []).forEach(function (t) { html += '<div class="rc-listItem">' + esc(t) + '</div>'; });
        html += '</div>';
        if ((m.opportunities || []).length) {
          html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">PRODUCT OPPORTUNITIES</div>';
          (m.opportunities || []).forEach(function (i) { html += '<div class="rc-listItem">' + esc(i) + '</div>'; });
          html += '</div>';
        }
        if ((m.contentIdeas || []).length) {
          html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">CONTENT IDEAS</div>';
          (m.contentIdeas || []).forEach(function (i) { html += '<div class="rc-listItem">' + esc(i) + '</div>'; });
          html += '</div>';
        }
        break;

      case 'etsy_listing_draft':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">LISTING DRAFT</div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Title</span><span class="rc-kvVal">' + esc(m.title || '—') + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Price</span><span class="rc-kvVal" style="color:#2ecc71">$' + (m.price || '—') + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Status</span><span class="rc-kvVal">' + esc(m.status || 'draft').toUpperCase() + '</span></div>';
        if ((m.tags || []).length) {
          html += '<div class="rc-detailSection" style="margin-top:8px"><div class="rc-detailSectionTitle">SEO TAGS</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
          (m.tags || []).forEach(function (t) { html += '<span style="font-size:7px;padding:2px 7px;border:1px solid rgba(150,80,255,.2);border-radius:3px;color:rgba(200,160,255,.6)">' + esc(t) + '</span>'; });
          html += '</div></div>';
        }
        html += '</div>';
        break;

      case 'reminder_cards':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">REMINDERS (' + (m.reminders || []).length + ')</div>';
        (m.reminders || []).forEach(function (r) { html += '<div class="rc-listItem">' + esc(r) + '</div>'; });
        html += '</div>';
        if (m.scheduledFor) html += '<div class="rc-kvRow"><span class="rc-kvKey">Scheduled For</span><span class="rc-kvVal">' + esc(m.scheduledFor) + '</span></div>';
        break;

      case 'task_list':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">TASKS CREATED</div>';
        (m.tasks || []).forEach(function (t) {
          html += '<div class="rc-listItem">' + esc(t.title) + ' <span style="color:rgba(200,160,255,.35)">→ ' + esc(t.assignee) + '</span></div>';
        });
        html += '</div>';
        break;

      case 'budget_report':
      case 'financial_summary':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">BUDGET BREAKDOWN</div>';
        [['Income','income'],['Housing','housing'],['Food','food'],['Transport','transport'],['Utilities','utilities'],['Personal','personal'],['Misc','misc'],['Savings','savings'],['Surplus','surplus']].forEach(function (row) {
          if (m[row[1]] !== undefined) {
            var isPositive = row[1] === 'surplus' || row[1] === 'savings';
            html += '<div class="rc-kvRow"><span class="rc-kvKey">' + row[0] + '</span><span class="rc-kvVal"' + (isPositive ? ' style="color:#2ecc71"' : '') + '>$' + m[row[1]] + '</span></div>';
          }
        });
        if (m.healthScore) html += '<div class="rc-kvRow"><span class="rc-kvKey">Health Score</span><span class="rc-kvVal" style="color:' + (m.healthScore >= 80 ? '#2ecc71' : '#ffdc32') + '">' + m.healthScore + '/100</span></div>';
        if (m.recommendation) html += '<div style="font-size:7px;color:rgba(200,160,255,.4);margin-top:8px;padding:6px 8px;border-left:2px solid rgba(46,204,113,.3)">' + esc(m.recommendation) + '</div>';
        html += '</div>';
        break;

      case 'bill_review':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">BILLS DUE</div>';
        (m.bills || []).forEach(function (b) {
          html += '<div class="rc-kvRow"><span class="rc-kvKey">' + esc(b.name) + '</span><span class="rc-kvVal">$' + b.amount + ' (day ' + b.dueDay + ')</span></div>';
        });
        if (m.totalDue) html += '<div class="rc-kvRow" style="border-top:1px solid rgba(255,255,255,.06);margin-top:4px;padding-top:6px"><span class="rc-kvKey">TOTAL DUE</span><span class="rc-kvVal" style="color:#ffdc32">$' + m.totalDue + '</span></div>';
        html += '</div>';
        break;

      case 'savings_update':
        html += '<div class="rc-detailSection"><div class="rc-detailSectionTitle">SAVINGS PROGRESS</div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Current Balance</span><span class="rc-kvVal" style="color:#2ecc71">$' + (m.currentSavings || 0).toLocaleString() + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Goal</span><span class="rc-kvVal">$' + (m.savingsGoal || 0).toLocaleString() + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Monthly Contribution</span><span class="rc-kvVal">$' + (m.monthlyContribution || 0) + '</span></div>';
        html += '<div class="rc-kvRow"><span class="rc-kvKey">Months to Goal</span><span class="rc-kvVal">' + (m.monthsToGoal || '—') + '</span></div>';
        if (m.savingsGoal && m.currentSavings) {
          var pct = Math.round(m.currentSavings / m.savingsGoal * 100);
          html += '<div style="margin-top:8px"><div style="background:rgba(255,255,255,.04);border-radius:3px;height:6px;overflow:hidden"><div style="width:' + pct + '%;background:#2ecc71;height:100%;border-radius:3px"></div></div><div style="font-size:7px;color:rgba(200,160,255,.4);margin-top:4px">' + pct + '% of goal reached</div></div>';
        }
        html += '</div>';
        break;

      default:
        // Generic key-value fallback
        html += '<div class="rc-detailSection">';
        Object.keys(m).forEach(function (k) {
          var v = m[k];
          if (typeof v === 'object') v = JSON.stringify(v);
          html += '<div class="rc-kvRow"><span class="rc-kvKey">' + esc(k) + '</span><span class="rc-kvVal">' + esc(String(v)) + '</span></div>';
        });
        html += '</div>';
    }

    return html;
  }

  // ── EVENT WIRING ──────────────────────────────────────────────
  function wireTabs() {
    document.querySelectorAll('.rc-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeDept = this.dataset.dept;
        _selectedId = null;
        document.querySelectorAll('.rc-tab').forEach(function (b) { b.classList.remove('rc-tabActive'); });
        this.classList.add('rc-tabActive');
        clearDetail();
        renderCards();
      });
    });

    document.querySelectorAll('.rc-stab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeStatus = this.dataset.status;
        _selectedId = null;
        document.querySelectorAll('.rc-stab').forEach(function (b) { b.classList.remove('rc-stabActive'); });
        this.classList.add('rc-stabActive');
        clearDetail();
        renderCards();
      });
    });
  }

  function wireCards() {
    var cards = document.getElementById('rc-cards');
    if (!cards) return;
    cards.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (btn) {
        e.stopPropagation();
        var id     = btn.dataset.id;
        var action = btn.dataset.action;
        if (action === 'archive') { OE.archive(id); if (_selectedId === id) clearDetail(); }
        if (action === 'restore') { OE.restore(id); }
        if (action === 'delete')  { OE.remove(id);  if (_selectedId === id) { _selectedId = null; clearDetail(); } }
        renderCards();
        return;
      }
      var card = e.target.closest('.rc-card[data-id]');
      if (card) openDetail(card.dataset.id);
    });
  }

  document.getElementById('rc-clearAll').addEventListener('click', function () {
    if (!confirm('Archive all active reports?')) return;
    OE.getAll().filter(function (o) { return o.status === 'active'; }).forEach(function (o) { OE.archive(o.id); });
    _selectedId = null;
    clearDetail();
    renderCards();
  });

  // Live update when new output comes in
  COS.events.on('output:created', function () { renderCards(); });

  // ── INIT ──────────────────────────────────────────────────────
  wireTabs();
  wireCards();
  renderCards();

})();
