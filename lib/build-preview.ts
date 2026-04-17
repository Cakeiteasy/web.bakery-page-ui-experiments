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

export interface BwaiThemeMeta {
  fontPair?: string | null;
  accentColor?: string | null;
}

interface BwaiThemeFontPreset {
  id: string;
  googleFontsUrl: string;
  serifVar: string;
  sansVar: string;
}

interface BwaiResolvedTheme {
  fontHref: string;
  serifVar: string;
  sansVar: string;
  primary: string;
  mid: string;
  soft: string;
  faint: string;
  shadow: string;
}

const DEFAULT_THEME_FONT_PAIR_ID = 'playfair-lato';
const DEFAULT_THEME_PRIMARY = '#ff3399';
const BWAI_THEME_FONT_PRESETS: BwaiThemeFontPreset[] = [
  {
    id: 'playfair-lato',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Lato:wght@400;700&display=swap',
    serifVar: 'Playfair Display',
    sansVar: 'Lato'
  },
  {
    id: 'fraunces-dm',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,700&family=DM+Sans:wght@400;700&display=swap',
    serifVar: 'Fraunces',
    sansVar: 'DM Sans'
  },
  {
    id: 'cormorant-nunito',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,700&family=Nunito+Sans:wght@400;700&display=swap',
    serifVar: 'Cormorant Garamond',
    sansVar: 'Nunito Sans'
  },
  {
    id: 'baskerville-source',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,700;1,400&family=Source+Sans+3:wght@400;700&display=swap',
    serifVar: 'Libre Baskerville',
    sansVar: 'Source Sans 3'
  },
  {
    id: 'italiana-raleway',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Italiana&family=Raleway:wght@400;700&display=swap',
    serifVar: 'Italiana',
    sansVar: 'Raleway'
  }
];

function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  var raw = String(value).trim();
  if (!raw) return fallback;

  var shortMatch = raw.match(/^#([a-fA-F0-9]{3})$/);
  if (shortMatch) {
    var shortHex = shortMatch[1];
    raw = '#' + shortHex.charAt(0) + shortHex.charAt(0) + shortHex.charAt(1) + shortHex.charAt(1) + shortHex.charAt(2) + shortHex.charAt(2);
  }

  return /^#[a-fA-F0-9]{6}$/.test(raw) ? raw.toLowerCase() : fallback;
}

function mixHexColors(baseColor: string, mixColor: string, ratio: number): string {
  var clampedRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  var base = normalizeHexColor(baseColor, '#000000');
  var mix = normalizeHexColor(mixColor, '#ffffff');

  var br = parseInt(base.slice(1, 3), 16);
  var bg = parseInt(base.slice(3, 5), 16);
  var bb = parseInt(base.slice(5, 7), 16);

  var mr = parseInt(mix.slice(1, 3), 16);
  var mg = parseInt(mix.slice(3, 5), 16);
  var mb = parseInt(mix.slice(5, 7), 16);

  var r = Math.round(br * (1 - clampedRatio) + mr * clampedRatio);
  var g = Math.round(bg * (1 - clampedRatio) + mg * clampedRatio);
  var b = Math.round(bb * (1 - clampedRatio) + mb * clampedRatio);

  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}

function resolveTheme(theme: BwaiThemeMeta = {}): BwaiResolvedTheme {
  var fontPairId = String(theme.fontPair || DEFAULT_THEME_FONT_PAIR_ID);
  var fontPair = BWAI_THEME_FONT_PRESETS.find(function (preset) {
    return preset.id === fontPairId;
  }) || BWAI_THEME_FONT_PRESETS[0];

  var primary = normalizeHexColor(theme.accentColor, DEFAULT_THEME_PRIMARY);
  // mid   ≈ 28% white  → moderate tint (e.g. #ff3399 → #ff6bbf)
  // soft  ≈ 81% white  → light tint    (e.g. #ff3399 → #ffd9ec)
  // faint ≈ 93% white  → near-white    (e.g. #ff3399 → #fff0f7)
  var mid = mixHexColors(primary, '#ffffff', 0.28);
  var soft = mixHexColors(primary, '#ffffff', 0.81);
  var faint = mixHexColors(primary, '#ffffff', 0.93);

  var r = parseInt(primary.slice(1, 3), 16);
  var g = parseInt(primary.slice(3, 5), 16);
  var b = parseInt(primary.slice(5, 7), 16);
  var shadow = '0 8px 32px rgba(' + r + ',' + g + ',' + b + ',.24)';

  return {
    fontHref: fontPair.googleFontsUrl,
    serifVar: fontPair.serifVar,
    sansVar: fontPair.sansVar,
    primary: primary,
    mid: mid,
    soft: soft,
    faint: faint,
    shadow: shadow
  };
}

