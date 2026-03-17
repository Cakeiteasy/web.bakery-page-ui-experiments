/**
 * Shared document builder for published Build-with-AI pages.
 * Used by both the Angular editor (srcdoc for first load) and the
 * Vercel page-renderer API (returns full HTML for slug-based routes).
 *
 * This file must not import any Angular-specific modules.
 */

export interface BwaiFiles {
  html: string;
  css: string;
  js: string;
}

export interface BwaiSeoMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
}

// ---------------------------------------------------------------------------
// Static shell — replicated from build-with-ai.constants.ts to avoid Angular
// imports in the Node.js / Vercel serverless context.
// ---------------------------------------------------------------------------

const STATIC_SHELL_CSS = `
:root {
  --cie-primary-bg: #ffffff;
  --cie-secondary-bg: #f9f9f9;
  --cie-section-bg: #f7f3f0;
  --cie-text: #333333;
  --cie-muted: #858585;
  --cie-muted-2: #6d7278;
  --cie-accent: #ff3399;
  --cie-accent-soft: #ffc2e0;
  --cie-border: #ebebeb;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  font-family: 'Lato', 'Segoe UI', sans-serif;
  color: var(--cie-text);
  background: var(--cie-primary-bg);
}

a { color: inherit; text-decoration: none; }
ul { list-style: none; margin: 0; padding: 0; }

#PageHeader {
  width: min(1400px, 93vw);
  margin: 0 auto;
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header__info-container { display: flex; align-items: center; gap: 1rem; }
.logo { width: 155px; }
.header__benefits { display: flex; gap: 1rem; color: var(--cie-muted); font-size: 0.75rem; }
.header__benefits-item { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; }
.header__benefits-pic { width: 16px; height: 16px; }
.header__navbar-wrap { display: flex; align-items: center; gap: 0.75rem; }
.header__navbar { display: flex; align-items: center; gap: 0.75rem; }
.header__drop-down { position: relative; }
.header__drop-down-toggle { border: 0; background: transparent; font: inherit; color: var(--cie-text); cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; }
.header__drop-down-img { width: 11px; opacity: 0.8; }
.dd-list { opacity: 0; pointer-events: none; position: absolute; top: calc(100% + 8px); left: 0; min-width: 220px; border: 1px solid #ccc; border-radius: 8px; background: #fff; transform: translateY(-4px); transition: opacity 0.2s ease, transform 0.2s ease; z-index: 20; }
.header__drop-down:hover .dd-list, .header__drop-down:focus-within .dd-list { opacity: 1; pointer-events: auto; transform: translateY(0); }
.dd-list__list-item { display: block; padding: 0.55rem 0.75rem; font-size: 0.92rem; }
.dd-list__list-item:hover { background: #f5f5f5; }
.header__navbar-button { border: 1px solid var(--cie-accent); color: var(--cie-accent); padding: 0.35rem 0.8rem; border-radius: 6px; transition: background 0.15s ease; }
.header__navbar-button:hover { background: var(--cie-accent-soft); }
.header__navbar-hamburger { display: none; width: 24px; cursor: pointer; }
.mobile-menu { display: none; position: fixed; inset: 0; background: var(--cie-primary-bg); z-index: 100; padding: 1.25rem; }
.mobile-menu.active { display: block; }
.mobile-menu__close-bttn-container { display: flex; justify-content: flex-end; }
.mobile-menu__close-bttn { width: 16px; cursor: pointer; }
.mobile-menu__items-list { margin-top: 1rem; font-size: 1.25rem; }
.mobile-menu__list-item { border-top: 1px solid var(--cie-border); padding: 1rem 0; }
.mobile-menu__item-drop-down { display: none; padding-left: 1rem; }
.mobile-menu__item-drop-down.active { display: block; }
#EditableContentRoot { margin: 0 auto; min-height: 320px; }
#PageFooter { margin-top: 2rem; background: var(--cie-secondary-bg); }
.footer__wrapper { width: min(1030px, 90vw); margin: 0 auto; padding: 2.75rem 0 2.25rem; }
.footer__main-container { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5rem; }
.footer__contacts .logo { width: 122px; }
.footer__social { display: flex; gap: 0.6rem; margin-top: 0.5rem; }
.footer__countries { margin-top: 1rem; }
.footer__countries-title, .footer__nav-list-item, .footer__copyright-text { color: var(--cie-muted); }
.footer__country { margin-top: 0.4rem; display: inline-flex; align-items: center; gap: 0.45rem; }
.footer__nav-title { margin: 0; font-size: 1rem; }
.footer__nav-list { margin-top: 0.6rem; }
.footer__nav-list-item { line-height: 1.9; }
.footer__nav-list-item-text:hover { text-decoration: underline; }
.footer__info-container { margin-top: 2.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.footer__payments { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.payments__item { width: 84px; }

:root {
  --font-xs: 400 0.75rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --font-s: 400 0.875rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --font-m: 400 1.125rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --font-ml: 700 1.25rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --button-border-width: 1rem;
}
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
#PageHeader { max-width: 1400px; width: 93%; min-height: 48px; padding: 1.2rem 0; border-bottom: 1px solid var(--cie-border); gap: 1.25rem; }
.header__info-container { justify-content: flex-start; padding: 0 0 0 10px; }
.header__benefits { padding: 0 0 0 38px; gap: 0; }
.header__benefits-item { gap: 0.15rem; }
.header__benefits-pic { width: 15px; height: 15px; }
.header__benefits-text { font: var(--font-xs); letter-spacing: 0.01rem; color: var(--cie-text); padding: 0 24px 0 3px; white-space: nowrap; }
.header__navbar-wrap { margin-left: auto; }
.header__navbar { position: relative; padding-top: 3px; gap: 0; }
.header__navbar-item { width: auto; padding: 0 10px; cursor: pointer; align-self: center; font: var(--font-m); font-size: calc(1rem / 1.06); text-align: center; white-space: nowrap; }
.header__drop-down-toggle { color: var(--cie-text); transition: color 0.15s ease-in-out; font-size: inherit; }
.header__drop-down-toggle:hover { color: var(--cie-muted); }
.header__drop-down { padding: 11px 0; }
.dd-list { top: 45px; border: 1px solid #ccc; border-radius: 6px; min-width: 180px; }
.dd-list__list-item { padding: 8px 15px; width: 100%; text-align: left; }
.header__navbar-button { padding: calc(var(--button-border-width) * 0.375) calc(var(--button-border-width) * 1.5); color: var(--cie-accent); border: 2px solid var(--cie-accent); border-radius: 5px; font-weight: 700; transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out; }
.header__navbar-button:hover { color: var(--cie-accent); background-color: var(--cie-accent-soft); }
.header__navbar-hamburger { margin: 0 5px 0 auto; }
#PageFooter { margin-top: 2.25rem; background-color: var(--cie-secondary-bg); }
.footer__wrapper { width: min(1030px, 90%); padding: 3.7% 0 0; }
.footer__main-container { grid-template-columns: 1.1fr repeat(3, minmax(0, 1fr)); gap: 1.5rem 2.3rem; }
.footer__contacts { padding: 0 15px; }
.footer__contacts .logo { width: 122px; }
.footer__social { padding: 6px 0 0; gap: 9px; }
.footer__social-item img { width: 30px; height: 30px; }
.footer__countries { margin: 22px 0 0; }
.footer__countries-title { color: var(--cie-muted); font: var(--font-xs); }
.footer__country { margin: 6px 0; display: inline-flex; align-items: center; white-space: nowrap; line-height: 1; }
.footer__country-name { margin: 0 7px 0 0; font: var(--font-s); color: var(--cie-text); }
.footer__country-img { width: 18px; height: 18px; }
.footer__nav-menu-column { padding: 0 15px; }
.footer__nav-title { margin: 0; font: var(--font-ml); font-size: 1.85rem; line-height: 1.05; color: var(--cie-text); }
.footer__nav-list { padding: 10px 0 0; }
.footer__nav-list-item { font: var(--font-s); line-height: 2.14; color: var(--cie-muted); white-space: nowrap; }
.footer__info-container { margin-top: 0; padding: 70px 0 51px; align-items: center; }
.footer__payments { margin: 0; padding: 0; gap: 0; }
.payments__item { width: auto; max-width: 100px; margin: 0 20px 0 0; }
.footer__copyright { margin-left: auto; }
.footer__copyright-text { display: block; margin: 8px 0 0 auto; font: var(--font-s); letter-spacing: 0.03rem; white-space: nowrap; color: var(--cie-text); }

@media (max-width: 1280px) { .header__benefits { padding-left: 24px; } }
@media (max-width: 1200px) { #PageHeader { width: 95%; padding: 1rem 0; } .header__benefits { display: none; } .header__navbar { display: none; } .header__navbar-hamburger { display: block; } }
@media (max-width: 992px) { .footer__main-container { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.75rem 1.2rem; } .footer__info-container { padding: 40px 0 24px; justify-content: center; } .footer__payments { justify-content: center; } .payments__item { margin: 0; padding: 0 16px 16px; } .footer__copyright { margin: 14px auto 0; } .footer__copyright-text { margin: 0 auto; } }
@media (max-width: 768px) { .footer__contacts, .footer__nav-menu-column { text-align: center; padding: 0; } .footer__contacts .logo { margin: 0 auto; } .footer__social { justify-content: center; } .footer__country { margin: 6px auto; } }
@media (max-width: 576px) { #PageHeader { width: 97%; } .logo { width: 110px; } .header__navbar-hamburger { margin: 0 0 0 auto; } .footer__main-container { grid-template-columns: 1fr; gap: 1.25rem; } .footer__wrapper { padding-top: 24px; } .footer__nav-title { font-size: 1.55rem; } }
`;

