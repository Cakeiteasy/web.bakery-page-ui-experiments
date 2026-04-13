import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BAKERY_OPTIONS } from './config/bakeries.config';
import { BakeryKey } from './models/bakery.model';
import { BakeryBrandingService } from './services/bakery-branding.service';
import { UiConfigService } from './services/ui-config.service';
import { getActiveBakeryOption, setStoredBakeryKey } from './utils/active-bakery.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  readonly bakeryBrandingService = inject(BakeryBrandingService);
  readonly uiConfigService = inject(UiConfigService);
  readonly bakeryOptions = BAKERY_OPTIONS;
  readonly activeBakery = getActiveBakeryOption();
  readonly brandingSettled = signal(false);

  ngOnInit(): void {
    this.uiConfigService.setPreset(this.activeBakery.defaultPreset);
    void this.loadBranding();
  }

  onBakeryChanged(key: BakeryKey): void {
    if (key === this.activeBakery.key) {
      return;
    }

    setStoredBakeryKey(key);
    window.location.reload();
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