export function resolveBwaiThemeFontHref(theme: BwaiThemeMeta = {}): string {
  return resolveTheme(theme).fontHref;
}

export function buildBwaiThemeStyleCss(theme: BwaiThemeMeta = {}): string {
  var resolved = resolveTheme(theme);
  return [
    ':root {',
    '  --lp-primary: ' + resolved.primary + ';',
    '  --lp-primary-mid: ' + resolved.mid + ';',
    '  --lp-primary-soft: ' + resolved.soft + ';',
    '  --lp-primary-faint: ' + resolved.faint + ';',
    '  --lp-shadow-primary: ' + resolved.shadow + ';',
    "  --lp-serif: '" + resolved.serifVar + "', Georgia, serif;",
    "  --lp-sans: '" + resolved.sansVar + "', 'Segoe UI', system-ui, sans-serif;",
    '}'
  ].join('\n');
}

export const STATIC_SHELL_CSS = `
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

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: 'Lato', 'Segoe UI', sans-serif;
  color: var(--cie-text);
  background: var(--cie-primary-bg);
}

a {
  color: inherit;
  text-decoration: none;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

#PageHeader {
  width: min(1400px, 93vw);
  margin: 0 auto;
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header__info-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  width: 155px;
}

.header__benefits {
  display: flex;
  gap: 1rem;
  color: var(--cie-muted);
  font-size: 0.75rem;
}

.header__benefits-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.header__benefits-pic {
  width: 16px;
  height: 16px;
}

.header__navbar-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__navbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__drop-down {
  position: relative;
}

.header__drop-down-toggle {
  border: 0;
  background: transparent;
  font: inherit;
  color: var(--cie-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.header__drop-down-img {
  width: 11px;
  opacity: 0.8;
}

.dd-list {
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 20;
}

.header__drop-down:hover .dd-list,
.header__drop-down:focus-within .dd-list {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.dd-list__list-item {
  display: block;
  padding: 0.55rem 0.75rem;
  font-size: 0.92rem;
}

.dd-list__list-item:hover {
  background: #f5f5f5;
}

.header__navbar-button {
  border: 1px solid var(--cie-accent);
  color: var(--cie-accent);
  padding: 0.35rem 0.8rem;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.header__navbar-button:hover {
  background: var(--cie-accent-soft);
}

.header__navbar-hamburger {
  display: none;
  width: 24px;
  cursor: pointer;
}

.mobile-menu {
  display: none;
  position: fixed;
  inset: 0;
  background: var(--cie-primary-bg);
  z-index: 100;
  padding: 1.25rem;
}

.mobile-menu.active {
  display: block;
}

.mobile-menu__close-bttn-container {
  display: flex;
  justify-content: flex-end;
}

.mobile-menu__close-bttn {
  width: 16px;
  cursor: pointer;
}

.mobile-menu__items-list {
  margin-top: 1rem;
  font-size: 1.25rem;
}

.mobile-menu__list-item {
  border-top: 1px solid var(--cie-border);
  padding: 1rem 0;
}

.mobile-menu__item-drop-down {
  display: none;
  padding-left: 1rem;
}

.mobile-menu__item-drop-down.active {
  display: block;
}

#EditableContentRoot {
  margin: 0 auto;
  min-height: 320px;
}

#PageFooter {
  background: var(--cie-secondary-bg);
}

.footer__wrapper {
  width: min(1030px, 90vw);
  margin: 0 auto;
  padding: 2.75rem 0 2.25rem;
}

.footer__main-container {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.5rem;
}

.footer__contacts .logo {
  width: 122px;
}

.footer__social {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.footer__countries {
  margin-top: 1rem;
}

.footer__countries-title,
.footer__nav-list-item,
.footer__copyright-text {
  color: var(--cie-muted);
}

.footer__country {
  margin-top: 0.4rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.footer__nav-title {
  margin: 0;
  font-size: 1rem;
}

.footer__nav-list-item {
  line-height: 1.9;
}

.footer__nav-list-item-text:hover {
  text-decoration: underline;
}

.footer__info-container {
  margin-top: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer__payments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.payments__item {
  width: 84px;
}

@media (max-width: 1200px) {
  .header__benefits {
    display: none;
  }

  .header__navbar {
    display: none;
  }

  .header__navbar-hamburger {
    display: block;
  }
}

@media (max-width: 900px) {
  .footer__main-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  #PageHeader {
    width: 97vw;
  }

  .logo {
    width: 110px;
  }

  .footer__main-container {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .footer__social,
  .footer__payments,
  .footer__info-container {
    justify-content: center;
  }
}

/* Tune pass: closer to production spacing/typography */
:root {
  --font-xs: 400 0.75rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --font-s: 400 0.875rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --font-m: 400 1.125rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --font-ml: 700 1.25rem/1.5 'Lato', 'Segoe UI', sans-serif;
  --button-border-width: 1rem;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#PageHeader {
  max-width: 1400px;
  width: 93%;
  min-height: 48px;
  padding: 1.2rem 0;
  gap: 1.25rem;
}

.header__info-container {
  justify-content: flex-start;
  padding: 0 0 0 10px;
}

.header__benefits {
  padding: 0 0 0 38px;
  gap: 0;
}

.header__benefits-item {
  gap: 0.15rem;
}

.header__benefits-pic {
  width: 15px;
  height: 15px;
}

.header__benefits-text {
  font: var(--font-xs);
  letter-spacing: 0.01rem;
  color: var(--cie-text);
  padding: 0 20px 0 3px;
  white-space: nowrap;
}

.header__navbar-wrap {
  margin-left: auto;
}

.header__navbar {
  position: relative;
  padding-top: 3px;
  gap: 0;
}

.header__navbar-item {
  width: auto;
  padding: 0 10px;
  cursor: pointer;
  align-self: center;
  font: var(--font-m);
  font-size: calc(1rem / 1.06);
  text-align: center;
  white-space: nowrap;
}

.header__drop-down-toggle {
  color: var(--cie-text);
  transition: color 0.15s ease-in-out;
  font-size: inherit;
}

.header__drop-down-toggle:hover {
  color: var(--cie-muted);
}

.header__drop-down {
  padding: 11px 0;
}

.dd-list {
  top: 45px;
  border: 1px solid #ccc;
  border-radius: 6px;
  min-width: 180px;
}

.dd-list__list-item {
  padding: 8px 15px;
  width: 100%;
  text-align: left;
}

.header__navbar-button {
  padding: calc(var(--button-border-width) * 0.375) calc(var(--button-border-width) * 1.5);
  color: var(--cie-accent);
  border: 2px solid var(--cie-accent);
  border-radius: 5px;
  font-weight: 700;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.header__navbar-button:hover {
  color: var(--cie-accent);
  background-color: var(--cie-accent-soft);
}

.header__navbar-hamburger {
  margin: 0 5px 0 auto;
}

#PageFooter {
  background-color: var(--cie-secondary-bg);
}

.footer__wrapper {
  width: min(1030px, 90%);
  padding: 3.7% 0 0;
}

.footer__main-container {
  grid-template-columns: 1.1fr repeat(3, minmax(0, 1fr));
  gap: 1.5rem 2.3rem;
}

.footer__contacts {
  padding: 0 15px;
}

.footer__contacts .logo {
  width: 122px;
}

.footer__social {
  padding: 6px 0 0;
  gap: 9px;
}

.footer__social-item img {
  width: 30px;
  height: 30px;
}

.footer__countries {
  margin: 22px 0 0;
}

.footer__countries-title {
  color: var(--cie-muted);
  font: var(--font-xs);
}

.footer__country {
  margin: 6px 0;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  line-height: 1;
}

.footer__country-name {
  margin: 0 7px 0 0;
  font: var(--font-s);
  color: var(--cie-text);
}

.footer__country-img {
  width: 18px;
  height: 18px;
}

.footer__nav-menu-column {
  padding: 0 15px;
}

.footer__nav-title {
  margin: 0;
  font: var(--font-ml);
  font-size: 1.2rem;
  line-height: 1.05;
  color: var(--cie-text);
}

.footer__nav-list {
  padding: 10px 0 0;
}

.footer__nav-list-item {
  font: var(--font-s);
  line-height: 2.14;
  color: var(--cie-muted);
  white-space: nowrap;
}

.footer__info-container {
  margin-top: 0;
  padding: 70px 0 51px;
  align-items: center;
}

.footer__payments {
  margin: 0;
  padding: 0;
  gap: 0;
}

.payments__item {
  width: auto;
  max-width: 100px;
  margin: 0 20px 0 0;
}

.footer__copyright {
  margin-left: auto;
}

.footer__copyright-text {
  display: block;
  margin: 8px 0 0 auto;
  font: var(--font-s);
  letter-spacing: 0.03rem;
  white-space: nowrap;
  color: var(--cie-text);
}

@media (max-width: 1280px) {
  .header__benefits {
    padding-left: 24px;
  }
}

@media (max-width: 1200px) {
  #PageHeader {
    width: 95%;
    padding: 1rem 0;
  }

  .header__benefits {
    display: none;
  }

  .header__navbar {
    display: none;
  }

  .header__navbar-hamburger {
    display: block;
  }
}

@media (max-width: 992px) {
  .footer__main-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.75rem 1.2rem;
  }

  .footer__info-container {
    padding: 40px 0 24px;
    justify-content: center;
  }

  .footer__payments {
    justify-content: center;
  }

  .payments__item {
    margin: 0;
    padding: 0 16px 16px;
  }

  .footer__copyright {
    margin: 14px auto 0;
  }

  .footer__copyright-text {
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .footer__contacts,
  .footer__nav-menu-column {
    text-align: center;
    padding: 0;
  }

  .footer__contacts .logo {
    margin: 0 auto;
  }

  .footer__social {
    justify-content: center;
  }

  .footer__country {
    margin: 6px auto;
  }
}

@media (max-width: 576px) {
  #PageHeader {
    width: 97%;
  }

  .logo {
    width: 110px;
  }

  .header__navbar-hamburger {
    margin: 0 0 0 auto;
  }

  .footer__main-container {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .footer__wrapper {
    padding-top: 24px;
  }

  .footer__nav-title {
    font-size: 1rem;
  }
}

/* ── LP Design System ─────────────────────────── */

/* ── Tokens ─────────────────────────────────── */
:root {
  --lp-primary:       #ff3399;
  --lp-primary-mid:   #ff6bbf;
  --lp-primary-soft:  #ffd9ec;
  --lp-primary-faint: #fff0f7;
  --lp-cream:       #fffaf7;
  --lp-warm:        #f7f3ef;
  --lp-dark:        #1a1108;
  --lp-text:        #2c2016;
  --lp-muted:       #7a6f67;
  --lp-border:      #e8ddd6;
  --lp-white:       #ffffff;
  --lp-gold:        #c89b5a;

  --lp-serif:       'Playfair Display', Georgia, serif;
  --lp-sans:        'Lato', 'Segoe UI', system-ui, sans-serif;

  --lp-w:           min(1080px, 92vw);
  --lp-gap:         clamp(4rem, 8vw, 7rem);

  --lp-r-sm:        10px;
  --lp-r-md:        16px;
  --lp-r-lg:        24px;
  --lp-r-xl:        32px;

  --lp-shadow:      0 2px 12px rgba(42,32,24,.07), 0 8px 32px rgba(42,32,24,.05);
  --lp-shadow-primary: 0 8px 32px rgba(255,51,153,.24);
}

/* ── Reset ──────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }
`;

