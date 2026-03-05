import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { CategoriesBarComponent } from '../../components/categories-bar/categories-bar.component';
import { FilterPanelComponent } from '../../components/filter-panel/filter-panel.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { MotiveMode, ProductsViewMode } from '../../models/filter.model';
import { ProductsService } from '../../services/products.service';
import { UiConfigService } from '../../services/ui-config.service';

@Component({
  selector: 'app-products-overview-page',
  standalone: true,
  imports: [CommonModule, CategoriesBarComponent, FilterPanelComponent, ProductsGridComponent],
  templateUrl: './products-overview-page.component.html',
  styleUrl: './products-overview-page.component.scss'
})
export class ProductsOverviewPageComponent implements OnInit {
  readonly productsService = inject(ProductsService);
  readonly uiConfigService = inject(UiConfigService);

  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    if (this.productsService.categories().length > 0) {
      return;
    }

    await this.productsService.loadInitialData();
  }

  onCategorySelected(categoryId: number): void {
    void this.productsService.selectCategory(categoryId);
  }

  onAllergenToggled(allergenId: number): void {
    void this.productsService.toggleAllergen(allergenId);
  }

  onProductGroupToggled(groupId: number): void {
    void this.productsService.toggleProductGroup(groupId);
  }

  onMotiveChanged(mode: MotiveMode): void {
    void this.productsService.setMotive(mode);
  }

  onViewModeChanged(mode: ProductsViewMode): void {
    this.productsService.setViewMode(mode);
  }

  onIncreasePieceQty(productId: number): void {
    this.productsService.increasePieceQty(productId);
  }

  onDecreasePieceQty(productId: number): void {
    this.productsService.decreasePieceQty(productId);
  }

  onViewProduct(productId: number): void {
    void this.router.navigate(['/products', productId]);
  }

  get activeViewMode(): ProductsViewMode {
    return this.productsService.effectiveViewMode();
  }
}
