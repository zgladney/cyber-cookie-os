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
