// CyberCookieOS — Apartment Hunter Room JS
// Panel data, polling, Agent 002 patrol movement

// ── RESULTS PANEL ───────────────────────────────────────────

const RESULTS_URL    = "../data/apartment_results.json";
const POLL_INTERVAL  = 10000;

function loadResults() {
    fetch(RESULTS_URL + "?cache=" + Date.now())
        .then(function (res) {
            if (!res.ok) throw new Error("No results file");
            return res.json();
        })
        .then(function (data) {
            updatePanel(data);
            updateTimestamp(data.generated);
        })
        .catch(function () {
            setStatus("Waiting for agent...");
        });
}

function updatePanel(data) {
    setStatus("Online");
    setText("ah-totalListings", data.total_listings);
    setText("ah-totalMatches",  data.total_matches);
    setText("ah-petCount",      data.pet_friendly_count);

    if (data.best_fit) {
        var rent = data.best_fit.rent;
        var max  = data.settings_snapshot ? data.settings_snapshot.max_rent : 2100;
        var diff = max - rent;
        setText("ah-budgetStat",
            diff >= 200 ? "✓ Comfortable" : diff >= 0 ? "~ Tight" : "✗ Over");
        updateBudgetBar(rent, max);
    }

    if (data.best_fit) {
        var b = data.best_fit;
        setText("ah-bestName",  b.name);
        setText("ah-bestScore", b.score + "/100");
        setText("ah-bestCity",  b.city + " — " + b.neighborhood);
        setText("ah-bestRent",  "$" + b.rent.toLocaleString() + "/mo  |  " + b.bedrooms + " BR");
    }

    // Top picks — names are clickable links when listing_url exists
    var listEl = document.getElementById("ah-topList");
    if (listEl && data.ranked) {
        listEl.innerHTML = "";
        data.ranked.slice(0, 5).forEach(function (apt) {
            var div = document.createElement("div");
            div.className = "ah-listItem";

            var nameHtml;
            if (apt.listing_url) {
                nameHtml = "<a class='ah-listLink' href='" + apt.listing_url +
                           "' target='_blank' rel='noopener'>" + apt.name + " ↗</a>";
            } else {
                nameHtml = apt.name;
            }

            div.innerHTML =
                "<span class='ah-listScore'>" + apt.score + "/100</span> " +
                nameHtml + "<br>" +
                "<span class='ah-listMeta'>$" + apt.rent.toLocaleString() +
                "/mo · " + apt.city + " · " + apt.property_type +
                (apt.pet_friendly ? " 🐾" : "") + "</span>";

            listEl.appendChild(div);
        });
    }
}

function updateBudgetBar(rent, maxRent) {
    var fill = document.getElementById("ah-budgetFill");
    if (!fill) return;
    var pct = Math.min(100, Math.round((rent / maxRent) * 100));
    fill.style.width = pct + "%";
    if (pct > 90) {
        fill.style.background = "linear-gradient(90deg, hotpink, #ff4488)";
    } else if (pct > 75) {
        fill.style.background = "linear-gradient(90deg, #ffcc44, #9b59b6)";
    } else {
        fill.style.background = "linear-gradient(90deg, #7dff9c, #9b59b6)";
    }
}

function updateTimestamp(ts) {
    var el = document.getElementById("ah-lastUpdate");
    if (el) el.textContent = "Updated: " + (ts || "—");
}

function setStatus(msg) {
    var el = document.getElementById("ah-status");
    if (el) el.textContent = msg;
}

function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ── AGENT 002 PATROL MOVEMENT ────────────────────────────────
//
// Agent 002 walks between waypoints inside the room floor area.
// Room is 900×600px. Agent div is 95×120px. Floor ~y 388–440.
// Avoid: exit arch (left edge x < 70), rightmost area (x > 660).
//
// Movement uses CSS transition on left/top (added via JS so the
// initial static placement in CSS is not slowed down).
// The sprite flips horizontally (scaleX on the container) to face
// the direction of travel without interfering with the ahAgentBreathe
// animation which lives on the inner #ah-agentSprite element.

var AH_WAYPOINTS = [
    { x: 115, y: 412 },   // near filing cabinet
    { x: 210, y: 404 },   // in front of map, left
    { x: 305, y: 398 },   // mid-floor toward desk
    { x: 390, y: 400 },   // desk area
    { x: 460, y: 406 },   // near coffee / plant
    { x: 255, y: 410 },   // center floor, paused look
    { x: 340, y: 415 },   // slightly back, near chair
];

var ahCurrentWP   = 3;   // start near desk (matches CSS initial left:380)
var ahMoving      = false;

function initAgentPatrol() {
    var agent = document.getElementById("ah-agent");
    if (!agent) return;

    // Smooth glide — only transition position, not transform (flip is instant)
    agent.style.transition = "left 2.6s cubic-bezier(.45,0,.55,1), top 1.3s ease-in-out";
    agent.style.willChange = "left, top, transform";

    ahPauseAndMove();
}

function ahPauseAndMove() {
    // Idle pause: 3–7 s
    var pause = 3000 + Math.random() * 4000;
    setTimeout(ahStep, pause);
}

function ahStep() {
    var agent  = document.getElementById("ah-agent");
    var sprite = document.getElementById("ah-agentSprite");
    if (!agent || !sprite) return;

    // Pick a different random waypoint
    var next = ahCurrentWP;
    var tries = 0;
    while (next === ahCurrentWP && tries < 10) {
        next = Math.floor(Math.random() * AH_WAYPOINTS.length);
        tries++;
    }

    var wp          = AH_WAYPOINTS[next];
    var currentLeft = parseFloat(agent.style.left) || 390;

    // Flip the container to face direction of travel (instant, no transition)
    var goingRight = wp.x > currentLeft;
    agent.style.transition = "none";                           // drop transition briefly
    agent.style.transform  = goingRight ? "" : "scaleX(-1)";  // flip instantly
    // Re-enable position transition after the next paint
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            agent.style.transition =
                "left 2.6s cubic-bezier(.45,0,.55,1), top 1.3s ease-in-out";
            agent.style.left = wp.x + "px";
            agent.style.top  = wp.y + "px";
        });
    });

    ahCurrentWP = next;
    ahPauseAndMove();
}

// ── BLINK ANIMATION (JS-driven eyelid) ──────────────────────
// The sprite is a static PNG so blinking is simulated via the
// headset LED animation (CSS ahLedBlink already handles that).
// No additional DOM manipulation needed.

// ── RUN AGENT BUTTON ────────────────────────────────────────

function initRunButton() {
    var btn = document.getElementById("ah-runAgent");
    if (!btn) return;
    btn.addEventListener("click", function () {
        btn.textContent = "cd agents/apartment_hunter";
        setTimeout(function () {
            btn.textContent = "python apartment_hunter.py";
            btn.style.fontSize = "8px";
            btn.style.letterSpacing = "0";
        }, 1200);
        setTimeout(function () {
            btn.textContent = "▸ Run Agent";
            btn.style.fontSize = "";
            btn.style.letterSpacing = "";
        }, 5000);
    });
}

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
    loadResults();
    setInterval(loadResults, POLL_INTERVAL);
    initRunButton();
    initAgentPatrol();
});