const HEADER_HTML = `<header id="PageHeader" class="header container d-flex flex-row justify-content-between">
  <div class="header__info-container col-xl-8 col-md-11 d-flex flex-row align-items-center">
    <a href="/" target="_self">
      <img class="logo-big logo col-3" src="https://mars-images.imgix.net/1651762334167?auto=compress&w=1200&fit=max&w=1500" alt="Logo image" />
    </a>
    <ul class="header__benefits d-flex flex-row justify-content-end">
      <li class="header__benefits-item"><img class="header__benefits-pic" src="https://cdn.marscloud.dev/assets/img/cie-article_header-icon.svg" alt="" /><span class="header__benefits-text">Bestill kaker fra lokale bakerier</span></li>
      <li class="header__benefits-item"><img class="header__benefits-pic" src="https://cdn.marscloud.dev/assets/img/cie-article_header-icon2.svg" alt="" /><span class="header__benefits-text">Samme pris - ingen ekstra kostnad</span></li>
      <li class="header__benefits-item"><img class="header__benefits-pic" src="https://cdn.marscloud.dev/assets/img/cie-article_header-icon3.svg" alt="" /><span class="header__benefits-text">200.000 fornøyde kunder</span></li>
    </ul>
  </div>
  <div class="header__navbar-wrap container">
    <ul class="header__navbar d-flex flex-row justify-content-end flex-nowrap row">
      <li class="header__navbar-item header__drop-down col-4">
        <button type="button" class="header__drop-down-toggle header__navbar-text">Informasjon<img src="https://mars-images.imgix.net/cie-article_header-icon-drop-down.svg?auto=compress&w=100" alt="" class="header__drop-down-img" /></button>
        <ul class="dd-list">
          <li class="dd-list__list"><a class="dd-list__list-item" href="info/om-oss">Om Cake it easy</a></li>
          <li class="dd-list__list"><a class="dd-list__list-item" href="https://www.cakeiteasy.no?popup=CONTACT_US">Kontakt oss</a></li>
        </ul>
      </li>
      <li class="header__navbar-item header__drop-down col-4">
        <button type="button" class="header__drop-down-toggle header__navbar-text">For bedrifter<img src="https://mars-images.imgix.net/cie-article_header-icon-drop-down.svg?auto=compress&w=100" alt="" class="header__drop-down-img" /></button>
        <ul class="dd-list">
          <li class="dd-list__list"><a class="dd-list__list-item" href="info/sende-kaker">Sende kaker til flere steder</a></li>
          <li class="dd-list__list"><a class="dd-list__list-item" href="info/innkjopsavtale">Innkjøpsavtale</a></li>
          <li class="dd-list__list"><a class="dd-list__list-item" href="https://www.cakeiteasy.no/gift-cards">Gavekort</a></li>
        </ul>
      </li>
      <li class="header__navbar-item col-8 ml-auto"><a class="header__navbar-button" href="/bedrift">Bestill her</a></li>
    </ul>
    <img class="header__navbar-hamburger" src="https://mars-images.imgix.net/cie-article_header-hamburger-icon.svg?auto=compress&w=25" alt="Menu" data-mobile-menu-open />
  </div>
  <div class="mobile-menu" id="buildWithAiMobileMenu">
    <div class="mobile-menu__close-bttn-container"><img src="https://mars-images.imgix.net/cie-article_close.png?auto=compress&w=1200" alt="Close" class="mobile-menu__close-bttn" data-mobile-menu-close /></div>
    <ul class="mobile-menu__items-list d-flex flex-column">
      <li class="mobile-menu__list-item mobile-menu__dd-item" data-mobile-dd-toggle="info"><button class="mobile-menu__dd-text">Informasjon</button></li>
      <ul class="mobile-menu__item-drop-down" data-mobile-dd="info">
        <li class="mobile-menu__list-item"><a class="mobile-menu__item-link" href="info/om-oss">Om Cake it easy</a></li>
        <li class="mobile-menu__list-item"><a class="mobile-menu__item-link" href="https://www.cakeiteasy.no?popup=CONTACT_US">Kontakt oss</a></li>
      </ul>
      <li class="mobile-menu__list-item mobile-menu__dd-item" data-mobile-dd-toggle="business"><button class="mobile-menu__dd-text">For bedrifter</button></li>
      <ul class="mobile-menu__item-drop-down" data-mobile-dd="business">
        <li class="mobile-menu__list-item"><a class="mobile-menu__item-link" href="info/sende-kaker">Sende kaker til flere steder</a></li>
        <li class="mobile-menu__list-item"><a class="mobile-menu__item-link" href="info/innkjopsavtale">Innkjøpsavtale</a></li>
        <li class="mobile-menu__list-item"><a class="mobile-menu__item-link" href="https://www.cakeiteasy.no/gift-cards">Gavekort</a></li>
      </ul>
      <li class="mobile-menu__list-item"><a class="mobile-menu__item-link" href="/bedrift">Bestill her</a></li>
    </ul>
  </div>
</header>`;

