// CyberCookieOS — Career Intelligence Center Room JS
// Three-agent patrol (Nova/Resu-Mate/Scout-X), panel stats, room data

var CIC_RESULTS_URL   = '../data/career_intel_results.json';
var CIC_POLL_INTERVAL = 15000;

function cicLoadResults() {
  fetch(CIC_RESULTS_URL + '?cache=' + Date.now())
    .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
    .then(function (data) { cicUpdatePanel(data); })
    .catch(function () { /* backend not connected — panel uses static defaults */ });
}

function cicUpdatePanel(data) {
  var setText = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  if (data.jobs_found)  setText('cic-jobsFound', data.jobs_found);
  if (data.top_match) {
    setText('cic-stat-topMatch', data.top_match + '%');
    setText('cic-rm-score',      data.top_match + '%');
  }
  if (data.best) {
    setText('cic-best-title',   data.best.title   || '—');
    setText('cic-best-company', data.best.company || '—');
    setText('cic-best-salary',  data.best.salary ? '$' + Number(data.best.salary).toLocaleString() + '/yr' : '—');
    setText('cic-best-match',   '● ' + (data.best.match || '?') + '% MATCH');
    setText('cic-rm-job',       data.best.title || '—');
  }
}

// ── THREE-SPRITE PATROL ───────────────────────────────────────

var CIC_NOVA_WP    = [{ x:138,y:415 },{ x:210,y:408 },{ x:300,y:412 },{ x:175,y:420 }];
var CIC_RESU_WP    = [{ x:420,y:418 },{ x:498,y:412 },{ x:458,y:422 },{ x:530,y:415 }];
var CIC_SCOUTX_WP  = [{ x:660,y:418 },{ x:718,y:412 },{ x:688,y:422 }];

function cicInitSprite(spriteId, waypoints) {
  var el = document.getElementById(spriteId);
  if (!el) return;
  el.style.position   = 'absolute';
  el.style.transition = 'left 2.8s cubic-bezier(.45,0,.55,1), top 1.4s ease-in-out';
  var wp0 = waypoints[0];
  el.style.left = wp0.x + 'px';
  el.style.top  = wp0.y + 'px';

  function step() {
    var next = Math.floor(Math.random() * waypoints.length);
    var wp   = waypoints[next];
    el.style.left = wp.x + 'px';
    el.style.top  = wp.y + 'px';
    setTimeout(step, 3500 + Math.random() * 4000);
  }
  setTimeout(step, 1200 + Math.random() * 2000);
}

// ── MINI-STAT SYNC (monitor counters) ───────────────────────

function cicUpdateMiniStats() {
  if (typeof COS === 'undefined') return;
  var saved    = (COS.state.get('cic.jobs.saved')   || []).length;
  var statuses = COS.state.get('cic.jobs.statuses') || {};
  var keys     = Object.keys(statuses);
  var applied  = keys.filter(function (k) { return statuses[k] === 'applied'; }).length;
  var interv   = keys.filter(function (k) {
    return statuses[k] === 'interview_scheduled' || statuses[k] === 'interview_complete';
  }).length;
  var offers   = keys.filter(function (k) { return statuses[k] === 'offer'; }).length;

  var setText = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  setText('cic-mn-saved',       saved);
  setText('cic-mn-applied',     applied);
  setText('cic-mn-interviews',  interv);
  setText('cic-mn-offers',      offers);
  setText('cic-stat-saved',     saved);
  setText('cic-stat-applied',   applied);
  setText('cic-stat-interviews',interv);

  // Pulse Resu-Mate sprite when stats change
  var rm = document.getElementById('cic-sp-resu');
  if (rm) {
    rm.classList.add('cic-sprite-working');
    setTimeout(function () { rm.classList.remove('cic-sprite-working'); }, 1400);
  }
}

// ── LIVE FEED TICKER (Nova's main monitor) ─────────────────

var CIC_FEED_MSGS = [
  { t:'● Help Desk — TechPath Solutions — $42k',      c:'cic-fi-hot' },
  { t:'● SOC Analyst — Comcast — $55k',               c:'cic-fi-new' },
  { t:'● Remote IT — Conduent — $43k',                c:'cic-fi-rem' },
  { t:'● NOC Tech — GTT Communications — $48k',       c:'cic-fi-new' },
  { t:'● Systems Admin — Cooper Health — $58k',       c:'cic-fi-hot' },
  { t:'● Junior Security — Unisys — $60k',            c:'cic-fi-new' },
  { t:'● M365 Support — CDW — $50k',                  c:'cic-fi-rem' },
  { t:'● Cloud Support — Rackspace — $62k',           c:'cic-fi-rem' },
  { t:'● Remote SOC Jr — Secureworks — $58k',         c:'cic-fi-hot' },
  { t:'● IT Ops — Jefferson Health — $54k',           c:'cic-fi-new' },
];
var _cicFeedIdx = 0;

function cicTickFeed() {
  var feed = document.getElementById('cic-novaFeed');
  if (!feed) return;
  var msg = CIC_FEED_MSGS[_cicFeedIdx % CIC_FEED_MSGS.length];
  _cicFeedIdx++;

  var div = document.createElement('div');
  div.className   = 'cic-feedItem ' + msg.c;
  div.textContent = msg.t;
  feed.insertBefore(div, feed.firstChild);
  while (feed.children.length > 5) feed.removeChild(feed.lastChild);
}

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  cicLoadResults();
  setInterval(cicLoadResults,     CIC_POLL_INTERVAL);
  setInterval(cicUpdateMiniStats, 6000);
  setInterval(cicTickFeed,        4500);

  cicInitSprite('cic-sp-nova',   CIC_NOVA_WP);
  cicInitSprite('cic-sp-resu',   CIC_RESU_WP);
  cicInitSprite('cic-sp-scoutx', CIC_SCOUTX_WP);

  cicUpdateMiniStats();
  setTimeout(cicTickFeed, 2000);

  // Wire the "RUN NOVA SCOUT" button in right panel to the search scout button
  var runBtn = document.getElementById('cic-runNovaBtn');
  if (runBtn) {
    runBtn.addEventListener('click', function () {
      var scoutBtn = document.getElementById('sp-scoutBtn');
      if (scoutBtn) {
        scoutBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { scoutBtn.click(); }, 400);
      }
    });
  }

  // Pulse Nova sprite when search runs
  if (typeof COS !== 'undefined') {
    COS.events.on('cos:activity', function (e) {
      if (!e || (e.agent !== 'Nova' && e.agent !== 'Scout-X')) return;
      var id = e.agent === 'Scout-X' ? 'cic-sp-scoutx' : 'cic-sp-nova';
      var sp = document.getElementById(id);
      if (sp) {
        sp.classList.add('cic-sprite-working');
        setTimeout(function () { sp.classList.remove('cic-sprite-working'); }, 2500);
      }
    });
  }
});
