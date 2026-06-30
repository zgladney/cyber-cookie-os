/* ================================================================
   cos_accounts.js — Global Account Center
   Loads account connection status from /api/accounts.
   Never touches tokens, passwords, or secrets.
   Exposes: CosAccounts (global IIFE)

   SECURITY: This module only reads connection status strings.
   Credentials live in data/tokens/ (gitignored) on the server.
   The server never returns token values to the frontend.

   ES5: var only, no arrow functions, no const/let
================================================================ */
var CosAccounts = (function () {
    'use strict';

    var _accounts   = [];
    var _ready      = false;
    var _callbacks  = [];
    var _cache_ts   = 0;
    var CACHE_TTL   = 60000; // 60 seconds

    /* ── XHR helpers ──────────────────────────────────────────── */

    function _get(path, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try { cb(null, JSON.parse(xhr.responseText)); } catch (e) { cb('parse', null); }
            } else {
                cb(xhr.status, null);
            }
        };
        xhr.send();
    }

    function _post(path, data, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', path, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try { if (cb) cb(null, JSON.parse(xhr.responseText)); } catch (e) { if (cb) cb('parse', null); }
            } else {
                if (cb) cb(xhr.status, null);
            }
        };
        xhr.send(JSON.stringify(data || {}));
    }

    /* ── Bootstrap ────────────────────────────────────────────── */

    function load(cb) {
        _get('/api/accounts', function (err, data) {
            if (!err && data && data.accounts) {
                _accounts  = data.accounts;
                _ready     = true;
                _cache_ts  = Date.now();
                for (var i = 0; i < _callbacks.length; i++) {
                    try { _callbacks[i](_accounts); } catch (e) {}
                }
                _callbacks = [];
                if (window.COS && COS.events) COS.events.emit('accounts:ready', { accounts: _accounts });
            }
            if (cb) cb(err, _accounts);
        });
    }

    function onReady(fn) {
        if (_ready && (Date.now() - _cache_ts < CACHE_TTL)) {
            fn(_accounts);
        } else {
            _callbacks.push(fn);
            if (!_ready) load();
        }
    }

    function refresh(cb) {
        _ready = false;
        load(cb);
    }

    /* ── Queries ──────────────────────────────────────────────── */

    function getAll() { return _accounts.slice(); }

    function getById(id) {
        for (var i = 0; i < _accounts.length; i++) {
            if (_accounts[i].id === id) return _accounts[i];
        }
        return null;
    }

    function getByDept(dept) {
        return _accounts.filter(function (a) {
            return a.departments && a.departments.indexOf(dept) >= 0;
        });
    }

    function isConnected(id) {
        var a = getById(id);
        if (!a) return false;
        return a.status === 'connected' || a.status === 'manual_import' || a.status === 'configured';
    }

    function getStatus(id) {
        var a = getById(id);
        return a ? (a.status || 'unknown') : 'unknown';
    }

    function getPendingConnections() {
        return _accounts.filter(function (a) {
            return a.status === 'not_connected' || a.status === 'disconnected';
        });
    }

    function getConnected() {
        return _accounts.filter(function (a) {
            return a.status === 'connected' || a.status === 'manual_import' || a.status === 'configured';
        });
    }

    function getConnectionSummary() {
        var total     = _accounts.length;
        var connected = getConnected().length;
        var pending   = getPendingConnections().length;
        return { total: total, connected: connected, pending: pending, pct: total ? Math.round(connected / total * 100) : 0 };
    }

    /* ── Mutations ────────────────────────────────────────────── */

    /* Mark an account connected — server records the status update only.
       NEVER pass tokens, passwords, or API keys through this function.
       Token storage is handled separately by server-side scripts. */
    function markConnected(id, meta, cb) {
        _post('/api/accounts/connect', { id: id, status: 'connected', meta: meta || {} }, function (err, result) {
            if (!err) {
                // Update local cache
                for (var i = 0; i < _accounts.length; i++) {
                    if (_accounts[i].id === id) {
                        _accounts[i].status = 'connected';
                        if (meta && meta.connected_at) _accounts[i].connected_at = meta.connected_at;
                        break;
                    }
                }
                if (window.COS && COS.events) COS.events.emit('accounts:updated', { id: id, status: 'connected' });
            }
            if (cb) cb(err, result);
        });
    }

    /* ── UI helpers ───────────────────────────────────────────── */

    /* Render a connection status pill into an element */
    function renderStatusPill(accountId, el) {
        if (!el) return;
        var a   = getById(accountId);
        var st  = a ? a.status : 'unknown';
        var map = {
            'connected':     { cls: 'cp-connected',     label: '● CONNECTED' },
            'manual_import': { cls: 'cp-partial',        label: '◑ MANUAL' },
            'configured':    { cls: 'cp-partial',        label: '◑ CONFIGURED' },
            'not_connected': { cls: 'cp-not-connected',  label: '○ NOT CONNECTED' },
            'disconnected':  { cls: 'cp-not-connected',  label: '○ DISCONNECTED' },
            'coming_soon':   { cls: 'cp-coming-soon',    label: '… COMING SOON' },
        };
        var info = map[st] || { cls: 'cp-not-connected', label: '○ ' + st.toUpperCase() };
        el.className = 'conn-pill ' + info.cls;
        el.textContent = info.label;
    }

    /* Auto-render any [data-account-pill] elements on the page */
    function renderAll() {
        var els = document.querySelectorAll('[data-account-pill]');
        for (var i = 0; i < els.length; i++) {
            renderStatusPill(els[i].getAttribute('data-account-pill'), els[i]);
        }
    }

    /* ── Auto-init ────────────────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        load(function () { renderAll(); });
    });

    return {
        load:                 load,
        onReady:              onReady,
        refresh:              refresh,
        getAll:               getAll,
        getById:              getById,
        getByDept:            getByDept,
        isConnected:          isConnected,
        getStatus:            getStatus,
        getPendingConnections:getPendingConnections,
        getConnected:         getConnected,
        getConnectionSummary: getConnectionSummary,
        markConnected:        markConnected,
        renderStatusPill:     renderStatusPill,
        renderAll:            renderAll,
    };

}());
