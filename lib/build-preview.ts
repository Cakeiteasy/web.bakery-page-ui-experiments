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

  function parsePositiveNumber(value, fallback) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.round(parsed);
  }

  function parseNonNegativeNumber(value, fallback) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.round(parsed);
  }

  function parseIdList(value) {
    if (!value) return [];
    return String(value)
      .split(',')
      .map(function (part) { return Number(part.trim()); })
      .filter(function (num, index, all) { return Number.isFinite(num) && num > 0 && all.indexOf(num) === index; });
  }

  function parseBooleanAttr(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    var normalized = String(value).trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
    return fallback;
  }

  function parseOptionalLimit(root) {
    if (!root || typeof root.hasAttribute !== 'function' || !root.hasAttribute('data-cie-limit')) return null;
    return parsePositiveNumber(root.getAttribute('data-cie-limit'), null);
  }

  function normalizeMode(value) {
    return value === 'request' ? 'request' : 'preset';
  }

  function normalizeRefType(value) {
    return value === 'bakery' ? 'bakery' : 'city';
  }

  function normalizeMotive(value) {
    if (value === 'with' || value === 'without') return value;
    return 'any';
  }

  function toCategoryList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object' && Array.isArray(payload.results)) return payload.results;
    return [];
  }

  function normalizeLooseText(value) {
    var text = String(value || '').trim().toLowerCase();
    if (!text) return '';
    text = text
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a');
    if (typeof text.normalize === 'function') {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return text
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findCategoryByName(categories, expectedName) {
    var needle = normalizeLooseText(expectedName);
    if (!needle || !Array.isArray(categories) || !categories.length) return null;

    for (var i = 0; i < categories.length; i++) {
      var category = categories[i];
      var hay = normalizeLooseText(category && category.name);
      if (!hay) continue;
      if (hay === needle || hay.indexOf(needle) !== -1 || needle.indexOf(hay) !== -1) return category;
    }

    return null;
  }

  function findCategoryById(categories, expectedId) {
    var id = parsePositiveNumber(expectedId, null);
    if (!id || !Array.isArray(categories) || !categories.length) return null;

    for (var i = 0; i < categories.length; i++) {
      var category = categories[i];
      if (parsePositiveNumber(category && category.id, null) === id) return category;
    }

    return null;
  }

  function markResolvedWhenNoProductRequest(state) {
    if (!state || state.loading || state.error || state.selectedCategoryId) return;
    var hasReference = !!(state.config && (state.config.mode === 'preset' || state.selectedRefName || state.selectedBakeryId));
    if (hasReference) state.hasResolvedProductRequest = true;
  }

  function applyCategorySelectionPolicy(state) {
    var predefined = state && state.config ? String(state.config.predefinedCategory || '').trim() : '';

    if (!predefined) {
      state.predefinedCategoryMissing = false;
      if (!state.selectedCategoryId && state.categories.length) {
        state.selectedCategoryId = parsePositiveNumber(state.categories[0] && state.categories[0].id, null);
      }
      return;
    }

    var matchedCategory = findCategoryById(state.categories, predefined) || findCategoryByName(state.categories, predefined);
    var matchedCategoryId = parsePositiveNumber(matchedCategory && matchedCategory.id, null);

    if (!matchedCategoryId) {
      state.predefinedCategoryMissing = true;
      state.selectedCategoryId = null;
      state.products = [];
      state.filters = null;
      state.allergens = [];
      markResolvedWhenNoProductRequest(state);
      return;
    }

    state.predefinedCategoryMissing = false;
    state.selectedCategoryId = matchedCategoryId;
  }

  function buildUrl(path, params) {
    var url = new URL(BASE_URL + path);
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach(function (item) {
          if (item !== undefined && item !== null && item !== '') {
            url.searchParams.append(key, String(item));
          }
        });
        return;
      }
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
      throw new Error('Products List API request failed (' + response.status + '): ' + text.slice(0, 140));
    }

    return response.json();
  }

  function ensureStyles(doc) {
    var styleText = [
      '.cie-products-list-shell,.cie-products-list{--ciepl-surface:var(--lp-white,var(--cie-primary-bg,#fff));--ciepl-surface-soft:var(--lp-cream,var(--cie-secondary-bg,#f9f9f9));--ciepl-surface-muted:var(--lp-warm,var(--cie-section-bg,#f7f3f0));--ciepl-border:var(--lp-border,var(--cie-border,#ebebeb));--ciepl-text:var(--lp-text,var(--cie-text,#333));--ciepl-muted:var(--lp-muted,var(--cie-muted,#858585));--ciepl-accent:var(--lp-primary,var(--cie-accent,#ff3399));--ciepl-accent-soft:var(--lp-primary-soft,var(--cie-accent-soft,#ffc2e0));--ciepl-accent-faint:var(--lp-primary-faint,#fff0f7);font-family:var(--lp-sans, "Lato", sans-serif);color:var(--ciepl-text);}',
      '.cie-products-list{margin:0 auto;max-width:980px;border:1px solid var(--ciepl-border);border-radius:18px;background:var(--ciepl-surface);padding:18px;box-shadow:0 2px 12px rgba(51,51,51,.08);}',
      '.cie-products-list__head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;}',
      '.cie-products-list__title{margin:0;font-size:1.12rem;line-height:1.2;color:var(--ciepl-text);font-family:var(--lp-serif, "Playfair Display", serif);}',
      '.cie-products-list__sub{margin:0;color:var(--ciepl-muted);font-size:.84rem;}',
      '.cie-products-list__search-area{position:relative;max-width:640px;margin:0 auto 24px;}',
      '.cie-products-list__search-shell{position:relative;}',
      '.cie-products-list__input{width:100%;height:56px;min-height:0;line-height:1.2;padding:.72rem 1rem;border:1px solid var(--ciepl-border);border-radius:999px;background:var(--ciepl-surface);color:var(--ciepl-text);font:inherit;box-sizing:border-box;appearance:none;-webkit-appearance:none;box-shadow:0 1px 0 rgba(51,51,51,.04);}',
      '.cie-products-list__input:focus{outline:none;border-color:var(--ciepl-accent-soft);box-shadow:0 0 0 2px var(--ciepl-accent-soft);}',
      '.cie-products-list__dropdown{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:8;list-style:none;margin:0;padding:6px;border:1px solid var(--ciepl-border);border-radius:14px;background:var(--ciepl-surface);box-shadow:0 12px 30px rgba(51,51,51,.14);max-height:240px;overflow:auto;}',
      '.cie-products-list__dropdown-item{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;border:none;background:transparent;padding:.62rem .7rem;border-radius:10px;color:var(--ciepl-text);font:inherit;cursor:pointer;text-align:left;}',
      '.cie-products-list__dropdown-item:hover{background:var(--ciepl-accent-faint);}',
      '.cie-products-list__dropdown-type{font-size:.74rem;line-height:1;color:var(--ciepl-muted);text-transform:capitalize;}',
      '.cie-products-list__tabs{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin:0 0 14px;}',
      '.cie-products-list__tab{border:1px solid var(--ciepl-border);background:var(--ciepl-surface);color:var(--ciepl-text);border-radius:999px;padding:.42rem .82rem;font:inherit;font-size:.82rem;cursor:pointer;transition:all .18s ease;}',
      '.cie-products-list__tab:hover{background:var(--ciepl-accent-faint);border-color:var(--ciepl-accent-soft);}',
      '.cie-products-list__tab.is-active{background:var(--ciepl-accent);border-color:var(--ciepl-accent);color:var(--ciepl-surface);font-weight:700;}',
      '.cie-products-list__status{font-size:.84rem;color:var(--ciepl-muted);margin:0 0 10px;text-align:center;}',
      '.cie-products-list__status.error{color:var(--ciepl-accent);}',
      '.cie-products-list__results{position:relative;min-height:70px;}',
      '.cie-products-list__content.is-blurred{filter:blur(2px);opacity:.58;pointer-events:none;user-select:none;}',
      '.cie-products-list__loading-overlay{position:absolute;inset:0;display:flex;justify-content:center;align-items:flex-start;padding-top:16px;border-radius:12px;background:rgba(255,255,255,.32);pointer-events:none;}',
      '.cie-products-list__loading-pill{display:inline-flex;align-items:center;padding:.35rem .75rem;border-radius:999px;border:1px solid var(--ciepl-accent-soft);background:var(--ciepl-accent-faint);color:var(--ciepl-accent);font-size:.8rem;font-weight:700;box-shadow:0 2px 8px rgba(51,51,51,.10);}',
      '.cie-products-list__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0;padding:0;list-style:none;}',
      '.cie-products-list__card{border:1px solid var(--ciepl-border);border-radius:12px;padding:10px;display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:start;background:var(--ciepl-surface);}',
      '.cie-products-list__card.is-clickable{cursor:pointer;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;}',
      '.cie-products-list__card.is-clickable:hover{transform:translateY(-1px);border-color:var(--ciepl-accent-soft);box-shadow:0 4px 14px rgba(51,51,51,.12);}',
      '.cie-products-list__card.is-clickable:focus-visible{outline:2px solid var(--ciepl-accent-soft);outline-offset:1px;}',
      '.cie-products-list__image{width:72px;height:72px;object-fit:cover;border-radius:10px;background:var(--ciepl-surface-muted);}',
      '.cie-products-list__name{margin:0;font-size:.95rem;line-height:1.3;color:var(--ciepl-text);}',
      '.cie-products-list__meta{margin:3px 0 0;font-size:.78rem;color:var(--ciepl-muted);}',
      '.cie-products-list__price{margin-top:5px;font-size:.83rem;font-weight:700;color:var(--ciepl-text);}',
      '.cie-products-list__skeleton-card{border:1px solid var(--ciepl-border);border-radius:12px;padding:10px;display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;background:var(--ciepl-surface);}',
      '.cie-products-list__skeleton-image{width:72px;height:72px;border-radius:10px;background:var(--ciepl-surface-muted);animation:cieProductsSkeletonPulse 1.25s ease-in-out infinite;}',
      '.cie-products-list__skeleton-line{height:11px;border-radius:999px;background:var(--ciepl-surface-muted);animation:cieProductsSkeletonPulse 1.25s ease-in-out infinite;}',
      '.cie-products-list__skeleton-line + .cie-products-list__skeleton-line{margin-top:8px;}',
      '.cie-products-list__skeleton-line--short{width:62%;}',
      '.cie-products-list__skeleton-line--mid{width:78%;}',
      '@keyframes cieProductsSkeletonPulse{0%{opacity:.48;}50%{opacity:.92;}100%{opacity:.48;}}',
      '.cie-products-list__empty{padding:14px;border:1px dashed var(--ciepl-border);border-radius:12px;color:var(--ciepl-muted);font-size:.86rem;background:var(--ciepl-surface-soft);}',
      '@media (max-width:1024px){.cie-products-list__grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:760px){.cie-products-list{padding:14px;}.cie-products-list__search-area{max-width:none;margin-bottom:18px;}.cie-products-list__grid{grid-template-columns:1fr;}}'
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
    var mode = normalizeMode(root.getAttribute('data-cie-mode'));
    return {
      mode: mode,
      refType: normalizeRefType(root.getAttribute('data-cie-ref-type')),
      refName: (root.getAttribute('data-cie-ref-name') || '').trim(),
      bakeryId: parsePositiveNumber(root.getAttribute('data-cie-bakery-id'), null),
      categoryId: parsePositiveNumber(root.getAttribute('data-cie-category-id'), null),
      country: (root.getAttribute('data-cie-country') || 'NO').trim() || 'NO',
      lang: (root.getAttribute('data-cie-lang') || 'no').trim() || 'no',
      limit: parseOptionalLimit(root),
      showSearch: parseBooleanAttr(root.getAttribute('data-cie-show-search'), mode === 'request'),
      predefinedCategory: (root.getAttribute('data-cie-predefined-category') || '').trim(),
      allergenIds: parseIdList(root.getAttribute('data-cie-allergen-ids')),
      groupIds: parseIdList(root.getAttribute('data-cie-group-ids')),
      motive: normalizeMotive(root.getAttribute('data-cie-motive'))
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

  function deriveRef(state) {
    if (state.selectedBakeryId) {
      return { bakeryId: state.selectedBakeryId, refName: state.selectedRefName || '', refType: 'bakery' };
    }
    if (state.selectedRefName) {
      return { bakeryId: null, refName: state.selectedRefName, refType: state.selectedRefType || 'city' };
    }
    return null;
  }

  async function fetchCategories(state) {
    var ref = deriveRef(state);
    if (!ref) return [];

    if (ref.bakeryId) {
      var byBakeryId = await requestJson('/bakeries/' + encodeURIComponent(ref.bakeryId) + '/categories/', {
        country_code: state.config.country,
        selected_lang: state.config.lang
      });
      return toCategoryList(byBakeryId);
    }

    var byRef = await requestJson('/' + encodeURIComponent(ref.refName) + '/categories/', {
      country_code: state.config.country,
      selected_lang: state.config.lang
    });
    return toCategoryList(byRef);
  }

  function buildCommonParams(state) {
    var ref = deriveRef(state);
    if (!ref || !state.selectedCategoryId) return null;

    var params = {
      country: state.config.country,
      category_id: state.selectedCategoryId
    };

    if (ref.bakeryId) params.bakery_id = ref.bakeryId;
    else params.ref_name = ref.refName;

    return params;
  }

  function formatPrice(minPrice, maxPrice) {
    var min = Number(minPrice);
    var max = Number(maxPrice);
    if (!Number.isFinite(min) && !Number.isFinite(max)) return '';
    if (Number.isFinite(min) && Number.isFinite(max) && min !== max) return String(min) + ' - ' + String(max) + ' kr';
    return String(Number.isFinite(min) ? min : max) + ' kr';
  }

  function slugify(value) {
    var text = String(value || '').trim().toLowerCase();
    if (!text) return '';
    text = text
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a');
    if (typeof text.normalize === 'function') {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return text
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function toAbsoluteCakeUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    var lower = raw.toLowerCase();
    if (lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0) return raw;
    if (raw.charAt(0) === '/') return 'https://www.cakeiteasy.no' + raw;
    return '';
  }

  function getProductUrl(product) {
    var explicitUrl = toAbsoluteCakeUrl(
      (product && (product.url || product.product_url || product.detail_url || product.request_url)) ||
      (product && product.bakery && (product.bakery.url || product.bakery.webshop_url))
    );
    if (explicitUrl) return explicitUrl;

    var productId = parsePositiveNumber(product && product.id, null);
    var bakerySlug = slugify(product && product.bakery && product.bakery.name);
    var productSlug = slugify(product && product.name);
    if (!productId || !bakerySlug || !productSlug) return '';
    return 'https://www.cakeiteasy.no/' + bakerySlug + '/produkt/' + productSlug + '-' + productId;
  }

  function buildProductsSkeletonMarkup(state) {
    var count = parsePositiveNumber(state && state.config ? state.config.limit : null, 6);
    count = Math.max(3, Math.min(6, count));
    var cards = '';

    for (var i = 0; i < count; i++) {
      cards += [
        '<li class="cie-products-list__skeleton-card">',
        '<div class="cie-products-list__skeleton-image"></div>',
        '<div>',
        '<div class="cie-products-list__skeleton-line"></div>',
        '<div class="cie-products-list__skeleton-line cie-products-list__skeleton-line--mid"></div>',
        '<div class="cie-products-list__skeleton-line cie-products-list__skeleton-line--short"></div>',
        '</div>',
        '</li>'
      ].join('');
    }

    return '<ul class="cie-products-list__grid">' + cards + '</ul>';
  }

  async function loadProductsData(state) {
    if (state.predefinedCategoryMissing) {
      state.error = '';
      state.loading = false;
      state.hasResolvedProductRequest = true;
      state.products = [];
      state.filters = null;
      state.allergens = [];
      render(state);
      return;
    }

    var common = buildCommonParams(state);
    if (!common) {
      state.error = 'Missing location or category for Products List.';
      state.loading = false;
      render(state);
      return;
    }

    state.loading = true;
    state.hasResolvedProductRequest = false;
    state.error = '';
    render(state);

    try {
      var filtersPromise = requestJson('/product-types/filters/', common);
      var allergensPromise = requestJson('/product-types/filters/allergens/', common);

      var productParams = {
        country: common.country,
        category_id: common.category_id
      };
      if (common.ref_name) productParams.ref_name = common.ref_name;
      if (common.bakery_id) productParams.bakery_id = common.bakery_id;
      if (state.config.allergenIds.length) productParams.allergen = state.config.allergenIds;
      if (state.config.groupIds.length) productParams.group = state.config.groupIds;
      if (state.config.motive === 'with') productParams.has_motive = 'true';
      if (state.config.motive === 'without') productParams.has_motive = 'false';

      var productsPromise = requestJson('/product-types/', productParams);
      var result = await Promise.all([filtersPromise, allergensPromise, productsPromise]);
      state.filters = result[0] || null;
      state.allergens = Array.isArray(result[1]) ? result[1] : [];
      var allProducts = Array.isArray(result[2]) ? result[2] : [];
      state.products = state.config.limit ? allProducts.slice(0, state.config.limit) : allProducts;
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load products.';
      state.products = [];
    } finally {
      state.loading = false;
      state.hasResolvedProductRequest = true;
      render(state);
    }
  }

  async function searchKeywords(state, query) {
    state.query = query;
    state.keywordResults = [];

    if (!query || query.trim().length < 2) {
      render(state);
      return;
    }

    try {
      var payload = await requestJson('/keywords/', {
        country_code: state.config.country,
        query: query.trim()
      });
      state.keywordResults = Array.isArray(payload) ? payload.slice(0, 8) : [];
    } catch (_error) {
      state.keywordResults = [];
    }

    render(state);
  }

  async function selectKeyword(state, keyword) {
    state.selectedRefType = keyword && keyword.is_city ? 'city' : 'bakery';
    state.selectedRefName = String(keyword && keyword.name ? keyword.name : '').trim();
    state.selectedBakeryId = keyword && keyword.is_city ? null : parsePositiveNumber(keyword && keyword.id, null);
    state.selectedCategoryId = null;
    state.categories = [];
    state.keywordResults = [];
    state.query = state.selectedRefName;
    state.error = '';
    render(state);

    try {
      state.categories = await fetchCategories(state);
      applyCategorySelectionPolicy(state);
      markResolvedWhenNoProductRequest(state);
      render(state);
      if (state.selectedCategoryId) {
        await loadProductsData(state);
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load categories.';
      render(state);
    }
  }

  function render(state) {
    var mount = state.mount;
    var doc = mount && mount.ownerDocument ? mount.ownerDocument : document;
    var previousSearchInput = mount.querySelector('[data-cie-pl-search]');
    var shouldRestoreSearchFocus = !!(previousSearchInput && doc.activeElement === previousSearchInput);
    var previousSelectionStart = shouldRestoreSearchFocus && typeof previousSearchInput.selectionStart === 'number'
      ? previousSearchInput.selectionStart
      : null;
    var previousSelectionEnd = shouldRestoreSearchFocus && typeof previousSearchInput.selectionEnd === 'number'
      ? previousSearchInput.selectionEnd
      : null;

    var searchMarkup = '';
    if (state.config.showSearch) {
      searchMarkup = [
        '<div class="cie-products-list__search-area">',
        '<div class="cie-products-list__search-shell">',
        '<input class="cie-products-list__input" type="text" autocomplete="off" placeholder="Search city or bakery" value="' + escHtml(state.query) + '" data-cie-pl-search />',
        state.keywordResults.length
          ? '<ul class="cie-products-list__dropdown">' + state.keywordResults.map(function (item, index) {
              var typeLabel = item && item.is_city ? 'city' : 'bakery';
              return '<li><button type="button" class="cie-products-list__dropdown-item" data-cie-pl-suggestion="' + index + '">' +
                '<span>' + escHtml(item && item.name ? item.name : 'Unknown') + '</span>' +
                '<span class="cie-products-list__dropdown-type">' + typeLabel + '</span>' +
                '</button></li>';
            }).join('') + '</ul>'
          : '',
        '</div>',
        '</div>'
      ].join('');
    }

    var tabsMarkup = '';
    if (state.categories.length && !state.config.predefinedCategory) {
      tabsMarkup = '<div class="cie-products-list__tabs">' + state.categories.map(function (category) {
        var id = parsePositiveNumber(category && category.id, null);
        if (!id) return '';
        var isActive = id === state.selectedCategoryId ? ' is-active' : '';
        var name = category && category.name ? category.name : 'Category';
        return '<button type="button" class="cie-products-list__tab' + isActive + '" data-cie-pl-tab="' + id + '">' + escHtml(name) + '</button>';
      }).join('') + '</div>';
    }

    var productsMarkup = '';
    var shouldShowSkeleton =
      state.initializing ||
      (state.loading && !state.products.length) ||
      (!state.hasResolvedProductRequest && !state.error && (state.config.mode === 'preset' || state.selectedRefName || state.selectedBakeryId));

    if (state.products.length) {
      productsMarkup =
        '<ul class="cie-products-list__grid">' +
        state.products.map(function (product) {
          var name = escHtml(product && product.name ? product.name : 'Unnamed product');
          var bakeryName = escHtml(product && product.bakery && product.bakery.name ? product.bakery.name : '');
          var productUrl = getProductUrl(product);
          var cardClasses = 'cie-products-list__card' + (productUrl ? ' is-clickable' : '');
          var linkAttrs = productUrl
            ? ' data-cie-pl-product-url="' + escHtml(productUrl) + '" role="link" tabindex="0"'
            : '';
          var imageUrl = product && product.image && (product.image.small || product.image.original)
            ? String(product.image.small || product.image.original)
            : '';
          if (imageUrl && imageUrl.indexOf('//') === 0) imageUrl = 'https:' + imageUrl;
          var priceLabel = formatPrice(product && product.min_price, product && product.max_price);

          return [
            '<li class="' + cardClasses + '"' + linkAttrs + '>',
            imageUrl ? '<img class="cie-products-list__image" src="' + escHtml(imageUrl) + '" alt="' + name + '" loading="lazy" />' : '<div class="cie-products-list__image"></div>',
            '<div>',
            '<h4 class="cie-products-list__name">' + name + '</h4>',
            bakeryName ? '<p class="cie-products-list__meta">' + bakeryName + '</p>' : '',
            priceLabel ? '<p class="cie-products-list__price">' + escHtml(priceLabel) + '</p>' : '',
            '</div>',
            '</li>'
          ].join('');
        }).join('') +
        '</ul>';
    } else if (shouldShowSkeleton) {
      productsMarkup = buildProductsSkeletonMarkup(state);
    } else if (!state.loading && !state.error && state.predefinedCategoryMissing) {
      productsMarkup = '<div class="cie-products-list__empty">No products found for the predefined category.</div>';
    } else if (!state.loading && !state.error && state.config.mode === 'request' && !state.selectedRefName && !state.selectedBakeryId) {
      productsMarkup = state.config.showSearch
        ? '<div class="cie-products-list__empty">Search for a city or bakery to see products.</div>'
        : '<div class="cie-products-list__empty">Set a default city or bakery, or enable search to load products.</div>';
    } else if (!state.loading && !state.error) {
      productsMarkup = '<div class="cie-products-list__empty">No products found for this selection.</div>';
    }

    var showLoadingOverlay = state.loading && state.products.length > 0;
    var contentClass = showLoadingOverlay ? 'cie-products-list__content is-blurred' : 'cie-products-list__content';

    mount.innerHTML = [
      '<div class="cie-products-list-shell">',
      searchMarkup,
      '<div class="cie-products-list">',
      tabsMarkup,
      state.error ? '<p class="cie-products-list__status error">' + escHtml(state.error) + '</p>' : '',
      '<div class="cie-products-list__results">',
      '<div class="' + contentClass + '">',
      productsMarkup,
      '</div>',
      showLoadingOverlay
        ? '<div class="cie-products-list__loading-overlay"><span class="cie-products-list__loading-pill">Loading products...</span></div>'
        : '',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    var searchInput = mount.querySelector('[data-cie-pl-search]');
    if (searchInput) {
      var searchTimeout = null;

      if (shouldRestoreSearchFocus) {
        try {
          searchInput.focus({ preventScroll: true });
        } catch (_focusErr) {
          searchInput.focus();
        }
        var cursorStart = typeof previousSelectionStart === 'number'
          ? Math.min(previousSelectionStart, searchInput.value.length)
          : searchInput.value.length;
        var cursorEnd = typeof previousSelectionEnd === 'number'
          ? Math.min(previousSelectionEnd, searchInput.value.length)
          : cursorStart;
        if (typeof searchInput.setSelectionRange === 'function') {
          try {
            searchInput.setSelectionRange(cursorStart, cursorEnd);
          } catch (_selectionErr) {
            // noop
          }
        }
      }

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
        void selectKeyword(state, state.keywordResults[0]);
      });
      searchInput.addEventListener('blur', function () {
        window.setTimeout(function () {
          var active = doc.activeElement;
          if (active && typeof active.closest === 'function' && active.closest('.cie-products-list__search-area')) {
            return;
          }
          if (!state.keywordResults.length) return;
          state.keywordResults = [];
          render(state);
        }, 120);
      });
    }

    var categoryTabs = mount.querySelectorAll('[data-cie-pl-tab]');
    categoryTabs.forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.config.predefinedCategory) return;
        var categoryId = parsePositiveNumber(button.getAttribute('data-cie-pl-tab'), null);
        if (!categoryId || categoryId === state.selectedCategoryId) return;
        state.selectedCategoryId = categoryId;
        void loadProductsData(state);
      });
    });

    var suggestionButtons = mount.querySelectorAll('[data-cie-pl-suggestion]');
    suggestionButtons.forEach(function (button) {
      var pickSuggestion = function () {
        var index = parseNonNegativeNumber(button.getAttribute('data-cie-pl-suggestion'), null);
        if (index === null || !state.keywordResults[index]) return;
        var keyword = state.keywordResults[index];
        state.keywordResults = [];
        void selectKeyword(state, keyword);
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
        // When pointerdown already handled the selection, ignore the synthetic click.
        if (button.getAttribute('data-cie-pl-picked-by-pointer') === '1') {
          button.removeAttribute('data-cie-pl-picked-by-pointer');
          return;
        }
        pickSuggestion();
      });
    });

    var productCards = mount.querySelectorAll('[data-cie-pl-product-url]');
    productCards.forEach(function (card) {
      var url = card.getAttribute('data-cie-pl-product-url');
      if (!url) return;

      var openProduct = function () {
        window.open(url, '_blank', 'noopener');
      };

      card.addEventListener('click', function (event) {
        var target = event && event.target;
        if (target && typeof target.closest === 'function' && target.closest('a,button,input,select,textarea,label')) {
          return;
        }
        openProduct();
      });

      card.addEventListener('keydown', function (event) {
        if (!event) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProduct();
        }
      });
    });
  }

  async function initSection(root) {
    if (root.getAttribute('data-cie-products-list-init') === '1') {
      var existingState = root[STATE_KEY];
      if (existingState) {
        existingState.root = root;
        existingState.mount = ensureMount(root);
        existingState.config = resolveConfig(root);
        render(existingState);
        return;
      }
      // Legacy runtime sections may carry init flag without an attached state object.
      // Drop the flag and re-initialize with the current renderer.
      root.removeAttribute('data-cie-products-list-init');
    }
    root.setAttribute('data-cie-products-list-init', '1');

    var config = resolveConfig(root);
    var state = {
      root: root,
      mount: ensureMount(root),
      config: config,
      loading: false,
      initializing: true,
      hasResolvedProductRequest: false,
      error: '',
      products: [],
      categories: [],
      filters: null,
      allergens: [],
      query: '',
      keywordResults: [],
      predefinedCategoryMissing: false,
      selectedRefType: config.refType,
      selectedRefName: config.refName || '',
      selectedBakeryId: config.bakeryId,
      selectedCategoryId: config.categoryId
    };
    root[STATE_KEY] = state;

    if (config.mode === 'preset' && !config.refName && !config.bakeryId) {
      state.initializing = false;
      state.error = 'Products List preset mode requires data-cie-ref-name or data-cie-bakery-id.';
      render(state);
      return;
    }

    if (!state.selectedCategoryId && !config.predefinedCategory && config.mode === 'preset') {
      state.initializing = false;
      state.error = 'Products List preset mode requires data-cie-category-id or data-cie-predefined-category.';
      render(state);
      return;
    }

    render(state);

    try {
      if (state.selectedRefName || state.selectedBakeryId) {
        state.categories = await fetchCategories(state);
        applyCategorySelectionPolicy(state);
        markResolvedWhenNoProductRequest(state);
      }
      render(state);
      if (state.selectedCategoryId && (state.selectedRefName || state.selectedBakeryId)) {
        await loadProductsData(state);
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to initialize Products List.';
      render(state);
    } finally {
      markResolvedWhenNoProductRequest(state);
      state.initializing = false;
      render(state);
    }
  }

  function hydrate(root) {
    var host = root && root.querySelectorAll ? root : document;
    ensureStyles(document);
    var sections = host.querySelectorAll(COMPONENT_SELECTOR);
    sections.forEach(function (section) {
      void initSection(section);
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
