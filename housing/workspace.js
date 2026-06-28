/* CyberCookieOS — Housing Workspace
   Saved search criteria + Listing tracker with add/edit/delete */

(function () {
  'use strict';

  var LISTINGS_KEY = 'ws.housing.listings';
  var SEARCH_KEY   = 'ws.housing.search';

  var DEFAULT_LISTINGS = [
    { id: 'l1', name: 'Mount Laurel Colonial 3BR', rent: 2050, location: 'Mount Laurel, NJ',    type: 'house',     link: '', pets: true,  voucher: true,  family: true,  status: 'interested', notes: '3BR colonial, attached garage, near Route 38' },
    { id: 'l2', name: 'Willingboro Townhouse 2BR', rent: 1850, location: 'Willingboro, NJ',      type: 'townhouse', link: '', pets: true,  voucher: true,  family: true,  status: 'applied',    notes: 'Applied online. Awaiting callback.' },
    { id: 'l3', name: 'Marlton Oaks 2BR House',   rent: 1950, location: 'Marlton, NJ',           type: 'house',     link: '', pets: false, voucher: true,  family: true,  status: 'interested', notes: 'Nice neighborhood, near good schools' },
    { id: 'l4', name: 'Southampton Ridge 2BR',     rent: 1750, location: 'Southampton, NJ',       type: 'townhouse', link: '', pets: true,  voucher: true,  family: true,  status: 'interested', notes: 'Community pool, quiet area' },
    { id: 'l5', name: 'Mt Laurel Crossing Condo',  rent: 2000, location: 'Mount Laurel, NJ',     type: 'condo',     link: '', pets: false, voucher: false, family: true,  status: 'interested', notes: 'No pet policy, no voucher — check landlord' },
    { id: 'l6', name: 'Willingboro Park Condo',    rent: 1700, location: 'Willingboro, NJ',      type: 'condo',     link: '', pets: true,  voucher: true,  family: true,  status: 'interested', notes: 'Small HOA fee, good location' },
    { id: 'l7', name: 'Southampton Gardens House', rent: 1800, location: 'Southampton, NJ',       type: 'house',     link: '', pets: true,  voucher: true,  family: true,  status: 'interested', notes: 'Backyard, close to bus stop' },
  ].map(function (l) { return Object.assign({ ts: Date.now() - Math.floor(Math.random() * 86400000) }, l); });

  var DEFAULT_SEARCH = {
    neighborhoods: 'Willingboro NJ\nMount Laurel NJ\nMarlton NJ\nSouthampton NJ',
    maxRent:  2100,
    bedrooms: 2,
    types:    'house, townhouse, condo',
    pets:     true,
    voucher:  true,
    family:   true,
  };

  var _editingId = null;

  function loadListings()   { return COS.state.get(LISTINGS_KEY) || DEFAULT_LISTINGS.map(function (l) { return Object.assign({}, l); }); }
  function saveListings(l)  { COS.state.set(LISTINGS_KEY, l); }
  function loadSearch()     { return COS.state.get(SEARCH_KEY)   || Object.assign({}, DEFAULT_SEARCH); }
  function saveSearch(s)    { COS.state.set(SEARCH_KEY, s); }

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ── SEARCH CRITERIA ──────────────────────────────────────────────

  function renderSearch() {
    var s = loadSearch();
    var nb = document.getElementById('hs-searchNeighborhoods'); if (nb) nb.value = s.neighborhoods || '';
    var mr = document.getElementById('hs-searchMaxRent');       if (mr) mr.value = s.maxRent || '';
    var bd = document.getElementById('hs-searchBedrooms');      if (bd) bd.value = s.bedrooms || '';
    var tp = document.getElementById('hs-searchTypes');         if (tp) tp.value = s.types || '';
    var pt = document.getElementById('hs-searchPets');          if (pt) pt.checked = !!s.pets;
    var vr = document.getElementById('hs-searchVoucher');       if (vr) vr.checked = !!s.voucher;
    var fm = document.getElementById('hs-searchFamily');        if (fm) fm.checked = !!s.family;
  }

  function wireSearch() {
    var saveBtn = document.getElementById('hs-saveSearch');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function () {
      var s = {
        neighborhoods: (document.getElementById('hs-searchNeighborhoods').value || '').trim(),
        maxRent:  parseInt(document.getElementById('hs-searchMaxRent').value, 10) || 0,
        bedrooms: parseInt(document.getElementById('hs-searchBedrooms').value, 10) || 0,
        types:    (document.getElementById('hs-searchTypes').value || '').trim(),
        pets:     document.getElementById('hs-searchPets').checked,
        voucher:  document.getElementById('hs-searchVoucher').checked,
        family:   document.getElementById('hs-searchFamily').checked,
      };
      saveSearch(s);
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Search criteria saved — max rent $' + s.maxRent + ', ' + s.bedrooms + 'BR', source: 'user' });
      showHsToast('Search criteria saved!');
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

      var petPill  = l.pets    ? '<span class="ws-badge ws-badge-new">🐾 PETS OK</span>'     : '<span class="ws-badge">NO PETS</span>';
      var vouPill  = l.voucher ? '<span class="ws-badge ws-badge-done">🏷 VOUCHER OK</span>'  : '<span class="ws-badge ws-badge-dropped">NO VOUCHER</span>';
      var famPill  = l.family  ? '<span class="ws-badge ws-badge-new">👨‍👩‍👧 FAMILY OK</span>' : '';
      var typePill = l.type    ? '<span class="ws-badge">' + l.type.toUpperCase() + '</span>' : '';
      var linkHtml = l.link    ? '<a href="' + esc(l.link) + '" target="_blank" rel="noopener" style="font-size:8px;color:rgba(156,246,255,.5);text-decoration:none">🔗 VIEW</a>' : '';

      card.innerHTML =
        '<div class="ws-listingHeader">' +
          '<span class="ws-listingName">' + esc(l.name) + '</span>' +
          '<span class="ws-listingRent">$' + (l.rent || 0).toLocaleString() + '/mo</span>' +
        '</div>' +
        '<div class="ws-listingMeta">' +
          '<span>📍 ' + esc(l.location) + '</span>' +
          typePill + petPill + vouPill + famPill +
          '<span class="ws-badge ws-badge-' + l.status + '">' + l.status.toUpperCase() + '</span>' +
          linkHtml +
        '</div>' +
        (l.notes ? '<div style="font-size:8px;color:rgba(200,160,255,.35);font-style:italic;margin:4px 0">' + esc(l.notes) + '</div>' : '') +
        '<div class="ws-listingActions">' +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost" data-action="edit"   data-id="' + l.id + '">EDIT</button>' +
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
    setValue('hs-newType',     item.type     || 'house');
    setValue('hs-newLink',     item.link     || '');
    setValue('hs-newStatus',   item.status   || 'interested');
    setValue('hs-newNotes',    item.notes    || '');
    setChecked('hs-newPets',    !!item.pets);
    setChecked('hs-newVoucher', !!item.voucher);
    setChecked('hs-newFamily',  !!item.family);

    var addBtn = document.getElementById('hs-submitListing');
    if (addBtn) addBtn.textContent = '✓ UPDATE LISTING';
  }

  function clearForm() {
    ['hs-newName','hs-newRent','hs-newLocation','hs-newLink','hs-newNotes'].forEach(function (id) { setValue(id, ''); });
    setValue('hs-newType',   'house');
    setValue('hs-newStatus', 'interested');
    setChecked('hs-newPets',    false);
    setChecked('hs-newVoucher', true);
    setChecked('hs-newFamily',  true);
    _editingId = null;
    var addBtn = document.getElementById('hs-submitListing');
    if (addBtn) addBtn.textContent = '+ ADD LISTING';
  }

  function wireAddForm() {
    var btn = document.getElementById('hs-submitListing');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var name = (document.getElementById('hs-newName').value || '').trim();
      if (!name) {
        var el = document.getElementById('hs-newName');
        el.focus();
        el.classList.add('ws-input-error');
        setTimeout(function () { el.classList.remove('ws-input-error'); }, 1000);
        return;
      }

      var item = {
        id:      _editingId || 'l' + Date.now(),
        name:    name,
        rent:    parseInt(document.getElementById('hs-newRent').value, 10) || 0,
        location:(document.getElementById('hs-newLocation').value || '').trim(),
        type:    document.getElementById('hs-newType').value || 'house',
        link:    (document.getElementById('hs-newLink').value || '').trim(),
        pets:    document.getElementById('hs-newPets').checked,
        voucher: document.getElementById('hs-newVoucher').checked,
        family:  document.getElementById('hs-newFamily').checked,
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
      COS.activity.log({ agent: 'Nova', dept: 'housing', msg: (_editingId ? 'Listing updated: ' : 'Listing added: ') + name + ' ($' + item.rent + '/mo)', source: 'user' });
      if (!_editingId) COS.notifications.add('New listing tracked: ' + name, 'normal');
      clearForm();
      renderListings();
      showHsToast(_editingId ? 'Listing updated!' : 'Listing added!');
    });

    var cancelBtn = document.getElementById('hs-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { clearForm(); showHsToast('Edit cancelled.'); });
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
    COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Housing workspace loaded — tracking ' + loadListings().length + ' listings.', source: 'system' });
  });

})();
