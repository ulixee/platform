(function() {
  var i = window.Document.prototype.createElement, r = window.Document.prototype.createElementNS, c = window.Document.prototype.importNode, p = window.Document.prototype.prepend, h = window.Document.prototype.append, E = window.DocumentFragment.prototype.prepend, v = window.DocumentFragment.prototype.append, x = window.Node.prototype.cloneNode, m = window.Node.prototype.appendChild, C = window.Node.prototype.insertBefore, _ = window.Node.prototype.removeChild, S = window.Node.prototype.replaceChild, I = Object.getOwnPropertyDescriptor(
    window.Node.prototype,
    "textContent"
  ), j = window.Element.prototype.attachShadow, V = Object.getOwnPropertyDescriptor(window.Element.prototype, "innerHTML"), $ = window.Element.prototype.getAttribute, ce = window.Element.prototype.setAttribute, ae = window.Element.prototype.removeAttribute, X = window.Element.prototype.toggleAttribute, z = window.Element.prototype.getAttributeNS, de = window.Element.prototype.setAttributeNS, ue = window.Element.prototype.removeAttributeNS, pe = window.Element.prototype.insertAdjacentElement, he = window.Element.prototype.insertAdjacentHTML, ze = window.Element.prototype.prepend, Ge = window.Element.prototype.append, fe = window.Element.prototype.before, me = window.Element.prototype.after, ge = window.Element.prototype.replaceWith, ve = window.Element.prototype.remove, Ue = window.HTMLElement, Q = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "innerHTML"), Ee = window.HTMLElement.prototype.insertAdjacentElement, ye = window.HTMLElement.prototype.insertAdjacentHTML, we = /* @__PURE__ */ new Set();
  "annotation-xml color-profile font-face font-face-src font-face-uri font-face-format font-face-name missing-glyph".split(" ").forEach(function(e) {
    return we.add(e);
  });
  function Ce(e) {
    var t = we.has(e);
    return e = /^[a-z][.0-9_a-z]*-[-.0-9_a-z]*$/.test(e), !t && e;
  }
  var We = document.contains ? document.contains.bind(document) : document.documentElement.contains.bind(document.documentElement);
  function y(e) {
    var t = e.isConnected;
    if (t !== void 0)
      return t;
    if (We(e))
      return !0;
    for (; e && !(e.__CE_isImportDocument || e instanceof Document); )
      e = e.parentNode || (window.ShadowRoot && e instanceof ShadowRoot ? e.host : void 0);
    return !(!e || !(e.__CE_isImportDocument || e instanceof Document));
  }
  function Z(e) {
    var t = e.children;
    if (t)
      return Array.prototype.slice.call(t);
    for (t = [], e = e.firstChild; e; e = e.nextSibling)
      e.nodeType === Node.ELEMENT_NODE && t.push(e);
    return t;
  }
  function ee(e, t) {
    for (; t && t !== e && !t.nextSibling; )
      t = t.parentNode;
    return t && t !== e ? t.nextSibling : null;
  }
  function te(e, t, o) {
    for (var s = e; s; ) {
      if (s.nodeType === Node.ELEMENT_NODE) {
        var n = s;
        t(n);
        var l = n.localName;
        if (l === "link" && n.getAttribute("rel") === "import") {
          if (s = n.import, o === void 0 && (o = /* @__PURE__ */ new Set()), s instanceof Node && !o.has(s))
            for (o.add(s), s = s.firstChild; s; s = s.nextSibling)
              te(s, t, o);
          s = ee(e, n);
          continue;
        } else if (l === "template") {
          s = ee(e, n);
          continue;
        }
        if (n = n.__CE_shadowRoot)
          for (n = n.firstChild; n; n = n.nextSibling)
            te(n, t, o);
      }
      s = s.firstChild ? s.firstChild : ee(e, s);
    }
  }
  function G() {
    var e = !(N == null || !N.noDocumentConstructionObserver), t = !(N == null || !N.shadyDomFastWalk);
    this.m = [], this.g = [], this.j = !1, this.shadyDomFastWalk = t, this.I = !e;
  }
  function M(e, t, o, s) {
    var n = window.ShadyDOM;
    if (e.shadyDomFastWalk && n && n.inUse) {
      if (t.nodeType === Node.ELEMENT_NODE && o(t), t.querySelectorAll)
        for (e = n.nativeMethods.querySelectorAll.call(t, "*"), t = 0; t < e.length; t++)
          o(e[t]);
    } else
      te(t, o, s);
  }
  function qe(e, t) {
    e.j = !0, e.m.push(t);
  }
  function Ke(e, t) {
    e.j = !0, e.g.push(t);
  }
  function ne(e, t) {
    e.j && M(e, t, function(o) {
      return D(e, o);
    });
  }
  function D(e, t) {
    if (e.j && !t.__CE_patched) {
      t.__CE_patched = !0;
      for (var o = 0; o < e.m.length; o++)
        e.m[o](t);
      for (o = 0; o < e.g.length; o++)
        e.g[o](t);
    }
  }
  function O(e, t) {
    var o = [];
    for (M(e, t, function(n) {
      return o.push(n);
    }), t = 0; t < o.length; t++) {
      var s = o[t];
      s.__CE_state === 1 ? e.connectedCallback(s) : U(e, s);
    }
  }
  function T(e, t) {
    var o = [];
    for (M(e, t, function(n) {
      return o.push(n);
    }), t = 0; t < o.length; t++) {
      var s = o[t];
      s.__CE_state === 1 && e.disconnectedCallback(s);
    }
  }
  function k(e, t, o) {
    o = o === void 0 ? {} : o;
    var s = o.J, n = o.upgrade || function(a) {
      return U(e, a);
    }, l = [];
    for (M(e, t, function(a) {
      if (e.j && D(e, a), a.localName === "link" && a.getAttribute("rel") === "import") {
        var d = a.import;
        d instanceof Node && (d.__CE_isImportDocument = !0, d.__CE_registry = document.__CE_registry), d && d.readyState === "complete" ? d.__CE_documentLoadHandled = !0 : a.addEventListener("load", function() {
          var u = a.import;
          if (!u.__CE_documentLoadHandled) {
            u.__CE_documentLoadHandled = !0;
            var f = /* @__PURE__ */ new Set();
            s && (s.forEach(function(g) {
              return f.add(g);
            }), f.delete(u)), k(e, u, { J: f, upgrade: n });
          }
        });
      } else
        l.push(a);
    }, s), t = 0; t < l.length; t++)
      n(l[t]);
  }
  function U(e, t) {
    try {
      var o = t.ownerDocument, s = o.__CE_registry, n = s && (o.defaultView || o.__CE_isImportDocument) ? W(s, t.localName) : void 0;
      if (n && t.__CE_state === void 0) {
        n.constructionStack.push(t);
        try {
          try {
            if (new n.constructorFunction() !== t)
              throw Error("The custom element constructor did not produce the element being upgraded.");
          } finally {
            n.constructionStack.pop();
          }
        } catch (u) {
          throw t.__CE_state = 2, u;
        }
        if (t.__CE_state = 1, t.__CE_definition = n, n.attributeChangedCallback && t.hasAttributes()) {
          var l = n.observedAttributes;
          for (n = 0; n < l.length; n++) {
            var a = l[n], d = t.getAttribute(a);
            d !== null && e.attributeChangedCallback(t, a, null, d, null);
          }
        }
        y(t) && e.connectedCallback(t);
      }
    } catch (u) {
      F(u);
    }
  }
  G.prototype.connectedCallback = function(e) {
    var t = e.__CE_definition;
    if (t.connectedCallback)
      try {
        t.connectedCallback.call(e);
      } catch (o) {
        F(o);
      }
  }, G.prototype.disconnectedCallback = function(e) {
    var t = e.__CE_definition;
    if (t.disconnectedCallback)
      try {
        t.disconnectedCallback.call(e);
      } catch (o) {
        F(o);
      }
  }, G.prototype.attributeChangedCallback = function(e, t, o, s, n) {
    var l = e.__CE_definition;
    if (l.attributeChangedCallback && -1 < l.observedAttributes.indexOf(t))
      try {
        l.attributeChangedCallback.call(e, t, o, s, n);
      } catch (a) {
        F(a);
      }
  };
  function be(e, t, o, s) {
    var n = t.__CE_registry;
    if (n && (s === null || s === "http://www.w3.org/1999/xhtml") && (n = W(n, o)))
      try {
        var l = new n.constructorFunction();
        if (l.__CE_state === void 0 || l.__CE_definition === void 0)
          throw Error("Failed to construct '" + o + "': The returned value was not constructed with the HTMLElement constructor.");
        if (l.namespaceURI !== "http://www.w3.org/1999/xhtml")
          throw Error("Failed to construct '" + o + "': The constructed element's namespace must be the HTML namespace.");
        if (l.hasAttributes())
          throw Error("Failed to construct '" + o + "': The constructed element must not have any attributes.");
        if (l.firstChild !== null)
          throw Error("Failed to construct '" + o + "': The constructed element must not have any children.");
        if (l.parentNode !== null)
          throw Error("Failed to construct '" + o + "': The constructed element must not have a parent node.");
        if (l.ownerDocument !== t)
          throw Error("Failed to construct '" + o + "': The constructed element's owner document is incorrect.");
        if (l.localName !== o)
          throw Error("Failed to construct '" + o + "': The constructed element's local name is incorrect.");
        return l;
      } catch (a) {
        return F(a), t = s === null ? i.call(t, o) : r.call(t, s, o), Object.setPrototypeOf(t, HTMLUnknownElement.prototype), t.__CE_state = 2, t.__CE_definition = void 0, D(e, t), t;
      }
    return t = s === null ? i.call(t, o) : r.call(t, s, o), D(e, t), t;
  }
  function F(e) {
    var t = "", o = "", s = 0, n = 0;
    e instanceof Error ? (t = e.message, o = e.sourceURL || e.fileName || "", s = e.line || e.lineNumber || 0, n = e.column || e.columnNumber || 0) : t = "Uncaught " + String(e);
    var l = void 0;
    ErrorEvent.prototype.initErrorEvent === void 0 ? l = new ErrorEvent("error", { cancelable: !0, message: t, filename: o, lineno: s, colno: n, error: e }) : (l = document.createEvent("ErrorEvent"), l.initErrorEvent("error", !1, !0, t, o, s), l.preventDefault = function() {
      Object.defineProperty(this, "defaultPrevented", { configurable: !0, get: function() {
        return !0;
      } });
    }), l.error === void 0 && Object.defineProperty(l, "error", { configurable: !0, enumerable: !0, get: function() {
      return e;
    } }), window.dispatchEvent(l), l.defaultPrevented || console.error(e);
  }
  function xe() {
    var e = this;
    this.g = void 0, this.F = new Promise(function(t) {
      e.l = t;
    });
  }
  xe.prototype.resolve = function(e) {
    if (this.g)
      throw Error("Already resolved.");
    this.g = e, this.l(e);
  };
  function _e(e) {
    var t = document;
    this.l = void 0, this.h = e, this.g = t, k(this.h, this.g), this.g.readyState === "loading" && (this.l = new MutationObserver(this.G.bind(this)), this.l.observe(this.g, { childList: !0, subtree: !0 }));
  }
  function Te(e) {
    e.l && e.l.disconnect();
  }
  _e.prototype.G = function(e) {
    var t = this.g.readyState;
    for (t !== "interactive" && t !== "complete" || Te(this), t = 0; t < e.length; t++)
      for (var o = e[t].addedNodes, s = 0; s < o.length; s++)
        k(this.h, o[s]);
  };
  function w(e) {
    this.s = /* @__PURE__ */ new Map(), this.u = /* @__PURE__ */ new Map(), this.C = /* @__PURE__ */ new Map(), this.A = !1, this.B = /* @__PURE__ */ new Map(), this.o = function(t) {
      return t();
    }, this.i = !1, this.v = [], this.h = e, this.D = e.I ? new _e(e) : void 0;
  }
  w.prototype.H = function(e, t) {
    var o = this;
    if (!(t instanceof Function))
      throw new TypeError("Custom element constructor getters must be functions.");
    Se(this, e), this.s.set(e, t), this.v.push(e), this.i || (this.i = !0, this.o(function() {
      return Ne(o);
    }));
  }, w.prototype.define = function(e, t) {
    var o = this;
    if (!(t instanceof Function))
      throw new TypeError("Custom element constructors must be functions.");
    Se(this, e), Oe(this, e, t), this.v.push(e), this.i || (this.i = !0, this.o(function() {
      return Ne(o);
    }));
  };
  function Se(e, t) {
    if (!Ce(t))
      throw new SyntaxError("The element name '" + t + "' is not valid.");
    if (W(e, t))
      throw Error("A custom element with name '" + (t + "' has already been defined."));
    if (e.A)
      throw Error("A custom element is already being defined.");
  }
  function Oe(e, t, o) {
    e.A = !0;
    var s;
    try {
      var n = o.prototype;
      if (!(n instanceof Object))
        throw new TypeError("The custom element constructor's prototype is not an object.");
      var l = function(g) {
        var A = n[g];
        if (A !== void 0 && !(A instanceof Function))
          throw Error("The '" + g + "' callback must be a function.");
        return A;
      }, a = l("connectedCallback"), d = l("disconnectedCallback"), u = l("adoptedCallback"), f = (s = l("attributeChangedCallback")) && o.observedAttributes || [];
    } catch (g) {
      throw g;
    } finally {
      e.A = !1;
    }
    return o = {
      localName: t,
      constructorFunction: o,
      connectedCallback: a,
      disconnectedCallback: d,
      adoptedCallback: u,
      attributeChangedCallback: s,
      observedAttributes: f,
      constructionStack: []
    }, e.u.set(t, o), e.C.set(o.constructorFunction, o), o;
  }
  w.prototype.upgrade = function(e) {
    k(this.h, e);
  };
  function Ne(e) {
    if (e.i !== !1) {
      e.i = !1;
      for (var t = [], o = e.v, s = /* @__PURE__ */ new Map(), n = 0; n < o.length; n++)
        s.set(o[n], []);
      for (k(e.h, document, { upgrade: function(u) {
        if (u.__CE_state === void 0) {
          var f = u.localName, g = s.get(f);
          g ? g.push(u) : e.u.has(f) && t.push(u);
        }
      } }), n = 0; n < t.length; n++)
        U(e.h, t[n]);
      for (n = 0; n < o.length; n++) {
        for (var l = o[n], a = s.get(l), d = 0; d < a.length; d++)
          U(e.h, a[d]);
        (l = e.B.get(l)) && l.resolve(void 0);
      }
      o.length = 0;
    }
  }
  w.prototype.get = function(e) {
    if (e = W(this, e))
      return e.constructorFunction;
  }, w.prototype.whenDefined = function(e) {
    if (!Ce(e))
      return Promise.reject(new SyntaxError("'" + e + "' is not a valid custom element name."));
    var t = this.B.get(e);
    if (t)
      return t.F;
    t = new xe(), this.B.set(e, t);
    var o = this.u.has(e) || this.s.has(e);
    return e = this.v.indexOf(e) === -1, o && e && t.resolve(void 0), t.F;
  }, w.prototype.polyfillWrapFlushCallback = function(e) {
    this.D && Te(this.D);
    var t = this.o;
    this.o = function(o) {
      return e(function() {
        return t(o);
      });
    };
  };
  function W(e, t) {
    var o = e.u.get(t);
    if (o)
      return o;
    if (o = e.s.get(t)) {
      e.s.delete(t);
      try {
        return Oe(e, t, o());
      } catch (s) {
        F(s);
      }
    }
  }
  w.prototype.define = w.prototype.define, w.prototype.upgrade = w.prototype.upgrade, w.prototype.get = w.prototype.get, w.prototype.whenDefined = w.prototype.whenDefined, w.prototype.polyfillDefineLazy = w.prototype.H, w.prototype.polyfillWrapFlushCallback = w.prototype.polyfillWrapFlushCallback;
  function oe(e, t, o) {
    function s(n) {
      return function(l) {
        for (var a = [], d = 0; d < arguments.length; ++d)
          a[d] = arguments[d];
        d = [];
        for (var u = [], f = 0; f < a.length; f++) {
          var g = a[f];
          if (g instanceof Element && y(g) && u.push(g), g instanceof DocumentFragment)
            for (g = g.firstChild; g; g = g.nextSibling)
              d.push(g);
          else
            d.push(g);
        }
        for (n.apply(this, a), a = 0; a < u.length; a++)
          T(e, u[a]);
        if (y(this))
          for (a = 0; a < d.length; a++)
            u = d[a], u instanceof Element && O(e, u);
      };
    }
    o.prepend !== void 0 && (t.prepend = s(o.prepend)), o.append !== void 0 && (t.append = s(o.append));
  }
  function Ye(e) {
    Document.prototype.createElement = function(t) {
      return be(e, this, t, null);
    }, Document.prototype.importNode = function(t, o) {
      return t = c.call(this, t, !!o), this.__CE_registry ? k(e, t) : ne(e, t), t;
    }, Document.prototype.createElementNS = function(t, o) {
      return be(e, this, o, t);
    }, oe(e, Document.prototype, { prepend: p, append: h });
  }
  function Je(e) {
    function t(s) {
      return function(n) {
        for (var l = [], a = 0; a < arguments.length; ++a)
          l[a] = arguments[a];
        a = [];
        for (var d = [], u = 0; u < l.length; u++) {
          var f = l[u];
          if (f instanceof Element && y(f) && d.push(f), f instanceof DocumentFragment)
            for (f = f.firstChild; f; f = f.nextSibling)
              a.push(f);
          else
            a.push(f);
        }
        for (s.apply(this, l), l = 0; l < d.length; l++)
          T(e, d[l]);
        if (y(this))
          for (l = 0; l < a.length; l++)
            d = a[l], d instanceof Element && O(e, d);
      };
    }
    var o = Element.prototype;
    fe !== void 0 && (o.before = t(fe)), me !== void 0 && (o.after = t(me)), ge !== void 0 && (o.replaceWith = function(s) {
      for (var n = [], l = 0; l < arguments.length; ++l)
        n[l] = arguments[l];
      l = [];
      for (var a = [], d = 0; d < n.length; d++) {
        var u = n[d];
        if (u instanceof Element && y(u) && a.push(u), u instanceof DocumentFragment)
          for (u = u.firstChild; u; u = u.nextSibling)
            l.push(u);
        else
          l.push(u);
      }
      for (d = y(this), ge.apply(this, n), n = 0; n < a.length; n++)
        T(e, a[n]);
      if (d)
        for (T(e, this), n = 0; n < l.length; n++)
          a = l[n], a instanceof Element && O(e, a);
    }), ve !== void 0 && (o.remove = function() {
      var s = y(this);
      ve.call(this), s && T(e, this);
    });
  }
  function Ve(e) {
    function t(n, l) {
      Object.defineProperty(n, "innerHTML", { enumerable: l.enumerable, configurable: !0, get: l.get, set: function(a) {
        var d = this, u = void 0;
        if (y(this) && (u = [], M(e, this, function(A) {
          A !== d && u.push(A);
        })), l.set.call(this, a), u)
          for (var f = 0; f < u.length; f++) {
            var g = u[f];
            g.__CE_state === 1 && e.disconnectedCallback(g);
          }
        return this.ownerDocument.__CE_registry ? k(e, this) : ne(e, this), a;
      } });
    }
    function o(n, l) {
      n.insertAdjacentElement = function(a, d) {
        var u = y(d);
        return a = l.call(this, a, d), u && T(e, d), y(a) && O(e, d), a;
      };
    }
    function s(n, l) {
      function a(d, u) {
        for (var f = []; d !== u; d = d.nextSibling)
          f.push(d);
        for (u = 0; u < f.length; u++)
          k(e, f[u]);
      }
      n.insertAdjacentHTML = function(d, u) {
        if (d = d.toLowerCase(), d === "beforebegin") {
          var f = this.previousSibling;
          l.call(this, d, u), a(f || this.parentNode.firstChild, this);
        } else if (d === "afterbegin")
          f = this.firstChild, l.call(this, d, u), a(this.firstChild, f);
        else if (d === "beforeend")
          f = this.lastChild, l.call(this, d, u), a(f || this.firstChild, null);
        else if (d === "afterend")
          f = this.nextSibling, l.call(this, d, u), a(this.nextSibling, f);
        else
          throw new SyntaxError("The value provided (" + String(d) + ") is not one of 'beforebegin', 'afterbegin', 'beforeend', or 'afterend'.");
      };
    }
    j && (Element.prototype.attachShadow = function(n) {
      if (n = j.call(this, n), e.j && !n.__CE_patched) {
        n.__CE_patched = !0;
        for (var l = 0; l < e.m.length; l++)
          e.m[l](n);
      }
      return this.__CE_shadowRoot = n;
    }), V && V.get ? t(Element.prototype, V) : Q && Q.get ? t(HTMLElement.prototype, Q) : Ke(e, function(n) {
      t(n, { enumerable: !0, configurable: !0, get: function() {
        return x.call(this, !0).innerHTML;
      }, set: function(l) {
        var a = this.localName === "template", d = a ? this.content : this, u = r.call(document, this.namespaceURI, this.localName);
        for (u.innerHTML = l; 0 < d.childNodes.length; )
          _.call(d, d.childNodes[0]);
        for (l = a ? u.content : u; 0 < l.childNodes.length; )
          m.call(d, l.childNodes[0]);
      } });
    }), Element.prototype.setAttribute = function(n, l) {
      if (this.__CE_state !== 1)
        return ce.call(this, n, l);
      var a = $.call(this, n);
      ce.call(this, n, l), l = $.call(this, n), e.attributeChangedCallback(this, n, a, l, null);
    }, Element.prototype.setAttributeNS = function(n, l, a) {
      if (this.__CE_state !== 1)
        return de.call(
          this,
          n,
          l,
          a
        );
      var d = z.call(this, n, l);
      de.call(this, n, l, a), a = z.call(this, n, l), e.attributeChangedCallback(this, l, d, a, n);
    }, Element.prototype.removeAttribute = function(n) {
      if (this.__CE_state !== 1)
        return ae.call(this, n);
      var l = $.call(this, n);
      ae.call(this, n), l !== null && e.attributeChangedCallback(this, n, l, null, null);
    }, X && (Element.prototype.toggleAttribute = function(n, l) {
      if (this.__CE_state !== 1)
        return X.call(this, n, l);
      var a = $.call(this, n), d = a !== null;
      return l = X.call(this, n, l), d !== l && e.attributeChangedCallback(this, n, a, l ? "" : null, null), l;
    }), Element.prototype.removeAttributeNS = function(n, l) {
      if (this.__CE_state !== 1)
        return ue.call(this, n, l);
      var a = z.call(this, n, l);
      ue.call(this, n, l);
      var d = z.call(this, n, l);
      a !== d && e.attributeChangedCallback(this, l, a, d, n);
    }, Ee ? o(HTMLElement.prototype, Ee) : pe && o(Element.prototype, pe), ye ? s(HTMLElement.prototype, ye) : he && s(Element.prototype, he), oe(e, Element.prototype, { prepend: ze, append: Ge }), Je(e);
  }
  var Ie = {};
  function Xe(e) {
    function t() {
      var o = this.constructor, s = document.__CE_registry.C.get(o);
      if (!s)
        throw Error("Failed to construct a custom element: The constructor was not registered with `customElements`.");
      var n = s.constructionStack;
      if (n.length === 0)
        return n = i.call(document, s.localName), Object.setPrototypeOf(n, o.prototype), n.__CE_state = 1, n.__CE_definition = s, D(e, n), n;
      var l = n.length - 1, a = n[l];
      if (a === Ie)
        throw Error("Failed to construct '" + s.localName + "': This element was already constructed.");
      return n[l] = Ie, Object.setPrototypeOf(a, o.prototype), D(e, a), a;
    }
    t.prototype = Ue.prototype, Object.defineProperty(HTMLElement.prototype, "constructor", { writable: !0, configurable: !0, enumerable: !1, value: t }), window.HTMLElement = t;
  }
  function Qe(e) {
    function t(o, s) {
      Object.defineProperty(o, "textContent", { enumerable: s.enumerable, configurable: !0, get: s.get, set: function(n) {
        if (this.nodeType === Node.TEXT_NODE)
          s.set.call(this, n);
        else {
          var l = void 0;
          if (this.firstChild) {
            var a = this.childNodes, d = a.length;
            if (0 < d && y(this)) {
              l = Array(d);
              for (var u = 0; u < d; u++)
                l[u] = a[u];
            }
          }
          if (s.set.call(this, n), l)
            for (n = 0; n < l.length; n++)
              T(e, l[n]);
        }
      } });
    }
    Node.prototype.insertBefore = function(o, s) {
      if (o instanceof DocumentFragment) {
        var n = Z(o);
        if (o = C.call(this, o, s), y(this))
          for (s = 0; s < n.length; s++)
            O(e, n[s]);
        return o;
      }
      return n = o instanceof Element && y(o), s = C.call(this, o, s), n && T(e, o), y(this) && O(e, o), s;
    }, Node.prototype.appendChild = function(o) {
      if (o instanceof DocumentFragment) {
        var s = Z(o);
        if (o = m.call(this, o), y(this))
          for (var n = 0; n < s.length; n++)
            O(e, s[n]);
        return o;
      }
      return s = o instanceof Element && y(o), n = m.call(this, o), s && T(e, o), y(this) && O(e, o), n;
    }, Node.prototype.cloneNode = function(o) {
      return o = x.call(this, !!o), this.ownerDocument.__CE_registry ? k(e, o) : ne(e, o), o;
    }, Node.prototype.removeChild = function(o) {
      var s = o instanceof Element && y(o), n = _.call(this, o);
      return s && T(e, o), n;
    }, Node.prototype.replaceChild = function(o, s) {
      if (o instanceof DocumentFragment) {
        var n = Z(o);
        if (o = S.call(this, o, s), y(this))
          for (T(e, s), s = 0; s < n.length; s++)
            O(e, n[s]);
        return o;
      }
      n = o instanceof Element && y(o);
      var l = S.call(this, o, s), a = y(this);
      return a && T(e, s), n && T(e, o), a && O(e, o), l;
    }, I && I.get ? t(Node.prototype, I) : qe(e, function(o) {
      t(o, { enumerable: !0, configurable: !0, get: function() {
        for (var s = [], n = this.firstChild; n; n = n.nextSibling)
          n.nodeType !== Node.COMMENT_NODE && s.push(n.textContent);
        return s.join("");
      }, set: function(s) {
        for (; this.firstChild; )
          _.call(this, this.firstChild);
        s != null && s !== "" && m.call(this, document.createTextNode(s));
      } });
    });
  }
  var N = window.customElements;
  function ke() {
    var e = new G();
    Xe(e), Ye(e), oe(e, DocumentFragment.prototype, { prepend: E, append: v }), Qe(e), Ve(e), window.CustomElementRegistry = w, e = new w(e), document.__CE_registry = e, Object.defineProperty(window, "customElements", { configurable: !0, enumerable: !0, value: e });
  }
  N && !N.forcePolyfill && typeof N.define == "function" && typeof N.get == "function" || ke(), window.__CE_installPolyfill = ke;
}).call(self);
let Ze = (i = 21) => crypto.getRandomValues(new Uint8Array(i)).reduce((r, c) => (c &= 63, c < 36 ? r += c.toString(36) : c < 62 ? r += (c - 26).toString(36).toUpperCase() : c > 62 ? r += "-" : r += "_", r), "");
const De = ":", Fe = 20, et = De.length, Ae = 1, tt = 1, He = tt + Fe + et;
var b = /* @__PURE__ */ ((i) => (i.OpenSelectorGeneratorPanel = "OpenSelectorGeneratorPanel", i.CloseElementOptionsOverlay = "CloseElementOptionsOverlay", i.InspectElementModeChanged = "InspectElementModeChanged", i.OpenElementOptionsOverlay = "OpenElementOptionsOverlay", i.HideElementOptionsOverlay = "HideElementOptionsOverlay", i.RemoveHideFromElementOptionsOverlay = "RemoveHideFromElementOptionsOverlay", i.ContentScriptNeedsElement = "ContentScriptNeedsElement", i.RunSelectorGenerator = "RunSelectorGenerator", i.ResetSelectorGenerator = "ResetSelectorGenerator", i.AddIncludedElement = "AddIncludedElement", i.RemoveIncludedElement = "RemoveIncludedElement", i.AddExcludedElement = "AddExcludedElement", i.RemoveExcludedElement = "RemoveExcludedElement", i.FinishedSelectorGeneration = "FinishedSelectorGeneration", i.UpdateElementOptions = "UpdateElementOptions", i.CloseDevtoolsPanel = "CloseDevtoolsPanel", i.ToggleInspectElementMode = "ToggleInspectElementMode", i.UndockedFocusChange = "UndockedFocusChange", i))(b || {}), B = /* @__PURE__ */ ((i) => (i.DevtoolsPrivate = "DevtoolsPrivate", i.DevtoolsScript = "DevtoolsScript", i.ContentScript = "ContentScript", i.Core = "Core", i))(B || {});
const Me = "___sendToCore", nt = "___receiveFromCore";
var P = /* @__PURE__ */ ((i) => (i.Y = "Y", i.N = "N", i.R = "R", i))(P || {});
function ot() {
  return Ze();
}
function Re(i) {
  if (typeof i == "string") {
    if (le(i))
      return i;
    throw new Error("Unknown message format");
  }
  const { destLocation: r } = i, c = i.responseCode || "N", p = { ...i };
  delete p.destLocation, delete p.responseCode;
  const h = JSON.stringify(p);
  return `:${r.padEnd(Fe)}:${c}:${h}`;
}
function le(i) {
  return i.substr(0, 1) === De;
}
function it(i) {
  if (typeof i == "string") {
    if (le(i))
      return i.substr(He, Ae) === "Y";
    throw new Error("Unknown message format");
  }
  return i.responseCode === "Y";
}
function rt(i) {
  if (typeof i == "string") {
    if (le(i))
      return i.substr(He, Ae) === "R";
    throw new Error("Unknown message format");
  }
  return i.responseCode === "R";
}
class lt extends HTMLElement {
  constructor() {
    super(...arguments), this.hasStartedInitialization = !1, this.hasFinishedInitialization = !1, this.isOpen = !1, this.isTmpHidden = !1;
  }
  attachElementsBucket(r) {
    this.elementsBucket = r;
  }
  openByBackendNodeId(r) {
    this.elementsBucket.getByBackendNodeId(r).then((c) => this.open(r, c)).catch((c) => {
      console.log(`ERROR: Could not fetch element for backendNodeId: ${r}`, c);
    });
  }
  open(r, c) {
    if (!this.hasFinishedInitialization)
      return this.hasFinishedInitialization = !0, setTimeout(() => {
        this.open(r, c);
      });
    if (this.selectedElem = c, this.selectedBackendNodeId = r, !c)
      return;
    const p = c.localName, h = Array.from(c.classList), E = [`<span class="tag">${p}</span>`, ...h].join("."), { width: v, height: x, top: m, left: C } = c.getBoundingClientRect(), _ = C + window.scrollX, S = m + window.scrollY, I = `${Math.round(v * 100) / 100} x ${Math.round(x * 100) / 100}`;
    this.isOpen = !0, this.style.left = `${_}px`, this.style.top = `${S}px`, this.style.width = `${v}px`, this.style.height = `${x}px`, this.titleNameElem.innerHTML = E, this.positionElem.textContent = I, this.style.display = "block";
    const j = this.overlayElem.offsetHeight;
    m - j < 0 ? (this.overlayElem.classList.remove("top"), this.overlayElem.classList.add("bottom")) : (this.overlayElem.classList.remove("bottom"), this.overlayElem.classList.add("top")), this.elementsBucket.isIncludedBackendNodeId(this.selectedBackendNodeId) ? this.addOnClassToIncludeToggle() : this.addOffClassToIncludeToggle(), this.elementsBucket.isExcludedBackendNodeId(this.selectedBackendNodeId) ? this.addOnClassToExcludeToggle() : this.addOffClassToExcludeToggle();
  }
  tmpHide(r) {
    this.isOpen && (r === !0 ? (this.isTmpHidden = !0, this.style.display = "none") : this.isTmpHidden && (this.isTmpHidden = !1, this.style.display = "block"));
  }
  close() {
    this.isOpen = !1, this.isTmpHidden = !1, this.style.display = "none";
  }
  // PRIVATE ///////////////////////////////////////////////////////////////////
  addOffClassToIncludeToggle() {
    this.mustIncludeToggle.classList.remove("on"), this.mustIncludeToggle.classList.add("off");
  }
  addOnClassToIncludeToggle() {
    this.mustIncludeToggle.classList.remove("off"), this.mustIncludeToggle.classList.add("on"), this.addOffClassToExcludeToggle();
  }
  addOnClassToExcludeToggle() {
    this.mustExcludeToggle.classList.add("on"), this.mustExcludeToggle.classList.remove("off"), this.addOffClassToIncludeToggle();
  }
  addOffClassToExcludeToggle() {
    this.mustExcludeToggle.classList.add("off"), this.mustExcludeToggle.classList.remove("on");
  }
  toggleIncluded() {
    Le(), this.elementsBucket.isIncludedBackendNodeId(this.selectedBackendNodeId) ? (this.elementsBucket.removeIncludedElement(this.selectedBackendNodeId), this.addOffClassToIncludeToggle()) : (this.elementsBucket.addIncludedElement(this.selectedBackendNodeId, this.selectedElem), this.addOnClassToIncludeToggle());
  }
  toggleMustExclude() {
    Le(), this.elementsBucket.isExcludedBackendNodeId(this.selectedBackendNodeId) ? (this.elementsBucket.removeExcludedElement(this.selectedBackendNodeId), this.addOffClassToExcludeToggle()) : (this.elementsBucket.addExcludedElement(this.selectedBackendNodeId, this.selectedElem), this.addOnClassToExcludeToggle());
  }
  initialize() {
    this.style.position = "absolute", this.style.zIndex = "2147483647", this.attachShadow({ mode: "open" }), this.createStyleElem(), this.createHighlighterElem(), this.createOverlayElem(), this.shadowRoot.addEventListener("click", (r) => {
      r.cancelBubble = !0;
    });
  }
  createOverlayElem() {
    const c = document.createElement("div");
    c.setAttribute("class", "overlay"), c.innerHTML = `
      <div class="overlay-panel">
        <div class="title">
          <div class="name">------</div>
          <div class="position"></div>
        </div>
        <div class="controller">
          <div class="intro">Selector Generator Options:</div>
          <div class="option must-include">
            <div class="symbol plus"></div>
            <label>Must Include</label>
            <div id="must-include" class="toggle-component">
              <span class="label off">OFF</span>
              <span class="label on">ON</span>
              <div class="toggle"></div>
            </div>
          </div>
          <div class="option must-exclude">
            <div class="symbol minus"></div>
            <label>Must Exclude</label>
            <div id="must-exclude" class="toggle-component">
              <span class="label off">OFF</span>
              <span class="label on">ON</span>
              <div class="toggle"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="overlay-triangle" style="width: ${Math.sqrt(2) * 15 + 5}px; height: ${Math.sqrt(2) * (15 / 2) + 5}px">
        <div style="width: 15px; height: 15px"></div>
      </div>
    `, this.mustIncludeToggle = c.querySelector("div#must-include"), this.mustIncludeToggle.addEventListener("click", (p) => {
      this.toggleIncluded(), p.cancelBubble = !0;
    }), this.mustExcludeToggle = c.querySelector("div#must-exclude"), this.mustExcludeToggle.addEventListener("click", (p) => {
      this.toggleMustExclude(), p.cancelBubble = !0;
    }), this.overlayElem = c, this.titleNameElem = c.querySelector(".title .name"), this.positionElem = c.querySelector(".title .position"), this.shadowRoot.appendChild(c);
  }
  createHighlighterElem() {
    this.highlightElem || (this.highlightElem = document.createElement("div"), this.highlightElem.setAttribute("class", "highlighter"), this.shadowRoot.appendChild(this.highlightElem));
  }
  createStyleElem() {
    const r = `
      .highlighter {
        background: rgba(91, 150, 202, 0.5);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      }
      .overlay {
        position: absolute;
        z-index: 2;
      }      
      .overlay-panel {
        position: relative;
        left: 0;
        bottom: 0;
        z-index: 2;
        background: white;
        padding: 5px 10px;
        border-radius: 4px;
        box-shadow: 1px 1px 8px 0 rgb(0 0 0 / 40%);
        min-width: 290px;
        max-width: 390px;
      }
      
      .overlay-triangle {
        position: absolute;
        overflow: hidden;
      }
      .overlay-triangle div {
        position: absolute;
        transform: rotate(45deg);
        height: 15px;
        width: 15px;
        pointer-events: none;
        background: #ffffff;
        box-shadow: 1px 1px 8px 0 rgb(0 0 0 / 40%);
      }
      
      .overlay.top {
        left: 0;
        bottom: calc(100% + 8px);
      }
      .overlay.top .overlay-triangle {
        left: 15px;
        top: 100%;
        z-index: 2;
      }
      .overlay.top .overlay-triangle div {
        top: -7px;
        left: 5px;
      }
      
      .overlay.bottom {
        left: 0;
        top: calc(100% + 8px);
      }
      .overlay.bottom .overlay-triangle {
        left: 15px;
        top: -15px;
        z-index: 2;
      }
      .overlay.bottom .overlay-triangle div {
        top: 7px;
        left: 5px;
      }
      
      .title {
        position: relative;
      }
      .title .name {
        white-space: nowrap;
        color: #1A1AA6;
        font-weight: bold;
        overflow: hidden;
        margin-right: 100px;
        padding: 5px 0;
        text-overflow: ellipsis;
      }
      .title .name .tag {
        color: #881280;
      }
      .title .position {
        padding: 5px 0;
        color: silver;
        width: 100px;
        text-align: right;
        position: absolute;
        top: 0;
        right: 0;
      }
      
      .controller {
        border-top: 1px solid rgba(0,0,0,0.1);
        padding: 5px 0;
      }
      .controller .intro {
        font-weight: 100;
        color: #595959;
        padding: 10px 0; 
      }
      .controller .option {
        padding: 10px 0;
        border-top: 1px solid rgba(0,0,0,0.1);
        position: relative;
        line-height: 20px;
      }
      .controller .option label {
        font-weight: bold;
      }
      .controller .option .symbol {
        width: 20px;
        height: 20px;
        position: relative;
        display: inline-block;
        vertical-align: middle;
      }
      .controller .option .symbol:before {
        content: "";
        position: absolute;
        left: 4px;
        top: 6px;
        width: 12px;
        height: 4px;
      }
      .controller .option .symbol.plus:before {
        background: #1CA600;
      }
      .controller .option .symbol.plus:after {
        content: "";
        position: absolute;
        top: 2px;
        left: 8px;
        width: 4px;
        height: 12px;
        background: #1CA600;
      }
      .controller .option .symbol.minus:before {
        background: #E20000;
      }
      .controller .option.must-include {
        color: #1CA600;
      }
      .controller .option.must-exclude {
        color: #E20000;
      }
      
      .toggle-component {
        background: #EFEFEF;
        width: 90px;
        height: 20px;
        border: 1px solid #B3B3B3;
        border-radius: 25px;
        float: right;
        position: relative;
        color: silver;
        text-shadow: 1px 1px white;
        cursor: default;
      }
      .toggle-component .label {
        width: 40px;
        display: inline-block;
        text-align: center;
        z-index: 2;
        position: relative;
      }
      .toggle-component .toggle {
        width: 45px;
        background: white;
        border: 1px solid #8E8E8E;
        position: absolute;
        top: -1px;
        height: 20px;
        z-index: 1;
        border-radius: 20px;
        box-shadow: 1px 1px 1px rgb(0 0 0 / 10%);
      }
      .toggle-component.on .label.on {
        color: black;
      }
      .toggle-component.off .label.off {
        color: black;
      }
      .toggle-component.on .toggle {
        right: -1px;
      }
      .toggle-component.off .toggle {
        left: -1px;
      }
    `, c = document.createElement("style");
    c.appendChild(document.createTextNode(r)), this.shadowRoot.appendChild(c);
  }
  connectedCallback() {
    this.hasStartedInitialization || (this.hasStartedInitialization = !0, this.initialize());
  }
}
function Le() {
  const i = {
    destLocation: B.DevtoolsPrivate,
    origLocation: B.ContentScript,
    responseCode: P.N,
    payload: {
      event: b.OpenSelectorGeneratorPanel
    }
  }, r = Re(i);
  window[Me](r);
}
const Y = B.ContentScript;
function H(i, r) {
  const c = {
    destLocation: B.DevtoolsScript,
    origLocation: Y,
    payload: i,
    ...se(r)
  };
  J(c);
}
window.sendToDevtoolsScript = H;
function q(i, r) {
  const c = {
    destLocation: B.DevtoolsPrivate,
    origLocation: Y,
    payload: i,
    ...se(r)
  };
  J(c);
}
function st(i, r) {
  const c = {
    destLocation: B.Core,
    origLocation: Y,
    payload: i,
    ...se(r)
  };
  J(c);
}
let ie;
function ct(i) {
  if (ie)
    throw new Error("onMessage has already been called");
  ie = i;
}
window[nt] = (i, r, c) => {
  const p = {
    destLocation: i,
    responseCode: r,
    ...c
  };
  if (p.destLocation === Y)
    rt(p) ? dt(p) : at(p);
  else
    throw new Error("Unknown destLocation");
};
const re = {};
function at(i) {
  const c = it(i) ? (p) => ut(i, p) : void 0;
  ie(i.payload, c);
}
function dt(i) {
  const r = re[i.responseId];
  if (!r)
    throw new Error(`Incoming response (${i.responseId}) could not be handled`);
  delete re[i.responseId], clearTimeout(r.timeoutId), r.responseFn(i.payload);
}
function ut(i, r) {
  const c = P.R, { responseId: p, origLocation: h } = i, E = {
    destLocation: h,
    origLocation: B.Core,
    responseId: p,
    responseCode: c,
    payload: r
  };
  J(E);
}
function J(i) {
  const r = Re(i);
  window[Me](r);
}
function se(i) {
  if (i) {
    const r = ot();
    return re[r] = {
      responseFn: i,
      timeoutId: setTimeout(() => {
        throw new Error(`Response for ${r} not received within 10s`);
      }, 1e4)
    }, {
      responseCode: P.Y,
      responseId: r
    };
  }
  return {
    responseCode: P.N
  };
}
const R = {};
class pt {
  constructor() {
    this.includedElementsById = /* @__PURE__ */ new Map(), this.excludedElementsById = /* @__PURE__ */ new Map();
  }
  get includedElements() {
    return Array.from(this.includedElementsById.values());
  }
  async getByBackendNodeId(r) {
    const c = window.onElementFromCore.name, h = await new Promise((E, v) => {
      R[r] = { resolve: E, reject: v }, st({ event: b.ContentScriptNeedsElement, backendNodeId: r, callbackFnName: c });
    });
    return delete R[r], h;
  }
  reset() {
    this.includedElementsById = /* @__PURE__ */ new Map(), this.excludedElementsById = /* @__PURE__ */ new Map();
  }
  isIncludedBackendNodeId(r) {
    return this.includedElementsById.has(r);
  }
  addIncludedElement(r, c) {
    const p = Be(c);
    this.includedElementsById.set(r, c), this.removeExcludedElement(r);
    const h = { event: b.AddIncludedElement, name: p, backendNodeId: r };
    H(h), q(h);
  }
  removeIncludedElement(r) {
    this.includedElementsById.delete(r);
    const c = { event: b.RemoveIncludedElement, backendNodeId: r };
    H(c), q(c);
  }
  isExcludedBackendNodeId(r) {
    return this.excludedElementsById.has(r);
  }
  addExcludedElement(r, c) {
    const p = Be(c);
    this.excludedElementsById.set(r, c), this.removeIncludedElement(r);
    const h = { event: b.AddExcludedElement, backendNodeId: r, name: p };
    H(h), q(h);
  }
  removeExcludedElement(r) {
    this.excludedElementsById.delete(r);
    const c = { event: b.RemoveExcludedElement, backendNodeId: r };
    H(c), q(c);
  }
  getByKey(r) {
    return this.includedElementsById.get(r) || this.excludedElementsById.get(r);
  }
}
function Be(i) {
  const r = i.outerHTML, c = r.length, p = r[c - 2] === "/" ? (
    // Is self-closing tag?
    c
  ) : c - i.innerHTML.length - (i.tagName.length + 3);
  return r.slice(0, p);
}
window.onElementFromCore = function(r, c) {
  R[r] && (R[r].resolve(c), delete R[r]);
};
const K = {
  tag: 1,
  id: 2,
  class: 3,
  attr: 4
};
function Pe(i, r) {
  return i.length - r.length;
}
function ht(i) {
  const r = Et(i), c = yt(i), p = vt(r, c), h = [...c, r], E = wt(h, p);
  console.log("target: ", r), console.log("ancestors: ", c), console.log("ancestorsKeyPairs: ", p), console.log("possibleSelectors: ", E);
  const v = ft(h, p);
  return console.log("selectors: ", v), v.sort(Pe);
}
function ft(i, r) {
  const c = [];
  let h = 0;
  for (; c.length < 1e3; ) {
    const E = 1e3 - c.length, v = mt(
      h,
      i,
      r,
      E
    );
    for (const x of v)
      document.querySelectorAll(x).length === 1 && c.push(x);
    h += 1;
  }
  return c;
}
function mt(i, r, c, p) {
  const h = [];
  for (const E of c.filter((v) => v.length === i + 2)) {
    let v = [""];
    for (const x of E) {
      let m = !1;
      const _ = r[x].selectorOptions.filter((S) => S.length === i + 1);
      v = gt(v, _, m);
    }
    if (h.push(...v), h.length >= p)
      break;
  }
  return h;
}
function gt(i, r, c) {
  const p = [], h = c ? " > " : " ";
  for (const E of r)
    try {
      const v = E.join("");
      for (const x of i)
        p.push(`${x}${h}${v}`);
    } catch (v) {
      throw console.log(E), v;
    }
  return p;
}
function vt(i, r) {
  const c = $e(Object.keys(r)), p = [];
  for (const h of c)
    p.push([...h, r.length.toString()]);
  return p.sort(Pe);
}
function Et(i) {
  const r = je(i), c = i.parentElement;
  try {
    const p = r.filter(
      (h) => c.querySelectorAll(h.join("")).length === 1
    );
    return { element: i, selectorOptions: p };
  } catch (p) {
    throw console.log(r), p;
  }
}
function yt(i) {
  const r = [];
  for (; i; ) {
    const c = i.parentElement;
    if (c.localName === "body")
      break;
    const p = je(c);
    r.unshift({ element: c, selectorOptions: p }), i = c;
  }
  return r;
}
function je(i) {
  const r = i.localName, c = i.id && !i.id.match(/^[0-9]/) ? `#${i.id}` : null, p = Array.from(i.classList).map((m) => `.${m}`), E = i.getAttributeNames().filter((m) => !["class"].includes(m)).map((m) => {
    const C = i.getAttribute(m);
    if (!(m === "id" && C && !C.match(/^[0-9]/)))
      return `[${m}="${C}"]`;
  }), v = [
    { type: "tag", rank: K.tag, value: r },
    { type: "id", rank: K.id, value: c },
    ...p.map((m) => ({ type: "class", rank: K.class, value: m })),
    ...E.map((m) => ({ type: "attr", rank: K.attr, value: m }))
  ].filter((m) => m.value), x = $e(v).map((m) => m.sort((C, _) => C.rank - _.rank));
  return x.sort((m, C) => {
    let _ = m.length;
    m.some((I) => I.type === "attr") && (_ += 1), m[0].type === "attr" && (_ += 1);
    let S = C.length;
    return C.some((I) => I.type === "attr") && (S += 1), C[0].type === "attr" && (S += 1), _ - S;
  }), x.map((m) => m.map((C) => C.value));
}
function $e(i) {
  function r(c, p, h) {
    if (!(!c.length && !p.length))
      return p.length ? (r([...c, p[0]], p.slice(1), h), r([...c], p.slice(1), h)) : h.push(c), h;
  }
  return r([], [...i], []);
}
function wt(i, r) {
  let c = 0;
  for (const p of r) {
    let h = 1;
    for (const E of p)
      h *= i[E].selectorOptions.length;
    c += h;
  }
  return c;
}
customElements.define("chromealive-element-options-overlay", lt);
const L = new pt();
ct(async (i) => {
  const { event: r, backendNodeId: c } = i;
  if (r === b.InspectElementModeChanged)
    i.isActive;
  else if (r !== b.OpenElementOptionsOverlay) {
    if (r !== b.HideElementOptionsOverlay) {
      if (r !== b.RemoveHideFromElementOptionsOverlay) {
        if (r !== b.CloseElementOptionsOverlay)
          if (r === b.UpdateElementOptions) {
            if ("isIncluded" in i)
              if (i.isIncluded) {
                const p = await L.getByBackendNodeId(c);
                L.addIncludedElement(c, p);
              } else
                L.removeIncludedElement(c);
            else if ("isExcluded" in i)
              if (i.isExcluded) {
                const p = await L.getByBackendNodeId(c);
                L.addExcludedElement(c, p);
              } else
                L.removeExcludedElement(c);
          } else if (r === b.RunSelectorGenerator) {
            const p = L.includedElements[0], h = ht(p).map((E) => E.split(" "));
            H({ event: b.FinishedSelectorGeneration, selectors: h });
          } else
            r === b.ResetSelectorGenerator ? L.reset() : console.log("UNHANDLED MESSAGE: ", i);
      }
    }
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5tanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViY29tcG9uZW50cy9jdXN0b20tZWxlbWVudHMvY3VzdG9tLWVsZW1lbnRzLm1pbi5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9uYW5vaWQvaW5kZXguYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uL2NvcmUvbGliL0JyaWRnZUhlbHBlcnMudHMiLCIuLi8uLi8uLi8uLi8uLi9jaHJvbWUtZXh0ZW5zaW9uL3NyYy9saWIvRWxlbWVudE9wdGlvbnNPdmVybGF5LnRzIiwiLi4vLi4vLi4vLi4vLi4vY2hyb21lLWV4dGVuc2lvbi9zcmMvbGliL2NvbnRlbnQvQ29udGVudE1lc3Nlbmdlci50cyIsIi4uLy4uLy4uLy4uLy4uL2Nocm9tZS1leHRlbnNpb24vc3JjL2xpYi9FbGVtZW50c0J1Y2tldC50cyIsIi4uLy4uLy4uLy4uLy4uL2Nocm9tZS1leHRlbnNpb24vc3JjL2xpYi9jb250ZW50L2ZpbmRTZWxlY3RvcnMudHMiLCIuLi8uLi8uLi8uLi8uLi9jaHJvbWUtZXh0ZW5zaW9uL3NyYy9jb250ZW50LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe1xuLypcblxuIENvcHlyaWdodCAoYykgMjAxNiBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0IFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmRcbiBhdCBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHQgVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5XG4gYmUgZm91bmQgYXQgaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHQgQ29kZSBkaXN0cmlidXRlZCBieVxuIEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzbyBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVBcbiByaWdodHMgZ3JhbnQgZm91bmQgYXQgaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4qL1xuJ3VzZSBzdHJpY3QnO3ZhciBuPXdpbmRvdy5Eb2N1bWVudC5wcm90b3R5cGUuY3JlYXRlRWxlbWVudCxwPXdpbmRvdy5Eb2N1bWVudC5wcm90b3R5cGUuY3JlYXRlRWxlbWVudE5TLGFhPXdpbmRvdy5Eb2N1bWVudC5wcm90b3R5cGUuaW1wb3J0Tm9kZSxiYT13aW5kb3cuRG9jdW1lbnQucHJvdG90eXBlLnByZXBlbmQsY2E9d2luZG93LkRvY3VtZW50LnByb3RvdHlwZS5hcHBlbmQsZGE9d2luZG93LkRvY3VtZW50RnJhZ21lbnQucHJvdG90eXBlLnByZXBlbmQsZWE9d2luZG93LkRvY3VtZW50RnJhZ21lbnQucHJvdG90eXBlLmFwcGVuZCxxPXdpbmRvdy5Ob2RlLnByb3RvdHlwZS5jbG9uZU5vZGUscj13aW5kb3cuTm9kZS5wcm90b3R5cGUuYXBwZW5kQ2hpbGQsdD13aW5kb3cuTm9kZS5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlLHU9d2luZG93Lk5vZGUucHJvdG90eXBlLnJlbW92ZUNoaWxkLHY9d2luZG93Lk5vZGUucHJvdG90eXBlLnJlcGxhY2VDaGlsZCx3PU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93Lk5vZGUucHJvdG90eXBlLFxuXCJ0ZXh0Q29udGVudFwiKSx5PXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5hdHRhY2hTaGFkb3csej1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHdpbmRvdy5FbGVtZW50LnByb3RvdHlwZSxcImlubmVySFRNTFwiKSxBPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5nZXRBdHRyaWJ1dGUsQj13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuc2V0QXR0cmlidXRlLEM9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUF0dHJpYnV0ZSxEPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS50b2dnbGVBdHRyaWJ1dGUsRT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuZ2V0QXR0cmlidXRlTlMsRj13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuc2V0QXR0cmlidXRlTlMsRz13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlQXR0cmlidXRlTlMsSD13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuaW5zZXJ0QWRqYWNlbnRFbGVtZW50LGZhPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5pbnNlcnRBZGphY2VudEhUTUwsXG5oYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucHJlcGVuZCxpYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuYXBwZW5kLGphPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5iZWZvcmUsa2E9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLmFmdGVyLGxhPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5yZXBsYWNlV2l0aCxtYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlLG5hPXdpbmRvdy5IVE1MRWxlbWVudCxJPU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LkhUTUxFbGVtZW50LnByb3RvdHlwZSxcImlubmVySFRNTFwiKSxvYT13aW5kb3cuSFRNTEVsZW1lbnQucHJvdG90eXBlLmluc2VydEFkamFjZW50RWxlbWVudCxwYT13aW5kb3cuSFRNTEVsZW1lbnQucHJvdG90eXBlLmluc2VydEFkamFjZW50SFRNTDt2YXIgcWE9bmV3IFNldDtcImFubm90YXRpb24teG1sIGNvbG9yLXByb2ZpbGUgZm9udC1mYWNlIGZvbnQtZmFjZS1zcmMgZm9udC1mYWNlLXVyaSBmb250LWZhY2UtZm9ybWF0IGZvbnQtZmFjZS1uYW1lIG1pc3NpbmctZ2x5cGhcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihhKXtyZXR1cm4gcWEuYWRkKGEpfSk7ZnVuY3Rpb24gcmEoYSl7dmFyIGI9cWEuaGFzKGEpO2E9L15bYS16XVsuMC05X2Etel0qLVstLjAtOV9hLXpdKiQvLnRlc3QoYSk7cmV0dXJuIWImJmF9dmFyIHNhPWRvY3VtZW50LmNvbnRhaW5zP2RvY3VtZW50LmNvbnRhaW5zLmJpbmQoZG9jdW1lbnQpOmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jb250YWlucy5iaW5kKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XG5mdW5jdGlvbiBKKGEpe3ZhciBiPWEuaXNDb25uZWN0ZWQ7aWYodm9pZCAwIT09YilyZXR1cm4gYjtpZihzYShhKSlyZXR1cm4hMDtmb3IoO2EmJiEoYS5fX0NFX2lzSW1wb3J0RG9jdW1lbnR8fGEgaW5zdGFuY2VvZiBEb2N1bWVudCk7KWE9YS5wYXJlbnROb2RlfHwod2luZG93LlNoYWRvd1Jvb3QmJmEgaW5zdGFuY2VvZiBTaGFkb3dSb290P2EuaG9zdDp2b2lkIDApO3JldHVybiEoIWF8fCEoYS5fX0NFX2lzSW1wb3J0RG9jdW1lbnR8fGEgaW5zdGFuY2VvZiBEb2N1bWVudCkpfWZ1bmN0aW9uIEsoYSl7dmFyIGI9YS5jaGlsZHJlbjtpZihiKXJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChiKTtiPVtdO2ZvcihhPWEuZmlyc3RDaGlsZDthO2E9YS5uZXh0U2libGluZylhLm5vZGVUeXBlPT09Tm9kZS5FTEVNRU5UX05PREUmJmIucHVzaChhKTtyZXR1cm4gYn1cbmZ1bmN0aW9uIEwoYSxiKXtmb3IoO2ImJmIhPT1hJiYhYi5uZXh0U2libGluZzspYj1iLnBhcmVudE5vZGU7cmV0dXJuIGImJmIhPT1hP2IubmV4dFNpYmxpbmc6bnVsbH1cbmZ1bmN0aW9uIE0oYSxiLGQpe2Zvcih2YXIgZj1hO2Y7KXtpZihmLm5vZGVUeXBlPT09Tm9kZS5FTEVNRU5UX05PREUpe3ZhciBjPWY7YihjKTt2YXIgZT1jLmxvY2FsTmFtZTtpZihcImxpbmtcIj09PWUmJlwiaW1wb3J0XCI9PT1jLmdldEF0dHJpYnV0ZShcInJlbFwiKSl7Zj1jLmltcG9ydDt2b2lkIDA9PT1kJiYoZD1uZXcgU2V0KTtpZihmIGluc3RhbmNlb2YgTm9kZSYmIWQuaGFzKGYpKWZvcihkLmFkZChmKSxmPWYuZmlyc3RDaGlsZDtmO2Y9Zi5uZXh0U2libGluZylNKGYsYixkKTtmPUwoYSxjKTtjb250aW51ZX1lbHNlIGlmKFwidGVtcGxhdGVcIj09PWUpe2Y9TChhLGMpO2NvbnRpbnVlfWlmKGM9Yy5fX0NFX3NoYWRvd1Jvb3QpZm9yKGM9Yy5maXJzdENoaWxkO2M7Yz1jLm5leHRTaWJsaW5nKU0oYyxiLGQpfWY9Zi5maXJzdENoaWxkP2YuZmlyc3RDaGlsZDpMKGEsZil9fTtmdW5jdGlvbiBOKCl7dmFyIGE9IShudWxsPT09T3x8dm9pZCAwPT09T3x8IU8ubm9Eb2N1bWVudENvbnN0cnVjdGlvbk9ic2VydmVyKSxiPSEobnVsbD09PU98fHZvaWQgMD09PU98fCFPLnNoYWR5RG9tRmFzdFdhbGspO3RoaXMubT1bXTt0aGlzLmc9W107dGhpcy5qPSExO3RoaXMuc2hhZHlEb21GYXN0V2Fsaz1iO3RoaXMuST0hYX1mdW5jdGlvbiBQKGEsYixkLGYpe3ZhciBjPXdpbmRvdy5TaGFkeURPTTtpZihhLnNoYWR5RG9tRmFzdFdhbGsmJmMmJmMuaW5Vc2Upe2lmKGIubm9kZVR5cGU9PT1Ob2RlLkVMRU1FTlRfTk9ERSYmZChiKSxiLnF1ZXJ5U2VsZWN0b3JBbGwpZm9yKGE9Yy5uYXRpdmVNZXRob2RzLnF1ZXJ5U2VsZWN0b3JBbGwuY2FsbChiLFwiKlwiKSxiPTA7YjxhLmxlbmd0aDtiKyspZChhW2JdKX1lbHNlIE0oYixkLGYpfWZ1bmN0aW9uIHRhKGEsYil7YS5qPSEwO2EubS5wdXNoKGIpfWZ1bmN0aW9uIHVhKGEsYil7YS5qPSEwO2EuZy5wdXNoKGIpfVxuZnVuY3Rpb24gUShhLGIpe2EuaiYmUChhLGIsZnVuY3Rpb24oZCl7cmV0dXJuIFIoYSxkKX0pfWZ1bmN0aW9uIFIoYSxiKXtpZihhLmomJiFiLl9fQ0VfcGF0Y2hlZCl7Yi5fX0NFX3BhdGNoZWQ9ITA7Zm9yKHZhciBkPTA7ZDxhLm0ubGVuZ3RoO2QrKylhLm1bZF0oYik7Zm9yKGQ9MDtkPGEuZy5sZW5ndGg7ZCsrKWEuZ1tkXShiKX19ZnVuY3Rpb24gUyhhLGIpe3ZhciBkPVtdO1AoYSxiLGZ1bmN0aW9uKGMpe3JldHVybiBkLnB1c2goYyl9KTtmb3IoYj0wO2I8ZC5sZW5ndGg7YisrKXt2YXIgZj1kW2JdOzE9PT1mLl9fQ0Vfc3RhdGU/YS5jb25uZWN0ZWRDYWxsYmFjayhmKTpUKGEsZil9fWZ1bmN0aW9uIFUoYSxiKXt2YXIgZD1bXTtQKGEsYixmdW5jdGlvbihjKXtyZXR1cm4gZC5wdXNoKGMpfSk7Zm9yKGI9MDtiPGQubGVuZ3RoO2IrKyl7dmFyIGY9ZFtiXTsxPT09Zi5fX0NFX3N0YXRlJiZhLmRpc2Nvbm5lY3RlZENhbGxiYWNrKGYpfX1cbmZ1bmN0aW9uIFYoYSxiLGQpe2Q9dm9pZCAwPT09ZD97fTpkO3ZhciBmPWQuSixjPWQudXBncmFkZXx8ZnVuY3Rpb24oZyl7cmV0dXJuIFQoYSxnKX0sZT1bXTtQKGEsYixmdW5jdGlvbihnKXthLmomJlIoYSxnKTtpZihcImxpbmtcIj09PWcubG9jYWxOYW1lJiZcImltcG9ydFwiPT09Zy5nZXRBdHRyaWJ1dGUoXCJyZWxcIikpe3ZhciBoPWcuaW1wb3J0O2ggaW5zdGFuY2VvZiBOb2RlJiYoaC5fX0NFX2lzSW1wb3J0RG9jdW1lbnQ9ITAsaC5fX0NFX3JlZ2lzdHJ5PWRvY3VtZW50Ll9fQ0VfcmVnaXN0cnkpO2gmJlwiY29tcGxldGVcIj09PWgucmVhZHlTdGF0ZT9oLl9fQ0VfZG9jdW1lbnRMb2FkSGFuZGxlZD0hMDpnLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsZnVuY3Rpb24oKXt2YXIgaz1nLmltcG9ydDtpZighay5fX0NFX2RvY3VtZW50TG9hZEhhbmRsZWQpe2suX19DRV9kb2N1bWVudExvYWRIYW5kbGVkPSEwO3ZhciBsPW5ldyBTZXQ7ZiYmKGYuZm9yRWFjaChmdW5jdGlvbihtKXtyZXR1cm4gbC5hZGQobSl9KSxcbmwuZGVsZXRlKGspKTtWKGEsayx7SjpsLHVwZ3JhZGU6Y30pfX0pfWVsc2UgZS5wdXNoKGcpfSxmKTtmb3IoYj0wO2I8ZS5sZW5ndGg7YisrKWMoZVtiXSl9XG5mdW5jdGlvbiBUKGEsYil7dHJ5e3ZhciBkPWIub3duZXJEb2N1bWVudCxmPWQuX19DRV9yZWdpc3RyeTt2YXIgYz1mJiYoZC5kZWZhdWx0Vmlld3x8ZC5fX0NFX2lzSW1wb3J0RG9jdW1lbnQpP1coZixiLmxvY2FsTmFtZSk6dm9pZCAwO2lmKGMmJnZvaWQgMD09PWIuX19DRV9zdGF0ZSl7Yy5jb25zdHJ1Y3Rpb25TdGFjay5wdXNoKGIpO3RyeXt0cnl7aWYobmV3IGMuY29uc3RydWN0b3JGdW5jdGlvbiE9PWIpdGhyb3cgRXJyb3IoXCJUaGUgY3VzdG9tIGVsZW1lbnQgY29uc3RydWN0b3IgZGlkIG5vdCBwcm9kdWNlIHRoZSBlbGVtZW50IGJlaW5nIHVwZ3JhZGVkLlwiKTt9ZmluYWxseXtjLmNvbnN0cnVjdGlvblN0YWNrLnBvcCgpfX1jYXRjaChrKXt0aHJvdyBiLl9fQ0Vfc3RhdGU9MixrO31iLl9fQ0Vfc3RhdGU9MTtiLl9fQ0VfZGVmaW5pdGlvbj1jO2lmKGMuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrJiZiLmhhc0F0dHJpYnV0ZXMoKSl7dmFyIGU9Yy5vYnNlcnZlZEF0dHJpYnV0ZXM7XG5mb3IoYz0wO2M8ZS5sZW5ndGg7YysrKXt2YXIgZz1lW2NdLGg9Yi5nZXRBdHRyaWJ1dGUoZyk7bnVsbCE9PWgmJmEuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGIsZyxudWxsLGgsbnVsbCl9fUooYikmJmEuY29ubmVjdGVkQ2FsbGJhY2soYil9fWNhdGNoKGspe1goayl9fU4ucHJvdG90eXBlLmNvbm5lY3RlZENhbGxiYWNrPWZ1bmN0aW9uKGEpe3ZhciBiPWEuX19DRV9kZWZpbml0aW9uO2lmKGIuY29ubmVjdGVkQ2FsbGJhY2spdHJ5e2IuY29ubmVjdGVkQ2FsbGJhY2suY2FsbChhKX1jYXRjaChkKXtYKGQpfX07Ti5wcm90b3R5cGUuZGlzY29ubmVjdGVkQ2FsbGJhY2s9ZnVuY3Rpb24oYSl7dmFyIGI9YS5fX0NFX2RlZmluaXRpb247aWYoYi5kaXNjb25uZWN0ZWRDYWxsYmFjayl0cnl7Yi5kaXNjb25uZWN0ZWRDYWxsYmFjay5jYWxsKGEpfWNhdGNoKGQpe1goZCl9fTtcbk4ucHJvdG90eXBlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaz1mdW5jdGlvbihhLGIsZCxmLGMpe3ZhciBlPWEuX19DRV9kZWZpbml0aW9uO2lmKGUuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrJiYtMTxlLm9ic2VydmVkQXR0cmlidXRlcy5pbmRleE9mKGIpKXRyeXtlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjay5jYWxsKGEsYixkLGYsYyl9Y2F0Y2goZyl7WChnKX19O1xuZnVuY3Rpb24gdmEoYSxiLGQsZil7dmFyIGM9Yi5fX0NFX3JlZ2lzdHJ5O2lmKGMmJihudWxsPT09Znx8XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI9PT1mKSYmKGM9VyhjLGQpKSl0cnl7dmFyIGU9bmV3IGMuY29uc3RydWN0b3JGdW5jdGlvbjtpZih2b2lkIDA9PT1lLl9fQ0Vfc3RhdGV8fHZvaWQgMD09PWUuX19DRV9kZWZpbml0aW9uKXRocm93IEVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnXCIrZCtcIic6IFRoZSByZXR1cm5lZCB2YWx1ZSB3YXMgbm90IGNvbnN0cnVjdGVkIHdpdGggdGhlIEhUTUxFbGVtZW50IGNvbnN0cnVjdG9yLlwiKTtpZihcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiE9PWUubmFtZXNwYWNlVVJJKXRocm93IEVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnXCIrZCtcIic6IFRoZSBjb25zdHJ1Y3RlZCBlbGVtZW50J3MgbmFtZXNwYWNlIG11c3QgYmUgdGhlIEhUTUwgbmFtZXNwYWNlLlwiKTtpZihlLmhhc0F0dHJpYnV0ZXMoKSl0aHJvdyBFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1wiK1xuZCtcIic6IFRoZSBjb25zdHJ1Y3RlZCBlbGVtZW50IG11c3Qgbm90IGhhdmUgYW55IGF0dHJpYnV0ZXMuXCIpO2lmKG51bGwhPT1lLmZpcnN0Q2hpbGQpdGhyb3cgRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdcIitkK1wiJzogVGhlIGNvbnN0cnVjdGVkIGVsZW1lbnQgbXVzdCBub3QgaGF2ZSBhbnkgY2hpbGRyZW4uXCIpO2lmKG51bGwhPT1lLnBhcmVudE5vZGUpdGhyb3cgRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdcIitkK1wiJzogVGhlIGNvbnN0cnVjdGVkIGVsZW1lbnQgbXVzdCBub3QgaGF2ZSBhIHBhcmVudCBub2RlLlwiKTtpZihlLm93bmVyRG9jdW1lbnQhPT1iKXRocm93IEVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnXCIrZCtcIic6IFRoZSBjb25zdHJ1Y3RlZCBlbGVtZW50J3Mgb3duZXIgZG9jdW1lbnQgaXMgaW5jb3JyZWN0LlwiKTtpZihlLmxvY2FsTmFtZSE9PWQpdGhyb3cgRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdcIitkK1wiJzogVGhlIGNvbnN0cnVjdGVkIGVsZW1lbnQncyBsb2NhbCBuYW1lIGlzIGluY29ycmVjdC5cIik7XG5yZXR1cm4gZX1jYXRjaChnKXtyZXR1cm4gWChnKSxiPW51bGw9PT1mP24uY2FsbChiLGQpOnAuY2FsbChiLGYsZCksT2JqZWN0LnNldFByb3RvdHlwZU9mKGIsSFRNTFVua25vd25FbGVtZW50LnByb3RvdHlwZSksYi5fX0NFX3N0YXRlPTIsYi5fX0NFX2RlZmluaXRpb249dm9pZCAwLFIoYSxiKSxifWI9bnVsbD09PWY/bi5jYWxsKGIsZCk6cC5jYWxsKGIsZixkKTtSKGEsYik7cmV0dXJuIGJ9XG5mdW5jdGlvbiBYKGEpe3ZhciBiPVwiXCIsZD1cIlwiLGY9MCxjPTA7YSBpbnN0YW5jZW9mIEVycm9yPyhiPWEubWVzc2FnZSxkPWEuc291cmNlVVJMfHxhLmZpbGVOYW1lfHxcIlwiLGY9YS5saW5lfHxhLmxpbmVOdW1iZXJ8fDAsYz1hLmNvbHVtbnx8YS5jb2x1bW5OdW1iZXJ8fDApOmI9XCJVbmNhdWdodCBcIitTdHJpbmcoYSk7dmFyIGU9dm9pZCAwO3ZvaWQgMD09PUVycm9yRXZlbnQucHJvdG90eXBlLmluaXRFcnJvckV2ZW50P2U9bmV3IEVycm9yRXZlbnQoXCJlcnJvclwiLHtjYW5jZWxhYmxlOiEwLG1lc3NhZ2U6YixmaWxlbmFtZTpkLGxpbmVubzpmLGNvbG5vOmMsZXJyb3I6YX0pOihlPWRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXJyb3JFdmVudFwiKSxlLmluaXRFcnJvckV2ZW50KFwiZXJyb3JcIiwhMSwhMCxiLGQsZiksZS5wcmV2ZW50RGVmYXVsdD1mdW5jdGlvbigpe09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLFwiZGVmYXVsdFByZXZlbnRlZFwiLHtjb25maWd1cmFibGU6ITAsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuITB9fSl9KTtcbnZvaWQgMD09PWUuZXJyb3ImJk9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLFwiZXJyb3JcIix7Y29uZmlndXJhYmxlOiEwLGVudW1lcmFibGU6ITAsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIGF9fSk7d2luZG93LmRpc3BhdGNoRXZlbnQoZSk7ZS5kZWZhdWx0UHJldmVudGVkfHxjb25zb2xlLmVycm9yKGEpfTtmdW5jdGlvbiB3YSgpe3ZhciBhPXRoaXM7dGhpcy5nPXZvaWQgMDt0aGlzLkY9bmV3IFByb21pc2UoZnVuY3Rpb24oYil7YS5sPWJ9KX13YS5wcm90b3R5cGUucmVzb2x2ZT1mdW5jdGlvbihhKXtpZih0aGlzLmcpdGhyb3cgRXJyb3IoXCJBbHJlYWR5IHJlc29sdmVkLlwiKTt0aGlzLmc9YTt0aGlzLmwoYSl9O2Z1bmN0aW9uIHhhKGEpe3ZhciBiPWRvY3VtZW50O3RoaXMubD12b2lkIDA7dGhpcy5oPWE7dGhpcy5nPWI7Vih0aGlzLmgsdGhpcy5nKTtcImxvYWRpbmdcIj09PXRoaXMuZy5yZWFkeVN0YXRlJiYodGhpcy5sPW5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMuRy5iaW5kKHRoaXMpKSx0aGlzLmwub2JzZXJ2ZSh0aGlzLmcse2NoaWxkTGlzdDohMCxzdWJ0cmVlOiEwfSkpfWZ1bmN0aW9uIHlhKGEpe2EubCYmYS5sLmRpc2Nvbm5lY3QoKX14YS5wcm90b3R5cGUuRz1mdW5jdGlvbihhKXt2YXIgYj10aGlzLmcucmVhZHlTdGF0ZTtcImludGVyYWN0aXZlXCIhPT1iJiZcImNvbXBsZXRlXCIhPT1ifHx5YSh0aGlzKTtmb3IoYj0wO2I8YS5sZW5ndGg7YisrKWZvcih2YXIgZD1hW2JdLmFkZGVkTm9kZXMsZj0wO2Y8ZC5sZW5ndGg7ZisrKVYodGhpcy5oLGRbZl0pfTtmdW5jdGlvbiBZKGEpe3RoaXMucz1uZXcgTWFwO3RoaXMudT1uZXcgTWFwO3RoaXMuQz1uZXcgTWFwO3RoaXMuQT0hMTt0aGlzLkI9bmV3IE1hcDt0aGlzLm89ZnVuY3Rpb24oYil7cmV0dXJuIGIoKX07dGhpcy5pPSExO3RoaXMudj1bXTt0aGlzLmg9YTt0aGlzLkQ9YS5JP25ldyB4YShhKTp2b2lkIDB9WS5wcm90b3R5cGUuSD1mdW5jdGlvbihhLGIpe3ZhciBkPXRoaXM7aWYoIShiIGluc3RhbmNlb2YgRnVuY3Rpb24pKXRocm93IG5ldyBUeXBlRXJyb3IoXCJDdXN0b20gZWxlbWVudCBjb25zdHJ1Y3RvciBnZXR0ZXJzIG11c3QgYmUgZnVuY3Rpb25zLlwiKTt6YSh0aGlzLGEpO3RoaXMucy5zZXQoYSxiKTt0aGlzLnYucHVzaChhKTt0aGlzLml8fCh0aGlzLmk9ITAsdGhpcy5vKGZ1bmN0aW9uKCl7cmV0dXJuIEFhKGQpfSkpfTtcblkucHJvdG90eXBlLmRlZmluZT1mdW5jdGlvbihhLGIpe3ZhciBkPXRoaXM7aWYoIShiIGluc3RhbmNlb2YgRnVuY3Rpb24pKXRocm93IG5ldyBUeXBlRXJyb3IoXCJDdXN0b20gZWxlbWVudCBjb25zdHJ1Y3RvcnMgbXVzdCBiZSBmdW5jdGlvbnMuXCIpO3phKHRoaXMsYSk7QmEodGhpcyxhLGIpO3RoaXMudi5wdXNoKGEpO3RoaXMuaXx8KHRoaXMuaT0hMCx0aGlzLm8oZnVuY3Rpb24oKXtyZXR1cm4gQWEoZCl9KSl9O2Z1bmN0aW9uIHphKGEsYil7aWYoIXJhKGIpKXRocm93IG5ldyBTeW50YXhFcnJvcihcIlRoZSBlbGVtZW50IG5hbWUgJ1wiK2IrXCInIGlzIG5vdCB2YWxpZC5cIik7aWYoVyhhLGIpKXRocm93IEVycm9yKFwiQSBjdXN0b20gZWxlbWVudCB3aXRoIG5hbWUgJ1wiKyhiK1wiJyBoYXMgYWxyZWFkeSBiZWVuIGRlZmluZWQuXCIpKTtpZihhLkEpdGhyb3cgRXJyb3IoXCJBIGN1c3RvbSBlbGVtZW50IGlzIGFscmVhZHkgYmVpbmcgZGVmaW5lZC5cIik7fVxuZnVuY3Rpb24gQmEoYSxiLGQpe2EuQT0hMDt2YXIgZjt0cnl7dmFyIGM9ZC5wcm90b3R5cGU7aWYoIShjIGluc3RhbmNlb2YgT2JqZWN0KSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiVGhlIGN1c3RvbSBlbGVtZW50IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGlzIG5vdCBhbiBvYmplY3QuXCIpO3ZhciBlPWZ1bmN0aW9uKG0pe3ZhciB4PWNbbV07aWYodm9pZCAwIT09eCYmISh4IGluc3RhbmNlb2YgRnVuY3Rpb24pKXRocm93IEVycm9yKFwiVGhlICdcIittK1wiJyBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uXCIpO3JldHVybiB4fTt2YXIgZz1lKFwiY29ubmVjdGVkQ2FsbGJhY2tcIik7dmFyIGg9ZShcImRpc2Nvbm5lY3RlZENhbGxiYWNrXCIpO3ZhciBrPWUoXCJhZG9wdGVkQ2FsbGJhY2tcIik7dmFyIGw9KGY9ZShcImF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFja1wiKSkmJmQub2JzZXJ2ZWRBdHRyaWJ1dGVzfHxbXX1jYXRjaChtKXt0aHJvdyBtO31maW5hbGx5e2EuQT0hMX1kPXtsb2NhbE5hbWU6YixcbmNvbnN0cnVjdG9yRnVuY3Rpb246ZCxjb25uZWN0ZWRDYWxsYmFjazpnLGRpc2Nvbm5lY3RlZENhbGxiYWNrOmgsYWRvcHRlZENhbGxiYWNrOmssYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrOmYsb2JzZXJ2ZWRBdHRyaWJ1dGVzOmwsY29uc3RydWN0aW9uU3RhY2s6W119O2EudS5zZXQoYixkKTthLkMuc2V0KGQuY29uc3RydWN0b3JGdW5jdGlvbixkKTtyZXR1cm4gZH1ZLnByb3RvdHlwZS51cGdyYWRlPWZ1bmN0aW9uKGEpe1YodGhpcy5oLGEpfTtcbmZ1bmN0aW9uIEFhKGEpe2lmKCExIT09YS5pKXthLmk9ITE7Zm9yKHZhciBiPVtdLGQ9YS52LGY9bmV3IE1hcCxjPTA7YzxkLmxlbmd0aDtjKyspZi5zZXQoZFtjXSxbXSk7VihhLmgsZG9jdW1lbnQse3VwZ3JhZGU6ZnVuY3Rpb24oayl7aWYodm9pZCAwPT09ay5fX0NFX3N0YXRlKXt2YXIgbD1rLmxvY2FsTmFtZSxtPWYuZ2V0KGwpO20/bS5wdXNoKGspOmEudS5oYXMobCkmJmIucHVzaChrKX19fSk7Zm9yKGM9MDtjPGIubGVuZ3RoO2MrKylUKGEuaCxiW2NdKTtmb3IoYz0wO2M8ZC5sZW5ndGg7YysrKXtmb3IodmFyIGU9ZFtjXSxnPWYuZ2V0KGUpLGg9MDtoPGcubGVuZ3RoO2grKylUKGEuaCxnW2hdKTsoZT1hLkIuZ2V0KGUpKSYmZS5yZXNvbHZlKHZvaWQgMCl9ZC5sZW5ndGg9MH19WS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKGEpe2lmKGE9Vyh0aGlzLGEpKXJldHVybiBhLmNvbnN0cnVjdG9yRnVuY3Rpb259O1xuWS5wcm90b3R5cGUud2hlbkRlZmluZWQ9ZnVuY3Rpb24oYSl7aWYoIXJhKGEpKXJldHVybiBQcm9taXNlLnJlamVjdChuZXcgU3ludGF4RXJyb3IoXCInXCIrYStcIicgaXMgbm90IGEgdmFsaWQgY3VzdG9tIGVsZW1lbnQgbmFtZS5cIikpO3ZhciBiPXRoaXMuQi5nZXQoYSk7aWYoYilyZXR1cm4gYi5GO2I9bmV3IHdhO3RoaXMuQi5zZXQoYSxiKTt2YXIgZD10aGlzLnUuaGFzKGEpfHx0aGlzLnMuaGFzKGEpO2E9LTE9PT10aGlzLnYuaW5kZXhPZihhKTtkJiZhJiZiLnJlc29sdmUodm9pZCAwKTtyZXR1cm4gYi5GfTtZLnByb3RvdHlwZS5wb2x5ZmlsbFdyYXBGbHVzaENhbGxiYWNrPWZ1bmN0aW9uKGEpe3RoaXMuRCYmeWEodGhpcy5EKTt2YXIgYj10aGlzLm87dGhpcy5vPWZ1bmN0aW9uKGQpe3JldHVybiBhKGZ1bmN0aW9uKCl7cmV0dXJuIGIoZCl9KX19O1xuZnVuY3Rpb24gVyhhLGIpe3ZhciBkPWEudS5nZXQoYik7aWYoZClyZXR1cm4gZDtpZihkPWEucy5nZXQoYikpe2Eucy5kZWxldGUoYik7dHJ5e3JldHVybiBCYShhLGIsZCgpKX1jYXRjaChmKXtYKGYpfX19WS5wcm90b3R5cGUuZGVmaW5lPVkucHJvdG90eXBlLmRlZmluZTtZLnByb3RvdHlwZS51cGdyYWRlPVkucHJvdG90eXBlLnVwZ3JhZGU7WS5wcm90b3R5cGUuZ2V0PVkucHJvdG90eXBlLmdldDtZLnByb3RvdHlwZS53aGVuRGVmaW5lZD1ZLnByb3RvdHlwZS53aGVuRGVmaW5lZDtZLnByb3RvdHlwZS5wb2x5ZmlsbERlZmluZUxhenk9WS5wcm90b3R5cGUuSDtZLnByb3RvdHlwZS5wb2x5ZmlsbFdyYXBGbHVzaENhbGxiYWNrPVkucHJvdG90eXBlLnBvbHlmaWxsV3JhcEZsdXNoQ2FsbGJhY2s7ZnVuY3Rpb24gWihhLGIsZCl7ZnVuY3Rpb24gZihjKXtyZXR1cm4gZnVuY3Rpb24oZSl7Zm9yKHZhciBnPVtdLGg9MDtoPGFyZ3VtZW50cy5sZW5ndGg7KytoKWdbaF09YXJndW1lbnRzW2hdO2g9W107Zm9yKHZhciBrPVtdLGw9MDtsPGcubGVuZ3RoO2wrKyl7dmFyIG09Z1tsXTttIGluc3RhbmNlb2YgRWxlbWVudCYmSihtKSYmay5wdXNoKG0pO2lmKG0gaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KWZvcihtPW0uZmlyc3RDaGlsZDttO209bS5uZXh0U2libGluZyloLnB1c2gobSk7ZWxzZSBoLnB1c2gobSl9Yy5hcHBseSh0aGlzLGcpO2ZvcihnPTA7ZzxrLmxlbmd0aDtnKyspVShhLGtbZ10pO2lmKEoodGhpcykpZm9yKGc9MDtnPGgubGVuZ3RoO2crKylrPWhbZ10sayBpbnN0YW5jZW9mIEVsZW1lbnQmJlMoYSxrKX19dm9pZCAwIT09ZC5wcmVwZW5kJiYoYi5wcmVwZW5kPWYoZC5wcmVwZW5kKSk7dm9pZCAwIT09ZC5hcHBlbmQmJihiLmFwcGVuZD1mKGQuYXBwZW5kKSl9O2Z1bmN0aW9uIENhKGEpe0RvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50PWZ1bmN0aW9uKGIpe3JldHVybiB2YShhLHRoaXMsYixudWxsKX07RG9jdW1lbnQucHJvdG90eXBlLmltcG9ydE5vZGU9ZnVuY3Rpb24oYixkKXtiPWFhLmNhbGwodGhpcyxiLCEhZCk7dGhpcy5fX0NFX3JlZ2lzdHJ5P1YoYSxiKTpRKGEsYik7cmV0dXJuIGJ9O0RvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50TlM9ZnVuY3Rpb24oYixkKXtyZXR1cm4gdmEoYSx0aGlzLGQsYil9O1ooYSxEb2N1bWVudC5wcm90b3R5cGUse3ByZXBlbmQ6YmEsYXBwZW5kOmNhfSl9O2Z1bmN0aW9uIERhKGEpe2Z1bmN0aW9uIGIoZil7cmV0dXJuIGZ1bmN0aW9uKGMpe2Zvcih2YXIgZT1bXSxnPTA7Zzxhcmd1bWVudHMubGVuZ3RoOysrZyllW2ddPWFyZ3VtZW50c1tnXTtnPVtdO2Zvcih2YXIgaD1bXSxrPTA7azxlLmxlbmd0aDtrKyspe3ZhciBsPWVba107bCBpbnN0YW5jZW9mIEVsZW1lbnQmJkoobCkmJmgucHVzaChsKTtpZihsIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudClmb3IobD1sLmZpcnN0Q2hpbGQ7bDtsPWwubmV4dFNpYmxpbmcpZy5wdXNoKGwpO2Vsc2UgZy5wdXNoKGwpfWYuYXBwbHkodGhpcyxlKTtmb3IoZT0wO2U8aC5sZW5ndGg7ZSsrKVUoYSxoW2VdKTtpZihKKHRoaXMpKWZvcihlPTA7ZTxnLmxlbmd0aDtlKyspaD1nW2VdLGggaW5zdGFuY2VvZiBFbGVtZW50JiZTKGEsaCl9fXZhciBkPUVsZW1lbnQucHJvdG90eXBlO3ZvaWQgMCE9PWphJiYoZC5iZWZvcmU9YihqYSkpO3ZvaWQgMCE9PWthJiYoZC5hZnRlcj1iKGthKSk7dm9pZCAwIT09bGEmJlxuKGQucmVwbGFjZVdpdGg9ZnVuY3Rpb24oZil7Zm9yKHZhciBjPVtdLGU9MDtlPGFyZ3VtZW50cy5sZW5ndGg7KytlKWNbZV09YXJndW1lbnRzW2VdO2U9W107Zm9yKHZhciBnPVtdLGg9MDtoPGMubGVuZ3RoO2grKyl7dmFyIGs9Y1toXTtrIGluc3RhbmNlb2YgRWxlbWVudCYmSihrKSYmZy5wdXNoKGspO2lmKGsgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KWZvcihrPWsuZmlyc3RDaGlsZDtrO2s9ay5uZXh0U2libGluZyllLnB1c2goayk7ZWxzZSBlLnB1c2goayl9aD1KKHRoaXMpO2xhLmFwcGx5KHRoaXMsYyk7Zm9yKGM9MDtjPGcubGVuZ3RoO2MrKylVKGEsZ1tjXSk7aWYoaClmb3IoVShhLHRoaXMpLGM9MDtjPGUubGVuZ3RoO2MrKylnPWVbY10sZyBpbnN0YW5jZW9mIEVsZW1lbnQmJlMoYSxnKX0pO3ZvaWQgMCE9PW1hJiYoZC5yZW1vdmU9ZnVuY3Rpb24oKXt2YXIgZj1KKHRoaXMpO21hLmNhbGwodGhpcyk7ZiYmVShhLHRoaXMpfSl9O2Z1bmN0aW9uIEVhKGEpe2Z1bmN0aW9uIGIoYyxlKXtPYmplY3QuZGVmaW5lUHJvcGVydHkoYyxcImlubmVySFRNTFwiLHtlbnVtZXJhYmxlOmUuZW51bWVyYWJsZSxjb25maWd1cmFibGU6ITAsZ2V0OmUuZ2V0LHNldDpmdW5jdGlvbihnKXt2YXIgaD10aGlzLGs9dm9pZCAwO0oodGhpcykmJihrPVtdLFAoYSx0aGlzLGZ1bmN0aW9uKHgpe3ghPT1oJiZrLnB1c2goeCl9KSk7ZS5zZXQuY2FsbCh0aGlzLGcpO2lmKGspZm9yKHZhciBsPTA7bDxrLmxlbmd0aDtsKyspe3ZhciBtPWtbbF07MT09PW0uX19DRV9zdGF0ZSYmYS5kaXNjb25uZWN0ZWRDYWxsYmFjayhtKX10aGlzLm93bmVyRG9jdW1lbnQuX19DRV9yZWdpc3RyeT9WKGEsdGhpcyk6UShhLHRoaXMpO3JldHVybiBnfX0pfWZ1bmN0aW9uIGQoYyxlKXtjLmluc2VydEFkamFjZW50RWxlbWVudD1mdW5jdGlvbihnLGgpe3ZhciBrPUooaCk7Zz1lLmNhbGwodGhpcyxnLGgpO2smJlUoYSxoKTtKKGcpJiZTKGEsaCk7cmV0dXJuIGd9fWZ1bmN0aW9uIGYoYyxcbmUpe2Z1bmN0aW9uIGcoaCxrKXtmb3IodmFyIGw9W107aCE9PWs7aD1oLm5leHRTaWJsaW5nKWwucHVzaChoKTtmb3Ioaz0wO2s8bC5sZW5ndGg7aysrKVYoYSxsW2tdKX1jLmluc2VydEFkamFjZW50SFRNTD1mdW5jdGlvbihoLGspe2g9aC50b0xvd2VyQ2FzZSgpO2lmKFwiYmVmb3JlYmVnaW5cIj09PWgpe3ZhciBsPXRoaXMucHJldmlvdXNTaWJsaW5nO2UuY2FsbCh0aGlzLGgsayk7ZyhsfHx0aGlzLnBhcmVudE5vZGUuZmlyc3RDaGlsZCx0aGlzKX1lbHNlIGlmKFwiYWZ0ZXJiZWdpblwiPT09aClsPXRoaXMuZmlyc3RDaGlsZCxlLmNhbGwodGhpcyxoLGspLGcodGhpcy5maXJzdENoaWxkLGwpO2Vsc2UgaWYoXCJiZWZvcmVlbmRcIj09PWgpbD10aGlzLmxhc3RDaGlsZCxlLmNhbGwodGhpcyxoLGspLGcobHx8dGhpcy5maXJzdENoaWxkLG51bGwpO2Vsc2UgaWYoXCJhZnRlcmVuZFwiPT09aClsPXRoaXMubmV4dFNpYmxpbmcsZS5jYWxsKHRoaXMsaCxrKSxnKHRoaXMubmV4dFNpYmxpbmcsbCk7XG5lbHNlIHRocm93IG5ldyBTeW50YXhFcnJvcihcIlRoZSB2YWx1ZSBwcm92aWRlZCAoXCIrU3RyaW5nKGgpK1wiKSBpcyBub3Qgb25lIG9mICdiZWZvcmViZWdpbicsICdhZnRlcmJlZ2luJywgJ2JlZm9yZWVuZCcsIG9yICdhZnRlcmVuZCcuXCIpO319eSYmKEVsZW1lbnQucHJvdG90eXBlLmF0dGFjaFNoYWRvdz1mdW5jdGlvbihjKXtjPXkuY2FsbCh0aGlzLGMpO2lmKGEuaiYmIWMuX19DRV9wYXRjaGVkKXtjLl9fQ0VfcGF0Y2hlZD0hMDtmb3IodmFyIGU9MDtlPGEubS5sZW5ndGg7ZSsrKWEubVtlXShjKX1yZXR1cm4gdGhpcy5fX0NFX3NoYWRvd1Jvb3Q9Y30pO3omJnouZ2V0P2IoRWxlbWVudC5wcm90b3R5cGUseik6SSYmSS5nZXQ/YihIVE1MRWxlbWVudC5wcm90b3R5cGUsSSk6dWEoYSxmdW5jdGlvbihjKXtiKGMse2VudW1lcmFibGU6ITAsY29uZmlndXJhYmxlOiEwLGdldDpmdW5jdGlvbigpe3JldHVybiBxLmNhbGwodGhpcywhMCkuaW5uZXJIVE1MfSxzZXQ6ZnVuY3Rpb24oZSl7dmFyIGc9XG5cInRlbXBsYXRlXCI9PT10aGlzLmxvY2FsTmFtZSxoPWc/dGhpcy5jb250ZW50OnRoaXMsaz1wLmNhbGwoZG9jdW1lbnQsdGhpcy5uYW1lc3BhY2VVUkksdGhpcy5sb2NhbE5hbWUpO2ZvcihrLmlubmVySFRNTD1lOzA8aC5jaGlsZE5vZGVzLmxlbmd0aDspdS5jYWxsKGgsaC5jaGlsZE5vZGVzWzBdKTtmb3IoZT1nP2suY29udGVudDprOzA8ZS5jaGlsZE5vZGVzLmxlbmd0aDspci5jYWxsKGgsZS5jaGlsZE5vZGVzWzBdKX19KX0pO0VsZW1lbnQucHJvdG90eXBlLnNldEF0dHJpYnV0ZT1mdW5jdGlvbihjLGUpe2lmKDEhPT10aGlzLl9fQ0Vfc3RhdGUpcmV0dXJuIEIuY2FsbCh0aGlzLGMsZSk7dmFyIGc9QS5jYWxsKHRoaXMsYyk7Qi5jYWxsKHRoaXMsYyxlKTtlPUEuY2FsbCh0aGlzLGMpO2EuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKHRoaXMsYyxnLGUsbnVsbCl9O0VsZW1lbnQucHJvdG90eXBlLnNldEF0dHJpYnV0ZU5TPWZ1bmN0aW9uKGMsZSxnKXtpZigxIT09dGhpcy5fX0NFX3N0YXRlKXJldHVybiBGLmNhbGwodGhpcyxcbmMsZSxnKTt2YXIgaD1FLmNhbGwodGhpcyxjLGUpO0YuY2FsbCh0aGlzLGMsZSxnKTtnPUUuY2FsbCh0aGlzLGMsZSk7YS5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sodGhpcyxlLGgsZyxjKX07RWxlbWVudC5wcm90b3R5cGUucmVtb3ZlQXR0cmlidXRlPWZ1bmN0aW9uKGMpe2lmKDEhPT10aGlzLl9fQ0Vfc3RhdGUpcmV0dXJuIEMuY2FsbCh0aGlzLGMpO3ZhciBlPUEuY2FsbCh0aGlzLGMpO0MuY2FsbCh0aGlzLGMpO251bGwhPT1lJiZhLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayh0aGlzLGMsZSxudWxsLG51bGwpfTtEJiYoRWxlbWVudC5wcm90b3R5cGUudG9nZ2xlQXR0cmlidXRlPWZ1bmN0aW9uKGMsZSl7aWYoMSE9PXRoaXMuX19DRV9zdGF0ZSlyZXR1cm4gRC5jYWxsKHRoaXMsYyxlKTt2YXIgZz1BLmNhbGwodGhpcyxjKSxoPW51bGwhPT1nO2U9RC5jYWxsKHRoaXMsYyxlKTtoIT09ZSYmYS5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sodGhpcyxjLGcsZT9cIlwiOm51bGwsbnVsbCk7XG5yZXR1cm4gZX0pO0VsZW1lbnQucHJvdG90eXBlLnJlbW92ZUF0dHJpYnV0ZU5TPWZ1bmN0aW9uKGMsZSl7aWYoMSE9PXRoaXMuX19DRV9zdGF0ZSlyZXR1cm4gRy5jYWxsKHRoaXMsYyxlKTt2YXIgZz1FLmNhbGwodGhpcyxjLGUpO0cuY2FsbCh0aGlzLGMsZSk7dmFyIGg9RS5jYWxsKHRoaXMsYyxlKTtnIT09aCYmYS5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sodGhpcyxlLGcsaCxjKX07b2E/ZChIVE1MRWxlbWVudC5wcm90b3R5cGUsb2EpOkgmJmQoRWxlbWVudC5wcm90b3R5cGUsSCk7cGE/ZihIVE1MRWxlbWVudC5wcm90b3R5cGUscGEpOmZhJiZmKEVsZW1lbnQucHJvdG90eXBlLGZhKTtaKGEsRWxlbWVudC5wcm90b3R5cGUse3ByZXBlbmQ6aGEsYXBwZW5kOmlhfSk7RGEoYSl9O3ZhciBGYT17fTtmdW5jdGlvbiBHYShhKXtmdW5jdGlvbiBiKCl7dmFyIGQ9dGhpcy5jb25zdHJ1Y3Rvcjt2YXIgZj1kb2N1bWVudC5fX0NFX3JlZ2lzdHJ5LkMuZ2V0KGQpO2lmKCFmKXRocm93IEVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCBhIGN1c3RvbSBlbGVtZW50OiBUaGUgY29uc3RydWN0b3Igd2FzIG5vdCByZWdpc3RlcmVkIHdpdGggYGN1c3RvbUVsZW1lbnRzYC5cIik7dmFyIGM9Zi5jb25zdHJ1Y3Rpb25TdGFjaztpZigwPT09Yy5sZW5ndGgpcmV0dXJuIGM9bi5jYWxsKGRvY3VtZW50LGYubG9jYWxOYW1lKSxPYmplY3Quc2V0UHJvdG90eXBlT2YoYyxkLnByb3RvdHlwZSksYy5fX0NFX3N0YXRlPTEsYy5fX0NFX2RlZmluaXRpb249ZixSKGEsYyksYzt2YXIgZT1jLmxlbmd0aC0xLGc9Y1tlXTtpZihnPT09RmEpdGhyb3cgRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdcIitmLmxvY2FsTmFtZStcIic6IFRoaXMgZWxlbWVudCB3YXMgYWxyZWFkeSBjb25zdHJ1Y3RlZC5cIik7Y1tlXT1GYTtcbk9iamVjdC5zZXRQcm90b3R5cGVPZihnLGQucHJvdG90eXBlKTtSKGEsZyk7cmV0dXJuIGd9Yi5wcm90b3R5cGU9bmEucHJvdG90eXBlO09iamVjdC5kZWZpbmVQcm9wZXJ0eShIVE1MRWxlbWVudC5wcm90b3R5cGUsXCJjb25zdHJ1Y3RvclwiLHt3cml0YWJsZTohMCxjb25maWd1cmFibGU6ITAsZW51bWVyYWJsZTohMSx2YWx1ZTpifSk7d2luZG93LkhUTUxFbGVtZW50PWJ9O2Z1bmN0aW9uIEhhKGEpe2Z1bmN0aW9uIGIoZCxmKXtPYmplY3QuZGVmaW5lUHJvcGVydHkoZCxcInRleHRDb250ZW50XCIse2VudW1lcmFibGU6Zi5lbnVtZXJhYmxlLGNvbmZpZ3VyYWJsZTohMCxnZXQ6Zi5nZXQsc2V0OmZ1bmN0aW9uKGMpe2lmKHRoaXMubm9kZVR5cGU9PT1Ob2RlLlRFWFRfTk9ERSlmLnNldC5jYWxsKHRoaXMsYyk7ZWxzZXt2YXIgZT12b2lkIDA7aWYodGhpcy5maXJzdENoaWxkKXt2YXIgZz10aGlzLmNoaWxkTm9kZXMsaD1nLmxlbmd0aDtpZigwPGgmJkoodGhpcykpe2U9QXJyYXkoaCk7Zm9yKHZhciBrPTA7azxoO2srKyllW2tdPWdba119fWYuc2V0LmNhbGwodGhpcyxjKTtpZihlKWZvcihjPTA7YzxlLmxlbmd0aDtjKyspVShhLGVbY10pfX19KX1Ob2RlLnByb3RvdHlwZS5pbnNlcnRCZWZvcmU9ZnVuY3Rpb24oZCxmKXtpZihkIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCl7dmFyIGM9SyhkKTtkPXQuY2FsbCh0aGlzLGQsZik7aWYoSih0aGlzKSlmb3IoZj1cbjA7ZjxjLmxlbmd0aDtmKyspUyhhLGNbZl0pO3JldHVybiBkfWM9ZCBpbnN0YW5jZW9mIEVsZW1lbnQmJkooZCk7Zj10LmNhbGwodGhpcyxkLGYpO2MmJlUoYSxkKTtKKHRoaXMpJiZTKGEsZCk7cmV0dXJuIGZ9O05vZGUucHJvdG90eXBlLmFwcGVuZENoaWxkPWZ1bmN0aW9uKGQpe2lmKGQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KXt2YXIgZj1LKGQpO2Q9ci5jYWxsKHRoaXMsZCk7aWYoSih0aGlzKSlmb3IodmFyIGM9MDtjPGYubGVuZ3RoO2MrKylTKGEsZltjXSk7cmV0dXJuIGR9Zj1kIGluc3RhbmNlb2YgRWxlbWVudCYmSihkKTtjPXIuY2FsbCh0aGlzLGQpO2YmJlUoYSxkKTtKKHRoaXMpJiZTKGEsZCk7cmV0dXJuIGN9O05vZGUucHJvdG90eXBlLmNsb25lTm9kZT1mdW5jdGlvbihkKXtkPXEuY2FsbCh0aGlzLCEhZCk7dGhpcy5vd25lckRvY3VtZW50Ll9fQ0VfcmVnaXN0cnk/VihhLGQpOlEoYSxkKTtyZXR1cm4gZH07Tm9kZS5wcm90b3R5cGUucmVtb3ZlQ2hpbGQ9ZnVuY3Rpb24oZCl7dmFyIGY9XG5kIGluc3RhbmNlb2YgRWxlbWVudCYmSihkKSxjPXUuY2FsbCh0aGlzLGQpO2YmJlUoYSxkKTtyZXR1cm4gY307Tm9kZS5wcm90b3R5cGUucmVwbGFjZUNoaWxkPWZ1bmN0aW9uKGQsZil7aWYoZCBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQpe3ZhciBjPUsoZCk7ZD12LmNhbGwodGhpcyxkLGYpO2lmKEoodGhpcykpZm9yKFUoYSxmKSxmPTA7ZjxjLmxlbmd0aDtmKyspUyhhLGNbZl0pO3JldHVybiBkfWM9ZCBpbnN0YW5jZW9mIEVsZW1lbnQmJkooZCk7dmFyIGU9di5jYWxsKHRoaXMsZCxmKSxnPUoodGhpcyk7ZyYmVShhLGYpO2MmJlUoYSxkKTtnJiZTKGEsZCk7cmV0dXJuIGV9O3cmJncuZ2V0P2IoTm9kZS5wcm90b3R5cGUsdyk6dGEoYSxmdW5jdGlvbihkKXtiKGQse2VudW1lcmFibGU6ITAsY29uZmlndXJhYmxlOiEwLGdldDpmdW5jdGlvbigpe2Zvcih2YXIgZj1bXSxjPXRoaXMuZmlyc3RDaGlsZDtjO2M9Yy5uZXh0U2libGluZyljLm5vZGVUeXBlIT09Tm9kZS5DT01NRU5UX05PREUmJlxuZi5wdXNoKGMudGV4dENvbnRlbnQpO3JldHVybiBmLmpvaW4oXCJcIil9LHNldDpmdW5jdGlvbihmKXtmb3IoO3RoaXMuZmlyc3RDaGlsZDspdS5jYWxsKHRoaXMsdGhpcy5maXJzdENoaWxkKTtudWxsIT1mJiZcIlwiIT09ZiYmci5jYWxsKHRoaXMsZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZikpfX0pfSl9O3ZhciBPPXdpbmRvdy5jdXN0b21FbGVtZW50cztmdW5jdGlvbiBJYSgpe3ZhciBhPW5ldyBOO0dhKGEpO0NhKGEpO1ooYSxEb2N1bWVudEZyYWdtZW50LnByb3RvdHlwZSx7cHJlcGVuZDpkYSxhcHBlbmQ6ZWF9KTtIYShhKTtFYShhKTt3aW5kb3cuQ3VzdG9tRWxlbWVudFJlZ2lzdHJ5PVk7YT1uZXcgWShhKTtkb2N1bWVudC5fX0NFX3JlZ2lzdHJ5PWE7T2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdyxcImN1c3RvbUVsZW1lbnRzXCIse2NvbmZpZ3VyYWJsZTohMCxlbnVtZXJhYmxlOiEwLHZhbHVlOmF9KX1PJiYhTy5mb3JjZVBvbHlmaWxsJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBPLmRlZmluZSYmXCJmdW5jdGlvblwiPT10eXBlb2YgTy5nZXR8fElhKCk7d2luZG93Ll9fQ0VfaW5zdGFsbFBvbHlmaWxsPUlhO1xufSkuY2FsbChzZWxmKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y3VzdG9tLWVsZW1lbnRzLm1pbi5qcy5tYXBcbiIsImltcG9ydCB7IHVybEFscGhhYmV0IH0gZnJvbSAnLi91cmwtYWxwaGFiZXQvaW5kZXguanMnXG5sZXQgcmFuZG9tID0gYnl0ZXMgPT4gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheShieXRlcykpXG5sZXQgY3VzdG9tUmFuZG9tID0gKGFscGhhYmV0LCBkZWZhdWx0U2l6ZSwgZ2V0UmFuZG9tKSA9PiB7XG4gIGxldCBtYXNrID0gKDIgPDwgKE1hdGgubG9nKGFscGhhYmV0Lmxlbmd0aCAtIDEpIC8gTWF0aC5MTjIpKSAtIDFcbiAgbGV0IHN0ZXAgPSAtfigoMS42ICogbWFzayAqIGRlZmF1bHRTaXplKSAvIGFscGhhYmV0Lmxlbmd0aClcbiAgcmV0dXJuIChzaXplID0gZGVmYXVsdFNpemUpID0+IHtcbiAgICBsZXQgaWQgPSAnJ1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBsZXQgYnl0ZXMgPSBnZXRSYW5kb20oc3RlcClcbiAgICAgIGxldCBqID0gc3RlcFxuICAgICAgd2hpbGUgKGotLSkge1xuICAgICAgICBpZCArPSBhbHBoYWJldFtieXRlc1tqXSAmIG1hc2tdIHx8ICcnXG4gICAgICAgIGlmIChpZC5sZW5ndGggPT09IHNpemUpIHJldHVybiBpZFxuICAgICAgfVxuICAgIH1cbiAgfVxufVxubGV0IGN1c3RvbUFscGhhYmV0ID0gKGFscGhhYmV0LCBzaXplID0gMjEpID0+XG4gIGN1c3RvbVJhbmRvbShhbHBoYWJldCwgc2l6ZSwgcmFuZG9tKVxubGV0IG5hbm9pZCA9IChzaXplID0gMjEpID0+XG4gIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQ4QXJyYXkoc2l6ZSkpLnJlZHVjZSgoaWQsIGJ5dGUpID0+IHtcbiAgICBieXRlICY9IDYzXG4gICAgaWYgKGJ5dGUgPCAzNikge1xuICAgICAgaWQgKz0gYnl0ZS50b1N0cmluZygzNilcbiAgICB9IGVsc2UgaWYgKGJ5dGUgPCA2Mikge1xuICAgICAgaWQgKz0gKGJ5dGUgLSAyNikudG9TdHJpbmcoMzYpLnRvVXBwZXJDYXNlKClcbiAgICB9IGVsc2UgaWYgKGJ5dGUgPiA2Mikge1xuICAgICAgaWQgKz0gJy0nXG4gICAgfSBlbHNlIHtcbiAgICAgIGlkICs9ICdfJ1xuICAgIH1cbiAgICByZXR1cm4gaWRcbiAgfSwgJycpXG5leHBvcnQgeyBuYW5vaWQsIGN1c3RvbUFscGhhYmV0LCBjdXN0b21SYW5kb20sIHVybEFscGhhYmV0LCByYW5kb20gfVxuIiwiaW1wb3J0IHsgbmFub2lkIH0gZnJvbSAnbmFub2lkJztcblxuLyogUGFja2VkIG1lc3NhZ2VzIHN0YXJ0IHdpdGggYSBjb2xvbiBhbmQgaGF2ZSB0d28gZml4ZWQgbGVuZ3RoIGZpZWxkcyBmb2xsb3dlZCBieSBvbmUgdmFyaWFibGUgZmllbGQ6XG4gIC0gY29sb24gKGxlbmd0aDogMSlcbiAgLSBkZXN0TG9jYXRpb24gKGxlbmd0aDogMjApXG4gIC0gY29sb24gKGxlbmd0aDogMSlcbiAgLSByZXNwb25zZUNvZGUgKGxlbmd0aDogMSlcbiAgLSBjb2xvbiAobGVuZ3RoOiAxKVxuICAtIHN0cmluZ2lmaWVkTWVzc2FnZSAobGVuZ3RoOiA/KVxuICovXG5cbmNvbnN0IGZpZWxkRGl2aWRlciA9ICc6JztcblxuY29uc3QgbGVuZ3RoT2ZEZXN0TG9jYXRpb25GaWVsZCA9IDIwO1xuY29uc3QgbGVuZ3RoT2ZGaWVsZERpdmlkZXIgPSBmaWVsZERpdmlkZXIubGVuZ3RoO1xuY29uc3QgbGVuZ3RoT2ZSZXNwb25zZUNvZGVGaWVsZCA9IDE7XG5cbmNvbnN0IHN0YXJ0T2ZEZXN0TG9jYXRpb25GaWVsZCA9IDE7XG5jb25zdCBzdGFydE9mUmVzcG9uc2VDb2RlRmllbGQgPVxuICBzdGFydE9mRGVzdExvY2F0aW9uRmllbGQgKyBsZW5ndGhPZkRlc3RMb2NhdGlvbkZpZWxkICsgbGVuZ3RoT2ZGaWVsZERpdmlkZXI7XG5jb25zdCBzdGFydE9mU3RyaW5naWZpZWRNZXNzYWdlRmllbGQgPVxuICBzdGFydE9mUmVzcG9uc2VDb2RlRmllbGQgKyBsZW5ndGhPZlJlc3BvbnNlQ29kZUZpZWxkICsgbGVuZ3RoT2ZGaWVsZERpdmlkZXI7XG5cbmV4cG9ydCBlbnVtIE1lc3NhZ2VFdmVudFR5cGUge1xuICBPcGVuU2VsZWN0b3JHZW5lcmF0b3JQYW5lbCA9ICdPcGVuU2VsZWN0b3JHZW5lcmF0b3JQYW5lbCcsXG4gIENsb3NlRWxlbWVudE9wdGlvbnNPdmVybGF5ID0gJ0Nsb3NlRWxlbWVudE9wdGlvbnNPdmVybGF5JyxcbiAgSW5zcGVjdEVsZW1lbnRNb2RlQ2hhbmdlZCA9ICdJbnNwZWN0RWxlbWVudE1vZGVDaGFuZ2VkJyxcbiAgT3BlbkVsZW1lbnRPcHRpb25zT3ZlcmxheSA9ICdPcGVuRWxlbWVudE9wdGlvbnNPdmVybGF5JyxcbiAgSGlkZUVsZW1lbnRPcHRpb25zT3ZlcmxheSA9ICdIaWRlRWxlbWVudE9wdGlvbnNPdmVybGF5JyxcbiAgUmVtb3ZlSGlkZUZyb21FbGVtZW50T3B0aW9uc092ZXJsYXkgPSAnUmVtb3ZlSGlkZUZyb21FbGVtZW50T3B0aW9uc092ZXJsYXknLFxuICBDb250ZW50U2NyaXB0TmVlZHNFbGVtZW50ID0gJ0NvbnRlbnRTY3JpcHROZWVkc0VsZW1lbnQnLFxuICBSdW5TZWxlY3RvckdlbmVyYXRvciA9ICdSdW5TZWxlY3RvckdlbmVyYXRvcicsXG4gIFJlc2V0U2VsZWN0b3JHZW5lcmF0b3IgPSAnUmVzZXRTZWxlY3RvckdlbmVyYXRvcicsXG4gIEFkZEluY2x1ZGVkRWxlbWVudCA9ICdBZGRJbmNsdWRlZEVsZW1lbnQnLFxuICBSZW1vdmVJbmNsdWRlZEVsZW1lbnQgPSAnUmVtb3ZlSW5jbHVkZWRFbGVtZW50JyxcbiAgQWRkRXhjbHVkZWRFbGVtZW50ID0gJ0FkZEV4Y2x1ZGVkRWxlbWVudCcsXG4gIFJlbW92ZUV4Y2x1ZGVkRWxlbWVudCA9ICdSZW1vdmVFeGNsdWRlZEVsZW1lbnQnLFxuICBGaW5pc2hlZFNlbGVjdG9yR2VuZXJhdGlvbiA9ICdGaW5pc2hlZFNlbGVjdG9yR2VuZXJhdGlvbicsXG4gIFVwZGF0ZUVsZW1lbnRPcHRpb25zID0gJ1VwZGF0ZUVsZW1lbnRPcHRpb25zJyxcbiAgQ2xvc2VEZXZ0b29sc1BhbmVsID0gJ0Nsb3NlRGV2dG9vbHNQYW5lbCcsXG4gIFRvZ2dsZUluc3BlY3RFbGVtZW50TW9kZSA9ICdUb2dnbGVJbnNwZWN0RWxlbWVudE1vZGUnLFxuICBVbmRvY2tlZEZvY3VzQ2hhbmdlID0gJ1VuZG9ja2VkRm9jdXNDaGFuZ2UnLFxufVxuXG5leHBvcnQgdHlwZSBJTWVzc2FnZUV2ZW50VHlwZSA9IGtleW9mIHR5cGVvZiBNZXNzYWdlRXZlbnRUeXBlO1xuXG5leHBvcnQgZW51bSBNZXNzYWdlTG9jYXRpb24ge1xuICBEZXZ0b29sc1ByaXZhdGUgPSAnRGV2dG9vbHNQcml2YXRlJyxcbiAgRGV2dG9vbHNTY3JpcHQgPSAnRGV2dG9vbHNTY3JpcHQnLFxuICBDb250ZW50U2NyaXB0ID0gJ0NvbnRlbnRTY3JpcHQnLFxuICBDb3JlID0gJ0NvcmUnLFxufVxuXG5leHBvcnQgdHlwZSBJTWVzc2FnZUxvY2F0aW9uID0ga2V5b2YgdHlwZW9mIE1lc3NhZ2VMb2NhdGlvbjtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uYW1pbmctY29udmVudGlvblxuZXhwb3J0IGNvbnN0IF9fX3NlbmRUb0NvcmUgPSAnX19fc2VuZFRvQ29yZSc7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb25cbmV4cG9ydCBjb25zdCBfX19yZWNlaXZlRnJvbUNvcmUgPSAnX19fcmVjZWl2ZUZyb21Db3JlJztcblxuZXhwb3J0IGNvbnN0IHNlbmRNZXNzYWdlRnJvbUJyb3dzZXJUb0NvcmVGbk5hbWUgPSAnc2VuZE1lc3NhZ2VGcm9tQnJvd3NlclRvVWxpeGVlQ29yZSc7XG5leHBvcnQgY29uc3QgZXZlbnRFbWl0dGVyTmFtZUluQnJvd3NlciA9ICdldmVudEVtaXR0ZXJGcm9tVWxpeGVlQ29yZSc7XG5cbmV4cG9ydCBlbnVtIFJlc3BvbnNlQ29kZSB7XG4gIFkgPSAnWScsXG4gIE4gPSAnTicsXG4gIFIgPSAnUicsXG59XG5cbmV4cG9ydCB0eXBlIElSZXNwb25zZUNvZGUgPSBrZXlvZiB0eXBlb2YgUmVzcG9uc2VDb2RlO1xuXG5leHBvcnQgaW50ZXJmYWNlIElNZXNzYWdlT2JqZWN0IHtcbiAgZGVzdExvY2F0aW9uOiBJTWVzc2FnZUxvY2F0aW9uO1xuICBvcmlnTG9jYXRpb246IElNZXNzYWdlTG9jYXRpb247XG4gIG9yaWdUYWJJZD86IG51bWJlcjtcbiAgcmVzcG9uc2VDb2RlOiBJUmVzcG9uc2VDb2RlO1xuICByZXNwb25zZUlkPzogc3RyaW5nO1xuICBwYXlsb2FkOiBhbnk7XG59XG5cbmV4cG9ydCB0eXBlIElSZXN0T2ZNZXNzYWdlT2JqZWN0ID0gT21pdDxJTWVzc2FnZU9iamVjdCwgJ2Rlc3RMb2NhdGlvbicgfCAncmVzcG9uc2VDb2RlJz47XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZUlkKCk6IHN0cmluZyB7XG4gIHJldHVybiBuYW5vaWQoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2tNZXNzYWdlKG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0IHwgc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJykge1xuICAgIGlmIChpc1BhY2tlZE1lc3NhZ2UobWVzc2FnZSkpIHJldHVybiBtZXNzYWdlO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBtZXNzYWdlIGZvcm1hdCcpO1xuICB9XG4gIGNvbnN0IHsgZGVzdExvY2F0aW9uIH0gPSBtZXNzYWdlO1xuICBjb25zdCByZXNwb25zZUNvZGUgPSBtZXNzYWdlLnJlc3BvbnNlQ29kZSB8fCBSZXNwb25zZUNvZGUuTjtcbiAgY29uc3QgbWVzc2FnZVRvU3RyaW5naWZ5ID0geyAuLi5tZXNzYWdlIH07XG4gIGRlbGV0ZSBtZXNzYWdlVG9TdHJpbmdpZnkuZGVzdExvY2F0aW9uO1xuICBkZWxldGUgbWVzc2FnZVRvU3RyaW5naWZ5LnJlc3BvbnNlQ29kZTtcbiAgY29uc3Qgc3RyaW5naWZpZWRNZXNzYWdlID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZVRvU3RyaW5naWZ5KTtcbiAgcmV0dXJuIGA6JHtkZXN0TG9jYXRpb24ucGFkRW5kKGxlbmd0aE9mRGVzdExvY2F0aW9uRmllbGQpfToke3Jlc3BvbnNlQ29kZX06JHtzdHJpbmdpZmllZE1lc3NhZ2V9YDtcbn1cblxuZnVuY3Rpb24gaXNQYWNrZWRNZXNzYWdlKG1lc3NhZ2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gbWVzc2FnZS5zdWJzdHIoMCwgMSkgPT09IGZpZWxkRGl2aWRlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lc3NhZ2VFeHBlY3RzUmVzcG9uc2UobWVzc2FnZTogSU1lc3NhZ2VPYmplY3QgfCBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJykge1xuICAgIGlmIChpc1BhY2tlZE1lc3NhZ2UobWVzc2FnZSkpIHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlQ29kZSA9IG1lc3NhZ2Uuc3Vic3RyKHN0YXJ0T2ZSZXNwb25zZUNvZGVGaWVsZCwgbGVuZ3RoT2ZSZXNwb25zZUNvZGVGaWVsZCk7XG4gICAgICByZXR1cm4gcmVzcG9uc2VDb2RlID09PSBSZXNwb25zZUNvZGUuWTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG1lc3NhZ2UgZm9ybWF0Jyk7XG4gIH1cbiAgcmV0dXJuIG1lc3NhZ2UucmVzcG9uc2VDb2RlID09PSBSZXNwb25zZUNvZGUuWTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUmVzcG9uc2VNZXNzYWdlKG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0IHwgc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoaXNQYWNrZWRNZXNzYWdlKG1lc3NhZ2UpKSB7XG4gICAgICBjb25zdCByZXNwb25zZUNvZGUgPSBtZXNzYWdlLnN1YnN0cihzdGFydE9mUmVzcG9uc2VDb2RlRmllbGQsIGxlbmd0aE9mUmVzcG9uc2VDb2RlRmllbGQpO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlQ29kZSA9PT0gUmVzcG9uc2VDb2RlLlI7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBtZXNzYWdlIGZvcm1hdCcpO1xuICB9XG4gIHJldHVybiBtZXNzYWdlLnJlc3BvbnNlQ29kZSA9PT0gUmVzcG9uc2VDb2RlLlI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0U3RyaW5naWZpZWRDb21wb25lbnRzRnJvbU1lc3NhZ2UoXG4gIG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0IHwgc3RyaW5nLFxuKTogW2Rlc3RMb2NhdGlvbjogc3RyaW5nLCByZXNwb25zZUNvZGU6IGtleW9mIHR5cGVvZiBSZXNwb25zZUNvZGUsIHN0cmluZ2lmaWVkTWVzc2FnZTogc3RyaW5nXSB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgaXNQYWNrZWRNZXNzYWdlKG1lc3NhZ2UpKSB7XG4gICAgY29uc3QgZGVzdExvY2F0aW9uID0gbWVzc2FnZS5zdWJzdHIoc3RhcnRPZkRlc3RMb2NhdGlvbkZpZWxkLCBsZW5ndGhPZkRlc3RMb2NhdGlvbkZpZWxkKTtcbiAgICBjb25zdCByZXNwb25zZUNvZGUgPSBtZXNzYWdlLnN1YnN0cihzdGFydE9mUmVzcG9uc2VDb2RlRmllbGQsIGxlbmd0aE9mUmVzcG9uc2VDb2RlRmllbGQpO1xuICAgIGNvbnN0IHN0cmluZ2lmaWVkTWVzc2FnZSA9IG1lc3NhZ2Uuc3Vic3RyKHN0YXJ0T2ZTdHJpbmdpZmllZE1lc3NhZ2VGaWVsZCk7XG4gICAgcmV0dXJuIFtkZXN0TG9jYXRpb24udHJpbSgpLCByZXNwb25zZUNvZGUgYXMgYW55LCBzdHJpbmdpZmllZE1lc3NhZ2VdO1xuICB9XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHRocm93IG5ldyBFcnJvcignVW5rbm93biBtZXNzYWdlIGZvcm1hdCcpO1xuXG4gIGNvbnN0IHsgZGVzdExvY2F0aW9uLCByZXNwb25zZUNvZGUsIC4uLm1lc3NhZ2VUb1N0cmluZ2lmeSB9ID0gbWVzc2FnZTtcbiAgY29uc3Qgc3RyaW5naWZpZWRNZXNzYWdlID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZVRvU3RyaW5naWZ5KTtcbiAgcmV0dXJuIFtkZXN0TG9jYXRpb24sIHJlc3BvbnNlQ29kZSB8fCBSZXNwb25zZUNvZGUuTiwgc3RyaW5naWZpZWRNZXNzYWdlXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RSZXNwb25zZUlkRnJvbU1lc3NhZ2UobWVzc2FnZTogSU1lc3NhZ2VPYmplY3QgfCBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIGlzUGFja2VkTWVzc2FnZShtZXNzYWdlKSkge1xuICAgIGNvbnN0IHN0cmluZ2lmaWVkTWVzc2FnZSA9IG1lc3NhZ2Uuc3Vic3RyKHN0YXJ0T2ZTdHJpbmdpZmllZE1lc3NhZ2VGaWVsZCk7XG4gICAgcmV0dXJuIEpTT04ucGFyc2Uoc3RyaW5naWZpZWRNZXNzYWdlKS5yZXNwb25zZUlkIGFzIHN0cmluZztcbiAgfVxuICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gbXVzdCBiZSBzdHJpbmdpZmllZE1lc3NhZ2VcbiAgICByZXR1cm4gSlNPTi5wYXJzZShtZXNzYWdlKS5yZXNwb25zZUlkIGFzIHN0cmluZztcbiAgfVxuICByZXR1cm4gbWVzc2FnZS5yZXNwb25zZUlkO1xufVxuIiwiaW1wb3J0IHtcbiAgTWVzc2FnZUV2ZW50VHlwZSxcbiAgX19fc2VuZFRvQ29yZSxcbiAgSU1lc3NhZ2VPYmplY3QsXG4gIE1lc3NhZ2VMb2NhdGlvbixcbiAgcGFja01lc3NhZ2UsXG4gIFJlc3BvbnNlQ29kZVxufSBmcm9tICdAdWxpeGVlL2Rlc2t0b3AtY29yZS9saWIvQnJpZGdlSGVscGVycyc7XG5pbXBvcnQgRWxlbWVudHNCdWNrZXQgZnJvbSAnLi9FbGVtZW50c0J1Y2tldCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVsZW1lbnRPcHRpb25zT3ZlcmxheSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcHVibGljIGhhc1N0YXJ0ZWRJbml0aWFsaXphdGlvbiA9IGZhbHNlO1xuICBwdWJsaWMgaGFzRmluaXNoZWRJbml0aWFsaXphdGlvbiA9IGZhbHNlO1xuICBwdWJsaWMgZWxlbWVudHNCdWNrZXQ6IEVsZW1lbnRzQnVja2V0O1xuXG4gIHByaXZhdGUgaXNPcGVuID0gZmFsc2U7XG4gIHByaXZhdGUgaXNUbXBIaWRkZW4gPSBmYWxzZTtcblxuICBwcml2YXRlIHNlbGVjdGVkRWxlbTogSFRNTEVsZW1lbnQ7XG4gIHByaXZhdGUgc2VsZWN0ZWRCYWNrZW5kTm9kZUlkOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSB0aXRsZU5hbWVFbGVtOiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSBwb3NpdGlvbkVsZW06IEhUTUxFbGVtZW50O1xuXG4gIHByaXZhdGUgaGlnaGxpZ2h0RWxlbTogSFRNTEVsZW1lbnQ7XG4gIHByaXZhdGUgb3ZlcmxheUVsZW06IEhUTUxFbGVtZW50O1xuXG4gIHByaXZhdGUgbXVzdEluY2x1ZGVUb2dnbGU6IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIG11c3RFeGNsdWRlVG9nZ2xlOiBIVE1MRWxlbWVudDtcblxuICBwdWJsaWMgYXR0YWNoRWxlbWVudHNCdWNrZXQoZWxlbWVudHNCdWNrZXQ6IEVsZW1lbnRzQnVja2V0KSB7XG4gICAgdGhpcy5lbGVtZW50c0J1Y2tldCA9IGVsZW1lbnRzQnVja2V0O1xuICB9XG5cbiAgcHVibGljIG9wZW5CeUJhY2tlbmROb2RlSWQoYmFja2VuZE5vZGVJZDogbnVtYmVyKSB7XG4gICAgdGhpcy5lbGVtZW50c0J1Y2tldC5nZXRCeUJhY2tlbmROb2RlSWQoYmFja2VuZE5vZGVJZClcbiAgICAgIC50aGVuKGVsZW1lbnQgPT4gdGhpcy5vcGVuKGJhY2tlbmROb2RlSWQsIGVsZW1lbnQpKVxuICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYEVSUk9SOiBDb3VsZCBub3QgZmV0Y2ggZWxlbWVudCBmb3IgYmFja2VuZE5vZGVJZDogJHtiYWNrZW5kTm9kZUlkfWAsIGVycm9yKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHVibGljIG9wZW4oYmFja2VuZE5vZGVJZDogbnVtYmVyLCBlbGVtZW50OiBIVE1MRWxlbWVudCkge1xuICAgIGlmICghdGhpcy5oYXNGaW5pc2hlZEluaXRpYWxpemF0aW9uKSB7XG4gICAgICB0aGlzLmhhc0ZpbmlzaGVkSW5pdGlhbGl6YXRpb24gPSB0cnVlO1xuICAgICAgcmV0dXJuIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLm9wZW4oYmFja2VuZE5vZGVJZCwgZWxlbWVudCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnNlbGVjdGVkRWxlbSA9IGVsZW1lbnQ7XG4gICAgdGhpcy5zZWxlY3RlZEJhY2tlbmROb2RlSWQgPSBiYWNrZW5kTm9kZUlkO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG4gICAgY29uc3QgdGFnTmFtZSA9IGVsZW1lbnQubG9jYWxOYW1lO1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5mcm9tKGVsZW1lbnQuY2xhc3NMaXN0KTtcbiAgICBjb25zdCB0aXRsZVRleHQgPSBbYDxzcGFuIGNsYXNzPVwidGFnXCI+JHt0YWdOYW1lfTwvc3Bhbj5gLCAuLi5jbGFzc2VzXS5qb2luKCcuJyk7XG5cbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIHRvcCwgbGVmdCB9ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBhYnNMZWZ0ID0gbGVmdCArIHdpbmRvdy5zY3JvbGxYO1xuICAgIGNvbnN0IGFic1RvcCA9IHRvcCArIHdpbmRvdy5zY3JvbGxZO1xuXG4gICAgY29uc3QgcG9zaXRpb25UZXh0ID0gYCR7TWF0aC5yb3VuZCh3aWR0aCAqIDEwMCkvMTAwfSB4ICR7TWF0aC5yb3VuZChoZWlnaHQgKiAxMDApLzEwMH1gO1xuXG4gICAgdGhpcy5pc09wZW4gPSB0cnVlO1xuICAgIHRoaXMuc3R5bGUubGVmdCA9IGAke2Fic0xlZnR9cHhgO1xuICAgIHRoaXMuc3R5bGUudG9wID0gYCR7YWJzVG9wfXB4YDtcbiAgICB0aGlzLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgO1xuICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gYCR7aGVpZ2h0fXB4YDtcblxuICAgIHRoaXMudGl0bGVOYW1lRWxlbS5pbm5lckhUTUwgPSB0aXRsZVRleHQ7XG4gICAgdGhpcy5wb3NpdGlvbkVsZW0udGV4dENvbnRlbnQgPSBwb3NpdGlvblRleHQ7XG4gICAgdGhpcy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICAgIGNvbnN0IG92ZXJsYXlIZWlnaHQgPSB0aGlzLm92ZXJsYXlFbGVtLm9mZnNldEhlaWdodDtcblxuICAgIGlmICh0b3AgLSBvdmVybGF5SGVpZ2h0IDwgMCkge1xuICAgICAgdGhpcy5vdmVybGF5RWxlbS5jbGFzc0xpc3QucmVtb3ZlKCd0b3AnKTtcbiAgICAgIHRoaXMub3ZlcmxheUVsZW0uY2xhc3NMaXN0LmFkZCgnYm90dG9tJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3ZlcmxheUVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnYm90dG9tJyk7XG4gICAgICB0aGlzLm92ZXJsYXlFbGVtLmNsYXNzTGlzdC5hZGQoJ3RvcCcpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmVsZW1lbnRzQnVja2V0LmlzSW5jbHVkZWRCYWNrZW5kTm9kZUlkKHRoaXMuc2VsZWN0ZWRCYWNrZW5kTm9kZUlkKSkge1xuICAgICAgdGhpcy5hZGRPbkNsYXNzVG9JbmNsdWRlVG9nZ2xlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkT2ZmQ2xhc3NUb0luY2x1ZGVUb2dnbGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lbGVtZW50c0J1Y2tldC5pc0V4Y2x1ZGVkQmFja2VuZE5vZGVJZCh0aGlzLnNlbGVjdGVkQmFja2VuZE5vZGVJZCkpIHtcbiAgICAgIHRoaXMuYWRkT25DbGFzc1RvRXhjbHVkZVRvZ2dsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZE9mZkNsYXNzVG9FeGNsdWRlVG9nZ2xlKCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHRtcEhpZGUodmFsdWU6IGJvb2xlYW4pIHtcbiAgICBpZiAoIXRoaXMuaXNPcGVuKSByZXR1cm47XG4gICAgaWYgKHZhbHVlID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmlzVG1wSGlkZGVuID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNUbXBIaWRkZW4pIHtcbiAgICAgIHRoaXMuaXNUbXBIaWRkZW4gPSBmYWxzZTtcbiAgICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsb3NlKCkge1xuICAgIHRoaXMuaXNPcGVuID0gZmFsc2U7XG4gICAgdGhpcy5pc1RtcEhpZGRlbiA9IGZhbHNlO1xuICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgfVxuXG4gIC8vIFBSSVZBVEUgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4gIHByaXZhdGUgYWRkT2ZmQ2xhc3NUb0luY2x1ZGVUb2dnbGUoKSB7XG4gICAgdGhpcy5tdXN0SW5jbHVkZVRvZ2dsZS5jbGFzc0xpc3QucmVtb3ZlKCdvbicpO1xuICAgIHRoaXMubXVzdEluY2x1ZGVUb2dnbGUuY2xhc3NMaXN0LmFkZCgnb2ZmJyk7XG4gIH1cblxuICBwcml2YXRlIGFkZE9uQ2xhc3NUb0luY2x1ZGVUb2dnbGUoKSB7XG4gICAgdGhpcy5tdXN0SW5jbHVkZVRvZ2dsZS5jbGFzc0xpc3QucmVtb3ZlKCdvZmYnKTtcbiAgICB0aGlzLm11c3RJbmNsdWRlVG9nZ2xlLmNsYXNzTGlzdC5hZGQoJ29uJyk7XG4gICAgdGhpcy5hZGRPZmZDbGFzc1RvRXhjbHVkZVRvZ2dsZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRPbkNsYXNzVG9FeGNsdWRlVG9nZ2xlKCkge1xuICAgIHRoaXMubXVzdEV4Y2x1ZGVUb2dnbGUuY2xhc3NMaXN0LmFkZCgnb24nKTtcbiAgICB0aGlzLm11c3RFeGNsdWRlVG9nZ2xlLmNsYXNzTGlzdC5yZW1vdmUoJ29mZicpO1xuICAgIHRoaXMuYWRkT2ZmQ2xhc3NUb0luY2x1ZGVUb2dnbGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkT2ZmQ2xhc3NUb0V4Y2x1ZGVUb2dnbGUoKSB7XG4gICAgdGhpcy5tdXN0RXhjbHVkZVRvZ2dsZS5jbGFzc0xpc3QuYWRkKCdvZmYnKTtcbiAgICB0aGlzLm11c3RFeGNsdWRlVG9nZ2xlLmNsYXNzTGlzdC5yZW1vdmUoJ29uJyk7XG5cbiAgfVxuXG4gIHByaXZhdGUgdG9nZ2xlSW5jbHVkZWQoKSB7XG4gICAgb3BlblNlbGVjdG9yR2VuZXJhdG9yUGFuZWwoKTtcbiAgICBjb25zdCBpc0luY2x1ZGVkID0gdGhpcy5lbGVtZW50c0J1Y2tldC5pc0luY2x1ZGVkQmFja2VuZE5vZGVJZCh0aGlzLnNlbGVjdGVkQmFja2VuZE5vZGVJZCk7XG4gICAgaWYgKGlzSW5jbHVkZWQpIHtcbiAgICAgIHRoaXMuZWxlbWVudHNCdWNrZXQucmVtb3ZlSW5jbHVkZWRFbGVtZW50KHRoaXMuc2VsZWN0ZWRCYWNrZW5kTm9kZUlkKTtcbiAgICAgIHRoaXMuYWRkT2ZmQ2xhc3NUb0luY2x1ZGVUb2dnbGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50c0J1Y2tldC5hZGRJbmNsdWRlZEVsZW1lbnQodGhpcy5zZWxlY3RlZEJhY2tlbmROb2RlSWQsIHRoaXMuc2VsZWN0ZWRFbGVtKTtcbiAgICAgIHRoaXMuYWRkT25DbGFzc1RvSW5jbHVkZVRvZ2dsZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdG9nZ2xlTXVzdEV4Y2x1ZGUoKSB7XG4gICAgb3BlblNlbGVjdG9yR2VuZXJhdG9yUGFuZWwoKTtcbiAgICBjb25zdCBpc0V4Y2x1ZGVkID0gdGhpcy5lbGVtZW50c0J1Y2tldC5pc0V4Y2x1ZGVkQmFja2VuZE5vZGVJZCh0aGlzLnNlbGVjdGVkQmFja2VuZE5vZGVJZCk7XG4gICAgaWYgKGlzRXhjbHVkZWQpIHtcbiAgICAgIHRoaXMuZWxlbWVudHNCdWNrZXQucmVtb3ZlRXhjbHVkZWRFbGVtZW50KHRoaXMuc2VsZWN0ZWRCYWNrZW5kTm9kZUlkKTtcbiAgICAgIHRoaXMuYWRkT2ZmQ2xhc3NUb0V4Y2x1ZGVUb2dnbGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50c0J1Y2tldC5hZGRFeGNsdWRlZEVsZW1lbnQodGhpcy5zZWxlY3RlZEJhY2tlbmROb2RlSWQsIHRoaXMuc2VsZWN0ZWRFbGVtKTtcbiAgICAgIHRoaXMuYWRkT25DbGFzc1RvRXhjbHVkZVRvZ2dsZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZSgpIHtcbiAgICB0aGlzLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICB0aGlzLnN0eWxlLnpJbmRleCA9ICcyMTQ3NDgzNjQ3JztcblxuICAgIHRoaXMuYXR0YWNoU2hhZG93KHsgbW9kZTogJ29wZW4nIH0pO1xuICAgIHRoaXMuY3JlYXRlU3R5bGVFbGVtKCk7XG4gICAgdGhpcy5jcmVhdGVIaWdobGlnaHRlckVsZW0oKTtcbiAgICB0aGlzLmNyZWF0ZU92ZXJsYXlFbGVtKCk7XG5cbiAgICB0aGlzLnNoYWRvd1Jvb3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XG4gICAgICBldmVudC5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVPdmVybGF5RWxlbSgpIHtcbiAgICBjb25zdCB0cmlhbmdsZVdpZHRoID0gMTU7XG4gICAgY29uc3Qgb3ZlcmxheUVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdmVybGF5RWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ292ZXJsYXknKTtcbiAgICBvdmVybGF5RWxlbS5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwib3ZlcmxheS1wYW5lbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwidGl0bGVcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibmFtZVwiPi0tLS0tLTwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwb3NpdGlvblwiPjwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xsZXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW50cm9cIj5TZWxlY3RvciBHZW5lcmF0b3IgT3B0aW9uczo8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwib3B0aW9uIG11c3QtaW5jbHVkZVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN5bWJvbCBwbHVzXCI+PC9kaXY+XG4gICAgICAgICAgICA8bGFiZWw+TXVzdCBJbmNsdWRlPC9sYWJlbD5cbiAgICAgICAgICAgIDxkaXYgaWQ9XCJtdXN0LWluY2x1ZGVcIiBjbGFzcz1cInRvZ2dsZS1jb21wb25lbnRcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbCBvZmZcIj5PRkY8L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWwgb25cIj5PTjwvc3Bhbj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInRvZ2dsZVwiPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm9wdGlvbiBtdXN0LWV4Y2x1ZGVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzeW1ib2wgbWludXNcIj48L2Rpdj5cbiAgICAgICAgICAgIDxsYWJlbD5NdXN0IEV4Y2x1ZGU8L2xhYmVsPlxuICAgICAgICAgICAgPGRpdiBpZD1cIm11c3QtZXhjbHVkZVwiIGNsYXNzPVwidG9nZ2xlLWNvbXBvbmVudFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsIG9mZlwiPk9GRjwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbCBvblwiPk9OPC9zcGFuPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9nZ2xlXCI+PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJvdmVybGF5LXRyaWFuZ2xlXCIgc3R5bGU9XCJ3aWR0aDogJHsoTWF0aC5zcXJ0KDIpKnRyaWFuZ2xlV2lkdGgpKzV9cHg7IGhlaWdodDogJHsoTWF0aC5zcXJ0KDIpKih0cmlhbmdsZVdpZHRoLzIpKSs1fXB4XCI+XG4gICAgICAgIDxkaXYgc3R5bGU9XCJ3aWR0aDogJHt0cmlhbmdsZVdpZHRofXB4OyBoZWlnaHQ6ICR7dHJpYW5nbGVXaWR0aH1weFwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMubXVzdEluY2x1ZGVUb2dnbGUgPSBvdmVybGF5RWxlbS5xdWVyeVNlbGVjdG9yKCdkaXYjbXVzdC1pbmNsdWRlJyk7XG4gICAgdGhpcy5tdXN0SW5jbHVkZVRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcbiAgICAgIHRoaXMudG9nZ2xlSW5jbHVkZWQoKTtcbiAgICAgIGV2ZW50LmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICB0aGlzLm11c3RFeGNsdWRlVG9nZ2xlID0gb3ZlcmxheUVsZW0ucXVlcnlTZWxlY3RvcignZGl2I211c3QtZXhjbHVkZScpO1xuICAgIHRoaXMubXVzdEV4Y2x1ZGVUb2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XG4gICAgICB0aGlzLnRvZ2dsZU11c3RFeGNsdWRlKCk7XG4gICAgICBldmVudC5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIH0pO1xuXG4gICAgdGhpcy5vdmVybGF5RWxlbSA9IG92ZXJsYXlFbGVtO1xuICAgIHRoaXMudGl0bGVOYW1lRWxlbSA9IG92ZXJsYXlFbGVtLnF1ZXJ5U2VsZWN0b3IoJy50aXRsZSAubmFtZScpO1xuICAgIHRoaXMucG9zaXRpb25FbGVtID0gb3ZlcmxheUVsZW0ucXVlcnlTZWxlY3RvcignLnRpdGxlIC5wb3NpdGlvbicpO1xuXG4gICAgdGhpcy5zaGFkb3dSb290LmFwcGVuZENoaWxkKG92ZXJsYXlFbGVtKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlSGlnaGxpZ2h0ZXJFbGVtKCkge1xuICAgIGlmICh0aGlzLmhpZ2hsaWdodEVsZW0pIHJldHVybjtcbiAgICB0aGlzLmhpZ2hsaWdodEVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmhpZ2hsaWdodEVsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdoaWdobGlnaHRlcicpO1xuICAgIHRoaXMuc2hhZG93Um9vdC5hcHBlbmRDaGlsZCh0aGlzLmhpZ2hsaWdodEVsZW0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdHlsZUVsZW0oKSB7XG4gICAgY29uc3QgY3NzID0gYFxuICAgICAgLmhpZ2hsaWdodGVyIHtcbiAgICAgICAgYmFja2dyb3VuZDogcmdiYSg5MSwgMTUwLCAyMDIsIDAuNSk7XG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgdG9wOiAwO1xuICAgICAgICBsZWZ0OiAwO1xuICAgICAgICB3aWR0aDogMTAwJTtcbiAgICAgICAgaGVpZ2h0OiAxMDAlO1xuICAgICAgICB6LWluZGV4OiAxO1xuICAgICAgfVxuICAgICAgLm92ZXJsYXkge1xuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgIHotaW5kZXg6IDI7XG4gICAgICB9ICAgICAgXG4gICAgICAub3ZlcmxheS1wYW5lbCB7XG4gICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICAgICAgbGVmdDogMDtcbiAgICAgICAgYm90dG9tOiAwO1xuICAgICAgICB6LWluZGV4OiAyO1xuICAgICAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbiAgICAgICAgcGFkZGluZzogNXB4IDEwcHg7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcbiAgICAgICAgYm94LXNoYWRvdzogMXB4IDFweCA4cHggMCByZ2IoMCAwIDAgLyA0MCUpO1xuICAgICAgICBtaW4td2lkdGg6IDI5MHB4O1xuICAgICAgICBtYXgtd2lkdGg6IDM5MHB4O1xuICAgICAgfVxuICAgICAgXG4gICAgICAub3ZlcmxheS10cmlhbmdsZSB7XG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICAgIH1cbiAgICAgIC5vdmVybGF5LXRyaWFuZ2xlIGRpdiB7XG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgdHJhbnNmb3JtOiByb3RhdGUoNDVkZWcpO1xuICAgICAgICBoZWlnaHQ6IDE1cHg7XG4gICAgICAgIHdpZHRoOiAxNXB4O1xuICAgICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICAgICAgYmFja2dyb3VuZDogI2ZmZmZmZjtcbiAgICAgICAgYm94LXNoYWRvdzogMXB4IDFweCA4cHggMCByZ2IoMCAwIDAgLyA0MCUpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAub3ZlcmxheS50b3Age1xuICAgICAgICBsZWZ0OiAwO1xuICAgICAgICBib3R0b206IGNhbGMoMTAwJSArIDhweCk7XG4gICAgICB9XG4gICAgICAub3ZlcmxheS50b3AgLm92ZXJsYXktdHJpYW5nbGUge1xuICAgICAgICBsZWZ0OiAxNXB4O1xuICAgICAgICB0b3A6IDEwMCU7XG4gICAgICAgIHotaW5kZXg6IDI7XG4gICAgICB9XG4gICAgICAub3ZlcmxheS50b3AgLm92ZXJsYXktdHJpYW5nbGUgZGl2IHtcbiAgICAgICAgdG9wOiAtN3B4O1xuICAgICAgICBsZWZ0OiA1cHg7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC5vdmVybGF5LmJvdHRvbSB7XG4gICAgICAgIGxlZnQ6IDA7XG4gICAgICAgIHRvcDogY2FsYygxMDAlICsgOHB4KTtcbiAgICAgIH1cbiAgICAgIC5vdmVybGF5LmJvdHRvbSAub3ZlcmxheS10cmlhbmdsZSB7XG4gICAgICAgIGxlZnQ6IDE1cHg7XG4gICAgICAgIHRvcDogLTE1cHg7XG4gICAgICAgIHotaW5kZXg6IDI7XG4gICAgICB9XG4gICAgICAub3ZlcmxheS5ib3R0b20gLm92ZXJsYXktdHJpYW5nbGUgZGl2IHtcbiAgICAgICAgdG9wOiA3cHg7XG4gICAgICAgIGxlZnQ6IDVweDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLnRpdGxlIHtcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgfVxuICAgICAgLnRpdGxlIC5uYW1lIHtcbiAgICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgICAgICAgY29sb3I6ICMxQTFBQTY7XG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgICBtYXJnaW4tcmlnaHQ6IDEwMHB4O1xuICAgICAgICBwYWRkaW5nOiA1cHggMDtcbiAgICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XG4gICAgICB9XG4gICAgICAudGl0bGUgLm5hbWUgLnRhZyB7XG4gICAgICAgIGNvbG9yOiAjODgxMjgwO1xuICAgICAgfVxuICAgICAgLnRpdGxlIC5wb3NpdGlvbiB7XG4gICAgICAgIHBhZGRpbmc6IDVweCAwO1xuICAgICAgICBjb2xvcjogc2lsdmVyO1xuICAgICAgICB3aWR0aDogMTAwcHg7XG4gICAgICAgIHRleHQtYWxpZ246IHJpZ2h0O1xuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgIHRvcDogMDtcbiAgICAgICAgcmlnaHQ6IDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC5jb250cm9sbGVyIHtcbiAgICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC4xKTtcbiAgICAgICAgcGFkZGluZzogNXB4IDA7XG4gICAgICB9XG4gICAgICAuY29udHJvbGxlciAuaW50cm8ge1xuICAgICAgICBmb250LXdlaWdodDogMTAwO1xuICAgICAgICBjb2xvcjogIzU5NTk1OTtcbiAgICAgICAgcGFkZGluZzogMTBweCAwOyBcbiAgICAgIH1cbiAgICAgIC5jb250cm9sbGVyIC5vcHRpb24ge1xuICAgICAgICBwYWRkaW5nOiAxMHB4IDA7XG4gICAgICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCByZ2JhKDAsMCwwLDAuMSk7XG4gICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICAgICAgbGluZS1oZWlnaHQ6IDIwcHg7XG4gICAgICB9XG4gICAgICAuY29udHJvbGxlciAub3B0aW9uIGxhYmVsIHtcbiAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgICB9XG4gICAgICAuY29udHJvbGxlciAub3B0aW9uIC5zeW1ib2wge1xuICAgICAgICB3aWR0aDogMjBweDtcbiAgICAgICAgaGVpZ2h0OiAyMHB4O1xuICAgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgICAgICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcbiAgICAgIH1cbiAgICAgIC5jb250cm9sbGVyIC5vcHRpb24gLnN5bWJvbDpiZWZvcmUge1xuICAgICAgICBjb250ZW50OiBcIlwiO1xuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgIGxlZnQ6IDRweDtcbiAgICAgICAgdG9wOiA2cHg7XG4gICAgICAgIHdpZHRoOiAxMnB4O1xuICAgICAgICBoZWlnaHQ6IDRweDtcbiAgICAgIH1cbiAgICAgIC5jb250cm9sbGVyIC5vcHRpb24gLnN5bWJvbC5wbHVzOmJlZm9yZSB7XG4gICAgICAgIGJhY2tncm91bmQ6ICMxQ0E2MDA7XG4gICAgICB9XG4gICAgICAuY29udHJvbGxlciAub3B0aW9uIC5zeW1ib2wucGx1czphZnRlciB7XG4gICAgICAgIGNvbnRlbnQ6IFwiXCI7XG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgdG9wOiAycHg7XG4gICAgICAgIGxlZnQ6IDhweDtcbiAgICAgICAgd2lkdGg6IDRweDtcbiAgICAgICAgaGVpZ2h0OiAxMnB4O1xuICAgICAgICBiYWNrZ3JvdW5kOiAjMUNBNjAwO1xuICAgICAgfVxuICAgICAgLmNvbnRyb2xsZXIgLm9wdGlvbiAuc3ltYm9sLm1pbnVzOmJlZm9yZSB7XG4gICAgICAgIGJhY2tncm91bmQ6ICNFMjAwMDA7XG4gICAgICB9XG4gICAgICAuY29udHJvbGxlciAub3B0aW9uLm11c3QtaW5jbHVkZSB7XG4gICAgICAgIGNvbG9yOiAjMUNBNjAwO1xuICAgICAgfVxuICAgICAgLmNvbnRyb2xsZXIgLm9wdGlvbi5tdXN0LWV4Y2x1ZGUge1xuICAgICAgICBjb2xvcjogI0UyMDAwMDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLnRvZ2dsZS1jb21wb25lbnQge1xuICAgICAgICBiYWNrZ3JvdW5kOiAjRUZFRkVGO1xuICAgICAgICB3aWR0aDogOTBweDtcbiAgICAgICAgaGVpZ2h0OiAyMHB4O1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjQjNCM0IzO1xuICAgICAgICBib3JkZXItcmFkaXVzOiAyNXB4O1xuICAgICAgICBmbG9hdDogcmlnaHQ7XG4gICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICAgICAgY29sb3I6IHNpbHZlcjtcbiAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggd2hpdGU7XG4gICAgICAgIGN1cnNvcjogZGVmYXVsdDtcbiAgICAgIH1cbiAgICAgIC50b2dnbGUtY29tcG9uZW50IC5sYWJlbCB7XG4gICAgICAgIHdpZHRoOiA0MHB4O1xuICAgICAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgICAgei1pbmRleDogMjtcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgfVxuICAgICAgLnRvZ2dsZS1jb21wb25lbnQgLnRvZ2dsZSB7XG4gICAgICAgIHdpZHRoOiA0NXB4O1xuICAgICAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbiAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzhFOEU4RTtcbiAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgICB0b3A6IC0xcHg7XG4gICAgICAgIGhlaWdodDogMjBweDtcbiAgICAgICAgei1pbmRleDogMTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMjBweDtcbiAgICAgICAgYm94LXNoYWRvdzogMXB4IDFweCAxcHggcmdiKDAgMCAwIC8gMTAlKTtcbiAgICAgIH1cbiAgICAgIC50b2dnbGUtY29tcG9uZW50Lm9uIC5sYWJlbC5vbiB7XG4gICAgICAgIGNvbG9yOiBibGFjaztcbiAgICAgIH1cbiAgICAgIC50b2dnbGUtY29tcG9uZW50Lm9mZiAubGFiZWwub2ZmIHtcbiAgICAgICAgY29sb3I6IGJsYWNrO1xuICAgICAgfVxuICAgICAgLnRvZ2dsZS1jb21wb25lbnQub24gLnRvZ2dsZSB7XG4gICAgICAgIHJpZ2h0OiAtMXB4O1xuICAgICAgfVxuICAgICAgLnRvZ2dsZS1jb21wb25lbnQub2ZmIC50b2dnbGUge1xuICAgICAgICBsZWZ0OiAtMXB4O1xuICAgICAgfVxuICAgIGA7XG4gICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuXG4gICAgdGhpcy5zaGFkb3dSb290LmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgaWYgKHRoaXMuaGFzU3RhcnRlZEluaXRpYWxpemF0aW9uKSByZXR1cm47XG4gICAgdGhpcy5oYXNTdGFydGVkSW5pdGlhbGl6YXRpb24gPSB0cnVlO1xuICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICB9XG59XG5cbi8vIEhFTFBFUlMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gb3BlblNlbGVjdG9yR2VuZXJhdG9yUGFuZWwoKSB7XG4gIGNvbnN0IG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0ID0ge1xuICAgIGRlc3RMb2NhdGlvbjogTWVzc2FnZUxvY2F0aW9uLkRldnRvb2xzUHJpdmF0ZSxcbiAgICBvcmlnTG9jYXRpb246IE1lc3NhZ2VMb2NhdGlvbi5Db250ZW50U2NyaXB0LFxuICAgIHJlc3BvbnNlQ29kZTogUmVzcG9uc2VDb2RlLk4sXG4gICAgcGF5bG9hZDoge1xuICAgICAgZXZlbnQ6IE1lc3NhZ2VFdmVudFR5cGUuT3BlblNlbGVjdG9yR2VuZXJhdG9yUGFuZWwsXG4gICAgfVxuICB9O1xuICBjb25zdCBwYWNrZWRNZXNzYWdlID0gcGFja01lc3NhZ2UobWVzc2FnZSk7XG4gIHdpbmRvd1tfX19zZW5kVG9Db3JlXShwYWNrZWRNZXNzYWdlKTtcbn1cbiIsImltcG9ydCB7XG4gIF9fX3JlY2VpdmVGcm9tQ29yZSxcbiAgX19fc2VuZFRvQ29yZSxcbiAgY3JlYXRlUmVzcG9uc2VJZCxcbiAgSU1lc3NhZ2VMb2NhdGlvbixcbiAgSU1lc3NhZ2VPYmplY3QsXG4gIElSZXNwb25zZUNvZGUsXG4gIElSZXN0T2ZNZXNzYWdlT2JqZWN0LFxuICBpc1Jlc3BvbnNlTWVzc2FnZSxcbiAgbWVzc2FnZUV4cGVjdHNSZXNwb25zZSxcbiAgTWVzc2FnZUxvY2F0aW9uLFxuICBwYWNrTWVzc2FnZSxcbiAgUmVzcG9uc2VDb2RlLFxufSBmcm9tICdAdWxpeGVlL2Rlc2t0b3AtY29yZS9saWIvQnJpZGdlSGVscGVycyc7XG5cbnR5cGUgSVJlc3BvbnNlRm4gPSAocmVzcG9uc2U6IGFueSkgPT4gdm9pZDtcblxuY29uc3QgY3VycmVudE1lc3NlbmdlckxvY2F0aW9uID0gTWVzc2FnZUxvY2F0aW9uLkNvbnRlbnRTY3JpcHQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZW5kVG9EZXZ0b29sc1NjcmlwdChwYXlsb2FkOiBhbnksIHJlc3BvbnNlQ2FsbGJhY2tGbj86IElSZXNwb25zZUZuKSB7XG4gIGNvbnN0IG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0ID0ge1xuICAgIGRlc3RMb2NhdGlvbjogTWVzc2FnZUxvY2F0aW9uLkRldnRvb2xzU2NyaXB0LFxuICAgIG9yaWdMb2NhdGlvbjogY3VycmVudE1lc3NlbmdlckxvY2F0aW9uLFxuICAgIHBheWxvYWQsXG4gICAgLi4uY29udmVydFJlc3BvbnNlRm5Ub0NvZGVBbmRJZChyZXNwb25zZUNhbGxiYWNrRm4pLFxuICB9O1xuICByb3V0ZUludGVybmFsbHkobWVzc2FnZSk7XG59XG5cbi8vIEB0cy1pZ25vcmVcbndpbmRvdy5zZW5kVG9EZXZ0b29sc1NjcmlwdCA9IHNlbmRUb0RldnRvb2xzU2NyaXB0O1xuXG5leHBvcnQgZnVuY3Rpb24gc2VuZFRvRGV2dG9vbHNQcml2YXRlKHBheWxvYWQ6IGFueSwgcmVzcG9uc2VDYWxsYmFja0ZuPzogSVJlc3BvbnNlRm4pIHtcbiAgY29uc3QgbWVzc2FnZTogSU1lc3NhZ2VPYmplY3QgPSB7XG4gICAgZGVzdExvY2F0aW9uOiBNZXNzYWdlTG9jYXRpb24uRGV2dG9vbHNQcml2YXRlLFxuICAgIG9yaWdMb2NhdGlvbjogY3VycmVudE1lc3NlbmdlckxvY2F0aW9uLFxuICAgIHBheWxvYWQsXG4gICAgLi4uY29udmVydFJlc3BvbnNlRm5Ub0NvZGVBbmRJZChyZXNwb25zZUNhbGxiYWNrRm4pLFxuICB9O1xuICByb3V0ZUludGVybmFsbHkobWVzc2FnZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZW5kVG9Db3JlKHBheWxvYWQ6IGFueSwgcmVzcG9uc2VDYWxsYmFja0ZuPzogSVJlc3BvbnNlRm4pIHtcbiAgY29uc3QgbWVzc2FnZTogSU1lc3NhZ2VPYmplY3QgPSB7XG4gICAgZGVzdExvY2F0aW9uOiBNZXNzYWdlTG9jYXRpb24uQ29yZSxcbiAgICBvcmlnTG9jYXRpb246IGN1cnJlbnRNZXNzZW5nZXJMb2NhdGlvbixcbiAgICBwYXlsb2FkLFxuICAgIC4uLmNvbnZlcnRSZXNwb25zZUZuVG9Db2RlQW5kSWQocmVzcG9uc2VDYWxsYmFja0ZuKSxcbiAgfTtcbiAgcm91dGVJbnRlcm5hbGx5KG1lc3NhZ2UpO1xufVxuXG5sZXQgb25NZXNzYWdlUGF5bG9hZEZuO1xuZXhwb3J0IGZ1bmN0aW9uIG9uTWVzc2FnZVBheWxvYWQoZm46IChwYXlsb2FkOiBhbnksIHJlc3BvbnNlRm46IElSZXNwb25zZUZuKSA9PiB2b2lkKSB7XG4gIGlmIChvbk1lc3NhZ2VQYXlsb2FkRm4pIHRocm93IG5ldyBFcnJvcignb25NZXNzYWdlIGhhcyBhbHJlYWR5IGJlZW4gY2FsbGVkJyk7XG4gIG9uTWVzc2FnZVBheWxvYWRGbiA9IGZuO1xufVxuXG4vLyBMSVNURU5FUiBUTyA8LT4gRlJPTSBDT1JFIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIHJlY2VpdmUgYW5kIHJvdXRlIG1lc3NhZ2VzIGNvbWluZyBpbiBmcm9tIGNvcmVcbndpbmRvd1tfX19yZWNlaXZlRnJvbUNvcmVdID0gKFxuICBkZXN0TG9jYXRpb246IElNZXNzYWdlTG9jYXRpb24sXG4gIHJlc3BvbnNlQ29kZTogSVJlc3BvbnNlQ29kZSxcbiAgcmVzdE9mTWVzc2FnZTogSVJlc3RPZk1lc3NhZ2VPYmplY3QsXG4pID0+IHtcbiAgY29uc3QgbWVzc2FnZTogSU1lc3NhZ2VPYmplY3QgPSB7XG4gICAgZGVzdExvY2F0aW9uLFxuICAgIHJlc3BvbnNlQ29kZSxcbiAgICAuLi5yZXN0T2ZNZXNzYWdlLFxuICB9O1xuICBpZiAobWVzc2FnZS5kZXN0TG9jYXRpb24gPT09IGN1cnJlbnRNZXNzZW5nZXJMb2NhdGlvbikge1xuICAgIGlmIChpc1Jlc3BvbnNlTWVzc2FnZShtZXNzYWdlKSkge1xuICAgICAgaGFuZGxlSW5jb21pbmdMb2NhbFJlc3BvbnNlKG1lc3NhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVJbmNvbWluZ0xvY2FsTWVzc2FnZShtZXNzYWdlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGRlc3RMb2NhdGlvbicpO1xuICB9XG59O1xuXG4vLyBJTlRFUk5BTCBWQVJJQUJMRVMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbmNvbnN0IHBlbmRpbmdCeVJlc3BvbnNlSWQ6IHtcbiAgW2lkOiBzdHJpbmddOiB7XG4gICAgcmVzcG9uc2VGbjogSVJlc3BvbnNlRm47XG4gICAgdGltZW91dElkOiBhbnk7XG4gIH07XG59ID0ge307XG5cbi8vIEhFTFBFUlMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIGhhbmRsZUluY29taW5nTG9jYWxNZXNzYWdlKG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0KSB7XG4gIGNvbnN0IG5lZWRzUmVzcG9uc2UgPSBtZXNzYWdlRXhwZWN0c1Jlc3BvbnNlKG1lc3NhZ2UpO1xuICBjb25zdCByZXNwb25zZUZuID0gbmVlZHNSZXNwb25zZSA/IHJlc3BvbnNlID0+IHNlbmRSZXNwb25zZUJhY2sobWVzc2FnZSwgcmVzcG9uc2UpIDogdW5kZWZpbmVkO1xuICBvbk1lc3NhZ2VQYXlsb2FkRm4obWVzc2FnZS5wYXlsb2FkLCByZXNwb25zZUZuKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlSW5jb21pbmdMb2NhbFJlc3BvbnNlKHJlc3BvbnNlOiBJTWVzc2FnZU9iamVjdCkge1xuICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ0J5UmVzcG9uc2VJZFtyZXNwb25zZS5yZXNwb25zZUlkXTtcbiAgaWYgKCFwZW5kaW5nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbmNvbWluZyByZXNwb25zZSAoJHtyZXNwb25zZS5yZXNwb25zZUlkfSkgY291bGQgbm90IGJlIGhhbmRsZWRgKTtcbiAgfVxuICBkZWxldGUgcGVuZGluZ0J5UmVzcG9uc2VJZFtyZXNwb25zZS5yZXNwb25zZUlkXTtcbiAgY2xlYXJUaW1lb3V0KHBlbmRpbmcudGltZW91dElkKTtcbiAgcGVuZGluZy5yZXNwb25zZUZuKHJlc3BvbnNlLnBheWxvYWQpO1xufVxuXG5mdW5jdGlvbiBzZW5kUmVzcG9uc2VCYWNrKG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0LCByZXNwb25zZVBheWxvYWQpIHtcbiAgY29uc3QgcmVzcG9uc2VDb2RlID0gUmVzcG9uc2VDb2RlLlI7XG4gIGNvbnN0IHsgcmVzcG9uc2VJZCwgb3JpZ0xvY2F0aW9uOiBkZXN0TG9jYXRpb24gfSA9IG1lc3NhZ2U7XG4gIGNvbnN0IHJlc3BvbnNlOiBJTWVzc2FnZU9iamVjdCA9IHtcbiAgICBkZXN0TG9jYXRpb24sXG4gICAgb3JpZ0xvY2F0aW9uOiBNZXNzYWdlTG9jYXRpb24uQ29yZSxcbiAgICByZXNwb25zZUlkLFxuICAgIHJlc3BvbnNlQ29kZSxcbiAgICBwYXlsb2FkOiByZXNwb25zZVBheWxvYWQsXG4gIH07XG4gIHJvdXRlSW50ZXJuYWxseShyZXNwb25zZSk7XG59XG5cbi8vIElOVEVSTkFMIFJPVVRJTkcgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gcm91dGVJbnRlcm5hbGx5KG1lc3NhZ2U6IElNZXNzYWdlT2JqZWN0KSB7XG4gIGNvbnN0IHBhY2tlZE1lc3NhZ2UgPSBwYWNrTWVzc2FnZShtZXNzYWdlKTtcbiAgd2luZG93W19fX3NlbmRUb0NvcmVdKHBhY2tlZE1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UmVzcG9uc2VGblRvQ29kZUFuZElkKHJlc3BvbnNlRm46IElSZXNwb25zZUZuKSB7XG4gIGlmIChyZXNwb25zZUZuKSB7XG4gICAgY29uc3QgcmVzcG9uc2VJZCA9IGNyZWF0ZVJlc3BvbnNlSWQoKTtcbiAgICBwZW5kaW5nQnlSZXNwb25zZUlkW3Jlc3BvbnNlSWRdID0ge1xuICAgICAgcmVzcG9uc2VGbixcbiAgICAgIHRpbWVvdXRJZDogc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVzcG9uc2UgZm9yICR7cmVzcG9uc2VJZH0gbm90IHJlY2VpdmVkIHdpdGhpbiAxMHNgKTtcbiAgICAgIH0sIDEwZTMpLFxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3BvbnNlQ29kZTogUmVzcG9uc2VDb2RlLlksXG4gICAgICByZXNwb25zZUlkLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICByZXNwb25zZUNvZGU6IFJlc3BvbnNlQ29kZS5OLFxuICB9O1xufVxuIiwiaW1wb3J0IHsgTWVzc2FnZUV2ZW50VHlwZSB9IGZyb20gJ0B1bGl4ZWUvZGVza3RvcC1jb3JlL2xpYi9CcmlkZ2VIZWxwZXJzJztcbmltcG9ydCB7IHNlbmRUb0NvcmUsIHNlbmRUb0RldnRvb2xzUHJpdmF0ZSwgc2VuZFRvRGV2dG9vbHNTY3JpcHQgfSBmcm9tICcuL2NvbnRlbnQvQ29udGVudE1lc3Nlbmdlcic7XG5cbmludGVyZmFjZSBJUmVzb2x2YWJsZTxUID0gYW55PiB7XG4gIHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZDtcbiAgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkO1xufVxuXG5jb25zdCBlbGVtZW50UHJvbWlzZXNCeUlkOiB7IFtpZDogc3RyaW5nXTogSVJlc29sdmFibGU8SFRNTEVsZW1lbnQ+IH0gPSB7fTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWxlbWVudHNCdWNrZXQge1xuICBwcml2YXRlIGluY2x1ZGVkRWxlbWVudHNCeUlkOiBNYXA8bnVtYmVyLCBIVE1MRWxlbWVudD4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZXhjbHVkZWRFbGVtZW50c0J5SWQ6IE1hcDxudW1iZXIsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcblxuICBwdWJsaWMgZ2V0IGluY2x1ZGVkRWxlbWVudHMoKTogSFRNTEVsZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5pbmNsdWRlZEVsZW1lbnRzQnlJZC52YWx1ZXMoKSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZ2V0QnlCYWNrZW5kTm9kZUlkKGJhY2tlbmROb2RlSWQ6IG51bWJlcik6IFByb21pc2U8SFRNTEVsZW1lbnQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgY29uc3QgY2FsbGJhY2tGbk5hbWUgPSB3aW5kb3cub25FbGVtZW50RnJvbUNvcmUubmFtZTtcbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8SFRNTEVsZW1lbnQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGVsZW1lbnRQcm9taXNlc0J5SWRbYmFja2VuZE5vZGVJZF0gPSB7IHJlc29sdmUsIHJlamVjdCB9O1xuICAgICAgc2VuZFRvQ29yZSh7IGV2ZW50OiBNZXNzYWdlRXZlbnRUeXBlLkNvbnRlbnRTY3JpcHROZWVkc0VsZW1lbnQsIGJhY2tlbmROb2RlSWQsIGNhbGxiYWNrRm5OYW1lIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBhd2FpdCBwcm9taXNlO1xuICAgIGRlbGV0ZSBlbGVtZW50UHJvbWlzZXNCeUlkW2JhY2tlbmROb2RlSWRdO1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgcHVibGljIHJlc2V0KCkge1xuICAgIHRoaXMuaW5jbHVkZWRFbGVtZW50c0J5SWQgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5leGNsdWRlZEVsZW1lbnRzQnlJZCA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIHB1YmxpYyBpc0luY2x1ZGVkQmFja2VuZE5vZGVJZChiYWNrZW5kTm9kZUlkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pbmNsdWRlZEVsZW1lbnRzQnlJZC5oYXMoYmFja2VuZE5vZGVJZCk7XG4gIH1cblxuICBwdWJsaWMgYWRkSW5jbHVkZWRFbGVtZW50KGJhY2tlbmROb2RlSWQ6IG51bWJlciwgZWxlbWVudDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCB0YWdUZXh0ID0gZXh0cmFjdFRhZ1RleHQoZWxlbWVudCk7XG4gICAgdGhpcy5pbmNsdWRlZEVsZW1lbnRzQnlJZC5zZXQoYmFja2VuZE5vZGVJZCwgZWxlbWVudCk7XG4gICAgdGhpcy5yZW1vdmVFeGNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZCk7XG5cbiAgICBjb25zdCBwYXlsb2FkID0geyBldmVudDogTWVzc2FnZUV2ZW50VHlwZS5BZGRJbmNsdWRlZEVsZW1lbnQsIG5hbWU6IHRhZ1RleHQsIGJhY2tlbmROb2RlSWQgfTtcbiAgICBzZW5kVG9EZXZ0b29sc1NjcmlwdChwYXlsb2FkKTtcbiAgICBzZW5kVG9EZXZ0b29sc1ByaXZhdGUocGF5bG9hZCk7XG4gIH1cblxuICBwdWJsaWMgcmVtb3ZlSW5jbHVkZWRFbGVtZW50KGJhY2tlbmROb2RlSWQ6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuaW5jbHVkZWRFbGVtZW50c0J5SWQuZGVsZXRlKGJhY2tlbmROb2RlSWQpO1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IHsgZXZlbnQ6IE1lc3NhZ2VFdmVudFR5cGUuUmVtb3ZlSW5jbHVkZWRFbGVtZW50LCBiYWNrZW5kTm9kZUlkIH07XG4gICAgc2VuZFRvRGV2dG9vbHNTY3JpcHQocGF5bG9hZCk7XG4gICAgc2VuZFRvRGV2dG9vbHNQcml2YXRlKHBheWxvYWQpO1xuICB9XG5cbiAgcHVibGljIGlzRXhjbHVkZWRCYWNrZW5kTm9kZUlkKGJhY2tlbmROb2RlSWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmV4Y2x1ZGVkRWxlbWVudHNCeUlkLmhhcyhiYWNrZW5kTm9kZUlkKTtcbiAgfVxuXG4gIHB1YmxpYyBhZGRFeGNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZDogbnVtYmVyLCBlbGVtZW50OiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHRhZ1RleHQgPSBleHRyYWN0VGFnVGV4dChlbGVtZW50KTtcbiAgICB0aGlzLmV4Y2x1ZGVkRWxlbWVudHNCeUlkLnNldChiYWNrZW5kTm9kZUlkLCBlbGVtZW50KTtcbiAgICB0aGlzLnJlbW92ZUluY2x1ZGVkRWxlbWVudChiYWNrZW5kTm9kZUlkKTtcblxuICAgIGNvbnN0IHBheWxvYWQgPSB7IGV2ZW50OiBNZXNzYWdlRXZlbnRUeXBlLkFkZEV4Y2x1ZGVkRWxlbWVudCwgYmFja2VuZE5vZGVJZCwgbmFtZTogdGFnVGV4dCB9O1xuICAgIHNlbmRUb0RldnRvb2xzU2NyaXB0KHBheWxvYWQpO1xuICAgIHNlbmRUb0RldnRvb2xzUHJpdmF0ZShwYXlsb2FkKTtcbiAgfVxuXG4gIHB1YmxpYyByZW1vdmVFeGNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5leGNsdWRlZEVsZW1lbnRzQnlJZC5kZWxldGUoYmFja2VuZE5vZGVJZCk7XG5cbiAgICBjb25zdCBwYXlsb2FkID0geyBldmVudDogTWVzc2FnZUV2ZW50VHlwZS5SZW1vdmVFeGNsdWRlZEVsZW1lbnQsIGJhY2tlbmROb2RlSWQgfTtcbiAgICBzZW5kVG9EZXZ0b29sc1NjcmlwdChwYXlsb2FkKTtcbiAgICBzZW5kVG9EZXZ0b29sc1ByaXZhdGUocGF5bG9hZCk7XG4gIH1cblxuICBwdWJsaWMgZ2V0QnlLZXkoYmFja2VuZE5vZGVJZDogbnVtYmVyKTogSFRNTEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLmluY2x1ZGVkRWxlbWVudHNCeUlkLmdldChiYWNrZW5kTm9kZUlkKSB8fCB0aGlzLmV4Y2x1ZGVkRWxlbWVudHNCeUlkLmdldChiYWNrZW5kTm9kZUlkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0VGFnVGV4dChlbGVtZW50OiBIVE1MRWxlbWVudCk6IHN0cmluZyB7XG4gIGNvbnN0IG91dGVySHRtbCA9IGVsZW1lbnQub3V0ZXJIVE1MO1xuICBjb25zdCBsZW4gPSBvdXRlckh0bWwubGVuZ3RoO1xuXG4gIGNvbnN0IG9wZW5UYWdMZW5ndGggPSBvdXRlckh0bWxbbGVuIC0gMl0gPT09ICcvJyA/IC8vIElzIHNlbGYtY2xvc2luZyB0YWc/XG4gICAgbGVuIDpcbiAgICBsZW4gLSBlbGVtZW50LmlubmVySFRNTC5sZW5ndGggLSAoZWxlbWVudC50YWdOYW1lLmxlbmd0aCArIDMpO1xuXG4gIHJldHVybiBvdXRlckh0bWwuc2xpY2UoMCwgb3BlblRhZ0xlbmd0aCk7XG59XG5cbi8vIEB0cy1pZ25vcmVcbndpbmRvdy5vbkVsZW1lbnRGcm9tQ29yZSA9IGZ1bmN0aW9uIG9uRWxlbWVudEZyb21Db3JlKGJhY2tlbmROb2RlSWQ6IG51bWJlciwgZWxlbWVudDogSFRNTEVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50UHJvbWlzZXNCeUlkW2JhY2tlbmROb2RlSWRdKSByZXR1cm47XG4gIGVsZW1lbnRQcm9taXNlc0J5SWRbYmFja2VuZE5vZGVJZF0ucmVzb2x2ZShlbGVtZW50KTtcbiAgZGVsZXRlIGVsZW1lbnRQcm9taXNlc0J5SWRbYmFja2VuZE5vZGVJZF07XG59O1xuIiwidHlwZSBJU2VsZWN0b3JPcHRpb24gPSBzdHJpbmdbXTtcblxuaW50ZXJmYWNlIElUYXJnZXQge1xuICBlbGVtZW50OiBFbGVtZW50O1xuICBzZWxlY3Rvck9wdGlvbnM6IElTZWxlY3Rvck9wdGlvbltdO1xufVxuXG50eXBlIElBbmNlc3RvcnMgPSBJVGFyZ2V0W107XG50eXBlIElMYXllcnMgPSBJVGFyZ2V0W107XG5cbmNvbnN0IFJhbmtCeVR5cGUgPSB7XG4gIHRhZzogMSxcbiAgaWQ6IDIsXG4gIGNsYXNzOiAzLFxuICBhdHRyOiA0LFxufTtcblxuZnVuY3Rpb24gc29ydEJ5TGVuZ3RoKGEsIGIpIHtcbiAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZpbmRTZWxlY3RvcnMoZWxlbWVudDogRWxlbWVudCkge1xuICBjb25zdCB0YXJnZXQgPSBnZW5lcmF0ZVRhcmdldChlbGVtZW50KTtcbiAgY29uc3QgYW5jZXN0b3JzID0gZ2VuZXJhdGVBbmNlc3RvcnMoZWxlbWVudCk7XG4gIGNvbnN0IGxheWVyS2V5UGFpcnMgPSBnZW5lcmF0ZUxheWVyS2V5UGFpcnModGFyZ2V0LCBhbmNlc3RvcnMpO1xuICBjb25zdCBsYXllcnMgPSBbLi4uYW5jZXN0b3JzLCB0YXJnZXRdO1xuICBjb25zdCBwb3NzaWJsZVNlbGVjdG9yQ291bnQgPSBjYWxjdWxhdGVQb3NzaWJsZVNlbGVjdG9yQ291bnQobGF5ZXJzLCBsYXllcktleVBhaXJzKTtcblxuICBjb25zb2xlLmxvZygndGFyZ2V0OiAnLCB0YXJnZXQpO1xuICBjb25zb2xlLmxvZygnYW5jZXN0b3JzOiAnLCBhbmNlc3RvcnMpO1xuICBjb25zb2xlLmxvZygnYW5jZXN0b3JzS2V5UGFpcnM6ICcsIGxheWVyS2V5UGFpcnMpO1xuICBjb25zb2xlLmxvZygncG9zc2libGVTZWxlY3RvcnM6ICcsIHBvc3NpYmxlU2VsZWN0b3JDb3VudCk7XG5cbiAgY29uc3Qgc2VsZWN0b3JzID0gZ2VuZXJhdGVTaG9ydFNlbGVjdG9ycyhsYXllcnMsIGxheWVyS2V5UGFpcnMpO1xuICBjb25zb2xlLmxvZygnc2VsZWN0b3JzOiAnLCBzZWxlY3RvcnMpO1xuXG4gIHJldHVybiBzZWxlY3RvcnMuc29ydChzb3J0QnlMZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVNob3J0U2VsZWN0b3JzKGxheWVyczogSUxheWVycywgYW5jZXN0b3JLZXlQYWlyczogc3RyaW5nW11bXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc2VsZWN0b3JzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBtYXhTZWxlY3RvckNvdW50ID0gMWUzO1xuICBsZXQgc2VsZWN0b3JEZXB0aCA9IDA7XG4gIHdoaWxlIChzZWxlY3RvcnMubGVuZ3RoIDwgbWF4U2VsZWN0b3JDb3VudCkge1xuICAgIGNvbnN0IG1heFNlbGVjdG9yQ291bnRSZW1haW5pbmcgPSBtYXhTZWxlY3RvckNvdW50IC0gc2VsZWN0b3JzLmxlbmd0aDtcbiAgICBjb25zdCBwb3NzaWJsZVNlbGVjdG9ycyA9IGZldGNoU2VsZWN0b3JzVG9DaGVjayhcbiAgICAgIHNlbGVjdG9yRGVwdGgsXG4gICAgICBsYXllcnMsXG4gICAgICBhbmNlc3RvcktleVBhaXJzLFxuICAgICAgbWF4U2VsZWN0b3JDb3VudFJlbWFpbmluZyxcbiAgICApO1xuICAgIGZvciAoY29uc3QgcG9zc2libGVTZWxlY3RvciBvZiBwb3NzaWJsZVNlbGVjdG9ycykge1xuICAgICAgY29uc3QgaGFzT25lTWF0Y2ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHBvc3NpYmxlU2VsZWN0b3IpLmxlbmd0aCA9PT0gMTtcbiAgICAgIGlmICghaGFzT25lTWF0Y2gpIGNvbnRpbnVlO1xuXG4gICAgICBzZWxlY3RvcnMucHVzaChwb3NzaWJsZVNlbGVjdG9yKTtcbiAgICB9XG4gICAgc2VsZWN0b3JEZXB0aCArPSAxO1xuICB9XG4gIHJldHVybiBzZWxlY3RvcnM7XG59XG5cbmZ1bmN0aW9uIGZldGNoU2VsZWN0b3JzVG9DaGVjayhcbiAgZGVwdGg6IG51bWJlcixcbiAgbGF5ZXJzOiBJTGF5ZXJzLFxuICBhbmNlc3RvcktleVBhaXJzOiBzdHJpbmdbXVtdLFxuICBtYXhTZWxlY3RvckNvdW50OiBudW1iZXIsXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHNlbGVjdG9ycyA9IFtdO1xuICBmb3IgKGNvbnN0IGFuY2VzdG9yS2V5cyBvZiBhbmNlc3RvcktleVBhaXJzLmZpbHRlcih4ID0+IHgubGVuZ3RoID09PSBkZXB0aCArIDIpKSB7XG4gICAgbGV0IGJhc2VTZWxlY3RvcnMgPSBbJyddO1xuICAgIGxldCBwcmV2S2V5O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIGFuY2VzdG9yS2V5cykge1xuICAgICAgbGV0IGlzRGlyZWN0U2libGluZyA9IGZhbHNlO1xuICAgICAgaWYgKHByZXZLZXkgJiYgTnVtYmVyKGtleSkgLSBOdW1iZXIocHJldktleSkgPT09IDEpIHtcbiAgICAgICAgaXNEaXJlY3RTaWJsaW5nID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJzW2tleV07XG4gICAgICBjb25zdCBzZWxlY3Rvck9wdGlvbnMgPSBsYXllci5zZWxlY3Rvck9wdGlvbnMuZmlsdGVyKHggPT4geC5sZW5ndGggPT09IGRlcHRoICsgMSk7XG4gICAgICBiYXNlU2VsZWN0b3JzID0gYXBwZW5kVG9TZWxlY3RvcnMoYmFzZVNlbGVjdG9ycywgc2VsZWN0b3JPcHRpb25zLCBpc0RpcmVjdFNpYmxpbmcpO1xuICAgIH1cbiAgICBzZWxlY3RvcnMucHVzaCguLi5iYXNlU2VsZWN0b3JzKTtcbiAgICBpZiAoc2VsZWN0b3JzLmxlbmd0aCA+PSBtYXhTZWxlY3RvckNvdW50KSBicmVhaztcbiAgfVxuICByZXR1cm4gc2VsZWN0b3JzO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRUb1NlbGVjdG9ycyhcbiAgYmFzZVNlbGVjdG9ycyxcbiAgc2VsZWN0b3JPcHRpb25zOiBJU2VsZWN0b3JPcHRpb25bXSxcbiAgaXNEaXJlY3RTaWJsaW5nOiBib29sZWFuLFxuKTogc3RyaW5nW10ge1xuICBjb25zdCBuZXdTZWxlY3RvcnMgPSBbXTtcbiAgY29uc3QgcmVsYXRpb24gPSBpc0RpcmVjdFNpYmxpbmcgPyAnID4gJyA6ICcgJztcbiAgZm9yIChjb25zdCBzZWxlY3Rvck9wdGlvbiBvZiBzZWxlY3Rvck9wdGlvbnMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbmV3UGFydCA9IHNlbGVjdG9yT3B0aW9uLmpvaW4oJycpO1xuICAgICAgZm9yIChjb25zdCBiYXNlU2VsZWN0b3Igb2YgYmFzZVNlbGVjdG9ycykge1xuICAgICAgICBuZXdTZWxlY3RvcnMucHVzaChgJHtiYXNlU2VsZWN0b3J9JHtyZWxhdGlvbn0ke25ld1BhcnR9YCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKHNlbGVjdG9yT3B0aW9uKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3U2VsZWN0b3JzO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUxheWVyS2V5UGFpcnModGFyZ2V0OiBJVGFyZ2V0LCBhbmNlc3RvcnM6IElBbmNlc3RvcnMpOiBzdHJpbmdbXVtdIHtcbiAgY29uc3QgYW5jZXN0b3JDb21iaW5hdGlvbnMgPSBnZW5lcmF0ZUFsbENvbWJpbmF0aW9ucyhPYmplY3Qua2V5cyhhbmNlc3RvcnMpKTtcbiAgY29uc3QgYWxsQ29tYmluYXRpb25zOiBzdHJpbmdbXVtdID0gW107XG4gIGZvciAoY29uc3QgYW5jZXN0b3JDb21iaW5hdGlvbiBvZiBhbmNlc3RvckNvbWJpbmF0aW9ucykge1xuICAgIGFsbENvbWJpbmF0aW9ucy5wdXNoKFsuLi5hbmNlc3RvckNvbWJpbmF0aW9uLCBhbmNlc3RvcnMubGVuZ3RoLnRvU3RyaW5nKCldKTtcbiAgfVxuICByZXR1cm4gYWxsQ29tYmluYXRpb25zLnNvcnQoc29ydEJ5TGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVUYXJnZXQoZWxlbWVudDogRWxlbWVudCk6IElUYXJnZXQge1xuICBjb25zdCBzZWxlY3Rvck9wdGlvbnMgPSBleHRyYWN0U2VsZWN0b3JPcHRpb25zKGVsZW1lbnQpO1xuICBjb25zdCBwYXJlbnRFbGVtZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICB0cnkge1xuICAgIGNvbnN0IHVuaXF1ZVRvUGFyZW50ID0gc2VsZWN0b3JPcHRpb25zLmZpbHRlcihcbiAgICAgIHggPT4gcGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKHguam9pbignJykpLmxlbmd0aCA9PT0gMSxcbiAgICApO1xuICAgIHJldHVybiB7IGVsZW1lbnQsIHNlbGVjdG9yT3B0aW9uczogdW5pcXVlVG9QYXJlbnQgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZyhzZWxlY3Rvck9wdGlvbnMpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQW5jZXN0b3JzKGVsZW1lbnQ6IEVsZW1lbnQpOiBJQW5jZXN0b3JzIHtcbiAgY29uc3QgYW5jZXN0b3JzOiBJQW5jZXN0b3JzID0gW107XG4gIHdoaWxlIChlbGVtZW50KSB7XG4gICAgY29uc3QgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgIGlmIChwYXJlbnQubG9jYWxOYW1lID09PSAnYm9keScpIGJyZWFrO1xuICAgIGNvbnN0IHNlbGVjdG9yT3B0aW9ucyA9IGV4dHJhY3RTZWxlY3Rvck9wdGlvbnMocGFyZW50KTtcbiAgICBhbmNlc3RvcnMudW5zaGlmdCh7IGVsZW1lbnQ6IHBhcmVudCwgc2VsZWN0b3JPcHRpb25zIH0pO1xuICAgIGVsZW1lbnQgPSBwYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIGFuY2VzdG9ycztcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFNlbGVjdG9yT3B0aW9ucyhlbGVtZW50OiBFbGVtZW50KTogSVNlbGVjdG9yT3B0aW9uW10ge1xuICBjb25zdCB0YWdOYW1lID0gZWxlbWVudC5sb2NhbE5hbWU7XG4gIGNvbnN0IGlkID0gZWxlbWVudC5pZCAmJiAhZWxlbWVudC5pZC5tYXRjaCgvXlswLTldLykgPyBgIyR7ZWxlbWVudC5pZH1gIDogbnVsbDtcbiAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmZyb20oZWxlbWVudC5jbGFzc0xpc3QpLm1hcCh4ID0+IGAuJHt4fWApO1xuICBjb25zdCBhdHRyTmFtZXMgPSBlbGVtZW50LmdldEF0dHJpYnV0ZU5hbWVzKCkuZmlsdGVyKGsgPT4gIVsnY2xhc3MnXS5pbmNsdWRlcyhrKSk7XG4gIGNvbnN0IGF0dHJzID0gYXR0ck5hbWVzLm1hcCh4ID0+IHtcbiAgICBjb25zdCB2ID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoeCk7XG4gICAgLy8gb25seSB0cmVhdCBJRCBhcyBhbiBhdHRyaWJ1dGUgaWYgaXQgc3RhcnRzIHdpdGggYSBudW1iZXJcbiAgICBpZiAoeCA9PT0gJ2lkJyAmJiB2ICYmICF2Lm1hdGNoKC9eWzAtOV0vKSkgcmV0dXJuO1xuICAgIHJldHVybiBgWyR7eH09XCIke3Z9XCJdYDtcbiAgfSk7XG4gIGNvbnN0IHBhcnRzID0gW1xuICAgIHsgdHlwZTogJ3RhZycsIHJhbms6IFJhbmtCeVR5cGUudGFnLCB2YWx1ZTogdGFnTmFtZSB9LFxuICAgIHsgdHlwZTogJ2lkJywgcmFuazogUmFua0J5VHlwZS5pZCwgdmFsdWU6IGlkIH0sXG4gICAgLi4uY2xhc3Nlcy5tYXAodmFsdWUgPT4gKHsgdHlwZTogJ2NsYXNzJywgcmFuazogUmFua0J5VHlwZS5jbGFzcywgdmFsdWUgfSkpLFxuICAgIC4uLmF0dHJzLm1hcCh2YWx1ZSA9PiAoeyB0eXBlOiAnYXR0cicsIHJhbms6IFJhbmtCeVR5cGUuYXR0ciwgdmFsdWUgfSkpLFxuICBdLmZpbHRlcih4ID0+IHgudmFsdWUpO1xuXG4gIGNvbnN0IHNlbGVjdG9yQ29tYmluYXRpb25zID0gZ2VuZXJhdGVBbGxDb21iaW5hdGlvbnMocGFydHMpLm1hcChjb21iaW5hdGlvbiA9PiB7XG4gICAgcmV0dXJuIGNvbWJpbmF0aW9uLnNvcnQoKGEsIGIpID0+IGEucmFuayAtIGIucmFuayk7XG4gIH0pO1xuXG4gIHNlbGVjdG9yQ29tYmluYXRpb25zLnNvcnQoKGEsIGIpID0+IHtcbiAgICBsZXQgYVNjb3JlID0gYS5sZW5ndGg7XG4gICAgaWYgKGEuc29tZSh4ID0+IHgudHlwZSA9PT0gJ2F0dHInKSkgYVNjb3JlICs9IDE7XG4gICAgaWYgKGFbMF0udHlwZSA9PT0gJ2F0dHInKSBhU2NvcmUgKz0gMTtcbiAgICBsZXQgYlNjb3JlID0gYi5sZW5ndGg7XG4gICAgaWYgKGIuc29tZSh4ID0+IHgudHlwZSA9PT0gJ2F0dHInKSkgYlNjb3JlICs9IDE7XG4gICAgaWYgKGJbMF0udHlwZSA9PT0gJ2F0dHInKSBiU2NvcmUgKz0gMTtcbiAgICByZXR1cm4gYVNjb3JlIC0gYlNjb3JlO1xuICB9KTtcblxuICByZXR1cm4gc2VsZWN0b3JDb21iaW5hdGlvbnMubWFwKHggPT4geC5tYXAoeSA9PiB5LnZhbHVlKSk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQWxsQ29tYmluYXRpb25zKG9wdGlvbnMpIHtcbiAgZnVuY3Rpb24gY29tYmluYXRpb25GbihhY3RpdmVTZXQsIHJlc3RPZkFycmF5LCBhbGwpIHtcbiAgICBpZiAoIWFjdGl2ZVNldC5sZW5ndGggJiYgIXJlc3RPZkFycmF5Lmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmICghcmVzdE9mQXJyYXkubGVuZ3RoKSB7XG4gICAgICBhbGwucHVzaChhY3RpdmVTZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21iaW5hdGlvbkZuKFsuLi5hY3RpdmVTZXQsIHJlc3RPZkFycmF5WzBdXSwgcmVzdE9mQXJyYXkuc2xpY2UoMSksIGFsbCk7XG4gICAgICBjb21iaW5hdGlvbkZuKFsuLi5hY3RpdmVTZXRdLCByZXN0T2ZBcnJheS5zbGljZSgxKSwgYWxsKTtcbiAgICB9XG4gICAgcmV0dXJuIGFsbDtcbiAgfTtcbiAgcmV0dXJuIGNvbWJpbmF0aW9uRm4oW10sIFsuLi5vcHRpb25zXSwgW10pO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVQb3NzaWJsZVNlbGVjdG9yQ291bnQobGF5ZXJzOiBJTGF5ZXJzLCBhbmNlc3RvcktleVBhaXJzOiBzdHJpbmdbXVtdKSB7XG4gIGxldCBjb3VudCA9IDA7XG4gIGZvciAoY29uc3QgYW5jZXN0b3JLZXlzIG9mIGFuY2VzdG9yS2V5UGFpcnMpIHtcbiAgICBsZXQgbG9jYWxDb3VudCA9IDE7XG4gICAgZm9yIChjb25zdCBhbmNlc3RvcktleSBvZiBhbmNlc3RvcktleXMpIHtcbiAgICAgIGxvY2FsQ291bnQgKj0gbGF5ZXJzW2FuY2VzdG9yS2V5XS5zZWxlY3Rvck9wdGlvbnMubGVuZ3RoO1xuICAgIH1cbiAgICBjb3VudCArPSBsb2NhbENvdW50O1xuICB9XG4gIHJldHVybiBjb3VudDtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwiY2hyb21lXCIvPlxuaW1wb3J0ICdAd2ViY29tcG9uZW50cy9jdXN0b20tZWxlbWVudHMnO1xuaW1wb3J0IHsgTWVzc2FnZUV2ZW50VHlwZSB9IGZyb20gJ0B1bGl4ZWUvZGVza3RvcC1jb3JlL2xpYi9CcmlkZ2VIZWxwZXJzJztcbmltcG9ydCBFbGVtZW50T3B0aW9uc092ZXJsYXkgZnJvbSAnLi9saWIvRWxlbWVudE9wdGlvbnNPdmVybGF5JztcbmltcG9ydCB7IG9uTWVzc2FnZVBheWxvYWQsIHNlbmRUb0RldnRvb2xzU2NyaXB0IH0gZnJvbSAnLi9saWIvY29udGVudC9Db250ZW50TWVzc2VuZ2VyJztcbmltcG9ydCBFbGVtZW50c0J1Y2tldCBmcm9tICcuL2xpYi9FbGVtZW50c0J1Y2tldCc7XG5pbXBvcnQgZmluZFNlbGVjdG9ycyBmcm9tICcuL2xpYi9jb250ZW50L2ZpbmRTZWxlY3RvcnMnO1xuXG5cbi8vIERlZmluZSB0aGUgbmV3IGVsZW1lbnRcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnY2hyb21lYWxpdmUtZWxlbWVudC1vcHRpb25zLW92ZXJsYXknLCBFbGVtZW50T3B0aW9uc092ZXJsYXkpO1xuXG5sZXQgZWxlbWVudE9wdGlvbnNPdmVybGF5OiBFbGVtZW50T3B0aW9uc092ZXJsYXk7XG5jb25zdCBlbGVtZW50c0J1Y2tldCA9IG5ldyBFbGVtZW50c0J1Y2tldCgpO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG5mdW5jdGlvbiBvcGVuU2VsZWN0b3JNZW51KF9vcHRpb25zOiB7IGJhY2tlbmROb2RlSWQ/OiBudW1iZXIsIGVsZW1lbnQ/OiBIVE1MRWxlbWVudCB9KSB7XG4gIC8vIGNvbnN0IHsgYmFja2VuZE5vZGVJZCwgZWxlbWVudCB9ID0gb3B0aW9ucztcbiAgLy8gaWYgKCFlbGVtZW50T3B0aW9uc092ZXJsYXkpIHtcbiAgLy8gICBlbGVtZW50T3B0aW9uc092ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjaHJvbWVhbGl2ZS1lbGVtZW50LW9wdGlvbnMtb3ZlcmxheScpIGFzIEVsZW1lbnRPcHRpb25zT3ZlcmxheTtcbiAgLy8gICBlbGVtZW50T3B0aW9uc092ZXJsYXkuYXR0YWNoRWxlbWVudHNCdWNrZXQoZWxlbWVudHNCdWNrZXQpO1xuICAvLyAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWxlbWVudE9wdGlvbnNPdmVybGF5KTtcbiAgLy8gICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xvc2VTZWxlY3Rvck1lbnUpO1xuICAvLyB9XG4gIC8vIGVsZW1lbnQgPz89IGVsZW1lbnRzQnVja2V0LmdldEJ5S2V5KGJhY2tlbmROb2RlSWQpO1xuICAvLyBpZiAoZWxlbWVudCAmJiBiYWNrZW5kTm9kZUlkKSB7XG4gIC8vICAgZWxlbWVudE9wdGlvbnNPdmVybGF5Lm9wZW4oYmFja2VuZE5vZGVJZCwgZWxlbWVudClcbiAgLy8gfSBlbHNlIGlmIChiYWNrZW5kTm9kZUlkKSB7XG4gIC8vICAgZWxlbWVudE9wdGlvbnNPdmVybGF5Lm9wZW5CeUJhY2tlbmROb2RlSWQoYmFja2VuZE5vZGVJZCk7XG4gIC8vIH1cbn1cblxuZnVuY3Rpb24gY2xvc2VTZWxlY3Rvck1lbnUoKSB7XG4gIGlmICghZWxlbWVudE9wdGlvbnNPdmVybGF5KSByZXR1cm47XG4gIGVsZW1lbnRPcHRpb25zT3ZlcmxheS5jbG9zZSgpO1xufVxuXG5mdW5jdGlvbiB0bXBIaWRlU2VsZWN0b3JNZW51KHZhbHVlOiBib29sZWFuKSB7XG4gIGlmICghZWxlbWVudE9wdGlvbnNPdmVybGF5KSByZXR1cm47XG4gIGVsZW1lbnRPcHRpb25zT3ZlcmxheS50bXBIaWRlKHZhbHVlKTtcbn1cblxub25NZXNzYWdlUGF5bG9hZChhc3luYyBwYXlsb2FkID0+IHtcbiAgY29uc3QgeyBldmVudCwgYmFja2VuZE5vZGVJZCB9ID0gcGF5bG9hZDtcbiAgaWYgKGV2ZW50ID09PSBNZXNzYWdlRXZlbnRUeXBlLkluc3BlY3RFbGVtZW50TW9kZUNoYW5nZWQpIHtcbiAgICBpZiAocGF5bG9hZC5pc0FjdGl2ZSkge1xuICAgICAgY2xvc2VTZWxlY3Rvck1lbnUoKTtcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChldmVudCA9PT0gTWVzc2FnZUV2ZW50VHlwZS5PcGVuRWxlbWVudE9wdGlvbnNPdmVybGF5KSB7XG4gICAgb3BlblNlbGVjdG9yTWVudSh7IGJhY2tlbmROb2RlSWQgfSk7XG5cbiAgfSBlbHNlIGlmIChldmVudCA9PT0gTWVzc2FnZUV2ZW50VHlwZS5IaWRlRWxlbWVudE9wdGlvbnNPdmVybGF5KSB7XG4gICAgdG1wSGlkZVNlbGVjdG9yTWVudSh0cnVlKTtcblxuICB9IGVsc2UgaWYgKGV2ZW50ID09PSBNZXNzYWdlRXZlbnRUeXBlLlJlbW92ZUhpZGVGcm9tRWxlbWVudE9wdGlvbnNPdmVybGF5KSB7XG4gICAgdG1wSGlkZVNlbGVjdG9yTWVudShmYWxzZSk7XG5cbiAgfSBlbHNlIGlmIChldmVudCA9PT0gTWVzc2FnZUV2ZW50VHlwZS5DbG9zZUVsZW1lbnRPcHRpb25zT3ZlcmxheSkge1xuICAgIGNsb3NlU2VsZWN0b3JNZW51KCk7XG5cbiAgfSBlbHNlIGlmIChldmVudCA9PT0gTWVzc2FnZUV2ZW50VHlwZS5VcGRhdGVFbGVtZW50T3B0aW9ucykge1xuICAgIGlmICgnaXNJbmNsdWRlZCcgaW4gcGF5bG9hZCkge1xuICAgICAgaWYgKHBheWxvYWQuaXNJbmNsdWRlZCkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gYXdhaXQgZWxlbWVudHNCdWNrZXQuZ2V0QnlCYWNrZW5kTm9kZUlkKGJhY2tlbmROb2RlSWQpO1xuICAgICAgICBlbGVtZW50c0J1Y2tldC5hZGRJbmNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZCwgZWxlbWVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50c0J1Y2tldC5yZW1vdmVJbmNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgnaXNFeGNsdWRlZCcgaW4gcGF5bG9hZCkge1xuICAgICAgaWYgKHBheWxvYWQuaXNFeGNsdWRlZCkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gYXdhaXQgZWxlbWVudHNCdWNrZXQuZ2V0QnlCYWNrZW5kTm9kZUlkKGJhY2tlbmROb2RlSWQpO1xuICAgICAgICBlbGVtZW50c0J1Y2tldC5hZGRFeGNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZCwgZWxlbWVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50c0J1Y2tldC5yZW1vdmVFeGNsdWRlZEVsZW1lbnQoYmFja2VuZE5vZGVJZCk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKGV2ZW50ID09PSBNZXNzYWdlRXZlbnRUeXBlLlJ1blNlbGVjdG9yR2VuZXJhdG9yKSB7XG4gICAgLy8gY29uc3Qgc2VsZWN0b3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBlbGVtZW50c0J1Y2tldC5pbmNsdWRlZEVsZW1lbnRzWzBdO1xuICAgIGNvbnN0IHNlbGVjdG9yczogc3RyaW5nW11bXSA9IGZpbmRTZWxlY3RvcnMoZWxlbWVudCkubWFwKHggPT4geC5zcGxpdCgnICcpKTtcbiAgICBzZW5kVG9EZXZ0b29sc1NjcmlwdCh7IGV2ZW50OiBNZXNzYWdlRXZlbnRUeXBlLkZpbmlzaGVkU2VsZWN0b3JHZW5lcmF0aW9uLCBzZWxlY3RvcnMgfSk7XG5cbiAgfSBlbHNlIGlmIChldmVudCA9PT0gTWVzc2FnZUV2ZW50VHlwZS5SZXNldFNlbGVjdG9yR2VuZXJhdG9yKSB7XG4gICAgZWxlbWVudHNCdWNrZXQucmVzZXQoKTtcblxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdVTkhBTkRMRUQgTUVTU0FHRTogJywgcGF5bG9hZCk7XG4gIH1cbn0pO1xuIl0sIm5hbWVzIjpbIm4iLCJwIiwiYWEiLCJiYSIsImNhIiwiZGEiLCJlYSIsInEiLCJyIiwidCIsInUiLCJ2IiwidyIsInkiLCJ6IiwiQSIsIkIiLCJDIiwiRCIsIkUiLCJGIiwiRyIsIkgiLCJmYSIsImhhIiwiaWEiLCJqYSIsImthIiwibGEiLCJtYSIsIm5hIiwiSSIsIm9hIiwicGEiLCJxYSIsImEiLCJyYSIsImIiLCJzYSIsIkoiLCJLIiwiTCIsIk0iLCJkIiwiZiIsImMiLCJlIiwiTiIsIk8iLCJQIiwidGEiLCJ1YSIsIlEiLCJSIiwiUyIsIlQiLCJVIiwiViIsImciLCJoIiwiayIsImwiLCJtIiwiWCIsInZhIiwid2EiLCJ4YSIsInlhIiwiWSIsInphIiwiQWEiLCJCYSIsIngiLCJaIiwiQ2EiLCJEYSIsIkVhIiwiRmEiLCJHYSIsIkhhIiwiSWEiLCJuYW5vaWQiLCJzaXplIiwiaWQiLCJieXRlIiwiZmllbGREaXZpZGVyIiwibGVuZ3RoT2ZEZXN0TG9jYXRpb25GaWVsZCIsImxlbmd0aE9mRmllbGREaXZpZGVyIiwibGVuZ3RoT2ZSZXNwb25zZUNvZGVGaWVsZCIsInN0YXJ0T2ZEZXN0TG9jYXRpb25GaWVsZCIsInN0YXJ0T2ZSZXNwb25zZUNvZGVGaWVsZCIsIk1lc3NhZ2VFdmVudFR5cGUiLCJNZXNzYWdlTG9jYXRpb24iLCJfX19zZW5kVG9Db3JlIiwiX19fcmVjZWl2ZUZyb21Db3JlIiwiUmVzcG9uc2VDb2RlIiwiY3JlYXRlUmVzcG9uc2VJZCIsInBhY2tNZXNzYWdlIiwibWVzc2FnZSIsImlzUGFja2VkTWVzc2FnZSIsImRlc3RMb2NhdGlvbiIsInJlc3BvbnNlQ29kZSIsIm1lc3NhZ2VUb1N0cmluZ2lmeSIsInN0cmluZ2lmaWVkTWVzc2FnZSIsIm1lc3NhZ2VFeHBlY3RzUmVzcG9uc2UiLCJpc1Jlc3BvbnNlTWVzc2FnZSIsIkVsZW1lbnRPcHRpb25zT3ZlcmxheSIsImVsZW1lbnRzQnVja2V0IiwiYmFja2VuZE5vZGVJZCIsImVsZW1lbnQiLCJlcnJvciIsInRhZ05hbWUiLCJjbGFzc2VzIiwidGl0bGVUZXh0Iiwid2lkdGgiLCJoZWlnaHQiLCJ0b3AiLCJsZWZ0IiwiYWJzTGVmdCIsImFic1RvcCIsInBvc2l0aW9uVGV4dCIsIm92ZXJsYXlIZWlnaHQiLCJ2YWx1ZSIsIm9wZW5TZWxlY3RvckdlbmVyYXRvclBhbmVsIiwiZXZlbnQiLCJvdmVybGF5RWxlbSIsImNzcyIsInN0eWxlIiwicGFja2VkTWVzc2FnZSIsImN1cnJlbnRNZXNzZW5nZXJMb2NhdGlvbiIsInNlbmRUb0RldnRvb2xzU2NyaXB0IiwicGF5bG9hZCIsInJlc3BvbnNlQ2FsbGJhY2tGbiIsImNvbnZlcnRSZXNwb25zZUZuVG9Db2RlQW5kSWQiLCJyb3V0ZUludGVybmFsbHkiLCJzZW5kVG9EZXZ0b29sc1ByaXZhdGUiLCJzZW5kVG9Db3JlIiwib25NZXNzYWdlUGF5bG9hZEZuIiwib25NZXNzYWdlUGF5bG9hZCIsImZuIiwicmVzdE9mTWVzc2FnZSIsImhhbmRsZUluY29taW5nTG9jYWxSZXNwb25zZSIsImhhbmRsZUluY29taW5nTG9jYWxNZXNzYWdlIiwicGVuZGluZ0J5UmVzcG9uc2VJZCIsInJlc3BvbnNlRm4iLCJyZXNwb25zZSIsInNlbmRSZXNwb25zZUJhY2siLCJwZW5kaW5nIiwicmVzcG9uc2VQYXlsb2FkIiwicmVzcG9uc2VJZCIsImVsZW1lbnRQcm9taXNlc0J5SWQiLCJFbGVtZW50c0J1Y2tldCIsImNhbGxiYWNrRm5OYW1lIiwicmVzb2x2ZSIsInJlamVjdCIsInRhZ1RleHQiLCJleHRyYWN0VGFnVGV4dCIsIm91dGVySHRtbCIsImxlbiIsIm9wZW5UYWdMZW5ndGgiLCJSYW5rQnlUeXBlIiwic29ydEJ5TGVuZ3RoIiwiZmluZFNlbGVjdG9ycyIsInRhcmdldCIsImdlbmVyYXRlVGFyZ2V0IiwiYW5jZXN0b3JzIiwiZ2VuZXJhdGVBbmNlc3RvcnMiLCJsYXllcktleVBhaXJzIiwiZ2VuZXJhdGVMYXllcktleVBhaXJzIiwibGF5ZXJzIiwicG9zc2libGVTZWxlY3RvckNvdW50IiwiY2FsY3VsYXRlUG9zc2libGVTZWxlY3RvckNvdW50Iiwic2VsZWN0b3JzIiwiZ2VuZXJhdGVTaG9ydFNlbGVjdG9ycyIsImFuY2VzdG9yS2V5UGFpcnMiLCJzZWxlY3RvckRlcHRoIiwibWF4U2VsZWN0b3JDb3VudFJlbWFpbmluZyIsInBvc3NpYmxlU2VsZWN0b3JzIiwiZmV0Y2hTZWxlY3RvcnNUb0NoZWNrIiwicG9zc2libGVTZWxlY3RvciIsImRlcHRoIiwibWF4U2VsZWN0b3JDb3VudCIsImFuY2VzdG9yS2V5cyIsImJhc2VTZWxlY3RvcnMiLCJrZXkiLCJpc0RpcmVjdFNpYmxpbmciLCJzZWxlY3Rvck9wdGlvbnMiLCJhcHBlbmRUb1NlbGVjdG9ycyIsIm5ld1NlbGVjdG9ycyIsInJlbGF0aW9uIiwic2VsZWN0b3JPcHRpb24iLCJuZXdQYXJ0IiwiYmFzZVNlbGVjdG9yIiwiYW5jZXN0b3JDb21iaW5hdGlvbnMiLCJnZW5lcmF0ZUFsbENvbWJpbmF0aW9ucyIsImFsbENvbWJpbmF0aW9ucyIsImFuY2VzdG9yQ29tYmluYXRpb24iLCJleHRyYWN0U2VsZWN0b3JPcHRpb25zIiwicGFyZW50RWxlbWVudCIsInVuaXF1ZVRvUGFyZW50IiwicGFyZW50IiwiYXR0cnMiLCJwYXJ0cyIsInNlbGVjdG9yQ29tYmluYXRpb25zIiwiY29tYmluYXRpb24iLCJhU2NvcmUiLCJiU2NvcmUiLCJvcHRpb25zIiwiY29tYmluYXRpb25GbiIsImFjdGl2ZVNldCIsInJlc3RPZkFycmF5IiwiYWxsIiwiY291bnQiLCJsb2NhbENvdW50IiwiYW5jZXN0b3JLZXkiXSwibWFwcGluZ3MiOiJDQUFDLFdBQVU7QUFXRSxNQUFJQSxJQUFFLE9BQU8sU0FBUyxVQUFVLGVBQWNDLElBQUUsT0FBTyxTQUFTLFVBQVUsaUJBQWdCQyxJQUFHLE9BQU8sU0FBUyxVQUFVLFlBQVdDLElBQUcsT0FBTyxTQUFTLFVBQVUsU0FBUUMsSUFBRyxPQUFPLFNBQVMsVUFBVSxRQUFPQyxJQUFHLE9BQU8saUJBQWlCLFVBQVUsU0FBUUMsSUFBRyxPQUFPLGlCQUFpQixVQUFVLFFBQU9DLElBQUUsT0FBTyxLQUFLLFVBQVUsV0FBVUMsSUFBRSxPQUFPLEtBQUssVUFBVSxhQUFZQyxJQUFFLE9BQU8sS0FBSyxVQUFVLGNBQWFDLElBQUUsT0FBTyxLQUFLLFVBQVUsYUFBWUMsSUFBRSxPQUFPLEtBQUssVUFBVSxjQUFhQyxJQUFFLE9BQU87QUFBQSxJQUF5QixPQUFPLEtBQUs7QUFBQSxJQUNuaEI7QUFBQSxFQUFhLEdBQUVDLElBQUUsT0FBTyxRQUFRLFVBQVUsY0FBYUMsSUFBRSxPQUFPLHlCQUF5QixPQUFPLFFBQVEsV0FBVSxXQUFXLEdBQUVDLElBQUUsT0FBTyxRQUFRLFVBQVUsY0FBYUMsS0FBRSxPQUFPLFFBQVEsVUFBVSxjQUFhQyxLQUFFLE9BQU8sUUFBUSxVQUFVLGlCQUFnQkMsSUFBRSxPQUFPLFFBQVEsVUFBVSxpQkFBZ0JDLElBQUUsT0FBTyxRQUFRLFVBQVUsZ0JBQWVDLEtBQUUsT0FBTyxRQUFRLFVBQVUsZ0JB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QUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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
