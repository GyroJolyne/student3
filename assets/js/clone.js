/* ============================================================
   clone.js — 参考站交互复刻
   1) Lenis 平滑滚动
   2) 页面转场（8 列方块随机展开/收合）
   3) 导航/按钮 hover 乱码
   4) 标题逐字揭示 + 滚动变色
   5) 视差、粘性堆叠、横向 testimonials 等
   ============================================================ */
(function () {
  'use strict';

  // ?motion=1 可强制开启动效（系统开了"减少动态效果"时用来预览），并记住到整站
  /* 动效默认开启：只有显式 ?calm=1 才静音。
     之前的做法是跟随系统 prefers-reduced-motion，但这台机器的系统设置就是 reduce，
     导致整站动效全部不跑（用户反馈"没有动效"）。 */
  var calm = /[?&]calm=1\b/.test(location.search);
  if (calm) { try { sessionStorage.setItem('calmMode', '1'); } catch (e) {} }
  else { try { calm = sessionStorage.getItem('calmMode') === '1'; } catch (e) {} }
  var reduced = calm;
  if (calm) document.documentElement.classList.add('calm');
  var __FX = (location.search.match(/fx=([a-z,]+)/) || [])[1] || 'all';
  function fxOn(name) { return __FX === 'all' || (',' + __FX + ',').indexOf(',' + name + ',') > -1; }
  var hasGSAP = typeof window.gsap !== 'undefined';

  /* ---------- 1. Lenis ---------- */
  var lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new Lenis({ smooth: true, lerp: 0.9, wheelMultiplier: 1, infinite: false });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.__lenis = lenis;
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- 2. 转场 ---------- */
  function buildGrid() {
    var tr = document.querySelector('.transition');
    if (!tr) return Promise.resolve();
    var cols = (getComputedStyle(tr).gridTemplateColumns || '').split(' ').filter(Boolean).length || 8;
    var size = window.innerWidth / cols;
    var rows = Math.ceil(window.innerHeight / size);
    tr.style.gridTemplateRows = 'repeat(' + rows + ', ' + size + 'px)';
    tr.innerHTML = '';
    for (var i = 0; i < cols * rows; i++) {
      var b = document.createElement('div');
      b.className = 'transition-block';
      tr.appendChild(b);
    }
    return Promise.resolve();
  }

  /* ---------- 2. 转场（?fx=flip 才启用；默认关，导航走锚点平滑滚动） ---------- */
  // 方块转场改为显式开启：只有 URL 带 ?fx=... 且包含 flip 时才播
  function flipOn() { return /[?&]fx=/.test(location.search) && fxOn('flip'); }
  function initTransition() {
    var tr = document.querySelector('.transition');
    if (!tr) return;
    if (!flipOn()) { tr.style.display = 'none'; return; }
    buildGrid().then(function () {
      if (reduced || !hasGSAP) {
        tr.style.display = 'none';
        return;
      }
      gsap.set(tr, { display: 'grid', background: 'transparent' });
      gsap.set('.transition-block', { autoAlpha: 1 });
      gsap.to('.transition-block', {
        autoAlpha: 0,
        duration: 0.12,
        stagger: { amount: 0.55, from: 'random' },
        delay: 0.18,
        onComplete: function () { gsap.set(tr, { display: 'none' }); }
      });
    });

    window.addEventListener('resize', buildGrid);

    // 站内链接 → 方块铺满再跳转
    var links = Array.prototype.slice.call(document.querySelectorAll('a')).filter(function (a) {
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return false;
      if (a.target === '_blank') return false;
      if (a.hasAttribute('data-transition-prevent')) return false;
      return /\.html(\?|#|$)/.test(href) || href.indexOf('http') === 0 ? /\.html(\?|#|$)/.test(href) : false;
    });
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        var dest = a.href;
        if (!hasGSAP) { window.location.href = dest; return; }
        gsap.set(tr, { display: 'grid', background: 'transparent' });
        gsap.fromTo('.transition-block', { autoAlpha: 0 }, {
          autoAlpha: 1, duration: 0.001, ease: 'linear',
          stagger: { amount: 0.45, from: 'random' },
          onComplete: function () {
            // 铺满后再留一帧，避免跳转太快看不到满屏
            setTimeout(function () { window.location.href = dest; }, 60);
          }
        });
      });
    });

    window.addEventListener('pageshow', function (e) { if (e.persisted) window.location.reload(); });
  }

  /* ---------- 3. hover 乱码 ---------- */
  function initScramble() {
    var chars = 'ABCD!@#$%^&*()WXYZ012789';
    document.querySelectorAll('.collection-item, .photo-services, .nav-link:not(.nav-menu .nav-link)').forEach(function (link) {
      var el = link.querySelector('.nav-text, .button-text, .work-text');
      if (!el) return;
      var original = el.textContent.trim();
      var running = false;
      el.style.display = 'inline-block';
      el.style.width = el.offsetWidth + 'px';
      el.style.whiteSpace = 'nowrap';
      function rand() { return chars[Math.floor(Math.random() * chars.length)]; }
      function play() {
        if (running) return;
        running = true;
        var frame = 0, duration = 24;
        function update() {
          var out = '';
          for (var i = 0; i < original.length; i++) {
            var wave = frame - i * 2;
            if (wave > 6) out += original[i];
            else if (wave > 0) out += Math.random() < 0.6 ? rand() : original[i];
            else out += original[i];
          }
          el.textContent = out;
          frame++;
          if (frame <= duration) setTimeout(function () { requestAnimationFrame(update); }, 55);
          else { el.textContent = original; running = false; }
        }
        update();
      }
      link.addEventListener('mouseenter', play);
    });
  }

  /* ---------- 4. 文本：逐词变色 + 逐字揭示 ---------- */
  function isDarkEl(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      var bg = getComputedStyle(n).backgroundColor;
      var m = bg.match(/rgba?\(([^)]+)\)/);
      if (m) {
        var v = m[1].split(',').map(Number);
        if (v.length < 4 || v[3] > 0.5) {
          return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) < 128;
        }
      }
      n = n.parentElement;
    }
    return false;
  }

  function initText() {
    if (!hasGSAP || !window.SplitText || !window.ScrollTrigger || reduced) return {
      /* noop */
    };
    gsap.registerPlugin(window.ScrollTrigger, window.SplitText);

    // 4.1 标题逐词由浅到深（参考站的核心文字动效）
    var targets = document.querySelectorAll('.h1, .h2.fade, .h2.fade.big, .h3');
    targets.forEach(function (el) {
      if (el.closest('.transition') || el.closest('.nav')) return;
      if (el.dataset.noScrub) return;
      var native = getComputedStyle(el).color;
      var start = isDarkEl(el) ? 'rgba(255,255,255,0.2)' : '#d2d2d2';
      var split = new SplitText(el, { type: 'words' });
      gsap.fromTo(split.words,
        { color: start },
        {
          color: native, ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 42%', scrub: true }
        });
    });

    // 4.2 段落/小标题：进入视口逐行上移
    document.querySelectorAll('[data-reveal-text]').forEach(function (el) {
      var split = new SplitText(el, { type: 'lines', linesClass: 'line-split' });
      gsap.set(split.lines, { overflow: 'hidden' });
      gsap.from(split.lines, {
        yPercent: 110, duration: 1.1, ease: 'power3.out', stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  }

  /* ---------- 4.5 hero 3D（UnicornStudio，本地） ---------- */
  function init3D() {
    var hosts = document.querySelectorAll('[data-us-project]');
    if (!hosts.length || !window.UnicornStudio) return;
    var done = false;
    function fallback() {
      if (done) return;
      done = true;
      hosts.forEach(function (h) { h.style.background = 'transparent'; });
    }
    try {
      window.UnicornStudio.init().then(function () { done = true; }).catch(fallback);
      setTimeout(fallback, 6000);
    } catch (e) { fallback(); }
  }

  /* ---------- 4.6 300vh 段落：照片缩放 + 证言横滑 ---------- */
  function initSections() {
    if (!hasGSAP || !window.ScrollTrigger || reduced) return;

    // A. 照片段：窗口内固定，图片由小到大铺满
    var photoSec = document.querySelector('.section.photo');
    if (photoSec && fxOn('photo')) {
      var img = photoSec.querySelector('.sticky-photo img, .sticky-photo .image-full, .sticky-photo .photo-image');
      if (img) {
        gsap.fromTo(img,
          { scale: 0.62, borderRadius: 28 },
          {
            scale: 1, borderRadius: 0, ease: 'none',
            scrollTrigger: { trigger: photoSec, start: 'top top', end: 'bottom bottom', scrub: true }
          });
      }
    }

    // B. 证言段：面板 sticky，卡片随滚动横向滑出
    var tSec = document.querySelector('.section.for-testimonials');
    if (tSec && fxOn('horiz')) {
      var wrap = tSec.querySelector('.testimonial-wrap');
      var pane = tSec.querySelector('.sticky-testimonials');
      if (wrap && pane) {
        gsap.fromTo(wrap, { x: 0 }, {
          x: function () { return -Math.max(0, wrap.scrollWidth - pane.clientWidth); },
          ease: 'none', invalidateOnRefresh: true,
          scrollTrigger: { trigger: tSec, start: 'top top', end: 'bottom bottom', scrub: true }
        });
      }
    }
  }

  /* ---------- 5. 视差 ---------- */
  function initParallax() {
    if (!hasGSAP || !window.ScrollTrigger || reduced) return;
    document.querySelectorAll('.paralax-image').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: img.closest('.image-wrap') || img, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------- 6. 段落上移淡入覆盖（原站 content-effect 手法） ---------- */
  function initSectionRise() {
    if (reduced || !fxOn('rise')) return;
    var items = [];
    document.querySelectorAll('.content-effect').forEach(function (w) {
      if (w.id === 'contact') return;          // 页脚不做上移，避免压住结尾页
      // 自建段落（内容直接挂在 .content-effect 下）→ 直接移动段落本身；
      // 模板段落（内层还有一个 section 面板）→ 移动那个面板。
      var inner = w.firstElementChild;
      var templateish = inner && inner.classList && (inner.classList.contains('section') || inner.classList.contains('secx'));
      items.push({ w: w, el: templateish ? inner : w });
    });
    if (!items.length) return;
    var ticking = false;
    function apply() {
      var vh = window.innerHeight;
      var s = vh * 0.88, e = vh * 0.10, span = s - e;
      var docH = document.documentElement.scrollHeight;
      var atEnd = window.pageYOffset + vh >= docH - 4;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var top = it.w.getBoundingClientRect().top;
        var p = (s - top) / span;
        // 页面到底时最后一段必须完全落位，否则会一直半透明、被上面压住
        if (atEnd) p = 1;
        if (p < 0) p = 0; else if (p > 1) p = 1;
        it.el.style.transform = 'translate3d(0,' + (-430 * (1 - p)).toFixed(1) + 'px,0)';
        it.el.style.opacity = p.toFixed(3);
      }
      ticking = false;
    }
    function onScroll() { apply(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
  }

  /* ---------- 导航：本页有对应板块就平滑滚过去，否则正常跳页 ---------- */
  /* ---------- 首页 Hero：星场 + 鼠标视差 ---------- */
  function initSpace() {
    var scene = document.querySelector('.hero-space');
    if (!scene) return;
    var sky = scene.querySelector('.space__sky');
    var neb = scene.querySelector('.space__nebula');
    var fig = scene.querySelector('.space__figure');
    var ring = scene.querySelector('.space__ring');
    var cv = scene.querySelector('.space__stars');

    /* 1) 画布：闪烁星点 + 向外的星流（飞行感） */
    var ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    var stars = [], streaks = [];
    function sizeCanvas() {
      if (!cv) return;
      var r = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round((r.width * r.height) / 5200);
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * r.width, y: Math.random() * r.height,
          r: Math.random() * 1.4 + .25, a: Math.random() * .55 + .2,
          sp: Math.random() * .05 + .01, ph: Math.random() * Math.PI * 2
        });
      }
      streaks = [];
      for (var j = 0; j < 150; j++) streaks.push(newStreak(r, true));
    }
    function newStreak(r, initial) {
      return {
        ang: Math.random() * Math.PI * 2,
        d: initial ? Math.random() * Math.max(r.width, r.height) * .7 : 0,
        sp: Math.random() * 2.8 + 1.6,
        len: Math.random() * 46 + 18,
        a: Math.random() * .45 + .2
      };
    }
    function drawField(t) {
      if (!ctx) return;
      var r = cv.getBoundingClientRect(), w = r.width, h = r.height;
      var vx = w * .5, vy = h * .46;
      var maxD = Math.sqrt(w * w + h * h) * .55;
      ctx.clearRect(0, 0, w, h);

      /* 闪烁星点 */
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y -= s.sp; if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }
        var tw = .55 + .45 * Math.sin(t * .0016 + s.ph);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = i % 11 === 0 ? '#bcd8ff' : '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      }

      /* 星流：从中心向外飞出 */
      for (var k = 0; k < streaks.length; k++) {
        var g = streaks[k];
        var prev = g.d;
        g.d += g.sp;
        if (g.d > maxD) { streaks[k] = newStreak(r, false); continue; }
        var near = Math.min(1, g.d / 120);          /* 中心淡入 */
        var far = 1 - Math.min(1, g.d / maxD);      /* 远端淡出 */
        var alpha = g.a * near * far * 1.5;
        if (alpha <= .01) continue;
        var c1 = Math.cos(g.ang), s1 = Math.sin(g.ang);
        ctx.globalAlpha = Math.min(.78, alpha);
        ctx.strokeStyle = k % 5 === 0 ? '#bcd9ff' : '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(vx + c1 * (g.d - g.len), vy + s1 * (g.d - g.len));
        ctx.lineTo(vx + c1 * g.d, vy + s1 * g.d);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(drawField);
    }

    /* 2) 鼠标视差 */
    var tx = 0, ty = 0, cx = 0, cy = 0;
    function onMove(e) {
      var r = scene.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 2;
      ty = ((e.clientY - r.top) / r.height - .5) * 2;
    }
    var raf = 0;
    function loop() {
      cx += (tx - cx) * .06;
      cy += (ty - cy) * .06;
      if (neb) neb.style.setProperty('--px', (cx * 26).toFixed(2) + 'px');
      if (sky) sky.style.setProperty('--px', (cx * 10).toFixed(2) + 'px');
      if (fig) fig.style.setProperty('--px', (cx * -34).toFixed(2) + 'px');
      if (ring) ring.style.setProperty('--px', (cx * -18).toFixed(2) + 'px');
      raf = requestAnimationFrame(loop);
    }

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    window.addEventListener('mousemove', onMove, { passive: true });
    if (!reduced) {
      var start = function () {
        sizeCanvas();
        drawField(performance.now());
        loop();
      };
      if (document.readyState === 'complete') start();
      else window.addEventListener('load', start);
    }
  }

  function initPlusCursor() {
    var wrap = document.querySelector('.plus-line-wrapper');
    if (!wrap) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    function move(e) {
      var dx = e.clientX - window.innerWidth / 2;
      var dy = e.clientY - window.innerHeight / 2;
      wrap.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
    }
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseleave', function () {
      wrap.style.transform = 'translate3d(0,0,0)';
    });
    // 悬停状态：链接/按钮放大并转 90°，图片放大更多、辅助线淡出
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      var link = t.closest('a, button, [role="button"]');
      var media = t.closest('img, .project-image, .work-image, .paralax-image, .gallery-item');
      wrap.classList.toggle('is-link', !!link);
      wrap.classList.toggle('is-media', !link && !!media);
    }, { passive: true });
  }

  function initNavAnchors() {
    var links = document.querySelectorAll('.fixed-element a.nav-link, .nav a.nav-link');
    if (!links.length) return;
    var map = { '': 'top', 'index.html': 'top', 'work.html': 'works', 'news.html': 'news', 'contact.html': 'contact' };
    function docTop(node) {
      var y = 0;
      while (node && node.offsetTop !== undefined) { y += node.offsetTop; node = node.offsetParent; }
      return y;
    }
    function targetY(el) {
      // 用块内第一个大标题当锚点；offsetTop 不受升起动画 transform 影响
      var inner = el.querySelector('h1, h2') || el.querySelector('.container') || el.firstElementChild || el;
      return Math.max(0, docTop(inner) - 120);
    }
    function scrollToEl(el) {
      var y = targetY(el), startY = window.pageYOffset;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      // 兜底：rAF 被节流/页面隐藏时 Lenis 不动，直接用原生滚动
      setTimeout(function () {
        if (Math.abs(window.pageYOffset - startY) < 4) window.scrollTo({ top: y, behavior: 'smooth' });
      }, 650);
    }
    Array.prototype.forEach.call(links, function (a) {
      var raw = a.getAttribute('href') || '';
      var parts = raw.split('#');
      var href = (parts[0] || '').split('?')[0];
      var hash = parts[1] || '';
      var file = href.split('/').pop();
      if (file === '') file = 'index.html';
      var id = hash || map[file];
      if (!id) return;
      if (file === '' && hash) file = (location.pathname.split('/').pop() || 'index.html');
      var el = id === 'top' ? document.body : document.getElementById(id);
      if (!el) return;
      // 本页就是目标页（或目标页不存在对应板块）时才拦截
      var here = (location.pathname.split('/').pop() || 'index.html');
      // 同页：href 指向本页，或本页就存在这个 id
      var samePage = (file === here) || (file === 'index.html' && here === 'index.html') || (id !== 'top' && document.getElementById(id));
      if (!samePage) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (id === 'top') {
          if (lenis) lenis.scrollTo(0, { duration: 1.1 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
        } else scrollToEl(el);
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
    // 跨页锚点：URL 带 #id 时落到对应板块
    if (location.hash.length > 1) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(function () { scrollToEl(target); }, 260);
    }
  }

  /* ---------- 导航配色：压到深色板块上就反相，回到浅色就复原 ---------- */
  function initNavTheme() {
    var host = document.querySelector('.fixed-element');
    if (!host) return;
    function behindIsDark() {
      var stack = document.elementsFromPoint(Math.round(window.innerWidth / 2), 36) || [];
      for (var i = 0; i < stack.length; i++) {
        var el = stack[i];
        if (el.closest && el.closest('.fixed-element')) continue;
        var tag = el.tagName;
        if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS') return true;
        var cs = window.getComputedStyle(el);
        var m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (m) {
          var p = m[1].split(',').map(Number);
          var a = p.length > 3 ? p[3] : 1;
          if (a > 0.2) return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) < 110;
        }
      }
      return false;
    }
    function apply() {
      var hero = document.querySelector('.hero-image.with-image');
      var heroDark = false;
      if (hero) {
        var hr = hero.getBoundingClientRect();
        heroDark = hr.top <= 36 && hr.bottom >= 36;
      }
      var v = (heroDark || behindIsDark()) ? '1' : '0';
      if (host.getAttribute('data-inv') !== v) host.setAttribute('data-inv', v);
    }
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    apply();
  }


  /* ---------- 视频浮层 ---------- */
  function initFilmPlayer() {
    var items = document.querySelectorAll('[data-film]');
    if (!items.length) return;
    var modal = document.createElement('div');
    modal.className = 'vmodal';
    modal.innerHTML = '<div class="vmodal__box"><button class="vmodal__close" type="button" aria-label="关闭">×</button><video controls playsinline preload="none"></video></div>';
    document.body.appendChild(modal);
    var video = modal.querySelector('video');
    var lastFocus = null;
    function close() {
      video.pause(); video.removeAttribute('src'); video.load();
      modal.classList.remove('is-open');
      document.documentElement.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('.vmodal__close')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
    items.forEach(function (btn) {
      btn.addEventListener('click', function () {
        lastFocus = btn;
        video.src = btn.getAttribute('data-film');
        modal.classList.add('is-open');
        document.documentElement.style.overflow = 'hidden';
        var pr = video.play();
        if (pr && pr.catch) pr.catch(function () {});
        modal.querySelector('.vmodal__close').focus();
      });
    });
  }

  /* ---------- 衔接页：滚动放大 ---------- */
  function initZoomReveal() {
    var sec = document.getElementById('zoomsec');
    var img = document.getElementById('zoomImg');
    if (!sec || !img) return;
    function apply() {
      var r = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh - r.top) / (vh + r.height);
      p = Math.max(0, Math.min(1, p));
      var sc = 1 + p * 0.42;
      var rad = Math.min(28, p * 90);
      img.style.transform = 'scale(' + sc.toFixed(3) + ')';
      img.style.borderRadius = rad.toFixed(1) + 'px';
    }
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    apply();
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initTransition();
    initFilmPlayer();
    initZoomReveal();
  initSpace();
  initPlusCursor();
  initNavAnchors();
    initNavTheme();
    initScramble();
    if (fxOn("3d")) init3D();
    if (fxOn("text")) initText();
    initSections();
    initSectionRise();
    if (fxOn("parallax")) initParallax();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ---------- LoRA 横向滑动 ---------- */
function initLoraSlide() {
  var wrap = document.querySelector('.lora__scroll');
  var track = document.querySelector('.lora__track');
  if (!wrap || !track) return;
  function apply() {
    var r = wrap.getBoundingClientRect();
    var total = wrap.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    var p = Math.min(1, Math.max(0, -r.top / total));
    var max = track.scrollWidth - window.innerWidth;
    if (max < 0) max = 0;
    track.style.transform = 'translate3d(' + (-p * max) + 'px,0,0)';
  }
  window.addEventListener('scroll', apply, { passive: true });
  window.addEventListener('resize', apply);
  apply();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoraSlide);
} else { initLoraSlide(); }
/* ============ 第二版交互 ============ */
(function () {
  'use strict';

  /* ---- 图集：中间放大 + 点旁边换中间 ---- */
  function initCatStages() {
    document.querySelectorAll('.cat3').forEach(function (cat) {
      var stage = cat.querySelector('.cat3__stage');
      var items = Array.prototype.slice.call(stage.querySelectorAll('.cat3__item'));
      if (!items.length) return;
      var active = Math.floor(items.length / 2);

      function layout() {
        var w = stage.clientWidth;
        var step = Math.max(120, Math.min(w * 0.30, 300));
        items.forEach(function (el, i) {
          var d = i - active;
          var ad = Math.abs(d);
          el.style.setProperty('--x', (d * step).toFixed(1) + 'px');
          el.style.setProperty('--s', d === 0 ? 1 : (ad === 1 ? 0.66 : 0.52));
          el.style.setProperty('--o', ad > 3 ? 0 : (d === 0 ? 1 : Math.max(0.25, 0.9 - ad * 0.22)));
          el.style.zIndex = String(20 - Math.min(ad, 8));
          el.style.pointerEvents = ad > 3 ? 'none' : 'auto';
          if (d === 0) { el.setAttribute('data-active', '1'); }
          else { el.removeAttribute('data-active'); }
        });
      }

      items.forEach(function (el, i) {
        el.addEventListener('click', function (e) {
          if (i === active) { openLightbox(el.dataset.full); return; }
          e.preventDefault();
          active = i;
          layout();
        });
      });

      stage.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { active = Math.min(items.length - 1, active + 1); layout(); }
        if (e.key === 'ArrowLeft') { active = Math.max(0, active - 1); layout(); }
      });

      layout();
      window.addEventListener('resize', layout);
      cat._relayout = layout;
    });
  }

  /* ---- 简单灯箱 ---- */
  var lb;
  function openLightbox(src) {
    if (!src) return;
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'vlb';
      lb.innerHTML = '<button class="vlb__x" aria-label="关闭">✕</button><img alt="">';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('vlb__x')) lb.classList.remove('is-on');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') lb.classList.remove('is-on');
      });
    }
    lb.querySelector('img').src = src;
    lb.classList.add('is-on');
  }

  /* ---- 拼图随滚动放大 ---- */
  function initCollage() {
    var sec = document.querySelector('.collage');
    if (!sec) return;
    var frame = sec.querySelector('.collage__frame');
    function apply() {
      var r = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh - r.top) / (vh + r.height);
      p = Math.min(1, Math.max(0, p));
      var sc = 0.78 + p * 0.34;
      frame.style.setProperty('--sc', sc.toFixed(3));
    }
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    apply();
  }

  /* ---- LoRA 叠卡：点击置顶 ---- */
  function initLoraDeck() {
    var deck = document.querySelector('.lora3');
    if (!deck) return;
    var cards = Array.prototype.slice.call(deck.querySelectorAll('.lora3__card'));
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        var on = c.getAttribute('data-active') === '1';
        cards.forEach(function (x) { x.removeAttribute('data-active'); });
        if (!on) c.setAttribute('data-active', '1');
      });
    });
  }

  /* ---- 视频浮层：按原比例放大 ---- */
  function initFilmModal() {
    var modal = document.querySelector('.vmodal');
    if (!modal) return;
    var stage = modal.querySelector('.vmodal__stage');
    var vid = modal.querySelector('video');
    var src = modal.querySelector('.vmodal__src');
    document.querySelectorAll('.film3').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var file = btn.dataset.film;
        var portrait = btn.dataset.orient === 'portrait';
        stage.style.setProperty('--ar', portrait ? '9 / 16' : '16 / 9');
        stage.style.setProperty('--maxh', portrait ? '86vh' : '76vh');
        vid.src = file;
        if (src) src.textContent = file.split('/').pop();
        modal.classList.add('is-on');
        document.body.style.overflow = 'hidden';
        vid.play().catch(function () {});
      });
    });
    function close() {
      modal.classList.remove('is-on');
      document.body.style.overflow = '';
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    }
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('vmodal__x')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-on')) close();
    });
  }

  function boot() {
    initCatStages();
    initCollage();
    initLoraDeck();
    initFilmModal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
/* 空心字只描外轮廓：用 canvas 取“外边界”像素，避免字母内圈也被描一圈 */
(function () {
  'use strict';

  function renderOutline(host) {
    var text = host.getAttribute('data-text') || host.textContent.trim();
    if (!text) return;
    var cs = getComputedStyle(host);
    var size = parseFloat(cs.fontSize);
    var weight = cs.fontWeight || '700';
    var fam = cs.fontFamily;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rect = host.getBoundingClientRect();
    if (!rect.width || !size) return;

    var pad = Math.round(size * 0.35);
    var w = Math.ceil(rect.width + pad * 2);
    var h = Math.ceil(rect.height + pad * 2);

    var c = document.createElement('canvas');
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.style.left = -pad + 'px';
    c.style.top = -pad + 'px';

    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = weight + ' ' + size + 'px ' + fam;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var ls = parseFloat(cs.letterSpacing);
    if (!isNaN(ls) && ctx.letterSpacing !== undefined) ctx.letterSpacing = ls + 'px';

    // 1) 先把字填成白色，取遮罩
    var m = document.createElement('canvas');
    m.width = c.width; m.height = c.height;
    var mx = m.getContext('2d');
    mx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mx.font = ctx.font;
    mx.textAlign = 'center';
    mx.textBaseline = 'middle';
    if (ctx.letterSpacing !== undefined && !isNaN(ls)) mx.letterSpacing = ls + 'px';
    mx.fillStyle = '#fff';
    mx.fillText(text, w / 2, h / 2);

    var sw = m.width, sh = m.height;
    var data = mx.getImageData(0, 0, sw, sh).data;
    var solid = new Uint8Array(sw * sh);
    for (var i = 0, p = 3; i < solid.length; i++, p += 4) solid[i] = data[p] > 120 ? 1 : 0;

    // 2) 从画布边界做 BFS，标出“外部”
    var outside = new Uint8Array(sw * sh);
    var stack = new Int32Array(sw * sh);
    var sp = 0;
    function push(x, y) {
      var idx = y * sw + x;
      if (outside[idx] || solid[idx]) return;
      outside[idx] = 1;
      stack[sp++] = idx;
    }
    for (var x = 0; x < sw; x++) { push(x, 0); push(x, sh - 1); }
    for (var y = 0; y < sh; y++) { push(0, y); push(sw - 1, y); }
    while (sp > 0) {
      var idx = stack[--sp];
      var cx = idx % sw, cy = (idx - cx) / sw;
      if (cx > 0) push(cx - 1, cy);
      if (cx < sw - 1) push(cx + 1, cy);
      if (cy > 0) push(cx, cy - 1);
      if (cy < sh - 1) push(cx, cy + 1);
    }

    // 3) 只把“外边界”画出来（贴着外部的那一圈实心像素）
    var out = document.createElement('canvas');
    out.width = sw; out.height = sh;
    var ox = out.getContext('2d');
    var img = ox.createImageData(sw, sh);
    var od = img.data;
    // 先算“距外部 <= R 像素”的实心像素（R 按字号缩放，保证描边有厚度）
    var R = Math.max(2, Math.round(size * dpr * 0.016));
    var near = new Uint8Array(sw * sh);
    for (var yy = 1; yy < sh - 1; yy++) {
      for (var xx = 1; xx < sw - 1; xx++) {
        var k = yy * sw + xx;
        if (!solid[k]) continue;
        var hit = 0;
        for (var dy = -R; dy <= R && !hit; dy++) {
          for (var dx = -R; dx <= R; dx++) {
            var nx = xx + dx, ny = yy + dy;
            if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
            if (outside[ny * sw + nx]) { hit = 1; break; }
          }
        }
        if (hit) near[k] = 1;
      }
    }
    for (var k2 = 0; k2 < near.length; k2++) {
      if (!near[k2]) continue;
      var q = k2 * 4;
      od[q] = 168; od[q + 1] = 246; od[q + 2] = 255; od[q + 3] = 255;
    }
    ox.putImageData(img, 0, 0);

    // 4) 描边 + 辉光
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'rgba(110, 210, 255, .85)';
    ctx.shadowBlur = Math.max(8, size * 0.045);
    ctx.drawImage(out, 0, 0, sw, sh, 0, 0, w, h);
    ctx.shadowBlur = Math.max(22, size * 0.16);
    ctx.shadowColor = 'rgba(70, 150, 255, .55)';
    ctx.drawImage(out, 0, 0, sw, sh, 0, 0, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // 用背景图承载，避免 canvas 层级/尺寸问题
    try {
      host.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
      host.style.backgroundSize = (w / rect.width * 100) + '% ' + (h / rect.height * 100) + '%';
      host.style.backgroundPosition = 'center';
      host.style.backgroundRepeat = 'no-repeat';
      host.style.color = 'transparent';
      host.style.webkitTextStroke = '0';
    } catch (e) {}
  }

  function boot() {
    var hosts = document.querySelectorAll('[data-outline]');
    if (!hosts.length) return;
    hosts.forEach(function (h) {
      h.classList.add('has-ink');
      renderOutline(h);
    });
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        hosts.forEach(renderOutline);
      }, 220);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { hosts.forEach(renderOutline); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* 分类卡：点任意一张 → 打开该分类灯箱 */
(function () {
  function boot() {
    document.querySelectorAll('.cat3').forEach(function (cat) {
      cat.addEventListener('click', function (ev) {
        var item = ev.target.closest('.cat3__item');
        if (!item) return;
        var all = Array.prototype.map.call(cat.querySelectorAll('.cat3__item'), function (b) { return b.getAttribute('data-full'); });
        var idx = Number(item.getAttribute('data-i') || 0);
        if (window.__openGallery) window.__openGallery(all, idx);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* 极简灯箱兜底：没有现成 __openGallery 时自己开一个 */
(function () {
  function open(list, idx) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,8,13,.94);display:flex;align-items:center;justify-content:center;padding:4vh 4vw;cursor:zoom-out';
    var img = document.createElement('img');
    img.src = list[idx];
    img.style.cssText = 'max-width:100%;max-height:100%;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6)';
    ov.appendChild(img);
    ov.addEventListener('click', function () { ov.remove(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(ov);
  }
  window.__galleryFallback = open;
  document.addEventListener('click', function (ev) {
    var item = ev.target.closest && ev.target.closest('.cat3__item');
    if (!item) return;
    var cat = item.closest('.cat3');
    if (!cat) return;
    var all = Array.prototype.map.call(cat.querySelectorAll('.cat3__item'), function (b) { return b.getAttribute('data-full'); });
    var idx = Number(item.getAttribute('data-i') || 0);
    open(all, idx);
  }, true);
})();

/* 背景粒子 + LoRA 横滑条 */
(function () {
  function stars() {
    var c = document.querySelector('.bgfx__stars');
    if (!c) return;
    var ctx = c.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var pts = [];
    function size() {
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (var i = 0; i < 120; i++) {
        pts.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.4 + .3, v: Math.random() * .12 + .03, a: Math.random() * .5 + .15, p: Math.random() * 6.28 });
      }
    }
    size();
    window.addEventListener('resize', size);
    (function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.y -= p.v; p.p += 0.01;
        if (p.y < -4) { p.y = innerHeight + 4; p.x = Math.random() * innerWidth; }
        var a = p.a * (0.6 + 0.4 * Math.sin(p.p));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(190, 224, 255, ' + a.toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      requestAnimationFrame(loop);
    })();
  }

  function strips() {
    var items = document.querySelectorAll('.lora4__strip');
    if (!items.length) return;
    function apply() {
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var track = el.querySelector('.lora4__track');
        if (!track) continue;
        var r = el.getBoundingClientRect();
        var p = (innerHeight - r.top) / (innerHeight + r.height);
        p = Math.max(0, Math.min(1, p));
        var max = Math.max(0, track.scrollWidth - el.clientWidth);
        var dir = el.classList.contains('lora4__strip--left') ? -1 : 1;
        var x = dir > 0 ? (p - 1) * max : (1 - p) * max * -1;
        track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      }
    }
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    apply();
  }

  function boot() { stars(); strips(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* 统一画廊打开入口：覆盖旧的 __openGallery */
window.addEventListener('load', function () {
  if (typeof window.__galleryFallback === 'function') window.__openGallery = window.__galleryFallback;
});

/* 分类灯箱：点一张 → 打开整类网格，点其中一张 → 大图 */
(function () {
  function build(cat) {
    var items = Array.prototype.slice.call(cat.querySelectorAll('.cat3__item'));
    var files = items.map(function (b) { return b.getAttribute('data-full'); });
    var name = (cat.querySelector('.cat3__name') || {}).textContent || '';
    var lb = document.createElement('div');
    lb.className = 'catlb';
    lb.innerHTML = '<div class="catlb__bar"><span>' + name + ' ／ ' + files.length + ' 张</span><span>点击图片放大 · ESC 关闭</span></div>' +
      '<div class="catlb__grid">' + files.map(function (f) { return '<img src="' + f + '" alt="">'; }).join('') + '</div>';
    document.body.appendChild(lb);
    requestAnimationFrame(function () { lb.classList.add('is-on'); });
    document.documentElement.style.overflow = 'hidden';
    lb.addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (img) {
        var big = document.createElement('div');
        big.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(2,3,6,.96);display:flex;align-items:center;justify-content:center;padding:4vh 4vw;cursor:zoom-out';
        var b = document.createElement('img');
        b.src = img.src; b.style.cssText = 'max-width:100%;max-height:100%;border-radius:12px';
        big.appendChild(b); big.addEventListener('click', function () { big.remove(); });
        document.body.appendChild(big);
        return;
      }
      if (e.target === lb) close();
    });
    function close() { lb.remove(); document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
  }
  document.addEventListener('click', function (ev) {
    var item = ev.target.closest && ev.target.closest('.cat3__item');
    if (!item) return;
    ev.preventDefault(); ev.stopPropagation();
    var cat = item.closest('.cat3');
    if (cat) build(cat);
  }, true);
})();
