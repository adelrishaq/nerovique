/* Nerovique v2 · motion and small interactions (2026-11-17). No libraries.
   Works with the inline head script that adds html.motion. Remove this file and
   nerovique-v2.css to roll back. Everything degrades to a static, readable page. */
(() => {
  'use strict';
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('motion-ready');

  // 1. Header firms up after the first scroll (no height change, so no layout shift).
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    if (document.readyState === 'complete') onScroll(); else addEventListener('load', onScroll, { once: true });
  }

  // 2. Scroll reveal. Groups stagger their children through the --i custom property.
  document.querySelectorAll('[data-reveal-group]').forEach(group => {
    [...group.children].forEach((child, i) => { child.setAttribute('data-reveal', ''); child.style.setProperty('--i', Math.min(i, 6)); });
  });
  const revealables = [...document.querySelectorAll('[data-reveal]')];
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(el => io.observe(el));
    // Safety net: if an observer callback is ever skipped (frames, background tabs), a light
    // scroll check reveals whatever has reached the viewport, then switches itself off.
    // Scroll events already arrive at most once per frame, so the handlers below run directly.
    let pending = revealables.slice();
    const sweep = () => {
      pending = pending.filter(el => {
        if (el.classList.contains('is-in')) return false;
        if (el.getBoundingClientRect().top < innerHeight * 0.95) { el.classList.add('is-in'); return false; }
        return true;
      });
      if (!pending.length) removeEventListener('scroll', sweep);
    };
    addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 400);
    // Anything reached by keyboard focus or an anchor jump shows at once.
    document.addEventListener('focusin', e => { const r = e.target.closest('[data-reveal]'); if (r) r.classList.add('is-in'); });
  } else {
    revealables.forEach(el => el.classList.add('is-in'));
  }

  // 3. Product story: the step crossing the middle of the screen drives the sticky stage.
  const stage = document.querySelector('.story-stage');
  const steps = [...document.querySelectorAll('.story-step')];
  if (steps.length) {
    const setActive = n => {
      if (stage) stage.dataset.active = n;
      steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === String(n)));
    };
    // A scroll check (three rects per frame) is cheaper to reason about than observer margins,
    // and behaves the same inside frames and background tabs.
    let current = null;
    const pick = () => {
      const mid = innerHeight * 0.5;
      let best = steps[0];
      for (const s of steps) { if (s.getBoundingClientRect().top <= mid) best = s; }
      if (best.dataset.step !== current) { current = best.dataset.step; setActive(current); }
    };
    addEventListener('scroll', pick, { passive: true });
    addEventListener('resize', pick, { passive: true });
    steps.forEach(s => s.addEventListener('focusin', () => { current = s.dataset.step; setActive(current); }));
    if (document.readyState === 'complete') pick(); else addEventListener('load', pick, { once: true });
  }

  // 4. Cover parallax fallback for browsers without scroll-driven animations (e.g. Safari, Firefox).
  const cover = document.querySelector('.book-stage img');
  if (cover && motion && !reduce && !CSS.supports('animation-timeline: scroll()')) {
    root.classList.add('no-sda');
    const max = 36, range = innerHeight * 0.9;
    const update = () => {
      if (scrollY > range * 1.2) return;
      const y = Math.min(Math.max(scrollY / range, 0), 1);
      cover.style.setProperty('--drift', (-max * y).toFixed(1) + 'px');
    };
    addEventListener('scroll', update, { passive: true });
  }

  // 5. Sample pages fade in once decoded, over a calm placeholder.
  //    Fails open: an image is hidden only while it is known to be loading, and a re-check after
  //    page load plus a 4 s safety timeout always clear that state.
  const samples = [...document.querySelectorAll('.sample img')];
  samples.forEach(img => {
    if (img.complete) return;
    img.classList.add('is-loading');
    const done = () => img.classList.remove('is-loading');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
  const settle = () => samples.forEach(img => { if (img.complete) img.classList.remove('is-loading'); });
  addEventListener('load', settle, { once: true });
  setTimeout(() => samples.forEach(img => img.classList.remove('is-loading')), 4000);

  // 6. Current-section highlight for in-page navigation (product nav and policy contents).
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"], .toc a[href^="#"]')];
  const targets = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (targets.length) {
    const mark = () => {
      const line = innerHeight * 0.4;
      let id = null;
      for (const t of targets) { const r = t.getBoundingClientRect(); if (r.top <= line && r.bottom > line) id = '#' + t.id; }
      navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === id));
    };
    addEventListener('scroll', mark, { passive: true });
    if (document.readyState === 'complete') mark(); else addEventListener('load', mark, { once: true });
  }

  // 7. Library filter: shown only when the shelf holds two or more subjects.
  const shelf = document.querySelector('.shelf');
  const filter = document.querySelector('.shelf-filter');
  if (shelf && filter) {
    const cards = [...shelf.querySelectorAll('.card[data-category]')];
    const subjects = [...new Set(cards.map(c => c.dataset.category))];
    if (subjects.length >= 2) {
      const make = (label, value) => {
        const li = document.createElement('li'); const b = document.createElement('button');
        b.type = 'button'; b.textContent = label; b.dataset.value = value; b.setAttribute('aria-pressed', value === 'all');
        li.append(b); filter.append(li); return b;
      };
      const buttons = [make('All', 'all'), ...subjects.map(s => make(s, s))];
      buttons.forEach(b => b.addEventListener('click', () => {
        buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
        cards.forEach(c => { c.hidden = b.dataset.value !== 'all' && c.dataset.category !== b.dataset.value; });
      }));
      filter.hidden = false;
    }
  }
})();