export const HEADER_HTML = `<header id="PageHeader" class="header container d-flex flex-row justify-content-between">
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

export const FOOTER_HTML = `<footer id="PageFooter" class="footer">
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

export const SECTION_IN_VIEW_RUNTIME_SCRIPT = `(function () {
  var GLOBAL_KEY = 'CIESectionInViewRuntime';
  var SECTION_SELECTOR = '.lp-hero,.lp-trust,.lp-stats-bar,.lp-props,.lp-how,.lp-showcase,.lp-proof,.lp-guarantee,.lp-faq,.lp-cta-final,.lp-products-list';

  function revealAll(root) {
    var host = root && root.querySelectorAll ? root : document;
    var sections = host.querySelectorAll(SECTION_SELECTOR);
    sections.forEach(function (section) {
      section.classList.add('in-view');
    });
  }

  function hydrate(root) {
    var host = root && root.querySelectorAll ? root : document;
    var sections = host.querySelectorAll(SECTION_SELECTOR);
    if (!sections.length) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      revealAll(host);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.07 });

    sections.forEach(function (section) {
      if (section.classList.contains('in-view')) return;
      observer.observe(section);
    });

    // Safety fallback: never leave sections hidden due missing/overwritten custom JS.
    window.setTimeout(function () {
      sections.forEach(function (section) {
        section.classList.add('in-view');
      });
      observer.disconnect();
    }, 2200);
  }

  window[GLOBAL_KEY] = { hydrate: hydrate };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hydrate(document);
    });
  } else {
    hydrate(document);
  }
})();`;

