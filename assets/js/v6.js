
/* ============================================================
   v6：图集（扇形舞台 + 整类弹层）· 视频浮层 · 结尾翻页
   ============================================================ */
(function () {
  'use strict';
  var d = document;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  /* ---------------- 图集 ---------------- */
  var DATA = window.WORKS || [];
  var mount = d.getElementById('catlist');
  var overlay = null, ovCur = null, ovIdx = 0, ovCells = [];

  function buildCat(cat, ci) {
    var sec = d.createElement('section');
    sec.className = 'wg__sec';
    sec.setAttribute('data-key', cat.key);
    var head = d.createElement('div');
    head.className = 'wg__head';
    head.innerHTML =
      '<span class="wg__no">' + cat.no + '</span>' +
      '<div><h3 class="wg__name">' + cat.name + '</h3><i class="wg__en">' + cat.en + '</i>' +
      '<p class="wg__desc">' + cat.desc + '</p></div>' +
      '<button class="wg__count" type="button">' + cat.items.length + ' 张 · 查看全部 →</button>';
    var stage = d.createElement('div');
    stage.className = 'wg__stage';
    sec.appendChild(head);
    sec.appendChild(stage);

    var items = cat.items.map(function (it, i) {
      var b = d.createElement('button');
      b.className = 'wg__item';
      b.type = 'button';
      b.style.aspectRatio = String((it.w / it.h).toFixed(4));
      b.setAttribute('aria-label', cat.name + ' 第 ' + (i + 1) + ' 张');
      var im = d.createElement('img');
      im.src = it.s;
      im.alt = (it.t || cat.name);
      im.loading = i < 6 ? 'eager' : 'lazy';
      im.decoding = 'async';
      b.appendChild(im);
      b.addEventListener('click', function () { openCat(ci, i); });
      stage.appendChild(b);
      return b;
    });

    var active = Math.floor(items.length / 2);
    function layout() {
      var w = stage.clientWidth || 900;
      var step = Math.max(110, Math.min(w * 0.30, 290));
      items.forEach(function (el, i) {
        var dd = i - active, ad = Math.abs(dd);
        el.style.setProperty('--x', (dd * step).toFixed(1) + 'px');
        el.style.setProperty('--s', dd === 0 ? 1 : (ad === 1 ? 0.66 : 0.52));
        el.style.setProperty('--o', ad > 3 ? 0 : (dd === 0 ? 1 : Math.max(0.25, 0.9 - ad * 0.22)));
        el.style.zIndex = String(20 - Math.min(ad, 8));
        el.style.pointerEvents = ad > 3 ? 'none' : 'auto';
        if (dd === 0) el.setAttribute('data-active', '1');
        else el.removeAttribute('data-active');
      });
    }
    layout();
    window.addEventListener('resize', layout);
    layout._set = function (i) { active = ((i % items.length) + items.length) % items.length; layout(); };
    layout._next = function () { layout._set(active + 1); };

    head.querySelector('.wg__count').addEventListener('click', function () { openCat(ci, active); });

    /* 横向拖拽 + 自动轮播（只在可视时） */
    var dragging = false, startX = 0, moved = 0, startIdx = 0;
    stage.addEventListener('pointerdown', function (e) {
      dragging = true; startX = e.clientX; moved = 0; startIdx = active;
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved = e.clientX - startX;
      if (Math.abs(moved) > 6) {
        var step = Math.max(110, Math.min((stage.clientWidth || 900) * 0.30, 290));
        layout._set(startIdx - Math.round(moved / step));
      }
    });
    stage.addEventListener('pointerup', function () { dragging = false; });
    stage.addEventListener('pointercancel', function () { dragging = false; });

    var timer = null, visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (rows) {
        visible = rows[0].isIntersecting;
        if (visible && !timer) timer = setInterval(function () { if (!dragging) layout._next(); }, 4600);
        if (!visible && timer) { clearInterval(timer); timer = null; }
      }, { threshold: 0.15 }).observe(sec);
    }
    stage.addEventListener('pointerenter', function () { if (timer) { clearInterval(timer); timer = null; } });
    stage.addEventListener('pointerleave', function () {
      if (visible && !timer) timer = setInterval(function () { if (!dragging) layout._next(); }, 4600);
    });

    return sec;
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = d.createElement('div');
    overlay.className = 'wgo';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="wgo__bar"><div class="wgo__id"><span class="wgo__no">01</span>' +
      '<b class="wgo__name">—</b><i class="wgo__en">—</i></div>' +
      '<div class="wgo__right"><span class="wgo__count">0 张</span>' +
      '<button class="wgo__x" type="button">关闭 ✕</button></div></div>' +
      '<div class="wgo__scroll" data-lenis-prevent><div class="wgo__grid"></div></div>' +
      '<div class="wgo__big"><img class="wgo__bigimg" alt="">' +
      '<button class="wgo__nav wgo__nav--prev" type="button" aria-label="上一张">‹</button>' +
      '<button class="wgo__nav wgo__nav--next" type="button" aria-label="下一张">›</button>' +
      '<span class="wgo__bigcount"></span>' +
      '<button class="wgo__bigx" type="button" aria-label="关闭大图">✕</button></div>';
    d.body.appendChild(overlay);

    var big = overlay.querySelector('.wgo__big');
    var bimg = overlay.querySelector('.wgo__bigimg');
    var bcount = overlay.querySelector('.wgo__bigcount');

    function openBig(i) {
      if (!ovCur) return;
      ovIdx = (i + ovCur.items.length) % ovCur.items.length;
      bimg.src = ovCur.items[ovIdx].s;
      bcount.textContent = (ovIdx + 1) + ' / ' + ovCur.items.length;
      big.classList.add('on');
    }
    function closeBig() { big.classList.remove('on'); }
    function closeAll() {
      overlay.classList.remove('on');
      overlay.setAttribute('aria-hidden', 'true');
      d.body.classList.remove('wglock');
      if (window.__lenis && window.__lenis.start) window.__lenis.start();
      closeBig();
    }

    overlay.querySelector('.wgo__grid').addEventListener('click', function (e) {
      var cell = e.target.closest('.wgo__cell');
      if (!cell) return;
      openBig(Number(cell.getAttribute('data-i')) || 0);
    });
    overlay.querySelector('.wgo__x').addEventListener('click', closeAll);
    overlay.querySelector('.wgo__bigx').addEventListener('click', closeBig);
    overlay.querySelector('.wgo__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); openBig(ovIdx - 1); });
    overlay.querySelector('.wgo__nav--next').addEventListener('click', function (e) { e.stopPropagation(); openBig(ovIdx + 1); });
    big.addEventListener('click', function (e) { if (e.target === big || e.target === bimg) closeBig(); });
    d.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('on')) return;
      if (e.key === 'Escape') { big.classList.contains('on') ? closeBig() : closeAll(); }
      else if (big.classList.contains('on') && e.key === 'ArrowLeft') openBig(ovIdx - 1);
      else if (big.classList.contains('on') && e.key === 'ArrowRight') openBig(ovIdx + 1);
    });
    overlay._openBig = openBig;
    return overlay;
  }

  function openCat(ci, idx) {
    var cat = DATA[ci];
    if (!cat) return;
    var ov = ensureOverlay();
    ovCur = cat;
    ov.querySelector('.wgo__no').textContent = cat.no;
    ov.querySelector('.wgo__name').textContent = cat.name;
    ov.querySelector('.wgo__en').textContent = cat.en;
    ov.querySelector('.wgo__count').textContent = cat.items.length + ' 张';
    var grid = ov.querySelector('.wgo__grid');
    grid.innerHTML = cat.items.map(function (it, i) {
      return '<button class="wgo__cell" type="button" data-i="' + i + '" aria-label="第 ' + (i + 1) + ' 张">' +
        '<img src="' + it.s + '" alt="" loading="lazy" decoding="async"></button>';
    }).join('');
    ov.classList.add('on');
    ov.setAttribute('aria-hidden', 'false');
    d.body.classList.add('wglock');
    if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
    ov.querySelector('.wgo__scroll').scrollTop = 0;
    ov.querySelector('.wgo__big').classList.remove('on');
    void idx;
  }

  window.__openCat = openCat;

  if (mount && DATA.length) {
    var frag = d.createDocumentFragment();
    DATA.forEach(function (cat, ci) { frag.appendChild(buildCat(cat, ci)); });
    mount.parentNode.insertBefore(frag, mount.nextSibling);
  }

  /* ---------------- 视频浮层：按素材原比例 ---------------- */
  (function () {
    var modal = d.createElement('div');
    modal.className = 'vmodal2';
    modal.innerHTML = '<div class="vmodal2__stage"><button class="vmodal2__x" type="button" aria-label="关闭视频">关闭 \u2715</button>' +
      '<video controls playsinline preload="metadata"></video></div>';
    d.body.appendChild(modal);
    var vid = modal.querySelector('video');

    function stopAll() {
      try { vid.pause(); } catch (e) {}
      try { vid.currentTime = 0; } catch (e) {}
      vid.removeAttribute('src');
      try { vid.load(); } catch (e) {}
      d.querySelectorAll('video').forEach(function (v) {
        if (v !== vid && !v.paused) { try { v.pause(); } catch (e) {} }
      });
    }
    function close() {
      modal.classList.remove('on');
      d.body.classList.remove('wglock');
      stopAll();
    }
    function open(src) {
      d.querySelectorAll('#motion .film4 video').forEach(function (v) { if (!v.paused) { try { v.pause(); } catch (e) {} } });
      vid.src = src;
      modal.classList.add('on');
      d.body.classList.add('wglock');
      vid.play().catch(function () {});
    }
    d.querySelectorAll('#motion .film4').forEach(function (fig) {
      fig.addEventListener('click', function () {
        var src = fig.getAttribute('data-film');
        if (!src) return;
        open(src);
      });
      var v = fig.querySelector('video');
      if (v) {
        v.addEventListener('loadedmetadata', function () {
          if (v.videoWidth && v.videoHeight) fig.style.aspectRatio = v.videoWidth + ' / ' + v.videoHeight;
        });
      }
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal || (e.target.closest && e.target.closest('.vmodal2__x'))) close();
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('on')) close(); });
    window.addEventListener('pagehide', stopAll);
    window.__closeFilm = close;
  })();

  

