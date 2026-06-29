/* =============================================
   cos_data_status.js — Data Readiness System
   Fetches /api/status and renders SIMULATED /
   PARTIAL REAL / REAL badges in each department.

   Usage:
     DataStatus.init()        — call on page load
     DataStatus.forDept(id)  — returns 'simulated', 'partial', 'real'
     DataStatus.renderBadge(deptId, elementId)

   ES5: var only, no arrow functions, no const/let
============================================= */
var DataStatus = (function () {

    var _status = {};
    var _loaded = false;
    var _callbacks = [];

    var _LABELS = {
        simulated: '● SIMULATED',
        partial:   '◑ PARTIAL REAL',
        real:      '● REAL DATA'
    };

    var _CLASSES = {
        simulated: 'dsb-simulated',
        partial:   'dsb-partial',
        real:      'dsb-real'
    };

    /* Dept ID normalisation */
    var _DEPT_MAP = {
        security:     'security',
        hq:           'security',
        career:       'career',
        housing:      'career',
        commerce:     'commerce',
        productivity: 'productivity',
        finance:      'finance'
    };

    function _normalise(deptId) {
        return _DEPT_MAP[deptId] || deptId;
    }

    function _load() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/status', true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    _status = data.status || {};
                    _loaded = true;
                    /* Run queued callbacks */
                    for (var i = 0; i < _callbacks.length; i++) {
                        try { _callbacks[i](_status); } catch (e) {}
                    }
                    _callbacks = [];
                    /* Auto-render any badge elements already in DOM */
                    _autoRender();
                    if (window.COS && COS.events) {
                        COS.events.emit('datastatus:loaded', _status);
                    }
                } catch (e) {}
            }
            /* On error all depts remain unknown → show SIMULATED */
        };
        xhr.send();
    }

    /* Render badge into a DOM element by ID */
    function renderBadge(deptId, elId) {
        var dept = _normalise(deptId);
        var el = document.getElementById(elId);
        if (!el) return;
        var s = _status[dept] || 'simulated';
        el.className = 'data-status-badge ' + (_CLASSES[s] || _CLASSES.simulated);
        el.textContent = _LABELS[s] || _LABELS.simulated;
        el.title = _getTooltip(dept, s);
    }

    /* Scan DOM for [data-dept] on .data-status-badge elements */
    function _autoRender() {
        var badges = document.querySelectorAll('.data-status-badge[data-dept]');
        for (var i = 0; i < badges.length; i++) {
            var el = badges[i];
            var dept = _normalise(el.getAttribute('data-dept'));
            var s = _status[dept] || 'simulated';
            el.className = 'data-status-badge ' + (_CLASSES[s] || _CLASSES.simulated);
            el.textContent = _LABELS[s] || _LABELS.simulated;
            el.title = _getTooltip(dept, s);
        }
    }

    function _getTooltip(dept, s) {
        if (s === 'real')      return dept.toUpperCase() + ': All data sources connected.';
        if (s === 'partial')   return dept.toUpperCase() + ': Some real data connected, some simulated.';
        return dept.toUpperCase() + ': Running on simulated data. Connect sources in data/data_sources.json.';
    }

    function forDept(deptId) {
        return _status[_normalise(deptId)] || 'simulated';
    }

    function onReady(fn) {
        if (_loaded) { fn(_status); } else { _callbacks.push(fn); }
    }

    function init() {
        _load();
    }

    return {
        init:        init,
        forDept:     forDept,
        renderBadge: renderBadge,
        onReady:     onReady,
        reload:      _load
    };

}());

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', function () {
    DataStatus.init();
});