export const PRODUCTS_LIST_RUNTIME_SCRIPT = `(function () {
  var GLOBAL_KEY = 'CIEProductsListRuntime';
  var STATE_KEY = '__cieProductsListState';
  var COMPONENT_SELECTOR = '[data-cie-component="products-list"]';
  var BASE_URL = 'https://api.cakeiteasy.no/api/store';
  var SITE_URL = 'https://www.cakeiteasy.no';
  var HEADER_NAME = 'x-source-header';
  var HEADER_VALUE = 'MARKETPLACE';
  var STYLE_ID = 'CieProductsListRuntimeStyle';

  function escHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseBooleanAttr(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    var normalized = String(value).trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
    return fallback;
  }

  function buildUrl(path, params) {
    var url = new URL(BASE_URL + path);
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  async function requestJson(path, params) {
    var response = await fetch(buildUrl(path, params), {
      headers: (function () {
        var headers = {};
        headers[HEADER_NAME] = HEADER_VALUE;
        return headers;
      })()
    });
    if (!response.ok) {
      var text = await response.text();
      throw new Error('Search request failed (' + response.status + '): ' + text.slice(0, 140));
    }
    return response.json();
  }

  function ensureStyles(doc) {
    var styleText = [
      '.cie-products-list-shell,.cie-products-list{--ciepl-surface:var(--lp-white,var(--cie-primary-bg,#fff));--ciepl-surface-soft:var(--lp-cream,var(--cie-secondary-bg,#f9f9f9));--ciepl-border:var(--lp-border,var(--cie-border,#ebebeb));--ciepl-text:var(--lp-text,var(--cie-text,#333));--ciepl-muted:var(--lp-muted,var(--cie-muted,#858585));--ciepl-accent:var(--lp-primary,var(--cie-accent,#ff3399));--ciepl-accent-soft:var(--lp-primary-soft,var(--cie-accent-soft,#ffc2e0));--ciepl-accent-faint:var(--lp-primary-faint,#fff0f7);font-family:var(--lp-sans, "Lato", sans-serif);color:var(--ciepl-text);}',
      '.cie-products-list__search-area{position:relative;max-width:640px;margin:0 auto;}',
      '.cie-products-list__search-shell{position:relative;}',
      '.cie-products-list__input{width:100%;height:56px;min-height:0;line-height:1.2;padding:.72rem 1rem;border:1px solid var(--ciepl-border);border-radius:999px;background:var(--ciepl-surface);color:var(--ciepl-text);font:inherit;box-sizing:border-box;appearance:none;-webkit-appearance:none;box-shadow:0 1px 0 rgba(51,51,51,.04);}',
      '.cie-products-list__input:focus{outline:none;border-color:var(--ciepl-accent-soft);box-shadow:0 0 0 2px var(--ciepl-accent-soft);}',
      '.cie-products-list__dropdown{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:8;list-style:none;margin:0;padding:6px;border:1px solid var(--ciepl-border);border-radius:14px;background:var(--ciepl-surface);box-shadow:0 12px 30px rgba(51,51,51,.14);max-height:240px;overflow:auto;}',
      '.cie-products-list__dropdown-item{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;border:none;background:transparent;padding:.62rem .7rem;border-radius:10px;color:var(--ciepl-text);font:inherit;cursor:pointer;text-align:left;}',
      '.cie-products-list__dropdown-item:hover{background:var(--ciepl-accent-faint);}',
      '.cie-products-list__dropdown-type{font-size:.74rem;line-height:1;color:var(--ciepl-muted);text-transform:capitalize;}',
      '.cie-products-list__spinner{display:flex;justify-content:center;padding:14px 0;}',
      '.cie-products-list__spinner-dot{width:8px;height:8px;border-radius:50%;background:var(--ciepl-accent-soft);animation:ciePlSpinBounce .9s ease-in-out infinite;}',
      '.cie-products-list__spinner-dot:nth-child(2){animation-delay:.15s;}',
      '.cie-products-list__spinner-dot:nth-child(3){animation-delay:.3s;}',
      '@keyframes ciePlSpinBounce{0%,80%,100%{opacity:.25;transform:scale(.85);}40%{opacity:1;transform:scale(1.15);}}',
      '.cie-products-list__no-results{padding:12px 16px;color:var(--ciepl-muted);font-size:.86rem;text-align:center;}',
      '@media (max-width:760px){.cie-products-list__search-area{max-width:none;}}'
    ].join('');

    var style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement('style');
      style.id = STYLE_ID;
      doc.head.appendChild(style);
    }
    if (style.textContent !== styleText) {
      style.textContent = styleText;
    }
  }

  function resolveConfig(root) {
    return {
      country: (root.getAttribute('data-cie-country') || 'NO').trim() || 'NO',
      lang: (root.getAttribute('data-cie-lang') || 'no').trim() || 'no',
      showSearch: parseBooleanAttr(root.getAttribute('data-cie-show-search'), true)
    };
  }

  function ensureMount(root) {
    var mount = root.querySelector('[data-cie-products-list-mount]');
    if (mount) return mount;
    mount = root.ownerDocument.createElement('div');
    mount.setAttribute('data-cie-products-list-mount', '');
    root.appendChild(mount);
    return mount;
  }

  function getItemUrl(item) {
    var slug = String(item && (item.slug || item.name) || '').trim();
    if (!slug) return '';
    return SITE_URL + '/' + encodeURIComponent(slug) + '/kategori/kaker-1';
  }

  async function searchKeywords(state, query) {
    state.query = query;
    state.keywordResults = [];

    var trimmed = (query || '').trim();
    if (!trimmed) {
      state.loading = false;
      state.searchedOnce = false;
      render(state);
      return;
    }

    state.loading = true;
    state.searchedOnce = false;
    render(state);

    try {
      var payload = await requestJson('/keywords/', {
        country_code: state.config.country,
        query: trimmed
      });
      state.keywordResults = Array.isArray(payload) ? payload.slice(0, 8) : [];
    } catch (_error) {
      state.keywordResults = [];
    }

    state.loading = false;
    state.searchedOnce = true;
    render(state);
  }

  function render(state) {
    var mount = state.mount;
    var doc = mount && mount.ownerDocument ? mount.ownerDocument : document;
    var previousSearchInput = mount.querySelector('[data-cie-pl-search]');
    var shouldRestoreSearchFocus = !!(previousSearchInput && doc.activeElement === previousSearchInput);
    var previousSelectionStart = shouldRestoreSearchFocus && typeof previousSearchInput.selectionStart === 'number'
      ? previousSearchInput.selectionStart : null;
    var previousSelectionEnd = shouldRestoreSearchFocus && typeof previousSearchInput.selectionEnd === 'number'
      ? previousSearchInput.selectionEnd : null;

    if (!state.config.showSearch) { mount.innerHTML = ''; return; }

    mount.innerHTML = [
      '<div class="cie-products-list-shell">',
      '<div class="cie-products-list__search-area">',
      '<div class="cie-products-list__search-shell">',
      '<input class="cie-products-list__input" type="text" autocomplete="off" placeholder="Search city or bakery" value="' + escHtml(state.query) + '" data-cie-pl-search />',
      state.loading
        ? '<div class="cie-products-list__dropdown"><div class="cie-products-list__spinner"><span class="cie-products-list__spinner-dot"></span><span class="cie-products-list__spinner-dot"></span><span class="cie-products-list__spinner-dot"></span></div></div>'
        : state.keywordResults.length
          ? '<ul class="cie-products-list__dropdown">' + state.keywordResults.map(function (item, index) {
              var typeLabel = item && item.is_city ? 'city' : 'bakery';
              return '<li><button type="button" class="cie-products-list__dropdown-item" data-cie-pl-suggestion="' + index + '">' +
                '<span>' + escHtml(item && item.name ? item.name : 'Unknown') + '</span>' +
                '<span class="cie-products-list__dropdown-type">' + typeLabel + '</span>' +
                '</button></li>';
            }).join('') + '</ul>'
          : state.searchedOnce && state.query.trim()
            ? '<div class="cie-products-list__dropdown"><p class="cie-products-list__no-results">No results for &ldquo;' + escHtml(state.query.trim()) + '&rdquo;</p></div>'
            : '',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    var searchInput = mount.querySelector('[data-cie-pl-search]');
    if (searchInput) {
      var searchTimeout = null;

      if (shouldRestoreSearchFocus) {
        try { searchInput.focus({ preventScroll: true }); } catch (_e) { searchInput.focus(); }
        var cursorStart = typeof previousSelectionStart === 'number'
          ? Math.min(previousSelectionStart, searchInput.value.length) : searchInput.value.length;
        var cursorEnd = typeof previousSelectionEnd === 'number'
          ? Math.min(previousSelectionEnd, searchInput.value.length) : cursorStart;
        if (typeof searchInput.setSelectionRange === 'function') {
          try { searchInput.setSelectionRange(cursorStart, cursorEnd); } catch (_e2) {}
        }
      }

      searchInput.addEventListener('focus', function () {
        if (!state.keywordResults.length && searchInput.value.trim()) {
          void searchKeywords(state, searchInput.value);
        }
      });
      searchInput.addEventListener('input', function (event) {
        var value = event && event.target ? event.target.value : '';
        if (searchTimeout) window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(function () {
          void searchKeywords(state, value);
        }, 180);
      });
      searchInput.addEventListener('keydown', function (event) {
        if (!event || event.key !== 'Enter' || !state.keywordResults.length) return;
        event.preventDefault();
        var url = getItemUrl(state.keywordResults[0]);
        if (url) window.open(url, '_blank', 'noopener');
      });
      searchInput.addEventListener('blur', function () {
        window.setTimeout(function () {
          var active = doc.activeElement;
          if (active && typeof active.closest === 'function' && active.closest('.cie-products-list__search-area')) return;
          if (!state.keywordResults.length) return;
          state.keywordResults = [];
          render(state);
        }, 120);
      });
    }

    var suggestionButtons = mount.querySelectorAll('[data-cie-pl-suggestion]');
    suggestionButtons.forEach(function (button) {
      var pickSuggestion = function () {
        var index = Number(button.getAttribute('data-cie-pl-suggestion'));
        if (!Number.isFinite(index) || index < 0 || !state.keywordResults[index]) return;
        var item = state.keywordResults[index];
        var url = getItemUrl(item);
        if (url) window.open(url, '_blank', 'noopener');
      };

      var onPointerPick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        button.setAttribute('data-cie-pl-picked-by-pointer', '1');
        pickSuggestion();
      };

      if (typeof window !== 'undefined' && window.PointerEvent) {
        button.addEventListener('pointerdown', onPointerPick);
      } else {
        button.addEventListener('mousedown', onPointerPick);
      }

      button.addEventListener('click', function (event) {
        event.preventDefault();
        if (button.getAttribute('data-cie-pl-picked-by-pointer') === '1') {
          button.removeAttribute('data-cie-pl-picked-by-pointer');
          return;
        }
        pickSuggestion();
      });
    });
  }

  function initSection(root) {
    if (root.getAttribute('data-cie-products-list-init') === '1') {
      var existingState = root[STATE_KEY];
      if (existingState) {
        existingState.root = root;
        existingState.mount = ensureMount(root);
        existingState.config = resolveConfig(root);
        render(existingState);
        return;
      }
      root.removeAttribute('data-cie-products-list-init');
    }
    root.setAttribute('data-cie-products-list-init', '1');

    var state = {
      root: root,
      mount: ensureMount(root),
      config: resolveConfig(root),
      query: '',
      keywordResults: [],
      loading: false,
      searchedOnce: false
    };
    root[STATE_KEY] = state;
    render(state);
  }

  function hydrate(root) {
    var host = root && root.querySelectorAll ? root : document;
    ensureStyles(document);
    var sections = host.querySelectorAll(COMPONENT_SELECTOR);
    sections.forEach(function (section) {
      initSection(section);
    });
  }

  window[GLOBAL_KEY] = { hydrate: hydrate };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hydrate(document);
    });
  } else {
    hydrate(document);
  }
})();`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a standalone, publishable HTML document for a given page.
 * Does NOT include any BWAI editor scripts — this is the clean public version.
 */