/* ---------------- LoRA 训练图条：随滚动横向滑动 ---------------- */
(function () {
  'use strict';
  var strips = [].slice.call(document.querySelectorAll('.lm__strip'));
  if (!strips.length) return;
  var raf = 0;
  function apply() {
    raf = 0;
    var vh = window.innerHeight || 800;
    strips.forEach(function (st) {
      var r = st.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) return;
      var p = (vh * 0.95 - r.top) / (vh * 0.9);
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var track = st.firstElementChild;
      if (!track) return;
      var overflow = track.scrollWidth - st.clientWidth;
      if (overflow <= 0) {
        var dr = st.getAttribute('data-dir') === 'left' ? -1 : 1;
        track.style.transform = 'translate3d(' + ((p - 0.5) * 38 * dr).toFixed(1) + 'px,0,0)';
        return;
      }
      var dir = st.getAttribute('data-dir') === 'left' ? -1 : 1;
      var x = dir === 1 ? -overflow * (1 - p) : -overflow * p;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    });
  }
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(apply); });
  apply();
})();

/* ComfyUI 前后对比滑块：捕获阶段坐标命中（鼠标事件为主，指针事件兜底） */
(function () {
  'use strict';
  var boxes = [].slice.call(document.querySelectorAll('[data-compare]'));
  if (!boxes.length) return;
  var active = null;
  function apply(box, clientX) {
    var r = box.getBoundingClientRect();
    var p = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    box.style.setProperty('--p', p.toFixed(1) + '%');
  }
  function hit(x, y) {
    for (var i = 0; i < boxes.length; i++) {
      var r = boxes[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return boxes[i];
    }
    return null;
  }
  function begin(box, x) { active = box; box.classList.add('is-drag'); apply(box, x); }
  function move(x) { if (active) apply(active, x); }
  function end() { if (active) active.classList.remove('is-drag'); active = null; }
  boxes.forEach(function (b) { b.style.setProperty('--p', '50%'); });

  window.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var box = hit(e.clientX, e.clientY);
    if (!box) return;
    begin(box, e.clientX);
    e.preventDefault();
    e.stopPropagation();
  }, true);
  window.addEventListener('mousemove', function (e) {
    if (!active) return;
    if ((e.buttons & 1) === 0) { end(); return; }
    move(e.clientX);
    e.preventDefault();
  }, true);
  window.addEventListener('mouseup', end, true);
  window.addEventListener('blur', end);

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' || e.button !== 0) return;
    var box = hit(e.clientX, e.clientY);
    if (!box) return;
    begin(box, e.clientX);
    e.preventDefault();
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!active || e.pointerType === 'mouse') return;
    move(e.clientX);
  }, true);
  window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') end(); }, true);
  window.addEventListener('pointercancel', end, true);
})();

/* ---------------- 结尾：翻页进场 ---------------- */
(function () {
  var end = null; // 结尾进场改由 .content-effect 统一处理
  if (!end) return;
  var inner = end.querySelector('.endsec__inner') || end;
  var raf = 0, running = false;
  function apply() {
    raf = 0;
    var r = end.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    if (r.top > vh * 1.05) { inner.style.transform = ''; inner.style.opacity = ''; running = false; return; }
    var p = (vh - r.top) / (vh * 0.72);
    p = p < 0 ? 0 : (p > 1 ? 1 : p);
    if (p >= 1) { inner.style.transform = ''; inner.style.opacity = ''; running = false; return; }
    var rot = (1 - p) * -44;
    var ty = (1 - p) * -90;
    inner.style.transform = 'perspective(1900px) rotateX(' + rot.toFixed(2) + 'deg) translate3d(0,' + ty.toFixed(1) + 'px,0)';
    inner.style.opacity = (0.2 + 0.8 * p).toFixed(3);
    running = true;
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(apply); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  apply();
})();
})();
