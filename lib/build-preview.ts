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

/* ── Shared utilities ───────────────────────── */
.lp-eyebrow {
  font-family: var(--lp-sans);
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--lp-primary);
  margin: 0 0 .6rem;
}
.lp-eyebrow--center { text-align: center; }

.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  font-family: var(--lp-sans);
  font-size: .9rem;
  font-weight: 700;
  border-radius: 999px;
  padding: .7rem 1.5rem;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  transition: transform .18s ease, box-shadow .18s ease;
  white-space: nowrap;
}
.lp-btn:hover { transform: translateY(-2px); }

.lp-btn--primary {
  background: linear-gradient(135deg, var(--lp-primary) 0%, var(--lp-primary-mid) 100%);
  color: #fff;
  box-shadow: var(--lp-shadow-primary);
}
.lp-btn--primary:hover { box-shadow: 0 12px 40px rgba(255,51,153,.36); }

.lp-btn--outline {
  background: transparent;
  border: 2px solid var(--lp-primary);
  color: var(--lp-primary);
}
.lp-btn--outline:hover { background: var(--lp-primary-faint); }

.lp-btn--white {
  background: #fff;
  color: var(--lp-text);
  box-shadow: var(--lp-shadow);
}

.lp-btn--lg { padding: .9rem 2.2rem; font-size: 1rem; }

/* Entrance animation */
.lp-hero, .lp-trust, .lp-stats-bar, .lp-props, .lp-how,
.lp-showcase, .lp-proof, .lp-guarantee,
.lp-faq, .lp-cta-final {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity .55s ease, transform .55s ease;
}
.lp-hero.in-view, .lp-trust.in-view, .lp-stats-bar.in-view, .lp-props.in-view, .lp-how.in-view,
.lp-showcase.in-view, .lp-proof.in-view, .lp-guarantee.in-view,
.lp-faq.in-view, .lp-cta-final.in-view {
  opacity: 1;
  transform: none;
}

/* ── HERO ───────────────────────────────────── */
/* Prevent float card's negative left from creating horizontal scroll */
.lp-hero {
  background:
    radial-gradient(ellipse 65% 55% at 100% 0%, rgba(255,51,153,.1) 0%, transparent 55%),
    radial-gradient(ellipse 40% 50% at 0% 100%, rgba(200,155,90,.07) 0%, transparent 50%),
    var(--lp-cream);
  padding: clamp(2.5rem,5vw,4.5rem) 0 clamp(3rem,6vw,5rem);
}
.lp-hero__inner {
  width: var(--lp-w);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: clamp(2rem,4vw,4rem);
  align-items: center;
}
.lp-hero__h1 {
  font-family: var(--lp-serif);
  font-size: clamp(2.4rem,5.5vw,3.8rem);
  font-weight: 700;
  line-height: 1.06;
  letter-spacing: -.01em;
  margin: 0;
  color: var(--lp-text);
}
.lp-hero__h1 em {
  font-style: italic;
  color: var(--lp-primary);
}
.lp-hero__sub {
  margin: 1rem 0 0;
  color: var(--lp-muted);
  font-size: clamp(.95rem,1.4vw,1.05rem);
  line-height: 1.65;
  max-width: 50ch;
}
.lp-hero__cta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-top: 1.6rem;
}
.lp-hero__rating {
  display: flex;
  align-items: center;
  gap: .45rem;
  margin-top:0.5rem;
  font-size: .84rem;
  color: var(--lp-muted);
}
.lp-stars { color: var(--lp-gold); letter-spacing: .05em; }
.lp-hero__rating strong { color: var(--lp-text); }

.lp-hero__visual { position: relative; }

.lp-hero__img-wrap {
  position: relative;
  border-radius: var(--lp-r-xl);
  overflow: hidden;   /* clips image corners AND float card — card stays inside bounds */
  box-shadow: 0 24px 60px rgba(42,32,24,.16);
}
.lp-hero__img-wrap img {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 440px;
}
/* Float card lives inside img-wrap so position: relative on img-wrap anchors it */
.lp-hero__float-card {
  position: absolute;
  bottom: 1.1rem;
  left: 1rem;
  background: #fff;
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-r-md);
  padding: .65rem .9rem;
  display: flex;
  align-items: center;
  gap: .65rem;
  box-shadow: var(--lp-shadow);
}
.lp-hero__float-icon { font-size: 1.6rem; line-height: 1; }
.lp-hero__float-card strong { display: block; font-size: .82rem; }
.lp-hero__float-card span { font-size: .72rem; color: var(--lp-muted); }