export function buildPublishedDocument(
  files: BwaiFiles,
  seo: BwaiSeoMeta = {},
  hiddenSections: string[] = [],
  theme: BwaiThemeMeta = {}
): string {
  const title = seo.title ?? 'Cake it Easy';
  const description = seo.description ?? '';
  const ogTitle = seo.ogTitle ?? title;
  const ogDescription = seo.ogDescription ?? description;
  const ogImage = seo.ogImageUrl ?? '';

  const safeCss = files.css.replace(/<\/style>/gi, '<\\/style>');
  const safeJs = files.js.replace(/<\/script>/gi, '<\\/script>');
  const themeCss = buildBwaiThemeStyleCss(theme).replace(/<\/style>/gi, '<\\/style>');
  const themeFontHref = resolveBwaiThemeFontHref(theme);
  const hiddenCss = hiddenSections.length
    ? hiddenSections.map((id) => `[data-bwai-id="${id}"]{display:none!important}`).join('')
    : '';

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
    <link id="BuildWithAiThemeFonts" href="${esc(themeFontHref)}" rel="stylesheet" />
    <style>@layer properties, theme, base, components, utilities;</style>
    <style>@layer base { ${STATIC_SHELL_CSS} }</style>
    <style id="BuildWithAiContentStyle">${safeCss}</style>
    <style id="BuildWithAiThemeStyle">${themeCss}</style>${hiddenCss ? `\n    <style>${hiddenCss}</style>` : ''}
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

    <script id="CieSectionInViewRuntime">${SECTION_IN_VIEW_RUNTIME_SCRIPT}</script>
    <script id="CieProductsListRuntime">${PRODUCTS_LIST_RUNTIME_SCRIPT}</script>
    <script id="BuildWithAiContentScript">${safeJs}</script>
  </body>
</html>`;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
