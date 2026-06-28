/* CyberCookieOS — Commerce Workspace
   Product / Trend Idea Board with platform, status, notes */

(function () {
  'use strict';

  var STORE = 'ws.commerce.ideas';

  var DEFAULTS = [
    { id: 'ci1', idea: 'Holographic Sticker Sheets', platform: 'Etsy', trendSource: 'Pixel / TikTok Research', status: 'testing', notes: 'High search volume. Low competition niche spotted.', ts: Date.now() - 86400000 },
    { id: 'ci2', idea: 'Pastel Anime Character Prints', platform: 'Etsy', trendSource: 'Spark / TikTok', status: 'idea', notes: 'Pinterest trending. Need to validate on Etsy.', ts: Date.now() - 43200000 },
    { id: 'ci3', idea: 'Productivity Planner Template Pack', platform: 'Gumroad', trendSource: 'Market Research', status: 'active', notes: 'Digital download — zero inventory needed.', ts: Date.now() - 21600000 },
  ];

  var _filter = 'all';
  var _editingId = null;

  var STATUSES = ['idea', 'researching', 'testing', 'active', 'dropped'];
  var PLATFORMS = ['Etsy', 'TikTok Shop', 'Gumroad', 'Amazon Handmade', 'Shopify', 'Instagram', 'Other'];

  function load()     { return COS.state.get(STORE) || DEFAULTS.map(function (i) { return Object.assign({}, i); }); }
  function save(list) { COS.state.set(STORE, list); }
  function esc(s)     { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function render() {
    var list     = load();
    var filtered = _filter === 'all' ? list : list.filter(function (i) { return i.status === _filter; });
    var container = document.getElementById('cm-ideaBoard');
    if (!container) return;

    if (!filtered.length) {
      container.innerHTML = '<div class="ws-empty">No ideas match this filter. Add one below!</div>';
      return;
    }

    container.innerHTML = '';
    filtered.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'ws-card';
      card.innerHTML =
        '<div class="ws-cardTitle">' + esc(item.idea) + '</div>' +
        '<div class="ws-cardMeta">' +
          '<span class="ws-badge">' + esc(item.platform) + '</span>' +
          '<span class="ws-badge ws-badge-' + item.status + '">' + item.status.toUpperCase() + '</span>' +
        '</div>' +
        (item.trendSource ? '<div style="font-size:7px;color:rgba(200,160,255,.35);margin-bottom:4px">Source: ' + esc(item.trendSource) + '</div>' : '') +
        (item.notes ? '<div class="ws-cardNotes">' + esc(item.notes) + '</div>' : '') +
        '<div class="ws-cardActions">' +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost" data-action="edit" data-id="' + item.id + '">EDIT</button>' +
          '<button class="ws-btn ws-btn-sm ws-btn-danger" data-action="delete" data-id="' + item.id + '">✕</button>' +
        '</div>';
      container.appendChild(card);
    });
  }

  function wireFilters() {
    document.querySelectorAll('#cm-workspace .ws-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#cm-workspace .ws-filter').forEach(function (b) { b.classList.remove('ws-filterActive'); });
        this.classList.add('ws-filterActive');
        _filter = this.dataset.status;
        render();
      });
    });
  }

  function wireBoard() {
    var board = document.getElementById('cm-ideaBoard');
    if (!board) return;
    board.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = load();

      if (action === 'delete') {
        list = list.filter(function (i) { return i.id !== id; });
        save(list);
        COS.activity.log({ agent: 'Pixel', dept: 'commerce', msg: 'Idea removed from board.', source: 'user' });
        render();
      } else if (action === 'edit') {
        var item = list.find(function (i) { return i.id === id; });
        if (!item) return;
        _editingId = id;
        setValue('cm-newIdea',    item.idea);
        setValue('cm-newPlatform',item.platform);
        setValue('cm-newTrend',   item.trendSource);
        setValue('cm-newStatus',  item.status);
        setValue('cm-newNotes',   item.notes);
        var btn2 = document.getElementById('cm-submitIdea');
        if (btn2) btn2.textContent = '✓ UPDATE IDEA';
        document.getElementById('cm-formPanel').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function wireForm() {
    var btn = document.getElementById('cm-submitIdea');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var idea = (document.getElementById('cm-newIdea').value || '').trim();
      if (!idea) { document.getElementById('cm-newIdea').focus(); return; }

      var item = {
        id:          _editingId || 'ci' + Date.now(),
        idea:        idea,
        platform:    document.getElementById('cm-newPlatform').value,
        trendSource: (document.getElementById('cm-newTrend').value || '').trim(),
        status:      document.getElementById('cm-newStatus').value,
        notes:       (document.getElementById('cm-newNotes').value || '').trim(),
        ts:          Date.now(),
      };

      var list = load();
      if (_editingId) {
        var idx = list.findIndex(function (i) { return i.id === _editingId; });
        if (idx > -1) list[idx] = item;
      } else {
        list.unshift(item);
      }
      save(list);
      COS.activity.log({ agent: 'Pixel', dept: 'commerce', msg: (_editingId ? 'Idea updated: ' : 'Idea added to board: ') + idea, source: 'user' });
      clearForm();
      render();
    });

    var cancelBtn = document.getElementById('cm-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', clearForm);
  }

  function clearForm() {
    ['cm-newIdea','cm-newTrend','cm-newNotes'].forEach(function (id) { setValue(id, ''); });
    setValue('cm-newPlatform', 'Etsy');
    setValue('cm-newStatus',   'idea');
    _editingId = null;
    var btn = document.getElementById('cm-submitIdea');
    if (btn) btn.textContent = '+ ADD IDEA';
  }

  function setValue(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    wireFilters();
    wireBoard();
    wireForm();
  });

})();
