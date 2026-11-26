(() => {
  'use strict';
  const key = 'nerovique_advertising_consent_v1';
  const previousKey = 'nerovique.marketing.v1';
  const panel = document.querySelector('#cookie-choices');
  const settings = document.querySelector('#cookie-settings');
  const status = panel.querySelector('[role="status"]');
  const id = window.neroviquePixelId;
  const configured = /^\d{10,20}$/.test(id) && location.protocol === 'https:';
  let active = false;
  let script;

  function savedChoice() {
    try {
      if (localStorage.getItem(previousKey) === 'deny') return 'deny';
      const value = localStorage.getItem(key);
      if (value === 'accepted') return 'allow';
      if (value === 'rejected') return 'deny';
      return null;
    }
    catch { return null; }
  }

  function enable() {
    if (active || !configured || savedChoice() !== 'allow') return;
    active = true;
    function fbq(...args) {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
      else fbq.queue.push(args);
    }
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = window._fbq = fbq;
    fbq('consent', 'grant');
    fbq('set', 'autoConfig', false, id);
    fbq('init', id);
    fbq('track', 'PageView');
    script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.append(script);
  }

  function show() {
    panel.hidden = false;
    const current = savedChoice();
    status.textContent = current === 'allow' ? 'Current choice: allow optional marketing.' :
      current === 'deny' ? 'Current choice: decline optional marketing.' : 'Choose whether to allow optional marketing.';
    settings.setAttribute('aria-expanded', 'true');
  }

  function remember(value) {
    try {
      localStorage.setItem(key, value === 'allow' ? 'accepted' : 'rejected');
      localStorage.removeItem(previousKey);
    }
    catch {
      if (active && value === 'deny') window.fbq('consent', 'revoke');
      status.textContent = 'This browser could not save your choice. To reset a previous choice, clear this site’s stored data.';
      return;
    }
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    settings.focus();
    if (value === 'allow') enable();
    else if (active) {
      window.fbq('consent', 'revoke');
      script.remove();
      location.reload();
    }
  }

  settings.addEventListener('click', () => {
    show();
    panel.querySelector('button').focus();
  });
  panel.querySelector('[data-choice="allow"]').addEventListener('click', () => remember('allow'));
  panel.querySelector('[data-choice="deny"]').addEventListener('click', () => remember('deny'));
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== previousKey && event.key !== null) return;
    if (active && savedChoice() !== 'allow') {
      window.fbq('consent', 'revoke');
      location.reload();
    } else if (savedChoice() === 'allow') enable();
  });
  if (savedChoice() === 'allow') enable();
  else if (!savedChoice()) show();
})();
