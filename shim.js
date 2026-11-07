/* mBlok reviews: serves the site's existing review scripts from static JSON
   instead of the Firebase SDK. Reads come from all.json; only sending a new
   review loads the real SDK. Set ENABLED to false to return to direct Firebase. */
(function () {
  'use strict';
  var ENABLED = false;
  var on = ENABLED || /[?&]shim=1/.test(location.search);
  if (!on || window.__mbReviewsShim) return;
  window.__mbReviewsShim = true;

  var BASE = 'https://ecom82812-debug.github.io/mblok-reviews/';
  var SDK = 'https://www.gstatic.com/firebasejs/9.23.0/';
  var nativeAppend = document.head.appendChild;
  var config = null;
  var data = null;

  function all() {
    if (!data) {
      data = fetch(BASE + 'all.json').then(function (r) {
        if (!r.ok) throw new Error('reviews ' + r.status);
        return r.json();
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
