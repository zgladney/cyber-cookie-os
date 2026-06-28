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
   NOVA PROPERTY SEARCH — Apartment & Housing Hunter
   Burlington County, NJ — Simulated Data / Scraper-Ready
================================================================ */
(function () {
  'use strict';

  var SAVED_KEY        = 'hs.search.saved';
  var HIDDEN_KEY       = 'hs.search.hidden';
  var STATUS_KEY       = 'hs.search.statuses';
  var NOTES_KEY        = 'hs.search.notes';
  var currentDisplayed = [];   // tracks what's currently rendered (real or simulated)

  // Landlord inquiry message template
  var CONTACT_MSG =
    'Hello,\n\n' +
    'I am interested in this property and would love to schedule a viewing. ' +
    'I am searching for a 2-bedroom, pet-friendly home and I do have a housing voucher. ' +
    'Could you please let me know if the unit is still available and the best way to apply?\n\n' +
    'Thank you for your time — I look forward to hearing from you!';

  // ── PROPERTY DATABASE ───────────────────────────────────────
  // Replace PROPERTIES with live data from fetchHousingListings() when scraper is connected.
  var PROPERTIES = [
    { id:'p1',  name:'Rancocas Woods 3BR w/ Yard',       addr:'412 Levitt Pkwy',        city:'Willingboro',  rent:1350, beds:3, baths:1.5, type:'house',     pets:true,  voucher:true,  family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p1',  desc:'Spacious 3BR in Rancocas Woods area. Large yard, central AC. Pets welcome.' },
    { id:'p2',  name:'Updated 2BR Near Schools',          addr:'88 Garfield Dr',         city:'Willingboro',  rent:1200, beds:2, baths:1,   type:'house',     pets:false, voucher:true,  family:true,  source:'Craigslist',             link:'https://example.com/listing/p2',  desc:'Well-maintained 2BR. Updated kitchen. Close to schools and bus routes.' },
    { id:'p3',  name:'Renovated Corner Lot 3BR',          addr:'223 Birch Ave',          city:'Willingboro',  rent:1450, beds:3, baths:2,   type:'house',     pets:true,  voucher:true,  family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p3',  desc:'3BR corner lot. Renovated bathrooms. Quiet neighborhood.' },
    { id:'p4',  name:'Modern Condo w/ Pool & Gym',        addr:'1001 Lincoln Dr',        city:'Mount Laurel', rent:1750, beds:2, baths:2,   type:'condo',     pets:false, voucher:false, family:true,  source:'Craigslist',             link:'https://example.com/listing/p4',  desc:'Modern condo in gated community. Gym, pool included. 20 min to Philly.' },
    { id:'p5',  name:'End-Unit Townhouse w/ Garage',      addr:'55 Heritage Blvd',       city:'Mount Laurel', rent:2050, beds:3, baths:2,   type:'townhouse', pets:true,  voucher:false, family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p5',  desc:'End-unit townhouse. Attached garage. Top-rated school district.' },
    { id:'p6',  name:'1st Floor Apt w/ Parking',          addr:'734 E Main St',          city:'Marlton',      rent:1600, beds:2, baths:1,   type:'apartment', pets:false, voucher:true,  family:true,  source:'Craigslist',             link:'https://example.com/listing/p6',  desc:'Updated apartment, first floor. Parking included. Near shops.' },
    { id:'p7',  name:'Pet-Friendly Ranch 3BR',            addr:'18 Oak Valley Rd',       city:'Marlton',      rent:1900, beds:3, baths:2,   type:'house',     pets:true,  voucher:true,  family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p7',  desc:'Ranch-style 3BR. New flooring. Fenced backyard, ideal for pets.' },
    { id:'p8',  name:'Quiet Rural 3BR Large Lot',         addr:'290 Southampton Rd',     city:'Southampton',  rent:1400, beds:3, baths:1.5, type:'house',     pets:true,  voucher:true,  family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p8',  desc:'Rural setting. Large lot. 2-car driveway. Quiet community.' },
    { id:'p9',  name:'Ground Floor w/ Utilities Included',addr:'47 Creek View Ln',       city:'Burlington',   rent:1250, beds:2, baths:1,   type:'apartment', pets:false, voucher:true,  family:false, source:'Craigslist',             link:'https://example.com/listing/p9',  desc:'Ground-floor apartment. Walk to Delaware River path. Utilities included.' },
    { id:'p10', name:'Split-Level w/ Finished Basement',  addr:'612 Lumberton Rd',       city:'Lumberton',    rent:1500, beds:3, baths:2,   type:'house',     pets:true,  voucher:false, family:true,  source:'Craigslist',             link:'https://example.com/listing/p10', desc:'Spacious split-level. Finished basement. 2 miles to Route 38.' },
    { id:'p11', name:'Pet-Friendly Condo w/ Balcony',     addr:'101 Township Line Rd',   city:'Mount Laurel', rent:1850, beds:2, baths:2,   type:'condo',     pets:true,  voucher:true,  family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p11', desc:'Pet-friendly condo. Accepts Section 8. Walk-in closets, balcony.' },
    { id:'p12', name:'Budget 2BR Corner House',           addr:'320 John F Kennedy Way', city:'Willingboro',  rent:1100, beds:2, baths:1,   type:'house',     pets:false, voucher:true,  family:true,  source:'Craigslist',             link:'https://example.com/listing/p12', desc:'Budget-friendly 2BR. Corner property. Quick access to Route 130.' },
    { id:'p13', name:'4BR Colonial Near Schools',         addr:'5 Plantation Dr',        city:'Marlton',      rent:2100, beds:4, baths:2.5, type:'house',     pets:true,  voucher:false, family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p13', desc:'4BR colonial. Updated kitchen. Near Evesham Township schools.' },
    { id:'p14', name:'New Construction Townhouse',        addr:'88 Larchmont Dr',        city:'Southampton',  rent:1650, beds:3, baths:2,   type:'townhouse', pets:false, voucher:true,  family:true,  source:'AffordableHousing.com', link:'https://example.com/listing/p14', desc:'New construction townhouse. Energy-efficient. Vouchers accepted.' },
    { id:'p15', name:'Historic Neighborhood 2BR',         addr:'202 Church St',          city:'Burlington',   rent:1300, beds:2, baths:1,   type:'house',     pets:true,  voucher:true,  family:false, source:'Craigslist',             link:'https://example.com/listing/p15', desc:'Historic neighborhood 2BR. Hardwood floors. 5 min to train station.' },
  ];

  // ── STATE HELPERS ───────────────────────────────────────────

  function getSaved()    { return COS.state.get(SAVED_KEY)  || []; }
  function getHidden()   { return COS.state.get(HIDDEN_KEY) || []; }
  function getStatuses() { return COS.state.get(STATUS_KEY) || {}; }
  function getNotes()    { return COS.state.get(NOTES_KEY)  || {}; }

  function toggleSave(id) {
    var s = getSaved();
    var i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else s.push(id);
    COS.state.set(SAVED_KEY, s);
  }
  function hideProp(id) {
    var h = getHidden();
    if (h.indexOf(id) < 0) h.push(id);
    COS.state.set(HIDDEN_KEY, h);
  }
  function clearHidden() { COS.state.set(HIDDEN_KEY, []); }
  function setStatus(id, status) {
    var st = getStatuses(); st[id] = status; COS.state.set(STATUS_KEY, st);
  }
  function saveNote(id, text) {
    var n = getNotes(); n[id] = text; COS.state.set(NOTES_KEY, n);
  }

  // ── SCRAPER FRAMEWORK STUBS ─────────────────────────────────
  // Connect a real scraper by replacing the body of fetchHousingListings.
  // Expected sources: AffordableHousing.com city pages, Craigslist Philadelphia housing,
  // or any CSV/JSON export from agents/housing_scout_v2/housing_scout_browser.py

  function fetchHousingListings(filters) {
    // TODO: Replace with real async fetch, e.g.:
    //   return fetch('/api/housing?city=' + filters.city + '&maxRent=' + filters.maxRent)
    //     .then(function(r) { return r.json(); })
    //     .then(function(raw) { return raw.map(normalizeListing); });
    return PROPERTIES; // currently returns simulated data
  }

  function normalizeListing(raw) {
    // TODO: Normalize scraper output to standard shape:
    // { id, name, addr, city, rent, beds, baths, type, pets, voucher, family, source, link, desc }
    return raw;
  }

  function renderHousingResults(listings) {
    // Entry point for live scraper pipeline.
    // Currently called directly by runSearch() with filtered PROPERTIES.
    currentDisplayed = listings;
    renderProperties(listings);
  }

  function saveProperty(propertyId)              { toggleSave(propertyId); runSearch(); }
  function hideProperty(propertyId)              { hideProp(propertyId);   runSearch(); }
  function markPropertyStatus(propertyId, status){ setStatus(propertyId, status); runSearch(); }

  // ── ZEE'S CITIES ────────────────────────────────────────────

  var ZEE_CITIES = ['Willingboro', 'Mount Laurel', 'Marlton', 'Southampton'];

  // ── FILTER ──────────────────────────────────────────────────

  function filterProperties(filters, source) {
    var list    = source || PROPERTIES;
    var hidden  = getHidden();
    var keyword = (filters.keyword || '').toLowerCase().trim();
    return list.filter(function (p) {
      if (hidden.indexOf(p.id) >= 0) return false;
      if (filters.city === 'zee-cities') {
        if (ZEE_CITIES.indexOf(p.city) < 0) return false;
      } else if (filters.city !== 'all') {
        if (p.city !== filters.city) return false;
      }
      if (p.rent     > filters.maxRent)  return false;
      if (p.beds     < filters.minBeds)  return false;
      if (p.baths    < filters.minBaths) return false;
      if (filters.type !== 'all' && p.type !== filters.type) return false;
      if (filters.voucher && !p.voucher) return false;
      if (filters.pets    && !p.pets)    return false;
      if (filters.family  && !p.family)  return false;
      if (filters.hasLink && !p.link)    return false;
      if (keyword && !(
        (p.name || '').toLowerCase().indexOf(keyword) >= 0 ||
        (p.addr || '').toLowerCase().indexOf(keyword) >= 0 ||
        (p.city || '').toLowerCase().indexOf(keyword) >= 0 ||
        (p.desc || '').toLowerCase().indexOf(keyword) >= 0 ||
        (p.type || '').toLowerCase().indexOf(keyword) >= 0
      )) return false;
      return true;
    });
  }

  // ── CARD BUILD ──────────────────────────────────────────────

  function cardStatusInfo(p) {
    var saved    = getSaved();
    var statuses = getStatuses();
    var st = statuses[p.id];
    if (st === 'scheduled') return { cls: 'sp-status-scheduled', txt: '📅 SCHEDULED' };
    if (st === 'contacted') return { cls: 'sp-status-contacted', txt: '📞 CONTACTED' };
    if (saved.indexOf(p.id) >= 0) return { cls: 'sp-status-saved', txt: '★ SAVED' };
    return { cls: 'sp-status-new', txt: '● NEW' };
  }

  function buildCard(p, inSavedSection) {
    var saved   = getSaved();
    var notes   = getNotes();
    var isSaved = saved.indexOf(p.id) >= 0;
    var note    = notes[p.id] || '';
    var si      = cardStatusInfo(p);
    var typeIcon = { house:'🏡', townhouse:'🏘', condo:'🏢', apartment:'🏠' }[p.type] || '🏠';
    var typeLbl  = p.type.charAt(0).toUpperCase() + p.type.slice(1);

    return (
      '<div class="sp-propCard" id="sp-card-' + p.id + '" data-id="' + p.id + '">' +
        '<div class="sp-propHeader" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
          '<div style="min-width:0">' +
            '<div class="sp-propAddr">' + typeIcon + ' ' + (p.name || p.addr) + '</div>' +
            '<div style="font-size:7px;color:rgba(196,120,74,.4);margin-top:2px;letter-spacing:.3px">📍 ' + p.addr + ', ' + p.city + ' NJ</div>' +
          '</div>' +
          '<span class="sp-cardStatus ' + si.cls + '" style="flex-shrink:0">' + si.txt + '</span>' +
        '</div>' +
        '<div class="sp-propRent">$' + p.rent.toLocaleString() + '<span>/mo</span></div>' +
        '<div class="sp-propMeta">' +
          '<span>' + p.beds + ' BD</span>' +
          '<span>' + p.baths + ' BA</span>' +
          '<span>' + typeLbl + '</span>' +
          (p.pets    ? '<span class="sp-badge sp-pet">🐾 Pets OK</span>'      : '<span class="sp-badge" style="opacity:.25">No Pets</span>') +
          (p.voucher ? '<span class="sp-badge sp-voucher">🏷 Voucher</span>'  : '<span class="sp-badge" style="opacity:.25">No Voucher</span>') +
          (p.family  ? '<span class="sp-badge sp-family">👨‍👩‍👧 Family</span>' : '') +
        '</div>' +
        '<div class="sp-propDesc">' + (p.desc || '') + '</div>' +
        '<div style="font-size:7px;color:rgba(196,120,74,.3);letter-spacing:.3px;margin-bottom:8px">Source: ' +
          (p.sourceUrl
            ? '<a href="' + p.sourceUrl + '" target="_blank" rel="noopener noreferrer" style="color:rgba(196,120,74,.45);text-decoration:none">' + (p.source || 'Unknown') + ' ↗</a>'
            : (p.source || 'Unknown')) +
        '</div>' +
        '<textarea class="sp-cardNotes" rows="2" placeholder="Notes..." data-id="' + p.id + '">' + (note ? note.replace(/</g,'&lt;') : '') + '</textarea>' +
        '<div class="sp-propBtns" style="flex-wrap:wrap;gap:5px;margin-top:2px">' +
          '<button class="sp-btnSave sp-btnSm ' + (isSaved ? 'sp-saved' : '') + '" data-action="save" data-id="' + p.id + '">' + (isSaved ? '★ SAVED' : '☆ SAVE') + '</button>' +
          (inSavedSection ? '' : '<button class="sp-btnSm sp-btnDanger" data-action="hide" data-id="' + p.id + '">✕ HIDE</button>') +
          '<button class="sp-btnSm sp-btnContact"  data-action="contact"  data-id="' + p.id + '">📞 CONTACTED</button>' +
          '<button class="sp-btnSm sp-btnSchedule" data-action="schedule" data-id="' + p.id + '">📅 SCHEDULED</button>' +
          '<button class="sp-btnSm sp-btnCopy"     data-action="copy"     data-id="' + p.id + '">📋 COPY MSG</button>' +
          (p.link
            ? '<a href="' + p.link + '" target="_blank" rel="noopener noreferrer" class="sp-btnSm sp-btnOpen">🔗 OPEN LISTING</a>'
            : '<span class="sp-btnSm" style="opacity:.28;cursor:not-allowed" title="No listing URL available">NO LINK</span>') +
        '</div>' +
      '</div>'
    );
  }

  // ── RENDER ──────────────────────────────────────────────────

  function renderProperties(props) {
    var el = document.getElementById('sp-results');
    if (!el) return;

    if (!props.length) {
      el.innerHTML = '<div style="font-size:9px;color:rgba(200,160,255,.3);padding:16px;font-style:italic;grid-column:1/-1">No properties match your filters. Try adjusting the criteria or loading Zee\'s profile.</div>';
    } else {
      el.innerHTML = props.map(function (p) { return buildCard(p, false); }).join('');
      wireCards(el);
    }

    updateSummary(props);
    updateHiddenBar();
    renderSavedSection();
  }

  function updateSummary(props) {
    var sumEl = document.getElementById('sp-summary');
    if (!sumEl) return;
    if (!props.length) { sumEl.innerHTML = ''; return; }

    var saved      = getSaved();
    var hidden     = getHidden();
    var rents      = props.map(function (p) { return p.rent; });
    var total      = rents.reduce(function (s, r) { return s + r; }, 0);
    var avgRent    = Math.round(total / rents.length);
    var minRent    = Math.min.apply(null, rents);
    var savedCount = saved.filter(function (id) {
      return props.some(function (p) { return p.id === id; });
    }).length;

    // unique cities without Set
    var citySeen = {};
    var cities   = [];
    props.forEach(function (p) { if (!citySeen[p.city]) { citySeen[p.city] = 1; cities.push(p.city); } });

    sumEl.innerHTML =
      '<span class="sp-summaryItem"><strong>' + props.length + '</strong> matches</span>' +
      '<span class="sp-summaryItem"><strong>' + savedCount + '</strong> saved</span>' +
      '<span class="sp-summaryItem"><strong>' + hidden.length + '</strong> hidden</span>' +
      '<span class="sp-summaryItem">Avg: <strong>$' + avgRent.toLocaleString() + '/mo</strong></span>' +
      '<span class="sp-summaryItem">Cheapest: <strong>$' + minRent.toLocaleString() + '/mo</strong></span>' +
      '<span class="sp-summaryItem">Cities: <strong>' + cities.join(', ') + '</strong></span>';
  }

  function updateHiddenBar() {
    var bar = document.getElementById('sp-hiddenBar');
    if (!bar) return;
    var hidden = getHidden();
    if (!hidden.length) { bar.innerHTML = ''; return; }
    bar.innerHTML =
      '<span>' + hidden.length + ' listing' + (hidden.length !== 1 ? 's' : '') + ' hidden</span>' +
      '<button class="sp-btnSm" id="sp-clearHidden" style="font-size:6px;padding:2px 9px;letter-spacing:.5px">Clear Hidden</button>';
    var cb = document.getElementById('sp-clearHidden');
    if (cb) cb.addEventListener('click', function () { clearHidden(); runSearch(); });
  }

  function renderSavedSection() {
    var sec = document.getElementById('sp-savedSection');
    if (!sec) return;
    var saved = getSaved();
    if (!saved.length) {
      sec.innerHTML =
        '<div class="sp-savedTitle">★ SAVED PROPERTIES</div>' +
        '<div style="font-size:8px;color:rgba(200,160,255,.22);font-style:italic;padding:10px 0">No saved properties yet. Click ☆ SAVE on any listing above.</div>';
      return;
    }
    var pool       = currentDisplayed.length ? currentDisplayed : PROPERTIES;
    var savedProps = pool.filter(function (p) { return saved.indexOf(p.id) >= 0; });
    sec.innerHTML =
      '<div class="sp-savedTitle">★ SAVED PROPERTIES (' + savedProps.length + ')</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">' +
      savedProps.map(function (p) { return buildCard(p, true); }).join('') +
      '</div>';
    wireCards(sec);
  }

  function wireCards(container) {
    container.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id     = this.getAttribute('data-id');
        var action = this.getAttribute('data-action');
        if (action === 'save')     { toggleSave(id);              runSearch(); }
        if (action === 'hide')     { hideProp(id);                runSearch(); }
        if (action === 'contact')  { setStatus(id, 'contacted');  runSearch(); }
        if (action === 'schedule') { setStatus(id, 'scheduled');  runSearch(); }
        if (action === 'copy')     { copyContactMsg(); }
      }.bind(el));
    });

    container.querySelectorAll('.sp-cardNotes').forEach(function (ta) {
      ta.addEventListener('blur', function () {
        saveNote(this.getAttribute('data-id'), this.value);
      }.bind(ta));
    });
  }

  function copyContactMsg() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(CONTACT_MSG).then(function () {
        showToast('Landlord message copied to clipboard!');
      }).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = CONTACT_MSG;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Message copied!'); } catch (e) { showToast('Copy failed — check browser permissions.'); }
    document.body.removeChild(ta);
  }

  function showToast(msg) {
    // Re-use the COS notification system if available
    if (COS && COS.notifications) { COS.notifications.add(msg, 'success'); return; }
    // Fallback: brief overlay
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:rgba(196,120,74,.15);border:1px solid rgba(196,120,74,.5);color:rgba(240,210,180,.9);font-size:10px;letter-spacing:1px;padding:8px 16px;border-radius:4px;pointer-events:none;transition:opacity .4s';
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; }, 2200);
    setTimeout(function () { document.body.removeChild(t); }, 2700);
  }

  // ── SEARCH ──────────────────────────────────────────────────

  function getFilters() {
    var g = function (id) { return document.getElementById(id) || {}; };
    return {
      city:     g('sp-city').value    || 'all',
      maxRent:  parseFloat(g('sp-maxRent').value) || 9999,
      minBeds:  parseInt(g('sp-beds').value, 10)  || 0,
      minBaths: parseFloat(g('sp-baths').value)   || 0,
      type:     g('sp-type').value    || 'all',
      pets:     !!g('sp-pets').checked,
      voucher:  !!g('sp-voucher').checked,
      family:   !!g('sp-family').checked,
      hasLink:  !!g('sp-hasLink').checked,
      keyword:  g('sp-keyword').value || '',
    };
  }

  function runSearch() {
    var filters = getFilters();
    // fetchHousingListings() is the scraper entry point.
    // When live data is available, replace PROPERTIES with its output:
    //   fetchHousingListings(filters).then(function(raw) { renderHousingResults(raw.map(normalizeListing)); });
    var raw     = fetchHousingListings(filters);
    var results = filterProperties(filters, raw);
    renderHousingResults(results);

    var cheapest = null;
    var avgRent  = 0;
    if (results.length) {
      results.forEach(function (p) { if (!cheapest || p.rent < cheapest.rent) cheapest = p; });
      avgRent = Math.round(results.reduce(function (s, p) { return s + p.rent; }, 0) / results.length);
    }

    COS.activity.log({
      agent: 'Nova', dept: 'housing',
      msg: 'Housing search: ' + results.length + ' match' + (results.length !== 1 ? 'es' : '') +
           ' — avg $' + avgRent + '/mo' + (cheapest ? ', cheapest: ' + cheapest.name + ' ($' + cheapest.rent + ')' : ''),
      source: 'search',
    });

    if (typeof OE !== 'undefined') {
      OE.generate({
        type:    'search_results',
        title:   'Housing Search Completed',
        summary: results.length + ' listings matched — avg $' + avgRent + '/mo, cheapest $' +
                 (cheapest ? cheapest.rent : 0) + '/mo (' + (cheapest ? cheapest.city : 'N/A') + ')',
      }, 'nova', 'housing');
    }
  }

  // ── ZEE'S PROFILE ───────────────────────────────────────────

  function loadZeeProfile() {
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.value = val; };
    var chk = function (id, val) { var el = document.getElementById(id); if (el) el.checked = val; };
    set('sp-city',    'zee-cities');
    set('sp-maxRent', '2100');
    set('sp-beds',    '2');
    set('sp-baths',   '0');
    set('sp-type',    'all');
    set('sp-keyword', '');
    chk('sp-pets',    true);
    chk('sp-voucher', true);
    chk('sp-family',  true);
    chk('sp-hasLink', false);
    showToast("Zee's search profile loaded!");
    runSearch();
  }

  // ── HOUSING SCOUT — frontend integration ────────────────────
  // Calls POST /api/housing/scout (served by server.py).
  // Falls back to simulated results if backend is not running.

  var SCOUT_STEPS = [
    'Initializing browser agent...',
    'Checking AffordableHousing.com — Willingboro...',
    'Checking AffordableHousing.com — Mount Laurel...',
    'Checking AffordableHousing.com — Marlton...',
    'Checking AffordableHousing.com — Southampton...',
    'Scanning Craigslist Philadelphia — Housing for Rent...',
    'Scanning Craigslist Philadelphia — Apts & Houses...',
    'Filtering by rent / pets / voucher...',
    'Extracting listing details...',
    'Normalizing listing cards...',
    'Almost done...',
  ];

  function setScoutMode(mode, badge, text, time) {
    var bar    = document.getElementById('sp-scoutBar');
    var modeEl = document.getElementById('sp-scoutMode');
    var msgEl  = document.getElementById('sp-scoutMsg');
    var timeEl = document.getElementById('sp-scoutTime');
    if (!bar) return;
    bar.style.display = '';
    bar.className = 'sp-scoutBar scout-' + (
      mode === 'real'    ? 'success' :
      mode === 'running' ? 'running' :
      mode === 'offline' ? 'offline' : 'fallback'
    );
    if (modeEl) {
      modeEl.textContent = badge || '';
      modeEl.className   = 'sp-scoutMode sp-mode-' + (
        mode === 'real'    ? 'real'    :
        mode === 'running' ? 'running' :
        mode === 'offline' ? 'offline' : 'sim'
      );
    }
    if (msgEl)  msgEl.textContent  = text || '';
    if (timeEl) timeEl.textContent = time || '';
  }

  function displayScoutResults(listings) {
    currentDisplayed = listings;
    var el = document.getElementById('sp-results');
    if (!el) return;
    if (!listings.length) {
      el.innerHTML = '<div style="font-size:9px;color:rgba(200,160,255,.3);padding:16px;font-style:italic;grid-column:1/-1">Scout returned 0 listings. Try again or widen your filters.</div>';
    } else {
      el.innerHTML = listings.map(function (p) { return buildCard(p, false); }).join('');
      wireCards(el);
    }
    updateSummary(listings);
    updateHiddenBar();
    renderSavedSection();
  }

  function runScout() {
    var btn = document.getElementById('sp-scoutBtn');
    if (!btn || btn.disabled) return;

    btn.textContent = '⟳ SCOUTING...';
    btn.disabled    = true;

    var stepIdx   = 0;
    var stepTimer = setInterval(function () {
      var msgEl = document.getElementById('sp-scoutMsg');
      if (msgEl) msgEl.textContent = SCOUT_STEPS[stepIdx % SCOUT_STEPS.length];
      stepIdx++;
    }, 2200);

    setScoutMode('running', '⟳ SCOUTING', SCOUT_STEPS[0], '');

    var filters = getFilters();
    var body = JSON.stringify({
      cities:   filters.city === 'zee-cities' ? ZEE_CITIES :
                filters.city === 'all'        ? [] : [filters.city],
      maxRent:  filters.maxRent,
      minBeds:  filters.minBeds,
      minBaths: filters.minBaths,
      types:    filters.type === 'all' ? [] : [filters.type],
      pets:     filters.pets,
      voucher:  filters.voucher,
      family:   filters.family,
      keyword:  filters.keyword,
    });

    fetch('/api/housing/scout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    body,
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (e) {
          throw new Error(e.error || ('Server returned ' + res.status));
        });
      }
      return res.json();
    })
    .then(function (data) {
      clearInterval(stepTimer);
      btn.textContent = '▸ RUN HOUSING SCOUT';
      btn.disabled    = false;

      if (!data.success) throw new Error(data.error || 'Scout returned failure status.');

      var listings = (data.listings || []).map(function (l, i) {
        return {
          id:      l.id      || ('scout_' + (i + 1)),
          name:    l.name    || l.addr || ('Listing #' + (i + 1)),
          addr:    l.addr    || l.name || '',
          city:    l.city    || 'Unknown',
          rent:    l.rent    || 0,
          beds:    l.beds    || 0,
          baths:   l.baths   || 0,
          type:    l.type    || 'house',
          pets:    !!l.pets,
          voucher: !!l.voucher,
          family:  !!l.family,
          source:    l.source    || 'housing scout',
          sourceUrl: l.sourceUrl || '',
          link:      l.link      || '',
          desc:      l.desc      || '',
        };
      });

      var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (!listings.length) {
        setScoutMode('fallback', 'SIMULATED',
          'Scout ran but found 0 listings — showing simulated results.',
          'Last run: ' + now
        );
        runSearch();
        return;
      }

      var cheapest = null;
      var total    = 0;
      listings.forEach(function (p) {
        total += (p.rent || 0);
        if (!cheapest || (p.rent && p.rent < cheapest.rent)) cheapest = p;
      });
      var avgRent = listings.length ? Math.round(total / listings.length) : 0;

      setScoutMode('real', 'REAL SCOUT',
        listings.length + ' listing' + (listings.length !== 1 ? 's' : '') +
        ' · ' + (data.sources_checked || 0) + ' sources checked',
        'Last run: ' + now
      );
      displayScoutResults(listings);

      COS.activity.log({
        agent: 'Nova', dept: 'housing',
        msg: 'Housing Scout complete — ' + listings.length + ' real listings, avg $' + avgRent + '/mo',
        source: 'real_scout',
      });
      if (typeof OE !== 'undefined') {
        OE.generate({
          type:    'scout_results',
          title:   'Housing Scout Completed',
          summary: listings.length + ' real listings · avg $' + avgRent + '/mo' +
                   (cheapest ? ' · cheapest: ' + (cheapest.name || cheapest.addr) + ' ($' + cheapest.rent + ')' : '') +
                   ' · Source: REAL SCOUT',
        }, 'nova', 'housing');
      }
    })
    .catch(function (err) {
      clearInterval(stepTimer);
      btn.textContent = '▸ RUN HOUSING SCOUT';
      btn.disabled    = false;

      var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var msg = err.message || '';
      var isNetworkErr = !msg || msg.indexOf('fetch') >= 0 || msg.indexOf('Failed') >= 0 ||
                         msg.indexOf('NetworkError') >= 0 || msg.indexOf('ECONNREFUSED') >= 0;

      if (isNetworkErr) {
        setScoutMode('offline', 'BACKEND OFFLINE',
          'Housing Scout backend is not connected. Run: python server.py',
          'Last attempt: ' + now
        );
      } else {
        setScoutMode('offline', 'SCOUT ERROR', msg, 'Last attempt: ' + now);
      }

      runSearch();   // fall back to simulated results
      COS.activity.log({
        agent: 'Nova', dept: 'housing',
        msg: 'Housing Scout backend offline — simulated fallback active',
        source: 'fallback',
      });
    });
  }

  // ── INIT ────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var searchBtn  = document.getElementById('sp-searchBtn');
    var profileBtn = document.getElementById('sp-loadZee');
    var scoutBtn   = document.getElementById('sp-scoutBtn');
    var monitor    = document.getElementById('ah-monitor');

    if (searchBtn)  searchBtn.addEventListener('click', runSearch);
    if (profileBtn) profileBtn.addEventListener('click', loadZeeProfile);
    if (scoutBtn)   scoutBtn.addEventListener('click', runScout);

    if (monitor) {
      monitor.title = 'Open Property Search';
      monitor.addEventListener('click', function () {
        var panel = document.getElementById('hs-searchPanel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Auto-run with default filters on load
    runSearch();
  });

})();
