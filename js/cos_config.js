/* =============================================
   cos_config.js — Company Config Loader
   Fetches data/company_config.json via API
   and exposes it as COS.config

   ES5: var only, no arrow functions, no const/let
============================================= */
(function () {

    if (!window.COS) window.COS = {};

    /* Default config used until server responds */
    var _defaults = {
        career: { minimum_salary: 40000, remote_preference: 'hybrid', application_weekly_goal: 3 },
        finance: { emergency_fund_goal: 5000 },
        productivity: { focus_hours: { start: '09:00', end: '17:00' } },
        commerce: { approval_required_before_publishing: true, budget_limit_per_item: 50 },
        global: {
            ceo_approval_required_for_external_actions: true,
            daily_briefing_time: '08:00',
            timezone: 'America/New_York',
            autonomous_routines_enabled: false
        }
    };

    var _config = _defaults;
    var _loaded = false;
    var _callbacks = [];

    /* Dot-path getter: COS.config.get('career.minimum_salary') */
    function _get(dotPath, fallback) {
        var parts = dotPath.split('.');
        var cur = _config;
        for (var i = 0; i < parts.length; i++) {
            if (cur == null || typeof cur !== 'object') return fallback !== undefined ? fallback : null;
            cur = cur[parts[i]];
        }
        return cur !== undefined ? cur : (fallback !== undefined ? fallback : null);
    }

    function _load() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/config', true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    _config = data;
                    _loaded = true;
                    for (var i = 0; i < _callbacks.length; i++) {
                        try { _callbacks[i](_config); } catch (e) {}
                    }
                    _callbacks = [];
                    if (window.COS && COS.events) {
                        COS.events.emit('config:loaded', _config);
                    }
                } catch (e) {
                    /* server returned invalid JSON — keep defaults */
                }
            }
            /* On error keep defaults silently */
        };
        xhr.send();
    }

    /* Run callback once config is loaded, or immediately if already loaded */
    function _onReady(fn) {
        if (_loaded) { fn(_config); } else { _callbacks.push(fn); }
    }

    COS.config = {
        get: _get,
        all: function () { return _config; },
        isLoaded: function () { return _loaded; },
        onReady: _onReady,
        reload: _load
    };

    /* Auto-load on script execution */
    _load();

}());
