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

  var MODULES = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var FIRESTORE = { apiKey: 'AIzaSyCS-7Vn4X_NDxbEGyTrb1JQewf1QCQNffA', projectId: 'shop-reviews-3aedd' };
  var FIELDS = ['name', 'text', 'rating', 'photos', 'createdAt', 'verified', 'reply', 'productId', 'productName', 'productUrl'];
  var FRESH_KEY = 'mb-reviews-fresh', FRESH_TTL = 5 * 60 * 1000, FRESH_DELAY = 500;
  var REVIEW_PAGE = /\/vidgyk|\/tproduct\//.test(location.pathname);
  var live = null;

  function remembered() {
    if (!REVIEW_PAGE) return null;
    try {
      var c = JSON.parse(sessionStorage.getItem(FRESH_KEY) || 'null');
      return c && Date.now() - c.t < FRESH_TTL ? c.rows : null;
    } catch (e) { return null; }
  }

  function merge(rows, extra) {
    var known = {};
    rows.forEach(function (r) { known[r.id] = 1; });
    var added = extra.filter(function (r) { return !known[r.id]; });
    if (!added.length) return rows;
    return added.concat(rows).sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function pageReady() {
    return new Promise(function (ok) {
      function later() { setTimeout(ok, FRESH_DELAY); }
      if (document.readyState === 'complete') later();
      else window.addEventListener('load', later, { once: true });
    });
  }

  /* The newest approved reviews, read through the SDK because the Firestore REST
     endpoint answers 429 for this project. */
  function newest() {
    return Promise.all([
      import(MODULES + 'firebase-app.js'),
      import(MODULES + 'firebase-firestore.js')
    ]).then(function (m) {
      var F = m[1];
      var db = F.getFirestore(m[0].initializeApp(FIRESTORE, 'mb-reviews-fresh'));
      return F.getDocs(F.query(F.collection(db, 'reviews'), F.where('status', '==', 'approved'),
        F.orderBy('createdAt', 'desc'), F.limit(15))).then(function (snap) {
        var rows = snap.docs.map(function (d) {
          var src = d.data(), r = { id: d.id };
          FIELDS.forEach(function (k) {
            if (src[k] === undefined || src[k] === null) return;
            r[k] = src[k].toDate ? src[k].toDate().toISOString() : src[k];
          });
          r.productId = String(r.productId || '');
          r.rating = r.rating || 0;
          r.photos = r.photos || [];
          return r;
        });
        F.terminate(db);
        return rows;
      });
    });
  }

  /* Runs once, after the page has shown the file. Resolves to the merged list only
     when the database holds reviews the file does not have yet. */
  function latest() {
    if (!live) {
      live = !REVIEW_PAGE || remembered() ? Promise.resolve(null) : pageReady().then(newest).then(function (extra) {
        try { sessionStorage.setItem(FRESH_KEY, JSON.stringify({ t: Date.now(), rows: extra })); } catch (e) {}
        return all().then(function (rows) {
          var merged = merge(rows, extra);
          if (merged === rows) return null;
          data = Promise.resolve(merged);
          return merged;
        });
      }).catch(function () { return null; });
    }
    return live;
  }

  function all() {
    if (!data) {
      data = fetch(BASE + 'all.json').then(function (r) {
        if (!r.ok) throw new Error('reviews ' + r.status);
        return r.json();
      }).then(function (rows) {
        return merge(rows, remembered() || []);
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

  function Query(filters, cap, sorted) {
    this.filters = filters || [];
    this.cap = cap;
    this.sorted = sorted;
  }
  Query.prototype.where = function (field, op, value) {
    return new Query(this.filters.concat([[field, value]]), this.cap, this.sorted);
  };
  Query.prototype.orderBy = function () { return new Query(this.filters, this.cap, true); };
  Query.prototype.limit = function (n) { return new Query(this.filters, n, this.sorted); };
  Query.prototype.pick = function (rows) {
    var filters = this.filters;
    var out = rows.filter(function (r) {
      return filters.every(function (f) {
        return f[0] === 'status' ? f[1] === 'approved' : String(r[f[0]]) === String(f[1]);
      });
    });
    return this.cap ? out.slice(0, this.cap) : out;
  };
  /* Review lists (sorted queries) render from the file at once and render again only
     if the database adds a review to this list. Card ratings stay on the file. */
  Query.prototype.get = function () {
    var self = this;
    var first = all().then(function (rows) { return self.pick(rows); });
    if (!self.sorted) return first.then(snapshot);
    return {
      then: function (ok, fail) {
        var done = first.then(function (rows) { return ok(snapshot(rows)); }, fail);
        Promise.all([first, latest()]).then(function (r) {
          if (!r[1]) return;
          var after = self.pick(r[1]);
          if (after.length !== r[0].length) ok(snapshot(after));
        }).catch(function () {});
        return done;
      }
    };
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
      var stamp = real.firestore.FieldValue.serverTimestamp();
      var copy = {};
      var contact = {};
      /* The form looks for a title class this store template does not have. */
      if ('productName' in doc && !doc.productName) {
        var title = document.querySelector('h1');
        doc.productName = title ? title.textContent.trim().slice(0, 200) : '';
      }
      Object.keys(doc).forEach(function (k) {
        if (k === 'email' || k === 'phone') {
          if (doc[k]) contact[k] = doc[k];
        } else {
          copy[k] = doc[k] === STAMP ? stamp : doc[k];
        }
      });
      /* Review documents are public once approved, so contacts go to a closed collection. */
      var db = real.firestore();
      var ref = db.collection('reviews').doc();
      var batch = db.batch();
      batch.set(ref, copy);
      if (Object.keys(contact).length) {
        contact.createdAt = stamp;
        batch.set(db.collection('reviewContacts').doc(ref.id), contact);
      }
      return batch.commit().then(function () { return ref; });
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

  /* One look for rating stars everywhere: black, same size. Older scripts draw them orange. */
  var starCss = document.createElement('style');
  starCss.id = 'mb-stars';
  starCss.textContent =
    'body .mb-rate,body .rw-inline,body .rw-inline-card{font-family:Montserrat,Arial,sans-serif;align-items:center;flex-wrap:nowrap;white-space:nowrap}' +
    'body .mb-rate{gap:5px;margin:6px 0}' +
    'body .mb-rate .mb-rate-stars,body .rw-inline .rw-stars,body .rw-inline-card .rw-stars{display:inline-flex;gap:1px;flex:none}' +
    'body .mb-rate-stars svg,body .rw-star{width:14px;height:14px;display:block}' +
    'body .mb-rate-stars path,body .rw-star path{stroke:#111}' +
    'body .mb-rate-stars path:not([fill="none"]):not([fill^="url"]),body path.rw-star-full{fill:#111}' +
    'body path.rw-star-empty{fill:none}' +
    '#mb-rate-half stop:first-child,#rw-half stop:first-child{stop-color:#111}' +
    'body .mb-rate strong,body .rw-inline strong,body .rw-inline-card strong{font-size:13px;font-weight:700;color:#111}' +
    'body .mb-rate .mb-rate-cnt,body .rw-inline .rw-cnt,body .rw-inline-card .rw-cnt{font-size:12px;color:#8a8a8e}' +
    '@media(max-width:768px){body .mb-rate{gap:4px;margin:5px 0}' +
    'body .mb-rate-stars svg,body .rw-inline-card .rw-star{width:12px;height:12px}' +
    'body .mb-rate strong,body .rw-inline-card strong{font-size:12px}' +
    'body .mb-rate .mb-rate-cnt,body .rw-inline-card .rw-cnt{font-size:11px}}';
  nativeAppend.call(document.head, starCss);

  /* Header menu from the home page (there it sits in the page head) on all other pages. */
  if (location.pathname !== '/') {
    var menuCss = document.createElement('link');
    menuCss.rel = 'stylesheet';
    menuCss.href = BASE + 'menu.css?v=1';
    nativeAppend.call(document.head, menuCss);
    var watchMenu = function () {
      var tip = document.querySelector('.t794__tooltip-menu');
      if (!tip) return;
      new MutationObserver(function () {
        document.documentElement.classList.toggle('mb-sub', tip.classList.contains('t794__tooltip-menu_show'));
      }).observe(tip, { attributes: true, attributeFilter: ['class'] });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchMenu);
    else watchMenu();
  }

  /* New product cards on all pages. Set NEW_CARDS to false to return to the old ones;
     ?cards=new still shows them for a visit in that case, ?cards=off ends it. */
  var NEW_CARDS = true;
  try {
    if (/[?&]cards=new/.test(location.search)) sessionStorage.setItem('mb-cards', '1');
    if (/[?&]cards=off/.test(location.search)) sessionStorage.removeItem('mb-cards');
    var cardTrial = !!sessionStorage.getItem('mb-cards');
    if (cardTrial || NEW_CARDS) {
      document.documentElement.classList.add('mb-cards');
      document.documentElement.classList.add('mb-cards-home');
      var cardCss = document.createElement('link');
      cardCss.rel = 'stylesheet';
      cardCss.href = BASE + 'cards.css?v=14';
      nativeAppend.call(document.head, cardCss);
      /* Size without spaces, so long sizes stay on one line. */
      var tightSizes = function () {
        [].forEach.call(document.querySelectorAll('.t-catalog__card__descr:not([data-mb]),.t-store__card__descr:not([data-mb])'), function (d) {
          d.setAttribute('data-mb', '1');
          d.innerHTML = d.innerHTML.replace(/(\d)\s*[×xхХX]\s*(?=\d)/g, '$1×');
        });
      };
      /* Cards of products already in the cart show a tick; pressing it opens the cart. */
      var cartIds = {}, cartRaw = null;
      var paintCart = function () {
        [].forEach.call(document.querySelectorAll('.js-product[data-product-gen-uid]'), function (c) {
          c.classList.toggle('mb-in', !!cartIds[c.getAttribute('data-product-gen-uid')]);
        });
      };
      var readCart = function () {
        var raw = localStorage.getItem('tcart') || '';
        if (raw === cartRaw) return;
        cartRaw = raw;
        cartIds = {};
        try {
          (JSON.parse(raw || '{}').products || []).forEach(function (p) {
            if (p && !p.deleted && p.gen_uid) cartIds[p.gen_uid] = 1;
          });
        } catch (e) {}
        paintCart();
      };
      setInterval(readCart, 700);
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.js-product.mb-in .t-btnflex_type_button2,.js-product.mb-in .t-store__card__btns-wrapper a:last-of-type');
        if (!b || !window.tcart__openCart) return;
        e.preventDefault();
        e.stopPropagation();
        window.tcart__openCart();
      }, true);
      new MutationObserver(function () { tightSizes(); paintCart(); }).observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) {}

  /* "Ви переглядали" in the card look. Preview only: ?rv=new turns it on for the visit, ?rv=off ends it. */
  var NEW_RV = false;
  try {
    if (/[?&]rv=new/.test(location.search)) sessionStorage.setItem('mb-rv', '1');
    if (/[?&]rv=off/.test(location.search)) sessionStorage.removeItem('mb-rv');
    if (NEW_RV || sessionStorage.getItem('mb-rv')) {
      document.documentElement.classList.add('mb-rv');
      var rvCss = document.createElement('link');
      rvCss.rel = 'stylesheet';
      rvCss.href = BASE + 'rv.css?v=2';
      nativeAppend.call(document.head, rvCss);
    }
  } catch (e) {}

  /* New reviews block in product cards. Set to false to return to the old widget. */
  var NEW_PRODUCT_BLOCK = true;
  if (/\/tproduct\//.test(location.pathname) && (NEW_PRODUCT_BLOCK || /[?&](rw=new|review=1)/.test(location.search))) {
    var product = document.createElement('script');
    product.src = BASE + 'product.js?v=12';
    product.async = true;
    nativeAppend.call(document.head, product);
  }

  /* Existing scripts add the SDK themselves: report it as loaded without fetching it. */
  document.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && /firebasejs/.test(node.src || '')) {
      setTimeout(function () { if (node.onload) node.onload(); }, 0);
      return node;
    }
    return nativeAppend.call(this, node);
  };
})();
