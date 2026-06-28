/* CyberCookieOS — Finance Workspace
   Bill / Income tracker with summary totals and status management */

(function () {
  'use strict';

  var STORE = 'ws.finance.entries';

  var DEFAULTS = [
    { id: 'fe1', name: 'Rent',               type: 'bill',   amount: 1400, dueDate: '2026-07-01', status: 'pending', notes: 'Monthly housing', ts: Date.now() - 86400000 },
    { id: 'fe2', name: 'Electricity',        type: 'bill',   amount: 85,   dueDate: '2026-07-05', status: 'pending', notes: '',               ts: Date.now() - 86400000 },
    { id: 'fe3', name: 'Netflix',            type: 'bill',   amount: 18,   dueDate: '2026-07-10', status: 'paid',    notes: 'Shared plan',    ts: Date.now() - 72000000 },
    { id: 'fe4', name: 'Groceries Budget',   type: 'bill',   amount: 300,  dueDate: '2026-06-30', status: 'overdue', notes: 'Weekly shopping', ts: Date.now() - 172800000 },
    { id: 'fe5', name: 'Freelance Payment',  type: 'income', amount: 500,  dueDate: '2026-06-28', status: 'paid',    notes: 'Client project', ts: Date.now() - 3600000 },
    { id: 'fe6', name: 'Etsy Revenue',       type: 'income', amount: 120,  dueDate: '',           status: 'paid',    notes: 'Monthly avg',    ts: Date.now() - 7200000 },
  ];

  var _typeFilter = 'all';
  var _editingId  = null;

  function load()     { return COS.state.get(STORE) || DEFAULTS.map(function (e) { return Object.assign({}, e); }); }
  function save(list) { COS.state.set(STORE, list); }
  function esc(s)     { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function calcTotals(list) {
    var income  = list.filter(function (e) { return e.type === 'income'; }).reduce(function (s, e) { return s + (e.amount || 0); }, 0);
    var bills   = list.filter(function (e) { return e.type === 'bill';   }).reduce(function (s, e) { return s + (e.amount || 0); }, 0);
    var pending = list.filter(function (e) { return e.status === 'pending' || e.status === 'overdue'; }).reduce(function (s, e) { return s + (e.type === 'bill' ? e.amount || 0 : 0); }, 0);
    return { income: income, bills: bills, balance: income - bills, pending: pending };
  }

  function renderSummary() {
    var list   = load();
    var totals = calcTotals(list);
    var setText = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    setText('fn-totalIncome',  '$' + totals.income.toLocaleString());
    setText('fn-totalBills',   '$' + totals.bills.toLocaleString());
    setText('fn-netBalance',   (totals.balance >= 0 ? '+$' : '-$') + Math.abs(totals.balance).toLocaleString());
    setText('fn-pendingBills', '$' + totals.pending.toLocaleString());
    var balEl = document.getElementById('fn-netBalance');
    if (balEl) balEl.style.color = totals.balance >= 0 ? '#2ecc71' : '#ff5050';
  }

  function render() {
    renderSummary();
    var list     = load();
    var filtered = _typeFilter === 'all' ? list : list.filter(function (e) { return e.type === _typeFilter; });
    var tbody    = document.getElementById('fn-entryBody');
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="ws-empty">No entries yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(function (e) {
      var isOverdue = e.status === 'overdue' || (e.dueDate && e.status !== 'paid' && new Date(e.dueDate) < new Date());
      var statusClass = isOverdue ? 'overdue' : e.status;
      var typeColor = e.type === 'income' ? 'rgba(46,204,113,.8)' : 'rgba(255,105,180,.7)';
      var amtColor  = e.type === 'income' ? '#2ecc71' : 'rgba(240,220,255,.7)';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span style="font-size:7px;padding:2px 8px;border-radius:10px;border:1px solid;color:' + typeColor + ';border-color:currentColor">' + e.type.toUpperCase() + '</span></td>' +
        '<td style="font-weight:600;color:rgba(240,220,255,.85)">' + esc(e.name) + '</td>' +
        '<td style="font-weight:700;color:' + amtColor + ';font-variant-numeric:tabular-nums">$' + (e.amount || 0).toLocaleString() + '</td>' +
        '<td style="font-size:8px;color:rgba(200,160,255,.4)">' + (e.dueDate || '—') + '</td>' +
        '<td><span class="ws-badge ws-badge-' + statusClass + '">' + statusClass.toUpperCase() + '</span></td>' +
        '<td><div style="display:flex;gap:4px">' +
          (e.status !== 'paid' ? '<button class="ws-btn ws-btn-sm ws-btn-success" data-action="pay" data-id="' + e.id + '">✓ PAID</button>' : '') +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost" data-action="edit" data-id="' + e.id + '">EDIT</button>' +
          '<button class="ws-btn ws-btn-sm ws-btn-danger" data-action="delete" data-id="' + e.id + '">✕</button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });
  }

  function wireFilters() {
    document.querySelectorAll('#fn-workspace .ws-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#fn-workspace .ws-filter').forEach(function (b) { b.classList.remove('ws-filterActive'); });
        this.classList.add('ws-filterActive');
        _typeFilter = this.dataset.type;
        render();
      });
    });
  }

  function wireTable() {
    var tbody = document.getElementById('fn-entryBody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = load();
      var entry  = list.find(function (e) { return e.id === id; });

      if (action === 'pay' && entry) {
        entry.status = 'paid';
        save(list);
        COS.activity.log({ agent: entry.type === 'bill' ? 'Ledger' : 'Greenbean', dept: 'finance', msg: (entry.type === 'bill' ? 'Bill paid: ' : 'Income recorded: ') + entry.name + ' $' + entry.amount, source: 'user' });
        render();
      } else if (action === 'delete') {
        save(list.filter(function (e) { return e.id !== id; }));
        render();
      } else if (action === 'edit' && entry) {
        _editingId = id;
        setValue('fn-newName',    entry.name);
        setValue('fn-newType',    entry.type);
        setValue('fn-newAmount',  entry.amount);
        setValue('fn-newDue',     entry.dueDate);
        setValue('fn-newStatus',  entry.status);
        setValue('fn-newNotes',   entry.notes);
        var addBtn = document.getElementById('fn-submitEntry');
        if (addBtn) addBtn.textContent = '✓ UPDATE ENTRY';
        document.getElementById('fn-formPanel').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function wireForm() {
    var btn = document.getElementById('fn-submitEntry');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var name = (document.getElementById('fn-newName').value || '').trim();
      if (!name) { document.getElementById('fn-newName').focus(); return; }
      var amount = parseFloat(document.getElementById('fn-newAmount').value) || 0;

      var item = {
        id:      _editingId || 'fe' + Date.now(),
        name:    name,
        type:    document.getElementById('fn-newType').value   || 'bill',
        amount:  amount,
        dueDate: document.getElementById('fn-newDue').value    || '',
        status:  document.getElementById('fn-newStatus').value || 'pending',
        notes:   (document.getElementById('fn-newNotes').value || '').trim(),
        ts:      Date.now(),
      };

      var list = load();
      if (_editingId) {
        var idx = list.findIndex(function (e) { return e.id === _editingId; });
        if (idx > -1) list[idx] = item;
      } else {
        list.unshift(item);
      }
      save(list);

      var agent = item.type === 'income' ? 'Greenbean' : 'Ledger';
      COS.activity.log({ agent: agent, dept: 'finance', msg: (_editingId ? 'Entry updated: ' : 'Entry added: ') + name + ' $' + amount, source: 'user' });
      if (!_editingId && item.status !== 'paid') {
        COS.notifications.add(item.type === 'bill' ? 'New bill tracked: ' + name + ' ($' + amount + ')' : 'Income entry added: ' + name, 'normal');
      }

      clearForm();
      render();
    });

    var cancelBtn = document.getElementById('fn-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', clearForm);
  }

  function clearForm() {
    ['fn-newName','fn-newAmount','fn-newDue','fn-newNotes'].forEach(function (id) { setValue(id, ''); });
    setValue('fn-newType',   'bill');
    setValue('fn-newStatus', 'pending');
    _editingId = null;
    var btn = document.getElementById('fn-submitEntry');
    if (btn) btn.textContent = '+ ADD ENTRY';
  }

  function setValue(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    wireFilters();
    wireTable();
    wireForm();
  });

})();