/* ── TRUST BAR ──────────────────────────────── */
.lp-trust {
  background: var(--lp-warm);
  border-top: 1px solid var(--lp-border);
  border-bottom: 1px solid var(--lp-border);
  padding: 1.1rem 0;
}
.lp-trust__inner {
  width: var(--lp-w);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}
.lp-trust__label {
  font-size: .75rem;
  text-transform: uppercase;
  letter-spacing: .09em;
  font-weight: 700;
  color: var(--lp-muted);
  white-space: nowrap;
  margin: 0;
}
.lp-trust__logos {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem .2rem;
}
.lp-trust__logo-item {
  font-size: .84rem;
  font-weight: 700;
  color: var(--lp-text);
}
.lp-trust__sep {
  color: var(--lp-border);
  font-size: 1rem;
  padding: 0 .2rem;
}

/* ── STATS BAR ──────────────────────────────── */
.lp-stats-bar {
  background: var(--lp-white);
  border-bottom: 1px solid var(--lp-border);
  padding: 2rem 0;
}
.lp-stats-bar__inner {
  width: var(--lp-w);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}
.lp-stat-item {
  flex: 1;
  text-align: center;
  padding: .5rem 1rem;
}
.lp-stat-item__divider {
  width: 1px;
  height: 2.5rem;
  background: var(--lp-border);
  flex-shrink: 0;
}
.lp-stat-item .lp-stat__num {
  display: block;
  font-family: var(--lp-serif);
  font-size: clamp(1.7rem,2.5vw,2.2rem);
  font-weight: 700;
  color: var(--lp-primary);
  line-height: 1;
}
.lp-stat-item span {
  display: block;
  margin-top: .3rem;
  font-size: .75rem;
  font-weight: 600;
  color: var(--lp-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
}

/* ── VALUE PROPS ────────────────────────────── */
.lp-props {
  padding: var(--lp-gap) 0;
  background: var(--lp-white);
}
.lp-props__inner {
  width: var(--lp-w);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.lp-prop {
  background: var(--lp-cream);
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-r-lg);
  padding: 1.6rem 1.4rem;
  transition: transform .2s ease, box-shadow .2s ease;
}
.lp-prop:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 36px rgba(42,32,24,.1);
}
.lp-prop__icon { font-size: 1.8rem; line-height: 1; margin-bottom: .75rem; }
.lp-prop h3 { margin: 0 0 .5rem; font-size: 1rem; font-weight: 700; }
.lp-prop p { margin: 0; font-size: .88rem; color: var(--lp-muted); line-height: 1.6; }

/* ── HOW IT WORKS ───────────────────────────── */
.lp-how {
  padding: var(--lp-gap) 0;
  background: var(--lp-warm);
}
.lp-how__inner { width: var(--lp-w); margin: 0 auto; }
.lp-how__header { margin-bottom: 2.5rem; }
.lp-how__header h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.8rem,3vw,2.5rem);
  font-weight: 700;
  line-height: 1.2;
  margin: .4rem 0 0;
  color: var(--lp-text);
}
.lp-how__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.lp-step {
  background: var(--lp-white);
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-r-lg);
  padding: 1.8rem 1.6rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: .9rem;
  transition: transform .2s ease, box-shadow .2s ease;
}
.lp-step:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 36px rgba(42,32,24,.09);
}
.lp-step__illo {
  width: 72px;
  height: 72px;
}
.lp-step__illo svg { width: 100%; height: 100%; display: block; }
.lp-step__num {
  font-family: var(--lp-sans);
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .12em;
  color: var(--lp-primary);
  text-transform: uppercase;
}
.lp-step__body h3 { margin: 0 0 .35rem; font-size: 1rem; font-weight: 700; color: var(--lp-text); }
.lp-step__body p { margin: 0; font-size: .87rem; color: var(--lp-muted); line-height: 1.55; }
.lp-how__cta { margin-top: 2.5rem; }

