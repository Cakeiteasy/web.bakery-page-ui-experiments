import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { PRESET_OPTIONS, PRESETS } from '../presets';
import { ChooseCakeUIConfig, PresetKey } from '../models/ui-config.model';
import { IBakeryBranding, IResolvedThemeTokens } from '../models/web-shop.model';
import {
  ensureTextContrast,
  mixHexColors,
  normalizeHexColor,
  pickReadableText
} from '../utils/color-contrast.util';

@Injectable({ providedIn: 'root' })
export class UiConfigService {
  private readonly document = inject(DOCUMENT);
  private readonly loadedFonts = new Set<string>();

  readonly presetOptions = PRESET_OPTIONS;
  readonly activePresetKey = signal<PresetKey>('rosenborgbakeri');
  readonly activeConfig = computed<ChooseCakeUIConfig>(() => PRESETS[this.activePresetKey()]);
  readonly bakeryBranding = signal<IBakeryBranding | null>(null);

  constructor() {
    effect(() => {
      const key = this.activePresetKey();
      const config = PRESETS[key];
      const branding = this.bakeryBranding();

      this.applyTheme(config, key, branding);
      this.applyTypography(config);
      this.applyFavicon(branding);
    });
  }

  setPreset(key: PresetKey): void {
    if (this.activePresetKey() === key) {
      return;
    }

    this.activePresetKey.set(key);
  }

  setBakeryBranding(branding: IBakeryBranding | null): void {
    this.bakeryBranding.set(branding);
  }

  applyTheme(
    config: ChooseCakeUIConfig,
    presetKey: PresetKey = this.activePresetKey(),
    branding: IBakeryBranding | null = this.bakeryBranding()
  ): void {
    const root = this.document.documentElement;
    const tokens = this.resolveThemeTokens(config, presetKey, branding);
    const radii = this.resolveRadiusTokens(presetKey, config);

    root.style.setProperty('--primary', tokens.primary);
    root.style.setProperty('--secondary', tokens.secondary);
    root.style.setProperty('--page-bg', tokens.pageBg);
    root.style.setProperty('--surface', tokens.surface);
    root.style.setProperty('--text-primary', tokens.textPrimary);
    root.style.setProperty('--text-muted', tokens.textMuted);
    root.style.setProperty('--border', tokens.border);
    root.style.setProperty('--on-primary', tokens.onPrimary);
    root.style.setProperty('--on-secondary', tokens.onSecondary);
    root.style.setProperty('--header-bg', tokens.headerBg);
    root.style.setProperty('--header-text', tokens.headerText);
    root.style.setProperty('--footer-bg', tokens.footerBg);
    root.style.setProperty('--footer-text', tokens.footerText);
    root.style.setProperty('--hero-accent', tokens.heroAccent);
    root.style.setProperty('--radius-xs', radii.xs);
    root.style.setProperty('--radius-sm', radii.sm);
    root.style.setProperty('--radius-md', radii.md);
    root.style.setProperty('--radius-lg', radii.lg);
    root.style.setProperty('--radius-pill', radii.pill);

    root.style.colorScheme = presetKey === 'dark_luxury' ? 'dark' : 'light';
  }

