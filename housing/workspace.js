/* CyberCookieOS — Housing Workspace
   Saved search criteria + Listing tracker with add/edit/delete */

(function () {
  'use strict';

  var LISTINGS_KEY = 'ws.housing.listings';
  var SEARCH_KEY   = 'ws.housing.search';

  var DEFAULT_LISTINGS = [
    { id: 'l1', name: '2BR on Maple Ave',     rent: 1400, location: 'Burlington City, NJ',    link: '',                     pets: true,  voucher: true,  status: 'interested', notes: 'Close to bus route 409', ts: Date.now() - 86400000 },
    { id: 'l2', name: 'Cornerstone Apts 1BR', rent: 1200, location: 'Cinnaminson, NJ',        link: '',                     pets: false, voucher: true,  status: 'applied',    notes: 'Applied online, waiting for callback', ts: Date.now() - 43200000 },
    { id: 'l3', name: 'Riverside Townhome',   rent: 1650, location: 'Mount Holly, NJ',        link: '',                     pets: true,  voucher: false, status: 'interested', notes: 'Over budget but nice area', ts: Date.now() - 21600000 },
  ];

  var DEFAULT_SEARCH = { location: 'Burlington County, NJ', maxRent: 1500, pets: true, voucher: true };

  var _editingId = null;

  function loadListings()   { return COS.state.get(LISTINGS_KEY) || DEFAULT_LISTINGS.map(function (l) { return Object.assign({}, l); }); }
  function saveListings(l)  { COS.state.set(LISTINGS_KEY, l); }
  function loadSearch()     { return COS.state.get(SEARCH_KEY)   || Object.assign({}, DEFAULT_SEARCH); }
  function saveSearch(s)    { COS.state.set(SEARCH_KEY, s); }

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var STATUS_OPTIONS = ['interested', 'applied', 'rejected', 'tour', 'moved-in'];

  // ── SEARCH CRITERIA ──────────────────────────────────────────────

  function renderSearch() {
    var s = loadSearch();
    var el = document.getElementById('hs-searchLocation'); if (el) el.value = s.location || '';
    var mr = document.getElementById('hs-searchMaxRent');  if (mr) mr.value = s.maxRent || '';
    var pt = document.getElementById('hs-searchPets');     if (pt) pt.checked = !!s.pets;
    var vr = document.getElementById('hs-searchVoucher');  if (vr) vr.checked = !!s.voucher;
  }

  function wireSearch() {
    var saveBtn = document.getElementById('hs-saveSearch');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function () {
      var s = {
        location: (document.getElementById('hs-searchLocation').value || '').trim(),
        maxRent:  parseInt(document.getElementById('hs-searchMaxRent').value, 10) || 0,
        pets:     document.getElementById('hs-searchPets').checked,
        voucher:  document.getElementById('hs-searchVoucher').checked,
      };
      saveSearch(s);
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Search criteria updated: ' + (s.location || 'all areas'), source: 'user' });
      showHsToast('Search criteria saved!');
      renderSearch();
    });
  }

  // ── LISTINGS ─────────────────────────────────────────────────────

  function renderListings() {
    var list      = loadListings();
    var container = document.getElementById('hs-listingContainer');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="ws-empty">No listings yet. Add one below.</div>';
      return;
    }

    container.innerHTML = '';
    list.forEach(function (l) {
      var card = document.createElement('div');
      card.className = 'ws-listingCard';
      var petPill  = l.pets    ? '<span class="ws-badge ws-badge-new">🐾 PETS OK</span>'   : '<span class="ws-badge">NO PETS</span>';
      var vouPill  = l.voucher ? '<span class="ws-badge ws-badge-done">🏷 VOUCHER OK</span>' : '<span class="ws-badge ws-badge-dropped">NO VOUCHER</span>';
      var linkHtml = l.link    ? '<a href="' + esc(l.link) + '" target="_blank" rel="noopener" style="font-size:8px;color:rgba(156,246,255,.5);text-decoration:none">🔗 VIEW LISTING</a>' : '';

      card.innerHTML =
        '<div class="ws-listingHeader">' +
          '<span class="ws-listingName">' + esc(l.name) + '</span>' +
          '<span class="ws-listingRent">$' + (l.rent || 0).toLocaleString() + '/mo</span>' +
        '</div>' +
        '<div class="ws-listingMeta">' +
          '<span>📍 ' + esc(l.location) + '</span>' +
          petPill + vouPill +
          '<span class="ws-badge ws-badge-' + l.status + '">' + l.status.toUpperCase() + '</span>' +
          linkHtml +
        '</div>' +
        (l.notes ? '<div style="font-size:8px;color:rgba(200,160,255,.35);font-style:italic;margin:4px 0">' + esc(l.notes) + '</div>' : '') +
        '<div class="ws-listingActions">' +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost" data-action="edit" data-id="' + l.id + '">EDIT</button>' +
          '<button class="ws-btn ws-btn-sm ws-btn-danger" data-action="delete" data-id="' + l.id + '">DELETE</button>' +
        '</div>';
      container.appendChild(card);
    });
  }

  function wireListingActions() {
    var container = document.getElementById('hs-listingContainer');
    if (!container) return;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = loadListings();

      if (action === 'delete') {
        list = list.filter(function (l) { return l.id !== id; });
        saveListings(list);
        COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Listing removed from tracker.', source: 'user' });
        renderListings();
      } else if (action === 'edit') {
        var item = list.find(function (l) { return l.id === id; });
        if (!item) return;
        _editingId = id;
        populateForm(item);
        document.getElementById('hs-addPanel').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function populateForm(item) {
    setValue('hs-newName',     item.name     || '');
    setValue('hs-newRent',     item.rent     || '');
    setValue('hs-newLocation', item.location || '');
    setValue('hs-newLink',     item.link     || '');
    setValue('hs-newStatus',   item.status   || 'interested');
    setValue('hs-newNotes',    item.notes    || '');
    setChecked('hs-newPets',    !!item.pets);
    setChecked('hs-newVoucher', !!item.voucher);

    var addBtn = document.getElementById('hs-submitListing');
    if (addBtn) addBtn.textContent = '✓ UPDATE LISTING';
  }

  function clearForm() {
    ['hs-newName','hs-newRent','hs-newLocation','hs-newLink','hs-newNotes'].forEach(function (id) { setValue(id, ''); });
    setValue('hs-newStatus', 'interested');
    setChecked('hs-newPets',    false);
    setChecked('hs-newVoucher', true);
    _editingId = null;
    var addBtn = document.getElementById('hs-submitListing');
    if (addBtn) addBtn.textContent = '+ ADD LISTING';
  }

  function wireAddForm() {
    var btn = document.getElementById('hs-submitListing');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var name = (document.getElementById('hs-newName').value || '').trim();
      if (!name) { document.getElementById('hs-newName').focus(); return; }

      var item = {
        id:      _editingId || 'l' + Date.now(),
        name:    name,
        rent:    parseInt(document.getElementById('hs-newRent').value, 10) || 0,
        location:(document.getElementById('hs-newLocation').value || '').trim(),
        link:    (document.getElementById('hs-newLink').value || '').trim(),
        pets:    document.getElementById('hs-newPets').checked,
        voucher: document.getElementById('hs-newVoucher').checked,
        status:  document.getElementById('hs-newStatus').value || 'interested',
        notes:   (document.getElementById('hs-newNotes').value || '').trim(),
        ts:      Date.now(),
      };

      var list = loadListings();
      if (_editingId) {
        var idx = list.findIndex(function (l) { return l.id === _editingId; });
        if (idx > -1) list[idx] = item;
      } else {
        list.unshift(item);
      }
      saveListings(list);
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: (_editingId ? 'Listing updated: ' : 'Listing added: ') + name, source: 'user' });
      if (!_editingId) COS.notifications.add('New listing tracked: ' + name, 'normal');
      clearForm();
      renderListings();
    });

    var cancelBtn = document.getElementById('hs-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', clearForm);
  }

  // ── HELPERS ──────────────────────────────────────────────────────

  function setValue(id, val)   { var el = document.getElementById(id); if (el) el.value = val; }
  function setChecked(id, val) { var el = document.getElementById(id); if (el) el.checked = val; }
  function showHsToast(msg) {
    var t = document.getElementById('hs-toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(function () { t.style.opacity = '0'; }, 2400);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderSearch();
    wireSearch();
    renderListings();
    wireListingActions();
    wireAddForm();
  });

})();
