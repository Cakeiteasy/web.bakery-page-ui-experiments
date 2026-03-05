import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ProductsViewMode } from '../../models/filter.model';
import { IProduct } from '../../models/product.model';
import { ChooseCakeUIConfig } from '../../models/ui-config.model';
import { ProductCardComponent } from './product-card/product-card.component';
import { ProductMenuRowComponent } from './product-menu-row/product-menu-row.component';

@Component({
  selector: 'app-products-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, ProductMenuRowComponent],
  templateUrl: './products-grid.component.html',
  styleUrl: './products-grid.component.scss'
})
export class ProductsGridComponent {
  @Input() products: IProduct[] = [];
  @Input() cardsConfig!: ChooseCakeUIConfig['chooseCake']['cards'];
  @Input() viewMode: ProductsViewMode = 'grid';
  @Input() loading = false;
  @Input() pieceQuantities: Record<number, number> = {};

  @Output() increasePieceQty = new EventEmitter<number>();
  @Output() decreasePieceQty = new EventEmitter<number>();
  @Output() viewProduct = new EventEmitter<number>();

  trackByProductId(_index: number, product: IProduct): number {
    return product.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  get isMasonry(): boolean {
    return this.cardsConfig.grid.mode === 'masonry';
  }

  get isListMode(): boolean {
    return this.viewMode === 'list';
  }

  get isMenuMode(): boolean {
    return this.viewMode === 'menu';
  }

  get gridSkeletonIndexes(): number[] {
    const desktopColumns = this.cardsConfig?.grid.desktopColumns ?? 3;
    const count = Math.max(6, desktopColumns * 2);
    return Array.from({ length: count }, (_value, index) => index);
  }

  get listSkeletonIndexes(): number[] {
    return Array.from({ length: 6 }, (_value, index) => index);
  }

  get menuSkeletonIndexes(): number[] {
    return Array.from({ length: 8 }, (_value, index) => index);
  }

  getPieceQty(productId: number): number {
    return this.pieceQuantities[productId] ?? 0;
  }

  onIncreasePieceQty(productId: number): void {
    this.increasePieceQty.emit(productId);
  }

  onDecreasePieceQty(productId: number): void {
    this.decreasePieceQty.emit(productId);
  }

  onViewProduct(productId: number): void {
    this.viewProduct.emit(productId);
  }
}
