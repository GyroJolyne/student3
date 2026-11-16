/* ============================================================
   v7：图集 —— 复刻 omnerat 作品集网格（2 列 / 9:16 三图扇形）
   每张分类卡只取最接近 9:16 的 3 张图（1 主 + 2 侧）
   ============================================================ */
(function () {
  'use strict';
  var d = document;
  var DATA = window.WORKS || [];
  var mount = d.getElementById('catgrid');
  if (!mount || !DATA.length) return;

  var TARGET = 9 / 16;            // 9:16 = 0.5625
  var MAIN = [                    // 前三类主图（用户指定）
    'assets/img/pf-main-1.jpg',
    'assets/img/pf-main-2.jpg',
    'assets/img/pf-main-3.jpg'
  ];
  // 主图与分类里某张是同一张画（感知哈希距离 0），这两张不能同时出现
  var BAN = [
    ['w1-03.jpg'],
    ['w2-04.jpg'],
    ['w3-10.jpg']
  ];
  var frag = d.createDocumentFragment();

  function pickN(items, n) {
    var scored = items.map(function (it, i) {
      var r = (it.w && it.h) ? it.w / it.h : 1;
      return { it: it, i: i, d: Math.abs(r - TARGET) };
    });
    scored.sort(function (a, b) { return (a.d - b.d) || (a.i - b.i); });
    var pick = scored.slice(0, n).map(function (o) { return o.it; });
    var k = 0;
    while (pick.length < n) { pick.push(items[k++ % items.length]); }
    return pick;
  }

  DATA.forEach(function (cat, ci) {
    var items = cat.items || [];
    if (!items.length) return;

    var skip = BAN[ci] || [];
    var pool = items.filter(function (it) {
      var base = it.s.split('/').pop();
      return skip.indexOf(base) < 0;
    });
    if (!pool.length) pool = items;

    var pick = pickN(pool, 3);
    var m, l1, r1;
    if (MAIN[ci]) {
      // 主图用指定图；左右两张从“不含主图同款”的池子里按 9:16 最接近挑
      m = { s: MAIN[ci] };
      l1 = pick[0]; r1 = pick[1];
    } else {
      m = pick[0]; l1 = pick[1]; r1 = pick[2];
    }

    var img = function (it, alt) {
      return '<img src="' + it.s + '" alt="' + (alt || '') + '" loading="lazy" decoding="async">';
    };

    var card = d.createElement('article');
    card.className = 'pf__card';
    card.innerHTML =
      '<a class="pf__link" href="#" aria-label="' + cat.name + '：' + items.length + ' 张">' +
        '<div class="pf__head">' +
          '<h3 class="pf__name">' + cat.name + '</h3>' +
          '<span class="pf__sub">' + items.length + ' 张<em>' + cat.en + '</em></span>' +
        '</div>' +
        '<div class="pf__ph">' +
          '<div class="pf__im pf__im--l1">' + img(l1) + '</div>' +
          '<div class="pf__im pf__im--r1">' + img(r1) + '</div>' +
          '<div class="pf__im pf__im--m">' + img(m, cat.name) + '</div>' +
          '<span class="pf__arrow" aria-hidden="true">↗</span>' +
        '</div>' +
      '</a>';

    card.querySelector('.pf__link').addEventListener('click', function (e) {
      e.preventDefault();
      if (window.__openCat) window.__openCat(ci, 0);
    });

    frag.appendChild(card);
  });

  mount.appendChild(frag);
})();