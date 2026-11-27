/* Nerovique · interactions v3 (2026-11-27). No libraries.
   Works with the inline head script that adds html.motion. Every effect is optional:
   without JavaScript, or with reduced motion, the page is complete and static. */
(() => {
  'use strict';
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('motion-ready');
  const onScroll = (fn) => { addEventListener('scroll', fn, { passive: true }); addEventListener('resize', fn, { passive: true }); };
  const ready = (fn) => { if (document.readyState === 'complete') fn(); else addEventListener('load', fn, { once: true }); };

  // 1. Header state + reading progress, batched into one frame.
  const header = document.querySelector('.site-header');
  const bar = document.querySelector('.progress');
  let ticking = false;
  const frame = () => {
    ticking = false;
    if (header) header.classList.toggle('is-scrolled', scrollY > 8);
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(scrollY / max, 1).toFixed(4) : 0);
    }
  };
  onScroll(() => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
  ready(frame);

  // 2. Word-by-word headline entrance (text stays in the DOM in reading order).
  if (motion) {
    document.querySelectorAll('[data-split]').forEach(el => {
      let n = 0;
      const walk = node => {
        [...node.childNodes].forEach(child => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.append(part); return; }
              const s = document.createElement('span');
              s.className = 'w'; s.style.setProperty('--w', n++); s.textContent = part;
              frag.append(s);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === 1) walk(child);
        });
      };
      walk(el);
      el.classList.add('split');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    });
  }

  // 3. Scroll reveal. Groups stagger their children through --i.
  document.querySelectorAll('[data-reveal-group]').forEach(group => {
    [...group.children].forEach((child, i) => { child.setAttribute('data-reveal', ''); child.style.setProperty('--i', Math.min(i, 6)); });
  });
  const revealables = [...document.querySelectorAll('[data-reveal]')];
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    revealables.forEach(el => io.observe(el));
    // Safety net: anything that has reached the viewport is shown even if a callback is skipped.
    let pending = revealables.slice();
    const sweep = () => {
      pending = pending.filter(el => {
        if (el.classList.contains('is-in')) return false;
        if (el.getBoundingClientRect().top < innerHeight * 0.98) { el.classList.add('is-in'); return false; }
        return true;
      });
      if (!pending.length) removeEventListener('scroll', sweep);
    };
    addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 500);
    document.addEventListener('focusin', e => { const r = e.target.closest('[data-reveal]'); if (r) r.classList.add('is-in'); });
    addEventListener('hashchange', () => revealables.forEach(el => el.classList.add('is-in')));
  } else {
    revealables.forEach(el => el.classList.add('is-in'));
  }

  // 4. 3D book: follows the pointer on desktop, turns gently with scroll everywhere.
  document.querySelectorAll('.book3d').forEach(wrap => {
    const book = wrap.querySelector('.book');
    if (!book || reduce || !motion) return;
    const area = wrap.closest('[data-tilt-area]') || wrap;
    let px = 0, py = 0, sy = 0;
    const apply = () => {
      book.style.setProperty('--ry', (px * 16 + sy * 14).toFixed(2) + 'deg');
      book.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');
      book.style.setProperty('--gx', (30 + px * 40).toFixed(1) + '%');
      book.style.setProperty('--gy', (20 + py * 30).toFixed(1) + '%');
      wrap.style.setProperty('--floor', (1 - Math.abs(px) * .08).toFixed(3));
    };
    if (finePointer) {
      area.addEventListener('pointermove', e => {
        const r = wrap.getBoundingClientRect();
        px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.2)));
        py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.2)));
        book.classList.add('is-tracking'); apply();
      });
      area.addEventListener('pointerleave', () => { px = py = 0; book.classList.remove('is-tracking'); apply(); });
    }
    const scrollTurn = () => {
      const r = wrap.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1 … 1 around the centre
      sy = Math.max(-1, Math.min(1, t)) * -0.6;
      apply();
    };
    onScroll(scrollTurn); ready(scrollTurn);
  });

  // 5. Pointer spotlight on cards, buttons and the story stage.
  if (finePointer && !reduce) {
    document.querySelectorAll('.card, .btn, .story-stage').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  // 6. Product story: the step crossing the middle of the screen drives the sticky stage.
  const stage = document.querySelector('.story-stage');
  document.querySelectorAll('.tiles, .skills').forEach(list => [...list.children].forEach((c, k) => c.style.setProperty('--k', k)));
  const steps = [...document.querySelectorAll('.story-step')];
  if (steps.length) {
    let current = null;
    const setActive = n => {
      if (stage) stage.dataset.active = n;
      steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === String(n)));
    };
    const pick = () => {
      const mid = innerHeight * 0.55;
      let best = steps[0];
      for (const s of steps) { if (s.getBoundingClientRect().top <= mid) best = s; }
      if (best.dataset.step !== current) { current = best.dataset.step; setActive(current); }
    };
    onScroll(pick);
    steps.forEach(s => s.addEventListener('focusin', () => { current = s.dataset.step; setActive(current); }));
    ready(pick);
  }

  // 7. Break-even explorer (chapter six example). Fictional numbers, plain arithmetic.
  const calc = document.querySelector('[data-calc]');
  if (calc) {
    const $ = s => calc.querySelector(s);
    const a = $('#calc-a'), b = $('#calc-b'), n = $('#calc-n');
    const money = v => '$' + Math.round(v).toLocaleString('en-US');
    const fill = el => el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
    const update = () => {
      const A = +a.value, B = +b.value, N = +n.value, target = N * A;
      $('#out-a').textContent = money(A);
      $('#out-b').textContent = money(B);
      $('#out-n').textContent = N.toLocaleString('en-US');
      [a, b, n].forEach(fill);
      const max = Math.max(target, N * B);
      $('[data-bar="a"]').style.setProperty('--v', (target / max).toFixed(3));
      $('[data-bar="b"]').style.setProperty('--v', (N * B / max).toFixed(3));
      $('[data-label="a"]').textContent = N.toLocaleString('en-US') + ' × ' + money(A);
      $('[data-label="b"]').textContent = N.toLocaleString('en-US') + ' × ' + money(B);
      const out = $('[data-answer]');
      if (B >= A) {
        out.innerHTML = 'At <b>' + money(B) + '</b> per order, the new offer leaves as much or more, so <b>' + N.toLocaleString('en-US') + '</b> orders already cover <b>' + money(target) + '</b>.';
      } else {
        const need = Math.ceil(target / B - 1e-9);
        const extra = need - N;
        out.innerHTML = 'To match <b>' + money(target) + '</b> at ' + money(B) + ' per order you need <b>' + need.toLocaleString('en-US') + '</b> orders: <b>' + extra.toLocaleString('en-US') + '</b> more, or +' + (extra / N * 100).toFixed(1).replace(/\.0$/, '') + '%.';
      }
    };
    [a, b, n].forEach(el => el.addEventListener('input', update));
    calc.querySelector('[data-reset]').addEventListener('click', () => { a.value = 24; b.value = 21; n.value = 100; update(); });
    update();
  }

  // 8. Buy card: slow light sweep around the border.
  const buyCard = document.querySelector('.buy-card');
  if (buyCard && motion && !reduce) {
    let ang = 0, running = false, raf;
    const spin = () => { ang = (ang + .35) % 360; buyCard.style.setProperty('--angle', ang + 'deg'); raf = requestAnimationFrame(spin); };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; spin(); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(buyCard);
  }

  // 9. Sample pages fade in once decoded. Fails open after load or 4 s.
  const samples = [...document.querySelectorAll('.sample img')];
  samples.forEach(img => {
    if (img.complete) return;
    img.classList.add('is-loading');
    const done = () => img.classList.remove('is-loading');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
  addEventListener('load', () => samples.forEach(img => { if (img.complete) img.classList.remove('is-loading'); }), { once: true });
  setTimeout(() => samples.forEach(img => img.classList.remove('is-loading')), 4000);

  // 10. Current-section highlight for in-page navigation (product nav and policy contents).
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"], .toc a[href^="#"]')];
  const targets = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (targets.length) {
    const mark = () => {
      const line = innerHeight * 0.35;
      let id = null;
      for (const t of targets) { const r = t.getBoundingClientRect(); if (r.top <= line && r.bottom > line) id = '#' + t.id; }
      navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === id));
    };
    onScroll(mark); ready(mark);
  }

  // 11. Library filter: shown only when the shelf holds two or more subjects.
  const shelf = document.querySelector('.shelf');
  const filter = document.querySelector('.shelf-filter');
  if (shelf && filter) {
    const cards = [...shelf.querySelectorAll('.card[data-category]')];
    const subjects = [...new Set(cards.map(c => c.dataset.category))];
    if (subjects.length >= 2) {
      const make = (label, value) => {
        const li = document.createElement('li'); const btn = document.createElement('button');
        btn.type = 'button'; btn.textContent = label; btn.dataset.value = value; btn.setAttribute('aria-pressed', value === 'all');
        li.append(btn); filter.append(li); return btn;
      };
      const buttons = [make('All', 'all'), ...subjects.map(s => make(s, s))];
      buttons.forEach(btn => btn.addEventListener('click', () => {
        buttons.forEach(x => x.setAttribute('aria-pressed', x === btn));
        cards.forEach(c => { c.hidden = btn.dataset.value !== 'all' && c.dataset.category !== btn.dataset.value; });
      }));
      filter.hidden = false;
    }
  }
})();
