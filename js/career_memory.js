/* =============================================
   career_memory.js — Career Intelligence Memory Service
   Loads career documents, profile, jobs, and
   recommendations from the server API.

   Exposes: CareerMemory (global)
   Auto-initialises on DOMContentLoaded.

   ES5: var only, no arrow functions, no const/let
============================================= */
var CareerMemory = (function () {

    var _memory  = null;
    var _jobs    = null;
    var _recs    = null;
    var _docs    = null;
    var _li      = null;
    var _ready   = false;
    var _onReadyCbs = [];

    /* ── Internal XHR helpers ─────────────────── */

    function _get(path, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try { cb(null, JSON.parse(xhr.responseText)); return; } catch (e) {}
            }
            cb(xhr.status || 'error', null);
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
                try { if (cb) cb(null, JSON.parse(xhr.responseText)); return; } catch (e) {}
            }
            if (cb) cb(xhr.status || 'error', null);
        };
        xhr.send(JSON.stringify(data || {}));
    }

    /* ── Bootstrap ───────────────────────────── */

    function init(cb) {
        var pending = 3;
        function done() {
            pending--;
            if (pending > 0) return;
            _ready = true;
            for (var i = 0; i < _onReadyCbs.length; i++) {
                try { _onReadyCbs[i](); } catch (e) {}
            }
            _onReadyCbs = [];
            if (cb) cb();
            if (window.COS && COS.events) {
                COS.events.emit('careerMemory:ready', { memory: _memory, jobs: _jobs });
            }
        }

        _get('/api/career/memory', function (err, data) {
            if (data) _memory = data;
            done();
        });
        _get('/api/career/jobs', function (err, data) {
            if (data) _jobs = data;
            done();
        });
        _get('/api/career/recommendations', function (err, data) {
            if (data) _recs = data;
            done();
        });
    }

    function onReady(fn) {
        if (_ready) { fn(); } else { _onReadyCbs.push(fn); }
    }

    /* ── Memory / Profile ─────────────────────── */

    /* Parse all career docs server-side and rebuild memory */
    function refresh(cb) {
        _post('/api/career/memory/refresh', {}, function (err, result) {
            if (!err && result) {
                /* Reload memory after refresh */
                _get('/api/career/memory', function (e2, data) {
                    if (data) _memory = data;
                    _refreshDocs(function () {
                        if (cb) cb(_memory);
                        if (window.COS && COS.events) {
                            COS.events.emit('careerMemory:refreshed', _memory);
                        }
                    });
                });
            } else {
                if (cb) cb(null);
            }
        });
    }

    function _refreshDocs(cb) {
        _get('/api/career/documents', function (err, data) {
            if (data) _docs = data;
            if (cb) cb();
        });
    }

    function loadDocs(cb) {
        _refreshDocs(cb);
    }

    function getProfile()      { return (_memory && _memory.profile)      || {}; }
    function getSkills()       { return (_memory && _memory.profile && _memory.profile.skills) || []; }
    function getSourceDocs()   { return (_memory && _memory._source_docs)  || []; }
    function getLastRefresh()  { return (_memory && _memory._last_refresh) || null; }
    function getDocCount()     { return (_memory && _memory._doc_count)    || 0; }
    function getLinkedIn()     { return (_memory && _memory.linkedin)      || {}; }

    /* Raw access for workspace.js skill matching */
    function getSkillsForMatching() {
        var skills = getSkills();
        /* Fall back to hardcoded MY_SKILLS if memory hasn't been refreshed yet */
        if (!skills.length && window.MY_SKILLS) return window.MY_SKILLS;
        return skills;
    }

    /* ── Jobs ────────────────────────────────── */

    function getJobs() { return (_jobs && _jobs.jobs) || []; }

    function getJobsByStage(stage) {
        return getJobs().filter(function (j) { return j.stage === stage; });
    }

    function getPipelineCounts() {
        var jobs = getJobs();
        var counts = { total: jobs.length, saved: 0, reviewing: 0, ready_to_apply: 0, applied: 0, interview_scheduled: 0, interview_complete: 0, offer: 0, rejected: 0, withdrawn: 0 };
        for (var i = 0; i < jobs.length; i++) {
            var s = jobs[i].stage || 'saved';
            if (counts[s] !== undefined) counts[s]++;
        }
        return counts;
    }

    function saveJob(job, cb) {
        _post('/api/career/jobs/save', job, function (err, result) {
            if (!err && result && result.job) {
                /* Keep local cache in sync */
                if (_jobs && _jobs.jobs) {
                    _jobs.jobs = _jobs.jobs.filter(function (j) { return j.id !== result.job.id; });
                    _jobs.jobs.push(result.job);
                }
                if (window.COS && COS.events) COS.events.emit('careerJobs:updated', _jobs);
            }
            if (cb) cb(err, result);
        });
    }

    function updateJob(id, updates, cb) {
        var payload = { id: id };
        var keys = Object.keys(updates);
        for (var i = 0; i < keys.length; i++) payload[keys[i]] = updates[keys[i]];
        _post('/api/career/jobs/update', payload, function (err, result) {
            if (!err) {
                /* Update local cache */
                if (_jobs && _jobs.jobs) {
                    for (var j = 0; j < _jobs.jobs.length; j++) {
                        if (_jobs.jobs[j].id === id) {
                            for (var k = 0; k < keys.length; k++) {
                                _jobs.jobs[j][keys[k]] = updates[keys[k]];
                            }
                        }
                    }
                }
                if (window.COS && COS.events) COS.events.emit('careerJobs:updated', _jobs);
            }
            if (cb) cb(err, result);
        });
    }

    function removeJob(id, cb) {
        _post('/api/career/jobs/remove', { id: id }, function (err, result) {
            if (!err && _jobs && _jobs.jobs) {
                _jobs.jobs = _jobs.jobs.filter(function (j) { return j.id !== id; });
            }
            if (cb) cb(err, result);
        });
    }

    /* ── Recommendations ─────────────────────── */

    function getRecommendations() { return (_recs && _recs.recommendations) || []; }

    function getPendingRecommendations() {
        return getRecommendations().filter(function (r) { return r.status === 'awaiting_approval'; });
    }

    function createRecommendation(rec, cb) {
        _post('/api/career/recommendations/create', rec, function (err, result) {
            if (!err && result && result.recommendation) {
                if (_recs && _recs.recommendations) {
                    _recs.recommendations.push(result.recommendation);
                }
                if (window.COS && COS.events) COS.events.emit('careerRec:created', result.recommendation);
            }
            if (cb) cb(err, result);
        });
    }

    function actionRecommendation(id, decision, cb) {
        _post('/api/career/recommendations/action', { id: id, decision: decision }, function (err, result) {
            if (!err && _recs && _recs.recommendations) {
                for (var i = 0; i < _recs.recommendations.length; i++) {
                    if (_recs.recommendations[i].id === id) {
                        _recs.recommendations[i].status    = decision;
                        _recs.recommendations[i].ceo_decision = decision;
                    }
                }
            }
            if (window.COS && COS.events) COS.events.emit('careerRec:actioned', { id: id, decision: decision });
            if (cb) cb(err, result);
        });
    }

    /* ── LinkedIn ────────────────────────────── */

    function importLinkedIn(data, cb) {
        _post('/api/career/linkedin/import', data, function (err, result) {
            if (!err && result && result.profile) {
                if (_memory) _memory.linkedin = result.profile;
            }
            if (cb) cb(err, result);
        });
    }

    /* ── ORION-style full evaluation ─────────── */

    /*
     evaluateJob(job, cb)
     Runs Resu-Mate + Finance + Scout-X evaluations locally, then
     assembles an Executive Recommendation and sends it to ORION.
     job: object from JOB_LISTINGS or career_jobs.jobs
     cb(recommendation)
    */
    function evaluateJob(job, cb) {
        var profile  = getProfile();
        var mySkills = getSkillsForMatching();

        /* Resu-Mate: ATS score */
        var jobSkills = job.skills || [];
        var matched   = jobSkills.filter(function (s) {
            return mySkills.some(function (ms) { return ms.toLowerCase() === s.toLowerCase(); });
        });
        var atsMatch  = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 100) : 0;
        var missing   = jobSkills.filter(function (s) {
            return !mySkills.some(function (ms) { return ms.toLowerCase() === s.toLowerCase(); });
        });

        /* Finance: salary vs. minimum */
        var salaryMin    = profile.salary_min || 40000;
        var jobSalary    = job.salary_min || job.salary || 0;
        var finImpact    = jobSalary >= salaryMin ? 'positive' : (jobSalary > 0 ? 'below_target' : 'unknown');

        /* Scout-X: location vs. preferences */
        var targetLocs   = profile.target_locations || ['south jersey', 'philadelphia', 'remote'];
        var jobLoc       = (job.location || '').toLowerCase();
        var locMatch     = targetLocs.some(function (l) { return jobLoc.indexOf(l.toLowerCase()) >= 0 || jobLoc.indexOf('remote') >= 0; });

        /* Assemble */
        var verdict = 'review';
        if (atsMatch >= 60 && finImpact === 'positive' && locMatch) { verdict = 'apply'; }
        else if (atsMatch < 30 || finImpact === 'below_target')      { verdict = 'skip'; }

        var rec = {
            job_id:           job.id || '',
            title:            job.title || '',
            company:          job.company || '',
            salary:           jobSalary ? '$' + jobSalary.toLocaleString() : 'Not listed',
            ats_match:        atsMatch,
            missing_keywords: missing,
            resume_updated:   false,
            cover_letter_ready: false,
            financial_impact: finImpact,
            location:         job.location || '',
            location_match:   locMatch,
            recommendation:   verdict,
            orion_notes:      'ATS: ' + atsMatch + '% | Missing: ' + (missing.slice(0, 3).join(', ') || 'none') + ' | Finance: ' + finImpact + ' | Location: ' + (locMatch ? 'match' : 'outside target')
        };

        createRecommendation(rec, function (err, result) {
            if (cb) cb(rec, result);
        });
    }

    /* ── Utility ─────────────────────────────── */

    function fmtDate(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return iso.slice(0, 10); }
    }

    return {
        init:                    init,
        onReady:                 onReady,
        refresh:                 refresh,
        loadDocs:                loadDocs,
        getProfile:              getProfile,
        getSkills:               getSkills,
        getSkillsForMatching:    getSkillsForMatching,
        getSourceDocs:           getSourceDocs,
        getLastRefresh:          getLastRefresh,
        getDocCount:             getDocCount,
        getLinkedIn:             getLinkedIn,
        getJobs:                 getJobs,
        getJobsByStage:          getJobsByStage,
        getPipelineCounts:       getPipelineCounts,
        saveJob:                 saveJob,
        updateJob:               updateJob,
        removeJob:               removeJob,
        getRecommendations:      getRecommendations,
        getPendingRecommendations: getPendingRecommendations,
        createRecommendation:    createRecommendation,
        actionRecommendation:    actionRecommendation,
        evaluateJob:             evaluateJob,
        importLinkedIn:          importLinkedIn,
        fmtDate:                 fmtDate,
        raw: function () { return _memory; },
        rawJobs: function () { return _jobs; },
        rawRecs: function () { return _recs; }
    };

}());

/* Auto-init */
document.addEventListener('DOMContentLoaded', function () {
    CareerMemory.init(function () {
        if (typeof window._careerMemoryReady === 'function') {
            window._careerMemoryReady();
        }
    });
});
