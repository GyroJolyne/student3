
/* ===== v5：图集列表 → 整类图集弹层 · 拼图翻页 · 首屏引文规整 ===== */
(function () {
  'use strict';
  var d = document;
  var EN = {
    '3d': 'SPATIAL FORMS',
    cast: 'ANIME ENSEMBLE',
    poster: 'CHARACTER POSTERS',
    illust: 'ILLUSTRATION',
    concept: 'IMAGE & CONCEPT',
    layout: 'HORIZONTAL COLLAGE'
  };
  var ORDER = ['3d', 'cast', 'poster', 'illust', 'concept', 'layout'];

  /* ---------- 首屏引文：一行、无标点（兜底） ---------- */
  var quote = d.querySelector('.h2._01');
  if (quote && quote.firstChild && quote.firstChild.nodeType === 3) {
    var t = quote.firstChild.nodeValue.replace(/[，。；、]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) quote.firstChild.nodeValue = t;
  }

  /* ---------- 收集图集数据 ---------- */
  var works = d.getElementById('works');
  if (!works) return;
  var catlist = works.querySelector('.catlist');
  if (!catlist) return;

  function ratioOf(btn, img) {
    var r = 0;
    var inline = btn.style && btn.style.aspectRatio;
    if (inline) r = parseFloat(inline);
    if (!(r > 0)) r = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0;
    if (!(r > 0)) {
      var w = img && img.getAttribute('width'), h = img && img.getAttribute('height');
      if (w && h) r = parseFloat(w) / parseFloat(h);
    }
    if (!(r > 0.15) || r > 6) r = 0.72;
    return r;
  }

  var data = {};
  Array.prototype.forEach.call(catlist.querySelectorAll('.cat3'), function (sec) {
    var cat = sec.getAttribute('data-cat');
    var nameEl = sec.querySelector('.cat3__name');
    var numEl = sec.querySelector('.cat3__num');
    var descEl = sec.querySelector('.cat3__desc');
    var items = [];
    Array.prototype.forEach.call(sec.querySelectorAll('.cat3__item'), function (btn) {
      var img = btn.querySelector('img');
      if (!img) return;
      items.push({
        src: btn.getAttribute('data-full') || img.getAttribute('src'),
        ratio: ratioOf(btn, img),
        alt: img.getAttribute('alt') || ''
      });
    });
    data[cat] = {
      cat: cat,
      num: numEl ? numEl.textContent.trim() : '',
      name: nameEl ? nameEl.textContent.trim() : cat,
      desc: descEl ? descEl.textContent.trim() : '',
      en: EN[cat] || '',
      items: items
    };
  });

  var cats = ORDER.filter(function (k) { return data[k] && data[k].items.length; });

  /* ---------- 列表 ---------- */
  function pick(arr, n) {
    var out = [], i, L = arr.length;
    if (!L) return out;
    for (i = 0; i < n; i++) out.push(arr[Math.min(L - 1, Math.round((i + 0.5) * L / n))]);
    return out;
  }

  var gx = d.createElement('div');
  gx.className = 'gx';
  gx.setAttribute('role', 'list');
  cats.forEach(function (cat, idx) {
    var c = data[cat];
    var row = d.createElement('div');
    row.className = 'gxrow';
    row.setAttribute('role', 'listitem');
    var thumbs = pick(c.items, 4).map(function (it) {
      return '<span><img src="' + it.src + '" alt="" loading="lazy" decoding="async"></span>';
    }).join('');
    row.innerHTML =
      '<button class="gxrow__hit" type="button" data-open="' + cat + '" aria-label="查看 ' + c.name + ' 全部 ' + c.items.length + ' 张">' +
        '<span class="gxrow__no">' + ('0' + (idx + 1)).slice(-2) + '</span>' +
        '<span class="gxrow__title"><b>' + c.name + '</b><i>' + c.en + '</i></span>' +
        '<span class="gxrow__meta">' + c.items.length + ' 张<em>查看全部 →</em></span>' +
        '<span class="gxrow__thumbs">' + thumbs + '</span>' +
      '</button>';
    gx.appendChild(row);
  });
  catlist.parentNode.insertBefore(gx, catlist.nextSibling);

  /* ---------- 弹层 ---------- */
  var ov = d.createElement('div');
  ov.className = 'gxlb';
  ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML =
    '<div class="gxlb__bar">' +
      '<div class="gxlb__id"><span class="gxlb__no">01</span><b class="gxlb__name">—</b><i class="gxlb__en">—</i></div>' +
      '<div class="gxlb__right"><span class="gxlb__count">0 张</span><button class="gxlb__x" type="button">关闭 ✕</button></div>' +
    '</div>' +
    '<div class="gxlb__scroll"><div class="gxlb__grid"></div></div>' +
    '<div class="gxlb__big" aria-hidden="true">' +
      '<img class="gxlb__bigimg" alt="">' +
      '<button class="gxlb__nav gxlb__nav--prev" type="button" aria-label="上一张">‹</button>' +
      '<button class="gxlb__nav gxlb__nav--next" type="button" aria-label="下一张">›</button>' +
      '<span class="gxlb__bigcount"></span>' +
      '<button class="gxlb__bigx" type="button" aria-label="关闭大图">✕</button>' +
    '</div>';
  d.body.appendChild(ov);

  var elNo = ov.querySelector('.gxlb__no');
  var elName = ov.querySelector('.gxlb__name');
  var elEn = ov.querySelector('.gxlb__en');
  var elCount = ov.querySelector('.gxlb__count');
  var grid = ov.querySelector('.gxlb__grid');
  var brs = ov.querySelector('.gxlb__big');
  var bimg = ov.querySelector('.gxlb__bigimg');
  var bcount = ov.querySelector('.gxlb__bigcount');
  var cur = null, bi = 0;

  function openCat(cat) {
    var c = data[cat];
    if (!c) return;
    cur = c;
    elNo.textContent = '0' + (cats.indexOf(cat) + 1);
    elName.textContent = c.name;
    elEn.textContent = c.en;
    elCount.textContent = c.items.length + ' 张';
    grid.innerHTML = '';
    c.items.forEach(function (it, i) {
      var b = d.createElement('button');
      b.className = 'gxlb__cell';
      b.type = 'button';
      b.style.setProperty('--r', it.ratio.toFixed(3));
      b.setAttribute('aria-label', '查看第 ' + (i + 1) + ' 张');
      var im = d.createElement('img');
      im.src = it.src;
      im.alt = it.alt || c.name;
      im.loading = 'lazy';
      im.decoding = 'async';
      im.addEventListener('load', function () { im.classList.add('done'); });
      b.appendChild(im);
      b.addEventListener('click', function () { openBig(i); });
      grid.appendChild(b);
    });
    ov.classList.add('on');
    ov.setAttribute('aria-hidden', 'false');
    d.body.classList.add('gxlock');
    ov.querySelector('.gxlb__scroll').scrollTop = 0;
    closeBig();
  }

  function closeCat() {
    ov.classList.remove('on');
    ov.setAttribute('aria-hidden', 'true');
    d.body.classList.remove('gxlock');
    closeBig();
  }

  function openBig(i) {
    if (!cur) return;
    bi = (i + cur.items.length) % cur.items.length;
    bimg.src = cur.items[bi].src;
    bimg.alt = cur.items[bi].alt || '';
    bcount.textContent = (bi + 1) + ' / ' + cur.items.length;
    brs.classList.add('on');
  }

  function closeBig() {
    brs.classList.remove('on');
  }

  ov.querySelector('.gxlb__x').addEventListener('click', closeCat);
  ov.querySelector('.gxlb__bigx').addEventListener('click', closeBig);
  ov.querySelector('.gxlb__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); openBig(bi - 1); });
  ov.querySelector('.gxlb__nav--next').addEventListener('click', function (e) { e.stopPropagation(); openBig(bi + 1); });
  brs.addEventListener('click', function (e) {
    if (e.target === brs || e.target === bimg) closeBig();
  });

  d.addEventListener('keydown', function (e) {
    if (!ov.classList.contains('on')) return;
    if (e.key === 'Escape') { brs.classList.contains('on') ? closeBig() : closeCat(); }
    else if (brs.classList.contains('on') && e.key === 'ArrowLeft') openBig(bi - 1);
    else if (brs.classList.contains('on') && e.key === 'ArrowRight') openBig(bi + 1);
  });

  gx.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-open]');
    if (btn) openCat(btn.getAttribute('data-open'));
  });

  /* ---------- 拼图页 → 翻页 ---------- */
  var flipGrid = d.querySelector('.pageflip__grid');
  if (flipGrid && data.layout) {
    flipGrid.innerHTML = data.layout.items.map(function (it) {
      return '<span style="--r:' + it.ratio.toFixed(3) + '"><img src="' + it.src + '" alt="' + (it.alt || '横板拼图') + '" loading="lazy" decoding="async"></span>';
    }).join('');
  }

  var flip = d.getElementById('pageflip');
  var card = flip && flip.querySelector('.pageflip__card');
  if (flip && card) {
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.fromTo(card,
        { rotateX: 0, filter: 'brightness(1)' },
        {
          rotateX: -93, filter: 'brightness(.35)', ease: 'none',
          scrollTrigger: { trigger: flip, start: 'top top', end: 'bottom bottom', scrub: 0.5 }
        }
      );
    } else {
      var onScroll = function () {
        var r = flip.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, -r.top / Math.max(1, flip.offsetHeight - window.innerHeight)));
        card.style.transform = 'rotateX(' + (-93 * p) + 'deg)';
        card.style.filter = 'brightness(' + (1 - 0.65 * p) + ')';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }
})();
