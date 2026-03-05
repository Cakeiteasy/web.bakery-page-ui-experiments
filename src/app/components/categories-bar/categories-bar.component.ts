import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ICategory } from '../../models/category.model';
import { ChooseCakeUIConfig } from '../../models/ui-config.model';

@Component({
  selector: 'app-categories-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categories-bar.component.html',
  styleUrl: './categories-bar.component.scss'
})
export class CategoriesBarComponent {
  @Input() categories: ICategory[] = [];
  @Input() selectedCategoryId: number | null = null;
  @Input() categoriesConfig: ChooseCakeUIConfig['chooseCake']['categories'] | null = null;

  @Output() categorySelected = new EventEmitter<number>();

  selectCategory(categoryId: number): void {
    this.categorySelected.emit(categoryId);
  }

  trackByCategoryId(_index: number, category: ICategory): number {
    return category.id;
  }

  get preset(): 'chips' | 'segmented' | 'minimal' {
    return this.categoriesConfig?.preset ?? 'chips';
  }

  get buttonHeightPx(): number {
    return this.categoriesConfig?.buttonHeightPx ?? 35;
  }

  get fontSizePx(): number {
    return this.categoriesConfig?.fontSizePx ?? 14;
  }
}
