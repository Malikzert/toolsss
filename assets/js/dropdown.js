/* ══════════════════════════════════════════════════════════
   COFDE Dropdown — valo-styled select replacement
   Native <select> popup digambar oleh OS sehingga tidak bisa diberi
   gaya valo. Komponen ini menyembunyikan select aslinya (tetap jadi
   sumber nilai untuk logika halaman) lalu menggambar trigger + daftar
   berstyle valo yang mengikuti tema aktif.

   Kontrak:
   - Nilai tetap dibaca/tulis lewat select asli (id, .value, .options)
   - Memilih item memicu event 'change' pada select asli
   - Opsi yang ditambah/diubah logika halaman dipantau otomatis
   - Keyboard: Up/Down/Home/End/Enter/Space/Esc/Tab/ketik cepat
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var OPEN = null;
  var FLIP_PAD = 8;
  var SWEEP_MS = 700;
  var MAX_H = 280;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function optLabel(o) {
    return (o.label || o.textContent || o.value || '').trim();
  }

  function caretSvg() {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 12 8');
    s.setAttribute('class', 'cx-drop-caret');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M1 1.5 6 6.5 11 1.5');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.6');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p);
    return s;
  }

  /* ── Bangun instance dropdown untuk satu select ── */
  function create(select) {
    var inst = {
      select: select,
      items: [],
      activeNode: null,
      active: -1,
      lastValue: null,
      typeahead: '',
      typeaheadAt: 0
    };

    var wrap = el('div', 'cx-drop');
    var btn = el('div', 'cx-drop-btn');
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    var list = el('div', 'cx-drop-list');
    list.setAttribute('role', 'listbox');
    list.id = 'cx-drop-list-' + (create.n = (create.n || 0) + 1);
    list.hidden = true;
    btn.setAttribute('aria-controls', list.id);

    inst.wrap = wrap;
    inst.btn = btn;
    inst.list = list;
    inst.label = el('span', 'cx-drop-value');
    btn.appendChild(inst.label);
    btn.appendChild(caretSvg());

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('cx-drop-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');
    wrap.appendChild(btn);
    wrap.appendChild(list);

    /* ── Opsi ── */
    function pushItem(opt) {
      var node = el('div', 'cx-drop-opt', optLabel(opt));
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
      node.id = list.id + '-o' + inst.items.length;
      if (opt.disabled) {
        node.setAttribute('aria-disabled', 'true');
        node.classList.add('is-disabled');
      }
      node.addEventListener('click', function () {
        if (opt.disabled) return;
        pick(opt.value);
      });
      node.addEventListener('mousemove', function () { setActive(node); });
      list.appendChild(node);
      inst.items.push({ node: node, opt: opt, value: opt.value });
    }

    function build() {
      inst.items = [];
      list.textContent = '';
      for (var i = 0; i < select.children.length; i++) {
        var node = select.children[i];
        if (node.tagName === 'OPTGROUP') {
          var g = el('div', 'cx-drop-group', node.label || '');
          g.setAttribute('role', 'presentation');
          list.appendChild(g);
          for (var j = 0; j < node.children.length; j++) pushItem(node.children[j]);
        } else if (node.tagName === 'OPTION') {
          pushItem(node);
        }
      }
      if (!inst.items.length) {
        var empty = el('div', 'cx-drop-empty', 'Tidak ada pilihan');
        empty.setAttribute('role', 'presentation');
        list.appendChild(empty);
      }
    }

    /* ── Label & status ── */
    function sync() {
      var opt = select.options[select.selectedIndex];
      inst.lastValue = select.value;
      inst.label.textContent = opt
        ? optLabel(opt)
        : (select.getAttribute('data-placeholder') || 'Pilih...');
      btn.setAttribute('aria-label', inst.label.textContent);
      btn.classList.toggle('is-disabled', !!select.disabled);
      if (select.disabled) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
      for (var i = 0; i < inst.items.length; i++) {
        var it = inst.items[i];
        var on = it.opt.selected;
        it.node.setAttribute('aria-selected', on ? 'true' : 'false');
        it.node.classList.toggle('is-active', on);
      }
    }

    function setActive(node) {
      if (!node || node === inst.activeNode) return;
      if (node.getAttribute('aria-disabled') === 'true') return;
      if (inst.activeNode) inst.activeNode.classList.remove('is-cursor');
      inst.activeNode = node;
      node.classList.add('is-cursor');
      btn.setAttribute('aria-activedescendant', node.id);
      for (var i = 0; i < inst.items.length; i++) {
        if (inst.items[i].node === node) { inst.active = i; break; }
      }
      if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }

    function move(dir) {
      var n = inst.items.length;
      if (!n) return;
      var i = inst.active;
      for (var step = 0; step < n; step++) {
        i = (i + dir + n) % n;
        if (!inst.items[i].opt.disabled) break;
      }
      setActive(inst.items[i].node);
    }

    function fire(type, bubbles) {
      var ev;
      try {
        ev = new Event(type, { bubbles: bubbles !== false });
      } catch (e) {
        ev = document.createEvent('HTMLEvents');
        ev.initEvent(type, bubbles !== false, false);
      }
      select.dispatchEvent(ev);
    }

    function pick(value) {
      if (select.value !== value) {
        select.value = value;
        fire('input');
        fire('change');
        fire('click', false);
      }
      sync();
      close();
      btn.focus();
    }

    /* ── Posisi daftar mengambang ── */
    function place() {
      var r = btn.getBoundingClientRect();
      list.style.minWidth = Math.round(r.width) + 'px';
      list.style.left = '0px';
      list.hidden = false;

      var below = window.innerHeight - r.bottom - FLIP_PAD;
      var above = r.top - FLIP_PAD;
      list.style.maxHeight = Math.round(Math.min(MAX_H, Math.max(96, (below > above ? below : above) - 16))) + 'px';

      var up = below < 140 && above > below;
      list.classList.toggle('is-up', up);

      var h = list.offsetHeight;
      var top = up ? r.top - FLIP_PAD - h : r.bottom + FLIP_PAD;
      if (top < FLIP_PAD) top = FLIP_PAD;
      if (top + h > window.innerHeight - FLIP_PAD) {
        top = Math.max(FLIP_PAD, window.innerHeight - FLIP_PAD - h);
      }
      list.style.top = Math.round(top) + 'px';

      var w = list.offsetWidth;
      var left = r.left;
      if (left + w > window.innerWidth - FLIP_PAD) left = window.innerWidth - FLIP_PAD - w;
      if (left < FLIP_PAD) left = FLIP_PAD;
      list.style.left = Math.round(left) + 'px';
    }

    function open() {
      if (select.disabled || btn.classList.contains('is-disabled') || !inst.items.length) return;
      if (OPEN && OPEN !== inst) closeOther(OPEN);
      sync();
      document.body.appendChild(list);
      list.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      place();
      var sel = -1;
      for (var i = 0; i < inst.items.length; i++) {
        if (inst.items[i].opt.selected) { sel = i; break; }
      }
      setActive(sel >= 0 ? inst.items[sel].node : null);
      OPEN = inst;
    }

    function close() {
      if (list.parentNode !== wrap) wrap.appendChild(list);
      list.hidden = true;
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (inst.activeNode) inst.activeNode.classList.remove('is-cursor');
      inst.activeNode = null;
      inst.active = -1;
      btn.removeAttribute('aria-activedescendant');
      if (OPEN === inst) OPEN = null;
    }

    function toggle() {
      if (OPEN === inst) close();
      else open();
    }

    /* ── Event ── */
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggle();
    });

    select.addEventListener('change', sync);

    var field = select.closest ? select.closest('label') : null;
    if (field && !field.hasAttribute('data-drop-label')) {
      field.setAttribute('data-drop-label', '1');
      field.addEventListener('click', function (e) {
        if (btn.contains(e.target)) return;
        e.preventDefault();
        toggle();
      });
    }

    if (window.MutationObserver) {
      inst.obs = new MutationObserver(function () {
        build();
        sync();
      });
      inst.obs.observe(select, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'selected', 'value']
      });
    }

    build();
    sync();

    inst.sync = sync;
    inst.pick = pick;
    inst.place = place;
    inst.open = open;
    inst.close = close;
    inst.toggle = toggle;
    inst.move = move;
    inst.setActive = setActive;
    return inst;
  }

  function closeOther(inst) { inst.close(); }

  /* ── Keyboard untuk dropdown yang sedang terbuka ── */
  document.addEventListener('keydown', function (e) {
    var inst = OPEN;
    var k = e.key;

    if (!inst) {
      if (k !== 'Enter' && k !== ' ' && k !== 'Spacebar' && k !== 'ArrowDown' && k !== 'ArrowUp') return;
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('cx-drop-btn')) return;
      e.preventDefault();
      t.__cxDropOpen && t.__cxDropOpen();
      return;
    }

    if (k === 'Escape' || k === 'Esc') {
      e.preventDefault();
      inst.close();
      inst.btn.focus();
      return;
    }
    if (k === 'Tab') { inst.close(); return; }
    if (k === 'ArrowDown') { e.preventDefault(); inst.move(1); return; }
    if (k === 'ArrowUp') { e.preventDefault(); inst.move(-1); return; }
    if (k === 'Home') { e.preventDefault(); if (inst.items.length) inst.setActive(inst.items[0].node); return; }
    if (k === 'End') { e.preventDefault(); if (inst.items.length) inst.setActive(inst.items[inst.items.length - 1].node); return; }
    if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (inst.activeNode) {
        var it = inst.items[inst.active];
        if (it && !it.opt.disabled) inst.pick(it.value);
      } else {
        inst.move(1);
      }
      return;
    }
    if (k && k.length === 1) {
      var now = Date.now();
      inst.typeahead = now - inst.typeaheadAt > 900 ? k.toLowerCase() : inst.typeahead + k.toLowerCase();
      inst.typeaheadAt = now;
      for (var i = 0; i < inst.items.length; i++) {
        var o = inst.items[i];
        if (o.opt.disabled) continue;
        if (optLabel(o.opt).toLowerCase().indexOf(inst.typeahead) === 0) { inst.setActive(o.node); break; }
      }
    }
  }, true);

  /* ── Tutup saat klik di luar ── */
  document.addEventListener('pointerdown', function (e) {
    if (!OPEN) return;
    if (OPEN.list.contains(e.target) || OPEN.btn.contains(e.target)) return;
    OPEN.close();
  }, true);

  window.addEventListener('resize', function () { if (OPEN) OPEN.place(); });
  window.addEventListener('scroll', function () { if (OPEN) OPEN.place(); }, true);

  /* ── Init ── */
  function enhance(select) {
    if (select.dataset.cxDropped === '1') return null;
    if (select.multiple || (select.size && select.size > 1)) return null;
    select.dataset.cxDropped = '1';
    var inst = create(select);
    select.__cxDrop = inst;
    inst.btn.__cxDropOpen = inst.toggle;
    return inst;
  }

  function start() {
    var list = document.querySelectorAll('select.cx-select');
    for (var i = 0; i < list.length; i++) enhance(list[i]);
    /* Jaga label tetap sinkron bila halaman menulis .value tanpa event. */
    setInterval(function () {
      var all = document.querySelectorAll('select.cx-select');
      for (var i = 0; i < all.length; i++) {
        var inst = all[i].__cxDrop;
        if (inst && inst.lastValue !== all[i].value) inst.sync();
      }
    }, SWEEP_MS);
  }

  window.COFDE = window.COFDE || {};
  window.COFDE.dropdown = {
    init: function (root) {
      var list = (root || document).querySelectorAll('select.cx-select');
      for (var i = 0; i < list.length; i++) enhance(list[i]);
    },
    sync: function (target) {
      var select = typeof target === 'string' ? document.getElementById(target) : target;
      if (select && select.__cxDrop) select.__cxDrop.sync();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
