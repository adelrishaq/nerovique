/* Nerovique site behaviour: checkout button state, mobile buy bar, sample lightbox.
   Every feature degrades to plain links when JavaScript is off. */
(() => {
  'use strict';
  const config = window.NEROVIQUE_CONFIG || { salesOpen: false, products: {} };

  // 1. Checkout buttons: <a data-checkout="product-id">
  document.querySelectorAll('[data-checkout]').forEach(el => {
    const product = config.products[el.dataset.checkout] || {};
    const url = (product.checkoutUrl || '').trim();
    const open = config.salesOpen === true && /^https:\/\//.test(url);
    const label = el.querySelector('[data-label]') || el;
    if (open) {
      el.href = url;
      el.removeAttribute('aria-disabled');
      label.textContent = product.openLabel || label.textContent;
    } else {
      el.setAttribute('aria-disabled', 'true');
      el.removeAttribute('href');
      el.setAttribute('role', 'link');
      el.tabIndex = 0;
      label.textContent = product.closedLabel || 'Checkout not open yet';
      const note = document.getElementById(el.getAttribute('aria-describedby') || '');
      if (note) note.hidden = false;
    }
  });

  // 2. Mobile buy bar: visible after the hero, hidden while the purchase panel is on screen.
  const bar = document.querySelector('.buybar');
  const hero = document.querySelector('[data-hero]');
  const buy = document.getElementById('buy');
  if (bar && hero && buy) {
    document.body.classList.add('has-buybar');
    const update = () => {
      const pastHero = hero.getBoundingClientRect().bottom < 0;
      const b = buy.getBoundingClientRect();
      const atBuy = b.top < innerHeight * .85 && b.bottom > 0;
      const show = pastHero && !atBuy;
      bar.classList.toggle('is-visible', show);
      bar.inert = !show;
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update, { passive: true });
    // First check after load, so it does not force an early layout while scripts run.
    if (document.readyState === 'complete') update(); else addEventListener('load', update, { once: true });
  }

  // 3. Sample page lightbox using the native <dialog> element.
  const dialog = document.getElementById('lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = dialog.querySelector('img');
    const caption = dialog.querySelector('p');
    let opener = null;
    document.querySelectorAll('[data-lightbox]').forEach(btn => {
      btn.addEventListener('click', () => {
        opener = btn;
        img.src = btn.dataset.lightbox;
        img.alt = btn.querySelector('img').alt;
        caption.textContent = btn.dataset.caption || '';
        dialog.showModal();
      });
    });
    dialog.querySelector('.close').addEventListener('click', () => dialog.close());    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { img.removeAttribute('src'); if (opener) opener.focus(); });
  } else {
    // No dialog support: let the buttons open the image directly.
    document.querySelectorAll('[data-lightbox]').forEach(btn => {
      btn.addEventListener('click', () => { location.href = btn.dataset.lightbox; });
    });
  }
})();
