import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { IBakeryBranding, IWebShopResponseDto } from '../models/web-shop.model';
import { getActiveBakeryOption } from '../utils/active-bakery.util';

@Injectable({ providedIn: 'root' })
export class BakeryBrandingService {
  private readonly http = inject(HttpClient);
  private readonly bakery = getActiveBakeryOption();
  private readonly storeApiBase = `${this.bakery.api.proxyBase}/store`;

  readonly branding = signal<IBakeryBranding | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadBranding(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<IWebShopResponseDto>(`${this.storeApiBase}/bakeries/${this.bakery.api.webShopKey}/web-shop/`)
      );
      this.branding.set(this.mapBranding(response));
    } catch (error) {
      console.error(error);
      this.branding.set(null);
      this.error.set('Failed to load bakery branding.');
    } finally {
      this.loading.set(false);
    }
  }

  private mapBranding(payload: IWebShopResponseDto): IBakeryBranding {
    const theme = payload?.theme ?? {};
    const bakery = payload?.bakery ?? {};
    const bakeryWebsite = bakery.web_site_url?.trim() || '';
    const shopUrl = this.resolveShopUrl(payload?.shop_url, bakeryWebsite);
    const logoUrl = this.normalizeUrl(this.firstNonEmpty(theme.logo?.url, bakery.image?.small, bakery.image?.original));
    const faviconUrl = this.normalizeUrl(this.firstNonEmpty(theme.favicon?.url));

    const headerLinks = (theme.header_links_settings ?? [])
      .filter((link) => Boolean(link?.show) && Boolean(link?.text?.trim()))
      .map((link) => ({
        text: link.text!.trim(),
        type: (link.type ?? 'CUSTOM').trim() || 'CUSTOM',
        url: this.resolveHeaderLinkUrl(link.url, link.type, shopUrl)
      }));

    return {
      bakeryName: bakery.name?.trim() || this.bakery.name,
      bakeryWebsite,
      bakeryEmail: bakery.email?.trim() || '',
      bakeryPhone: bakery.phone?.trim() || '',
      logoUrl,
      faviconUrl,
      heroTitle: payload.title_web_shop?.trim() || 'Bakery Shop',
      heroSubtitle: payload.sub_text_web_shop?.trim() || '',
      notificationText: payload.notification_bar_banner_text?.trim() || '',
      notificationColor: payload.notification_bar_color?.trim() || '',
      notificationButtonColor: payload.notification_bar_button_color?.trim() || '',
      headerLinks,
      theme: {
        primary: theme.colors?.primary?.trim() || undefined,
        secondary: theme.colors?.secondary?.trim() || undefined,
        background: theme.colors?.background?.trim() || undefined,
        headerBg: theme.header?.bg_color?.trim() || undefined,
        headerText: theme.header?.text_color?.trim() || undefined,
        footerBg: theme.footer?.bg_color?.trim() || undefined,
        footerText: theme.footer?.text_color?.trim() || undefined
      }
    };
  }

  private normalizeUrl(url: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    return url;
  }

  private resolveShopUrl(shopUrl: string | null | undefined, bakeryWebsite: string): string {
    const trimmed = shopUrl?.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.startsWith('/')) {
      if (!bakeryWebsite) {
        return '';
      }

      return this.ensureTrailingSlash(new URL(trimmed, this.ensureTrailingSlash(bakeryWebsite)).toString());
    }

    return this.ensureTrailingSlash(this.normalizeUrl(trimmed));
  }

  private resolveHeaderLinkUrl(
    explicitUrl: string | null | undefined,
    linkType: string | null | undefined,
    shopUrl: string
  ): string | null {
    const trimmedExplicitUrl = explicitUrl?.trim();
    if (trimmedExplicitUrl) {
      return this.normalizeUrl(trimmedExplicitUrl);
    }

    if (!shopUrl) {
      return null;
    }

    const normalizedType = (linkType ?? '').trim().toUpperCase();
    if (normalizedType === 'DELIVERY') {
      return `${shopUrl}delivery-prices`;
    }

    if (normalizedType === 'OUTLET') {
      return `${shopUrl}outlets`;
    }

    if (normalizedType === 'LOGIN') {
      return `${shopUrl}login`;
    }

    return null;
  }

  private ensureTrailingSlash(url: string): string {
    if (!url) {
      return '';
    }

    return url.endsWith('/') ? url : `${url}/`;
  }

  private firstNonEmpty(...values: Array<string | null | undefined>): string {
    for (const value of values) {
      const trimmed = value?.trim();
      if (trimmed) {
        return trimmed;
      }
    }

    return '';
  }
}
