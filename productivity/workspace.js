/* CyberCookieOS — Productivity Workspace
   Task Board: To Do / In Progress / Done, assign to any employee, edit tasks */

(function () {
  'use strict';

  var STORE = 'ws.productivity.tasks';

  var ALL_EMPLOYEES = [
    { id: 'athena',       name: 'Athena',       dept: 'security' },
    { id: 'nimbus',       name: 'Nimbus',       dept: 'security' },
    { id: 'sentinel',     name: 'Sentinel',     dept: 'security' },
    { id: 'nova',         name: 'Nova',         dept: 'housing' },
    { id: 'beacon',       name: 'Beacon',       dept: 'housing' },
    { id: 'atlas',        name: 'Atlas',        dept: 'housing' },
    { id: 'pixel',        name: 'Pixel',        dept: 'commerce' },
    { id: 'etsybot',      name: 'EtsyBot',      dept: 'commerce' },
    { id: 'spark',        name: 'Spark',        dept: 'commerce' },
    { id: 'forge',        name: 'Forge',        dept: 'commerce' },
    { id: 'calypso',      name: 'Calypso',      dept: 'productivity' },
    { id: 'echo',         name: 'Echo',         dept: 'productivity' },
    { id: 'atlas_planner',name: 'Atlas Planner',dept: 'productivity' },
    { id: 'memo',         name: 'Memo',         dept: 'productivity' },
    { id: 'greenbean',    name: 'Greenbean',    dept: 'finance' },
    { id: 'ledger',       name: 'Ledger',       dept: 'finance' },
    { id: 'penny',        name: 'Penny',        dept: 'finance' },
    { id: 'vault',        name: 'Vault',        dept: 'finance' },
  ];

  var DEFAULTS = [
    { id: 'pt1', title: 'Complete IPv6 threat sweep',      assignee: 'athena',       dept: 'security',     dueDate: '', status: 'inprogress', ts: Date.now() - 3600000 },
    { id: 'pt2', title: 'Find 5 new rental listings',      assignee: 'nova',         dept: 'housing',      dueDate: '', status: 'inprogress', ts: Date.now() - 7200000 },
    { id: 'pt3', title: 'Research holographic stickers',   assignee: 'pixel',        dept: 'commerce',     dueDate: '', status: 'done',       ts: Date.now() - 86400000 },
    { id: 'pt4', title: 'Sync weekly calendar',            assignee: 'calypso',      dept: 'productivity', dueDate: '', status: 'done',       ts: Date.now() - 86400000 },
    { id: 'pt5', title: 'Generate monthly budget report',  assignee: 'greenbean',    dept: 'finance',      dueDate: '', status: 'todo',       ts: Date.now() - 1800000 },
    { id: 'pt6', title: 'Audit subscription costs',        assignee: 'ledger',       dept: 'finance',      dueDate: '', status: 'todo',       ts: Date.now() - 3600000 },
  ];

  var COLS = [
    { id: 'todo',       label: 'TO DO' },
    { id: 'inprogress', label: 'IN PROGRESS' },
    { id: 'done',       label: 'DONE' },
  ];

  var _editingId = null;

  function load()     { return COS.state.get(STORE) || DEFAULTS.map(function (t) { return Object.assign({}, t); }); }
  function save(list) { COS.state.set(STORE, list); }
  function esc(s)     { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  }

  function render() {
    var list = load();
    COLS.forEach(function (col) {
      var colEl = document.getElementById('pd-col-' + col.id);
      if (!colEl) return;
      var tasks = list.filter(function (t) { return t.status === col.id; });
      colEl.innerHTML = '';

      if (!tasks.length) {
        colEl.innerHTML = '<div style="font-size:8px;color:rgba(200,160,255,.2);text-align:center;padding:12px;font-style:italic">Empty</div>';
        return;
      }

      tasks.forEach(function (t) {
        var emp     = ALL_EMPLOYEES.find(function (e) { return e.id === t.assignee; });
        var empName = emp ? emp.name : (t.assignee || 'Unassigned');
        var due     = t.dueDate ? 'Due ' + t.dueDate : '';
        var overdue = isOverdue(t);
        var isEditing = (_editingId === t.id);

        var div = document.createElement('div');
        div.className = 'ws-taskItem' + (isEditing ? ' ws-taskItem-editing' : '');
        div.innerHTML =
          '<div class="ws-taskName">' + esc(t.title) + '</div>' +
          '<div class="ws-taskAssignee">👤 ' + esc(empName) + '</div>' +
          (due ? '<div class="ws-taskDue' + (overdue ? ' overdue' : '') + '">' + (overdue ? '⚠ ' : '') + due + '</div>' : '') +
          '<div class="ws-taskItemActions">' +
            (t.status !== 'done' ? '<button class="ws-btn ws-btn-sm ws-btn-success" data-action="advance" data-id="' + t.id + '">' + (t.status === 'todo' ? '▶' : '✓') + '</button>' : '') +
            (t.status !== 'todo' ? '<button class="ws-btn ws-btn-sm ws-btn-ghost"   data-action="back"    data-id="' + t.id + '">◀</button>' : '') +
            '<button class="ws-btn ws-btn-sm ws-btn-ghost"   data-action="edit"   data-id="' + t.id + '">✏</button>' +
            '<button class="ws-btn ws-btn-sm ws-btn-danger"  data-action="delete" data-id="' + t.id + '">✕</button>' +
          '</div>';
        colEl.appendChild(div);
      });
    });

    var total   = list.length;
    var done    = list.filter(function (t) { return t.status === 'done'; }).length;
    var overdue = list.filter(function (t) { return isOverdue(t); }).length;
    var countEl = document.getElementById('pd-taskCount');
    if (countEl) countEl.textContent = done + '/' + total + ' done' + (overdue ? ' · ⚠ ' + overdue + ' overdue' : '');
  }

  function wireBoard() {
    var board = document.getElementById('pd-taskBoard');
    if (!board) return;
    board.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = load();
      var task   = list.find(function (t) { return t.id === id; });
      if (!task) return;

      if (action === 'advance') {
        if      (task.status === 'todo')       task.status = 'inprogress';
        else if (task.status === 'inprogress') task.status = 'done';
        save(list);
        var empName = (ALL_EMPLOYEES.find(function (e) { return e.id === task.assignee; }) || {}).name || 'Agent';
        COS.activity.log({ agent: empName, dept: task.dept || 'productivity', msg: (task.status === 'done' ? 'Task completed: ' : 'Task started: ') + task.title, source: 'user' });
        render();
      } else if (action === 'back') {
        if      (task.status === 'done')       task.status = 'inprogress';
        else if (task.status === 'inprogress') task.status = 'todo';
        save(list);
        render();
      } else if (action === 'edit') {
        _editingId = id;
        populateEditForm(task);
        render();
      } else if (action === 'delete') {
        if (_editingId === id) clearForm();
        save(list.filter(function (t) { return t.id !== id; }));
        COS.activity.log({ agent: 'Atlas Planner', dept: 'productivity', msg: 'Task deleted: ' + task.title, source: 'user' });
        render();
      }
    });
  }

  function buildEmployeeOptions() {
    var sel = document.getElementById('pd-newAssignee');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Unassigned —</option>';
    ALL_EMPLOYEES.forEach(function (emp) {
      var opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name + ' (' + emp.dept + ')';
      sel.appendChild(opt);
    });
  }

  function populateEditForm(task) {
    setValue('pd-newTitle',    task.title    || '');
    setValue('pd-newAssignee', task.assignee || '');
    setValue('pd-newDue',      task.dueDate  || '');
    setValue('pd-newStatus',   task.status   || 'todo');
    var btn = document.getElementById('pd-addTask');
    if (btn) btn.textContent = '✓ UPDATE TASK';
    document.getElementById('pd-formPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function clearForm() {
    setValue('pd-newTitle', '');
    setValue('pd-newDue', '');
    setValue('pd-newAssignee', '');
    setValue('pd-newStatus', 'todo');
    _editingId = null;
    var btn = document.getElementById('pd-addTask');
    if (btn) btn.textContent = '+ ADD TASK';
  }

  function wireForm() {
    var btn = document.getElementById('pd-addTask');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var title = (document.getElementById('pd-newTitle').value || '').trim();
      if (!title) {
        var el = document.getElementById('pd-newTitle');
        el.focus();
        el.classList.add('ws-input-error');
        setTimeout(function () { el.classList.remove('ws-input-error'); }, 1000);
        return;
      }

      var assigneeId  = document.getElementById('pd-newAssignee').value;
      var assigneeEmp = ALL_EMPLOYEES.find(function (e) { return e.id === assigneeId; });
      var list        = load();

      if (_editingId) {
        var task = list.find(function (t) { return t.id === _editingId; });
        if (task) {
          task.title    = title;
          task.assignee = assigneeId || '';
          task.dept     = (assigneeEmp || {}).dept || task.dept || 'productivity';
          task.dueDate  = document.getElementById('pd-newDue').value || '';
          task.status   = document.getElementById('pd-newStatus').value || task.status;
          save(list);
          COS.activity.log({ agent: (assigneeEmp || {}).name || 'Atlas Planner', dept: task.dept, msg: 'Task updated: ' + title, source: 'user' });
        }
      } else {
        var newTask = {
          id:       'pt' + Date.now(),
          title:    title,
          assignee: assigneeId || '',
          dept:     (assigneeEmp || {}).dept || 'productivity',
          dueDate:  document.getElementById('pd-newDue').value || '',
          status:   document.getElementById('pd-newStatus').value || 'todo',
          ts:       Date.now(),
        };
        list.unshift(newTask);
        save(list);
        var empName = (assigneeEmp || {}).name || 'System';
        COS.activity.log({ agent: empName, dept: newTask.dept, msg: 'Task added: ' + title, source: 'user' });
        COS.notifications.add('New task: ' + title + (assigneeEmp ? ' → ' + assigneeEmp.name : ''), 'normal');
      }

      clearForm();
      render();
    });

    var cancelBtn = document.getElementById('pd-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { clearForm(); render(); });
  }

  function setValue(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

  document.addEventListener('DOMContentLoaded', function () {
    buildEmployeeOptions();
    render();
    wireBoard();
    wireForm();
  });

})();