/* ================================================================
   PENNY FINANCE SYSTEM — Monthly Budget Setup & Tracker
================================================================ */
(function () {
  'use strict';
  console.log('Penny workspace loaded');

  var BUDGET_KEY = 'penny.budget';

  var FIELDS = [
    { id: 'pb-rent',       label: 'Rent / Mortgage',    cat: 'housing' },
    { id: 'pb-utilities',  label: 'Utilities',           cat: 'housing' },
    { id: 'pb-internet',   label: 'Internet',            cat: 'housing' },
    { id: 'pb-phone',      label: 'Phone',               cat: 'living' },
    { id: 'pb-insurance',  label: 'Insurance',           cat: 'living' },
    { id: 'pb-subs',       label: 'Subscriptions',       cat: 'living' },
    { id: 'pb-transport',  label: 'Transportation',      cat: 'living' },
    { id: 'pb-food',       label: 'Food / Groceries',    cat: 'food' },
    { id: 'pb-debt',       label: 'Debt Payments',       cat: 'debt' },
    { id: 'pb-misc',       label: 'Misc / Personal',     cat: 'misc' },
  ];

  function fmt(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

  function loadBudget()      { return COS.state.get(BUDGET_KEY) || null; }
  function saveBudget(data)  { COS.state.set(BUDGET_KEY, data); }

  function readForm() {
    var data = { income: parseFloat(document.getElementById('pb-income').value) || 0 };
    FIELDS.forEach(function (f) { data[f.id.replace('pb-', '')] = parseFloat(document.getElementById(f.id).value) || 0; });
    data.savingsGoalPct  = parseFloat(document.getElementById('pb-savingsGoalPct').value)  || 10;
    data.emergencyGoal   = parseFloat(document.getElementById('pb-emergencyGoal').value)    || 5000;
    data.currentSavings  = parseFloat(document.getElementById('pb-currentSavings').value)   || 0;
    data.savedAt         = Date.now();
    return data;
  }

  function fillForm(data) {
    document.getElementById('pb-income').value = data.income || '';
    FIELDS.forEach(function (f) {
      var key = f.id.replace('pb-', '');
      document.getElementById(f.id).value = data[key] || '';
    });
    document.getElementById('pb-savingsGoalPct').value = data.savingsGoalPct || 10;
    document.getElementById('pb-emergencyGoal').value  = data.emergencyGoal  || 5000;
    document.getElementById('pb-currentSavings').value = data.currentSavings || 0;
  }

  function renderDash(data) {
    var totalExpenses = FIELDS.reduce(function (s, f) { return s + (data[f.id.replace('pb-', '')] || 0); }, 0);
    var remaining     = data.income - totalExpenses;
    var savingsGoal   = Math.round(data.income * (data.savingsGoalPct / 100));
    var expPct        = pct(totalExpenses, data.income);
    var savingsPct    = pct(data.currentSavings, data.emergencyGoal);

    // Summary blocks
    var summaryEl = document.getElementById('fn-bdSummary');
    if (summaryEl) {
      var remColor = remaining >= 0 ? '#2ecc71' : '#ff5050';
      summaryEl.innerHTML = [
        { label: 'MONTHLY INCOME', val: fmt(data.income), color: '#2ecc71' },
        { label: 'TOTAL EXPENSES', val: fmt(totalExpenses), color: remaining < 0 ? '#ff5050' : '#ffdc32' },
        { label: 'REMAINING', val: fmt(remaining), color: remColor },
        { label: 'SAVINGS GOAL', val: fmt(savingsGoal) + ' / mo', color: '#9b6bff' },
      ].map(function (b) {
        return '<div style="background:rgba(255,255,255,.025);border:1px solid rgba(150,80,255,.1);border-radius:5px;padding:10px;text-align:center">' +
          '<div style="font-size:18px;font-weight:900;color:' + b.color + ';text-shadow:0 0 10px ' + b.color + ';line-height:1">' + b.val + '</div>' +
          '<div style="font-size:6px;letter-spacing:1.5px;color:rgba(200,160,255,.3);margin-top:4px">' + b.label + '</div>' +
          '</div>';
      }).join('');
    }

    // Category breakdown bars
    var catEl = document.getElementById('fn-bdCategories');
    if (catEl) {
      catEl.innerHTML = FIELDS.map(function (f) {
        var key = f.id.replace('pb-', '');
        var amt = data[key] || 0;
        var p   = pct(amt, data.income);
        var barColor = f.cat === 'housing' ? '#3aa8c8' : f.cat === 'debt' ? '#ff5050' : f.cat === 'food' ? '#2ecc71' : '#9b6bff';
        return '<div style="margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:7px;color:rgba(200,160,255,.55);margin-bottom:3px">' +
            '<span>' + f.label + '</span><span>' + fmt(amt) + ' (' + p + '%)</span>' +
          '</div>' +
          '<div style="height:4px;background:rgba(255,255,255,.05);border-radius:2px">' +
            '<div style="height:100%;width:' + Math.min(p, 100) + '%;background:' + barColor + ';border-radius:2px;box-shadow:0 0 4px ' + barColor + '"></div>' +
          '</div></div>';
      }).join('') +
      '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(150,80,255,.1);font-size:7px;color:rgba(200,160,255,.4)">' +
        '<span>Budget utilization: </span>' +
        '<span style="color:' + (expPct > 90 ? '#ff5050' : expPct > 75 ? '#ffdc32' : '#2ecc71') + ';font-weight:700">' + expPct + '%</span>' +
      '</div>';
    }

    // Savings panel
    var savEl = document.getElementById('fn-bdSavings');
    if (savEl) {
      savEl.innerHTML =
        '<div style="margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;font-size:7px;color:rgba(200,160,255,.55);margin-bottom:4px">' +
            '<span>Emergency Fund</span><span>' + fmt(data.currentSavings) + ' / ' + fmt(data.emergencyGoal) + '</span>' +
          '</div>' +
          '<div style="height:8px;background:rgba(255,255,255,.05);border-radius:4px">' +
            '<div style="height:100%;width:' + Math.min(savingsPct, 100) + '%;background:linear-gradient(90deg,#2ecc71,#9b6bff);border-radius:4px;box-shadow:0 0 8px rgba(46,204,113,.4)"></div>' +
          '</div>' +
          '<div style="font-size:7px;color:rgba(200,160,255,.3);margin-top:3px">' + savingsPct + '% of goal reached</div>' +
        '</div>' +
        '<div>' +
          '<div style="display:flex;justify-content:space-between;font-size:7px;color:rgba(200,160,255,.55);margin-bottom:4px">' +
            '<span>Monthly Savings Target</span><span>' + fmt(savingsGoal) + '</span>' +
          '</div>' +
          '<div style="height:8px;background:rgba(255,255,255,.05);border-radius:4px">' +
            '<div style="height:100%;width:' + Math.min(pct(remaining, data.income), 100) + '%;background:linear-gradient(90deg,#ffdc32,#2ecc71);border-radius:4px"></div>' +
          '</div>' +
          '<div style="font-size:7px;color:rgba(200,160,255,.3);margin-top:3px">Remaining after expenses: ' + fmt(remaining) + '</div>' +
        '</div>';
    }

    // Recommendations
    var recsEl = document.getElementById('fn-bdRecs');
    if (recsEl) {
      var recs = [];
      if (expPct > 90)   recs.push({ c:'#ff5050', t:'⚠ Expenses exceed 90% of income. Cut discretionary spending.' });
      if (expPct > 75)   recs.push({ c:'#ffdc32', t:'⚡ Expenses are above 75%. Consider reducing subscriptions or misc.' });
      if (remaining < savingsGoal) recs.push({ c:'#ffdc32', t:'💾 Not meeting savings goal. Try reducing food or transport budget.' });
      if (data.debt > 0) recs.push({ c:'#ff5050', t:'💳 Debt payments detected. Prioritize high-interest debt first.' });
      if (savingsPct < 25)  recs.push({ c:'#9b6bff', t:'🚨 Emergency fund is below 25%. Build this up first.' });
      if (savingsPct >= 100) recs.push({ c:'#2ecc71', t:'🎉 Emergency fund complete! Redirect to investments.' });
      if (!recs.length)  recs.push({ c:'#2ecc71', t:'✓ Budget looks healthy! Keep monitoring monthly.' });
      recsEl.innerHTML = recs.map(function (r) {
        return '<div style="font-size:8px;color:' + r.c + ';padding:5px 8px;border-left:2px solid ' + r.c + ';margin-bottom:5px;background:rgba(255,255,255,.02);border-radius:0 3px 3px 0">' + r.t + '</div>';
      }).join('');
    }
  }

  function showDash() {
    document.getElementById('fn-budgetDash').style.display = '';
    document.getElementById('fn-setupForm').style.display = 'none';
    var toggleBtn = document.getElementById('fn-toggleSetup');
    var editBtn   = document.getElementById('fn-editBudgetBtn');
    var sideBtn   = document.getElementById('fn-sidebarOpenBudget');
    if (toggleBtn) toggleBtn.textContent = '✕ CLOSE';
    if (editBtn)   { editBtn.style.display = ''; editBtn.textContent = 'EDIT BUDGET'; }
    if (sideBtn)   sideBtn.textContent = 'EDIT BUDGET';
  }
  function showSetup() {
    document.getElementById('fn-setupForm').style.display = '';
    document.getElementById('fn-budgetDash').style.display = 'none';
    var toggleBtn = document.getElementById('fn-toggleSetup');
    var editBtn   = document.getElementById('fn-editBudgetBtn');
    var sideBtn   = document.getElementById('fn-sidebarOpenBudget');
    if (toggleBtn) toggleBtn.textContent = loadBudget() ? '✕ CANCEL' : '⚙ SETUP BUDGET';
    if (editBtn)   editBtn.style.display = 'none';
    if (sideBtn)   sideBtn.textContent = 'OPEN BUDGET SETUP';
  }
  function scrollToBudget() {
    var el = document.getElementById('pennySetupPanel');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function initPennyBudget() {
    var data = loadBudget();
    if (data) {
      fillForm(data);
      renderDash(data);
      showDash();
    } else {
      showSetup();
      setTimeout(scrollToBudget, 400);
    }

    var saveBtn   = document.getElementById('fn-saveBudget');
    var toggleBtn = document.getElementById('fn-toggleSetup');
    var editBtn   = document.getElementById('fn-editBudgetBtn');
    var sideBtn   = document.getElementById('fn-sidebarOpenBudget');

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var data = readForm();
        if (!data.income) {
          var el = document.getElementById('pb-income');
          if (el) { el.focus(); el.style.outline = '2px solid #ff5050'; setTimeout(function(){ el.style.outline=''; }, 2000); }
          alert('Please enter your monthly income first.');
          return;
        }
        saveBudget(data);
        renderDash(data);
        showDash();
        // Generate a budget report via OE if available
        if (typeof OE !== 'undefined') {
          OE.generate({ type: 'generate_budget_report', title: 'Monthly Budget Report' }, 'penny', 'finance');
        }
        if (typeof COS !== 'undefined') {
          COS.activity.log({ agent: 'Penny', dept: 'finance', msg: 'Monthly budget saved — ' + fmt(data.income) + ' income, ' + fmt(data.income - FIELDS.reduce(function(s,f){return s+(data[f.id.replace('pb-','')]||0);},0)) + ' remaining', source: 'penny' });
        }
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var setup = document.getElementById('fn-setupForm');
        if (setup.style.display === 'none' || !setup.style.display) {
          showSetup();
        } else {
          var d = loadBudget();
          if (d) { renderDash(d); showDash(); }
          else { showSetup(); }
        }
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', function () {
        var d = loadBudget();
        if (d) fillForm(d);
        showSetup();
        scrollToBudget();
      });
    }

    if (sideBtn) {
      sideBtn.addEventListener('click', function () {
        var d = loadBudget();
        if (d) { fillForm(d); showSetup(); } else { showSetup(); }
        scrollToBudget();
      });
    }

    var resetBtn = document.getElementById('fn-resetBudget');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!confirm('Clear all budget data and start over?')) return;
        COS.state.remove(BUDGET_KEY);
        FIELDS.forEach(function (f) { var el = document.getElementById(f.id); if (el) el.value = ''; });
        ['pb-income','pb-savingsGoalPct','pb-emergencyGoal','pb-currentSavings'].forEach(function (id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
        showSetup();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initPennyBudget);

})();
