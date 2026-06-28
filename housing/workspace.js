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

/* ================================================================
   NOVA PROPERTY SEARCH — Burlington County, NJ Simulated Results
================================================================ */
(function () {
  'use strict';

  var SAVED_KEY   = 'hs.search.saved';
  var HIDDEN_KEY  = 'hs.search.hidden';

  var PROPERTIES = [
    { id:'p1',  addr:'412 Levitt Pkwy',     city:'Willingboro',  rent:1350, beds:3, baths:1.5, type:'house',     pets:true,  voucher:true,  desc:'Spacious 3BR in Rancocas Woods area. Large yard, central AC. Pets welcome.' },
    { id:'p2',  addr:'88 Garfield Dr',      city:'Willingboro',  rent:1200, beds:2, baths:1,   type:'house',     pets:false, voucher:true,  desc:'Well-maintained 2BR. Updated kitchen. Close to schools and bus routes.' },
    { id:'p3',  addr:'223 Birch Ave',       city:'Willingboro',  rent:1450, beds:3, baths:2,   type:'house',     pets:true,  voucher:true,  desc:'3BR corner lot. Renovated bathrooms. Quiet neighborhood.' },
    { id:'p4',  addr:'1001 Lincoln Dr',     city:'Mount Laurel', rent:1750, beds:2, baths:2,   type:'condo',     pets:false, voucher:false, desc:'Modern condo in gated community. Gym, pool included. 20 min to Philly.' },
    { id:'p5',  addr:'55 Heritage Blvd',    city:'Mount Laurel', rent:2050, beds:3, baths:2,   type:'townhouse', pets:true,  voucher:false, desc:'End-unit townhouse. Attached garage. Top-rated school district.' },
    { id:'p6',  addr:'734 E Main St',       city:'Marlton',      rent:1600, beds:2, baths:1,   type:'apartment', pets:false, voucher:true,  desc:'Updated apartment, first floor. Parking included. Near shops.' },
    { id:'p7',  addr:'18 Oak Valley Rd',    city:'Marlton',      rent:1900, beds:3, baths:2,   type:'house',     pets:true,  voucher:true,  desc:'Ranch-style 3BR. New flooring. Fenced backyard, ideal for pets.' },
    { id:'p8',  addr:'290 Southampton Rd',  city:'Southampton',  rent:1400, beds:3, baths:1.5, type:'house',     pets:true,  voucher:true,  desc:'Rural setting. Large lot. 2-car driveway. Quiet community.' },
    { id:'p9',  addr:'47 Creek View Ln',    city:'Burlington',   rent:1250, beds:2, baths:1,   type:'apartment', pets:false, voucher:true,  desc:'Ground-floor apartment. Walk to Delaware River path. Utilities included.' },
    { id:'p10', addr:'612 Lumberton Rd',    city:'Lumberton',    rent:1500, beds:3, baths:2,   type:'house',     pets:true,  voucher:false, desc:'Spacious split-level. Finished basement. 2 miles to Route 38.' },
    { id:'p11', addr:'101 Township Line Rd',city:'Mount Laurel', rent:1850, beds:2, baths:2,   type:'condo',     pets:true,  voucher:true,  desc:'Pet-friendly condo. Accepts Section 8. Walk-in closets, balcony.' },
    { id:'p12', addr:'320 John F Kennedy Way',city:'Willingboro',rent:1100, beds:2, baths:1,   type:'house',     pets:false, voucher:true,  desc:'Budget-friendly 2BR. Corner property. Quick access to Route 130.' },
    { id:'p13', addr:'5 Plantation Dr',     city:'Marlton',      rent:2100, beds:4, baths:2.5, type:'house',     pets:true,  voucher:false, desc:'4BR colonial. Updated kitchen. Near Evesham Township schools.' },
    { id:'p14', addr:'88 Larchmont Dr',     city:'Southampton',  rent:1650, beds:3, baths:2,   type:'townhouse', pets:false, voucher:true,  desc:'New construction townhouse. Energy-efficient. Vouchers accepted.' },
    { id:'p15', addr:'202 Church St',       city:'Burlington',   rent:1300, beds:2, baths:1,   type:'house',     pets:true,  voucher:true,  desc:'Historic neighborhood 2BR. Hardwood floors. 5 min to train station.' },
  ];

  function getSaved()  { return COS.state.get(SAVED_KEY)  || []; }
  function getHidden() { return COS.state.get(HIDDEN_KEY) || []; }
  function toggleSave(id) {
    var s = getSaved();
    var i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else s.push(id);
    COS.state.set(SAVED_KEY, s);
  }
  function hideProperty(id) {
    var h = getHidden(); h.push(id); COS.state.set(HIDDEN_KEY, h);
  }

  function filterProperties(filters) {
    var hidden = getHidden();
    return PROPERTIES.filter(function (p) {
      if (hidden.indexOf(p.id) >= 0) return false;
      if (filters.city !== 'all' && p.city !== filters.city) return false;
      if (p.rent > filters.maxRent) return false;
      if (p.beds < filters.minBeds) return false;
      if (filters.type !== 'all' && p.type !== filters.type) return false;
      if (filters.voucher && !p.voucher) return false;
      if (filters.pets && !p.pets) return false;
      return true;
    });
  }

  function renderProperties(props) {
    var el     = document.getElementById('sp-results');
    var statEl = document.getElementById('sp-status');
    if (!el) return;
    var saved  = getSaved();
    if (statEl) statEl.textContent = props.length + ' properties found in Burlington County, NJ';
    if (!props.length) {
      el.innerHTML = '<div style="font-size:9px;color:rgba(200,160,255,.3);padding:16px;font-style:italic">No properties match your filters. Try adjusting the criteria.</div>';
      return;
    }
    el.innerHTML = props.map(function (p) {
      var isSaved = saved.indexOf(p.id) >= 0;
      var typeIcon = { house:'🏡', townhouse:'🏘', condo:'🏢', apartment:'🏠' }[p.type] || '🏠';
      return '<div class="sp-propCard" id="sp-card-' + p.id + '">' +
        '<div class="sp-propHeader">' +
          '<div class="sp-propAddr">' + typeIcon + ' ' + p.addr + '</div>' +
          '<div class="sp-propCity">' + p.city + ', NJ</div>' +
        '</div>' +
        '<div class="sp-propRent">$' + p.rent.toLocaleString() + '<span>/mo</span></div>' +
        '<div class="sp-propMeta">' +
          '<span>' + p.beds + ' BD</span>' +
          '<span>' + p.baths + ' BA</span>' +
          '<span>' + p.type.charAt(0).toUpperCase() + p.type.slice(1) + '</span>' +
          (p.pets    ? '<span class="sp-badge sp-pet">🐾 Pets</span>'     : '') +
          (p.voucher ? '<span class="sp-badge sp-voucher">🏷 Voucher</span>' : '') +
        '</div>' +
        '<div class="sp-propDesc">' + p.desc + '</div>' +
        '<div class="sp-propBtns">' +
          '<button class="sp-btnSave ' + (isSaved ? 'sp-saved' : '') + '" data-id="' + p.id + '">' + (isSaved ? '★ SAVED' : '☆ SAVE') + '</button>' +
          '<button class="sp-btnHide" data-id="' + p.id + '">✕ HIDE</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Wire buttons
    el.querySelectorAll('.sp-btnSave').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleSave(this.getAttribute('data-id'));
        runSearch();
      }.bind(btn));
    });
    el.querySelectorAll('.sp-btnHide').forEach(function (btn) {
      btn.addEventListener('click', function () {
        hideProperty(this.getAttribute('data-id'));
        runSearch();
      }.bind(btn));
    });
  }

  function runSearch() {
    var filters = {
      city:     (document.getElementById('sp-city')    || {}).value || 'all',
      maxRent:  parseFloat((document.getElementById('sp-maxRent') || {}).value) || 9999,
      minBeds:  parseInt((document.getElementById('sp-beds')      || {}).value, 10) || 1,
      type:     (document.getElementById('sp-type')    || {}).value || 'all',
      pets:     (document.getElementById('sp-pets')    || {}).checked || false,
      voucher:  (document.getElementById('sp-voucher') || {}).checked || false,
    };
    var results = filterProperties(filters);
    renderProperties(results);
    COS.activity.log({ agent: 'Nova', dept: 'housing', msg: 'Property search: ' + results.length + ' results (' + filters.city + ', max $' + filters.maxRent + ')', source: 'search' });
    if (typeof OE !== 'undefined') {
      OE.generate({ type: 'search_listings', title: 'Property Search Results' }, 'nova', 'housing');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('sp-searchBtn');
    if (btn) btn.addEventListener('click', runSearch);
    // Auto-run initial search
    runSearch();
  });

})();
