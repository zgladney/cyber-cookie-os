/* =============================================
   cos_permissions.js — Permission Checker
   Exposes requiresApproval(agent, action)
   which calls /api/check-permission.

   SECURITY: This only reads permission definitions,
   never credentials or tokens.

   ES5: var only, no arrow functions, no const/let
============================================= */
(function () {

    if (!window.COS) window.COS = {};

    /* Local cache to avoid repeated API calls for same agent+action */
    var _cache = {};

    function _cacheKey(agent, action) { return agent + ':' + action; }

    /*
     requiresApproval(agent, action, callback)
     callback(needsApproval: boolean, canExecute: boolean)

     Example:
       COS.permissions.requiresApproval('nova', 'submit_application', function(needs, can) {
           if (needs) { createApprovalRequest(...); return; }
           if (can)   { executeAction(); }
       });
    */
    function requiresApproval(agent, action, callback) {
        var key = _cacheKey(agent, action);
        if (_cache[key]) {
            callback(_cache[key].requires_approval, _cache[key].can_execute);
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/check-permission?agent=' + encodeURIComponent(agent) + '&action=' + encodeURIComponent(action), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    var result = JSON.parse(xhr.responseText);
                    _cache[key] = result;
                    callback(result.requires_approval, result.can_execute);
                } catch (e) {
                    /* Parse error — default to requiring approval for safety */
                    callback(true, false);
                }
            } else {
                /* Server error — default to requiring approval for safety */
                callback(true, false);
            }
        };
        xhr.send();
    }

    /*
     createApprovalRequest(opts)
     Registers an approval request with ORION.
     opts = { agent, action, description, data, onApprove, onDeny }
    */
    function createApprovalRequest(opts) {
        if (!opts || !opts.agent || !opts.action) {
            console.warn('[COS.permissions] createApprovalRequest: agent and action required');
            return;
        }
        var request = {
            id: 'apr_' + Date.now(),
            agent: opts.agent,
            action: opts.action,
            description: opts.description || opts.action,
            data: opts.data || {},
            requested_at: new Date().toISOString(),
            status: 'pending',
            _onApprove: opts.onApprove || null,
            _onDeny: opts.onDeny || null
        };

        /* Store pending request via COS.state */
        if (window.COS && COS.state) {
            var pending = [];
            try { pending = JSON.parse(COS.state.get('cos.approvals.pending') || '[]'); } catch (e) {}
            pending.push({ id: request.id, agent: request.agent, action: request.action, description: request.description, requested_at: request.requested_at });
            COS.state.set('cos.approvals.pending', JSON.stringify(pending));
        }

        /* Emit event so panels can update */
        if (window.COS && COS.events) {
            COS.events.emit('approval:requested', request);
        }

        /* Log to activity */
        if (window.COS && COS.activity) {
            COS.activity.log({
                agent: request.agent,
                dept: 'global',
                msg: 'Approval requested: ' + request.description,
                source: 'permissions'
            });
        }

        return request;
    }

    /*
     guardedAction(agent, action, description, executeFn)
     One-call helper: checks permission, creates approval if needed,
     or runs executeFn directly if permitted.
    */
    function guardedAction(agent, action, description, executeFn) {
        requiresApproval(agent, action, function (needs, can) {
            if (!can && !needs) {
                console.warn('[COS.permissions] ' + agent + ' is not permitted to ' + action);
                return;
            }
            if (needs) {
                createApprovalRequest({
                    agent: agent,
                    action: action,
                    description: description,
                    onApprove: executeFn
                });
                return;
            }
            /* No approval needed — execute */
            if (typeof executeFn === 'function') executeFn();
        });
    }

    COS.permissions = {
        requiresApproval: requiresApproval,
        createApprovalRequest: createApprovalRequest,
        guardedAction: guardedAction,
        clearCache: function () { _cache = {}; }
    };

    /* Convenience global — called before any external agent action */
    window.requiresApproval = requiresApproval;

}());
