// CyberCookieOS — Housing Scout Room JS
// Panel data, polling, Nova patrol movement

const RESULTS_URL    = "../data/housing_scout_v2_results.json";
const POLL_INTERVAL  = 10000;

function loadResults() {
    fetch(RESULTS_URL + "?cache=" + Date.now())
        .then(function (res) {
            if (!res.ok) throw new Error("No results file");
            return res.json();
        })
        .then(function (data) {
            updatePanel(data);
            updateTimestamp(data.generated_at || data.generated);
        })
        .catch(function () {
            setStatus("Waiting for Nova...");
        });
}

function updatePanel(data) {
    setStatus("Online");
    var listings = data.listings || data.ranked || [];
    setText("ah-totalListings", listings.length || data.total_listings || "—");
    var matches = listings.filter(function(l) { return l.verified || l.score >= 70; });
    setText("ah-totalMatches",  matches.length || data.total_matches || "—");
    var pets = listings.filter(function(l) { return l.pet_friendly; });
    setText("ah-petCount", pets.length || data.pet_friendly_count || "—");

    var best = data.best_fit || (listings.length ? listings[0] : null);
    if (best) {
        var rent = best.rent || best.price || 0;
        var max  = 2100;
        var diff = max - rent;
        setText("ah-budgetStat", diff >= 200 ? "✓ Comfortable" : diff >= 0 ? "~ Tight" : "✗ Over");
        updateBudgetBar(rent, max);
        setText("ah-bestName",  best.name || best.address || "—");
        setText("ah-bestScore", (best.score || "—") + "/100");
        setText("ah-bestCity",  best.city || best.location || "—");
        setText("ah-bestRent",  rent ? "$" + rent.toLocaleString() + "/mo" : "—");
    }

    var listEl = document.getElementById("ah-topList");
    if (listEl) {
        listEl.innerHTML = "";
        listings.slice(0, 5).forEach(function (item) {
            var div = document.createElement("div");
            div.className = "ah-listItem";
            var nameHtml = item.listing_url
                ? "<a class='ah-listLink' href='" + item.listing_url + "' target='_blank' rel='noopener'>" + (item.name || item.address || "Listing") + " ↗</a>"
                : (item.name || item.address || "Listing");
            var rent = item.rent || item.price || 0;
            div.innerHTML =
                "<span class='ah-listScore'>" + (item.score || "—") + "/100</span> " +
                nameHtml + "<br>" +
                "<span class='ah-listMeta'>$" + (rent ? rent.toLocaleString() : "—") +
                "/mo · " + (item.city || item.location || "—") +
                (item.pet_friendly ? " 🐾" : "") + "</span>";
            listEl.appendChild(div);
        });
    }
}

function updateBudgetBar(rent, maxRent) {
    var fill = document.getElementById("ah-budgetFill");
    if (!fill || !rent) return;
    var pct = Math.min(100, Math.round((rent / maxRent) * 100));
    fill.style.width = pct + "%";
    fill.style.background = pct > 90
        ? "linear-gradient(90deg, hotpink, #ff4488)"
        : pct > 75
        ? "linear-gradient(90deg, #ffcc44, #9b59b6)"
        : "linear-gradient(90deg, #7dff9c, #9b59b6)";
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
    if (el) el.textContent = value != null ? value : "—";
}

// ── NOVA PATROL MOVEMENT ────────────────────────────────────

var AH_WAYPOINTS = [
    { x: 115, y: 412 },
    { x: 210, y: 404 },
    { x: 305, y: 398 },
    { x: 390, y: 400 },
    { x: 460, y: 406 },
    { x: 255, y: 410 },
    { x: 340, y: 415 },
];

var ahCurrentWP = 3;

function initAgentPatrol() {
    var agent = document.getElementById("ah-agent");
    if (!agent) return;
    agent.style.transition = "left 2.6s cubic-bezier(.45,0,.55,1), top 1.3s ease-in-out";
    agent.style.willChange = "left, top, transform";
    ahPauseAndMove();
}

function ahPauseAndMove() {
    setTimeout(ahStep, 3000 + Math.random() * 4000);
}

function ahStep() {
    var agent  = document.getElementById("ah-agent");
    var sprite = document.getElementById("ah-agentSprite");
    if (!agent || !sprite) return;

    var next = ahCurrentWP;
    var tries = 0;
    while (next === ahCurrentWP && tries < 10) {
        next = Math.floor(Math.random() * AH_WAYPOINTS.length);
        tries++;
    }

    var wp          = AH_WAYPOINTS[next];
    var currentLeft = parseFloat(agent.style.left) || 390;
    var goingRight  = wp.x > currentLeft;

    agent.style.transition = "none";
    agent.style.transform  = goingRight ? "" : "scaleX(-1)";
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            agent.style.transition = "left 2.6s cubic-bezier(.45,0,.55,1), top 1.3s ease-in-out";
            agent.style.left = wp.x + "px";
            agent.style.top  = wp.y + "px";
        });
    });

    ahCurrentWP = next;
    ahPauseAndMove();
}

// ── RUN AGENT BUTTON ────────────────────────────────────────

function initRunButton() {
    var btn = document.getElementById("ah-runAgent");
    if (!btn) return;
    btn.addEventListener("click", function () {
        btn.textContent = "cd agents/housing_scout_v2";
        setTimeout(function () {
            btn.textContent = "python housing_scout_browser.py";
            btn.style.fontSize = "8px";
            btn.style.letterSpacing = "0";
        }, 1200);
        setTimeout(function () {
            btn.textContent = "▸ Run Housing Scout";
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
