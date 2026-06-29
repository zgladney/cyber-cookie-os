/* ================================================================
   CyberCookieOS — Mission System v1.0
   Everything is a mission. Tracks cross-department work end-to-end.
   Depends on: cybercookieos.js (COS)
================================================================ */
(function (global) {
  'use strict';

  var MS_KEY = 'missions';
  var MS_MAX = 200;
  var _seq   = 0;

  var STATUS = {
    queued:               'QUEUED',
    assigned:             'ASSIGNED',
    research:             'RESEARCHING',
    collaboration:        'COLLABORATING',
    recommendation_ready: 'RECOMMENDATION READY',
    ceo_approval:         'AWAITING CEO APPROVAL',
    execution:            'EXECUTING',
    complete:             'COMPLETE',
    rejected:             'REJECTED',
  };

  function _load() {
    if (typeof COS === 'undefined') return [];
    return COS.state.get(MS_KEY) || [];
  }

  function _save(list) {
    if (typeof COS === 'undefined') return;
    COS.state.set(MS_KEY, list);
  }

  function _genId() {
    _seq++;
    var suffix = Date.now().toString(36).slice(-4).toUpperCase();
    return 'M-' + String(_seq).padStart(3, '0') + '-' + suffix;
  }

  var MS = {
    STATUS: STATUS,

    create: function (config) {
      if (typeof COS === 'undefined') return null;
      var list    = _load();
      var id      = _genId();
      var mission = {
        id:           id,
        title:        config.title    || 'Unnamed Mission',
        dept:         config.dept     || 'ops',
        owner:        config.owner    || 'System',
        participants: config.participants || [],
        priority:     config.priority || 'normal',
        status:       'queued',
        dependencies: config.dependencies || [],
        timeline:     [{ ts: Date.now(), event: 'Mission created', note: config.note || '' }],
        reports:      [],
        data:         config.data     || {},
        created:      Date.now(),
        updated:      Date.now(),
        completed:    null,
      };

      list.unshift(mission);
      if (list.length > MS_MAX) list = list.slice(0, MS_MAX);
      _save(list);

      COS.events.emit('mission:created', mission);
      COS.events.emit('company:MissionCreated', { missionId: id, title: mission.title, dept: mission.dept });
      COS.activity.log({ agent: mission.owner, dept: mission.dept, msg: 'Mission created: ' + mission.title, source: 'mission' });

      return mission;
    },

    update: function (id, status, note) {
      var list    = _load();
      var mission = list.find(function (m) { return m.id === id; });
      if (!mission) return null;
      mission.status  = status;
      mission.updated = Date.now();
      mission.timeline.push({ ts: Date.now(), event: STATUS[status] || status, note: note || '' });
      _save(list);
      COS.events.emit('mission:updated', { id: id, status: status, title: mission.title });
      return mission;
    },

    complete: function (id, report) {
      var list    = _load();
      var mission = list.find(function (m) { return m.id === id; });
      if (!mission) return null;
      mission.status    = 'complete';
      mission.completed = Date.now();
      mission.updated   = Date.now();
      if (report) mission.reports.push({ ts: Date.now(), content: report });
      mission.timeline.push({ ts: Date.now(), event: 'MISSION COMPLETE', note: report || '' });
      _save(list);

      COS.events.emit('mission:completed', mission);
      COS.events.emit('company:MissionCompleted', { missionId: id, title: mission.title, dept: mission.dept });
      COS.activity.log({ agent: mission.owner, dept: mission.dept, msg: 'Mission complete: ' + mission.title, source: 'mission' });

      return mission;
    },

    reject: function (id, reason) {
      var list    = _load();
      var mission = list.find(function (m) { return m.id === id; });
      if (!mission) return null;
      mission.status  = 'rejected';
      mission.updated = Date.now();
      mission.timeline.push({ ts: Date.now(), event: 'REJECTED', note: reason || '' });
      _save(list);
      COS.events.emit('mission:rejected', { id: id, title: mission.title, reason: reason });
      return mission;
    },

    addReport: function (id, content) {
      var list    = _load();
      var mission = list.find(function (m) { return m.id === id; });
      if (!mission) return;
      mission.reports.push({ ts: Date.now(), content: content });
      mission.updated = Date.now();
      _save(list);
    },

    get: function (id) {
      return _load().find(function (m) { return m.id === id; }) || null;
    },

    list: function (filter) {
      var list = _load();
      if (filter && filter.dept)   list = list.filter(function (m) { return m.dept   === filter.dept;   });
      if (filter && filter.status) list = list.filter(function (m) { return m.status === filter.status; });
      return list;
    },

    pending: function () {
      return _load().filter(function (m) { return m.status !== 'complete' && m.status !== 'rejected'; });
    },

    awaitingApproval: function () {
      return _load().filter(function (m) { return m.status === 'ceo_approval'; });
    },

    count: function () {
      var list = _load();
      return {
        total:    list.length,
        pending:  list.filter(function (m) { return m.status !== 'complete' && m.status !== 'rejected'; }).length,
        complete: list.filter(function (m) { return m.status === 'complete'; }).length,
        approval: list.filter(function (m) { return m.status === 'ceo_approval'; }).length,
      };
    },
  };

  global.MS = MS;

})(window);
