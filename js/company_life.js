/* =============================================
   company_life.js — Ambient Activity Engine
   Simulates continuous background work per
   department, including what happened while
   the CEO was in another room.
   ES5: var only, no arrow functions, no const/let
============================================= */
var LIFE = (function () {

    /* ── Agent task pools ──────────────────── */
    var _A = {
        security: {
            athena:   ['Scanning suspicious IPs...', 'Running packet analysis...', 'Correlating attack patterns...', 'Building investigation report...', 'Reviewing SIEM alerts...', 'Comparing threat signatures...', 'Updating CASE #0042...', 'Checking endpoint telemetry...', 'Validating indicators of compromise...', 'Cross-referencing threat intel...'],
            nimbus:   ['Monitoring log feeds...', 'Analyzing failed auth attempts...', 'Flagging anomaly patterns...', 'Comparing activity baselines...', 'Generating anomaly digest...', 'Watching beacon intervals...', 'Reviewing unusual traffic...', 'Building anomaly report...'],
            sentinel: ['Validating firewall rules...', 'Monitoring perimeter...', 'Auditing port access logs...', 'Scanning access timestamps...', 'Updating IP blocklist...', 'Testing rule change impact...', 'Reviewing VPN connections...', 'Confirming zone isolation...']
        },
        career: {
            nova:     ['Scanning LinkedIn...', 'Searching Dice.com...', 'Filtering remote-eligible roles...', 'Comparing salary ranges...', 'Building job shortlist...', 'Reviewing recruiter messages...', 'Scoring job fit by criteria...', 'Waiting on Finance salary estimate...', 'Preparing shortlist for CEO review...', 'Checking new postings...'],
            resuMate: ['Analyzing ATS keywords...', 'Optimizing resume sections...', 'Comparing job description gaps...', 'Generating tailored bullets...', 'Checking format compatibility...', 'Finalizing cover letter draft...', 'Scoring ATS match...', 'Waiting on job spec from Nova...', 'Running keyword density check...'],
            scoutX:   ['Mapping regional opportunities...', 'Comparing NJ vs PA market...', 'Calculating demand index...', 'Pulling certification ROI data...', 'Analyzing employer reputation...', 'Researching hiring velocity...', 'Building region report...', 'Projecting 90-day market outlook...', 'Flagging high-growth corridors...']
        },
        commerce: {
            pixel:   ['Scanning TikTok trends...', 'Calculating trend scores...', 'Comparing product velocity...', 'Flagging rising niches...', 'Updating hotness index...', 'Filtering saturated markets...', 'Building trend report...', 'Identifying competitor gaps...', 'Watching viral signals...'],
            etsybot: ['Syncing listing data...', 'Monitoring order queue...', 'Checking review scores...', 'Updating listing tags...', 'Analyzing search ranking...', 'Preparing inventory report...', 'Optimizing listing SEO...', 'Flagging stale listings...', 'Processing new order...'],
            spark:   ['Drafting hook scripts...', 'Scheduling content calendar...', 'Writing product captions...', 'Generating video concepts...', 'Reviewing engagement data...', 'Queuing next post...', 'Writing trend narrative...', 'Analyzing competitor content...', 'Building tomorrow\'s drop...'],
            forge:   ['Processing POD orders...', 'Checking print queue...', 'Verifying shipping labels...', 'Monitoring fulfillment status...', 'Updating design library...', 'Flagging production delays...', 'Closing order batch...', 'Waiting on Finance budget approval...', 'Confirming shipping partner...']
        },
        productivity: {
            calypso: ['Protecting focus blocks...', 'Building tomorrow\'s schedule...', 'Resolving calendar conflicts...', 'Briefing prep in progress...', 'Blocking distraction windows...', 'Syncing meeting requests...', 'Coordinating cross-dept schedule...', 'Reviewing CEO availability...', 'Locking priority time...'],
            echo:    ['Processing inbox queue...', 'Prioritizing action items...', 'Drafting response templates...', 'Routing CEO-relevant items...', 'Flagging urgent messages...', 'Clearing backlog...', 'Summarizing unread threads...', 'Waiting on Security maintenance window...', 'Logging incoming requests...'],
            atlas:   ['Mapping task dependencies...', 'Reorganizing project board...', 'Assigning cross-dept tasks...', 'Tracking milestone progress...', 'Generating weekly digest...', 'Updating task graph...', 'Closing completed items...', 'Building next-sprint plan...', 'Flagging cross-dept blockers...'],
            memo:    ['Setting deadline reminders...', 'Sending follow-up alerts...', 'Checking overdue items...', 'Preparing reminder digest...', 'Logging completed tasks...', 'Scheduling next review...', 'Routing time-sensitive alerts...', 'Confirming delivery with Atlas...', 'Queuing tonight\'s reminders...']
        },
        finance: {
            greenbean: ['Running cash flow analysis...', 'Approving expense items...', 'Reconciling transactions...', 'Projecting monthly balance...', 'Reviewing pending bills...', 'Building weekly summary...', 'Flagging unusual charges...', 'Waiting on Career salary request...', 'Preparing daily report...'],
            ledger:    ['Categorizing expenses...', 'Reconciling bill queue...', 'Checking recurring charges...', 'Flagging anomalous spend...', 'Generating ledger report...', 'Closing weekly books...', 'Matching receipts to transactions...', 'Preparing audit trail...', 'Reviewing subscription charges...'],
            penny:     ['Analyzing budget usage...', 'Simulating relocation costs...', 'Comparing spend vs plan...', 'Running what-if scenarios...', 'Flagging category overruns...', 'Building budget forecast...', 'Projecting end-of-month balance...', 'Reviewing subscription costs...', 'Stress-testing housing budget...'],
            vault:     ['Calculating savings rate...', 'Projecting emergency fund growth...', 'Reviewing active subscriptions...', 'Comparing savings vs 6-month goal...', 'Flagging unnecessary charges...', 'Generating savings report...', 'Optimizing contribution schedule...', 'Preparing financial health summary...']
        }
    };

    /* ── Room activity logs (what happened today) ── */
    var _ACT = {
        security: [
            'Athena blocked suspicious IP 203.45.12.8',
            'Nimbus flagged 3 failed login attempts',
            'Sentinel validated firewall rule update',
            'Threat scan complete — 0 critical findings',
            'Athena added evidence to CASE #0042',
            'Nimbus anomaly digest sent to Mission Control',
            'Sentinel updated IP blocklist (+12 entries)',
            'Athena correlated two attack chain patterns',
            'Perimeter status reviewed — all zones secure',
            'Nimbus escalated beacon anomaly to Athena'
        ],
        career: [
            'Nova found 5 new openings matching criteria',
            'Resu-Mate optimized resume for service desk role',
            'Scout-X compared NJ vs PA salary bands',
            'Nova shortlisted Lockheed Martin opening',
            'Resu-Mate generated tailored cover letter',
            'Scout-X flagged CompTIA A+ as high-ROI cert',
            'Nova sent Finance salary estimate request',
            'Career Intel briefing sent to Mission Control',
            'Resu-Mate ATS score improved: 68% → 81%',
            'Scout-X identified 3 high-demand roles in region'
        ],
        commerce: [
            'Pixel identified 3 trending product niches',
            'EtsyBot added 2 new listings to store',
            'Spark scheduled tomorrow\'s TikTok content',
            'Forge processed 4 pending POD orders',
            'Pixel flagged "minimalist tech" as rising trend',
            'Spark completed content for weekend drop',
            'EtsyBot updated 6 listing tags for SEO',
            'Commerce revenue report sent to Finance',
            'Forge confirmed all orders shipped — queue clear',
            'Spark engagement rate up 12% this week'
        ],
        productivity: [
            'Calypso protected 3h focus block for CEO',
            'Echo cleared 14 inbox items — 2 flagged for CEO',
            'Atlas reorganized task board — 3 tasks closed',
            'Memo sent deadline alert: review due Friday',
            'Calypso blocked interview slot: Friday 10 AM',
            'Echo routed Finance request to CEO approval queue',
            'Atlas flagged cross-dept blocker — awaiting Career',
            'Productivity daily briefing delivered to CEO',
            'Memo sent follow-up: Security maintenance window',
            'Atlas confirmed 5 tasks completed across company'
        ],
        finance: [
            'Greenbean reconciled today\'s transactions',
            'Ledger categorized $240 in new expenses',
            'Penny updated budget forecast for July',
            'Vault savings rate calculated: 18.4%',
            'Greenbean approved laptop purchase request',
            'Penny flagged housing budget at 72% — monitor',
            'Vault subscription audit: $12/mo freed up',
            'Finance summary sent to Mission Control',
            'Ledger closed weekly books — net positive',
            'Penny confirmed relocation budget is feasible'
        ]
    };

    /* ── Inter-department message templates ── */
    var _IDM = [
        { from: 'Career',       to: 'Finance',      msg: 'Salary estimate requested for 3 shortlisted roles.' },
        { from: 'Finance',      to: 'Career',       msg: 'Budget analysis complete. Relocation feasible at $52K.' },
        { from: 'Security',     to: 'Productivity', msg: 'Maintenance window requested: Sunday 02:00–04:00.' },
        { from: 'Commerce',     to: 'Finance',      msg: 'Projected Etsy revenue: +$140 this week.' },
        { from: 'Finance',      to: 'Commerce',     msg: 'POD production budget approved for Q3.' },
        { from: 'Security',     to: 'Commerce',     msg: 'Brand scan complete. No impersonation detected.' },
        { from: 'Productivity', to: 'Career',       msg: 'Interview slot blocked: Friday 10:00 AM.' },
        { from: 'Finance',      to: 'Career',       msg: 'Salary benchmark: $52K median for target roles.' },
        { from: 'Career',       to: 'Productivity', msg: '3 interviews scheduled. Calendar sync requested.' },
        { from: 'Commerce',     to: 'Productivity', msg: 'Content calendar blocked for filming: Saturday.' },
        { from: 'Security',     to: 'Finance',      msg: 'Software license audit: 2 unused licenses flagged.' },
        { from: 'Productivity', to: 'Finance',      msg: 'Budget review meeting scheduled for Thursday.' },
        { from: 'Finance',      to: 'Security',     msg: 'Tool subscription renewed. License file attached.' },
        { from: 'Career',       to: 'Security',     msg: 'Background check vendor confirmed for new hire.' }
    ];

    /* ── Utilities ─────────────────────────── */
    function _pad(n) { return n < 10 ? '0' + n : '' + n; }
    function _fmt(ts) { var d = new Date(ts); return _pad(d.getHours()) + ':' + _pad(d.getMinutes()); }
    function _rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function _key(dept, s) { return 'cos.life.' + dept + '.' + s; }

    function _loadLog(dept) {
        var raw = COS.state.get(_key(dept, 'log'));
        try { return JSON.parse(raw) || []; } catch (e) { return []; }
    }

    function _saveLog(dept, log) {
        if (log.length > 40) log = log.slice(log.length - 40);
        COS.state.set(_key(dept, 'log'), JSON.stringify(log));
    }

    function _push(dept, msg, type) {
        var log = _loadLog(dept);
        log.push({ ts: Date.now(), msg: msg, type: type || 'work' });
        _saveLog(dept, log);
        return log;
    }

    /* Seed a brand-new room with entries spanning the past ~6 hours */
    function _seed(dept) {
        var pool = _ACT[dept] || [];
        var now = Date.now();
        var idmPool = _IDM.filter(function (m) {
            var d = dept.toLowerCase();
            return m.from.toLowerCase() === d || m.to.toLowerCase() === d;
        });
        var log = [];
        /* 6 work events at plausible intervals throughout the day */
        var offsets = [22500000, 16200000, 10800000, 6300000, 3600000, 1800000];
        for (var i = 0; i < offsets.length; i++) {
            log.push({ ts: now - offsets[i], msg: _rnd(pool), type: 'work' });
        }
        /* 1 inter-dept message mid-morning */
        if (idmPool.length) {
            var idm = _rnd(idmPool);
            log.push({ ts: now - 10800000, msg: idm.from + ' → ' + idm.to + ': ' + idm.msg, type: 'idm' });
        }
        log.sort(function (a, b) { return a.ts - b.ts; });
        _saveLog(dept, log);
    }

    /* Generate activity that "happened" while CEO was in another room */
    function _simPast(dept, lastVisit) {
        var now = Date.now();
        var elapsed = now - lastVisit;
        if (elapsed < 90000) return; /* < 90 seconds — no need */
        var pool = _ACT[dept] || [];
        var log = _loadLog(dept);
        var t = lastVisit;
        var interval = 210000; /* avg 3.5 min between events */
        while (t < now - 60000) {
            t += interval + Math.floor(Math.random() * 90000);
            if (t >= now) break;
            log.push({ ts: t, msg: _rnd(pool), type: 'work' });
        }
        /* Add inter-dept message if elapsed > 10 minutes */
        if (elapsed > 600000) {
            var idmPool = _IDM.filter(function (m) {
                var d = dept.toLowerCase();
                return m.from.toLowerCase() === d || m.to.toLowerCase() === d;
            });
            if (idmPool.length) {
                var idm = _rnd(idmPool);
                var midTs = lastVisit + Math.floor(elapsed * 0.5);
                log.push({ ts: midTs, msg: idm.from + ' → ' + idm.to + ': ' + idm.msg, type: 'idm' });
            }
        }
        log.sort(function (a, b) { return a.ts - b.ts; });
        _saveLog(dept, log);
    }

    /* Render the most recent 10 log entries into the activity feed element */
    function _renderLog(dept, elId) {
        var el = document.getElementById(elId);
        if (!el) return;
        var log = _loadLog(dept);
        var recent = log.slice(-10).reverse();
        var html = '';
        for (var i = 0; i < recent.length; i++) {
            var e = recent[i];
            var cls = 'al-row' + (e.type === 'idm' ? ' al-idm' : '');
            html += '<div class="' + cls + '"><span class="al-ts">' + _fmt(e.ts) + '</span><span class="al-msg">' + e.msg + '</span></div>';
        }
        if (!html) html = '<div class="al-empty">Initializing...</div>';
        el.innerHTML = html;
    }

    /* Set task text to one or multiple DOM elements */
    function _setTask(elSpec, text) {
        /* elSpec is a string ID or array of IDs */
        var ids = typeof elSpec === 'string' ? [elSpec] : elSpec;
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.textContent = text;
        }
    }

    /* ── Main entry point ─────────────────── */
    function boot(dept, opts) {
        /*
         opts.tasks    — object: { agentKey: 'elementId' or ['id1','id2'] }
         opts.logEl    — string: element ID for activity feed
        */
        if (!opts) opts = {};
        var agentPools = _A[dept] || {};

        /* 1. Simulate or seed history */
        var lastRaw = COS.state.get(_key(dept, 'lastVisit'));
        var lastVisit = lastRaw ? parseInt(lastRaw, 10) : 0;
        if (lastVisit > 0) {
            _simPast(dept, lastVisit);
        } else {
            _seed(dept);
        }
        COS.state.set(_key(dept, 'lastVisit'), String(Date.now()));

        /* 2. Render activity log immediately */
        if (opts.logEl) _renderLog(dept, opts.logEl);

        /* 3. Set initial agent task text */
        var taskMap = opts.tasks || {};
        for (var aid in taskMap) {
            var pool = agentPools[aid];
            if (pool && pool.length) _setTask(taskMap[aid], _rnd(pool));
        }

        /* 4. Rotate agent tasks every 45 seconds */
        setInterval(function () {
            for (var agentId in taskMap) {
                var p = agentPools[agentId];
                if (p && p.length) _setTask(taskMap[agentId], _rnd(p));
            }
        }, 45000);

        /* 5. Add live activity log entry every 2–4 minutes */
        function _liveEntry() {
            var pool = _ACT[dept] || [];
            if (pool.length) _push(dept, _rnd(pool), 'work');
            if (opts.logEl) _renderLog(dept, opts.logEl);
            setTimeout(_liveEntry, 120000 + Math.floor(Math.random() * 120000));
        }
        setTimeout(_liveEntry, 90000 + Math.floor(Math.random() * 90000));

        /* 6. Add inter-dept message every 5–8 minutes */
        var idmPool = _IDM.filter(function (m) {
            var d = dept.toLowerCase();
            return m.from.toLowerCase() === d || m.to.toLowerCase() === d;
        });
        if (idmPool.length) {
            function _liveIDM() {
                var m = _rnd(idmPool);
                _push(dept, m.from + ' → ' + m.to + ': ' + m.msg, 'idm');
                if (opts.logEl) _renderLog(dept, opts.logEl);
                if (window.COS && COS.events) {
                    COS.events.emit('life:interdept', { from: m.from, to: m.to, msg: m.msg });
                }
                setTimeout(_liveIDM, 300000 + Math.floor(Math.random() * 180000));
            }
            setTimeout(_liveIDM, 300000 + Math.floor(Math.random() * 120000));
        }
    }

    return { boot: boot };

}());