const FOOTER_HTML = `<footer id="PageFooter" class="footer">
  <div class="footer__wrapper container">
    <div class="row footer__main-container d-flex flex-wrap flex-md-row justify-content-md-between">
      <div class="footer__contacts col-sm-6 col-md-3 d-flex flex-column">
        <img class="logo-big logo" src="https://mars-images.imgix.net/1651762334167?auto=compress&w=1200&fit=max&w=1500" alt="Logo image" />
        <ul class="footer__social d-flex justify-content-md-start justify-content-center">
          <li class="footer__social-item"><a href="https://www.instagram.com/cakeiteasy.no/"><img src="https://mars-images.imgix.net/cie-article_instagram-icon.svg?auto=compress&w=30" title="Instagram" alt="Instagram" /></a></li>
          <li class="footer__social-item"><a href="https://www.facebook.com/cakeiteasy.no"><img src="https://mars-images.imgix.net/cie-article_facebook-icon.svg?auto=compress&w=30" title="Facebook" alt="Facebook" /></a></li>
        </ul>
        <div class="footer__countries column">
          <span class="footer__countries-title">Tilgjengelig i</span>
          <a class="footer__country" href="https://www.cakeiteasy.no/"><span class="footer__country-name">Norge</span><img src="https://mars-images.imgix.net/cie-article_footer-norway.svg?auto=compress&w=30" alt="Norge" class="footer__country-img" /></a>
          <a class="footer__country" href="https://www.cakeiteasy.se/"><span class="footer__country-name">Sverige</span><img src="https://mars-images.imgix.net/cie-article_footer-sweden.svg?auto=compress&w=30" alt="Sverige" class="footer__country-img" /></a>
        </div>
      </div>
      <div class="footer__nav-menu-column d-flex col-sm-6 col-md-3 d-flex flex-column">
        <h6 class="footer__nav-title">Kundeservice</h6>
        <ul class="footer__nav-list">
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/gavekort" class="footer__nav-list-item-text">Gavekort</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no?popup=FAQ" class="footer__nav-list-item-text">Vanlige spørsmål</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/info/brukerbetingelser" class="footer__nav-list-item-text">Brukerbetingelser</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/info/personvern" class="footer__nav-list-item-text">Personvern</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no?popup=CONTACT_US" class="footer__nav-list-item-text">Kontakt oss</a></li>
        </ul>
      </div>
      <div class="footer__nav-menu-column d-flex col-sm-6 col-md-3 d-flex flex-column">
        <h6 class="footer__nav-title">Informasjon</h6>
        <ul class="footer__nav-list">
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no?popup=HOW_IT_WORKS" class="footer__nav-list-item-text">Hvordan fungerer det</a></li>
          <li class="footer__nav-list-item"><a href="info/om-oss" class="footer__nav-list-item-text">Om Cake it easy</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/info/innkjopsavtale" class="footer__nav-list-item-text">For bedrifter</a></li>
          <li class="footer__nav-list-item"><a href="info/sende-kaker" class="footer__nav-list-item-text">Sende kake til flere steder</a></li>
          <li class="footer__nav-list-item"><a href="https://bakeri.cakeiteasy.no" class="footer__nav-list-item-text">Nettbutikk for bakerier</a></li>
        </ul>
      </div>
      <div class="footer__nav-menu-column d-flex col-sm-6 col-md-3 d-flex flex-column">
        <h6 class="footer__nav-title">Inspirasjon</h6>
        <ul class="footer__nav-list">
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/bursdagskake" class="footer__nav-list-item-text">Bursdagskake</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/kake-med-bilde" class="footer__nav-list-item-text">Kake med logo</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/konfirmasjonskake" class="footer__nav-list-item-text">Konfirmasjonskake</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/daapskake" class="footer__nav-list-item-text">Dåpskake</a></li>
          <li class="footer__nav-list-item"><a href="https://www.cakeiteasy.no/glutenfri-kake" class="footer__nav-list-item-text">Glutenfri kake</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__info-container container justify-content-between">
      <div class="footer__payments col-xl-8 d-flex flex-row flex-wrap justify-content-center justify-content-lg-start flex-sm-nowrap">
        <img src="https://mars-images.imgix.net/cie-article_ftr-pay-mastercard.svg?auto=compress&w=100" alt="Mastercard" class="payments__item" />
        <img src="https://mars-images.imgix.net/cie-article_ftr-pay-visa.svg?auto=compress&w=100" alt="Visa" class="payments__item" />
        <img src="https://mars-images.imgix.net/cie-article_ftr-pay-klarna.svg?auto=compress&w=100" alt="Klarna" class="payments__item" />
        <img src="https://mars-images.imgix.net/cie-article_ftr-pay-vipps.svg?auto=compress&w=100" alt="Vipps" class="payments__item" />
        <img src="https://mars-images.imgix.net/cie-article_ftr-pay-bedriftsfaktura.svg?auto=compress&w=100" alt="Bedriftsfaktura" class="payments__item" />
      </div>
      <div class="footer__copyright col-md-4 d-flex">
        <span class="footer__copyright-text">© 2026 All rights reserved Foodspace AS</span>
      </div>
    </div>
  </div>
</footer>`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a standalone, publishable HTML document for a given page.
 * Does NOT include any BWAI editor scripts — this is the clean public version.
 */
