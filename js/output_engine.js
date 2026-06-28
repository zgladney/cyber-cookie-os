/* CyberCookieOS — Output Engine (OE) v1.0
   Converts completed ART tasks into meaningful workspace deliverables.
   Hooks into COS.events('agent:taskComplete') — no ART dependency at load time.
   Requires: COS (loaded first). */

window.OE = (function () {
  'use strict';

  var STORE   = 'oe.outputs';
  var MAX_OUT = 300;

  // ── DATA POOLS ────────────────────────────────────────────────────

  var _PROPS = [
    { name: 'Willingboro Park Townhouse 2BR',  rent: 1850, loc: 'Willingboro, NJ',   type: 'townhouse', pets: true,  voucher: true,  family: true,  note: 'Corner unit, washer/dryer hookup, quiet block' },
    { name: 'Mount Laurel Colonial 3BR',        rent: 2050, loc: 'Mount Laurel, NJ',  type: 'house',     pets: false, voucher: true,  family: true,  note: 'Top-rated school district, attached garage' },
    { name: 'Marlton Oaks 2BR House',           rent: 1950, loc: 'Marlton, NJ',       type: 'house',     pets: false, voucher: true,  family: true,  note: 'Large backyard, 2-car driveway, near Route 73' },
    { name: 'Southampton Ridge 2BR Condo',      rent: 1750, loc: 'Southampton, NJ',   type: 'condo',     pets: true,  voucher: true,  family: true,  note: 'Community pool, fitness center, low HOA fees' },
    { name: 'Burlington City 3BR House',        rent: 1900, loc: 'Burlington, NJ',    type: 'house',     pets: true,  voucher: true,  family: true,  note: 'Renovated kitchen, fenced yard, near schools' },
    { name: 'Eastampton 2BR Townhome',          rent: 1700, loc: 'Eastampton, NJ',    type: 'townhouse', pets: true,  voucher: false, family: true,  note: 'Close to transit, quiet residential street' },
    { name: 'Lumberton 2BR Ranch House',        rent: 1800, loc: 'Lumberton, NJ',     type: 'house',     pets: true,  voucher: true,  family: true,  note: 'Rural setting, large lot, near Route 38' },
    { name: 'Maple Shade 2BR Apartment',        rent: 1600, loc: 'Maple Shade, NJ',   type: 'apartment', pets: false, voucher: true,  family: true,  note: 'On-site laundry, near shopping center' },
    { name: 'Medford Lakes 3BR Colonial',       rent: 2100, loc: 'Medford, NJ',       type: 'house',     pets: true,  voucher: false, family: true,  note: 'Lake access, top school district, cul-de-sac' },
    { name: 'Mt Laurel Crossing 2BR Condo',     rent: 1980, loc: 'Mount Laurel, NJ',  type: 'condo',     pets: false, voucher: true,  family: true,  note: 'HOA covers water and trash, gated complex' },
    { name: 'Willingboro Gardens 2BR',          rent: 1720, loc: 'Willingboro, NJ',   type: 'apartment', pets: true,  voucher: true,  family: true,  note: 'Updated appliances, community garden' },
    { name: 'Southampton Pines Townhouse 2BR',  rent: 1830, loc: 'Southampton, NJ',   type: 'townhouse', pets: true,  voucher: true,  family: true,  note: 'Wooded lot, near good schools, very quiet' },
    { name: 'Cinnaminson 2BR House',            rent: 1780, loc: 'Cinnaminson, NJ',   type: 'house',     pets: true,  voucher: true,  family: true,  note: 'Corner lot, updated HVAC, Route 130 access' },
    { name: 'Moorestown 2BR Townhouse',         rent: 1950, loc: 'Moorestown, NJ',    type: 'townhouse', pets: false, voucher: true,  family: true,  note: 'Highly rated schools, walkable downtown' },
    { name: 'Evesham 3BR House',                rent: 2080, loc: 'Evesham, NJ',       type: 'house',     pets: true,  voucher: false, family: true,  note: 'Large master suite, 2-car garage, cul-de-sac' },
  ];

  var _THREATS = [
    { ip: '103.21.244.14', type: 'Port Scan',          sev: 'high',     detail: 'Sequential port scan on 22/80/443/3306 from external IP' },
    { ip: '185.156.73.14', type: 'Brute Force',         sev: 'critical', detail: 'SSH brute-force — 47 failed logins in 60 seconds' },
    { ip: '51.83.204.71',  type: 'Malware Beacon',      sev: 'critical', detail: 'C2 callback pattern detected; block immediately' },
    { ip: '198.51.100.42', type: 'Suspicious DNS',      sev: 'medium',   detail: 'DNS query to known phishing domain blocked' },
    { ip: '91.108.4.200',  type: 'TOR Exit Node',       sev: 'medium',   detail: 'Traffic routed through TOR exit detected' },
    { ip: '5.188.206.197', type: 'Spam Bot',            sev: 'low',      detail: 'Known spam source — mass connection attempts' },
    { ip: '192.168.1.105', type: 'Internal Anomaly',    sev: 'high',     detail: 'Unusual lateral movement from internal host' },
    { ip: '45.132.192.17', type: 'Data Exfiltration',   sev: 'critical', detail: 'Outbound data spike to unrecognized external server' },
    { ip: '176.9.108.22',  type: 'Credential Stuffing', sev: 'high',     detail: 'Automated login attempts with leaked credentials' },
    { ip: '104.21.65.119', type: 'DDoS Amplification',  sev: 'high',     detail: 'UDP amplification traffic from reflector node' },
  ];

  var _PRODUCT_IDEAS = [
    'Holographic vinyl stickers — celestial theme, 8-pack set',
    'Aesthetic desk mat — pastel moon phase print, 90×40cm',
    'Korean stationery washi tape bundle — sakura + cloud prints',
    'LED fairy light jar decor kit — DIY moon jar, 3 sizes',
    'Custom acrylic name keychain — gradient frosted effect',
    'Cottagecore mushroom mini art print set — 4-pack',
    'Y2K butterfly clip earring bundle — iridescent finish',
    'Gradient sunset enamel pin collection — 3-piece set',
    'Retrowave city skyline poster print — A3 digital art',
    'Celestial tarot card SVG bundle — commercial license',
    'Dark academia vintage bookmark set — pressed flower design',
    'Kawaii cloud plushie sticker sheet — holographic foil',
    'Maximalist floral print tote bag — canvas, 3 colorways',
    'Star map art print — personalized date and location',
    'Mushroom ceramic ring dish — handpainted glaze style SVG',
    'Pastel gradient phone case template — SVG/PNG bundle',
    'Indie kid butterfly hair clip set — acrylic charms',
    'Mental health affirmation card set — printable download',
  ];

  var _TIKTOK_TRENDS = [
    '"That girl" morning routine aesthetic — 2.3M views this week',
    'Quiet luxury unboxing content — #quietluxury trending 4.1M',
    'POV: your workspace is a cozy café — small biz trend rising',
    'Get ready with me: dark academia — 1.8M views, growing fast',
    'Soft girl aesthetic GRWM — trending among 18-24 audience',
    'Small business day-in-my-life — high engagement format',
    'Aesthetic product photography tips — search trending +42%',
    'Notion setup for entrepreneurs — productivity niche surging',
    '"Packaging my orders" content — cozy small biz format',
    'Thrift flip DIY — sustainability content +67% this month',
    'Slow living morning routine — 3.9M views, monetizable',
    'Mini vlog: making products at midnight — creator niche',
    'Before and after: Etsy shop rebrand — high share rate',
  ];

  var _ETSY_TAGS = [
    ['sticker', 'holographic', 'celestial', 'kawaii', 'vinyl sticker', 'laptop decal', 'waterproof sticker'],
    ['desk mat', 'aesthetic', 'pastel', 'moon phase', 'workspace decor', 'gaming mat', 'large mousepad'],
    ['washi tape', 'stationery', 'korean stationery', 'planner tape', 'journaling', 'scrapbook supply'],
    ['enamel pin', 'hard enamel', 'lapel pin', 'aesthetic pin', 'gift for her', 'backpack pin'],
    ['art print', 'digital print', 'wall decor', 'printable art', 'aesthetic room', 'retrowave print'],
    ['earrings', 'y2k earrings', 'butterfly clip', 'statement earrings', 'indie jewelry', 'iridescent'],
  ];

  var _REMINDERS = [
    'Call Southampton Ridge — ask about move-in availability and deposit',
    'Submit rental application for Mount Laurel Colonial by Friday',
    'Review monthly budget before Greenbean sends updated report',
    'Check credit score — required for rental applications',
    'Follow up with Willingboro Park Townhouse — no response yet',
    'Schedule property viewing for Burlington City 3BR this week',
    'Renew renter\'s insurance before end of month',
    'Update Etsy store banner for seasonal promotion launch',
    'Send email to landlord — question about pet deposit policy',
    'Reminder: rent comparison review session Thursday 2PM',
    'Back up CyberCookieOS workspace data to cloud',
    'Review Athena\'s security report from the scan this week',
    'Action item: submit housing voucher renewal form',
    'Reply to Penny\'s budget alert — review flagged categories',
    'Schedule family calendar sync for next week',
    'Set up automatic savings transfer for goals account',
    'Research Section 8 voucher requirements for Burlington County',
  ];

  var _TASK_ITEMS = [
    { title: 'Review latest rental shortlist from Nova',        assignee: 'nova',          dept: 'housing',      status: 'todo' },
    { title: 'Submit application for Burlington City 3BR',      assignee: 'atlas',          dept: 'housing',      status: 'todo' },
    { title: 'Review Athena\'s security scan report',           assignee: 'athena',         dept: 'security',     status: 'todo' },
    { title: 'Update Etsy store description and photos',        assignee: 'etsybot',        dept: 'commerce',     status: 'todo' },
    { title: 'Cross-check monthly expenses with budget',        assignee: 'greenbean',      dept: 'finance',      status: 'todo' },
    { title: 'Schedule viewing — Southampton Ridge Condo',      assignee: 'beacon',         dept: 'housing',      status: 'todo' },
    { title: 'Review TikTok trend report and pick 2 ideas',     assignee: 'spark',          dept: 'commerce',     status: 'todo' },
    { title: 'Set weekly savings contribution reminder',        assignee: 'vault',          dept: 'finance',      status: 'todo' },
    { title: 'Block time for product photography session',      assignee: 'calypso',        dept: 'productivity', status: 'todo' },
    { title: 'Action security incident from Sentinel report',   assignee: 'sentinel',       dept: 'security',     status: 'todo' },
    { title: 'Draft response to housing voucher inquiry',       assignee: 'atlas_planner',  dept: 'productivity', status: 'todo' },
    { title: 'Research Burlington County move-in specials',     assignee: 'nova',           dept: 'housing',      status: 'todo' },
  ];

  var _BUDGETS = [
    { income: 4200, housing: 2050, food: 380, transport: 210, utilities: 160, personal: 180, savings: 420, misc: 220 },
    { income: 4200, housing: 1850, food: 420, transport: 195, utilities: 145, personal: 200, savings: 510, misc: 280 },
    { income: 4500, housing: 2100, food: 360, transport: 220, utilities: 170, personal: 150, savings: 480, misc: 190 },
    { income: 3900, housing: 1750, food: 400, transport: 180, utilities: 140, personal: 220, savings: 360, misc: 260 },
  ];

  var _BILLS = [
    { name: 'Electric — PSE&G',       amount: 127, dueDay: 3  },
    { name: 'Internet — Xfinity',     amount: 74,  dueDay: 8  },
    { name: 'Spotify Premium',        amount: 10,  dueDay: 12 },
    { name: 'Adobe Creative Cloud',   amount: 55,  dueDay: 15 },
    { name: 'Renter\'s Insurance',    amount: 22,  dueDay: 18 },
    { name: 'Cell Phone — T-Mobile',  amount: 65,  dueDay: 20 },
    { name: 'Etsy Subscription',      amount: 10,  dueDay: 25 },
    { name: 'Amazon Prime',           amount: 15,  dueDay: 28 },
    { name: 'Gas — South Jersey Gas', amount: 84,  dueDay: 5  },
    { name: 'Car Insurance',          amount: 112, dueDay: 1  },
  ];

  // ── UTILITIES ─────────────────────────────────────────────────────

  function _pick(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
  function _pickN(arr, n) {
    return arr.slice().sort(function () { return Math.random() - .5; }).slice(0, Math.min(n, arr.length));
  }
  function _uid()         { return 'oe_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }
  function _cos()         { return typeof COS !== 'undefined' ? COS : null; }
  function _todayStart()  { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function _ri(lo, hi)    { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  function _empName(id)  { var c = _cos(); return c && c.employees[id] ? c.employees[id].name : id; }
  function _deptName(id) { var c = _cos(); return c && c.departments[id] ? c.departments[id].name : id; }

  // ── STORAGE ───────────────────────────────────────────────────────

  function _load() { var c = _cos(); return c ? (c.state.get(STORE) || []) : []; }
  function _save(list) { var c = _cos(); if (c) c.state.set(STORE, list.slice(-MAX_OUT)); }

  function _store(output) {
    var list = _load();
    list.push(output);
    _save(list);
  }

  // ── GENERATORS ────────────────────────────────────────────────────

  var _GEN = {

    // ── HOUSING ──────────────────────────────────────────────────

    search_listings: function () {
      var props = _pickN(_PROPS, _ri(3, 5));
      return {
        outputType: 'property_recommendations',
        summary: 'Found ' + props.length + ' matching properties in Burlington County',
        metadata: { properties: props, searchArea: 'Burlington County, NJ', filters: ['voucher-friendly', 'family-friendly', '2BR+', 'max $2100'] },
      };
    },

    compare_rent: function () {
      var areas = ['Willingboro', 'Mount Laurel', 'Marlton', 'Southampton', 'Burlington', 'Eastampton'];
      var area  = _pick(areas);
      var avg   = _ri(1650, 2050);
      return {
        outputType: 'rent_comparison',
        summary: area + ' area — avg rent $' + avg + '/mo based on ' + _ri(7, 15) + ' active listings',
        metadata: { area: area + ', NJ', avgRent: avg, minRent: avg - _ri(100, 200), maxRent: avg + _ri(150, 350), sampleSize: _ri(7, 15), vsLastMonth: _ri(-3, 8) + '%' },
      };
    },

    check_pets: function () {
      var props = _pickN(_PROPS.filter(function (p) { return p.pets; }), _ri(2, 4));
      return {
        outputType: 'pet_friendly_shortlist',
        summary: props.length + ' pet-friendly properties confirmed',
        metadata: { properties: props, note: 'All listings verified to allow pets — confirm deposit policy before applying' },
      };
    },

    check_voucher: function () {
      var props = _pickN(_PROPS.filter(function (p) { return p.voucher; }), _ri(3, 5));
      return {
        outputType: 'voucher_eligible_list',
        summary: props.length + ' voucher-accepting properties found',
        metadata: { properties: props, note: 'Landlords have confirmed housing voucher acceptance' },
      };
    },

    organize_shortlist: function () {
      var props = _pickN(_PROPS, 4).sort(function (a, b) { return a.rent - b.rent; });
      return {
        outputType: 'ranked_shortlist',
        summary: 'Shortlist of ' + props.length + ' ranked by best value score',
        metadata: { properties: props, sortBy: 'value score', criteria: 'rent, pets, voucher, family' },
      };
    },

    gen_recommendations: function () {
      var prop = _pick(_PROPS);
      var score = _ri(82, 98);
      return {
        outputType: 'recommendation',
        summary: 'Top pick: ' + prop.name + ' ($' + prop.rent + '/mo) — match score ' + score + '%',
        metadata: { topPick: prop, matchScore: score, reasons: ['Within budget', prop.voucher ? 'Voucher accepted' : 'Verify voucher policy', prop.pets ? 'Pet friendly' : 'No pets — verify', 'Family neighborhood'] },
      };
    },

    update_tracker: function () {
      var added = _ri(1, 3);
      var removed = Math.random() > 0.6 ? 1 : 0;
      return {
        outputType: 'tracker_update',
        summary: 'Listing tracker updated — ' + added + ' added, ' + removed + ' removed',
        metadata: { added: added, removed: removed, totalTracked: _ri(7, 14), lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      };
    },

    // ── SECURITY ─────────────────────────────────────────────────

    threat_scan: function () {
      var threats = _pickN(_THREATS, _ri(1, 4));
      var highSev = threats.filter(function (t) { return t.sev === 'critical' || t.sev === 'high'; }).length;
      return {
        outputType: 'threat_report',
        summary: 'Scan complete — ' + threats.length + ' event(s) | ' + highSev + ' high/critical severity',
        metadata: { threats: threats, scannedHosts: _ri(10, 28), cleanHosts: _ri(8, 20), durationMs: _ri(4000, 12000), scanType: 'Full network sweep' },
      };
    },

    log_review: function () {
      var total   = _ri(38, 120);
      var flagged = _ri(1, 5);
      var sources = _pickN(['auth.log', 'syslog', 'nginx.log', 'fail2ban.log', 'ufw.log', 'kernel.log'], 3);
      return {
        outputType: 'log_review_report',
        summary: total + ' log entries reviewed — ' + flagged + ' anomal' + (flagged !== 1 ? 'ies' : 'y') + ' flagged',
        metadata: { totalEntries: total, flagged: flagged, sources: sources, timeRange: 'Last 24 hours', topAnomalyType: _pick(['Auth failure', 'Port scan', 'Unusual outbound', 'DNS anomaly']) },
      };
    },

    cloud_monitor: function () {
      var score     = _ri(88, 100);
      var endpoints = _ri(8, 16);
      var avgMs     = _ri(95, 280);
      return {
        outputType: 'cloud_health_report',
        summary: 'Cloud health ' + score + '% — ' + endpoints + ' endpoints checked, avg response ' + avgMs + 'ms',
        metadata: { healthScore: score, endpointsChecked: endpoints, avgResponseMs: avgMs, alertsActive: score < 93 ? 1 : 0, servicesOk: endpoints, servicesDegraded: score < 93 ? 1 : 0 },
      };
    },

    incident_review: function () {
      var threat = _pick(_THREATS);
      var caseNo = _ri(100, 999);
      var resolutions = {
        critical: 'Blocked at firewall, incident escalated',
        high:     'IP blocked, monitoring for recurrence',
        medium:   'Logged and placed under watch',
        low:      'Noted, no action required',
      };
      return {
        outputType: 'incident_report',
        summary: 'Incident #' + caseNo + ' — ' + threat.type + ' (' + threat.sev.toUpperCase() + ') — ' + (resolutions[threat.sev] || 'reviewed'),
        metadata: { caseId: caseNo, incident: threat, resolution: resolutions[threat.sev] || 'reviewed', status: 'closed', reviewedBy: _pick(['Athena', 'Nimbus', 'Sentinel']) },
      };
    },

    gen_sec_report: function () {
      var score = _ri(68, 98);
      var resolved = _ri(1, 5);
      var open = Math.max(0, _ri(0, 2));
      return {
        outputType: 'security_summary',
        summary: 'Security score ' + score + '/100 — ' + resolved + ' incidents resolved, ' + open + ' open',
        metadata: { score: score, resolved: resolved, open: open, threatsDetected: resolved + open, recommendation: score >= 85 ? 'System posture healthy — continue monitoring' : 'Review open incidents and apply pending patches' },
      };
    },

    flag_suspicious: function () {
      var threat = _pick(_THREATS);
      return {
        outputType: 'flagged_event',
        summary: 'Flagged: ' + threat.type + ' from ' + threat.ip + ' (' + threat.sev.toUpperCase() + ')',
        metadata: { threat: threat, action: 'Flagged for manual review', alertCreated: true, autoBlocked: threat.sev === 'critical' },
      };
    },

    // ── COMMERCE ─────────────────────────────────────────────────

    trend_research: function () {
      var trends = _pickN(_TIKTOK_TRENDS, _ri(3, 5));
      var ideas  = _pickN(_PRODUCT_IDEAS, _ri(3, 6));
      return {
        outputType: 'trend_report',
        summary: trends.length + ' market trends identified + ' + ideas.length + ' product opportunities',
        metadata: { trends: trends, opportunities: ideas, topPlatform: 'TikTok', period: 'Current week', recommendation: _pick(['Lead with holographic products', 'Focus on aesthetic desk accessories', 'Double down on sticker packs', 'Test washi tape bundles this week']) },
      };
    },

    gen_ideas: function () {
      var ideas = _pickN(_PRODUCT_IDEAS, _ri(5, 9));
      return {
        outputType: 'product_ideas',
        summary: ideas.length + ' product ideas generated for Etsy / POD pipeline',
        metadata: { ideas: ideas, category: _pick(['Stationery & Paper', 'Home Decor', 'Accessories', 'Art Prints', 'Digital Downloads', 'Wearables']), priority: _pick(['High', 'Medium', 'Exploratory']) },
      };
    },

    prep_listing: function () {
      var idea  = _pick(_PRODUCT_IDEAS);
      var tags  = _pick(_ETSY_TAGS);
      var title = idea.split('—')[0].trim();
      var price = (9.99 + _ri(0, 25)).toFixed(2);
      return {
        outputType: 'etsy_listing_draft',
        summary: 'Listing ready: "' + title + '" — $' + price + ' · ' + tags.length + ' SEO tags',
        metadata: { title: title, price: parseFloat(price), tags: tags, description: 'Handcrafted with care. Ships within 3-5 business days. Digital download option available. Perfect for gifting or treating yourself.', shippingProfile: 'Standard US + International', status: 'draft' },
      };
    },

    tiktok_trends: function () {
      var trends = _pickN(_TIKTOK_TRENDS, _ri(4, 7));
      return {
        outputType: 'tiktok_trend_report',
        summary: trends.length + ' TikTok trends mapped for content strategy this week',
        metadata: { trends: trends, topFormat: _pick(['Unboxing', 'Day-in-my-life', 'GRWM', 'Before & After', 'Mini vlog']), contentIdeas: _pickN(['Feature your packaging process', 'Show a "cozy making products" vlog', 'Before and after Etsy shop refresh', 'Day in the life of a small biz owner', 'Aesthetic product flat lay shoot'], 3) },
      };
    },

    prod_queue: function () {
      var items = _ri(3, 7);
      var nextItem = _pick(_PRODUCT_IDEAS).split('—')[0].trim();
      return {
        outputType: 'production_queue',
        summary: 'Production queue: ' + items + ' items queued — next: ' + nextItem,
        metadata: { queueSize: items, nextItem: nextItem, estimatedHours: items * _ri(2, 4), priority: _pick(['High', 'Medium', 'Balanced']), weeklyCapacity: '20 hours' },
      };
    },

    // ── PRODUCTIVITY ─────────────────────────────────────────────

    calendar_review: function () {
      var events = _ri(3, 7);
      var next   = _pick(['Housing viewing — Southampton Ridge', 'Budget review session', 'Etsy listing update', 'Weekly security debrief', 'Savings goal check', 'Family planning call']);
      return {
        outputType: 'calendar_summary',
        summary: events + ' upcoming events reviewed — next: ' + next,
        metadata: { upcomingEvents: events, conflicts: 0, nextEvent: next, weekFocus: _pick(['Housing applications', 'Commerce launch prep', 'Financial review week', 'Security audit week']) },
      };
    },

    email_review: function () {
      var total    = _ri(10, 32);
      var priority = _ri(2, 5);
      var replied  = _ri(1, priority);
      return {
        outputType: 'email_triage_report',
        summary: total + ' emails processed — ' + priority + ' priority · ' + replied + ' drafted for reply',
        metadata: { total: total, priority: priority, replied: replied, archived: total - priority, unread: _ri(0, 3), topSender: _pick(['Landlord — Willingboro Park', 'Housing Authority Burlington', 'Etsy Team', 'Security Alert System', 'Bank of America']) },
      };
    },

    gen_reminders: function () {
      var reminders = _pickN(_REMINDERS, _ri(3, 5));
      return {
        outputType: 'reminder_cards',
        summary: reminders.length + ' reminders created and scheduled',
        metadata: { reminders: reminders, scheduledFor: _pick(['Today end of day', 'Tomorrow morning', 'This Friday', 'Start of next week']) },
      };
    },

    create_tasks: function () {
      var tasks = _pickN(_TASK_ITEMS, _ri(3, 5));
      return {
        outputType: 'task_list',
        summary: tasks.length + ' new tasks created and assigned to team',
        metadata: { tasks: tasks, priority: _pick(['High', 'Normal', 'Low']) },
      };
    },

    org_schedule: function () {
      var slots = _ri(4, 8);
      return {
        outputType: 'optimized_schedule',
        summary: 'Schedule optimized — ' + slots + ' time blocks, 0 conflicts, peak hours protected',
        metadata: { timeBlocks: slots, focusHours: _ri(2, 4), breaksSuggested: 2, peakProductivity: _pick(['9 AM – 12 PM', '10 AM – 1 PM', '2 PM – 5 PM', '8 AM – 11 AM']), recommendation: 'Housing tasks scheduled for morning, creative work in afternoon' },
      };
    },

    // ── FINANCE ──────────────────────────────────────────────────

    review_bills: function () {
      var bills = _pickN(_BILLS, _ri(3, 6));
      var total = bills.reduce(function (s, b) { return s + b.amount; }, 0);
      var overdue = Math.random() < 0.15 ? 1 : 0;
      return {
        outputType: 'bill_review',
        summary: '$' + total + ' in bills this period' + (overdue ? ' · ⚠ 1 overdue' : ' · all current'),
        metadata: { bills: bills, totalDue: total, overdue: overdue, nextDue: bills.sort(function (a, b) { return a.dueDay - b.dueDay; })[0] },
      };
    },

    calc_budget: function () {
      var b       = _pick(_BUDGETS);
      var surplus = b.income - b.housing - b.food - b.transport - b.utilities - b.personal - b.misc;
      return {
        outputType: 'budget_report',
        summary: 'Budget: $' + b.income + ' income → $' + surplus + ' surplus after all expenses',
        metadata: Object.assign({}, b, { surplus: surplus, savingsRate: Math.round(surplus / b.income * 100) + '%' }),
      };
    },

    track_expenses: function () {
      var b     = _pick(_BUDGETS);
      var spent = b.food + b.transport + b.personal + b.misc;
      var pct   = Math.round(spent / (b.income - b.housing) * 100);
      return {
        outputType: 'expense_report',
        summary: '$' + spent + ' in discretionary spending (' + pct + '% of available budget)',
        metadata: { categories: { food: b.food, transport: b.transport, personal: b.personal, misc: b.misc }, total: spent, budgetUsedPct: pct, warning: pct > 80 },
      };
    },

    update_savings: function () {
      var goal    = (_ri(8, 16) * 500);
      var current = Math.floor(goal * (0.25 + Math.random() * 0.55));
      var monthly = _ri(300, 550);
      var months  = Math.ceil((goal - current) / monthly);
      return {
        outputType: 'savings_update',
        summary: 'Savings: $' + current.toLocaleString() + ' / $' + goal.toLocaleString() + ' goal — ' + months + ' months remaining',
        metadata: { currentSavings: current, savingsGoal: goal, monthlyContribution: monthly, monthsToGoal: months, onTrack: true },
      };
    },

    fin_summary: function () {
      var b       = _pick(_BUDGETS);
      var surplus = b.income - b.housing - b.food - b.transport - b.utilities - b.personal - b.misc;
      var score   = _ri(62, 96);
      return {
        outputType: 'financial_summary',
        summary: 'Financial health: ' + score + '/100 — $' + surplus + ' monthly surplus · ' + (score >= 80 ? 'On track' : 'Needs attention'),
        metadata: Object.assign({}, b, { surplus: surplus, healthScore: score, recommendation: score >= 80 ? 'Finances healthy — consider increasing savings rate by 5%' : 'Review discretionary spending — 2 categories above target' }),
      };
    },

  };

  // ── MAIN GENERATE ─────────────────────────────────────────────────

  function generate(task, agentId, deptId) {
    var gen = _GEN[task.type];
    if (!gen) return null;

    var result = gen(task, agentId, deptId);
    if (!result) return null;

    var aName = _empName(agentId);
    var dName = _deptName(deptId);

    var output = {
      id:         _uid(),
      dept:       deptId,
      agent:      agentId,
      agentName:  aName,
      taskType:   task.type,
      taskTitle:  task.title,
      outputType: result.outputType,
      ts:         Date.now(),
      summary:    result.summary,
      status:     'active',
      metadata:   result.metadata || {},
    };

    _store(output);

    var c = _cos();
    if (c) {
      c.events.emit('output:created', { output: output });
      c.activity.log({ agent: aName, dept: deptId, msg: aName + ': ' + result.summary, source: 'output' });
      c.notifications.add(aName + ': ' + result.summary, 'normal');
    }

    return output;
  }

  // ── PUBLIC ACCESSORS ──────────────────────────────────────────────

  function getAll() {
    return _load().filter(function (o) { return o.status !== 'deleted'; });
  }

  function getByDept(dept) {
    return getAll().filter(function (o) { return o.dept === dept; }).slice().reverse();
  }

  function getByAgent(agentId) {
    return getAll().filter(function (o) { return o.agent === agentId; }).slice().reverse();
  }

  function getRecent(n) {
    return getAll().slice(-n).reverse();
  }

  function getDeptHistory(dept) {
    return _load().filter(function (o) { return o.dept === dept && o.status !== 'deleted'; }).slice().reverse();
  }

  function getTodayCount() {
    var start = _todayStart();
    return _load().filter(function (o) { return o.ts >= start && o.status !== 'deleted'; }).length;
  }

  function getTopAgent() {
    var start  = _todayStart();
    var counts = {};
    _load().filter(function (o) { return o.ts >= start && o.status !== 'deleted'; }).forEach(function (o) {
      counts[o.agent] = (counts[o.agent] || 0) + 1;
    });
    var top = null, max = 0;
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > max) { max = counts[id]; top = id; }
    });
    return top ? { agent: top, name: _empName(top), count: max } : null;
  }

  function archive(id) {
    var list = _load();
    var o    = list.find(function (x) { return x.id === id; });
    if (o) { o.status = 'archived'; _save(list); }
  }

  function restore(id) {
    var list = _load();
    var o    = list.find(function (x) { return x.id === id; });
    if (o) { o.status = 'active'; _save(list); }
  }

  function remove(id) {
    var list = _load();
    var o    = list.find(function (x) { return x.id === id; });
    if (o) { o.status = 'deleted'; _save(list); }
  }

  // ── AUTO-HOOK into ART via COS events ────────────────────────────

  (function _hook() {
    var c = _cos();
    if (!c) return;
    c.events.on('agent:taskComplete', function (e) {
      generate(e.task, e.id, e.dept);
    });
  })();

  return {
    generate:       generate,
    getAll:         getAll,
    getByDept:      getByDept,
    getByAgent:     getByAgent,
    getRecent:      getRecent,
    getDeptHistory: getDeptHistory,
    getTodayCount:  getTodayCount,
    getTopAgent:    getTopAgent,
    archive:        archive,
    restore:        restore,
    remove:         remove,
  };

})();
