import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PresetSwitcherComponent } from './components/preset-switcher/preset-switcher.component';
import { ShopHeaderComponent } from './components/shop-header/shop-header.component';
import { BAKERY_OPTIONS } from './config/bakeries.config';
import { BakeryKey } from './models/bakery.model';
import { ICartItem } from './models/product.model';
import { PresetKey } from './models/ui-config.model';
import { IBakeryHeaderLink } from './models/web-shop.model';
import { BakeryBrandingService } from './services/bakery-branding.service';
import { ProductsService } from './services/products.service';
import { UiConfigService } from './services/ui-config.service';
import { pickReadableText } from './utils/color-contrast.util';
import { getActiveBakeryOption, setStoredBakeryKey } from './utils/active-bakery.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, PresetSwitcherComponent, ShopHeaderComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  readonly bakeryBrandingService = inject(BakeryBrandingService);
  readonly productsService = inject(ProductsService);
  readonly uiConfigService = inject(UiConfigService);
  readonly bakeryOptions = BAKERY_OPTIONS;
  readonly activeBakery = getActiveBakeryOption();

  readonly presetOptions = this.uiConfigService.presetOptions;
  readonly currentYear = new Date().getFullYear();
  readonly brandingSettled = signal(false);

  ngOnInit(): void {
    this.uiConfigService.setPreset(this.activeBakery.defaultPreset);
    void this.loadBranding();
  }

  onPresetChanged(preset: PresetKey): void {
    this.uiConfigService.setPreset(preset);
  }

  onBakeryChanged(key: BakeryKey): void {
    if (key === this.activeBakery.key) {
      return;
    }

    setStoredBakeryKey(key);
    window.location.reload();
  }

  onSearchChanged(query: string): void {
    this.productsService.setSearchQuery(query);
  }

  get bakeryName(): string {
    return this.bakeryBrandingService.branding()?.bakeryName || 'Cake It Easy';
  }

  get logoUrl(): string {
    return this.bakeryBrandingService.branding()?.logoUrl || '';
  }

  get websiteUrl(): string {
    return this.bakeryBrandingService.branding()?.bakeryWebsite || '';
  }

  get websiteLabel(): string {
    const website = this.websiteUrl;
    if (!website) {
      return '';
    }

    return website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  get headerLinks(): IBakeryHeaderLink[] {
    return this.bakeryBrandingService.branding()?.headerLinks ?? [];
  }

  get notificationText(): string {
    return this.bakeryBrandingService.branding()?.notificationText || '';
  }

  get notificationBg(): string | null {
    return this.bakeryBrandingService.branding()?.notificationColor || null;
  }

  get notificationTextColor(): string | null {
    const notificationColor = this.bakeryBrandingService.branding()?.notificationColor;
    if (!notificationColor) {
      return null;
    }

    return pickReadableText(notificationColor);
  }

  get bakeryEmail(): string {
    return this.bakeryBrandingService.branding()?.bakeryEmail || '';
  }

  get bakeryPhone(): string {
    return this.bakeryBrandingService.branding()?.bakeryPhone || '';
  }

  get bakeryPhoneHref(): string {
    return this.bakeryPhone.replace(/\s+/g, '');
  }

  get cartQuantity(): number {
    return this.productsService.cartQuantity();
  }

  get cartBadgeText(): string {
    return this.cartQuantity > 99 ? '99+' : String(this.cartQuantity);
  }

  get cartItems(): ICartItem[] {
    return this.productsService.cartItems();
  }

  private async loadBranding(): Promise<void> {
    this.brandingSettled.set(false);

    try {
      await this.bakeryBrandingService.loadBranding();
    } catch (error) {
      console.error(error);
    } finally {
      this.uiConfigService.setBakeryBranding(this.bakeryBrandingService.branding());
      this.brandingSettled.set(true);
    }
  }
}