  resolveThemeTokens(
    config: ChooseCakeUIConfig,
    presetKey: PresetKey,
    branding: IBakeryBranding | null
  ): IResolvedThemeTokens {
    const baseColors = config.chooseCake.colors;
    const useBakeryPalette = presetKey === 'rosenborgbakeri' && Boolean(branding);

    const primary = normalizeHexColor(
      useBakeryPalette ? branding?.theme.primary ?? '' : baseColors.primary,
      baseColors.primary
    );
    const secondary = normalizeHexColor(
      useBakeryPalette ? branding?.theme.secondary ?? '' : baseColors.secondary,
      baseColors.secondary
    );
    const pageBg = normalizeHexColor(
      useBakeryPalette ? branding?.theme.background ?? '' : baseColors.pageBackground,
      baseColors.pageBackground
    );
    const surface = normalizeHexColor(
      useBakeryPalette ? mixHexColors(pageBg, '#ffffff', 0.92) : baseColors.surface,
      mixHexColors(pageBg, '#ffffff', 0.9)
    );
    const textPrimary = ensureTextContrast(baseColors.textPrimary, pageBg, 4.5);
    const textMutedBase = normalizeHexColor(baseColors.textMuted, mixHexColors(textPrimary, pageBg, 0.58));
    const textMuted = ensureTextContrast(textMutedBase, pageBg, 3.5);
    const borderBase = normalizeHexColor(baseColors.border, mixHexColors(textPrimary, pageBg, 0.18));
    const border = ensureTextContrast(borderBase, pageBg, 1.35);

    const headerBg = normalizeHexColor(useBakeryPalette ? branding?.theme.headerBg ?? '' : pageBg, pageBg);
    const headerText = ensureTextContrast(
      useBakeryPalette ? branding?.theme.headerText ?? textPrimary : textPrimary,
      headerBg,
      4.5
    );
    const footerBg = normalizeHexColor(
      useBakeryPalette ? branding?.theme.footerBg ?? '' : mixHexColors(pageBg, textPrimary, 0.2),
      mixHexColors(textPrimary, '#000000', 0.6)
    );
    const footerText = ensureTextContrast(
      useBakeryPalette ? branding?.theme.footerText ?? '#ffffff' : textPrimary,
      footerBg,
      4.5
    );

    return {
      primary,
      secondary,
      pageBg,
      surface,
      textPrimary,
      textMuted,
      border,
      onPrimary: pickReadableText(primary),
      onSecondary: pickReadableText(secondary),
      headerBg,
      headerText,
      footerBg,
      footerText,
      heroAccent: mixHexColors(primary, secondary, 0.75)
    };
  }

  private resolveRadiusTokens(
    presetKey: PresetKey,
    config: ChooseCakeUIConfig
  ): { xs: string; sm: string; md: string; lg: string; pill: string } {
    if (presetKey === 'mono_brutal') {
      return {
        xs: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        pill: '0px'
      };
    }

    const cardRadius = Math.max(0, config.chooseCake.cards.image.cornerRadiusPx || 8);

    return {
      xs: `${Math.min(cardRadius, 4)}px`,
      sm: `${Math.max(4, Math.min(cardRadius, 8))}px`,
      md: `${Math.max(8, Math.min(cardRadius + 4, 14))}px`,
      lg: `${Math.max(10, Math.min(cardRadius + 8, 18))}px`,
      pill: '999px'
    };
  }

  private applyTypography(config: ChooseCakeUIConfig): void {
    const root = this.document.documentElement;
    const typography = config.chooseCake.typography;

    root.style.setProperty('--font-body', typography.bodyFontFamily);
    root.style.setProperty('--font-heading', typography.headingFontFamily);

    if (!typography.googleFontHref) {
      return;
    }

    if (this.loadedFonts.has(typography.googleFontHref)) {
      return;
    }

    const existing = Array.from(this.document.querySelectorAll('link[rel="stylesheet"]')).find(
      (node) => (node as HTMLLinkElement).href === typography.googleFontHref
    );

    if (existing) {
      this.loadedFonts.add(typography.googleFontHref);
      return;
    }

    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = typography.googleFontHref;
    link.crossOrigin = 'anonymous';
    this.document.head.appendChild(link);

    this.loadedFonts.add(typography.googleFontHref);
  }

  private applyFavicon(branding: IBakeryBranding | null): void {
    if (!branding?.faviconUrl) {
      return;
    }

    let favicon = this.document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!favicon) {
      favicon = this.document.createElement('link');
      favicon.rel = 'icon';
      this.document.head.appendChild(favicon);
    }

    if (favicon.href === branding.faviconUrl) {
      return;
    }

    favicon.href = branding.faviconUrl;
  }
}