/* ── SHOWCASE ───────────────────────────────── */
.lp-showcase {
  padding: var(--lp-gap) 0;
  background: var(--lp-white);
}
.lp-showcase__inner { width: var(--lp-w); margin: 0 auto; }
.lp-showcase__h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.8rem,3vw,2.4rem);
  font-weight: 700;
  text-align: center;
  margin: .4rem 0 2rem;
  color: var(--lp-text);
}
.lp-showcase__grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  grid-template-rows: repeat(3, 1fr);
  gap: .8rem;
}
.lp-cat {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: var(--lp-r-lg);
  text-decoration: none;
  background: var(--lp-warm);
  cursor: pointer;
}
.lp-cat img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .4s ease;
  min-height: 160px;
}
.lp-cat:hover img { transform: scale(1.04); }
.lp-cat--large { grid-row: 1 / 4; }
.lp-cat--large img { min-height: 100%; height: 100%; }
.lp-cat__label {
  position: absolute;
  bottom: .75rem;
  left: .75rem;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(4px);
  border-radius: 999px;
  padding: .3rem .75rem;
  font-size: .8rem;
  font-weight: 700;
  color: var(--lp-text);
  border: 1px solid rgba(255,255,255,.6);
}

/* ── TESTIMONIALS ───────────────────────────── */
.lp-proof {
  padding: var(--lp-gap) 0;
  background: var(--lp-warm);
}
.lp-proof__inner { width: var(--lp-w); margin: 0 auto; }
.lp-proof__header { margin-bottom: 2.5rem; }
.lp-proof__header h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.8rem,3vw,2.4rem);
  font-weight: 700;
  line-height: 1.2;
  margin: .4rem 0 0;
  color: var(--lp-text);
}

.lp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 3rem;
}
.lp-stat {
  background: var(--lp-white);
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-r-md);
  padding: 1.3rem 1rem;
  text-align: center;
  box-shadow: var(--lp-shadow);
}
.lp-stat__num {
  display: block;
  font-family: var(--lp-serif);
  font-size: clamp(1.7rem,2.5vw,2.2rem);
  font-weight: 700;
  color: var(--lp-primary);
  line-height: 1;
}
.lp-stat span {
  display: block;
  margin-top: .4rem;
  font-size: .78rem;
  font-weight: 600;
  color: var(--lp-muted);
  text-transform: uppercase;
  letter-spacing: .05em;
}

.lp-testimonials {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.lp-tcard {
  background: var(--lp-white);
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-r-lg);
  padding: 1.4rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: .8rem;
  box-shadow: var(--lp-shadow);
}
.lp-tcard__stars { color: var(--lp-gold); letter-spacing: .08em; font-size: .88rem; }
.lp-tcard blockquote {
  margin: 0;
  font-size: .9rem;
  line-height: 1.65;
  color: var(--lp-text);
  flex: 1;
}
.lp-tcard footer {
  display: flex;
  align-items: center;
  gap: .7rem;
  margin-top: auto;
}
.lp-tcard__av {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--lp-primary) 0%, var(--lp-primary-mid) 100%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: .68rem;
  font-weight: 700;
  flex-shrink: 0;
}
.lp-tcard strong { display: block; font-size: .84rem; }
.lp-tcard small { font-size: .74rem; color: var(--lp-muted); }

/* ── GUARANTEE ──────────────────────────────── */
.lp-guarantee {
  background: var(--lp-dark);
  padding: clamp(2.5rem,4vw,4rem) 0;
}
.lp-guarantee__inner {
  width: var(--lp-w);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}
.lp-guarantee__icon { font-size: 2.8rem; line-height: 1; flex-shrink: 0; }
.lp-guarantee__copy { flex: 1; min-width: 220px; }
.lp-guarantee__copy h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.4rem,2.2vw,1.8rem);
  font-weight: 700;
  color: #fff;
  margin: 0 0 .5rem;
  line-height: 1.22;
}
.lp-guarantee__copy p {
  margin: 0;
  font-size: .92rem;
  color: rgba(255,255,255,.65);
  line-height: 1.6;
  max-width: 50ch;
}

