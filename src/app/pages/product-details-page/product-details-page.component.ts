import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { IProductDetails, IProductImageDto, IProductVariantOption } from '../../models/product.model';
import { ProductsService } from '../../services/products.service';
import { UiConfigService } from '../../services/ui-config.service';

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss'
})
export class ProductDetailsPageComponent implements OnInit {
  readonly productsService = inject(ProductsService);
  readonly uiConfigService = inject(UiConfigService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly priceFormatter = new Intl.NumberFormat('nb-NO');

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly details = signal<IProductDetails | null>(null);
  readonly selectedImageUrl = signal<string>('');

  readonly variants = computed<IProductVariantOption[]>(() => this.details()?.variants ?? []);
  readonly capabilityBadges = computed<string[]>(() => {
    const details = this.details();
    if (!details) {
      return [];
    }

    const badges: string[] = [];

    if (details.pickupAvailable) {
      badges.push('Hentes');
    }

    if (details.deliveryAvailable) {
      badges.push('Levering');
    }

    if (details.mailDeliveryAvailable) {
      badges.push('Post');
    }

    return badges;
  });

  readonly minDisplayPrice = computed<number>(() => {
    const details = this.details();
    if (!details) {
      return 0;
    }

    const variantPrices = details.variants.map((variant) => variant.price).filter((price) => price > 0);
    if (variantPrices.length) {
      return Math.min(...variantPrices);
    }

    return 0;
  });

  readonly maxDisplayPrice = computed<number>(() => {
    const details = this.details();
    if (!details) {
      return 0;
    }

    const variantPrices = details.variants.map((variant) => variant.price).filter((price) => price > 0);
    if (variantPrices.length) {
      return Math.max(...variantPrices);
    }

    return 0;
  });

  readonly hasMultipleVariants = computed<boolean>(() => this.variants().length > 1);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const productId = Number(params.get('productId'));

      if (!Number.isFinite(productId) || productId <= 0) {
        this.details.set(null);
        this.loading.set(false);
        this.error.set('Invalid product id.');
        return;
      }

      void this.loadProductDetails(productId);
    });
  }

  get descriptionHtml(): string {
    const details = this.details();
    return (details?.descriptionHtml ?? '').trim();
  }

  get descriptionText(): string {
    return this.details()?.descriptionText || 'Ingen beskrivelse tilgjengelig.';
  }

  get shouldRenderDescriptionHtml(): boolean {
    return this.descriptionHtml.length > 0;
  }

  get priceAmountText(): string {
    const details = this.details();
    if (!details) {
      return '';
    }

    const min = this.minDisplayPrice();
    const max = this.maxDisplayPrice();

    if (min <= 0 && max <= 0) {
      return 'Pris på forespørsel';
    }

    const minText = this.priceFormatter.format(min);
    const maxText = this.priceFormatter.format(max);
    const suffix = details.currencySymbol || 'kr';

    if (max > min) {
      return `${minText} - ${maxText} ${suffix}`;
    }

    return `${minText} ${suffix}`;
  }

  get showFromLabel(): boolean {
    const cardsConfig = this.uiConfigService.activeConfig().chooseCake.cards;
    const min = this.minDisplayPrice();
    const max = this.maxDisplayPrice();
    return cardsConfig.price.showFromLabel && (min > 0 || max > 0) && max > min;
  }

  get quantityRulesText(): string {
    const details = this.details();
    if (!details) {
      return '';
    }

    const rules: string[] = [];

    if (details.minQuantity !== null) {
      rules.push(`Min ${details.minQuantity}`);
    }

    if (details.maxQuantity !== null) {
      rules.push(`Maks ${details.maxQuantity}`);
    }

    if (details.increment > 1) {
      rules.push(`Steg ${details.increment}`);
    }

    return rules.join(' · ');
  }

  get variantCurrencySymbol(): string {
    return this.details()?.currencySymbol || 'kr';
  }

  getQuantity(itemId: number): number {
    return this.productsService.getPieceQty(itemId);
  }

  getVariantPriceText(variant: IProductVariantOption): string {
    const amount = this.priceFormatter.format(variant.price);
    return `${amount} ${this.variantCurrencySymbol}`;
  }

  onIncreasePieceQty(itemId: number): void {
    this.productsService.increasePieceQty(itemId);
  }

  onDecreasePieceQty(itemId: number): void {
    this.productsService.decreasePieceQty(itemId);
  }

  onBackToOverview(): void {
    void this.router.navigate(['/']);
  }

  onSelectImage(image: IProductImageDto): void {
    const imageUrl = image.small || image.original || '';
    this.selectedImageUrl.set(imageUrl);
  }

  trackByVariantId(_index: number, variant: IProductVariantOption): number {
    return variant.id;
  }

  trackByText(_index: number, value: string): string {
    return value;
  }

  trackByImage(_index: number, image: IProductImageDto): string {
    return image.original || image.small || `image-${_index}`;
  }

  private async loadProductDetails(productId: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.details.set(null);
    this.selectedImageUrl.set('');

    try {
      const details = await this.productsService.fetchProductDetailsById(productId);
      if (!details) {
        this.error.set('Product not found.');
        return;
      }

      this.details.set(details);
      this.selectedImageUrl.set(details.imageUrl || details.images[0]?.small || details.images[0]?.original || '');
    } catch (error) {
      console.error(error);
      this.error.set('Failed to load product details.');
    } finally {
      this.loading.set(false);
    }
  }
}
