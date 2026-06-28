function startAmbience() {
    initLightning();
    initParticles();
    initTooltips();
    initNavigation();
}

function initNavigation() {
    document.querySelectorAll('[data-href]').forEach(function (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function () {
            window.location.href = el.dataset.href;
        });
    });
}

function initTooltips() {
    const room = document.getElementById('room');
    if (!room) return;

    const tip = document.createElement('div');
    tip.id = 'roomTooltip';
    room.appendChild(tip);

    room.querySelectorAll('[data-tip]').forEach(function (el) {
        el.addEventListener('mouseenter', function () {
            tip.textContent = el.dataset.tip;
            tip.style.opacity = '1';
        });
        el.addEventListener('mousemove', function (e) {
            const rect = room.getBoundingClientRect();
            const x = e.clientX - rect.left + 14;
            const y = e.clientY - rect.top  - 38;
            tip.style.left = x + 'px';
            tip.style.top  = y + 'px';
        });
        el.addEventListener('mouseleave', function () {
            tip.style.opacity = '0';
        });
    });
}

function initLightning() {
    const flash = document.getElementById('lightning');
    if (!flash) return;

    function strike() {
        // Double-flash for realistic lightning
        flash.style.opacity = '.38';
        setTimeout(function () { flash.style.opacity = '0'; }, 65);
        setTimeout(function () {
            flash.style.opacity = '.6';
            setTimeout(function () { flash.style.opacity = '0'; }, 85);
        }, 130);

        // Schedule next strike at a random interval (7–22 seconds)
        setTimeout(strike, 7000 + Math.random() * 15000);
    }

    // First strike after 2–7 seconds
    setTimeout(strike, 2000 + Math.random() * 5000);
}

function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const count = 30;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'particle';

        // Random position anywhere in the 900×600 room
        p.style.left   = (15 + Math.random() * 870) + 'px';
        p.style.top    = (30 + Math.random() * 550) + 'px';

        // Random size 1–2.5px
        const size = 1 + Math.random() * 1.5;
        p.style.width  = size + 'px';
        p.style.height = size + 'px';

        // Spread animation start times so they don't all pulse together
        p.style.animationDuration = (5 + Math.random() * 10) + 's';
        p.style.animationDelay   = (-Math.random() * 12) + 's';

        container.appendChild(p);
    }
}
