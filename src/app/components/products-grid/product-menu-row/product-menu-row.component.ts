import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IProduct, IProductSizeOption } from '../../../models/product.model';
import { ChooseCakeUIConfig } from '../../../models/ui-config.model';

@Component({
  selector: 'app-product-menu-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-menu-row.component.html',
  styleUrl: './product-menu-row.component.scss'
})
export class ProductMenuRowComponent {
  private static readonly MAX_VISIBLE_ALLERGENS = 3;

  @Input({ required: true }) product!: IProduct;
  @Input({ required: true }) cardsConfig!: ChooseCakeUIConfig['chooseCake']['cards'];
  @Input() pieceQuantities: Record<number, number> = {};

  @Output() increasePieceQty = new EventEmitter<number>();
  @Output() decreasePieceQty = new EventEmitter<number>();
  @Output() viewProduct = new EventEmitter<number>();

  private readonly priceFormatter = new Intl.NumberFormat('nb-NO');

  get descriptionText(): string {
    return this.product.descriptionText || 'Ingen beskrivelse tilgjengelig.';
  }

  get visibleAllergens(): string[] {
    return this.product.containsAllergenNames.slice(0, ProductMenuRowComponent.MAX_VISIBLE_ALLERGENS);
  }

  get hiddenAllergenCount(): number {
    const hidden = this.product.containsAllergenNames.length - this.visibleAllergens.length;
    return hidden > 0 ? hidden : 0;
  }

  get showFromLabel(): boolean {
    return this.cardsConfig.price.showFromLabel && !this.isPriceOnRequest;
  }

  get hasMultipleSizes(): boolean {
    return this.menuSizes.length > 1;
  }

  get menuSizes(): IProductSizeOption[] {
    return this.product.sizes ?? [];
  }

  get priceAmountText(): string {
    const min = this.product.minPrice;
    const max = this.product.maxPrice;

    if (this.isPriceOnRequest) {
      return 'Pris på forespørsel';
    }

    const minText = this.priceFormatter.format(min);
    const maxText = this.priceFormatter.format(max);
    const suffix = this.product.currencySymbol || 'kr';

    if (max > min) {
      return `${minText} - ${maxText} ${suffix}`;
    }

    return `${minText} ${suffix}`;
  }

  get ctaText(): string {
    const labelMode = this.cardsConfig.cta.labelMode;
    if (labelMode === 'order_now') {
      return 'Order now';
    }

    if (labelMode === 'view') {
      return 'View';
    }

    return 'Buy';
  }

  get detailLineText(): string {
    const details: string[] = [];

    if (this.product.pickupAvailable) {
      details.push('Hentes');
    }

    if (this.product.mailDeliveryAvailable) {
      details.push('Post');
    }

    if (this.product.canHasMotive) {
      details.push('Motiv');
    }

    if (this.product.canHasText) {
      details.push('Tekst');
    }

    if (!details.length) {
      return 'Detaljer tilgjengelig i bestilling';
    }

    return details.join(' · ');
  }

  get showPieceCounter(): boolean {
    return this.product.isPiecesLike;
  }

  getQuantity(productId: number): number {
    return this.pieceQuantities[productId] ?? 0;
  }

  getSizePriceText(size: IProductSizeOption): string {
    const amount = this.priceFormatter.format(size.price);
    const currency = this.product.currencySymbol || 'kr';
    return `${amount} ${currency}`;
  }

  onIncreasePieceQty(productId: number): void {
    this.increasePieceQty.emit(productId);
  }

  onDecreasePieceQty(productId: number): void {
    this.decreasePieceQty.emit(productId);
  }

  onViewProduct(): void {
    this.viewProduct.emit(this.product.id);
  }

  trackBySizeId(_index: number, size: IProductSizeOption): number {
    return size.id;
  }

  private get isPriceOnRequest(): boolean {
    return this.product.minPrice <= 0 && this.product.maxPrice <= 0;
  }
}
