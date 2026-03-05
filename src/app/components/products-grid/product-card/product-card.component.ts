import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ProductsViewMode } from '../../../models/filter.model';
import { IProduct } from '../../../models/product.model';
import { ChooseCakeUIConfig, ImageFit } from '../../../models/ui-config.model';

interface IProductBadge {
  key: 'takeaway' | 'post' | 'motive' | 'text';
  label: string;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  private static readonly ENTRY_DURATION_MS = 220;
  private static readonly STAGGER_STEP_MS = 20;
  private static readonly MAX_STAGGER_INDEX = 8;
  private static readonly MAX_STAGGER_DELAY_MS = 160;
  private static readonly ROSENBORG_PORTRAIT_RATIO = '0.678';
  private static readonly GLOBAL_PORTRAIT_RATIO = '3 / 4';
  private static readonly GLOBAL_LANDSCAPE_RATIO = '4 / 3';
  private static readonly DEFAULT_UNIFORM_RATIO = '4 / 5';
  private static readonly MAX_BADGES = 3;
  private static readonly HOVER_TRANSLATE_PX = 7;
  private static readonly HOVER_SCALE = 1.08;

  @Input({ required: true }) product!: IProduct;
  @Input({ required: true }) cardsConfig!: ChooseCakeUIConfig['chooseCake']['cards'];
  @Input() index = 0;
  @Input() viewMode: ProductsViewMode = 'grid';
  @Input() quantity = 0;

  @Output() increasePieceQty = new EventEmitter<number>();
  @Output() decreasePieceQty = new EventEmitter<number>();
  @Output() viewProduct = new EventEmitter<number>();

  private readonly priceFormatter = new Intl.NumberFormat('nb-NO');
  private readonly reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private readonly finePointer =
    typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  private pointerX = 0;
  private pointerY = 0;
  private hoverActive = false;

  get cardShadow(): string {
    const shadowStyle = this.cardsConfig.frame?.shadowStyle;
    if (shadowStyle === 'hard_offset') {
      return `6px 6px 0 ${this.cardsConfig.frame?.borderColor || '#111111'}`;
    }

    if (shadowStyle === 'soft') {
      return '0 10px 26px rgba(0, 0, 0, 0.16)';
    }

    return 'none';
  }

  get cardAnimationClass(): string {
    const entry = this.cardsConfig.motion.entry;
    if (entry === 'fly_in') {
      return 'entry-fly-in';
    }

    if (entry === 'fade_up') {
      return 'entry-fade-up';
    }

    return 'entry-none';
  }

  get animationDelayMs(): number {
    if (!this.cardsConfig.motion.stagger || this.cardsConfig.motion.entry === 'none') {
      return 0;
    }

    const boundedIndex = Math.max(0, Math.min(this.index, ProductCardComponent.MAX_STAGGER_INDEX));
    const delay = boundedIndex * ProductCardComponent.STAGGER_STEP_MS;

    return Math.min(delay, ProductCardComponent.MAX_STAGGER_DELAY_MS);
  }

  get animationDurationMs(): number {
    if (this.cardsConfig.motion.entry === 'none') {
      return 0;
    }

    return ProductCardComponent.ENTRY_DURATION_MS;
  }

  get badges(): IProductBadge[] {
    const badges: IProductBadge[] = [];

    if (this.product.pickupAvailable) {
      badges.push({ key: 'takeaway', label: 'Hentes' });
    }

    if (this.product.mailDeliveryAvailable) {
      badges.push({ key: 'post', label: 'Post' });
    }

    if (this.product.canHasMotive) {
      badges.push({ key: 'motive', label: 'Motiv' });
    }

    if (this.product.canHasText) {
      badges.push({ key: 'text', label: 'Tekst' });
    }

    return badges.slice(0, ProductCardComponent.MAX_BADGES);
  }

  get showFromLabel(): boolean {
    return this.cardsConfig.price.showFromLabel && !this.isPriceOnRequest;
  }

  get priceAmountText(): string {
    const min = this.product.minPrice;
    const max = this.product.maxPrice;

    if (min <= 0 && max <= 0) {
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

  get hasFullOverlay(): boolean {
    return this.cardsConfig.overlay.desktop === 'full_overlay';
  }

  get overlayOpacity(): number {
    return this.cardsConfig.overlay.overlayOpacity ?? (this.hasFullOverlay ? 0.72 : 0.45);
  }

  get mediaAspectRatio(): string {
    if (this.isUniformGridMode) {
      return this.getUniformRatio();
    }

    if (this.product.imageOrientation === 'portrait') {
      if (this.cardsConfig.image.ratioMode === 'orientation' && this.isRosenborgAspectPreset) {
        return ProductCardComponent.ROSENBORG_PORTRAIT_RATIO;
      }

      return ProductCardComponent.GLOBAL_PORTRAIT_RATIO;
    }

    if (this.product.imageOrientation === 'landscape') {
      return ProductCardComponent.GLOBAL_LANDSCAPE_RATIO;
    }

    return this.getUniformRatio();
  }

  get mediaObjectFit(): ImageFit {
    if (this.product.imageOrientation === 'portrait') {
      return 'contain';
    }

    return this.cardsConfig.image.fit;
  }

  get showPieceCounter(): boolean {
    return this.product.isPiecesLike;
  }

  get isListMode(): boolean {
    return this.viewMode === 'list';
  }

  get hasHoverMotion(): boolean {
    return this.finePointer && !this.reducedMotion;
  }

  get imageTransform(): string {
    if (!this.hasHoverMotion || !this.hoverActive) {
      return 'translate3d(0px, 0px, 0px) scale(1)';
    }

    return `translate3d(${this.pointerX}px, ${this.pointerY}px, 0px) scale(${ProductCardComponent.HOVER_SCALE})`;
  }

  trackByBadge(_index: number, badge: IProductBadge): string {
    return badge.key;
  }

  onIncreasePieceQty(): void {
    this.increasePieceQty.emit(this.product.id);
  }

  onDecreasePieceQty(): void {
    this.decreasePieceQty.emit(this.product.id);
  }

  onViewProduct(): void {
    this.viewProduct.emit(this.product.id);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.hasHoverMotion || event.pointerType === 'touch') {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const normalizedX = (event.clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (event.clientY - rect.top) / rect.height - 0.5;
    this.pointerX = Math.max(-1, Math.min(1, normalizedX * 2)) * ProductCardComponent.HOVER_TRANSLATE_PX;
    this.pointerY = Math.max(-1, Math.min(1, normalizedY * 2)) * ProductCardComponent.HOVER_TRANSLATE_PX;
    this.hoverActive = true;
  }

  onPointerLeave(): void {
    this.pointerX = 0;
    this.pointerY = 0;
    this.hoverActive = false;
  }

  private get isUniformGridMode(): boolean {
    return this.viewMode === 'grid' && this.cardsConfig.grid.mode === 'uniform';
  }

  private get isPriceOnRequest(): boolean {
    return this.product.minPrice <= 0 && this.product.maxPrice <= 0;
  }

  private getUniformRatio(): string {
    const uniformRatio = this.cardsConfig.image.uniformRatio;
    if (uniformRatio) {
      return uniformRatio.replace(':', ' / ');
    }

    return ProductCardComponent.DEFAULT_UNIFORM_RATIO;
  }

  private get isRosenborgAspectPreset(): boolean {
    return this.cardsConfig.preset === 'masonry_classic';
  }
}
