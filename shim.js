/* mBlok reviews: serves the site's existing review scripts from static JSON
   instead of the Firebase SDK. Reads come from all.json; only sending a new
   review loads the real SDK. Set ENABLED to false to return to direct Firebase. */
(function () {
  'use strict';
  var ENABLED = true;
  var on = ENABLED || /[?&]shim=1/.test(location.search);
  if (!on || window.__mbReviewsShim) return;
  window.__mbReviewsShim = true;

  var BASE = 'https://ecom82812-debug.github.io/mblok-reviews/';
  var SDK = 'https://www.gstatic.com/firebasejs/9.23.0/';
  var nativeAppend = document.head.appendChild;
  var config = null;
  var data = null;

  var API = 'https://firestore.googleapis.com/v1/projects/shop-reviews-3aedd/databases/(default)/documents:runQuery';
  var FIELDS = ['name', 'text', 'rating', 'photos', 'createdAt', 'verified', 'reply', 'productId', 'productName', 'productUrl'];
  var FRESH_KEY = 'mb-reviews-fresh', FRESH_TTL = 5 * 60 * 1000, FRESH_WAIT = 1500;

  function value(v) {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(value);
    return null;
  }

  /* The newest approved reviews straight from the database, so an approved review
     shows at once. One small request, only where reviews are read in full. */
  function fresh() {
    if (!/\/vidgyk|\/tproduct\//.test(location.pathname)) return Promise.resolve([]);
    try {
      var c = JSON.parse(sessionStorage.getItem(FRESH_KEY) || 'null');
      if (c && Date.now() - c.t < FRESH_TTL) return Promise.resolve(c.rows);
    } catch (e) {}
    var query = fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: {
        select: { fields: FIELDS.map(function (f) { return { fieldPath: f }; }) },
        from: [{ collectionId: 'reviews' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } } },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 15
      } })
    }).then(function (r) {
      if (!r.ok) throw new Error('fresh ' + r.status);
      return r.json();
    }).then(function (list) {
      var rows = [];
      list.forEach(function (x) {
        if (!x.document) return;
        var f = x.document.fields, r = { id: x.document.name.split('/').pop() };
        FIELDS.forEach(function (k) { if (f[k]) r[k] = value(f[k]); });
        r.productId = String(r.productId || '');
        r.rating = r.rating || 0;
        r.photos = r.photos || [];
        rows.push(r);
      });
      try { sessionStorage.setItem(FRESH_KEY, JSON.stringify({ t: Date.now(), rows: rows })); } catch (e) {}
      return rows;
    });
    var timeout = new Promise(function (ok) { setTimeout(function () { ok([]); }, FRESH_WAIT); });
    return Promise.race([query, timeout]).catch(function () { return []; });
  }

  function all() {
    if (!data) {
      var file = fetch(BASE + 'all.json').then(function (r) {
        if (!r.ok) throw new Error('reviews ' + r.status);
        return r.json();
      });
      var latest = fresh();
      data = file.then(function (rows) {
        return latest.then(function (extra) {
          var known = {};
          rows.forEach(function (r) { known[r.id] = 1; });
          var added = extra.filter(function (r) { return !known[r.id]; });
          if (!added.length) return rows;
          return added.concat(rows).sort(function (a, b) {
            return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
          });
        });
      });
    }
    return data;
  }

  function snapshot(rows) {
    var docs = rows.map(function (r) {
      return { id: r.id, exists: true, data: function () { return r; } };
    });
    return {
      docs: docs, size: docs.length, empty: !docs.length,
      forEach: function (fn) { docs.forEach(fn); }
    };
  }

  function Query(filters, cap) {
    this.filters = filters || [];
    this.cap = cap;
  }
  Query.prototype.where = function (field, op, value) {
    return new Query(this.filters.concat([[field, value]]), this.cap);
  };
  Query.prototype.orderBy = function () { return this; };
  Query.prototype.limit = function (n) { return new Query(this.filters, n); };
  Query.prototype.get = function () {
    var filters = this.filters, cap = this.cap;
    return all().then(function (rows) {
      var out = rows.filter(function (r) {
        return filters.every(function (f) {
          return f[0] === 'status' ? f[1] === 'approved' : String(r[f[0]]) === String(f[1]);
        });
      });
      return snapshot(cap ? out.slice(0, cap) : out);
    });
  };
  Query.prototype.add = function (doc) { return send(doc); };

  function load(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = fail;
      nativeAppend.call(document.head, s);
    });
  }

  var STAMP = { __serverTimestamp: true };

  function send(doc) {
    var shim = window.firebase;
    delete window.firebase;
    return load(SDK + 'firebase-app-compat.js').then(function () {
      return load(SDK + 'firebase-firestore-compat.js');
    }).then(function () {
      var real = window.firebase;
      if (!real.apps.length) real.initializeApp(config);
      var copy = {};
      Object.keys(doc).forEach(function (k) {
        copy[k] = doc[k] === STAMP ? real.firestore.FieldValue.serverTimestamp() : doc[k];
      });
      return real.firestore().collection('reviews').add(copy);
    }).then(function (ref) {
      window.firebase = shim;
      return ref;
    }, function (err) {
      window.firebase = shim;
      throw err;
    });
  }

  function firestore() {
    return { collection: function () { return new Query(); } };
  }
  firestore.FieldValue = { serverTimestamp: function () { return STAMP; } };

  window.firebase = {
    apps: [],
    initializeApp: function (c) { config = c; this.apps.push({}); return {}; },
    firestore: firestore
  };

  /* Existing scripts add the SDK themselves: report it as loaded without fetching it. */
  document.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && /firebasejs/.test(node.src || '')) {
      setTimeout(function () { if (node.onload) node.onload(); }, 0);
      return node;
    }
    return nativeAppend.call(this, node);
  };
})();