/* ── FAQ ────────────────────────────────────── */
.lp-faq {
  padding: var(--lp-gap) 0;
  background: var(--lp-white);
}
.lp-faq__inner { width: var(--lp-w); margin: 0 auto; text-align: center; }
.lp-faq h2 {
  font-family: var(--lp-serif);
  font-size: clamp(1.7rem,2.8vw,2.2rem);
  font-weight: 700;
  margin: .4rem 0 1.8rem;
  color: var(--lp-text);
}
.lp-faq__list { display: grid; gap: .55rem; max-width: 700px; margin: 0 auto; text-align: left; }
.lp-faq__item {
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-r-md);
  background: var(--lp-cream);
  overflow: hidden;
}
.lp-faq__item[open] { box-shadow: var(--lp-shadow); }
.lp-faq__item > summary {
  cursor: pointer;
  list-style: none;
  padding: .9rem 1rem;
  font-weight: 700;
  font-size: .94rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  user-select: none;
}
.lp-faq__item > summary::-webkit-details-marker { display: none; }
.lp-faq__item > summary::after {
  content: '+';
  flex-shrink: 0;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  background: var(--lp-primary-faint);
  color: var(--lp-primary);
  display: grid;
  place-items: center;
  font-size: .95rem;
  font-weight: 400;
  line-height: 1;
}
.lp-faq__item[open] > summary::after {
  content: '−';
  background: var(--lp-primary);
  color: #fff;
}
.lp-faq__item > p {
  margin: 0;
  padding: 0 1rem .9rem;
  font-size: .9rem;
  color: var(--lp-muted);
  line-height: 1.65;
}

/* ── FINAL CTA ──────────────────────────────── */
.lp-cta-final {
  padding: var(--lp-gap) 0 calc(var(--lp-gap) * 1.2);
  background:
    radial-gradient(ellipse 55% 70% at 50% 50%, rgba(255,51,153,.08) 0%, transparent 65%),
    var(--lp-cream);
  text-align: center;
}
.lp-cta-final__inner { width: var(--lp-w); margin: 0 auto; }
.lp-cta-final h2 {
  font-family: var(--lp-serif);
  font-size: clamp(2rem,3.8vw,2.9rem);
  font-weight: 700;
  color: var(--lp-text);
  margin: 0 0 .75rem;
  line-height: 1.18;
}
.lp-cta-final > .lp-cta-final__inner > p {
  color: var(--lp-muted);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1.8rem;
}
.lp-cta-final__note {
  margin: 1rem 0 0 !important;
  font-size: .78rem !important;
  color: var(--lp-muted) !important;
}

/* ── RESPONSIVE ─────────────────────────────── */
@media (max-width: 900px) {
  .lp-hero__inner { grid-template-columns: 1fr; }
  .lp-hero__visual { order: -1; }
  .lp-hero__img-wrap img { max-height: 300px; }
  .lp-hero__float-card { left: .75rem; }

  .lp-props__inner { grid-template-columns: 1fr; gap: 1rem; }

  .lp-how__steps { grid-template-columns: 1fr; }

  .lp-showcase__grid { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
  .lp-cat--large { grid-row: auto; grid-column: 1 / 3; }

  .lp-stats { grid-template-columns: 1fr 1fr; }
  .lp-testimonials { grid-template-columns: 1fr; }

  .lp-guarantee__inner { flex-direction: column; align-items: flex-start; gap: 1.2rem; }
}

@media (max-width: 600px) {
  .lp-stats { grid-template-columns: 1fr 1fr; }
  .lp-showcase__grid { grid-template-columns: 1fr; }
  .lp-trust__inner { flex-direction: column; align-items: flex-start; gap: .5rem; }
}
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a standalone, publishable HTML document for a given page.
 * Does NOT include any BWAI editor scripts — this is the clean public version.
 */
export function buildPublishedDocument(files: BwaiFiles, seo: BwaiSeoMeta = {}, hiddenSections: string[] = []): string {
  const title = seo.title ?? 'Cake it Easy';
  const description = seo.description ?? '';
  const ogTitle = seo.ogTitle ?? title;
  const ogDescription = seo.ogDescription ?? description;
  const ogImage = seo.ogImageUrl ?? '';

  const safeCss = files.css.replace(/<\/style>/gi, '<\\/style>');
  const safeJs = files.js.replace(/<\/script>/gi, '<\\/script>');
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
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
    <style>${STATIC_SHELL_CSS}</style>
    <style id="BuildWithAiContentStyle">${safeCss}</style>${hiddenCss ? `\n    <style>${hiddenCss}</style>` : ''}
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
