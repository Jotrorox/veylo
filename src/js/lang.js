// Language switch for the legal pages: both languages are in the page,
// this shows one and swaps the labels that carry data-en / data-de.
(() => {
  const KEY = 'veylo.legal.lang';
  const langs = ['en', 'de'];

  function initial() {
    const q = new URLSearchParams(location.search).get('lang');
    if (langs.includes(q)) return q;
    try { const s = localStorage.getItem(KEY); if (langs.includes(s)) return s; } catch (e) { }
    return /^de\b/i.test(navigator.language || '') ? 'de' : 'en';
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach(el => { el.hidden = el.dataset.lang !== lang; });
    document.querySelectorAll('[data-set-lang]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.setLang === lang));
    });
    document.querySelector('.lang-switch').setAttribute('aria-label', lang === 'de' ? 'Sprache' : 'Language');
    document.querySelectorAll('[data-en]').forEach(el => {
      const t = el.dataset[lang];
      if (el.tagName === 'META') el.content = t;
      else if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', t);
      else el.textContent = t;
    });
  }

  document.querySelectorAll('[data-set-lang]').forEach(b => {
    b.addEventListener('click', () => {
      apply(b.dataset.setLang);
      try { localStorage.setItem(KEY, b.dataset.setLang); } catch (e) { }
    });
  });

  apply(initial());
})();
