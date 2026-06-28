/* ================================================================
   CyberCookieOS Core Module v0.3.0
   Central data, state, events, and business logic for all pages.
   All pages import this before their own scripts.
================================================================ */
(function (global) {
  'use strict';

  // ── DEPARTMENTS ──────────────────────────────────────────────

  var DEPARTMENTS = {
    security: {
      id: 'security', name: 'Security Ops', short: 'SECURITY OPS',
      color: '#9b6bff', icon: '🛡', room: '/hq/index.html',
      desc: 'Protect & Monitor', wing: 'A',
    },
    housing: {
      id: 'housing', name: 'Housing', short: 'HOUSING',
      color: '#c4784a', icon: '🏠', room: '/housing/index.html',
      desc: 'Find Your Next Home', wing: 'B',
    },
    commerce: {
      id: 'commerce', name: 'Commerce', short: 'COMMERCE',
      color: '#ff69b4', icon: '🛍', room: '/commerce/index.html',
      desc: 'Create & Profit', wing: 'C',
    },
    productivity: {
      id: 'productivity', name: 'Productivity', short: 'PRODUCTIVITY',
      color: '#3aa8c8', icon: '📅', room: '/productivity/index.html',
      desc: 'Plan & Organize', wing: 'D',
    },
    finance: {
      id: 'finance', name: 'Finance', short: 'FINANCE',
      color: '#2ecc71', icon: '💰', room: '/finance/index.html',
      desc: 'Manage & Grow', wing: 'E',
    },
  };

  // ── EMPLOYEES ─────────────────────────────────────────────────

  var EMPLOYEES = {
    athena: {
      id: 'athena', name: 'Athena', title: 'Senior Threat Hunter', dept: 'security',
      hasArt: true, imgSrc: '/assets/employees/athena/Athena (agent 001).png',
      agentScript: 'agents/threat_hunter/threat_hunter.py',
      resultsPath: 'data/scan_log.json',
      bio: 'Athena is CyberCookieOS\'s elite threat analyst. She monitors incoming network traffic, classifies IP addresses for threat potential, and generates detailed investigation cases. Operating continuously, she never lets a suspicious packet go unnoticed.',
      specialization: ['IPv4/IPv6 Scanning', 'Threat Classification', 'Incident Response', 'Network Reconnaissance'],
      capabilities: ['Network Scanning', 'Threat Detection', 'IP Classification', 'Investigation Case Generation', 'TXT & JSON Logging'],
      futureCapabilities: ['ML-based Anomaly Detection', 'Automated Incident Response', 'Dark Web Monitoring', 'Threat Intelligence Feed'],
      sampleTasks: ['Scanning network for IPv6 threats', 'Classifying suspicious IPs', 'Generating investigation report', 'Analyzing traffic patterns'],
    },
    nimbus: {
      id: 'nimbus', name: 'Nimbus', title: 'Cloud Monitor', dept: 'security',
      hasArt: true, imgSrc: '/assets/employees/nimbus/Nimbus (agent 003).png',
      agentScript: 'agents/cloud_monitor/cloud_monitor.py',
      resultsPath: 'data/cloud_monitor_results.json',
      bio: 'Nimbus monitors cloud infrastructure health across all connected services. He tracks logs, performance metrics, and uptime indicators, alerting the team to anomalies in real time and maintaining a continuous health score for CyberCookieOS cloud assets.',
      specialization: ['Cloud Infrastructure', 'Log Analysis', 'Performance Monitoring', 'Uptime Tracking'],
      capabilities: ['Service Health Checks', 'Log Aggregation', 'Alert Generation', 'Metric Dashboards'],
      futureCapabilities: ['Auto-scaling Triggers', 'Cost Optimization', 'Multi-cloud Support', 'Kubernetes Integration'],
      sampleTasks: ['Monitoring cloud infrastructure logs', 'Checking service uptime', 'Aggregating performance metrics', 'Reviewing error rates'],
    },
    sentinel: {
      id: 'sentinel', name: 'Sentinel', title: 'SOC Analyst', dept: 'security',
      hasArt: true, imgSrc: '/assets/employees/sentinel/Sentinel (agent 004).png',
      agentScript: 'agents/soc_analyst/soc_analyst.py',
      resultsPath: 'data/soc_analyst_results.json',
      bio: 'Sentinel runs the Security Operations Center, triaging alerts and maintaining the incident queue. He coordinates investigations between Athena and Nimbus, ensuring no threat goes unaddressed and every alert receives proper escalation.',
      specialization: ['Alert Triage', 'Incident Management', 'SOC Operations', 'Threat Coordination'],
      capabilities: ['Alert Queue Management', 'Incident Escalation', 'Team Coordination', 'SOC Reporting'],
      futureCapabilities: ['Automated Playbooks', 'SIEM Integration', 'AI-assisted Triage', 'Compliance Reporting'],
      sampleTasks: ['Triaging security alert queue', 'Coordinating SOC investigation', 'Reviewing overnight scan results', 'Updating incident log'],
    },
    nova: {
      id: 'nova', name: 'Nova', title: 'Housing Scout', dept: 'housing',
      hasArt: true, imgSrc: '/assets/employees/nova/Housing Scout Nova (agent 002).png',
      agentScript: 'agents/housing_scout_v2/housing_scout_browser.py',
      resultsPath: 'data/housing_scout_v2_results.json',
      bio: 'Nova searches rental markets in Burlington County, NJ for housing voucher-compatible listings. She scrapes accessible real estate sources, ranks properties by match quality, and flags new listings as they appear — without relying on bot-protected platforms.',
      specialization: ['Rental Market Research', 'Voucher Compatibility', 'Browser Automation', 'Property Ranking'],
      capabilities: ['Multi-source Scraping', 'Voucher Filter', 'Price Tracking', 'JSON Result Logging', 'Screenshot Evidence'],
      futureCapabilities: ['Email Alerts for New Listings', 'Map Integration', 'Automated Applications', 'Landlord Outreach'],
      sampleTasks: ['Searching Burlington County listings', 'Filtering voucher-compatible homes', 'Ranking new property matches', 'Logging scout results'],
    },
    beacon: {
      id: 'beacon', name: 'Beacon', title: 'Rental Assistant', dept: 'housing',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/rental_assistant/rental_assistant.py',
      resultsPath: 'data/rental_assistant_results.json',
      bio: 'Beacon tracks rental listings over time, monitoring price changes and availability windows. She maintains a comparison database so the CEO can make fast, informed decisions when a desirable property appears.',
      specialization: ['Price Tracking', 'Availability Monitoring', 'Rental Comparison', 'Market Analysis'],
      capabilities: ['Listing History', 'Price Change Alerts', 'Comparison Reports'],
      futureCapabilities: ['Automated Viewing Scheduler', 'Neighborhood Score Analysis', 'Walk Score Integration'],
      sampleTasks: ['Comparing rental prices', 'Monitoring listing availability', 'Tracking price history', 'Generating rental report'],
    },
    atlas: {
      id: 'atlas', name: 'Atlas', title: 'Landlord Contact Specialist', dept: 'housing',
      hasArt: true, imgSrc: '/assets/employees/atlas/Atlas (agent 005).png',
      agentScript: 'agents/landlord_contact/landlord_contact.py',
      resultsPath: 'data/landlord_contact_results.json',
      bio: 'Atlas manages outreach to landlords and property managers. He drafts professional inquiry messages, tracks response status, and maintains a detailed contact history for every property of interest.',
      specialization: ['Landlord Outreach', 'Message Drafting', 'Response Tracking', 'Contact Management'],
      capabilities: ['Inquiry Message Generation', 'Contact Database', 'Response Status Tracking'],
      futureCapabilities: ['Automated Follow-up', 'Email Integration', 'Application Pre-fill'],
      sampleTasks: ['Drafting landlord inquiry letters', 'Tracking contact response status', 'Updating contact database', 'Preparing follow-up messages'],
    },
    pixel: {
      id: 'pixel', name: 'Pixel', title: 'Trend Hunter', dept: 'commerce',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/trend_hunter/trend_hunter.py',
      resultsPath: 'data/trend_hunter_results.json',
      bio: 'Pixel scouts TikTok and Etsy for viral trends, emerging niches, and high-demand products. She synthesizes raw social data into actionable product opportunities and hands them to the rest of the Commerce team.',
      specialization: ['Trend Analysis', 'Niche Discovery', 'Social Data Synthesis', 'Product Research'],
      capabilities: ['TikTok Trend Scraping', 'Etsy Niche Research', 'Trend Report Generation'],
      futureCapabilities: ['Pinterest Integration', 'Google Trends API', 'AI Trend Prediction'],
      sampleTasks: ['Analyzing TikTok trend data', 'Identifying emerging Etsy niches', 'Generating trend report', 'Researching competitor products'],
    },
    etsybot: {
      id: 'etsybot', name: 'EtsyBot', title: 'Etsy Manager', dept: 'commerce',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/etsy_manager/etsy_manager.py',
      resultsPath: 'data/etsy_manager_results.json',
      bio: 'EtsyBot manages the Etsy storefront — from product listing drafts to SEO optimization and sales analytics. She ensures the store stays competitive, well-stocked, and visible in search results.',
      specialization: ['Etsy SEO', 'Product Listings', 'Store Analytics', 'Inventory Management'],
      capabilities: ['Listing Draft Generation', 'Tag Optimization', 'Sales Reporting'],
      futureCapabilities: ['Etsy API Integration', 'Automated Listing Publication', 'Review Management'],
      sampleTasks: ['Optimizing Etsy store listings', 'Generating product descriptions', 'Analyzing store performance', 'Updating product tags'],
    },
    spark: {
      id: 'spark', name: 'Spark', title: 'TikTok Researcher', dept: 'commerce',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/tiktok_researcher/tiktok_researcher.py',
      resultsPath: 'data/tiktok_researcher_results.json',
      bio: 'Spark identifies trending content on TikTok, analyzing viral videos, hashtags, and creator strategies. She translates platform-specific trends into content ideas that fuel the commerce pipeline.',
      specialization: ['TikTok Analytics', 'Viral Content Analysis', 'Hashtag Research', 'Creator Strategy'],
      capabilities: ['Viral Video Identification', 'Hashtag Tracking', 'Content Brief Generation'],
      futureCapabilities: ['TikTok API Integration', 'Automated Content Calendar', 'Influencer Discovery'],
      sampleTasks: ['Researching viral content patterns', 'Tracking trending hashtags', 'Identifying viral creators', 'Generating content ideas'],
    },
    forge: {
      id: 'forge', name: 'Forge', title: 'POD Manager', dept: 'commerce',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/pod_manager/pod_manager.py',
      resultsPath: 'data/pod_manager_results.json',
      bio: 'Forge handles all print-on-demand operations, from design brief to production tracking. He manages supplier relationships, monitors order timelines, and ensures every product ships on schedule.',
      specialization: ['Print-on-Demand', 'Supplier Management', 'Order Tracking', 'Production Planning'],
      capabilities: ['Order Status Tracking', 'Supplier Coordination', 'Production Timeline Management'],
      futureCapabilities: ['Printful API Integration', 'Automated Order Routing', 'Design Generation AI'],
      sampleTasks: ['Managing print-on-demand inventory', 'Tracking production timelines', 'Coordinating with suppliers', 'Reviewing order status'],
    },
    calypso: {
      id: 'calypso', name: 'Calypso', title: 'Calendar Assistant', dept: 'productivity',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/calendar_assistant/calendar_assistant.py',
      resultsPath: 'data/calendar_assistant_results.json',
      bio: 'Calypso keeps the CEO\'s schedule organized and optimized. She manages calendars, schedules meetings, sets reminders, and ensures no deadline is ever missed. She is the backbone of time management at CyberCookieOS.',
      specialization: ['Calendar Management', 'Scheduling', 'Deadline Tracking', 'Meeting Coordination'],
      capabilities: ['Event Scheduling', 'Reminder Generation', 'Conflict Detection'],
      futureCapabilities: ['Google Calendar API', 'Zoom Meeting Creation', 'Smart Scheduling AI'],
      sampleTasks: ['Syncing calendar events', 'Scheduling upcoming meetings', 'Setting deadline reminders', 'Checking for scheduling conflicts'],
    },
    echo: {
      id: 'echo', name: 'Echo', title: 'Email Assistant', dept: 'productivity',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/email_assistant/email_assistant.py',
      resultsPath: 'data/email_assistant_results.json',
      bio: 'Echo manages the CEO\'s email inbox. She drafts professional replies, filters spam, summarizes long threads, and flags high-priority messages — keeping communication flowing without requiring constant attention.',
      specialization: ['Email Management', 'Reply Drafting', 'Thread Summarization', 'Priority Filtering'],
      capabilities: ['Inbox Processing', 'Draft Generation', 'Spam Filtering', 'Priority Labeling'],
      futureCapabilities: ['Gmail API Integration', 'Automated Reply Sending', 'Sentiment Analysis'],
      sampleTasks: ['Processing email inbox', 'Drafting professional replies', 'Summarizing long threads', 'Flagging priority messages'],
    },
    atlas_planner: {
      id: 'atlas_planner', name: 'Atlas Planner', title: 'Task Manager', dept: 'productivity',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/task_manager/task_manager.py',
      resultsPath: 'data/task_manager_results.json',
      bio: 'Atlas Planner oversees the project and task queue for CyberCookieOS. She assigns work, tracks progress across departments, and escalates blockers to the Operations Center before they become problems.',
      specialization: ['Project Management', 'Task Assignment', 'Progress Tracking', 'Blocker Escalation'],
      capabilities: ['Task Queue Management', 'Department Coordination', 'Progress Reporting'],
      futureCapabilities: ['Notion/Linear Integration', 'AI Task Estimation', 'Automated Status Reports'],
      sampleTasks: ['Updating project timelines', 'Assigning tasks across departments', 'Reviewing blocker queue', 'Generating progress report'],
    },
    memo: {
      id: 'memo', name: 'Memo', title: 'Reminder Assistant', dept: 'productivity',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/reminder_assistant/reminder_assistant.py',
      resultsPath: 'data/reminder_assistant_results.json',
      bio: 'Memo ensures nothing ever slips through the cracks. He sends proactive reminders, tracks follow-up dates, and maintains a persistent memory of every commitment and deadline across all departments.',
      specialization: ['Reminder Management', 'Follow-up Tracking', 'Commitment Memory', 'Proactive Alerts'],
      capabilities: ['Scheduled Reminders', 'Follow-up Queue', 'Cross-department Alerts'],
      futureCapabilities: ['SMS/Push Notifications', 'Natural Language Reminder Parsing', 'Smart Snooze Logic'],
      sampleTasks: ['Queuing weekly reminders', 'Tracking follow-up dates', 'Sending overdue alerts', 'Updating reminder schedule'],
    },
    greenbean: {
      id: 'greenbean', name: 'Greenbean', title: 'Finance Manager', dept: 'finance',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/finance_manager/finance_manager.py',
      resultsPath: 'data/finance_manager_results.json',
      bio: 'Greenbean oversees the complete financial picture of CyberCookieOS — income, expenses, budgets, and strategic reports. She ensures all financial decisions are data-driven and the organization stays financially healthy.',
      specialization: ['Financial Management', 'Budget Oversight', 'P&L Reporting', 'Strategic Finance'],
      capabilities: ['Budget Aggregation', 'Income Tracking', 'Expense Analysis', 'Monthly Reporting'],
      futureCapabilities: ['Plaid API Integration', 'Forecasting Models', 'Tax Preparation Assist'],
      sampleTasks: ['Generating monthly budget report', 'Reviewing income vs expenses', 'Updating financial dashboard', 'Analyzing spending trends'],
    },
    ledger: {
      id: 'ledger', name: 'Ledger', title: 'Bill Tracker', dept: 'finance',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/bill_tracker/bill_tracker.py',
      resultsPath: 'data/bill_tracker_results.json',
      bio: 'Ledger tracks every recurring bill, subscription, and payment obligation. He flags upcoming due dates, confirms payments, and identifies unnecessary or duplicate subscriptions.',
      specialization: ['Bill Tracking', 'Subscription Management', 'Payment Confirmation', 'Expense Audit'],
      capabilities: ['Due Date Tracking', 'Subscription Audit', 'Payment Logging', 'Alert Generation'],
      futureCapabilities: ['Bank Integration', 'Automated Payment Confirmation', 'Subscription Cancellation Assist'],
      sampleTasks: ['Tracking upcoming bill payments', 'Auditing subscription costs', 'Confirming payment statuses', 'Flagging overdue bills'],
    },
    penny: {
      id: 'penny', name: 'Penny', title: 'Budget Planner', dept: 'finance',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/budget_planner/budget_planner.py',
      resultsPath: 'data/budget_planner_results.json',
      bio: 'Penny sets and monitors monthly category budgets. She alerts when spending approaches limits, generates budget-vs-actual comparison reports, and recommends adjustments to keep CyberCookieOS spending on target.',
      specialization: ['Budget Planning', 'Category Tracking', 'Variance Analysis', 'Spending Alerts'],
      capabilities: ['Category Budgeting', 'Spending Alerts', 'Budget vs Actual Reports'],
      futureCapabilities: ['Receipt Scanning', 'AI Spending Categorization', 'Savings Goal Linking'],
      sampleTasks: ['Analyzing spending by category', 'Updating budget targets', 'Generating budget report', 'Flagging over-budget categories'],
    },
    vault: {
      id: 'vault', name: 'Vault', title: 'Savings Tracker', dept: 'finance',
      hasArt: false, imgSrc: null,
      agentScript: 'agents/savings_tracker/savings_tracker.py',
      resultsPath: 'data/savings_tracker_results.json',
      bio: 'Vault monitors savings account balances and tracks progress toward every financial goal. She celebrates milestones, calculates time-to-goal projections, and identifies opportunities to accelerate savings.',
      specialization: ['Savings Tracking', 'Goal Progress', 'Milestone Celebration', 'Time-to-Goal Analysis'],
      capabilities: ['Balance Monitoring', 'Goal Progress Reports', 'Savings Rate Analysis'],
      futureCapabilities: ['High-yield Account Recommendations', 'Automated Savings Rules', 'Investment Bridge Planning'],
      sampleTasks: ['Calculating savings goal progress', 'Monitoring savings balance', 'Projecting time-to-goal', 'Reporting savings milestones'],
    },
  };

  // Ordered employee list per department (for consistent rendering)
  var DEPT_EMPLOYEES = {
    security:    ['athena', 'nimbus', 'sentinel'],
    housing:     ['nova', 'beacon', 'atlas'],
    commerce:    ['pixel', 'etsybot', 'spark', 'forge'],
    productivity:['calypso', 'echo', 'atlas_planner', 'memo'],
    finance:     ['greenbean', 'ledger', 'penny', 'vault'],
  };

  // ── DEFAULT NOTIFICATIONS ─────────────────────────────────────

  var DEFAULT_NOTIFICATIONS = [
    { id: 'n1', text: 'Athena detected a suspicious IP — 203.45.12.8 flagged.', priority: 'high', read: false, ts: Date.now() - 120000 },
    { id: 'n2', text: 'Nova found 3 new rental listings in Burlington County.', priority: 'normal', read: false, ts: Date.now() - 240000 },
    { id: 'n3', text: 'Pixel discovered a trending Etsy niche: holographic stickers.', priority: 'normal', read: false, ts: Date.now() - 360000 },
    { id: 'n4', text: 'Calypso synchronized the calendar for the week.', priority: 'low', read: false, ts: Date.now() - 480000 },
    { id: 'n5', text: 'Greenbean updated the monthly budget overview.', priority: 'normal', read: false, ts: Date.now() - 600000 },
    { id: 'n6', text: 'Ledger flagged a subscription renewal due in 3 days.', priority: 'high', read: false, ts: Date.now() - 720000 },
    { id: 'n7', text: '2 cloud monitor alerts resolved by Nimbus.', priority: 'normal', read: true, ts: Date.now() - 900000 },
    { id: 'n8', text: 'Sentinel completed overnight SOC sweep — all clear.', priority: 'low', read: true, ts: Date.now() - 1080000 },
  ];

  // ── INTEGRATIONS ──────────────────────────────────────────────

  var INTEGRATIONS = [
    { id: 'housing_scout', name: 'Apartment Scout',   status: 'active',          dept: 'housing' },
    { id: 'google_cal',    name: 'Google Calendar',   status: 'not_configured',  dept: 'productivity' },
    { id: 'email',         name: 'Email (IMAP/SMTP)', status: 'not_configured',  dept: 'productivity' },
    { id: 'etsy',          name: 'Etsy',              status: 'disconnected',    dept: 'commerce' },
    { id: 'tiktok',        name: 'TikTok',            status: 'not_configured',  dept: 'commerce' },
    { id: 'github',        name: 'GitHub',            status: 'not_configured',  dept: 'security' },
    { id: 'weather',       name: 'Weather API',       status: 'not_configured',  dept: 'productivity' },
    { id: 'maps',          name: 'Maps / Geo',        status: 'not_configured',  dept: 'housing' },
  ];

  // ── LOCAL STORAGE STATE ───────────────────────────────────────

  var LS_PREFIX = 'cos.';

  var state = {
    get: function (key) {
      try { var v = localStorage.getItem(LS_PREFIX + key); return v === null ? null : JSON.parse(v); }
      catch (_) { return null; }
    },
    set: function (key, val) {
      try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); } catch (_) {}
    },
    del: function (key) {
      try { localStorage.removeItem(LS_PREFIX + key); } catch (_) {}
    },
  };

  // ── EVENT BUS ─────────────────────────────────────────────────

  var _handlers = {};
  var events = {
    on: function (type, fn) {
      (_handlers[type] || (_handlers[type] = [])).push(fn);
    },
    off: function (type, fn) {
      if (_handlers[type]) _handlers[type] = _handlers[type].filter(function (h) { return h !== fn; });
    },
    emit: function (type, data) {
      (_handlers[type] || []).forEach(function (fn) { try { fn(data); } catch (_) {} });
    },
  };

  // ── ACTIVITY LOG ──────────────────────────────────────────────

  var ACTIVITY_MAX = 100;

  var activity = {
    log: function (entry) {
      /* entry: { agent, dept, msg, source } */
      var log = state.get('activity.log') || [];
      log.unshift({ agent: entry.agent || 'System', dept: entry.dept || 'ops', msg: entry.msg, ts: Date.now(), source: entry.source || 'sim' });
      if (log.length > ACTIVITY_MAX) log = log.slice(0, ACTIVITY_MAX);
      state.set('activity.log', log);
      events.emit('activity:new', log[0]);
    },
    get: function (n) {
      var log = state.get('activity.log') || [];
      return n ? log.slice(0, n) : log;
    },
    getForEmployee: function (empId, n) {
      var log = state.get('activity.log') || [];
      var filtered = log.filter(function (e) {
        var emp = EMPLOYEES[empId];
        return emp && e.agent === emp.name;
      });
      return n ? filtered.slice(0, n) : filtered;
    },
  };

  // ── NOTIFICATIONS ─────────────────────────────────────────────

  var notifications = {
    _load: function () {
      return state.get('notifications') || DEFAULT_NOTIFICATIONS.map(function (n) { return Object.assign({}, n); });
    },
    _save: function (list) {
      state.set('notifications', list);
    },
    get: function (includeRead) {
      var list = notifications._load();
      return includeRead ? list : list.filter(function (n) { return !n.read; });
    },
    dismiss: function (id) {
      var list = notifications._load();
      list = list.filter(function (n) { return n.id !== id; });
      notifications._save(list);
      events.emit('notifications:changed', list);
      activity.log({ agent: 'System', dept: 'ops', msg: 'Notification dismissed.', source: 'user' });
    },
    markRead: function (id) {
      var list = notifications._load();
      list.forEach(function (n) { if (n.id === id) n.read = true; });
      notifications._save(list);
      events.emit('notifications:changed', list);
    },
    markAllRead: function () {
      var list = notifications._load();
      list.forEach(function (n) { n.read = true; });
      notifications._save(list);
      events.emit('notifications:changed', list);
    },
    add: function (text, priority) {
      var list = notifications._load();
      var id = 'n' + Date.now();
      list.unshift({ id: id, text: text, priority: priority || 'normal', read: false, ts: Date.now() });
      if (list.length > 50) list = list.slice(0, 50);
      notifications._save(list);
      events.emit('notifications:new', list[0]);
      events.emit('notifications:changed', list);
    },
  };

  // ── TASKS ─────────────────────────────────────────────────────

  var DEFAULT_TASKS = [
    { id: 't1', title: 'Complete IPv6 threat sweep', dept: 'security', assignee: 'athena', status: 'active', priority: 'high', created: Date.now() - 3600000 },
    { id: 't2', title: 'Find 5 new rental listings', dept: 'housing', assignee: 'nova', status: 'active', priority: 'high', created: Date.now() - 7200000 },
    { id: 't3', title: 'Research holographic sticker niche', dept: 'commerce', assignee: 'pixel', status: 'completed', priority: 'normal', created: Date.now() - 86400000 },
    { id: 't4', title: 'Sync weekly calendar', dept: 'productivity', assignee: 'calypso', status: 'completed', priority: 'normal', created: Date.now() - 86400000 },
    { id: 't5', title: 'Generate monthly budget report', dept: 'finance', assignee: 'greenbean', status: 'active', priority: 'normal', created: Date.now() - 1800000 },
    { id: 't6', title: 'Audit subscriptions for duplicate services', dept: 'finance', assignee: 'ledger', status: 'active', priority: 'normal', created: Date.now() - 3600000 },
  ];

  var tasks = {
    _load: function () { return state.get('tasks') || DEFAULT_TASKS.map(function (t) { return Object.assign({}, t); }); },
    _save: function (list) { state.set('tasks', list); },
    get: function (filter) {
      var list = tasks._load();
      if (filter && filter.dept) list = list.filter(function (t) { return t.dept === filter.dept; });
      if (filter && filter.status) list = list.filter(function (t) { return t.status === filter.status; });
      if (filter && filter.assignee) list = list.filter(function (t) { return t.assignee === filter.assignee; });
      return list;
    },
    add: function (task) {
      var list = tasks._load();
      task.id = 't' + Date.now();
      task.created = Date.now();
      task.status = task.status || 'active';
      list.unshift(task);
      tasks._save(list);
      events.emit('tasks:changed', list);
      activity.log({ agent: task.assignee ? (EMPLOYEES[task.assignee] || {}).name : 'System', dept: task.dept, msg: 'New task created: ' + task.title, source: 'user' });
    },
    complete: function (id) {
      var list = tasks._load();
      var t = list.find(function (t) { return t.id === id; });
      if (t) {
        t.status = 'completed';
        t.completedAt = Date.now();
        tasks._save(list);
        events.emit('tasks:changed', list);
        var emp = t.assignee ? (EMPLOYEES[t.assignee] || {}) : {};
        activity.log({ agent: emp.name || 'System', dept: t.dept, msg: 'Task completed: ' + t.title, source: 'user' });
      }
    },
    archive: function (id) {
      var list = tasks._load().filter(function (t) { return t.id !== id; });
      tasks._save(list);
      events.emit('tasks:changed', list);
    },
    count: function () {
      var list = tasks._load();
      return { total: list.length, active: list.filter(function (t) { return t.status === 'active'; }).length, completed: list.filter(function (t) { return t.status === 'completed'; }).length };
    },
  };

  // ── HELPERS ───────────────────────────────────────────────────

  function deptColor(deptId) { return (DEPARTMENTS[deptId] || {}).color || '#9b6bff'; }
  function empName(id) { return (EMPLOYEES[id] || {}).name || id; }
  function formatTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function formatRelTime(ts) {
    var delta = Math.floor((Date.now() - ts) / 1000);
    if (delta < 60)   return delta + 's ago';
    if (delta < 3600) return Math.floor(delta / 60) + 'm ago';
    return Math.floor(delta / 3600) + 'h ago';
  }

  // ── EXPORT ────────────────────────────────────────────────────

  global.COS = {
    version: '0.3.0',
    departments: DEPARTMENTS,
    employees: EMPLOYEES,
    deptEmployees: DEPT_EMPLOYEES,
    integrations: INTEGRATIONS,
    state: state,
    events: events,
    activity: activity,
    notifications: notifications,
    tasks: tasks,
    util: { deptColor: deptColor, empName: empName, formatTime: formatTime, formatRelTime: formatRelTime },
  };

})(window);