export function buildPublishedDocument(files: BwaiFiles, seo: BwaiSeoMeta = {}): string {
  const title = seo.title ?? 'Cake it Easy';
  const description = seo.description ?? '';
  const ogTitle = seo.ogTitle ?? title;
  const ogDescription = seo.ogDescription ?? description;
  const ogImage = seo.ogImageUrl ?? '';

  const safeCss = files.css.replace(/<\/style>/gi, '<\\/style>');
  const safeJs = files.js.replace(/<\/script>/gi, '<\\/script>');

  const metaTags = [
    description ? `<meta name="description" content="${esc(description)}" />` : '',
    `<meta property="og:title" content="${esc(ogTitle)}" />`,
    ogDescription ? `<meta property="og:description" content="${esc(ogDescription)}" />` : '',
    ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />` : '',
    `<meta property="og:type" content="website" />`
  ]
    .filter(Boolean)
    .join('\n    ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    ${metaTags}
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
    <style>${STATIC_SHELL_CSS}</style>
    <style id="BuildWithAiContentStyle">${safeCss}</style>
  </head>
  <body>
    ${HEADER_HTML}
    <main id="EditableContentRoot">${files.html}</main>
    ${FOOTER_HTML}

    <script>
      (function () {
        document.addEventListener('click', function (event) {
          var target = event.target;
          if (!(target instanceof Element)) return;
          if (target.matches('[data-mobile-menu-open]')) {
            var m = document.getElementById('buildWithAiMobileMenu');
            if (m) m.classList.add('active');
          }
          if (target.matches('[data-mobile-menu-close]')) {
            var m = document.getElementById('buildWithAiMobileMenu');
            if (m) m.classList.remove('active');
          }
          var dd = target.closest ? target.closest('[data-mobile-dd-toggle]') : null;
          if (dd) {
            var key = dd.getAttribute('data-mobile-dd-toggle');
            if (key) {
              var panel = document.querySelector('[data-mobile-dd="' + key + '"]');
              if (panel) panel.classList.toggle('active');
            }
          }
        });
      })();
    </script>

    <script id="BuildWithAiContentScript">${safeJs}</script>
  </body>
</html>`;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
