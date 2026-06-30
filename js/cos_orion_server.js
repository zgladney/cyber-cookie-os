/* ================================================================
   cos_orion_server.js — Server-backed ORION Mission Control
   Extends the existing orion.js localStorage queue with a
   persistent server-side version.

   SAFETY RULE: Nothing publishes, posts, spends, or applies without
   an explicit CEO decision of 'approved' in the server queue.

   Exposes: OrionServer (global IIFE)
   Depends on: orion.js (optional, auto-mirrors if present)

   ES5: var only, no arrow functions, no const/let
================================================================ */
var OrionServer = (function () {
    'use strict';

    /* ── Risk level labels ────────────────────────────────────── */
    var RISK = {
        irreversible: 'IRREVERSIBLE',
        financial:    'FINANCIAL',
        publishing:   'PUBLISHING',
        reversible:   'REVERSIBLE',
        read_only:    'READ-ONLY',
    };

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

    /* ── Queue operations ─────────────────────────────────────── */

    /* Submit an action for CEO review. Nothing executes until approved. */
    function submit(opts, cb) {
        /* opts: { type, department, agent, title, description, risk, data } */
        if (!opts.type || !opts.title) {
            if (cb) cb('Missing required fields: type, title', null);
            return;
        }
        _post('/api/orion/submit', {
            type:        opts.type        || 'action',
            department:  opts.department  || 'unknown',
            agent:       opts.agent       || 'system',
            title:       opts.title,
            description: opts.description || '',
            risk:        opts.risk        || 'reversible',
            data:        opts.data        || {},
        }, function (err, result) {
            if (!err && result && result.item) {
                /* Mirror to localStorage-backed orion.js if available */
                if (window.ORION && ORION.approvals && ORION.approvals.add) {
                    ORION.approvals.add({
                        id:         result.item.id,
                        dept:       opts.department || 'system',
                        agent:      opts.agent || 'system',
                        action:     opts.title,
                        detail:     opts.description || '',
                        risk:       opts.risk || 'reversible',
                        ts:         new Date().toISOString(),
                    });
                }
                if (window.COS && COS.events) COS.events.emit('orion:submitted', result.item);
            }
            if (cb) cb(err, result);
        });
    }

    /* CEO approves a pending action */
    function approve(id, notes, cb) {
        _post('/api/orion/approve', { id: id, notes: notes || '' }, function (err, result) {
            if (!err) {
                /* Mirror decision to localStorage queue */
                if (window.ORION && ORION.approvals && ORION.approvals.grant) {
                    ORION.approvals.grant(id);
                }
                if (window.COS && COS.events) COS.events.emit('orion:approved', { id: id, notes: notes });
            }
            if (cb) cb(err, result);
        });
    }

    /* CEO declines a pending action */
    function decline(id, notes, cb) {
        _post('/api/orion/decline', { id: id, notes: notes || '' }, function (err, result) {
            if (!err) {
                if (window.ORION && ORION.approvals && ORION.approvals.reject) {
                    ORION.approvals.reject(id, notes || '');
                }
                if (window.COS && COS.events) COS.events.emit('orion:declined', { id: id, notes: notes });
            }
            if (cb) cb(err, result);
        });
    }

    /* Fetch full queue from server */
    function getQueue(cb) {
        _get('/api/orion/queue', function (err, data) {
            if (cb) cb(err, data ? data.queue || [] : []);
        });
    }

    /* Filter queue by status */
    function getPending(cb) {
        getQueue(function (err, queue) {
            if (err) { if (cb) cb(err, []); return; }
            var pending = queue.filter(function (x) { return x.status === 'awaiting_ceo'; });
            if (cb) cb(null, pending);
        });
    }

    function getApproved(cb) {
        getQueue(function (err, queue) {
            if (err) { if (cb) cb(err, []); return; }
            var approved = queue.filter(function (x) { return x.status === 'approved'; });
            if (cb) cb(null, approved);
        });
    }

    /* Fetch daily briefing */
    function getBriefing(cb) {
        _get('/api/orion/briefing', function (err, data) {
            if (cb) cb(err, data || {});
        });
    }

    /* Fetch audit log */
    function getAudit(cb) {
        _get('/api/orion/audit', function (err, data) {
            if (cb) cb(err, data ? data.entries || [] : []);
        });
    }

    /* Log an action to the server audit trail */
    function log(agent, action, detail) {
        _post('/api/orion/audit/log', { agent: agent, action: action, detail: detail || {} });
    }

    /* ── Commerce pipeline helpers ────────────────────────────── */

    function createProduct(opts, cb) {
        _post('/api/commerce/pipeline/create', {
            kind:         'product',
            title:        opts.title        || '',
            description:  opts.description  || '',
            trend_source: opts.trend_source || '',
            tags:         opts.tags         || [],
        }, cb);
    }

    function advanceProduct(id, stage, cb) {
        _post('/api/commerce/pipeline/advance', { id: id, stage: stage }, cb);
    }

    /* Submit a listing draft to ORION for CEO publishing approval */
    function submitListingForApproval(productId, listingDraft, cb) {
        submit({
            type:        'publish_listing',
            department:  'commerce',
            agent:       'EtsyBot',
            title:       'Publish: ' + (listingDraft.title || productId),
            description: 'Etsy listing draft ready for publication. CEO approval required before any listing goes live.',
            risk:        'publishing',
            data: {
                product_id:    productId,
                listing_draft: listingDraft,
            },
        }, cb);
    }

    /* ── Content pipeline helpers ─────────────────────────────── */

    function createContentItem(opts, cb) {
        _post('/api/content/pipeline/create', {
            topic:        opts.topic        || '',
            platform:     opts.platform     || 'tiktok',
            trend_source: opts.trend_source || '',
        }, cb);
    }

    /* Submit a video/post to ORION for CEO publishing approval */
    function submitContentForApproval(contentId, preview, cb) {
        submit({
            type:        'publish_content',
            department:  'commerce',
            agent:       'Scheduler',
            title:       'Post: ' + (preview.topic || contentId),
            description: 'Content ready to post on ' + (preview.platform || 'TikTok') + '. CEO approval required.',
            risk:        'publishing',
            data: {
                content_id: contentId,
                preview:    preview,
            },
        }, cb);
    }

    /* ── Career helpers ───────────────────────────────────────── */

    /* Submit a job application for CEO approval — NEVER auto-apply */
    function submitApplicationForApproval(jobData, resumeVersion, cb) {
        submit({
            type:        'submit_application',
            department:  'career',
            agent:       'Scout',
            title:       'Apply: ' + (jobData.title || '') + ' at ' + (jobData.company || ''),
            description: 'Resume tailored. Cover letter drafted. CEO must approve before any application is sent.',
            risk:        'irreversible',
            data: {
                job:            jobData,
                resume_version: resumeVersion || 'default',
            },
        }, cb);
    }

    /* ── Finance helpers ──────────────────────────────────────── */

    function addTransaction(txn, cb) {
        _post('/api/finance/ledger/add', txn, cb);
    }

    function getLedger(cb) {
        _get('/api/finance/ledger', function (err, data) {
            if (cb) cb(err, data || {});
        });
    }

    /* ── CRM helpers ──────────────────────────────────────────── */

    function addContact(contact, cb) {
        _post('/api/connections/crm/add', contact, cb);
    }

    function logMessage(entry, cb) {
        _post('/api/connections/crm/log', entry, cb);
    }

    function getCRM(cb) {
        _get('/api/connections/crm', function (err, data) {
            if (cb) cb(err, data || {});
        });
    }

    /* ── Public API ───────────────────────────────────────────── */

    return {
        /* Queue */
        submit:                      submit,
        approve:                     approve,
        decline:                     decline,
        getQueue:                    getQueue,
        getPending:                  getPending,
        getApproved:                 getApproved,
        getBriefing:                 getBriefing,
        getAudit:                    getAudit,
        log:                         log,
        RISK:                        RISK,

        /* Commerce */
        createProduct:               createProduct,
        advanceProduct:              advanceProduct,
        submitListingForApproval:    submitListingForApproval,

        /* Content */
        createContentItem:           createContentItem,
        submitContentForApproval:    submitContentForApproval,

        /* Career */
        submitApplicationForApproval:submitApplicationForApproval,

        /* Finance */
        addTransaction:              addTransaction,
        getLedger:                   getLedger,

        /* CRM */
        addContact:                  addContact,
        logMessage:                  logMessage,
        getCRM:                      getCRM,
    };

}());
