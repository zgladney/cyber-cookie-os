/* Finance Workspace — Operational Zones
   ES5 only. All zones use click handlers + fetch/XHR. Nothing submits forms. */
(function () {
  'use strict';

  /* ── keys ──────────────────────────────────────────────────────────────── */
  var BILL_KEY    = 'fn.bills.v2';
  var BUDGET_KEY  = 'penny.budget.v2';
  var SAV_KEY     = 'fn.savings.v1';
  var TXN_KEY     = 'fn.transactions.v1';

  /* ── active state ───────────────────────────────────────────────────────── */
  var _activeBill    = null;
  var _activeAgent   = null;
  var _activeTxn     = null;
  var _activeIntel   = null;
  var _txnFilter     = 'all';

  /* ── defaults ───────────────────────────────────────────────────────────── */
  var DEFAULT_BILLS = [
    { id:'b1', name:'Rent',      amount:1500,  due:'2026-07-01', status:'upcoming', note:'', flagged:false },
    { id:'b2', name:'Internet',  amount:69.99, due:'2026-07-05', status:'upcoming', note:'', flagged:false },
    { id:'b3', name:'Phone',     amount:45,    due:'2026-07-10', status:'upcoming', note:'', flagged:false },
    { id:'b4', name:'Netflix',   amount:15.49, due:'2026-07-12', status:'upcoming', note:'', flagged:false },
    { id:'b5', name:'Electric',  amount:85,    due:'2026-07-08', status:'upcoming', note:'', flagged:false },
    { id:'b6', name:'Groceries', amount:300,   due:'2026-06-30', status:'overdue',  note:'Weekly budget', flagged:false }
  ];

  var DEFAULT_SAVINGS = [
    { id:'s1', name:'Emergency Fund (3 months)', target:9600, current:3200, color:'#2ecc71'             },
    { id:'s2', name:'Moving Deposit',            target:4500, current:800,  color:'#3aa8c8'             },
    { id:'s3', name:'New Laptop',                target:1800, current:450,  color:'rgba(155,107,255,.8)'}
  ];

  var DEFAULT_TXN = [
    { id:'TXN-1782781260', type:'revenue', category:'etsy_sales', amount:24.99,
      description:'Digital sticker pack sale', source:'etsy', date:'2026-06-29', status:'approved' }
  ];

  var BUDGET_CATS = [
    { id:'housing',   label:'Housing / Rent',  icon:'🏠', color:'#3aa8c8'             },
    { id:'utilities', label:'Utilities',        icon:'⚡', color:'#ffdc32'             },
    { id:'food',      label:'Food / Groceries', icon:'🛒', color:'#2ecc71'             },
    { id:'transport', label:'Transport',        icon:'🚗', color:'rgba(155,107,255,.8)'},
    { id:'subs',      label:'Subscriptions',   icon:'📺', color:'#ff69b4'             },
    { id:'insurance', label:'Insurance',        icon:'🛡', color:'#ff9f43'             },
    { id:'debt',      label:'Debt Payments',   icon:'💳', color:'#ff5050'             },
    { id:'misc',      label:'Misc / Personal', icon:'🎯', color:'rgba(200,160,255,.7)'}
  ];

  var AGENTS = [
    { id:'greenbean', name:'GREENBEAN', role:'FINANCE MANAGER',
      task:'Monitoring cash flow and reconciling income sources.',
      output:'MTD Revenue: $24.99 (Etsy)\nNet flow: Positive\nPending reconciliation: 0 items\nNext expected income: N/A' },
    { id:'ledger', name:'LEDGER', role:'BILL TRACKER',
      task:'Tracking 6 bills — 1 overdue.',
      output:'Bills due this week: Rent ($1,500), Electric ($85)\nOverdue: Groceries Budget ($300)\nNext: Internet Jul 5 ($70)' },
    { id:'penny', name:'PENNY', role:'BUDGET OFFICER',
      task:'Budget planner awaiting income configuration.',
      output:'Budget: Enter monthly income to activate\nSavings goal: 10% of income recommended\nSubscription audit: Not yet run' },
    { id:'vault', name:'VAULT', role:'SAVINGS TRACKER',
      task:'Tracking 3 savings goals.',
      output:'Emergency Fund: 33%  ($3,200 / $9,600)\nMoving Deposit:  18%  ($800 / $4,500)\nNew Laptop:      25%  ($450 / $1,800)\nTotal saved: $4,450' }
  ];

  var INTEL_REQUESTS = [
    { id:'ir1', from:'Career',       dir:'INBOUND',
      subj:'Salary benchmark request',
      detail:'Nova needs current market salary data for Software Engineer roles to calibrate job recommendations.',
      status:'pending' },
    { id:'ir2', from:'Commerce',     dir:'OUTBOUND',
      subj:'Monthly profit forecast',
      detail:'Requesting revenue projection to validate product pricing and advertising spend budget.',
      status:'pending' },
    { id:'ir3', from:'Productivity', dir:'INBOUND',
      subj:'Q3 activity cost estimate',
      detail:'Calypso needs estimated cost of professional development activities for Q3 calendar planning.',
      status:'pending' }
  ];

  /* ── helpers ────────────────────────────────────────────────────────────── */
  function el(id)      { return document.getElementById(id); }
  function set(id, v)  { var e = el(id); if (e) e.textContent = v; }
  function esc(s)      { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n)      { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
  function fmtS(n)     { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 }); }
  function cloneArr(a) { var out = []; for (var i = 0; i < a.length; i++) { out.push(JSON.parse(JSON.stringify(a[i]))); } return out; }

  function loadBills()    { return COS.state.get(BILL_KEY)   || cloneArr(DEFAULT_BILLS);  }
  function saveBills(l)   { COS.state.set(BILL_KEY, l); }
  function loadSavings()  { return COS.state.get(SAV_KEY)    || cloneArr(DEFAULT_SAVINGS); }
  function saveSavings(l) { COS.state.set(SAV_KEY, l); }
  function loadBudget()   { return COS.state.get(BUDGET_KEY) || { income:0, cats:[] }; }
  function saveBudget(d)  { COS.state.set(BUDGET_KEY, d); }
  function loadTxns()     { return COS.state.get(TXN_KEY)    || cloneArr(DEFAULT_TXN); }
  function saveTxns(l)    { COS.state.set(TXN_KEY, l); }

  function cosLog(agent, msg) {
    if (typeof COS !== 'undefined' && COS.activity) {
      COS.activity.log({ agent: agent, dept: 'finance', msg: msg, source: 'user' });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZONE 1 — BILL COMMAND DESK
  ═══════════════════════════════════════════════════════════════════════ */
  function renderBills() {
    var bills = loadBills();
    var queue = el('fn-bill-queue');
    if (!queue) return;

    if (!bills.length) {
      queue.innerHTML = '<div class="fn-empty">No bills tracked. Add one above.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < bills.length; i++) {
      var b = bills[i];
      var isOverdue = b.status === 'overdue' ||
        (b.due && b.status !== 'paid' && new Date(b.due) < new Date());
      var stat = isOverdue ? 'overdue' : b.status;
      var sColors = { paid:'#2ecc71', upcoming:'rgba(255,220,50,.8)', overdue:'#ff5050', scheduled:'#3aa8c8' };
      var sc = sColors[stat] || 'rgba(200,240,210,.4)';
      html += '<div class="fn-bill-row' + (_activeBill === b.id ? ' fn-active' : '') + '" data-id="' + b.id + '">' +
        '<div class="fn-bill-stat" style="color:' + sc + '">' + stat.toUpperCase() + '</div>' +
        '<div class="fn-bill-name">' + esc(b.name) + (b.flagged ? ' ⚑' : '') + '</div>' +
        '<div class="fn-bill-amt">' + fmt(b.amount) + '</div>' +
        '<div class="fn-bill-due">' + (b.due || '—') + '</div>' +
        '<div class="fn-bill-chev">▸</div>' +
        '</div>';
    }
    queue.innerHTML = html;
  }

  function openBillDrawer(id) {
    var bills = loadBills();
    var bill = null;
    for (var i = 0; i < bills.length; i++) { if (bills[i].id === id) { bill = bills[i]; break; } }
    if (!bill) return;
    _activeBill = id;

    set('fn-bd-name', bill.name);

    var isOverdue = bill.status === 'overdue' ||
      (bill.due && bill.status !== 'paid' && new Date(bill.due) < new Date());
    var stat = isOverdue ? 'overdue' : bill.status;

    var metaEl = el('fn-bd-meta');
    if (metaEl) {
      metaEl.innerHTML =
        '<span class="fn-chip">AMOUNT: ' + fmt(bill.amount) + '</span>' +
        '<span class="fn-chip">DUE: ' + (bill.due || 'N/A') + '</span>' +
        '<span class="fn-chip fn-chip-' + stat + '">' + stat.toUpperCase() + '</span>' +
        (bill.flagged ? '<span class="fn-chip fn-chip-flag">⚑ FLAGGED</span>' : '');
    }

    var noteDisp = el('fn-bd-note-disp');
    var noteIn   = el('fn-bd-note-input');
    if (noteDisp) noteDisp.textContent = bill.note || '';
    if (noteIn)   noteIn.value = bill.note || '';

    el('fn-bill-drawer').style.display = '';
    renderBills();
  }

  function closeBillDrawer() {
    _activeBill = null;
    el('fn-bill-drawer').style.display = 'none';
    renderBills();
  }

  function wireBillDesk() {
    var queue = el('fn-bill-queue');
    if (queue) {
      queue.addEventListener('click', function (e) {
        var row = e.target;
        while (row && row !== queue) {
          if (row.classList && row.classList.contains('fn-bill-row')) break;
          row = row.parentNode;
        }
        if (!row || !row.getAttribute) return;
        var id = row.getAttribute('data-id');
        if (!id) return;
        if (_activeBill === id && el('fn-bill-drawer').style.display !== 'none') {
          closeBillDrawer();
        } else {
          el('fn-add-bill-form').style.display = 'none';
          openBillDrawer(id);
        }
      });
    }

    on('fn-bd-close', 'click', closeBillDrawer);

    on('fn-bd-pay', 'click', function () {
      if (!_activeBill) return;
      var bills = loadBills();
      var name = '';
      for (var i = 0; i < bills.length; i++) {
        if (bills[i].id === _activeBill) { bills[i].status = 'paid'; name = bills[i].name; }
      }
      saveBills(bills);
      cosLog('Ledger', 'Bill marked paid: ' + name);
      closeBillDrawer();
      updatePending();
    });

    on('fn-bd-sched', 'click', function () {
      if (!_activeBill) return;
      var bills = loadBills();
      for (var i = 0; i < bills.length; i++) {
        if (bills[i].id === _activeBill) { bills[i].status = 'scheduled'; }
      }
      saveBills(bills);
      closeBillDrawer();
      updatePending();
    });

    on('fn-bd-flag', 'click', function () {
      if (!_activeBill) return;
      var bills = loadBills();
      for (var i = 0; i < bills.length; i++) {
        if (bills[i].id === _activeBill) { bills[i].flagged = !bills[i].flagged; }
      }
      saveBills(bills);
      openBillDrawer(_activeBill);
    });

    on('fn-bd-note', 'click', function () {
      if (!_activeBill) return;
      var noteText = (el('fn-bd-note-input') || {}).value || '';
      var bills = loadBills();
      for (var i = 0; i < bills.length; i++) {
        if (bills[i].id === _activeBill) { bills[i].note = noteText; }
      }
      saveBills(bills);
      var nd = el('fn-bd-note-disp');
      if (nd) nd.textContent = noteText;
    });

    on('fn-addBillBtn', 'click', function () {
      el('fn-bill-drawer').style.display = 'none';
      _activeBill = null;
      renderBills();
      var form = el('fn-add-bill-form');
      form.style.display = form.style.display === 'none' ? '' : 'none';
    });

    on('fn-nb-close', 'click', function () { el('fn-add-bill-form').style.display = 'none'; });

    on('fn-nb-save', 'click', function () {
      var nameVal = ((el('fn-nb-name') || {}).value || '').trim();
      if (!nameVal) { if (el('fn-nb-name')) el('fn-nb-name').focus(); return; }
      var amt = parseFloat((el('fn-nb-amount') || {}).value) || 0;
      var due = (el('fn-nb-due') || {}).value || '';
      var stat = (el('fn-nb-status') || {}).value || 'upcoming';
      var bills = loadBills();
      bills.unshift({ id:'b' + Date.now(), name:nameVal, amount:amt, due:due, status:stat, note:'', flagged:false });
      saveBills(bills);
      el('fn-add-bill-form').style.display = 'none';
      var nn = el('fn-nb-name');   if (nn) nn.value = '';
      var na = el('fn-nb-amount'); if (na) na.value = '';
      var nd = el('fn-nb-due');    if (nd) nd.value = '';
      cosLog('Ledger', 'New bill added: ' + nameVal + ' ' + fmt(amt));
      renderBills();
      updatePending();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZONE 2 — AGENT WORKSTATIONS
  ═══════════════════════════════════════════════════════════════════════ */
  function wireAgentStations() {
    var grid = el('fn-agent-grid');
    if (!grid) return;

    grid.addEventListener('click', function (e) {
      var card = e.target;
      while (card && card !== grid) {
        if (card.classList && card.classList.contains('fn-agent-card')) break;
        card = card.parentNode;
      }
      if (!card || !card.getAttribute) return;
      var agentId = card.getAttribute('data-agent');
      var agent = null;
      for (var i = 0; i < AGENTS.length; i++) { if (AGENTS[i].id === agentId) { agent = AGENTS[i]; break; } }
      if (!agent) return;

      /* toggle */
      if (_activeAgent === agentId && el('fn-agent-drawer').style.display !== 'none') {
        el('fn-agent-drawer').style.display = 'none';
        _activeAgent = null;
        var cards = grid.querySelectorAll('.fn-agent-card');
        for (var j = 0; j < cards.length; j++) cards[j].classList.remove('fn-active');
        return;
      }

      _activeAgent = agentId;
      var cards2 = grid.querySelectorAll('.fn-agent-card');
      for (var k = 0; k < cards2.length; k++) cards2[k].classList.remove('fn-active');
      card.classList.add('fn-active');

      set('fn-agd-name', agent.name + ' — ' + agent.role);
      set('fn-agd-task', agent.task);
      set('fn-agd-output', agent.output);

      el('fn-agent-drawer').style.display = '';
    });

    on('fn-agd-close', 'click', function () {
      el('fn-agent-drawer').style.display = 'none';
      _activeAgent = null;
      var cards = el('fn-agent-grid').querySelectorAll('.fn-agent-card');
      for (var i = 0; i < cards.length; i++) cards[i].classList.remove('fn-active');
    });

    on('fn-agd-run', 'click', function () {
      if (!_activeAgent) return;
      var agent = null;
      for (var i = 0; i < AGENTS.length; i++) { if (AGENTS[i].id === _activeAgent) { agent = AGENTS[i]; break; } }
      if (!agent) return;
      cosLog(agent.name, 'Manual run triggered');
      set('fn-agd-name', agent.name + ' — RUNNING...');
      setTimeout(function () {
        if (_activeAgent === agent.id) set('fn-agd-name', agent.name + ' — ' + agent.role);
      }, 2000);
    });

    on('fn-agd-pause', 'click', function () {
      el('fn-agent-drawer').style.display = 'none';
      _activeAgent = null;
      var cards = el('fn-agent-grid').querySelectorAll('.fn-agent-card');
      for (var i = 0; i < cards.length; i++) cards[i].classList.remove('fn-active');
    });

    on('fn-agd-assign', 'click', function () {
      if (typeof COS !== 'undefined' && COS.notifications) {
        COS.notifications.add('Task assignment requires ORION routing and CEO approval.', 'info');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZONE 3 — BUDGET PLANNER
  ═══════════════════════════════════════════════════════════════════════ */
  function renderBudget() {
    var data   = loadBudget();
    var income = data.income || 0;
    var cats   = data.cats || [];

    var incEl = el('fn-b-income');
    if (incEl) incEl.value = income || '';

    var catEl = el('fn-budget-cats');
    if (!catEl) return;

    var html = '';
    for (var i = 0; i < BUDGET_CATS.length; i++) {
      var def = BUDGET_CATS[i];
      var saved = null;
      for (var j = 0; j < cats.length; j++) { if (cats[j].id === def.id) { saved = cats[j]; break; } }
      var amt = saved ? (saved.amount || 0) : 0;
      var pct = income > 0 ? Math.min(Math.round((amt / income) * 100), 100) : 0;
      html += '<div class="fn-bcat-row">' +
        '<div class="fn-bcat-lbl">' + def.icon + ' ' + def.label + '</div>' +
        '<input type="number" class="fn-bcat-input" data-cat="' + def.id + '" value="' + (amt || '') + '" min="0" step="10" placeholder="0" />' +
        '<div class="fn-bar-wrap"><div class="fn-bar-fill" style="width:' + pct + '%;background:' + def.color + ';box-shadow:0 0 5px ' + def.color + '"></div></div>' +
        '<div class="fn-bcat-pct" style="color:' + def.color + '">' + pct + '%</div>' +
        '</div>';
    }
    catEl.innerHTML = html;

    _updateRemaining(income, cats);
  }

  function _updateRemaining(income, cats) {
    var total = 0;
    for (var i = 0; i < cats.length; i++) total += (cats[i].amount || 0);
    var rem = income - total;
    var remEl = el('fn-b-remaining');
    if (remEl) {
      remEl.textContent = fmtS(rem);
      remEl.style.color = rem >= 0 ? '#2ecc71' : '#ff5050';
    }
  }

  function _readBudgetLive() {
    var income = parseFloat((el('fn-b-income') || {}).value) || 0;
    var inputs = document.querySelectorAll('.fn-bcat-input');
    var cats = [];
    var totalSpend = 0;
    for (var i = 0; i < inputs.length; i++) {
      var amt = parseFloat(inputs[i].value) || 0;
      totalSpend += amt;
      cats.push({ id: inputs[i].getAttribute('data-cat'), amount: amt });
    }
    var rem = income - totalSpend;
    var remEl = el('fn-b-remaining');
    if (remEl) {
      remEl.textContent = fmtS(rem);
      remEl.style.color = rem >= 0 ? '#2ecc71' : '#ff5050';
    }
    var bars   = document.querySelectorAll('.fn-bar-fill');
    var pctEls = document.querySelectorAll('.fn-bcat-pct');
    for (var j = 0; j < inputs.length; j++) {
      var a = parseFloat(inputs[j].value) || 0;
      var p = income > 0 ? Math.min(Math.round((a / income) * 100), 100) : 0;
      if (bars[j])   bars[j].style.width = p + '%';
      if (pctEls[j]) pctEls[j].textContent = p + '%';
    }
    return { income: income, cats: cats };
  }

  function wireBudget() {
    var incEl = el('fn-b-income');
    if (incEl) incEl.addEventListener('input', function () { _readBudgetLive(); });

    var catWrap = el('fn-budget-cats');
    if (catWrap) {
      catWrap.addEventListener('input', function (e) {
        if (e.target.classList.contains('fn-bcat-input')) { _readBudgetLive(); }
      });
    }

    on('fn-budget-save', 'click', function () {
      var data = _readBudgetLive();
      data.savedAt = Date.now();
      saveBudget(data);
      cosLog('Penny', 'Budget saved — income: ' + fmtS(data.income));
      updatePending();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZONE 4 — SAVINGS VAULT
  ═══════════════════════════════════════════════════════════════════════ */
  function renderSavings() {
    var goals = loadSavings();
    var gEl = el('fn-savings-goals');
    if (!gEl) return;

    var html = '';
    for (var i = 0; i < goals.length; i++) {
      var g = goals[i];
      var pct = g.target > 0 ? Math.min(Math.round((g.current / g.target) * 100), 100) : 0;
      var c   = g.color || '#2ecc71';
      html += '<div class="fn-goal-card">' +
        '<div class="fn-goal-name">' + esc(g.name) + '</div>' +
        '<div class="fn-goal-amts">' + fmtS(g.current) + '<span class="fn-goal-sep"> / </span>' + fmtS(g.target) + '</div>' +
        '<div class="fn-goal-bar"><div class="fn-goal-fill" style="width:' + pct + '%;background:linear-gradient(90deg,' + c + ',rgba(150,80,255,.6));box-shadow:0 0 7px ' + c + '"></div></div>' +
        '<div class="fn-goal-pct" style="color:' + c + '">' + pct + '%</div>' +
        '</div>';
    }
    gEl.innerHTML = html;
  }

  function wireSavings() {
    on('fn-sv-deposit', 'click', function () { _openSavingsDrawer('deposit'); });
    on('fn-sv-goal',    'click', function () { _openSavingsDrawer('goal');    });
    on('fn-sv-project', 'click', function () { _openSavingsDrawer('project'); });
    on('fn-svd-close',  'click', function () { el('fn-savings-drawer').style.display = 'none'; });
  }

  function _openSavingsDrawer(action) {
    var goals = loadSavings();
    var body  = el('fn-svd-body');
    var opts  = '';
    for (var i = 0; i < goals.length; i++) {
      opts += '<option value="' + goals[i].id + '">' + esc(goals[i].name) + '</option>';
    }

    if (action === 'deposit') {
      set('fn-svd-title', 'ADD DEPOSIT');
      body.innerHTML =
        '<div class="fn-form-grid">' +
          '<select class="fn-input" id="fn-svd-gsel">' + opts + '</select>' +
          '<input type="number" class="fn-input" id="fn-svd-amt" placeholder="Amount $ *" min="0" step="10" />' +
        '</div>' +
        '<button type="button" class="fn-btn fn-btn-green" id="fn-svd-go">+ DEPOSIT</button>';
      on('fn-svd-go', 'click', function () {
        var gid = (el('fn-svd-gsel') || {}).value;
        var amt = parseFloat((el('fn-svd-amt') || {}).value) || 0;
        if (!amt || !gid) return;
        var gs = loadSavings();
        for (var i = 0; i < gs.length; i++) {
          if (gs[i].id === gid) { gs[i].current = Math.min(gs[i].current + amt, gs[i].target); }
        }
        saveSavings(gs);
        cosLog('Vault', 'Deposit added: ' + fmt(amt));
        el('fn-savings-drawer').style.display = 'none';
        renderSavings();
      });

    } else if (action === 'goal') {
      set('fn-svd-title', 'UPDATE GOAL');
      body.innerHTML =
        '<div class="fn-form-grid">' +
          '<select class="fn-input" id="fn-svd-gsel">' + opts + '</select>' +
          '<input type="number" class="fn-input" id="fn-svd-target" placeholder="New target amount $" min="0" step="100" />' +
        '</div>' +
        '<button type="button" class="fn-btn fn-btn-green" id="fn-svd-go">UPDATE GOAL</button>';
      on('fn-svd-go', 'click', function () {
        var gid = (el('fn-svd-gsel') || {}).value;
        var tgt = parseFloat((el('fn-svd-target') || {}).value) || 0;
        if (!tgt || !gid) return;
        var gs = loadSavings();
        for (var i = 0; i < gs.length; i++) { if (gs[i].id === gid) { gs[i].target = tgt; } }
        saveSavings(gs);
        el('fn-savings-drawer').style.display = 'none';
        renderSavings();
      });

    } else if (action === 'project') {
      set('fn-svd-title', 'SAVINGS TIMELINE');
      var data    = loadBudget();
      var income  = data.income || 0;
      var cats    = data.cats || [];
      var spent   = 0;
      for (var ii = 0; ii < cats.length; ii++) spent += (cats[ii].amount || 0);
      var free    = income - spent;
      var allocPct = 0.5;
      var rows = '';
      for (var gi = 0; gi < goals.length; gi++) {
        var g = goals[gi];
        var rem = Math.max(g.target - g.current, 0);
        var months = (free > 0 && rem > 0) ? Math.ceil(rem / (free * allocPct)) : 0;
        var estLabel = rem === 0 ? '✓ AT GOAL' : (income === 0 ? 'SET INCOME FIRST' : (months + ' MO'));
        rows += '<div class="fn-proj-row"><span>' + esc(g.name) + '</span><span style="color:#2ecc71">' + estLabel + '</span></div>';
      }
      body.innerHTML =
        '<div style="font-size:8px;color:rgba(200,240,210,.3);margin-bottom:9px">Assumes 50% of monthly surplus allocated to savings</div>' +
        rows +
        (income === 0 ? '<div style="color:#ffdc32;font-size:9px;margin-top:9px">→ Configure income in Budget Planner to activate projections.</div>' : '');
    }

    el('fn-savings-drawer').style.display = '';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZONE 5 — TRANSACTION REVIEW
  ═══════════════════════════════════════════════════════════════════════ */
  function renderTxns() {
    var txns    = loadTxns();
    var txnEl   = el('fn-txn-list');
    if (!txnEl) return;

    var filtered = [];
    for (var i = 0; i < txns.length; i++) {
      if (_txnFilter === 'all' || txns[i].type === _txnFilter) filtered.push(txns[i]);
    }

    if (!filtered.length) {
      txnEl.innerHTML = '<div class="fn-empty">No transactions. Fetch from ledger or add via Greenbean.</div>';
      return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
      var t = filtered[j];
      var isRev = t.type === 'revenue';
      var ac    = isRev ? '#2ecc71' : '#ff6060';
      var sign  = isRev ? '+' : '-';
      var cls   = isRev ? 'fn-rev' : 'fn-exp';
      html += '<div class="fn-txn-row' + (_activeTxn === t.id ? ' fn-active' : '') + '" data-id="' + t.id + '">' +
        '<div class="fn-txn-type ' + cls + '">' + (t.type || 'txn').toUpperCase() + '</div>' +
        '<div class="fn-txn-desc">' + esc(t.description || t.category || '') + '</div>' +
        '<div class="fn-txn-src">'  + esc(t.source || t.category || '') + '</div>' +
        '<div class="fn-txn-date">' + esc(t.date || '') + '</div>' +
        '<div class="fn-txn-amt" style="color:' + ac + '">' + sign + fmt(t.amount) + '</div>' +
        '<div class="fn-txn-stat">' + esc(t.status || 'pending') + '</div>' +
        '<div class="fn-txn-chev">▸</div>' +
        '</div>';
    }
    txnEl.innerHTML = html;
  }

  function wireTxns() {
    var txnEl = el('fn-txn-list');
    if (txnEl) {
      txnEl.addEventListener('click', function (e) {
        var row = e.target;
        while (row && row !== txnEl) {
          if (row.classList && row.classList.contains('fn-txn-row')) break;
          row = row.parentNode;
        }
        if (!row || !row.getAttribute) return;
        var id = row.getAttribute('data-id');
        if (!id) return;
        if (_activeTxn === id && el('fn-txn-drawer').style.display !== 'none') {
          el('fn-txn-drawer').style.display = 'none';
          _activeTxn = null;
          renderTxns();
          return;
        }
        var txns = loadTxns();
        var t = null;
        for (var i = 0; i < txns.length; i++) { if (txns[i].id === id) { t = txns[i]; break; } }
        if (!t) return;
        _activeTxn = id;
        set('fn-txd-name', t.description || t.category || t.id);
        var metaEl = el('fn-txd-meta');
        if (metaEl) {
          var isRev = t.type === 'revenue';
          var ac = isRev ? '#2ecc71' : '#ff6060';
          metaEl.innerHTML =
            '<span class="fn-chip">AMOUNT: <span style="color:' + ac + '">' + fmt(t.amount) + '</span></span>' +
            '<span class="fn-chip">TYPE: ' + (t.type || '').toUpperCase() + '</span>' +
            '<span class="fn-chip">DATE: ' + esc(t.date || '—') + '</span>' +
            '<span class="fn-chip">SOURCE: ' + esc(t.source || t.category || '—') + '</span>' +
            '<span class="fn-chip fn-chip-' + (t.status || 'pending') + '">' + (t.status || 'pending').toUpperCase() + '</span>';
        }
        el('fn-txn-drawer').style.display = '';
        renderTxns();
      });
    }

    on('fn-txd-close', 'click', function () {
      el('fn-txn-drawer').style.display = 'none';
      _activeTxn = null;
      renderTxns();
    });

    on('fn-txd-approve', 'click', function () {
      if (!_activeTxn) return;
      var txns = loadTxns();
      for (var i = 0; i < txns.length; i++) { if (txns[i].id === _activeTxn) { txns[i].status = 'approved'; } }
      saveTxns(txns);
      cosLog('Greenbean', 'Transaction approved');
      el('fn-txn-drawer').style.display = 'none'; _activeTxn = null; renderTxns();
    });

    on('fn-txd-dispute', 'click', function () {
      if (!_activeTxn) return;
      var txns = loadTxns();
      for (var i = 0; i < txns.length; i++) { if (txns[i].id === _activeTxn) { txns[i].status = 'disputed'; } }
      saveTxns(txns);
      cosLog('Greenbean', 'Transaction disputed');
      el('fn-txn-drawer').style.display = 'none'; _activeTxn = null; renderTxns();
    });

    on('fn-txd-split', 'click', function () {
      if (typeof COS !== 'undefined' && COS.notifications) {
        COS.notifications.add('Transaction splitting requires agent assignment via ORION.', 'info');
      }
    });
    on('fn-txd-receipt', 'click', function () {
      if (typeof COS !== 'undefined' && COS.notifications) {
        COS.notifications.add('Receipt upload requires storage integration.', 'info');
      }
    });

    var filters = document.querySelectorAll('.fn-filter');
    for (var fi = 0; fi < filters.length; fi++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var i = 0; i < filters.length; i++) filters[i].classList.remove('fn-on');
          btn.classList.add('fn-on');
          _txnFilter = btn.getAttribute('data-cat');
          el('fn-txn-drawer').style.display = 'none';
          _activeTxn = null;
          renderTxns();
        });
      })(filters[fi]);
    }
  }

  /* ── fetch real transactions from ledger API ── */
  function fetchLedger() {
    if (typeof fetch === 'undefined') return;
    fetch('/api/finance/ledger')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var txns = data.transactions || [];
        if (txns.length) {
          /* merge with localStorage, deduping by id */
          var stored = loadTxns();
          var ids = {};
          for (var i = 0; i < stored.length; i++) ids[stored[i].id] = true;
          for (var j = 0; j < txns.length; j++) {
            if (!ids[txns[j].id]) {
              if (!txns[j].status) txns[j].status = 'pending';
              stored.unshift(txns[j]);
              ids[txns[j].id] = true;
            }
          }
          saveTxns(stored);
          renderTxns();
        }
      })
      .catch(function () { /* server not up — use defaults */ });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZONE 6 — INTEL REQUEST INBOX
  ═══════════════════════════════════════════════════════════════════════ */
  function renderIntelInbox() {
    var inEl = el('fn-intel-inbox');
    if (!inEl) return;
    var html = '';
    var dirColors = { INBOUND:'#3aa8c8', OUTBOUND:'rgba(155,107,255,.8)' };
    for (var i = 0; i < INTEL_REQUESTS.length; i++) {
      var r = INTEL_REQUESTS[i];
      var dc = dirColors[r.dir] || 'rgba(200,240,210,.4)';
      html += '<div class="fn-intel-row" data-id="' + r.id + '">' +
        '<div class="fn-intel-dir" style="color:' + dc + '">' + r.dir + '</div>' +
        '<div class="fn-intel-dept">' + esc(r.from) + '</div>' +
        '<div class="fn-intel-subj">' + esc(r.subj) + '</div>' +
        '<span class="fn-intel-stat fn-is-' + r.status + '">' + r.status.toUpperCase() + '</span>' +
        '</div>';
    }
    inEl.innerHTML = html || '<div class="fn-empty">No pending requests.</div>';
  }

  function wireIntelInbox() {
    var inEl = el('fn-intel-inbox');
    if (inEl) {
      inEl.addEventListener('click', function (e) {
        var row = e.target;
        while (row && row !== inEl) {
          if (row.classList && row.classList.contains('fn-intel-row')) break;
          row = row.parentNode;
        }
        if (!row || !row.getAttribute) return;
        var id = row.getAttribute('data-id');
        var req = null;
        for (var i = 0; i < INTEL_REQUESTS.length; i++) { if (INTEL_REQUESTS[i].id === id) { req = INTEL_REQUESTS[i]; break; } }
        if (!req) return;
        _activeIntel = id;
        set('fn-ind-title', req.from + ' — ' + req.subj);
        var mEl = el('fn-ind-meta');
        if (mEl) {
          var dc = req.dir === 'INBOUND' ? '#3aa8c8' : 'rgba(155,107,255,.8)';
          mEl.innerHTML =
            '<div style="font-size:10px;color:rgba(200,240,210,.65);margin-bottom:10px;line-height:1.6">' + esc(req.detail) + '</div>' +
            '<span class="fn-chip" style="color:' + dc + '">' + req.dir + '</span>' +
            '<span class="fn-chip fn-chip-' + req.status + '">' + req.status.toUpperCase() + '</span>';
        }
        el('fn-intel-drawer').style.display = '';
      });
    }

    on('fn-ind-close', 'click', function () { el('fn-intel-drawer').style.display = 'none'; _activeIntel = null; });

    function intelAction(status) {
      return function () {
        if (!_activeIntel) return;
        for (var i = 0; i < INTEL_REQUESTS.length; i++) {
          if (INTEL_REQUESTS[i].id === _activeIntel) { INTEL_REQUESTS[i].status = status; }
        }
        el('fn-intel-drawer').style.display = 'none';
        _activeIntel = null;
        renderIntelInbox();
      };
    }

    on('fn-ind-approve', 'click', intelAction('approved'));
    on('fn-ind-deny',    'click', intelAction('denied'));
    on('fn-ind-info',    'click', intelAction('pending_info'));
    on('fn-ind-assign',  'click', intelAction('assigned'));
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PENDING ACTIONS (auto-derives from live data)
  ═══════════════════════════════════════════════════════════════════════ */
  function updatePending() {
    var pEl = el('fn-pending-actions');
    if (!pEl) return;
    var actions = [];
    var bills   = loadBills();
    var budget  = loadBudget();
    var today   = new Date();

    for (var i = 0; i < bills.length; i++) {
      var b = bills[i];
      if (b.status === 'paid') continue;
      var isOverdue = b.status === 'overdue' ||
        (b.due && new Date(b.due) < today);
      var daysDiff = b.due ? (new Date(b.due) - today) / 86400000 : Infinity;

      if (isOverdue) {
        actions.push({ label:b.name + ' OVERDUE', amt:fmt(b.amount), color:'#ff5050', icon:'⚠' });
      } else if (daysDiff >= 0 && daysDiff <= 7) {
        actions.push({ label:b.name + ' DUE SOON', amt:fmt(b.amount), color:'rgba(255,220,50,.8)', icon:'⏳' });
      }
      if (b.flagged) {
        actions.push({ label:b.name + ' FLAGGED',  amt:fmt(b.amount), color:'#ff9f43', icon:'⚑' });
      }
    }

    if (!budget.income) {
      actions.push({ label:'SET MONTHLY INCOME', amt:'', color:'#3aa8c8', icon:'📊' });
    }

    if (!actions.length) {
      pEl.innerHTML = '<div class="fn-empty">All caught up.</div>';
      return;
    }

    var html = '';
    for (var j = 0; j < actions.length; j++) {
      var a = actions[j];
      html += '<div class="fn-pending-row" style="border-left:2px solid ' + a.color + '">' +
        '<span class="fn-pend-icon">' + a.icon + '</span>' +
        '<span class="fn-pend-lbl" style="color:' + a.color + '">' + esc(a.label) + '</span>' +
        (a.amt ? '<span class="fn-pend-amt">' + a.amt + '</span>' : '') +
        '</div>';
    }
    pEl.innerHTML = html;
  }

  /* ── utility ─────────────────────────────────────────────────────────── */
  function on(id, evt, fn) {
    var e = el(id);
    if (e) e.addEventListener(evt, fn);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    renderBills();
    wireBillDesk();
    wireAgentStations();
    renderBudget();
    wireBudget();
    renderSavings();
    wireSavings();
    renderTxns();
    wireTxns();
    fetchLedger();
    renderIntelInbox();
    wireIntelInbox();
    updatePending();
  });

})();
